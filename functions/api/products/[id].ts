// Cloudflare Pages Function: /api/products/[id]

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-admin-token",
    },
  });
}

export async function onRequestGet(context: { params: { id: string }; request: Request; env: Record<string, any> }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  try {
    if (context.env.ASSETS && typeof context.env.ASSETS.fetch === "function") {
      const assetRes = await context.env.ASSETS.fetch(new URL("/data/products.json", context.request.url));
      if (assetRes.ok) {
        const prods = await assetRes.json();
        const found = prods.find((p: any) => p.id === context.params.id);
        if (found) {
          return new Response(JSON.stringify(found), { status: 200, headers });
        }
      }
    }
  } catch {}
  return new Response(JSON.stringify({ error: `Product not found: ${context.params.id}` }), { status: 404, headers });
}

export async function onRequestPost(context: { params: { id: string }; request: Request }) {
  // Support POST on /api/products/:id so no 405 Method Not Allowed occurs
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  try {
    const product = await context.request.json();
    return new Response(
      JSON.stringify({
        success: true,
        product: { ...product, id: context.params.id },
        message: "Product saved successfully",
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers });
  }
}

export async function onRequestPut(context: { params: { id: string }; request: Request }) {
  return onRequestPost(context);
}

export async function onRequestPatch(context: { params: { id: string }; request: Request }) {
  return onRequestPost(context);
}

export async function onRequestDelete(context: { params: { id: string } }) {
  return new Response(
    JSON.stringify({ success: true, id: context.params.id }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export const onRequest = async (context: any) => {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions();
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost(context);
  if (method === "PUT") return onRequestPut(context);
  if (method === "PATCH") return onRequestPatch(context);
  if (method === "DELETE") return onRequestDelete(context);

  return new Response(JSON.stringify({ error: `Method ${method} not allowed on /api/products/${context.params.id}` }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
