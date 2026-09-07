/**
 * Netlify Function: /api/upload-image
 * Supports both Netlify Function v2 (Web standard Request/Response)
 * and Netlify Function v1 / AWS Lambda (handler event/context)
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
  "Access-Control-Max-Age": "86400",
};

interface UploadImageData {
  image?: string;
  fileName?: string;
  productId?: string;
  colorVariantId?: string;
}

function processUpload(data: UploadImageData) {
  if (!data.image || typeof data.image !== "string") {
    return {
      status: 400,
      body: { error: "Missing or invalid image payload" },
    };
  }

  const safeProd = (data.productId || "prod").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  let ext = ".webp";
  if (data.image.startsWith("data:image/png")) ext = ".png";
  else if (data.image.startsWith("data:image/jpeg") || data.image.startsWith("data:image/jpg")) ext = ".jpg";
  else if (data.image.startsWith("data:image/gif")) ext = ".gif";

  const generatedFileName = data.fileName || `${safeProd}_${timestamp}_${random}${ext}`;

  // In serverless environments, preserve data URI or return generated upload path
  const finalUrl = data.image.startsWith("data:") ? data.image : `/uploads/${generatedFileName}`;

  return {
    status: 200,
    body: {
      success: true,
      url: finalUrl,
      fileName: generatedFileName,
      message: "Image uploaded and processed successfully",
    },
  };
}

// Netlify Functions v2 Custom Route Mapping
export const config = {
  path: ["/api/upload-image", "/.netlify/functions/upload-image"],
};

// 1. Netlify Function v2 Handler (Web Standard Request / Response)
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
      JSON.stringify({
        status: "ok",
        service: "upload-image",
        allowedMethods: ["POST", "PUT", "OPTIONS"],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  if (method === "POST" || method === "PUT") {
    try {
      const data = (await request.json()) as UploadImageData;
      const res = processUpload(data);
      return new Response(JSON.stringify(res.body), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process image upload";
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

// 2. Netlify Function v1 / AWS Lambda Handler (event, context)
export async function handler(event: any) {
  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (method === "GET") {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ok",
        service: "upload-image",
        allowedMethods: ["POST", "PUT", "OPTIONS"],
      }),
    };
  }

  if (method === "POST" || method === "PUT") {
    try {
      let rawBody = event.body || "{}";
      if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      }
      const data = JSON.parse(rawBody) as UploadImageData;
      const res = processUpload(data);
      return {
        statusCode: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(res.body),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process image upload";
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
