import type { IncomingMessage } from "http";
import multer from "multer";

const storage = multer.memoryStorage();

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
    ];
    const mime = (file.mimetype || "").toLowerCase();
    const ext = (file.originalname || "").split(".").pop()?.toLowerCase() || "";
    const isAllowedExt = ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif", "svg"].includes(ext);

    if (
      mime.startsWith("image/") ||
      mime === "application/octet-stream" ||
      isAllowedExt ||
      allowed.includes(mime)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type: ${file.mimetype}. Allowed types: JPG, PNG, WEBP, GIF, AVIF, HEIC.`));
    }
  },
});

export interface ParsedUpload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  slot?: string;
  productId?: string;
  category?: string;
}

/**
 * Parses either a multipart/form-data upload or a JSON dataUrl payload from the request.
 */
export async function parseUploadPayload(req: any, res: any): Promise<ParsedUpload> {
  const contentType = (req.headers["content-type"] || "").toLowerCase();

  // 1. Multipart Form Data
  if (contentType.includes("multipart/form-data")) {
    return new Promise((resolve, reject) => {
      multerUpload.single("file")(req, res, (err: any) => {
        if (err) {
          return reject(err);
        }
        const file = req.file;
        if (!file || !file.buffer) {
          return reject(new Error("No file uploaded in form field 'file'"));
        }

        const body = req.body || {};
        const ext = (file.originalname.split(".").pop() || "jpg").toLowerCase();
        const mimeType = file.mimetype || "image/jpeg";

        resolve({
          buffer: file.buffer,
          filename: file.originalname || `upload-${Date.now()}.${ext}`,
          mimeType,
          slot: body.slot || body.type,
          productId: body.productId || body.id,
          category: body.category,
        });
      });
    });
  }

  // 2. JSON Body (dataUrl or base64)
  let body = req.body;
  if (!body || typeof body !== "object") {
    const raw = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk: any) => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
  }

  const rawData = body.dataUrl || body.image || body.base64;
  if (!rawData || typeof rawData !== "string") {
    throw new Error("Missing image file or dataUrl in request payload");
  }

  let ext = "jpg";
  let mimeType = "image/jpeg";
  let base64Content = rawData;

  if (rawData.includes(",")) {
    const [header, content] = rawData.split(",");
    base64Content = content;
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes("png")) {
      ext = "png";
      mimeType = "image/png";
    } else if (lowerHeader.includes("webp")) {
      ext = "webp";
      mimeType = "image/webp";
    } else if (lowerHeader.includes("gif")) {
      ext = "gif";
      mimeType = "image/gif";
    } else if (lowerHeader.includes("svg")) {
      ext = "svg";
      mimeType = "image/svg+xml";
    } else if (lowerHeader.includes("avif")) {
      ext = "avif";
      mimeType = "image/avif";
    }
  } else if (body.filename) {
    const fExt = body.filename.split(".").pop()?.toLowerCase();
    if (fExt === "png") { ext = "png"; mimeType = "image/png"; }
    else if (fExt === "webp") { ext = "webp"; mimeType = "image/webp"; }
    else if (fExt === "gif") { ext = "gif"; mimeType = "image/gif"; }
    else if (fExt === "avif") { ext = "avif"; mimeType = "image/avif"; }
  }

  const cleanedBase64 = base64Content.replace(/[\r\n\s]+/g, "");
  const buffer = Buffer.from(cleanedBase64, "base64");

  if (buffer.length === 0) {
    throw new Error("Uploaded image data is empty");
  }

  const originalName = body.filename || `upload-${Date.now()}.${ext}`;

  return {
    buffer,
    filename: originalName,
    mimeType,
    slot: body.slot || body.type,
    productId: body.productId || body.id,
    category: body.category,
  };
}
