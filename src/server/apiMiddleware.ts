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

function getProductsFilePath(): string {
  const publicPath = path.resolve(process.cwd(), "public/data/products.json");
  return publicPath;
}

function readProducts(): any[] {
  try {
    const filePath = getProductsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("[API Middleware] Error reading products:", err);
  }
  return [];
}

function writeProducts(products: any[]): void {
  try {
    const publicPath = getProductsFilePath();
    const dir = path.dirname(publicPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(publicPath, JSON.stringify(products, null, 2), "utf-8");
  } catch (err) {
    console.error("[API Middleware] Error writing products:", err);
  }
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

function parseJsonBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export function apiMiddlewarePlugin(): Plugin {
  const apiHandler: Connect.NextHandleFunction = async (req, res, next) => {
    const rawUrl = req.url || "";
    let pathname = rawUrl;
    try {
      pathname = new URL(rawUrl, "http://localhost").pathname;
    } catch {
      pathname = rawUrl.split("?")[0];
    }
    const urlWithoutQuery = pathname.replace(/\/+$/, "") || "/";
    const method = (req.method || "GET").toUpperCase();

    try {
      // Direct Static Image Serving for /uploads/*
    // Bypasses Vite SPA fallback so images NEVER return HTML and load instantly with zero glitch
    if (urlWithoutQuery.startsWith("/uploads/")) {
      const filename = path.basename(urlWithoutQuery);

      setCorsHeaders(res);

      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      // Check filesystem first to ensure file exists and is fresh
      const possiblePaths = [
        path.resolve(process.cwd(), "public/uploads", filename),
        path.resolve(process.cwd(), "dist/uploads", filename),
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
            res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=60");
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
          // Smart caching: 60s browser, 120s Cloudflare CDN, stale-while-revalidate for fast rendering without stuck caches
          res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=60");
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
        if (urlWithoutQuery === "/api/health" && method === "GET") {
          setAntiCacheHeaders(res);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
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
                  products[idx] = { ...products[idx], ...product };
                } else {
                  products.unshift(product);
                }
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
                products[idx] = { ...products[idx], ...product };
              } else {
                products.unshift(product);
              }
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
          const catPath = path.resolve(process.cwd(), "public/data/categories.json");
          let categories: any[] = [];
          try {
            if (fs.existsSync(catPath)) {
              categories = JSON.parse(fs.readFileSync(catPath, "utf-8"));
            }
          } catch {}

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
              } else {
                categories.push(body);
              }
              fs.writeFileSync(catPath, JSON.stringify(categories, null, 2), "utf-8");
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: categories.length }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
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
        if (urlWithoutQuery === "/api/site-content") {
          setAntiCacheHeaders(res);
          const publicContentPath = path.resolve(process.cwd(), "public/data/siteContent.json");
          const srcContentPath = path.resolve(process.cwd(), "src/data/siteContent.json");

          if (method === "GET") {
            try {
              if (fs.existsSync(publicContentPath)) {
                const data = fs.readFileSync(publicContentPath, "utf-8");
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(data);
                return;
              }
            } catch {}
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify({}));
            return;
          }

          if (method === "POST" || method === "PUT" || method === "PATCH") {
            try {
              const body = await parseJsonBody(req);
              let existing: any = {};
              if (fs.existsSync(publicContentPath)) {
                try {
                  existing = JSON.parse(fs.readFileSync(publicContentPath, "utf-8"));
                } catch {}
              }

              const updated = {
                ...existing,
                ...body,
                updatedAt: new Date().toISOString(),
              };

              const jsonFormatted = JSON.stringify(updated, null, 2);

              const dir = path.dirname(publicContentPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(publicContentPath, jsonFormatted, "utf-8");

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
          const ordersPath = path.resolve(process.cwd(), "public/data/orders.json");
          const readOrdersList = (): any[] => {
            try {
              if (fs.existsSync(ordersPath)) {
                const data = fs.readFileSync(ordersPath, "utf-8");
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) return parsed;
              }
            } catch {}
            return [];
          };

          const writeOrdersList = (list: any[]) => {
            try {
              const dir = path.dirname(ordersPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(ordersPath, JSON.stringify(list, null, 2), "utf-8");
            } catch (err) {
              console.error("[API Middleware] Error writing orders:", err);
            }
          };

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
          const ordersPath = path.resolve(process.cwd(), "public/data/orders.json");

          const readOrdersList = (): any[] => {
            try {
              if (fs.existsSync(ordersPath)) {
                const data = fs.readFileSync(ordersPath, "utf-8");
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) return parsed;
              }
            } catch {}
            return [];
          };

          const writeOrdersList = (list: any[]) => {
            try {
              const dir = path.dirname(ordersPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(ordersPath, JSON.stringify(list, null, 2), "utf-8");
            } catch (err) {
              console.error("[API Middleware] Error writing orders:", err);
            }
          };

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
            const filtered = orders.filter((o) => o.id !== orderId && o.orderNumber !== orderId);
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
        // 7. SHIPROCKET DEDICATED ROUTES (/api/shipping/shiprocket/*)
        // ============================================================
        if (urlWithoutQuery.startsWith("/api/shipping/shiprocket")) {
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

          // C. Create Shipment / Push Order: POST /api/shipping/shiprocket/create-order
          if (urlWithoutQuery === "/api/shipping/shiprocket/create-order" && method === "POST") {
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
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
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
