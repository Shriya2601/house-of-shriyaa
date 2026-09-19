/**
 * Cloudflare Pages Function: /api/deleted-ids
 * Cloudflare D1 Database Powered Deletion Registry
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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token, x-admin-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") || "products";

  try {
    await ensureD1Tables(env);

    const { results } = await executeD1Query(
      env,
      "SELECT item_id FROM deleted_ids WHERE entity = ?",
      [entity]
    );

    const ids = (results || []).map((r: any) => String(r.item_id));
    return jsonResponse(ids);
  } catch (err: any) {
    console.error("[D1 Deleted IDs GET Error]:", err);
    return jsonResponse([], 200);
  }
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    await ensureD1Tables(env);

    const body = (await request.json()) as any;
    const entity = body.entity || "products";
    const itemId = body.itemId || body.id;

    if (!itemId) {
      return jsonResponse({ success: false, error: "Missing itemId" }, 400);
    }

    const now = new Date().toISOString();
    const db = getD1Binding(env);

    if (db) {
      await db
        .prepare("INSERT OR REPLACE INTO deleted_ids (entity, item_id, deleted_at) VALUES (?, ?, ?)")
        .bind(entity, String(itemId), now)
        .run();
    } else {
      await executeD1Query(
        env,
        "INSERT OR REPLACE INTO deleted_ids (entity, item_id, deleted_at) VALUES (?, ?, ?)",
        [entity, String(itemId), now]
      );
    }

    return jsonResponse({ success: true, entity, itemId });
  } catch (err: any) {
    console.error("[D1 Deleted IDs POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}

export async function onRequestDelete(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") || "products";
  const itemId = url.searchParams.get("itemId") || url.searchParams.get("id");

  if (!itemId) {
    return jsonResponse({ success: false, error: "Missing itemId" }, 400);
  }

  try {
    await ensureD1Tables(env);

    const db = getD1Binding(env);
    if (db) {
      await db
        .prepare("DELETE FROM deleted_ids WHERE entity = ? AND item_id = ?")
        .bind(entity, String(itemId))
        .run();
    } else {
      await executeD1Query(
        env,
        "DELETE FROM deleted_ids WHERE entity = ? AND item_id = ?",
        [entity, String(itemId)]
      );
    }

    return jsonResponse({ success: true, entity, itemId });
  } catch (err: any) {
    console.error("[D1 Deleted IDs DELETE Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
