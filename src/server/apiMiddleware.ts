import type { Connect, Plugin } from "vite";
import fs from "fs";
import path from "path";

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
  return {
    name: "api-middleware-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || "";
        const urlWithoutQuery = rawUrl.split("?")[0].replace(/\/+$/, "");
        const method = (req.method || "GET").toUpperCase();

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

        next();
      });
    },
  };
}
