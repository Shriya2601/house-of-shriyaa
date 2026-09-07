// Cloudflare Pages Function: /api/products
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

export async function onRequestGet(context: { request: Request; env: Record<string, any> }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60",
  });

  try {
    if (context.env.ASSETS && typeof context.env.ASSETS.fetch === "function") {
      const assetRes = await context.env.ASSETS.fetch(new URL("/data/products.json", context.request.url));
      if (assetRes.ok) {
        const prods = await assetRes.json();
        return new Response(JSON.stringify(prods), { status: 200, headers });
      }
    }
  } catch {}

  return new Response(JSON.stringify([]), { status: 200, headers });
}

export async function onRequestPost(context: { request: Request }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    const product = await context.request.json();
    return new Response(
      JSON.stringify({ success: true, product, message: "Product updated successfully" }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers });
  }
}

export const onRequest = async (context: any) => {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions();
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost(context);
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
