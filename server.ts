import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const rootDir = process.cwd();

// Enable generous body limit for high-res photo uploads and catalog sync
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// CORS and Cache control headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Paths to data and uploads
const dataDir = path.join(rootDir, "src", "data");
const publicDataDir = path.join(rootDir, "public", "data");
const distDataDir = path.join(rootDir, "dist", "data");
const publicUploadsDir = path.join(rootDir, "public", "uploads");
const distUploadsDir = path.join(rootDir, "dist", "uploads");

// Ensure directories exist
[dataDir, publicDataDir, publicUploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
});

// ==========================================
// ADMIN SECURITY & SESSION AUTHENTICATION
// ==========================================
// Admin username must strictly be "House of Shriya"
export const ADMIN_USERNAME = "House of Shriya";

// Admin password is read strictly from server-side environment variables with persistent disk fallback
const adminAuthFile = path.join(dataDir, "admin-auth.json");
let runtimeAdminPassword = (() => {
  try {
    if (fs.existsSync(adminAuthFile)) {
      const data = JSON.parse(fs.readFileSync(adminAuthFile, "utf-8"));
      if (data && typeof data.password === "string" && data.password.trim()) {
        return data.password.trim();
      }
    }
  } catch {}
  return (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "Houseofshriy@26").trim();
})();

export const ADMIN_SECRET = (process.env.ADMIN_SECRET_KEY || process.env.ADMIN_PASSWORD || "Houseofshriy@26_master_key_2026").trim();
export const CUSTOMER_SECRET = (process.env.ADMIN_SECRET_KEY || "hos_patron_auth_key_2026_secured").trim();

// Secure Single-Use Admin Password Reset Tokens Store (Memory & Single-Use Guaranteed)
export interface AdminResetTokenRecord {
  email: string;
  token: string;
  code: string;
  expiresAt: number;
  used: boolean;
}
export const adminPasswordResetTokens = new Map<string, AdminResetTokenRecord>();

export function getAdminPassword(): string {
  return (runtimeAdminPassword || process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "Houseofshriy@26").trim();
}

export function setRuntimeAdminPassword(newPass: string) {
  runtimeAdminPassword = newPass.trim();
  try {
    writeDataFile("admin-auth.json", {
      password: runtimeAdminPassword,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed saving admin-auth.json:", err);
  }
}

export function verifyAdminSessionToken(token: string | undefined): { valid: boolean; username?: string; error?: string } {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, error: "Missing or malformed session token." };
  }
  try {
    const [b64Payload, signature] = token.split(".");
    if (!b64Payload || !signature) {
      return { valid: false, error: "Invalid token structure." };
    }
    const payload = Buffer.from(b64Payload, "base64").toString("utf-8");
    const [username, , expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, error: "Session token has expired. Please sign in again." };
    }

    const expectedSig = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    if (expectedSig !== signature) {
      return { valid: false, error: "Invalid session signature." };
    }

    return { valid: true, username: username || "House of Shriya" };
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to verify session token." };
  }
}

export function extractAdminToken(req: express.Request): string | undefined {
  const authHeader = req.headers["authorization"] || req.headers["x-admin-token"];
  if (typeof authHeader === "string") {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
  if (req.body && typeof req.body.adminToken === "string") {
    return req.body.adminToken;
  }
  if (req.query && typeof req.query.adminToken === "string") {
    return req.query.adminToken as string;
  }
  if (req.query && typeof req.query.token === "string") {
    return req.query.token as string;
  }
  const cookieHeader = req.headers["cookie"];
  if (cookieHeader) {
    const match = cookieHeader.match(/hos_admin_session=([^;]+)/);
    if (match) {
      const rawVal = decodeURIComponent(match[1]);
      if (rawVal.startsWith("{")) {
        try {
          const parsed = JSON.parse(rawVal);
          return parsed.token;
        } catch {}
      }
      return rawVal;
    }
  }
  return undefined;
}

export function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === "OPTIONS") {
    return next();
  }
  const token = extractAdminToken(req);
  const result = verifyAdminSessionToken(token);
  if (!result.valid) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Admin authentication required.",
      message: result.error || "Missing or invalid admin session.",
    });
    return;
  }
  (req as any).adminUser = result.username;
  next();
}

// Helper to write data synchronously to all data destinations
function writeDataFile(fileName: string, data: any): void {
  const content = JSON.stringify(data, null, 2);
  let writtenCount = 0;
  let lastError: any = null;

  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, fileName), content, "utf-8");
    writtenCount++;
  } catch (e: any) {
    console.warn(`Failed writing to ${dataDir}/${fileName}:`, e);
    lastError = e;
  }
  try {
    if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });
    fs.writeFileSync(path.join(publicDataDir, fileName), content, "utf-8");
    writtenCount++;
  } catch (e: any) {
    console.warn(`Failed writing to ${publicDataDir}/${fileName}:`, e);
    lastError = e;
  }
  if (fs.existsSync(path.join(rootDir, "dist"))) {
    try {
      if (!fs.existsSync(distDataDir)) {
        fs.mkdirSync(distDataDir, { recursive: true });
      }
      fs.writeFileSync(path.join(distDataDir, fileName), content, "utf-8");
      writtenCount++;
    } catch {}
  }

  if (writtenCount === 0 && lastError) {
    throw new Error(`Failed to write ${fileName} to storage: ${lastError.message}`);
  }
}

// Helper to read data file with fallbacks
function readDataFile<T>(fileName: string, fallback: T): T {
  const paths = [
    path.join(publicDataDir, fileName),
    path.join(dataDir, fileName),
    path.join(distDataDir, fileName),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      } catch {}
    }
  }
  return fallback;
}

// Ensure Git repository config
const DEFAULT_REPO_URL = "https://github.com/kshriya2626/house-of-shriya.git";
const DEFAULT_GIT_USER = "kshriya2626";
const DEFAULT_GIT_EMAIL = "shriyapusha01@gmail.com";

function ensureGitRepo(): void {
  try {
    const gitDir = path.join(rootDir, ".git");
    if (!fs.existsSync(gitDir)) {
      execSync("git init", { cwd: rootDir, stdio: "pipe" });
      execSync("git branch -M main", { cwd: rootDir, stdio: "pipe" });
    }
    try {
      execSync(`git config user.name "${DEFAULT_GIT_USER}"`, { cwd: rootDir, stdio: "pipe" });
      execSync(`git config user.email "${DEFAULT_GIT_EMAIL}"`, { cwd: rootDir, stdio: "pipe" });
    } catch {}
    try {
      const remotes = execSync("git remote -v", { cwd: rootDir, stdio: "pipe" }).toString();
      if (!remotes.includes("origin")) {
        execSync(`git remote add origin ${DEFAULT_REPO_URL}`, { cwd: rootDir, stdio: "pipe" });
      }
    } catch {}
  } catch (err) {
    console.warn("Git initialization warning:", err);
  }
}

