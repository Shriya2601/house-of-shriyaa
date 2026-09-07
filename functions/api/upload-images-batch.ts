// Cloudflare Pages Function: /api/upload-images-batch
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({ status: "ok", service: "upload-images-batch", allowedMethods: ["POST", "OPTIONS"] }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    const data = (await context.request.json()) as {
      images?: Array<{ image: string; fileName?: string; productId?: string }>;
      productId?: string;
    };

    const images = Array.isArray(data.images) ? data.images : [];
    if (images.length === 0) {
      return new Response(JSON.stringify({ success: true, uploaded: [] }), {
        status: 200,
        headers,
      });
    }

    const bucket = context.env.UPLOADS_BUCKET || context.env.R2_BUCKET;
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
      let finalUrl = item.image.startsWith("data:") ? item.image : `/uploads/${fileName}`;

      if (bucket && typeof bucket.put === "function" && item.image.startsWith("data:")) {
        try {
          const parts = item.image.split(",");
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const binaryStr = atob(parts[1]);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let b = 0; b < len; b++) {
            bytes[b] = binaryStr.charCodeAt(b);
          }
          await bucket.put(`uploads/${fileName}`, bytes, {
            httpMetadata: { contentType: mimeType },
          });
          const publicR2Domain = context.env.R2_PUBLIC_DOMAIN;
          if (publicR2Domain) {
            finalUrl = `https://${publicR2Domain}/uploads/${fileName}`;
          }
        } catch (r2Err) {
          console.warn("R2 batch upload fallback:", r2Err);
        }
      }

      uploaded.push({
        url: finalUrl,
        fileName,
        originalName: item.fileName,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: uploaded.length,
        uploaded,
        urls: uploaded.map((u) => u.url),
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process batch image upload" }),
      { status: 500, headers }
    );
  }
}

export const onRequest = async (context: { request: Request; env: Record<string, any> }) => {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions();
  if (method === "GET") return onRequestGet();
  if (method === "POST") return onRequestPost(context);
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
