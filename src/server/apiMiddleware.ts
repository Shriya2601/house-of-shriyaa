import type { Connect, Plugin } from "vite";
import fs from "fs";
import path from "path";

// In-memory cache for ultra-fast instant rendering of uploaded photos
const memoryUploadsCache = new Map<string, { mime: string; buffer: Buffer }>();

// 1x1 transparent PNG fallback buffer
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

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

    // Also update src/data/products.json if exists
    const srcPath = path.resolve(process.cwd(), "src/data/products.json");
    if (fs.existsSync(path.dirname(srcPath))) {
      try {
        fs.writeFileSync(srcPath, JSON.stringify(products, null, 2), "utf-8");
      } catch {}
    }
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
    const urlWithoutQuery = rawUrl.split("?")[0].replace(/\/+$/, "");
    const method = (req.method || "GET").toUpperCase();

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

      // 1. Check in-memory cache
      if (memoryUploadsCache.has(filename)) {
        const item = memoryUploadsCache.get(filename)!;
        res.setHeader("Content-Type", item.mime);
        res.setHeader("Content-Length", item.buffer.length);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.statusCode = 200;
        res.end(item.buffer);
        return;
      }

      // 2. Check filesystem
      const possiblePaths = [
        path.resolve(process.cwd(), "public/uploads", filename),
        path.resolve(process.cwd(), "dist/uploads", filename),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          try {
            const data = fs.readFileSync(p);
            let mime = "image/jpeg";
            const ext = path.extname(filename).toLowerCase();
            if (ext === ".png") mime = "image/png";
            else if (ext === ".webp") mime = "image/webp";
            else if (ext === ".svg") mime = "image/svg+xml";
            else if (ext === ".gif") mime = "image/gif";

            memoryUploadsCache.set(filename, { mime, buffer: data });

            res.setHeader("Content-Type", mime);
            res.setHeader("Content-Length", data.length);
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.statusCode = 200;
            res.end(data);
            return;
          } catch (readErr) {
            console.warn("[Uploads Server] Read error:", readErr);
          }
        }
      }

      // 3. Fallback: If not found, return image fallback (NEVER HTML)
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-cache");
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
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
          return;
        }

        // 2. PRODUCTS COLLECTION: /api/products
        if (urlWithoutQuery === "/api/products") {
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

        // 5. DIRECT PHOTO UPLOAD: /api/upload
        if (urlWithoutQuery === "/api/upload" && method === "POST") {
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
            const generatedFilename = `${safePrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

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

            // Immediately prime the in-memory cache for 0ms latency
            memoryUploadsCache.set(generatedFilename, { mime, buffer });

            const publicUrl = `/uploads/${generatedFilename}`;
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

        // ============================================================
        // 5B. SITE CONTENT (HERO BANNERS, SITE TEXT): /api/site-content
        // ============================================================
        if (urlWithoutQuery === "/api/site-content") {
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

              if (fs.existsSync(path.dirname(srcContentPath))) {
                try {
                  fs.writeFileSync(srcContentPath, jsonFormatted, "utf-8");
                } catch {}
              }

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
              const srcOrders = path.resolve(process.cwd(), "src/data/orders.json");
              if (fs.existsSync(path.dirname(srcOrders))) {
                fs.writeFileSync(srcOrders, JSON.stringify(list, null, 2), "utf-8");
              }
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

                if (shiprocketResult) {
                  order.shiprocketOrderId = shiprocketResult.shiprocketOrderId;
                  order.shiprocketShipmentId = shiprocketResult.shipmentId;
                  order.shiprocketStatus = shiprocketResult.status;
                  order.trackingNumber = shiprocketResult.awbCode || order.trackingNumber;
                  order.trackingCourier = shiprocketResult.courierName || order.trackingCourier || "Shiprocket Express";
                  order.trackingUrl = shiprocketResult.trackingUrl || (order.trackingNumber ? `https://shiprocket.co/tracking/${order.trackingNumber}` : undefined);
                  order.shiprocketSyncedAt = new Date().toISOString();

                  if (shiprocketResult.error) {
                    order.shiprocketError = shiprocketResult.error;
                  }
                }
              } catch (srErr: any) {
                console.error("[API Middleware] Shiprocket auto-dispatch error:", srErr.message);
                order.shiprocketError = srErr.message;
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
        // 7. SHIPROCKET DEDICATED ROUTES (/api/shipping/shiprocket/*)
        // ============================================================
        if (urlWithoutQuery.startsWith("/api/shipping/shiprocket")) {
          const {
            testShiprocketAuth,
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

              const awb = body.awb || body.awb_code;
              const orderId = body.order_id;
              const currentStatus = (body.current_status || body.status || "").toLowerCase();

              if (orderId || awb) {
                const { updatePersistedOrder } = await import("./shiprocketService");
                let mappedOrderStatus = "confirmed";
                if (currentStatus.includes("delivered")) mappedOrderStatus = "delivered";
                else if (currentStatus.includes("out for delivery") || currentStatus.includes("in transit") || currentStatus.includes("shipped") || currentStatus.includes("pickup")) mappedOrderStatus = "shipped";
                else if (currentStatus.includes("cancel") || currentStatus.includes("rto")) mappedOrderStatus = "cancelled";

                updatePersistedOrder({
                  id: orderId,
                  orderNumber: orderId,
                  trackingNumber: awb,
                  trackingCourier: body.courier_name || "Shiprocket Express",
                  shiprocketStatus: body.current_status || body.status,
                  orderStatus: mappedOrderStatus,
                  updatedAt: new Date().toISOString(),
                });
              }

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: "Webhook acknowledged" }));
              return;
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
        }

        next();
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
