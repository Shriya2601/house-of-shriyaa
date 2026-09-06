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

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }) {
  try {
    const body = (await context.request.json()) as { username?: string; password?: string };
    const secret = context.env.ADMIN_SECRET_KEY || context.env.ADMIN_PASSWORD || "Houseofshriy@26_master_key_2026";
    const envPassword = (context.env.ADMIN_PASSWORD || context.env.ADMIN_SECRET_KEY || "Houseofshriy@26").trim();

    const username = (body.username || "").trim().toLowerCase();
    const password = (body.password || "").trim();

    const isValidUsername = username === "house of shriya";
    const isValidPassword = password === envPassword;

    if (!isValidUsername || !isValidPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid admin credentials. Please check your username and password." }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000; // 24 hours
    const payload = `house of shriya:${issuedAt}:${expiresAt}`;
    const signature = await generateHmacSha256(payload, secret);
    const token = `${btoa(payload)}.${signature}`;

    const url = new URL(context.request.url);
    const host = url.hostname.toLowerCase();
    const isCustomDomain = host === "houseofshriya.com" || host.endsWith(".houseofshriya.com");
    const domainAttr = isCustomDomain ? "; Domain=.houseofshriya.com" : "";

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Access-Control-Allow-Origin", "*");
    // Issue persistent cross-domain session cookie
    headers.append(
      "Set-Cookie",
      `hos_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax${domainAttr}; Secure; HttpOnly`
    );

    return new Response(
      JSON.stringify({
        success: true,
        username: "House of Shriya",
        token,
        expiresAt,
        message: "Authentication successful.",
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Request failed." }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
