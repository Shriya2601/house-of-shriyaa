/**
 * Cloudflare Pages Function: /api/brand-styles
 * Cloudflare D1 Database Powered Brand Styles
 * ZERO Firebase usage!
 */

import { ensureD1Tables, executeD1Query, getD1Binding } from "../lib/d1";

interface Env {
  [key: string]: any;
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token, x-admin-key",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token, x-admin-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const { env } = context;

  try {
    await ensureD1Tables(env);

    const { results } = await executeD1Query(
      env,
      "SELECT data_json FROM brand_styles WHERE id = 'main' LIMIT 1"
    );

    if (results && results.length > 0 && results[0].data_json) {
      try {
        return jsonResponse(JSON.parse(results[0].data_json));
      } catch {}
    }

    return jsonResponse({});
  } catch (err: any) {
    console.error("[D1 Brand Styles GET Error]:", err);
    return jsonResponse({}, 200);
  }
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    await ensureD1Tables(env);

    const body = await request.json();
    const now = new Date().toISOString();
    const dataJson = JSON.stringify(body);

    const db = getD1Binding(env);
    if (db) {
      await db
        .prepare(
          `INSERT INTO brand_styles (id, data_json, updated_at) VALUES ('main', ?, ?)
           ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`
        )
        .bind(dataJson, now)
        .run();
    } else {
      await executeD1Query(
        env,
        `INSERT OR REPLACE INTO brand_styles (id, data_json, updated_at) VALUES ('main', ?, ?)`,
        [dataJson, now]
      );
    }

    return jsonResponse({ success: true, brandStyles: body });
  } catch (err: any) {
    console.error("[D1 Brand Styles POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
