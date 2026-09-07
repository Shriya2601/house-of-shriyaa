// Cloudflare Pages Function: /api/orders
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
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });

  try {
    // Attempt to load from static assets if available
    if (context.env.ASSETS && typeof context.env.ASSETS.fetch === "function") {
      const assetRes = await context.env.ASSETS.fetch(new URL("/data/orders.json", context.request.url));
      if (assetRes.ok) {
        const orders = await assetRes.json();
        return new Response(JSON.stringify(orders), { status: 200, headers });
      }
    }
  } catch {}

  return new Response(JSON.stringify([]), { status: 200, headers });
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    const orderData = (await context.request.json()) as Record<string, any>;
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    const fullOrder = {
      ...orderData,
      id: orderData.id || `ord_${Date.now()}_${randomSuffix}`,
      orderNumber: orderData.orderNumber || `HOS-${datePrefix}-${randomSuffix}`,
      createdAt: orderData.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      orderStatus: orderData.orderStatus || orderData.status || "confirmed",
    };

    return new Response(
      JSON.stringify({
        success: true,
        order: fullOrder,
        message: "Order received and confirmed successfully",
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process order" }),
      { status: 400, headers }
    );
  }
}

export const onRequest = async (context: { request: Request; env: Record<string, any> }) => {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions();
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost(context);
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
