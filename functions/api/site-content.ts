/**
 * Cloudflare Pages Function: /api/site-content
 * Cloudflare D1 Database Powered Site Content
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
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

    const { results } = await executeD1Query(
      env,
      "SELECT content_json FROM site_content WHERE id = 'main' LIMIT 1"
    );

    if (results && results.length > 0 && results[0].content_json) {
      try {
        const parsed = JSON.parse(results[0].content_json);
        return jsonResponse(parsed);
      } catch {}
    }

    // Default fallback content
    const defaultContent = {
      heroTitle: "Elegance in Every Thread",
      heroSubtitle: "House of Shriya brings you curated ethnic luxury with bespoke craftsmanship.",
      heroSlides: [
        {
          id: "slide-1",
          image: "/uploads/banners/hero-slide-1789586249703-57784.jpg",
          title: "The Royal Festive Edit",
          subtitle: "Hand-finished satin ensembles tailored for effortless festive grace.",
          ctaText: "Shop Collection",
          ctaLink: "/shop",
        },
      ],
      announcementBar: {
        text: "✨ Exclusive Inaugural Offers Across All Festive Silhouettes | Complimentary Shipping Across India",
        link: "/shop",
      },
    };

    return jsonResponse(defaultContent);
  } catch (err: any) {
    console.error("[D1 Site Content GET Error]:", err);
    return jsonResponse({}, 200);
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

    const now = new Date().toISOString();
    const contentToSave = {
      ...body,
      updatedAt: now,
    };

    const contentJson = JSON.stringify(contentToSave);

    const db = getD1Binding(env);
    if (db) {
      await db
        .prepare(
          `INSERT INTO site_content (id, content_json, updated_at)
           VALUES ('main', ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             content_json = excluded.content_json,
             updated_at = excluded.updated_at`
        )
        .bind(contentJson, now)
        .run();
    } else {
      await executeD1Query(
        env,
        `INSERT OR REPLACE INTO site_content (id, content_json, updated_at)
         VALUES ('main', ?, ?)`,
        [contentJson, now]
      );
    }

    return jsonResponse({
      success: true,
      message: "Site content persisted to Cloudflare D1 successfully",
      content: contentToSave,
    });
  } catch (err: any) {
    console.error("[D1 Site Content POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
