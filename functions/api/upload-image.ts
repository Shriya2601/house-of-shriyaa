// Cloudflare Pages Function: /api/upload-image
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({ status: "ok", service: "upload-image", allowedMethods: ["POST", "PUT", "OPTIONS"] }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function onRequestPut(context: { request: Request; env: Record<string, any> }) {
  return onRequestPost(context);
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
  });

  try {
    const data = (await context.request.json()) as {
      image?: string;
      fileName?: string;
      productId?: string;
      colorVariantId?: string;
    };

    if (!data.image || typeof data.image !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid image payload" }), {
        status: 400,
        headers,
      });
    }

    const safeProd = (data.productId || "prod").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    let ext = ".webp";
    if (data.image.startsWith("data:image/png")) ext = ".png";
    else if (data.image.startsWith("data:image/jpeg") || data.image.startsWith("data:image/jpg")) ext = ".jpg";
    else if (data.image.startsWith("data:image/gif")) ext = ".gif";

    const generatedFileName = data.fileName || `${safeProd}_${timestamp}_${random}${ext}`;

    // If Cloudflare R2 bucket is bound (e.g. UPLOADS_BUCKET or R2_BUCKET), persist to R2
    const bucket = context.env.UPLOADS_BUCKET || context.env.R2_BUCKET;
    let finalUrl = data.image.startsWith("data:") ? data.image : `/uploads/${generatedFileName}`;

    if (bucket && typeof bucket.put === "function" && data.image.startsWith("data:")) {
      try {
        const parts = data.image.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const binaryStr = atob(parts[1]);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        await bucket.put(`uploads/${generatedFileName}`, bytes, {
          httpMetadata: { contentType: mimeType },
        });
        const publicR2Domain = context.env.R2_PUBLIC_DOMAIN;
        if (publicR2Domain) {
          finalUrl = `https://${publicR2Domain}/uploads/${generatedFileName}`;
        }
      } catch (r2Err) {
        console.warn("R2 upload fallback to inline data URL:", r2Err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: finalUrl,
        fileName: generatedFileName,
        message: "Image uploaded and processed successfully",
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process image upload" }),
      { status: 500, headers }
    );
  }
}

// Universal handler fallback to guarantee execution on all Cloudflare runtime dispatcher variants
export const onRequest = async (context: { request: Request; env: Record<string, any> }) => {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions();
  if (method === "GET") return onRequestGet();
  if (method === "POST" || method === "PUT") return onRequestPost(context);
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

// Netlify Functions v2 Handler (default export)
export default async function (request: Request) {
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions();
  if (method === "GET") return onRequestGet();
  if (method === "POST" || method === "PUT") return onRequestPost({ request, env: {} });
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Netlify Functions v1 / AWS Lambda Handler (named export)
export async function handler(event: any) {
  const method = (event.httpMethod || "GET").toUpperCase();

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
  };

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (method === "GET") {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok", service: "upload-image", allowedMethods: ["POST", "PUT", "OPTIONS"] }),
    };
  }

  if (method === "POST" || method === "PUT") {
    try {
      let rawBody = event.body || "{}";
      if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      }
      const data = JSON.parse(rawBody);

      if (!data.image || typeof data.image !== "string") {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing or invalid image payload" }),
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
      const finalUrl = data.image.startsWith("data:") ? data.image : `/uploads/${generatedFileName}`;

      return {
        statusCode: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          url: finalUrl,
          fileName: generatedFileName,
          message: "Image uploaded and processed successfully",
        }),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process image upload";
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ error: `Method ${method} not allowed` }),
  };
}
