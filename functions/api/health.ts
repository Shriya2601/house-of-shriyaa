// Cloudflare Pages Function: /api/health
export async function onRequestGet(context: { env: Record<string, any> }) {
  return new Response(
    JSON.stringify({
      status: "healthy",
      environment: context.env.ENVIRONMENT || "production",
      app: context.env.APP_NAME || "House of Shriya",
      timestamp: new Date().toISOString(),
      platform: "cloudflare-pages",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
