/**
 * Netlify Function: /api/upload-images-batch
 * Supports both Netlify Function v2 and v1 formats
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
  "Access-Control-Max-Age": "86400",
};

interface BatchPayload {
  images?: Array<{ image: string; fileName?: string; productId?: string }>;
  productId?: string;
}

function processBatchUpload(data: BatchPayload) {
  const images = Array.isArray(data.images) ? data.images : [];
  if (images.length === 0) {
    return {
      status: 200,
      body: { success: true, uploaded: [], count: 0, urls: [] },
    };
  }

  const uploaded: Array<{ url: string; fileName: string; originalName?: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (!item.image || typeof item.image !== "string") continue;

    const safeProd = (item.productId || data.productId || "prod").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    let ext = ".webp";
    if (item.image.startsWith("data:image/png")) ext = ".png";
    else if (item.image.startsWith("data:image/jpeg") || item.image.startsWith("data:image/jpg")) ext = ".jpg";

    const fileName = item.fileName || `${safeProd}_${timestamp}_${i}_${random}${ext}`;
    const finalUrl = item.image.startsWith("data:") ? item.image : `/uploads/${fileName}`;

    uploaded.push({
      url: finalUrl,
      fileName,
      originalName: item.fileName,
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      count: uploaded.length,
      uploaded,
      urls: uploaded.map((u) => u.url),
    },
  };
}

export const config = {
  path: ["/api/upload-images-batch", "/.netlify/functions/upload-images-batch"],
};

export default async function (request: Request) {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "upload-images-batch", allowedMethods: ["POST", "OPTIONS"] }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  if (method === "POST") {
    try {
      const data = (await request.json()) as BatchPayload;
      const res = processBatchUpload(data);
      return new Response(JSON.stringify(res.body), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process batch image upload";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export async function handler(event: any) {
  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (method === "GET") {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok", service: "upload-images-batch", allowedMethods: ["POST", "OPTIONS"] }),
    };
  }

  if (method === "POST") {
    try {
      let rawBody = event.body || "{}";
      if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      }
      const data = JSON.parse(rawBody) as BatchPayload;
      const res = processBatchUpload(data);
      return {
        statusCode: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(res.body),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process batch image upload";
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ error: `Method ${method} not allowed` }),
  };
}
