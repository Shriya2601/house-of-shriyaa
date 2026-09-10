import type { Connect, Plugin } from "vite";
import fs from "fs";
import path from "path";

// In-memory cache for ultra-fast instant rendering of uploaded photos with timestamp tracking
const memoryUploadsCache = new Map<string, { mime: string; buffer: Buffer; mtimeMs: number }>();

// 1x1 transparent PNG fallback buffer
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

function setAntiCacheHeaders(res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
}

// Active SSE clients for real-time live sync across any device or browser tab
const activeSseClients = new Set<any>();

export function broadcastSseSync(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const client of Array.from(activeSseClients)) {
    try {
      client.write(`event: sync\ndata: ${payload}\n\n`);
    } catch {
      activeSseClients.delete(client);
    }
  }
}

const memoryDataCache: Record<string, any> = {};

function syncDataFile(filename: string, data: any): void {
  memoryDataCache[filename] = data;
  const jsonStr = JSON.stringify(data, null, 2);
  const targets = [
    path.resolve(process.cwd(), "public/data", filename),
    path.resolve(process.cwd(), "src/data", filename),
    path.resolve(process.cwd(), "dist/data", filename),
  ];
  for (const target of targets) {
    try {
      // Don't create dist directory if it does not already exist
      if (target.includes("dist") && !fs.existsSync(path.resolve(process.cwd(), "dist"))) {
        continue;
      }
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(target, jsonStr, "utf-8");
    } catch (err) {
      console.error(`[API Middleware] Error syncing ${target}:`, err);
    }
  }
}

function readDataFile(filename: string, fallback: any = []): any {
  if (memoryDataCache[filename] !== undefined) {
    return memoryDataCache[filename];
  }
  const targets = [
    path.resolve(process.cwd(), "public/data", filename),
    path.resolve(process.cwd(), "src/data", filename),
    path.resolve(process.cwd(), "dist/data", filename),
  ];
  for (const target of targets) {
    if (fs.existsSync(target)) {
      try {
        const raw = fs.readFileSync(target, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed !== undefined && parsed !== null) {
          memoryDataCache[filename] = parsed;
          return parsed;
        }
      } catch {}
    }
  }
  return fallback;
}

function getDeletedIds(type: string): Set<string> {
  const filename = `deleted_${type}.json`;
  const list = readDataFile(filename, []);
  return new Set(Array.isArray(list) ? list : []);
}

function recordDeletedId(type: string, id: string): void {
  if (!id) return;
  const filename = `deleted_${type}.json`;
  const set = getDeletedIds(type);
  set.add(id);
  syncDataFile(filename, Array.from(set));
}

function unrecordDeletedId(type: string, id: string): void {
  if (!id) return;
  const filename = `deleted_${type}.json`;
  const set = getDeletedIds(type);
  if (set.has(id)) {
    set.delete(id);
    syncDataFile(filename, Array.from(set));
  }
}

function readProducts(): any[] {
  const list = readDataFile("products.json", []);
  const deleted = getDeletedIds("products");
  return (Array.isArray(list) ? list : []).filter((p) => p && p.id && !deleted.has(p.id));
}

function writeProducts(products: any[]): void {
  syncDataFile("products.json", products);
  broadcastSseSync("products", products);
}

function readCategories(): any[] {
  const list = readDataFile("categories.json", []);
  const deleted = getDeletedIds("categories");
  return (Array.isArray(list) ? list : []).filter(
    (c) => c && (!c.id || !deleted.has(c.id)) && (!c.slug || !deleted.has(c.slug)) && (!c.name || !deleted.has(c.name))
  );
}

function writeCategories(categories: any[]): void {
  syncDataFile("categories.json", categories);
  broadcastSseSync("categories", categories);
}

function readSiteContent(): any {
  const content = readDataFile("siteContent.json", {});
  return content && typeof content === "object" ? content : {};
}

function writeSiteContent(content: any): void {
  syncDataFile("siteContent.json", content);
  broadcastSseSync("site_content", content);
}

function readOrdersList(): any[] {
  const list = readDataFile("orders.json", []);
  const deleted = getDeletedIds("orders");
  return (Array.isArray(list) ? list : [])
    .map((o) => {
      if (o && !o.id && o.orderNumber) {
        o.id = `ord_${o.orderNumber.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
      }
      return o;
    })
    .filter(
      (o) => o && (!o.id || !deleted.has(o.id)) && (!o.orderNumber || !deleted.has(o.orderNumber))
    );
}

function writeOrdersList(orders: any[]): void {
  syncDataFile("orders.json", orders);
  broadcastSseSync("orders", orders);
}

function readBookingsList(): any[] {
  const list = readDataFile("bookings.json", []);
  const deleted = getDeletedIds("bookings");
  return (Array.isArray(list) ? list : [])
    .map((b) => {
      if (b && !b.id && b.bookingNumber) {
        b.id = `book_${b.bookingNumber.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
      }
      return b;
    })
    .filter(
      (b) => b && (!b.id || !deleted.has(b.id)) && (!b.bookingNumber || !deleted.has(b.bookingNumber))
    );
}

function writeBookingsList(bookings: any[]): void {
  syncDataFile("bookings.json", bookings);
  broadcastSseSync("bookings", bookings);
}

function setCorsHeaders(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, x-admin-token"
  );
}

function parseJsonBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve(req.body || {});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err: any) => reject(err));
  });
}

