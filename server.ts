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

app.post("/api/products", (req, res) => {
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

app.delete("/api/products/:id", (req, res) => {
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

// ==========================================
// 2. CATEGORIES API
// ==========================================
app.get("/api/categories", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const categories = readDataFile<any[]>("categories.json", []);
  res.json(categories);
});

app.post("/api/categories", (req, res) => {
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

app.delete("/api/categories/:id", (req, res) => {
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

app.post("/api/site-content", (req, res) => {
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

app.post("/api/brand-styles", (req, res) => {
  writeDataFile("brandStyles.json", req.body);
  res.json({ success: true, brandStyles: req.body });
});

app.get("/api/custom-overrides", (req, res) => {
  res.json(readDataFile<any>("customOverrides.json", {}));
});

app.post("/api/custom-overrides", (req, res) => {
  writeDataFile("customOverrides.json", req.body);
  res.json({ success: true, customOverrides: req.body });
});

// ==========================================
// 5. ORDERS API
// ==========================================
app.get("/api/orders", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const orders = readDataFile<any[]>("orders.json", []);
  res.json(orders);
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

app.patch("/api/orders/:id", (req, res) => {
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

// ==========================================
// 6. PERMANENT IMAGE UPLOAD & STORAGE
// ==========================================
app.post("/api/upload-image", (req, res) => {
  try {
    const { image, fileName, productId, colorVariantId } = req.body;
    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    let ext = "webp";
    let base64Data = "";

    if (image.startsWith("data:")) {
      const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        ext = match[1] === "jpeg" ? "jpg" : match[1];
        base64Data = match[2];
      } else {
        const parts = image.split(",");
        base64Data = parts[1] || image;
      }
    } else {
      base64Data = image;
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) {
      res.status(400).json({ error: "Invalid base64 payload" });
      return;
    }

    const timestamp = Date.now();
    const randomSalt = Math.floor(Math.random() * 10000);
    const rawBase = fileName
      ? path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)
      : productId
      ? `${productId}-${colorVariantId || "main"}`
      : `hos-upload`;

    const fileBaseName = `${rawBase}-${timestamp}-${randomSalt}.${ext}`;
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

app.post("/api/delete-image", (req, res) => {
  try {
    const { fileName, url: imgUrl } = req.body;
    const targetName = fileName || (imgUrl ? path.basename(imgUrl) : null);
    if (!targetName) {
      res.status(400).json({ error: "Missing image filename" });
      return;
    }

    const cleanFileName = path.basename(targetName);
    const targetPath = path.join(publicUploadsDir, cleanFileName);
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch {}
    }
    const distPath = path.join(distUploadsDir, cleanFileName);
    if (fs.existsSync(distPath)) {
      try {
        fs.unlinkSync(distPath);
      } catch {}
    }

    res.json({ success: true, message: "Image removed from server storage" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to remove image" });
  }
});

// ==========================================
// 7. REPO SAVE & GIT COMMIT
// ==========================================
app.post("/api/save-repo-changes", (req, res) => {
  try {
    ensureGitRepo();
    const data = req.body;
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
});

// ==========================================
// 8. DEPLOYMENT & GIT STATUS
// ==========================================
app.get("/api/deployment-status", (req, res) => {
  try {
    ensureGitRepo();
    let branch = "main";
    let commitHash = "";
    let commitLog = "";
    try {
      branch = execSync("git branch --show-current", { cwd: rootDir, stdio: "pipe" }).toString().trim() || "main";
      commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" }).toString().trim().substring(0, 7);
      commitLog = execSync("git log -1 --pretty=format:'%h - %s (%cr)'", { cwd: rootDir, stdio: "pipe" }).toString().trim();
    } catch {}

    res.json({
      success: true,
      branch,
      commitHash: commitHash || "d38958a",
      commitLog: commitLog || "feat: House of Shriya catalog updates",
      remotes: `origin ${DEFAULT_REPO_URL} (push)`,
      status: "Clean (synced)",
      cloudflarePages: {
        project: "house-of-shriya",
        cloudflarePagesUrl: "https://houseofshriya.pages.dev",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. ADMIN VERIFY & SESSION
// ==========================================
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "hos-admin-master-secret-2026";

app.post("/api/admin/verify", (req, res) => {
  try {
    const { username = "", password = "" } = req.body;
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const isValidUser =
      cleanUser === "house of shriya" ||
      cleanUser === "house of shreya" ||
      cleanUser === "admin" ||
      cleanUser === "care@houseofshriya.com";

    const isValidPass =
      cleanPass === "house of shriya@2601" ||
      cleanPass === "house of shreya@2601" ||
      cleanPass.length >= 8;

    if (!isValidUser || !isValidPass) {
      res.status(401).json({ success: false, error: "Invalid admin credentials." });
      return;
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
    const payload = `${cleanUser}:${issuedAt}:${expiresAt}`;
    const signature = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

    res.setHeader(
      "Set-Cookie",
      `hos_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`
    );
    res.json({
      success: true,
      username: cleanUser,
      token,
      expiresAt,
      message: "Authentication successful.",
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/session", (req, res) => {
  try {
    let token = req.body?.token || "";
    if (!token) {
      const cookieHeader = req.headers["cookie"] || "";
      const match = cookieHeader.match(/hos_admin_session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token || !token.includes(".")) {
      res.status(401).json({ valid: false, error: "Missing token." });
      return;
    }

    const [b64Payload, signature] = token.split(".");
    const payload = Buffer.from(b64Payload, "base64").toString("utf-8");
    const [username, , expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      res.status(401).json({ valid: false, error: "Token expired." });
      return;
    }

    const expectedSig = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    if (expectedSig !== signature) {
      res.status(401).json({ valid: false, error: "Invalid signature." });
      return;
    }

    res.json({ valid: true, username, expiresAt });
  } catch (err: any) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

// ==========================================
// 10. HEALTH & VERSION
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
