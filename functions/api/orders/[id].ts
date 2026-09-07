// Cloudflare Pages Function: /api/orders/[id]
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet(context: { params: { id: string } }) {
  return new Response(
    JSON.stringify({ id: context.params.id, status: "ok" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function onRequestPatch(context: { request: Request; params: { id: string } }) {
  const updates = await context.request.json().catch(() => ({}));
  return new Response(
    JSON.stringify({
      success: true,
      order: { id: context.params.id, ...updates, updatedAt: new Date().toISOString() },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
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
  if (method === "PATCH") return onRequestPatch(context);
  if (method === "DELETE") return onRequestDelete(context);
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
