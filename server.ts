import express from "express";
import path from "path";
import { apiHandler } from "./src/server/apiMiddleware";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON and urlencoded bodies up to 25mb for high-res photo uploads
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Mount API & Upload handlers FIRST
  app.use(apiHandler);

  // Statically serve uploads directory with no-cache revalidation so updated images appear immediately
  const publicUploadsPath = path.join(process.cwd(), "public/uploads");
  const distUploadsPath = path.join(process.cwd(), "dist/uploads");
  const uploadStaticOptions = {
    etag: true,
    lastModified: true,
    setHeaders: (res: express.Response) => {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  };
  app.use("/uploads", express.static(publicUploadsPath, uploadStaticOptions));
  app.use("/uploads", express.static(distUploadsPath, uploadStaticOptions));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express v5 syntax for catch-all route
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