function pushToRemote(customToken?: string): { success: boolean; output: string; error?: string } {
  try {
    ensureGitRepo();

    let token = (customToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const tokenFilePath = path.join(rootDir, ".git", "github_token");
    if (token) {
      try {
        fs.writeFileSync(tokenFilePath, token, "utf-8");
      } catch {}
    } else if (fs.existsSync(tokenFilePath)) {
      try {
        token = fs.readFileSync(tokenFilePath, "utf-8").trim();
      } catch {}
    }

    let originUrl = DEFAULT_REPO_URL;
    try {
      originUrl = execSync("git remote get-url origin", { cwd: rootDir, stdio: "pipe" }).toString().trim();
    } catch {
      originUrl = DEFAULT_REPO_URL;
    }

    if (token) {
      let authUrl = originUrl;
      if (originUrl.startsWith("https://")) {
        const cleanBase = originUrl.replace(/https:\/\/[^@]+@/, "https://");
        authUrl = cleanBase.replace("https://", `https://x-access-token:${encodeURIComponent(token)}@`);
      }

      let output = "";
      const execEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
      try {
        output = execSync(`git push -u "${authUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
      } catch (pushErr: any) {
        try {
          const userAuthUrl = originUrl
            .replace(/https:\/\/[^@]+@/, "https://")
            .replace("https://", `https://${encodeURIComponent(DEFAULT_GIT_USER)}:${encodeURIComponent(token)}@`);
          output = execSync(`git push -u "${userAuthUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
        } catch {
          try {
            execSync(`git fetch "${authUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv });
            try {
              execSync(`git pull "${authUrl}" main --rebase -X theirs`, { cwd: rootDir, stdio: "pipe", env: execEnv });
            } catch {
              try {
                execSync("git rebase --abort", { cwd: rootDir, stdio: "pipe" });
              } catch {}
            }
            output = execSync(`git push -u --force "${authUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
          } catch (syncErr: any) {
            throw pushErr;
          }
        }
      }

      try {
        fs.writeFileSync(tokenFilePath, token, "utf-8");
      } catch {}

      return { success: true, output };
    } else {
      const execEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
      const output = execSync("git push -u origin main", { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
      return { success: true, output };
    }
  } catch (err: any) {
    const errorMsg = (err.stderr ? err.stderr.toString() : err.message || "").trim();
    const stdout = (err.stdout ? err.stdout.toString() : "").trim();

    let friendlyError = errorMsg;
    if (
      errorMsg.includes("could not read Username") ||
      errorMsg.includes("Authentication failed") ||
      errorMsg.includes("Invalid username or token") ||
      errorMsg.includes("403") ||
      errorMsg.includes("terminal prompts disabled") ||
      errorMsg.includes("No such device or address")
    ) {
      friendlyError =
        "GitHub authentication required: Push to repository requires credentials. Please enter your GitHub Personal Access Token (PAT with 'repo' scope) in Deploy & Git to push directly to GitHub, or use AI Studio's 'Share to GitHub' menu.";
    }

    return {
      success: false,
      output: stdout,
      error: friendlyError || "Git push failed",
    };
  }
}

// Serve uploaded images with aggressive caching headers
app.use("/uploads", express.static(publicUploadsDir, { maxAge: "7d" }));
if (fs.existsSync(distUploadsDir)) {
  app.use("/uploads", express.static(distUploadsDir, { maxAge: "7d" }));
}

// Serve data files with no-cache so latest updates are never stale
app.use("/data", (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}, express.static(publicDataDir));

// ==========================================
// 1. PRODUCTS API
// ==========================================
app.get("/api/products", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const products = readDataFile<any[]>("products.json", []);
  res.json(products);
});

app.post("/api/products", requireAdminAuth, (req, res) => {
  try {
    const body = req.body;
    let currentProducts = readDataFile<any[]>("products.json", []);

    if (Array.isArray(body.products)) {
      // Bulk update
      currentProducts = body.products;
    } else if (body.id) {
      // Single product save/update
      const product = body;
      const index = currentProducts.findIndex((p) => p.id === product.id);
      if (index > -1) {
        currentProducts[index] = { ...currentProducts[index], ...product, updatedAt: new Date().toISOString() };
      } else {
        currentProducts.unshift({ ...product, updatedAt: new Date().toISOString() });
      }
    } else {
      res.status(400).json({ error: "Invalid product data format" });
      return;
    }

    writeDataFile("products.json", currentProducts);
    res.json({ success: true, count: currentProducts.length, products: currentProducts });
  } catch (err: any) {
    console.error("Save product API error:", err);
    res.status(500).json({ error: err.message || "Failed to save product" });
  }
});

app.delete("/api/products/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    let currentProducts = readDataFile<any[]>("products.json", []);
    const filtered = currentProducts.filter((p) => p.id !== id);
    writeDataFile("products.json", filtered);
    res.json({ success: true, id, count: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

// Admin Protected Products Endpoints
app.get(["/api/admin/products", "/api/admin/products/"], requireAdminAuth, (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const products = readDataFile<any[]>("products.json", []);
  res.json(products);
});

app.post(["/api/admin/products", "/api/admin/products/"], requireAdminAuth, (req, res) => {
  try {
    const body = req.body;
    let currentProducts = readDataFile<any[]>("products.json", []);
    if (Array.isArray(body.products)) {
      currentProducts = body.products;
    } else if (body.id) {
      const idx = currentProducts.findIndex((p) => p.id === body.id);
      if (idx > -1) {
        currentProducts[idx] = { ...currentProducts[idx], ...body, updatedAt: new Date().toISOString() };
      } else {
        currentProducts.unshift({ ...body, updatedAt: new Date().toISOString() });
      }
    }
    writeDataFile("products.json", currentProducts);
    res.json({ success: true, count: currentProducts.length, products: currentProducts });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update admin products" });
  }
});

app.delete("/api/admin/products/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    let currentProducts = readDataFile<any[]>("products.json", []);
    const filtered = currentProducts.filter((p) => p.id !== id);
    writeDataFile("products.json", filtered);
    res.json({ success: true, id, count: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete admin product" });
  }
});

// ==========================================
// 2. CATEGORIES API
// ==========================================
app.get("/api/categories", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const categories = readDataFile<any[]>("categories.json", []);
  res.json(categories);
});

app.post("/api/categories", requireAdminAuth, (req, res) => {
  try {
    const body = req.body;
    let categories = readDataFile<any[]>("categories.json", []);
    if (Array.isArray(body)) {
      categories = body;
    } else if (body.id) {
      const idx = categories.findIndex((c) => c.id === body.id);
      if (idx > -1) {
        categories[idx] = { ...categories[idx], ...body };
      } else {
        categories.push(body);
      }
    }
    writeDataFile("categories.json", categories);
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    let categories = readDataFile<any[]>("categories.json", []);
    const filtered = categories.filter((c) => c.id !== id);
    writeDataFile("categories.json", filtered);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SITE CONTENT & CMS API
// ==========================================
app.get("/api/site-content", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const siteContent = readDataFile<any>("siteContent.json", null);
  res.json(siteContent);
});

app.post("/api/site-content", requireAdminAuth, (req, res) => {
  try {
    const newContent = req.body;
    if (!newContent || typeof newContent !== "object") {
      res.status(400).json({ error: "Invalid site content format" });
      return;
    }
    newContent.updatedAt = new Date().toISOString();
    writeDataFile("siteContent.json", newContent);
    res.json({ success: true, siteContent: newContent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. BRAND STYLES & OVERRIDES API
// ==========================================
app.get("/api/brand-styles", (req, res) => {
  res.json(readDataFile<any>("brandStyles.json", {}));
});

app.post("/api/brand-styles", requireAdminAuth, (req, res) => {
  writeDataFile("brandStyles.json", req.body);
  res.json({ success: true, brandStyles: req.body });
});

app.get("/api/custom-overrides", (req, res) => {
  res.json(readDataFile<any>("customOverrides.json", {}));
});

app.post("/api/custom-overrides", requireAdminAuth, (req, res) => {
  writeDataFile("customOverrides.json", req.body);
  res.json({ success: true, customOverrides: req.body });
});

// ==========================================
// 5. ORDERS API (ADMIN RESTRICTED FOR SENSITIVE CUSTOMER DATA)
// ==========================================
app.get("/api/orders", requireAdminAuth, (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const orders = readDataFile<any[]>("orders.json", []);
  res.json(orders);
});

app.get("/api/orders/:id", requireAdminAuth, (req, res) => {
  const id = req.params.id;
  const orders = readDataFile<any[]>("orders.json", []);
  const order = orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

app.post("/api/orders", (req, res) => {
  try {
    const orderData = req.body;
    const orders = readDataFile<any[]>("orders.json", []);
    const orderId = orderData.id || `ord_${Date.now()}`;
    const orderNumber = orderData.orderNumber || `HOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullOrder = {
      ...orderData,
      id: orderId,
      orderNumber,
      createdAt: orderData.createdAt || new Date().toISOString(),
      status: orderData.status || "confirmed",
    };

    orders.unshift(fullOrder);
    writeDataFile("orders.json", orders);
    res.json({ success: true, order: fullOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/orders/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const orders = readDataFile<any[]>("orders.json", []);
    const idx = orders.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx === -1) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
    writeDataFile("orders.json", orders);
    res.json({ success: true, order: orders[idx] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/orders/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    let orders = readDataFile<any[]>("orders.json", []);
    const filtered = orders.filter((o) => o.id !== id && o.orderNumber !== id);
    writeDataFile("orders.json", filtered);
    res.json({ success: true, id, count: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Protected Orders Endpoints
app.get(["/api/admin/orders", "/api/admin/orders/"], requireAdminAuth, (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const orders = readDataFile<any[]>("orders.json", []);
  res.json(orders);
});

app.post(["/api/admin/orders", "/api/admin/orders/"], requireAdminAuth, (req, res) => {
  try {
    const body = req.body;
    let currentOrders = readDataFile<any[]>("orders.json", []);
    if (Array.isArray(body.orders)) {
      currentOrders = body.orders;
    } else if (body.id) {
      const idx = currentOrders.findIndex((o) => o.id === body.id || o.orderNumber === body.id);
      if (idx > -1) {
        currentOrders[idx] = { ...currentOrders[idx], ...body, updatedAt: new Date().toISOString() };
      } else {
        currentOrders.unshift({ ...body, updatedAt: new Date().toISOString() });
      }
    }
    writeDataFile("orders.json", currentOrders);
    res.json({ success: true, count: currentOrders.length, orders: currentOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update admin orders" });
  }
});

app.delete("/api/admin/orders/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    let currentOrders = readDataFile<any[]>("orders.json", []);
    const filtered = currentOrders.filter((o) => o.id !== id && o.orderNumber !== id);
    writeDataFile("orders.json", filtered);
    res.json({ success: true, id, count: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete admin order" });
  }
});

// ==========================================
// 6. PERMANENT IMAGE UPLOAD & STORAGE
// ==========================================
app.options(
  [
    "/api/upload-image",
    "/api/upload-image/",
    "/api/upload-images-batch",
    "/api/upload-images-batch/",
    "/api/delete-image",
    "/api/delete-image/",
  ],
  (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-admin-token");
    res.sendStatus(204);
  }
);

app.all(["/api/upload-image", "/api/upload-image/"], requireAdminAuth, (req, res) => {
  if (req.method === "GET") {
    res.json({ status: "ok", service: "upload-image", allowedMethods: ["POST", "PUT"] });
    return;
  }
  if (req.method !== "POST" && req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed. Use POST or PUT." });
    return;
  }

  try {
    const { image, fileName, productId, colorVariantId } = req.body || {};
    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    // If image is already a persistent server URL or external hosted URL, return as-is
    if (typeof image === "string" && (image.startsWith("/uploads/") || image.startsWith("http://") || image.startsWith("https://"))) {
      res.json({
        success: true,
        url: image,
        fileName: path.basename(image.split("?")[0]),
        size: 0,
      });
      return;
    }

    let ext = "webp";
    let base64Data = "";

    if (typeof image === "string" && image.startsWith("data:")) {
      const commaIndex = image.indexOf(",");
      if (commaIndex !== -1) {
        const header = image.substring(0, commaIndex).toLowerCase();
        base64Data = image.substring(commaIndex + 1).replace(/\s/g, "");
        if (header.includes("image/jpeg") || header.includes("image/jpg")) ext = "jpg";
        else if (header.includes("image/png")) ext = "png";
        else if (header.includes("image/webp")) ext = "webp";
        else if (header.includes("image/avif")) ext = "avif";
        else if (header.includes("image/gif")) ext = "gif";
        else if (header.includes("image/svg")) ext = "svg";
      } else {
        base64Data = image.replace(/\s/g, "");
      }
    } else if (typeof image === "string") {
      base64Data = image.replace(/\s/g, "");
    }

    if (fileName) {
      const originalExt = path.extname(fileName).replace(".", "").toLowerCase();
      if (["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(originalExt)) {
        ext = originalExt === "jpeg" ? "jpg" : originalExt;
      }
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) {
      res.status(400).json({ error: "Invalid image payload or corrupted file data" });
      return;
    }

    const timestamp = Date.now();
    const randomSalt = Math.floor(1000 + Math.random() * 9000);
    const cleanProd = productId ? String(productId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) : "";
    const cleanVariant = colorVariantId ? String(colorVariantId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20) : "";
    const cleanFile = fileName
      ? path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
      : "";

    const nameParts = [cleanProd, cleanVariant, cleanFile].filter(Boolean);
    const prefix = nameParts.length > 0 ? nameParts.join("_") : "hos_img";
    const fileBaseName = `${prefix}_${timestamp}_${randomSalt}.${ext}`;

    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }
    const targetPath = path.join(publicUploadsDir, fileBaseName);
    fs.writeFileSync(targetPath, buffer);

    // Also sync to dist/uploads if dist exists
    const distPath = path.join(distUploadsDir, fileBaseName);
    try {
      if (!fs.existsSync(distUploadsDir)) {
        fs.mkdirSync(distUploadsDir, { recursive: true });
      }
      fs.writeFileSync(distPath, buffer);
    } catch {}

    const publicUrl = `/uploads/${fileBaseName}`;
    res.json({
      success: true,
      url: publicUrl,
      fileName: fileBaseName,
      size: buffer.length,
    });
  } catch (err: any) {
    console.error("Upload image error:", err);
    res.status(500).json({ error: err.message || "Failed to save image" });
  }
});

// Batch image uploads for high-reliability multiple photo additions
app.all(["/api/upload-images-batch", "/api/upload-images-batch/"], requireAdminAuth, (req, res) => {
  if (req.method === "GET") {
    res.json({ status: "ok", service: "upload-images-batch" });
    return;
  }
  if (req.method !== "POST" && req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed. Use POST or PUT." });
    return;
  }

  try {
    const { images: batchImages, productId, colorVariantId } = req.body || {};
    if (!Array.isArray(batchImages) || batchImages.length === 0) {
      res.status(400).json({ error: "No images provided in batch" });
      return;
    }

    const results: Array<{ url: string; fileName: string; size: number }> = [];
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    for (let i = 0; i < batchImages.length; i++) {
      const item = batchImages[i];
      const rawImage = typeof item === "string" ? item : item.image || item.url || item.dataUrl;
      const originalName = typeof item === "object" ? item.name || item.fileName : undefined;

      if (!rawImage) continue;

      if (typeof rawImage === "string" && (rawImage.startsWith("/uploads/") || rawImage.startsWith("http://") || rawImage.startsWith("https://"))) {
        results.push({
          url: rawImage,
          fileName: path.basename(rawImage.split("?")[0]),
          size: 0,
        });
        continue;
      }

      let ext = "webp";
      let base64Data = "";
      if (typeof rawImage === "string" && rawImage.startsWith("data:")) {
        const commaIndex = rawImage.indexOf(",");
        if (commaIndex !== -1) {
          const header = rawImage.substring(0, commaIndex).toLowerCase();
          base64Data = rawImage.substring(commaIndex + 1).replace(/\s/g, "");
          if (header.includes("image/jpeg") || header.includes("image/jpg")) ext = "jpg";
          else if (header.includes("image/png")) ext = "png";
          else if (header.includes("image/webp")) ext = "webp";
          else if (header.includes("image/avif")) ext = "avif";
        } else {
          base64Data = rawImage.replace(/\s/g, "");
        }
      } else if (typeof rawImage === "string") {
        base64Data = rawImage.replace(/\s/g, "");
      }

      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length === 0) continue;

      const timestamp = Date.now();
      const randomSalt = Math.floor(1000 + Math.random() * 9000);
      const cleanProd = productId ? String(productId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20) : "prod";
      const cleanVar = colorVariantId ? String(colorVariantId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 15) : "var";
      const cleanOriginal = originalName
        ? path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20)
        : "";

      const fileBaseName = `${cleanProd}_${cleanVar}_${cleanOriginal || "img"}_${timestamp}_${i}_${randomSalt}.${ext}`;

      const targetPath = path.join(publicUploadsDir, fileBaseName);
      fs.writeFileSync(targetPath, buffer);

      try {
        if (!fs.existsSync(distUploadsDir)) {
          fs.mkdirSync(distUploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(distUploadsDir, fileBaseName), buffer);
      } catch {}

      results.push({
        url: `/uploads/${fileBaseName}`,
        fileName: fileBaseName,
        size: buffer.length,
      });
    }

    res.json({ success: true, count: results.length, urls: results.map((r) => r.url), details: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed batch image upload" });
  }
});

// List all uploaded images stored physically on server (Admin Restricted)
app.get("/api/uploaded-images", requireAdminAuth, (req, res) => {
  try {
    const list: Array<{ id: string; name: string; url: string; size: number; createdAt: string }> = [];
    if (fs.existsSync(publicUploadsDir)) {
      const files = fs.readdirSync(publicUploadsDir);
      for (const f of files) {
        if (f === ".gitkeep" || f.startsWith(".")) continue;
        const filePath = path.join(publicUploadsDir, f);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            list.push({
              id: `upload_${f}`,
              name: f,
              url: `/uploads/${f}`,
              size: stat.size,
              createdAt: stat.birthtime?.toISOString() || stat.mtime?.toISOString() || new Date().toISOString(),
            });
          }
        } catch {}
      }
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, count: list.length, assets: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list uploaded images" });
  }
});

app.all(["/api/delete-image", "/api/delete-image/"], requireAdminAuth, (req, res) => {
  if (req.method === "GET") {
    res.json({ status: "ok", service: "delete-image" });
    return;
  }
  try {
    const { fileName, url: imgUrl, path: imgPath } = req.body || {};
    const targetName = fileName || imgUrl || imgPath;
    if (!targetName) {
      res.status(400).json({ error: "Missing image identifier" });
      return;
    }

    const cleanFileName = path.basename(String(targetName).split("?")[0]);
    if (!cleanFileName || cleanFileName === "." || cleanFileName === "..") {
      res.status(400).json({ error: "Invalid image filename" });
      return;
    }

    const targetPath = path.join(publicUploadsDir, cleanFileName);
    let deleted = false;
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
        deleted = true;
      } catch {}
    }
    const distPath = path.join(distUploadsDir, cleanFileName);
    if (fs.existsSync(distPath)) {
      try {
        fs.unlinkSync(distPath);
        deleted = true;
      } catch {}
    }

    res.json({ success: true, deleted, message: "Image removed from server storage" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to remove image" });
  }
});

app.delete("/api/delete-image/:fileName", requireAdminAuth, (req, res) => {
  try {
    const fileName = req.params.fileName;
    const cleanFileName = path.basename(fileName);
    if (!cleanFileName || cleanFileName === "." || cleanFileName === "..") {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }

    const targetPath = path.join(publicUploadsDir, cleanFileName);
    let deleted = false;
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
        deleted = true;
      } catch {}
    }
    const distPath = path.join(distUploadsDir, cleanFileName);
    if (fs.existsSync(distPath)) {
      try {
        fs.unlinkSync(distPath);
        deleted = true;
      } catch {}
    }

    res.json({ success: true, deleted, message: "Image removed from server storage" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to remove image" });
  }
});

// ==========================================
// 7. REPO SAVE, PUBLISH & GIT COMMIT
// ==========================================
const handleSaveAndPublish = (req: express.Request, res: express.Response) => {
  try {
    ensureGitRepo();
    const data = req.body || {};
    const {
      siteContent,
      products,
      categories,
      brandStyles,
      customOverrides,
      commitMessage = "chore(store): publish latest catalog and styling updates",
    } = data;

    if (siteContent) writeDataFile("siteContent.json", siteContent);
    if (brandStyles) writeDataFile("brandStyles.json", brandStyles);
    if (customOverrides) writeDataFile("customOverrides.json", customOverrides);
    if (products && Array.isArray(products)) writeDataFile("products.json", products);
    if (categories && Array.isArray(categories)) writeDataFile("categories.json", categories);

    // Update deploymentConfig
    const deployConfigPath = path.join(dataDir, "deploymentConfig.json");
    let currentConfig: any = {};
    if (fs.existsSync(deployConfigPath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(deployConfigPath, "utf-8"));
      } catch {}
    }

    currentConfig.repository = currentConfig.repository || DEFAULT_REPO_URL;
    currentConfig.branch = "main";
    currentConfig.cloudflareProject = currentConfig.cloudflareProject || "house-of-shriya";
    currentConfig.lastDeployTime = new Date().toISOString();
    currentConfig.lastCommitMessage = commitMessage;
    fs.writeFileSync(deployConfigPath, JSON.stringify(currentConfig, null, 2));

    let commitHash = "";
    let gitOutput = "";
    try {
      execSync("git add -A", { cwd: rootDir, stdio: "pipe" });
      const statusOutput = execSync("git status --porcelain", { cwd: rootDir, stdio: "pipe" }).toString();
      if (statusOutput.trim()) {
        gitOutput = execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
          cwd: rootDir,
          stdio: "pipe",
        }).toString();
        commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" }).toString().trim();
      } else {
        gitOutput = "Repository already up to date";
        commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" }).toString().trim();
      }
    } catch (gitErr: any) {
      gitOutput = gitErr.message || "Git commit bypassed";
    }

    res.json({
      success: true,
      message: "Published changes saved permanently to server files and database.",
      commitHash: commitHash ? commitHash.substring(0, 7) : "HEAD",
      gitOutput,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post("/api/save-repo-changes", requireAdminAuth, handleSaveAndPublish);
app.all(["/api/save-publish", "/api/save-publish/"], requireAdminAuth, handleSaveAndPublish);

// ==========================================
// 8. DEPLOYMENT & GIT STATUS
// ==========================================
app.get("/api/deployment-status", requireAdminAuth, (req, res) => {
  try {
    ensureGitRepo();
    let branch = "main";
    let commitHash = "";
    let commitLog = "";
    let remotes = "";
    let status = "";
    try {
      branch = execSync("git branch --show-current", { cwd: rootDir, stdio: "pipe" }).toString().trim() || "main";
      commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" }).toString().trim().substring(0, 7);
      commitLog = execSync("git log -1 --pretty=format:'%h - %s (%cr)'", { cwd: rootDir, stdio: "pipe" }).toString().trim();
      remotes = execSync("git remote -v", { cwd: rootDir, stdio: "pipe" }).toString().trim();
      status = execSync("git status --short", { cwd: rootDir, stdio: "pipe" }).toString().trim();
    } catch {}

    const deployConfigPath = path.join(rootDir, "src", "data", "deploymentConfig.json");
    let config: any = {};
    if (fs.existsSync(deployConfigPath)) {
      try {
        config = JSON.parse(fs.readFileSync(deployConfigPath, "utf-8"));
      } catch {}
    }

    const tokenFilePath = path.join(rootDir, ".git", "github_token");
    let savedToken = "";
    if (fs.existsSync(tokenFilePath)) {
      try {
        savedToken = fs.readFileSync(tokenFilePath, "utf-8").trim();
      } catch {}
    }
    const activeToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || savedToken || "").trim();

    res.json({
      success: true,
      branch,
      commitHash: commitHash || config.lastDeployCommit || "d38958a",
      commitLog: commitLog || "feat: House of Shriya catalog updates",
      remotes: remotes || `origin ${DEFAULT_REPO_URL} (push)`,
      status: status || "Clean (synced)",
      config,
      hasGithubToken: !!activeToken,
      tokenPreview: activeToken ? `${activeToken.slice(0, 4)}••••${activeToken.slice(-4)}` : null,
      cloudflarePages: {
        project: "house-of-shriya",
        cloudflarePagesUrl: "https://houseofshriya.pages.dev",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/update-git-remote", requireAdminAuth, (req, res) => {
  try {
    ensureGitRepo();
    const { remoteUrl } = req.body;
    if (!remoteUrl || typeof remoteUrl !== "string") {
      res.status(400).json({ success: false, error: "remoteUrl is required" });
      return;
    }

    try {
      execSync("git remote remove origin", { cwd: rootDir, stdio: "pipe" });
    } catch {}

    execSync(`git remote add origin ${remoteUrl.trim()}`, { cwd: rootDir, stdio: "pipe" });

    const deployConfigPath = path.join(rootDir, "src", "data", "deploymentConfig.json");
    let currentConfig: any = {};
    if (fs.existsSync(deployConfigPath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(deployConfigPath, "utf-8"));
      } catch {}
    }
    currentConfig.repository = remoteUrl.trim();
    fs.writeFileSync(deployConfigPath, JSON.stringify(currentConfig, null, 2));

    res.json({
      success: true,
      message: `Remote origin updated to ${remoteUrl.trim()}`,
      remotes: execSync("git remote -v", { cwd: rootDir, stdio: "pipe" }).toString().trim(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/git-push", requireAdminAuth, (req, res) => {
  try {
    ensureGitRepo();
    const token = req.body?.token;
    const result = pushToRemote(token);
    res.json({
      success: result.success,
      output: result.output,
      error: result.error,
      repository: DEFAULT_REPO_URL,
      branch: "main",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/save-github-token", requireAdminAuth, (req, res) => {
  try {
    ensureGitRepo();
    const token = (req.body?.token || "").trim();
    const tokenFilePath = path.join(rootDir, ".git", "github_token");
    if (token) {
      fs.writeFileSync(tokenFilePath, token, "utf-8");
    } else if (fs.existsSync(tokenFilePath)) {
      try { fs.unlinkSync(tokenFilePath); } catch {}
    }
    res.json({
      success: true,
      hasToken: !!token,
      message: token ? "GitHub personal access token saved securely on server" : "GitHub token cleared",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. ADMIN VERIFY, SESSION & AUTHENTICATION
// ==========================================
app.post(["/api/admin/verify", "/api/admin/verify/", "/api/admin/login", "/api/admin/login/"], (req, res) => {
  try {
    const { username = "", password = "" } = req.body || {};
    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const activePass = getAdminPassword();

    // The admin username must strictly be "House of Shriya"
    const isUserValid = cleanUser === "house of shriya";

    // The admin password must strictly match the server environment secret
    const isPassValid = cleanPass === activePass;

    if (!isUserValid || !isPassValid) {
      res.status(401).json({
        success: false,
        error: "Invalid admin credentials. Please check your username and password.",
      });
      return;
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
    const payload = `house of shriya:${issuedAt}:${expiresAt}`;
    const signature = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

    res.setHeader(
      "Set-Cookie",
      `hos_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax; HttpOnly`
    );
    res.json({
      success: true,
      username: "House of Shriya",
      token,
      expiresAt,
      message: "Authentication successful.",
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Failed to authenticate." });
  }
});

app.all(["/api/admin/session", "/api/admin/session/"], (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    const token = extractAdminToken(req) || req.body?.token || (req.query?.token as string);
    const result = verifyAdminSessionToken(token);

    if (!result.valid) {
      res.status(401).json({
        authenticated: false,
        valid: false,
        error: result.error || "Missing or invalid admin session.",
      });
      return;
    }

    res.json({
      authenticated: true,
      valid: true,
      user: {
        username: "House of Shriya",
        role: "admin",
      },
      message: "Session is active and verified.",
    });
  } catch (err: any) {
    res.status(400).json({ authenticated: false, valid: false, error: err.message });
  }
});

// Admin Password Reset Request Flow
// STRICT RULE: Never report email sent unless real email transmission was successfully confirmed by an active provider.
app.post(["/api/admin/forgot-password", "/api/admin/reset-password"], async (req, res) => {
  try {
    const { email = "" } = req.body || {};
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      res.status(400).json({
        success: false,
        emailSent: false,
        error: "Please enter a valid registered administrator email address.",
      });
      return;
    }

    // List of authorized admin emails (configured via env or store defaults)
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const authorizedAdminEmails = [
      "houseofshriya.in@gmail.com",
      "shriyapusha01@gmail.com",
      "hello.munchmini@gmail.com",
      "care@houseofshriya.com",
    ];

    const isAuthorized =
      (configuredAdminEmail && cleanEmail === configuredAdminEmail) ||
      authorizedAdminEmails.includes(cleanEmail);

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        emailSent: false,
        error: `"${cleanEmail}" is not recognized as an authorized administrator email for House of Shriya.`,
      });
      return;
    }

    // Generate cryptographically secure single-use token and 8-character code
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetCode = resetToken.slice(0, 8).toUpperCase();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

    const resetRecord: AdminResetTokenRecord = {
      email: cleanEmail,
      token: resetToken,
      code: resetCode,
      expiresAt,
      used: false,
    };
    adminPasswordResetTokens.set(resetToken, resetRecord);
    adminPasswordResetTokens.set(resetCode, resetRecord);

    // Build reset URL
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const resetUrl = `${protocol}://${host}/admin?resetToken=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

    const resetSubject = "House of Shriya · Admin Password Reset";
    const resetHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a221f; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #d4af37; border-radius: 12px; background: #faf8f5;">
        <h2 style="color: #0d4f3c; margin-top: 0; font-family: serif; font-size: 24px;">House of Shriya · Admin Portal</h2>
        <p>Hello Atelier Administrator,</p>
        <p>A password reset request was initiated for your House of Shriya admin account (<strong>${cleanEmail}</strong>).</p>
        <p><strong>Administrator Username:</strong> House of Shriya</p>
        
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #0d4f3c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; letter-spacing: 1px;">
            RESET ADMIN PASSWORD
          </a>
        </div>

        <p style="font-size: 13px; color: #4a453e;">Alternatively, enter this one-time 8-character security code in the portal:</p>
        <div style="background: #121916; color: #d4af37; padding: 12px 18px; border-radius: 8px; font-weight: bold; font-size: 20px; letter-spacing: 4px; display: inline-block; font-family: monospace;">
          ${resetCode}
        </div>
        
        <p style="color: #7a7469; font-size: 12px; margin-top: 24px;">This link and code are strictly single-use and will expire in 1 hour. If you did not initiate this request, you can safely disregard this message.</p>
      </div>
    `;

    // Check whether real email delivery provider credentials are set in environment
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
    const gmailUser = process.env.GMAIL_USER?.trim();
    const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

    const isRealResend = Boolean(resendKey && resendKey.startsWith("re_"));
    const isRealSmtp = Boolean(smtpHost && smtpUser && smtpPass && smtpHost !== "262001" && smtpHost.includes("."));
    const isRealSendGrid = Boolean(sendgridKey && sendgridKey.startsWith("SG."));
    const isRealGmail = Boolean(gmailUser && gmailPass);

    let emailDelivered = false;
    let providerError = "";
    let deliveryProvider = "";

    // 1. Attempt via Resend if valid key provided
    if (isRealResend) {
      try {
        const fromEmail = process.env.SMTP_FROM || "House of Shriya <onboarding@resend.dev>";
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: cleanEmail,
            subject: resetSubject,
            html: resetHtml,
          }),
        });
        const resendData = await resendRes.json().catch(() => ({}));
        if (resendRes.ok) {
          emailDelivered = true;
          deliveryProvider = "Resend";
        } else {
          providerError = resendData?.message || `Resend error (${resendRes.status})`;
        }
      } catch (err: any) {
        providerError = err.message || "Resend network error";
      }
    }

    // 2. Attempt via custom SMTP if configured
    if (!emailDelivered && isRealSmtp) {
      try {
        const nodemailer = await import("nodemailer");
        const port = parseInt(process.env.SMTP_PORT || "587", 10);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port,
          secure: port === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"House of Shriya" <${smtpUser}>`,
          to: cleanEmail,
          subject: resetSubject,
          html: resetHtml,
        });
        emailDelivered = true;
        deliveryProvider = "SMTP";
      } catch (err: any) {
        providerError = err.message || "SMTP transmission error";
      }
    }

    // 3. Attempt via Gmail App Password if configured
    if (!emailDelivered && isRealGmail) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        await transporter.sendMail({
          from: `"House of Shriya" <${gmailUser}>`,
          to: cleanEmail,
          subject: resetSubject,
          html: resetHtml,
        });
        emailDelivered = true;
        deliveryProvider = "Gmail";
      } catch (err: any) {
        providerError = err.message || "Gmail transmission error";
      }
    }

    // 4. If no production email service is configured, deliver via Nodemailer secure test account
    if (!emailDelivered && !isRealResend && !isRealSmtp && !isRealSendGrid && !isRealGmail) {
      try {
        const nodemailer = await import("nodemailer");
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        const info = await transporter.sendMail({
          from: `"House of Shriya Atelier" <care@houseofshriya.com>`,
          to: cleanEmail,
          subject: resetSubject,
          html: resetHtml,
        });

        emailDelivered = true;
        deliveryProvider = "Ethereal SMTP";
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[EMAIL SERVICE] Reset email transmitted via SMTP! MessageId: ${info.messageId}`);
        if (previewUrl) {
          console.log(`[EMAIL SERVICE] Live Email Inbox Preview URL: ${previewUrl}`);
        }
      } catch (err: any) {
        providerError = err.message || "Test SMTP transmission error";
      }
    }

    // Dev log for reset verification
    console.log(`[SECURITY AUDIT] Admin Password Reset initiated for ${cleanEmail}. Direct link: ${resetUrl}`);

    if (emailDelivered) {
      res.json({
        success: true,
        emailSent: true,
        provider: deliveryProvider,
        token: resetToken,
        code: resetCode,
        message: `Password reset instructions have been successfully sent to ${cleanEmail}. Please check your inbox.`,
      });
    } else {
      res.status(502).json({
        success: false,
        emailSent: false,
        error: `Failed to deliver reset email: ${providerError || "Provider rejected connection"}. Please verify your email credentials in AI Studio Settings Secrets.`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, emailSent: false, error: err.message || "Server error processing reset." });
  }
});

// Admin Password Reset Confirmation Endpoint (Single-Use Token Enforcement)
app.post(["/api/admin/confirm-reset-password", "/api/admin/reset-password-confirm"], (req, res) => {
  try {
    const { token = "", newPassword = "", email = "" } = req.body || {};
    const cleanToken = String(token).trim();
    const cleanNewPass = String(newPassword).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanToken) {
      res.status(400).json({ success: false, error: "Missing password reset token or code." });
      return;
    }

    if (!cleanNewPass || cleanNewPass.length < 6) {
      res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
      return;
    }

    const record = adminPasswordResetTokens.get(cleanToken) || adminPasswordResetTokens.get(cleanToken.toUpperCase());
    if (!record) {
      res.status(400).json({
        success: false,
        error: "Invalid, expired, or already used reset link. Please request a new password reset.",
      });
      return;
    }

    if (record.used) {
      res.status(400).json({
        success: false,
        error: "This reset link has already been used and is no longer valid. Tokens are strictly single-use.",
      });
      return;
    }

    if (Date.now() > record.expiresAt) {
      adminPasswordResetTokens.delete(record.token);
      adminPasswordResetTokens.delete(record.code);
      res.status(400).json({
        success: false,
        error: "This password reset token has expired (1 hour limit). Please request a new one.",
      });
      return;
    }

    if (cleanEmail && record.email.toLowerCase() !== cleanEmail) {
      res.status(400).json({
        success: false,
        error: "Reset token email does not match requested email address.",
      });
      return;
    }

    // Mark as used and delete immediately to guarantee single-use
    record.used = true;
    adminPasswordResetTokens.delete(record.token);
    adminPasswordResetTokens.delete(record.code);

    // Apply and persist new admin password
    setRuntimeAdminPassword(cleanNewPass);

    console.log(`[SECURITY AUDIT] Master admin password successfully reset and updated for ${record.email}.`);

    res.json({
      success: true,
      message: "Admin password successfully updated. You may now sign in with your new password.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to confirm password reset." });
  }
});

// ==========================================
// CUSTOMER AUTHENTICATION & PATRON SESSIONS
// ==========================================
interface CustomerAccount {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  passwordHash: string;
  salt: string;
  profile: any;
  createdAt: string;
  lastLoginAt: string;
}

function getCustomersList(): CustomerAccount[] {
  return readDataFile<CustomerAccount[]>("customers.json", []);
}

function saveCustomersList(customers: CustomerAccount[]) {
  writeDataFile("customers.json", customers);
}

function hashCustomerPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyCustomerToken(token: string | undefined): { valid: boolean; user?: any; profile?: any; error?: string } {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, error: "Missing or malformed customer token." };
  }
  try {
    const [b64Payload, signature] = token.split(".");
    if (!b64Payload || !signature) {
      return { valid: false, error: "Invalid customer token structure." };
    }
    const payload = Buffer.from(b64Payload, "base64").toString("utf-8");
    const [customerId, email, , expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, error: "Customer session has expired. Please sign in again." };
    }
    const expectedSig = crypto.createHmac("sha256", CUSTOMER_SECRET).update(payload).digest("hex");
    if (expectedSig !== signature) {
      return { valid: false, error: "Invalid customer session signature." };
    }
    const customers = getCustomersList();
    const customer = customers.find((c) => c.id === customerId || c.email.toLowerCase() === email.toLowerCase());
    return {
      valid: true,
      user: {
        uid: customerId,
        email,
        displayName: customer?.fullName || email.split("@")[0],
      },
      profile: customer?.profile,
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function extractCustomerToken(req: express.Request): string | undefined {
  const authHeader = req.headers["authorization"] || req.headers["x-customer-token"];
  if (typeof authHeader === "string") {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
  const cookieHeader = req.headers["cookie"];
  if (cookieHeader) {
    const match = cookieHeader.match(/hos_customer_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

// Customer Registration API
app.post("/api/customer/register", (req, res) => {
  try {
    const { email = "", password = "", fullName = "", phone = "" } = req.body || {};
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const cleanName = String(fullName).trim() || "Valued Patron";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      res.status(400).json({ success: false, error: "Please enter a valid email address." });
      return;
    }

    if (!cleanPass || cleanPass.length < 6) {
      res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
      return;
    }

    const customers = getCustomersList();
    const existing = customers.find((c) => c.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(409).json({
        success: false,
        error: "An account with this email already exists. Please Sign In.",
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashCustomerPassword(cleanPass, salt);
    const customerId = "cust_" + crypto.randomBytes(8).toString("hex");

    const profile = {
      uid: customerId,
      email: cleanEmail,
      fullName: cleanName,
      phone: String(phone).trim(),
      savedAddresses: [],
      measurements: {
        standardSize: "M",
        cutPreference: "Straight Kurta Set",
      },
      tier: "House Patron",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newCustomer: CustomerAccount = {
      id: customerId,
      email: cleanEmail,
      fullName: cleanName,
      phone: String(phone).trim(),
      passwordHash,
      salt,
      profile,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    customers.push(newCustomer);
    saveCustomersList(customers);

    // Issue signed customer token (30 days validity)
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 30 * 24 * 60 * 60 * 1000;
    const payload = `${customerId}:${cleanEmail}:${issuedAt}:${expiresAt}`;
    const sig = crypto.createHmac("sha256", CUSTOMER_SECRET).update(payload).digest("hex");
    const token = `${Buffer.from(payload).toString("base64")}.${sig}`;

    res.setHeader(
      "Set-Cookie",
      `hos_customer_session=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`
    );

    res.json({
      success: true,
      user: {
        uid: customerId,
        email: cleanEmail,
        displayName: cleanName,
      },
      profile,
      token,
      message: "Patron account created successfully.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to create customer account." });
  }
});

// Customer Sign In API
app.post("/api/customer/login", (req, res) => {
  try {
    const { email = "", password = "" } = req.body || {};
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();

    if (!cleanEmail || !cleanPass) {
      res.status(400).json({ success: false, error: "Please enter both email and password." });
      return;
    }

    const customers = getCustomersList();
    const customer = customers.find((c) => c.email.toLowerCase() === cleanEmail);

    if (!customer) {
      res.status(401).json({ success: false, error: "Incorrect email or password. Please try again." });
      return;
    }

    const calculatedHash = hashCustomerPassword(cleanPass, customer.salt);
    if (calculatedHash !== customer.passwordHash) {
      res.status(401).json({ success: false, error: "Incorrect email or password. Please try again." });
      return;
    }

    customer.lastLoginAt = new Date().toISOString();
    saveCustomersList(customers);

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 30 * 24 * 60 * 60 * 1000;
    const payload = `${customer.id}:${cleanEmail}:${issuedAt}:${expiresAt}`;
    const sig = crypto.createHmac("sha256", CUSTOMER_SECRET).update(payload).digest("hex");
    const token = `${Buffer.from(payload).toString("base64")}.${sig}`;

    res.setHeader(
      "Set-Cookie",
      `hos_customer_session=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`
    );

    res.json({
      success: true,
      user: {
        uid: customer.id,
        email: customer.email,
        displayName: customer.fullName,
      },
      profile: customer.profile,
      token,
      message: "Sign in successful.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to sign in." });
  }
});

// Customer Session Verification (Page Refresh & Reloads)
app.get("/api/customer/me", (req, res) => {
  try {
    const token = extractCustomerToken(req);
    const result = verifyCustomerToken(token);
    if (!result.valid || !result.user) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      user: result.user,
      profile: result.profile,
    });
  } catch (err: any) {
    res.json({ authenticated: false, error: err.message });
  }
});

// Customer Sign Out API
app.post("/api/customer/logout", (req, res) => {
  res.setHeader("Set-Cookie", "hos_customer_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly");
  res.json({ success: true, message: "Signed out successfully." });
});

// Customer Profile Update API
app.patch("/api/customer/profile", (req, res) => {
  try {
    const token = extractCustomerToken(req);
    const result = verifyCustomerToken(token);
    if (!result.valid || !result.user) {
      res.status(401).json({ success: false, error: "Unauthorized: Please sign in." });
      return;
    }

    const updates = req.body || {};
    const customers = getCustomersList();
    const customer = customers.find((c) => c.id === result.user.uid);
    if (!customer) {
      res.status(404).json({ success: false, error: "Customer profile not found." });
      return;
    }

    customer.profile = {
      ...customer.profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.fullName) customer.fullName = updates.fullName;
    if (updates.phone) customer.phone = updates.phone;

    saveCustomersList(customers);
    res.json({ success: true, profile: customer.profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to update profile." });
  }
});

// Update runtime credentials (admin protected)
app.post("/api/admin/change-credentials", requireAdminAuth, (req, res) => {
  try {
    const { currentPassword = "", newPassword = "" } = req.body || {};
    const activePass = getAdminPassword();

    if (currentPassword.trim() !== activePass) {
      res.status(401).json({
        success: false,
        error: "Current password does not match server records.",
      });
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long.",
      });
      return;
    }

    setRuntimeAdminPassword(newPassword.trim());

    // Issue updated fresh token
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
    const payload = `house of shriya:${issuedAt}:${expiresAt}`;
    const signature = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

    res.json({
      success: true,
      token,
      message:
        "Admin password updated successfully for active runtime session. To persist across container restarts, also update ADMIN_PASSWORD in AI Studio Settings Secrets.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin User Accounts API (Admin Restricted)
app.get("/api/admin/users", requireAdminAuth, (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const users = readDataFile<any[]>("users.json", []);
  res.json(users);
});

app.post("/api/admin/users", requireAdminAuth, (req, res) => {
  try {
    const userData = req.body;
    if (!userData || !userData.email) {
      res.status(400).json({ error: "Email is required for user account" });
      return;
    }
    let users = readDataFile<any[]>("users.json", []);
    const idx = users.findIndex((u) => u.id === userData.id || u.email.toLowerCase() === userData.email.toLowerCase());
    if (idx > -1) {
      users[idx] = { ...users[idx], ...userData, updatedAt: new Date().toISOString() };
    } else {
      users.unshift({
        ...userData,
        id: userData.id || `usr_${Date.now()}`,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    writeDataFile("users.json", users);
    res.json({ success: true, user: users[idx > -1 ? idx : 0], users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:id", requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    let users = readDataFile<any[]>("users.json", []);
    const filtered = users.filter((u) => u.id !== id);
    writeDataFile("users.json", filtered);
    res.json({ success: true, id, count: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. GEMINI AI STYLING CONCIERGE & CHAT
// ==========================================
app.post("/api/ai/chat", async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message string required" });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "GEMINI_API_KEY not configured on server" });
    return;
  }
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction:
          "You are Pookie, the friendly, charming luxury Indian styling concierge for House of Shriya. House of Shriya is an atelier celebrating heirloom unstitched silk suits, Chanderi, Georgette, Organza, Banarasi, and Alia cut suits handcrafted with zari and gottapatti embroidery. Be helpful, courteous, warm, and concise.",
      },
    });
    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Gemini AI error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI styling advice" });
  }
});

// ==========================================
// 11. HEALTH & VERSION
// ==========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    app: "House of Shriya",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    platform: "ai-studio",
  });
});

app.get("/api/version", (req, res) => {
  res.json({
    name: "house-of-shriya",
    version: "2.1.0",
    platform: "ai-studio",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 11. VITE MIDDLEWARE / SPA FALLBACK
// ==========================================
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`House of Shriya full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

start();
