/**
 * Netlify Function: /api/delete-image
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
};

export const config = {
  path: ["/api/delete-image", "/.netlify/functions/delete-image"],
};

export default async function (request: Request) {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method === "POST") {
    try {
      const data = (await request.json()) as { fileName?: string; url?: string };
      return new Response(
        JSON.stringify({
          success: true,
          message: "Image removal acknowledged",
          target: data.fileName || data.url,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process image delete";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export async function handler(event: any) {
  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (method === "POST") {
    try {
      let rawBody = event.body || "{}";
      if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      }
      const data = JSON.parse(rawBody) as { fileName?: string; url?: string };
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          message: "Image removal acknowledged",
          target: data.fileName || data.url,
        }),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process image delete";
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ error: `Method ${method} not allowed` }),
  };
}
