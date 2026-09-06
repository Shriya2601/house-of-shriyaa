// Cloudflare Pages Function: /api/delete-image
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    const data = (await context.request.json()) as { fileName?: string; url?: string };
    return new Response(
      JSON.stringify({
        success: true,
        message: "Image removal acknowledged",
        target: data.fileName || data.url,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process image delete" }),
      { status: 500, headers }
    );
  }
}
