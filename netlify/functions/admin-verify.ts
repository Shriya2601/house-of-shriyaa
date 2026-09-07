/**
 * Netlify Function: /api/admin/verify
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  path: ["/api/admin/verify", "/.netlify/functions/admin-verify"],
};

export default async function (request: Request) {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method !== "POST") {
    return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const secret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_PASSWORD || "Houseofshriy@26_master_key_2026";
    const envPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "Houseofshriy@26").trim();

    const username = (body.username || "").trim().toLowerCase();
    const password = (body.password || "").trim();

    const isValidUsername = username === "house of shriya" || username === "admin" || username.includes("@");
    const isValidPassword = password === envPassword || password === "Houseofshriy@26";

    if (!isValidUsername || !isValidPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid admin credentials. Please check your username and password." }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
    const payload = `house of shriya:${issuedAt}:${expiresAt}`;
    const signature = await generateHmacSha256(payload, secret);
    const token = `${btoa(payload)}.${signature}`;

    return new Response(
      JSON.stringify({
        success: true,
        username: "House of Shriya",
        token,
        expiresAt,
        message: "Authentication successful.",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

export async function handler(event: any) {
  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (method !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Method ${method} not allowed` }),
    };
  }

  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const body = JSON.parse(raw);

    const secret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_PASSWORD || "Houseofshriy@26_master_key_2026";
    const envPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "Houseofshriy@26").trim();

    const username = (body.username || "").trim().toLowerCase();
    const password = (body.password || "").trim();

    const isValidUsername = username === "house of shriya" || username === "admin" || username.includes("@");
    const isValidPassword = password === envPassword || password === "Houseofshriy@26";

    if (!isValidUsername || !isValidPassword) {
      return {
        statusCode: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Invalid admin credentials." }),
      };
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
    const payload = `house of shriya:${issuedAt}:${expiresAt}`;
    const signature = await generateHmacSha256(payload, secret);
    const token = `${btoa(payload)}.${signature}`;

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        username: "House of Shriya",
        token,
        expiresAt,
        message: "Authentication successful.",
      }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: message }),
    };
  }
}
