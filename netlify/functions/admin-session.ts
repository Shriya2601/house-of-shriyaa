/**
 * Netlify Function: /api/admin/session
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
};

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

export const config = {
  path: ["/api/admin/session", "/.netlify/functions/admin-session"],
};

async function validateSessionToken(token: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  if (!token || !token.includes(".")) {
    return { valid: false, error: "Malformed or missing token." };
  }

  const parts = token.split(".");

  // 1. Firebase ID Token (JWT with 3 parts)
  if (parts.length === 3) {
    try {
      const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const claims = JSON.parse(payloadJson);
      const nowSec = Math.floor(Date.now() / 1000);

      if (claims.exp && claims.exp < nowSec) {
        return { valid: false, error: "Session token has expired. Please sign in again." };
      }

      const email = (claims.email || "").toLowerCase();
      const displayName = claims.name || claims.display_name || email || "House of Shriya";

      return { valid: true, username: displayName };
    } catch {
      return { valid: false, error: "Malformed token payload." };
    }
  }

  // 2. Legacy HMAC Token (base64Payload.signature)
  if (parts.length === 2) {
    try {
      const [encodedPayload, clientSig] = parts;
      const secret = process.env.ADMIN_SECRET_KEY || "hos-admin-master-secret-2026";
      const expectedSig = await generateHmacSha256(atob(encodedPayload), secret);

      if (clientSig !== expectedSig) {
        return { valid: false, error: "Invalid token signature." };
      }

      const decoded = atob(encodedPayload);
      const [user, , expStr] = decoded.split(":");
      const expiresAt = Number(expStr);

      if (!expiresAt || Date.now() > expiresAt) {
        return { valid: false, error: "Session has expired. Please sign in again." };
      }

      return { valid: true, username: user || "House of Shriya" };
    } catch {
      return { valid: false, error: "Malformed token payload." };
    }
  }

  return { valid: false, error: "Unsupported token format." };
}

export default async function (request: Request) {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = body?.token || "";
  } catch {}

  if (!token) {
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  const result = await validateSessionToken(token);
  return new Response(JSON.stringify(result), {
    status: result.valid ? 200 : 401,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export async function handler(event: any) {
  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let token = "";
  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const body = JSON.parse(raw);
    token = body?.token || "";
  } catch {}

  if (!token && event.headers) {
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  const result = await validateSessionToken(token);
  return {
    statusCode: result.valid ? 200 : 401,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(result),
  };
}
