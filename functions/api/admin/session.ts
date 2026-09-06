// Cloudflare Pages Function: /api/admin/session
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
    let token = "";
    try {
      const body = (await context.request.json()) as { token?: string };
      token = body?.token || "";
    } catch {}

    // Check cookie fallback if token wasn't in request body
    if (!token) {
      const cookieHeader = context.request.headers.get("Cookie") || "";
      const match = cookieHeader.match(/hos_admin_session=([^;]+)/);
      if (match) {
        try {
          const rawVal = decodeURIComponent(match[1]);
          if (rawVal.startsWith("{")) {
            const parsed = JSON.parse(rawVal);
            token = parsed.token || "";
          } else {
            token = rawVal;
          }
        } catch {}
      }
    }

    const secret = context.env.ADMIN_SECRET_KEY || "hos-admin-master-secret-2026";

    if (!token || !token.includes(".")) {
      return new Response(JSON.stringify({ valid: false, error: "Malformed or missing token." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const [b64Payload, signature] = token.split(".");
    const payload = atob(b64Payload);
    const [username, , expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return new Response(JSON.stringify({ valid: false, error: "Token expired." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const expectedSig = await generateHmacSha256(payload, secret);
    if (expectedSig !== signature) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid signature." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ valid: true, username, expiresAt }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ valid: false, error: "Verification failed." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
