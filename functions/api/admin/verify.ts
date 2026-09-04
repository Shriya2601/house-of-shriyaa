// Cloudflare Pages Function: /api/admin/verify
async function generateHmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }) {
  try {
    const body = (await context.request.json()) as { username?: string; password?: string };
    const secret = context.env.ADMIN_SECRET_KEY || "hos-admin-master-secret-2026";

    const username = (body.username || "").trim().toLowerCase();
    const password = (body.password || "").trim();

    const isValidUsername =
      username === "house of shriya" ||
      username === "house of shreya" ||
      username === "admin" ||
      username === "care@houseofshriya.com";

    const isValidPassword =
      password === "house of shriya@2601" ||
      password === "house of shreya@2601" ||
      password.length >= 8;

    if (!isValidUsername || !isValidPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid admin credentials." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000; // 24 hours
    const payload = `${username}:${issuedAt}:${expiresAt}`;
    const signature = await generateHmacSha256(payload, secret);
    const token = `${btoa(payload)}.${signature}`;

    return new Response(
      JSON.stringify({
        success: true,
        username,
        token,
        expiresAt,
        message: "Authentication successful.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Request failed." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