export const apiHandler: Connect.NextHandleFunction = async (req, res, next) => {
  const rawUrl = req.url || "";
  let parsedUrl: URL;
  let pathname = rawUrl;
  try {
    parsedUrl = new URL(rawUrl, "http://localhost");
    pathname = parsedUrl.pathname;
  } catch {
    parsedUrl = new URL("http://localhost" + (rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl));
    pathname = rawUrl.split("?")[0];
  }
  const urlWithoutQuery = pathname.replace(/\/+$/, "") || "/";
  const method = (req.method || "GET").toUpperCase();

  try {
      // Direct Static Image Serving for /uploads/* and /public/uploads/*
      // Bypasses Vite SPA fallback so images NEVER return HTML and load instantly with zero glitch
      if (urlWithoutQuery.startsWith("/uploads/") || urlWithoutQuery.startsWith("/public/uploads/")) {
        let rawFilename = path.basename(urlWithoutQuery);
        let filename = rawFilename;
        try {
          filename = decodeURIComponent(rawFilename);
        } catch {}

        setCorsHeaders(res);

        if (method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        // Check filesystem first to ensure file exists and is fresh
        const possiblePaths = [
          path.resolve(process.cwd(), "public/uploads", filename),
          path.resolve(process.cwd(), "public/uploads", rawFilename),
          path.resolve(process.cwd(), "dist/uploads", filename),
          path.resolve(process.cwd(), "dist/uploads", rawFilename),
        ];

      let foundPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }

      if (foundPath) {
        try {
          const stat = fs.statSync(foundPath);
          const etag = `"${filename}-${stat.mtimeMs.toString(36)}-${stat.size.toString(36)}"`;

          // Check If-None-Match header for conditional 304 response
          const ifNoneMatch = req.headers["if-none-match"];
          if (ifNoneMatch && ifNoneMatch === etag) {
            res.setHeader("ETag", etag);
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
            res.statusCode = 304;
            res.end();
            return;
          }

          let buffer: Buffer;
          let mime = "image/jpeg";
          const ext = path.extname(filename).toLowerCase();
          if (ext === ".png") mime = "image/png";
          else if (ext === ".webp") mime = "image/webp";
          else if (ext === ".svg") mime = "image/svg+xml";
          else if (ext === ".gif") mime = "image/gif";

          // Use memory cache only if modification timestamp matches
          const cached = memoryUploadsCache.get(filename);
          if (cached && cached.mtimeMs === stat.mtimeMs) {
            buffer = cached.buffer;
            mime = cached.mime;
          } else {
            buffer = fs.readFileSync(foundPath);
            memoryUploadsCache.set(filename, { mime, buffer, mtimeMs: stat.mtimeMs });
          }

          res.setHeader("Content-Type", mime);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("ETag", etag);
          // Set no-cache, must-revalidate so updated photos reflect live immediately
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
          res.statusCode = 200;
          res.end(buffer);
          return;
        } catch (readErr) {
          console.warn("[Uploads Server] Read error:", readErr);
        }
      }

      // Fallback: If not found, evict from memory cache and return 404 with strict NO-CACHE
      memoryUploadsCache.delete(filename);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.statusCode = 404;
      res.end(TRANSPARENT_PNG);
      return;
    }

    // Direct Live Data Serving for /data/*.json
    // Ensures mobile, tablet, and cross-device browsers never cache stale static json files
    if (urlWithoutQuery.startsWith("/data/") && urlWithoutQuery.endsWith(".json")) {
      const filename = path.basename(urlWithoutQuery);
      const data = readDataFile(filename, null);
      if (data !== null) {
        setCorsHeaders(res);
        setAntiCacheHeaders(res);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.end(JSON.stringify(data));
        return;
      }
    }

    // Check if request is under /api
    if (!urlWithoutQuery.startsWith("/api")) {
      return next();
    }

    setCorsHeaders(res);

        // Preflight OPTIONS requests
        if (method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        // 1. HEALTH CHECK: GET /api/health
        if (urlWithoutQuery === "/api/health" && (method === "GET" || method === "HEAD")) {
          setAntiCacheHeaders(res);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
          return;
        }

        // 1B. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM FOR ZERO-LATENCY CROSS-DEVICE LIVE SYNC
        if (urlWithoutQuery === "/api/sync/events" || urlWithoutQuery === "/api/sync/events/") {
          setCorsHeaders(res);
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          });
          res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);
          activeSseClients.add(res);

          const keepAlive = setInterval(() => {
            try {
              res.write(": ping\n\n");
            } catch {
              clearInterval(keepAlive);
              activeSseClients.delete(res);
            }
          }, 15000);

          req.on("close", () => {
            clearInterval(keepAlive);
            activeSseClients.delete(res);
          });
          return;
        }

        // 1C. INSTANT SYNC STATUS & CATALOG SNAPSHOT
        if (urlWithoutQuery === "/api/sync/status" || urlWithoutQuery === "/api/sync/version") {
          setAntiCacheHeaders(res);
          setCorsHeaders(res);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              status: "ok",
              timestamp: Date.now(),
              productsCount: readProducts().length,
              categoriesCount: readCategories().length,
              ordersCount: readOrdersList().length,
              bookingsCount: readBookingsList().length,
            })
          );
          return;
        }

        // 1D. DELETED IDENTIFIERS SYNC: /api/deleted-ids
        if (urlWithoutQuery === "/api/deleted-ids") {
          setAntiCacheHeaders(res);
          setCorsHeaders(res);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              products: Array.from(getDeletedIds("products")),
              categories: Array.from(getDeletedIds("categories")),
              orders: Array.from(getDeletedIds("orders")),
              bookings: Array.from(getDeletedIds("bookings")),
            })
          );
          return;
        }

        // 2. PRODUCTS COLLECTION: /api/products
        if (urlWithoutQuery === "/api/products") {
          setAntiCacheHeaders(res);

          if (method === "GET") {
            const products = readProducts();
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(products));
            return;
          }

          if (method === "POST" || method === "PUT") {
            try {
              const body = await parseJsonBody(req);
              let products = readProducts();

              if (Array.isArray(body)) {
                products = body;
              } else if (Array.isArray(body.products)) {
                products = body.products;
              } else if (typeof body === "object" && body !== null) {
                const product = {
                  ...body,
                  id: body.id || `hos-${Date.now()}`,
                  updatedAt: new Date().toISOString(),
                };
                const idx = products.findIndex((p) => p.id === product.id);
                if (idx > -1) {
                  products[idx] = { ...product, id: product.id, updatedAt: new Date().toISOString() };
                } else {
                  products.unshift(product);
                }
                unrecordDeletedId("products", product.id);
                writeProducts(products);
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, product, count: products.length }));
                return;
              }

              writeProducts(products);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: products.length, products }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message || "Invalid JSON payload" }));
              return;
            }
          }

          if (method === "DELETE") {
            try {
              const body = await parseJsonBody(req).catch(() => ({}));
              const parsedUrl = new URL(req.url, "http://localhost:3000");
              const delId = parsedUrl.searchParams.get("id") || body?.id;
              if (delId) {
                let products = readProducts();
                const filtered = products.filter((p) => p.id !== delId);
                recordDeletedId("products", delId);
                writeProducts(filtered);
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, id: delId, count: filtered.length }));
                return;
              }
            } catch (err: any) {
              console.warn("[API] Delete product query error:", err);
            }
          }

          // If method not allowed on collection
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 405;
          res.end(JSON.stringify({ error: `Method ${method} not allowed on /api/products` }));
          return;
        }

        // 3. SINGLE PRODUCT ITEM: /api/products/:id
        const productMatch = urlWithoutQuery.match(/^\/api\/products\/([^/]+)$/);
        if (productMatch) {
          setAntiCacheHeaders(res);
          const productId = decodeURIComponent(productMatch[1]);
          let products = readProducts();

          if (method === "GET") {
            const found = products.find((p) => p.id === productId);
            res.setHeader("Content-Type", "application/json");
            if (found) {
              res.statusCode = 200;
              res.end(JSON.stringify(found));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `Product not found: ${productId}` }));
            }
            return;
          }

          // Handle POST, PUT, and PATCH on single item to avoid any 405 Method Not Allowed errors
          if (method === "POST" || method === "PUT" || method === "PATCH") {
            try {
              const body = await parseJsonBody(req);
              const product = {
                ...body,
                id: productId,
                updatedAt: new Date().toISOString(),
              };
              const idx = products.findIndex((p) => p.id === productId);
              if (idx > -1) {
                products[idx] = { ...product, id: productId, updatedAt: new Date().toISOString() };
              } else {
                products.unshift(product);
              }
              unrecordDeletedId("products", productId);
              writeProducts(products);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, product, count: products.length }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message || "Invalid JSON payload" }));
              return;
            }
          }

          if (method === "DELETE") {
            const filtered = products.filter((p) => p.id !== productId);
            recordDeletedId("products", productId);
            writeProducts(filtered);
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, id: productId, count: filtered.length }));
            return;
          }

          res.setHeader("Content-Type", "application/json");
          res.statusCode = 405;
          res.end(JSON.stringify({ error: `Method ${method} not allowed on /api/products/${productId}` }));
          return;
        }

        // 4. CATEGORIES: /api/categories
        if (urlWithoutQuery === "/api/categories") {
          setAntiCacheHeaders(res);
          let categories = readCategories();

          if (method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(categories));
            return;
          }

          if (method === "POST" || method === "PUT") {
            try {
              const body = await parseJsonBody(req);
              if (Array.isArray(body)) {
                categories = body;
              } else if (body && typeof body === "object") {
                const idx = categories.findIndex(
                  (c) => (body.id && c.id === body.id) || (body.name && c.name === body.name)
                );
                if (idx > -1) {
                  categories[idx] = { ...categories[idx], ...body };
                } else {
                  categories.push({ id: body.id || `cat-${Date.now()}`, ...body });
                }
                if (body.id) unrecordDeletedId("categories", body.id);
                if (body.slug) unrecordDeletedId("categories", body.slug);
                if (body.name) unrecordDeletedId("categories", body.name);
              }
              writeCategories(categories);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: categories.length, categories }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
        }

        // 4B. SINGLE CATEGORY ITEM: /api/categories/:id
        const categoryMatch = urlWithoutQuery.match(/^\/api\/categories\/([^/]+)$/);
        if (categoryMatch) {
          setAntiCacheHeaders(res);
          const catId = decodeURIComponent(categoryMatch[1]);
          let categories = readCategories();

          if (method === "DELETE") {
            const filtered = categories.filter(
              (c) => c.id !== catId && c.slug !== catId && c.name !== catId
            );
            recordDeletedId("categories", catId);
            writeCategories(filtered);
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, id: catId, count: filtered.length }));
            return;
          }
        }

        // 5. DIRECT PHOTO UPLOAD & PURGE: /api/upload
        if (urlWithoutQuery === "/api/upload" || urlWithoutQuery === "/api/upload/") {
          setAntiCacheHeaders(res);
          setCorsHeaders(res);

          if (method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          // Support removing an image to completely purge it from disk and memory cache
          if (method === "DELETE" || ((method === "POST" || method === "PUT") && rawUrl.includes("delete"))) {
            try {
              let filenameToDelete = "";
              const urlObj = new URL(rawUrl, "http://localhost:3000");
              const queryTarget = urlObj.searchParams.get("filename") || urlObj.searchParams.get("url");
              if (queryTarget) {
                filenameToDelete = path.basename(queryTarget.split("?")[0]);
              } else {
                const body = await parseJsonBody(req);
                const target = body.filename || body.url || body.image;
                if (target) filenameToDelete = path.basename(String(target).split("?")[0]);
              }

              if (filenameToDelete && !filenameToDelete.includes("..") && filenameToDelete !== ".gitkeep") {
                memoryUploadsCache.delete(filenameToDelete);
                const pathsToDel = [
                  path.resolve(process.cwd(), "public/uploads", filenameToDelete),
                  path.resolve(process.cwd(), "dist/uploads", filenameToDelete),
                ];
                for (const p of pathsToDel) {
                  if (fs.existsSync(p)) {
                    try { fs.unlinkSync(p); } catch {}
                  }
                }
              }

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, purged: filenameToDelete }));
              return;
            } catch (delErr: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: delErr.message }));
              return;
            }
          }

          if (method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, status: "ready", message: "Upload service active" }));
            return;
          }

          if (method === "POST" || method === "PUT" || method === "PATCH") {
            try {
              const body = await parseJsonBody(req);
              const rawData = body.dataUrl || body.image || body.base64;
              if (!rawData || typeof rawData !== "string") {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing image dataUrl in request payload" }));
                return;
              }

              // Extract mime type and base64 buffer
              let ext = "jpg";
              let mime = "image/jpeg";
              let base64Data = rawData;
              const matches = rawData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
              if (matches) {
                const detectedSub = matches[1].toLowerCase();
                if (detectedSub.includes("png")) { ext = "png"; mime = "image/png"; }
                else if (detectedSub.includes("webp")) { ext = "webp"; mime = "image/webp"; }
                else if (detectedSub.includes("gif")) { ext = "gif"; mime = "image/gif"; }
                else if (detectedSub.includes("jpeg") || detectedSub.includes("jpg")) { ext = "jpg"; mime = "image/jpeg"; }
                base64Data = matches[2];
              }

              const buffer = Buffer.from(base64Data, "base64");
              const safePrefix = (body.filename || "upload")
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, "-")
                .slice(0, 24) || "upload";
              const timestamp = Date.now();
              const generatedFilename = `${safePrefix}-${timestamp}-${Math.floor(Math.random() * 10000)}.${ext}`;

              const uploadsDir = path.resolve(process.cwd(), "public/uploads");
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              const filePath = path.join(uploadsDir, generatedFilename);
              fs.writeFileSync(filePath, buffer);

              // Also copy to dist/uploads if dist exists
              const distUploadsDir = path.resolve(process.cwd(), "dist/uploads");
              if (fs.existsSync(distUploadsDir)) {
                try {
                  fs.writeFileSync(path.join(distUploadsDir, generatedFilename), buffer);
                } catch {}
              }

              // Immediately prime the in-memory cache with timestamp
              memoryUploadsCache.set(generatedFilename, { mime, buffer, mtimeMs: timestamp });

              const publicUrl = `/uploads/${generatedFilename}?v=${timestamp}`;
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, url: publicUrl, filename: generatedFilename }));
              return;
            } catch (err: any) {
              console.error("[API Middleware] Photo upload error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || "Failed to process photo upload" }));
              return;
            }
          }

          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, status: "ready" }));
          return;
        }

        // ============================================================
        // 5B. SITE CONTENT (HERO BANNERS, SITE TEXT): /api/site-content
        // ============================================================
        if (urlWithoutQuery === "/api/proxy-image") {
          const rawUrl = parsedUrl.searchParams.get("url");
          if (!rawUrl) {
            res.statusCode = 400;
            res.end("Missing url parameter");
            return;
          }
          let resolved = rawUrl;
          if (rawUrl.includes("eA9kgNNZCuEDbWDBS8JI")) {
            resolved = "https://plain-apac-prod-public.komododecks.com/202609/05/eA9kgNNZCuEDbWDBS8JI/image.jpg";
          } else if (rawUrl.includes("4UmFSGtcoZdZF37bKc3R")) {
            resolved = "https://plain-apac-prod-public.komododecks.com/202609/05/4UmFSGtcoZdZF37bKc3R/image.jpg";
          } else if (rawUrl.includes("kommodo.ai/i/")) {
            try {
              const fetchRes = await fetch(rawUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
              if (fetchRes.ok) {
                const html = await fetchRes.text();
                const m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                          html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
                if (m && m[1]) resolved = m[1];
              }
            } catch {}
          }
          res.writeHead(302, { Location: resolved });
          res.end();
          return;
        }

        if (urlWithoutQuery === "/api/site-content" || urlWithoutQuery === "/api/content") {
          setAntiCacheHeaders(res);

          if (method === "GET") {
            const data = readSiteContent();
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(data));
            return;
          }

          if (method === "POST" || method === "PUT" || method === "PATCH") {
            try {
              const body = await parseJsonBody(req);
              const existing = readSiteContent();

              // Auto-resolve any share links in heroSlides
              if (Array.isArray(body.heroSlides)) {
                for (let i = 0; i < body.heroSlides.length; i++) {
                  const s = body.heroSlides[i];
                  if (s && s.image && typeof s.image === "string") {
                    if (s.image.includes("eA9kgNNZCuEDbWDBS8JI")) {
                      s.image = "https://plain-apac-prod-public.komododecks.com/202609/05/eA9kgNNZCuEDbWDBS8JI/image.jpg";
                    } else if (s.image.includes("4UmFSGtcoZdZF37bKc3R")) {
                      s.image = "https://plain-apac-prod-public.komododecks.com/202609/05/4UmFSGtcoZdZF37bKc3R/image.jpg";
                    } else if (s.image.includes("kommodo.ai/i/")) {
                      try {
                        const fetchRes = await fetch(s.image, { headers: { "User-Agent": "Mozilla/5.0" } });
                        if (fetchRes.ok) {
                          const html = await fetchRes.text();
                          const m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                                    html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
                          if (m && m[1]) s.image = m[1];
                        }
                      } catch {}
                    }
                  }
                }
              }

              const updated = {
                ...existing,
                ...body,
                updatedAt: new Date().toISOString(),
              };

              if (Array.isArray(body.heroSlides)) {
                updated.heroSlides = body.heroSlides;
              }
              if (Array.isArray(body.features)) {
                updated.features = body.features;
              }
              if (Array.isArray(body.trustBadges)) {
                updated.trustBadges = body.trustBadges;
              }

              writeSiteContent(updated);

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, siteContent: updated }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message || "Failed to update site content" }));
              return;
            }
          }
        }

        // ============================================================
        // 6. ORDERS COLLECTION & SHIPROCKET AUTO-FULFILLMENT: /api/orders
        // ============================================================
        if (urlWithoutQuery === "/api/orders") {
          setAntiCacheHeaders(res);

          if (method === "GET") {
            const orders = readOrdersList();
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(orders));
            return;
          }

          if (method === "POST") {
            try {
              const body = await parseJsonBody(req);
              const now = new Date();
              const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
              const randomSuffix = Math.floor(1000 + Math.random() * 9000);
              const orderId = body.id || `ord_${Date.now()}_${randomSuffix}`;
              const orderNumber = body.orderNumber || `HOS-${datePrefix}-${randomSuffix}`;

              let order: any = {
                ...body,
                id: orderId,
                orderNumber,
                createdAt: body.createdAt || now.toISOString(),
                updatedAt: now.toISOString(),
                orderStatus: body.orderStatus || "confirmed",
                paymentStatus: body.paymentStatus || (body.paymentMethod?.includes("Cash") ? "Pending" : "Paid"),
              };

              // Automatically trigger Shiprocket shipment creation
              let shiprocketResult: any = null;
              try {
                const { createShiprocketOrder } = await import("./shiprocketService");
                shiprocketResult = await createShiprocketOrder(order);

                if (shiprocketResult && shiprocketResult.success) {
                  order.shiprocketOrderId = shiprocketResult.shiprocketOrderId;
                  order.shiprocketShipmentId = shiprocketResult.shipmentId;
                  order.shiprocketStatus = "SYNCED";
                  order.trackingNumber = shiprocketResult.awbCode || order.trackingNumber;
                  order.trackingCourier = shiprocketResult.courierName || order.trackingCourier || "Shiprocket Express";
                  order.trackingUrl = shiprocketResult.trackingUrl || (order.trackingNumber ? `https://shiprocket.co/tracking/${order.trackingNumber}` : undefined);
                  order.shiprocketSyncedAt = new Date().toISOString();
                  order.shiprocketRetryCount = 0;
                  order.shiprocketError = undefined;
                } else {
                  order.shiprocketStatus = "PENDING_RETRY";
                  order.shiprocketError = shiprocketResult?.error || "Initial Shiprocket dispatch pending credential verification";
                  order.shiprocketRetryCount = 1;
                  order.shiprocketLastAttemptAt = new Date().toISOString();
                }
              } catch (srErr: any) {
                console.error("[API Middleware] Shiprocket auto-dispatch error:", srErr.message);
                order.shiprocketStatus = "PENDING_RETRY";
                order.shiprocketError = srErr.message;
                order.shiprocketRetryCount = 1;
                order.shiprocketLastAttemptAt = new Date().toISOString();
              }

              // Persist order
              const existingOrders = readOrdersList();
              const existingIdx = existingOrders.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
              if (existingIdx > -1) {
                existingOrders[existingIdx] = { ...existingOrders[existingIdx], ...order };
              } else {
                existingOrders.unshift(order);
              }
              unrecordDeletedId("orders", order.id);
              if (order.orderNumber) unrecordDeletedId("orders", order.orderNumber);
              writeOrdersList(existingOrders);

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  order,
                  shiprocket: shiprocketResult,
                })
              );
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message || "Invalid order payload" }));
              return;
            }
          }
        }

        // ============================================================
        // 6B. SINGLE ORDER ITEM: /api/orders/:id
        // ============================================================
        const orderItemMatch = urlWithoutQuery.match(/^\/api\/orders\/([^/]+)$/);
        if (orderItemMatch) {
          setAntiCacheHeaders(res);
          const orderId = decodeURIComponent(orderItemMatch[1]);
          let orders = readOrdersList();

          if (method === "GET") {
            const found = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
            res.setHeader("Content-Type", "application/json");
            if (found) {
              res.statusCode = 200;
              res.end(JSON.stringify(found));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `Order not found: ${orderId}` }));
            }
            return;
          }

          if (method === "POST" || method === "PUT" || method === "PATCH") {
            try {
              const body = await parseJsonBody(req);
              const now = new Date().toISOString();
              const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
              let updatedOrder: any;

              if (idx > -1) {
                updatedOrder = { ...orders[idx], ...body, updatedAt: now };
                orders[idx] = updatedOrder;
              } else {
                updatedOrder = { ...body, id: orderId, updatedAt: now };
                orders.unshift(updatedOrder);
              }

              // Automatically push to Shiprocket if order is confirmed or paid and not yet synced
              const shouldSyncShiprocket =
                (updatedOrder.orderStatus === "confirmed" ||
                  updatedOrder.paymentStatus === "Paid" ||
                  body.forceShiprocketSync) &&
                updatedOrder.shiprocketStatus !== "SYNCED";

              if (shouldSyncShiprocket) {
                try {
                  const { createShiprocketOrder } = await import("./shiprocketService");
                  const shiprocketResult = await createShiprocketOrder(updatedOrder, body.pickupLocation);

                  if (shiprocketResult && shiprocketResult.success) {
                    updatedOrder.shiprocketOrderId = shiprocketResult.shiprocketOrderId;
                    updatedOrder.shiprocketShipmentId = shiprocketResult.shipmentId;
                    updatedOrder.shiprocketStatus = "SYNCED";
                    updatedOrder.trackingNumber = shiprocketResult.awbCode || updatedOrder.trackingNumber;
                    updatedOrder.trackingCourier = shiprocketResult.courierName || updatedOrder.trackingCourier || "Shiprocket Express";
                    updatedOrder.trackingUrl = shiprocketResult.trackingUrl || (updatedOrder.trackingNumber ? `https://shiprocket.co/tracking/${updatedOrder.trackingNumber}` : undefined);
                    updatedOrder.shiprocketSyncedAt = new Date().toISOString();
                    updatedOrder.shiprocketError = undefined;
                    updatedOrder.shiprocketRetryCount = 0;
                  } else {
                    updatedOrder.shiprocketStatus = "PENDING_RETRY";
                    updatedOrder.shiprocketError = shiprocketResult?.error || "Shiprocket sync pending verification";
                    updatedOrder.shiprocketLastAttemptAt = new Date().toISOString();
                  }

                  const orderRefreshIdx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
                  if (orderRefreshIdx > -1) orders[orderRefreshIdx] = updatedOrder;
                } catch (srErr: any) {
                  console.warn("[API Middleware] Shiprocket confirmation sync notice:", srErr.message);
                }
              }

              unrecordDeletedId("orders", orderId);
              if (updatedOrder.orderNumber) unrecordDeletedId("orders", updatedOrder.orderNumber);
              writeOrdersList(orders);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, order: updatedOrder, count: orders.length }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message || "Invalid JSON payload" }));
              return;
            }
          }

          if (method === "DELETE") {
            const found = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
            const filtered = orders.filter((o) => o.id !== orderId && o.orderNumber !== orderId);
            recordDeletedId("orders", orderId);
            if (found) {
              if (found.id) recordDeletedId("orders", found.id);
              if (found.orderNumber) recordDeletedId("orders", found.orderNumber);
            }
            writeOrdersList(filtered);
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, id: orderId, count: filtered.length }));
            return;
          }

          res.setHeader("Content-Type", "application/json");
          res.statusCode = 405;
          res.end(JSON.stringify({ error: `Method ${method} not allowed on /api/orders/${orderId}` }));
          return;
        }

        // ============================================================
        // 6C. ORDER CONFIRMATION NOTIFICATIONS: /api/notifications/order-confirmation
        // ============================================================
        if (urlWithoutQuery === "/api/notifications/order-confirmation") {
          setCorsHeaders(res);
          setAntiCacheHeaders(res);

          if (method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (method === "POST") {
            try {
              const body = await parseJsonBody(req);
              const notifLogPath = path.resolve(process.cwd(), "public/data/notifications.json");

              let logs: any[] = [];
              try {
                if (fs.existsSync(notifLogPath)) {
                  logs = JSON.parse(fs.readFileSync(notifLogPath, "utf-8"));
                  if (!Array.isArray(logs)) logs = [];
                }
              } catch {}

              const logEntry = {
                id: `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
                orderNumber: body.orderNumber,
                customerPhone: body.customerPhone,
                customerName: body.customerName,
                channel: body.channel || "WhatsApp & SMS",
                status: "DELIVERED",
                messagePreview: typeof body.message === "string" ? body.message.slice(0, 150) + "..." : "",
                timestamp: body.timestamp || new Date().toISOString(),
              };

              logs.unshift(logEntry);
              if (logs.length > 200) logs = logs.slice(0, 200);

              const dir = path.dirname(notifLogPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(notifLogPath, JSON.stringify(logs, null, 2), "utf-8");

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Order confirmation notification logged & dispatched successfully",
                  log: logEntry,
                })
              );
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, warning: err.message }));
              return;
            }
          }

          if (method === "GET") {
            const notifLogPath = path.resolve(process.cwd(), "public/data/notifications.json");
            let logs: any[] = [];
            try {
              if (fs.existsSync(notifLogPath)) {
                logs = JSON.parse(fs.readFileSync(notifLogPath, "utf-8"));
                if (!Array.isArray(logs)) logs = [];
              }
            } catch {}
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, count: logs.length, notifications: logs }));
            return;
          }
        }

        // ============================================================
        // 6D. ATELIER BOOKINGS COLLECTION: /api/bookings
        // ============================================================
        if (urlWithoutQuery === "/api/bookings") {
          setAntiCacheHeaders(res);
          setCorsHeaders(res);

          if (method === "GET") {
            const bookings = readBookingsList();
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(bookings));
            return;
          }

          if (method === "POST" || method === "PUT") {
            try {
              const body = await parseJsonBody(req);
              let bookings = readBookingsList();
              const now = new Date().toISOString();
              const bookingId = body.id || `book_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

              const newBooking = {
                ...body,
                id: bookingId,
                createdAt: body.createdAt || now,
                updatedAt: now,
                status: body.status || "confirmed",
              };

              const idx = bookings.findIndex((b) => b.id === bookingId);
              if (idx > -1) {
                bookings[idx] = { ...bookings[idx], ...newBooking };
              } else {
                bookings.unshift(newBooking);
              }

              unrecordDeletedId("bookings", bookingId);
              if (newBooking.bookingNumber) unrecordDeletedId("bookings", newBooking.bookingNumber);
              writeBookingsList(bookings);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, booking: newBooking, count: bookings.length }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message || "Failed to save booking" }));
              return;
            }
          }
        }

        // 6E. SINGLE BOOKING ITEM: /api/bookings/:id
        const bookingMatch = urlWithoutQuery.match(/^\/api\/bookings\/([^/]+)$/);
        if (bookingMatch) {
          setAntiCacheHeaders(res);
          setCorsHeaders(res);
          const bookingId = decodeURIComponent(bookingMatch[1]);
          let bookings = readBookingsList();

          if (method === "GET") {
            const found = bookings.find((b) => b.id === bookingId);
            res.setHeader("Content-Type", "application/json");
            if (found) {
              res.statusCode = 200;
              res.end(JSON.stringify(found));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `Booking not found: ${bookingId}` }));
            }
            return;
          }

          if (method === "PUT" || method === "PATCH" || method === "POST") {
            try {
              const body = await parseJsonBody(req);
              const now = new Date().toISOString();
              const idx = bookings.findIndex((b) => b.id === bookingId);
              let updatedBooking: any;

              if (idx > -1) {
                updatedBooking = { ...bookings[idx], ...body, updatedAt: now };
                bookings[idx] = updatedBooking;
              } else {
                updatedBooking = { ...body, id: bookingId, updatedAt: now };
                bookings.unshift(updatedBooking);
              }

              writeBookingsList(bookings);
              unrecordDeletedId("bookings", bookingId);
              if (updatedBooking.bookingNumber) unrecordDeletedId("bookings", updatedBooking.bookingNumber);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, booking: updatedBooking, count: bookings.length }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          if (method === "DELETE") {
            const found = bookings.find((b) => b.id === bookingId || b.bookingNumber === bookingId);
            const filtered = bookings.filter((b) => b.id !== bookingId && b.bookingNumber !== bookingId);
            recordDeletedId("bookings", bookingId);
            if (found) {
              if (found.id) recordDeletedId("bookings", found.id);
              if (found.bookingNumber) recordDeletedId("bookings", found.bookingNumber);
            }
            writeBookingsList(filtered);
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, id: bookingId, count: filtered.length }));
            return;
          }
        }

        // ============================================================
        // 7. SHIPROCKET DEDICATED ROUTES (/api/shipping/shiprocket/*)
        // ============================================================
        if (urlWithoutQuery.startsWith("/api/shipping/shiprocket") || urlWithoutQuery.startsWith("/api/shiprocket")) {
          setCorsHeaders(res);
          setAntiCacheHeaders(res);

          if (method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          const {
            testShiprocketAuth,
            testCustomShiprocketCredentials,
            createShiprocketOrder,
            trackShiprocketShipment,
            checkCourierServiceability,
            updateShiprocketConfig,
            getShiprocketConfig,
          } = await import("./shiprocketService");

          // A. Status & Connection Test: GET /api/shipping/shiprocket/status
          if (urlWithoutQuery === "/api/shipping/shiprocket/status" && method === "GET") {
            const statusResult = await testShiprocketAuth();
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(statusResult));
            return;
          }

          // A2. Test Provided Credentials: POST / GET /api/shipping/shiprocket/test-credentials
          if (urlWithoutQuery === "/api/shipping/shiprocket/test-credentials") {
            setCorsHeaders(res);
            setAntiCacheHeaders(res);
            if (method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }

            try {
              let email = "";
              let password = "";
              if (method === "POST" || method === "PUT") {
                const body = await parseJsonBody(req);
                email = body.email || "";
                password = body.password || "";
              } else if (method === "GET") {
                const parsedUrl = new URL(rawUrl, "http://localhost:3000");
                email = parsedUrl.searchParams.get("email") || "";
                password = parsedUrl.searchParams.get("password") || "";
              }

              if (!email || !password) {
                const cfg = getShiprocketConfig();
                email = email || cfg.email;
                password = password || cfg.password;
              }

              const testResult = await testCustomShiprocketCredentials(email, password);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify(testResult));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200; // Always return 200 with JSON payload so client gets clean readable message
              res.end(JSON.stringify({ success: false, message: err.message || "Failed to verify credentials" }));
              return;
            }
          }

          // B. Update Config / Credentials: POST /api/shipping/shiprocket/config
          if (urlWithoutQuery === "/api/shipping/shiprocket/config") {
            if (method === "GET") {
              const cfg = getShiprocketConfig();
              const maskedEmail = cfg.email.replace(/^(.)(.*)(@.*)$/, (_, f, m, end) => `${f}${"*".repeat(m.length)}${end}`);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  email: cfg.email,
                  emailMasked: maskedEmail,
                  pickupLocation: cfg.pickupLocation,
                  isConfigured: cfg.isConfigured,
                  hasPassword: Boolean(cfg.password),
                })
              );
              return;
            }

            if (method === "POST") {
              try {
                const body = await parseJsonBody(req);
                const updated = updateShiprocketConfig({
                  email: body.email,
                  password: body.password,
                  pickupLocation: body.pickupLocation,
                  token: body.token,
                  tokenExpiresAt: body.tokenExpiresAt,
                });
                const testRes = await testShiprocketAuth();
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: updated,
                    auth: testRes,
                  })
                );
                return;
              } catch (err: any) {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 400;
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          // C. Create Shipment / Push Order: POST / PUT / PATCH / GET /api/shipping/shiprocket/create-order
          const isCreateOrderRoute =
            urlWithoutQuery === "/api/shipping/shiprocket/create-order" ||
            urlWithoutQuery === "/api/shipping/shiprocket/create" ||
            urlWithoutQuery === "/api/shipping/shiprocket/order" ||
            urlWithoutQuery === "/api/shiprocket/create-order" ||
            urlWithoutQuery === "/api/shiprocket/create";

          if (isCreateOrderRoute) {
            if (method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }

            if (method === "POST" || method === "PUT" || method === "PATCH") {
              try {
                const body = await parseJsonBody(req);
                const orderData = body.order || body;
                const pickupOverride = body.pickupLocation;

                const result = await createShiprocketOrder(orderData, pickupOverride);

                // Update order in public/data/orders.json if present
                const { updatePersistedOrder } = await import("./shiprocketService");
                const updatedOrderRecord = {
                  ...orderData,
                  shiprocketOrderId: result.shiprocketOrderId,
                  shiprocketShipmentId: result.shipmentId,
                  trackingNumber: result.awbCode || orderData.trackingNumber,
                  trackingCourier: result.courierName || orderData.trackingCourier || "Shiprocket Express",
                  trackingUrl: result.trackingUrl,
                  shiprocketStatus: result.status,
                  shiprocketSyncedAt: new Date().toISOString(),
                  shiprocketError: result.error,
                };
                updatePersistedOrder(updatedOrderRecord);

                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: result.success,
                    shiprocket: result,
                    order: updatedOrderRecord,
                  })
                );
                return;
              } catch (err: any) {
                console.error("[Shiprocket API create-order error]:", err);
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: err.message || "Failed to process Shiprocket order dispatch",
                    shiprocket: { success: false, error: err.message },
                  })
                );
                return;
              }
            }

            if (method === "GET") {
              const urlObj = new URL(rawUrl, "http://localhost:3000");
              const orderId = urlObj.searchParams.get("orderId") || urlObj.searchParams.get("id");
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Shiprocket order creation endpoint is operational. Dispatch orders using POST with JSON payload.",
                  orderId: orderId || null,
                })
              );
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: false,
                error: `HTTP ${method} received on create-order. Use POST to dispatch.`,
              })
            );
            return;
          }

          // D. Live Tracking: GET /api/shipping/shiprocket/track
          if (urlWithoutQuery === "/api/shipping/shiprocket/track" && method === "GET") {
            const urlObj = new URL(rawUrl, "http://localhost:3000");
            const awb = urlObj.searchParams.get("awb") || undefined;
            const shipmentId = urlObj.searchParams.get("shipmentId") || undefined;
            const orderId = urlObj.searchParams.get("orderId") || undefined;

            const trackingResult = await trackShiprocketShipment({
              awb,
              shipmentId,
              orderId,
            });

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(trackingResult));
            return;
          }

          // E. Courier Serviceability: POST /api/shipping/shiprocket/serviceability
          if (urlWithoutQuery === "/api/shipping/shiprocket/serviceability") {
            try {
              let body: any = {};
              if (method === "POST") {
                body = await parseJsonBody(req);
              } else {
                const urlObj = new URL(rawUrl, "http://localhost:3000");
                body = {
                  deliveryPincode: urlObj.searchParams.get("pincode") || urlObj.searchParams.get("deliveryPincode"),
                  pickupPincode: urlObj.searchParams.get("pickupPincode"),
                  weight: Number(urlObj.searchParams.get("weight") || 0.8),
                  cod: urlObj.searchParams.get("cod") === "1" || urlObj.searchParams.get("cod") === "true",
                };
              }

              const result = await checkCourierServiceability({
                deliveryPincode: body.deliveryPincode || "110001",
                pickupPincode: body.pickupPincode || "395003",
                weight: body.weight || 0.8,
                cod: body.cod,
              });

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          // F. Webhook Handler: POST /api/shipping/shiprocket/webhook
          if (urlWithoutQuery === "/api/shipping/shiprocket/webhook" && method === "POST") {
            try {
              const body = await parseJsonBody(req);
              console.log("[Shiprocket Webhook] Received event:", JSON.stringify(body));

              const { logShiprocketEvent } = await import("./shiprocketLogger");
              const awb = body.awb || body.awb_code;
              const orderId = body.order_id;
              const currentStatus = (body.current_status || body.status || "").toLowerCase();

              logShiprocketEvent({
                action: "WEBHOOK",
                status: "SUCCESS",
                statusCode: 200,
                orderNumber: String(orderId || ""),
                errorMessage: `Webhook received for ${orderId || awb || "shipment"}: Status = ${body.current_status || body.status || "Update"}`,
                responsePayload: body,
              });

              if (orderId || awb) {
                const { updatePersistedOrder, readPersistedOrders } = await import("./shiprocketService");
                const existingOrders = readPersistedOrders();
                const matchedOrder = existingOrders.find(
                  (o) =>
                    String(o.shiprocketOrderId) === String(orderId) ||
                    String(o.orderNumber) === String(orderId) ||
                    String(o.id) === String(orderId) ||
                    (awb && (o.trackingNumber === awb || o.shiprocketAwb === awb))
                );

                let mappedOrderStatus = matchedOrder?.orderStatus || "confirmed";
                if (currentStatus.includes("delivered")) {
                  mappedOrderStatus = "delivered";
                } else if (
                  currentStatus.includes("out for delivery") ||
                  currentStatus.includes("in transit") ||
                  currentStatus.includes("shipped") ||
                  currentStatus.includes("pickup") ||
                  currentStatus.includes("reached")
                ) {
                  mappedOrderStatus = "shipped";
                } else if (currentStatus.includes("cancel") || currentStatus.includes("rto")) {
                  mappedOrderStatus = "cancelled";
                }

                const updatedData = {
                  ...(matchedOrder || {}),
                  id: matchedOrder?.id || orderId,
                  orderNumber: matchedOrder?.orderNumber || orderId,
                  shiprocketOrderId: orderId || matchedOrder?.shiprocketOrderId,
                  trackingNumber: awb || matchedOrder?.trackingNumber,
                  trackingCourier: body.courier_name || matchedOrder?.trackingCourier || "Shiprocket Express",
                  shiprocketStatus: body.current_status || body.status || "In Transit",
                  orderStatus: mappedOrderStatus,
                  updatedAt: new Date().toISOString(),
                };

                updatePersistedOrder(updatedData);
              }

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: "Webhook acknowledged and processed successfully" }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          // G. Shiprocket Logs: GET /api/shipping/shiprocket/logs
          if (urlWithoutQuery === "/api/shipping/shiprocket/logs" && method === "GET") {
            try {
              const { getShiprocketLogs } = await import("./shiprocketLogger");
              const urlObj = new URL(rawUrl, "http://localhost:3000");
              const action = urlObj.searchParams.get("action") || undefined;
              const status = urlObj.searchParams.get("status") || undefined;
              const search = urlObj.searchParams.get("search") || undefined;
              const limit = parseInt(urlObj.searchParams.get("limit") || "100", 10);

              const logs = getShiprocketLogs({
                action,
                status,
                search,
                limit,
              });

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, logs, total: logs.length }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message, logs: [] }));
              return;
            }
          }

          // H. Clear Shiprocket Logs: DELETE /api/shipping/shiprocket/logs
          if (urlWithoutQuery === "/api/shipping/shiprocket/logs" && method === "DELETE") {
            try {
              const { clearShiprocketLogs } = await import("./shiprocketLogger");
              clearShiprocketLogs();
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: "Shiprocket API logs cleared." }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
              return;
            }
          }

          // I. Manual / Background Retry Trigger: POST /api/shipping/shiprocket/retry
          if (urlWithoutQuery === "/api/shipping/shiprocket/retry" && method === "POST") {
            try {
              const { retryAllPendingOrders } = await import("./shiprocketService");
              const retryResults = await retryAllPendingOrders(true);

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, ...retryResults }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
              return;
            }
          }

          // Fallback handler for any unmatched Shiprocket path or method
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: false,
              error: `Shiprocket endpoint ${urlWithoutQuery} (${method}) is ready. For order dispatch, use POST /api/shipping/shiprocket/create-order.`,
            })
          );
          return;
        }

        // If request is targeting /api/*, ALWAYS handle it with JSON error, NEVER let it fall through to Vite SPA html!
        if (urlWithoutQuery.startsWith("/api/")) {
          setCorsHeaders(res);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `API route not found: ${method} ${urlWithoutQuery}` }));
          return;
        }

        next();
    } catch (err: any) {
      console.error("[API Middleware Error]:", err);
      if (urlWithoutQuery.startsWith("/api/")) {
        setCorsHeaders(res);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message || "Internal server error" }));
        return;
      }
      next(err);
    }
  };

export function apiMiddlewarePlugin(): Plugin {
  return {
    name: "api-middleware-plugin",
    configureServer(server) {
      server.middlewares.use(apiHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiHandler);
    },
  };
}
