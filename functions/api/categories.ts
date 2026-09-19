/**
 * Cloudflare Pages Function: /api/categories
 * Cloudflare D1 Database Powered Categories
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token, x-admin-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { env } = context;

  try {
    await ensureD1Tables(env);

    // Filter out deleted category IDs
    const delRes = await executeD1Query(
      env,
      "SELECT item_id FROM deleted_ids WHERE entity = 'categories'"
    );
    const deletedIds = new Set((delRes.results || []).map((r: any) => String(r.item_id)));

    const { results } = await executeD1Query(
      env,
      "SELECT data_json FROM categories ORDER BY name ASC"
    );

    const categories: any[] = [];
    for (const row of results) {
      try {
        const cat = JSON.parse(row.data_json);
        if (cat && cat.id && !deletedIds.has(String(cat.id))) {
          categories.push(cat);
        }
      } catch {}
    }

    // Default categories fallback if empty
    if (categories.length === 0) {
      const defaults = [
        { id: "cat-1", name: "Satin Wear", slug: "satin-wear", count: 12 },
        { id: "cat-2", name: "Velvet Luxe", slug: "velvet-luxe", count: 8 },
        { id: "cat-3", name: "Festive Pret", slug: "festive-pret", count: 15 },
        { id: "cat-4", name: "Atelier Couture", slug: "atelier-couture", count: 6 },
      ];
      return jsonResponse(defaults);
    }

    return jsonResponse(categories);
  } catch (err: any) {
    console.error("[D1 Categories GET Error]:", err);
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const items = Array.isArray(body) ? body : [body];
    const saved: any[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (!item) continue;
      const id = String(item.id || item.slug || `cat-${Date.now()}`);
      const name = String(item.name || "Category");
      const slug = String(item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      const count = typeof item.count === "number" ? item.count : 0;
      const image = String(item.image || "");
      const fullCat = { ...item, id, name, slug, count, image, updatedAt: now };
      const dataJson = JSON.stringify(fullCat);

      const db = getD1Binding(env);
      if (db) {
        await db
          .prepare(
            `INSERT INTO categories (id, name, slug, count, image, data_json, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               slug = excluded.slug,
               count = excluded.count,
               image = excluded.image,
               data_json = excluded.data_json,
               updated_at = excluded.updated_at`
          )
          .bind(id, name, slug, count, image, dataJson, now)
          .run();

        await db.prepare("DELETE FROM deleted_ids WHERE entity = 'categories' AND item_id = ?").bind(id).run().catch(() => {});
      } else {
        await executeD1Query(
          env,
          `INSERT OR REPLACE INTO categories (id, name, slug, count, image, data_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, name, slug, count, image, dataJson, now]
        );
      }

      saved.push(fullCat);
    }

    return jsonResponse({
      success: true,
      category: saved[0],
      categories: saved,
    });
  } catch (err: any) {
    console.error("[D1 Categories POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}

export async function onRequestDelete(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return jsonResponse({ success: false, error: "Missing category id" }, 400);
  }

  try {
    await ensureD1Tables(env);
    const now = new Date().toISOString();

    const db = getD1Binding(env);
    if (db) {
      await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
      await db
        .prepare("INSERT OR REPLACE INTO deleted_ids (entity, item_id, deleted_at) VALUES ('categories', ?, ?)")
        .bind(id, now)
        .run();
    } else {
      await executeD1Query(env, "DELETE FROM categories WHERE id = ?", [id]);
      await executeD1Query(
        env,
        "INSERT OR REPLACE INTO deleted_ids (entity, item_id, deleted_at) VALUES ('categories', ?, ?)",
        [id, now]
      );
    }

    return jsonResponse({ success: true, deleted: id });
  } catch (err: any) {
    console.error("[D1 Categories DELETE Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
