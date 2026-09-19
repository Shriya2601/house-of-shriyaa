/**
 * Cloudflare Pages Function: /api/images/*
 * Serves permanent images from Cloudflare R2 and Cloudflare D1 fallback
 * ZERO Firebase usage!
 */

import { getR2Bucket } from "../../lib/r2";
import { executeD1Query, ensureD1Tables } from "../../lib/d1";

interface Env {
  [key: string]: any;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function onRequestGet(context: {
  request: Request;
  params: { path?: string | string[] };
  env: Env;
}): Promise<Response> {
  const { params, env } = context;

  const rawPath = Array.isArray(params.path)
    ? params.path.join("/")
    : typeof params.path === "string"
    ? params.path
    : "";

  const key = decodeURIComponent(rawPath).replace(/^\/+/, "");

  if (!key) {
    return new Response(JSON.stringify({ success: false, error: "Image key required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 1. Try Cloudflare R2 Bucket
  const r2Bucket = getR2Bucket(env);
  if (r2Bucket) {
    try {
      let object = await r2Bucket.get(key);
      if (!object && !key.startsWith("uploads/")) {
        object = await r2Bucket.get(`uploads/${key}`);
      }
      if (!object && !key.startsWith("banners/")) {
        object = await r2Bucket.get(`banners/${key}`);
      }

      if (object) {
        const headers = new Headers();
        if (typeof object.writeHttpMetadata === "function") {
          object.writeHttpMetadata(headers);
        }
        if (object.httpEtag) {
          headers.set("etag", object.httpEtag);
        }
        headers.set("Cache-Control", "no-cache, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(object.body, { headers });
      }
    } catch (r2Err) {
      console.warn("[Cloudflare R2 Get Notice]:", r2Err);
    }
  }

  // 2. Cloudflare D1 stored_images persistent fallback
  try {
    await ensureD1Tables(env);
    const filename = key.split("/").pop() || key;
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

    const candidates = [
      key,
      `uploads/${key}`,
      `banners/${key}`,
      filename,
      `uploads/${filename}`,
      `banners/${filename}`,
      nameWithoutExt,
    ];

    const placeholders = candidates.map(() => "?").join(", ");
    const { results } = await executeD1Query(
      env,
      `SELECT data_url, mime_type, filename FROM stored_images WHERE key IN (${placeholders}) OR filename IN (${placeholders}) LIMIT 1`,
      [...candidates, ...candidates]
    );

    if (results && results.length > 0 && results[0].data_url) {
      const row = results[0];
      const dataUrl = row.data_url;
      const mime = row.mime_type || "image/jpeg";

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const binaryStr = atob(match[2]);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return new Response(bytes.buffer, {
          headers: {
            "Content-Type": match[1] || mime,
            "Cache-Control": "no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }
  } catch (d1Err) {
    console.warn("[Cloudflare Image D1 Fallback Notice]:", d1Err);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: `Image not found: ${key}`,
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function onRequestHead(context: any): Promise<Response> {
  const getRes = await onRequestGet(context);
  return new Response(null, {
    status: getRes.status,
    headers: getRes.headers,
  });
}
