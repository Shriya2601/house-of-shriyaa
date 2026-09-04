// Cloudflare Pages Function: /api/version
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      name: "house-of-shriya",
      version: "2.0.0",
      platform: "cloudflare-pages",
      outputDir: "dist",
      timestamp: new Date().toISOString(),
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
