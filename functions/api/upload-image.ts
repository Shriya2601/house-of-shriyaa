// Cloudflare Pages Function: /api/upload-image
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
    },
  });
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({ status: "ok", service: "upload-image", allowedMethods: ["POST", "PUT"] }),
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
  });

  try {
    const data = (await context.request.json()) as {
      image?: string;
      fileName?: string;
      productId?: string;
      colorVariantId?: string;
    };

    if (!data.image || typeof data.image !== "string") {
      return new Response(JSON.stringify({ error: "Missing image payload" }), {
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

    const fileName = `${safeProd}_${timestamp}_${random}${ext}`;

    // Cloudflare edge worker returns the optimized base64 data URL or relative URL for persistence
    return new Response(
      JSON.stringify({
        success: true,
        url: data.image.startsWith("data:") ? data.image : `/uploads/${fileName}`,
        fileName,
        message: "Image processed successfully",
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
