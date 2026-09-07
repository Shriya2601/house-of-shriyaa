/**
 * Netlify Function: /api/health
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

export const config = {
  path: ["/api/health", "/.netlify/functions/health"],
};

export default async function (request: Request) {
  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  return new Response(
    JSON.stringify({
      status: "healthy",
      environment: process.env.NODE_ENV || "production",
      app: "House of Shriya",
      timestamp: new Date().toISOString(),
      platform: "netlify",
    }),
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function handler(event: any) {
  if ((event.httpMethod || "GET").toUpperCase() === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      status: "healthy",
      environment: process.env.NODE_ENV || "production",
      app: "House of Shriya",
      timestamp: new Date().toISOString(),
      platform: "netlify",
    }),
  };
}
