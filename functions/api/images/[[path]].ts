/**
 * Cloudflare Pages Function: /api/images/*
 * Serves permanent images from Cloudflare R2 and persistent Firestore fallback
 */
import { findR2Bucket } from "../admin/upload";

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
  const r2Bucket = findR2Bucket(env);
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
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        // Anti-cache headers: ensure instant updates when photos are replaced
        headers.set("Cache-Control", "no-cache, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(object.body, { headers });
      }
    } catch (r2Err) {
      console.warn("[Cloudflare R2 Get Error]:", r2Err);
    }
  }

  // 2. Try Firestore fallback
  try {
    const safeDocIds = [
      key.replace(/\//g, "___"),
      key.replace(/[^a-zA-Z0-9_-]/g, "_"),
      `banners___${key.replace(/^banners\//, "").replace(/\//g, "___")}`,
      `uploads___${key.replace(/^uploads\//, "").replace(/\//g, "___")}`,
    ];

    for (const safeDocId of safeDocIds) {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/house-of-shriya-d49d6/databases/(default)/documents/stored_images/${encodeURIComponent(
        safeDocId
      )}?key=AIzaSyDh8_32I7BS4sjBSjeydj7vhAaSbvdO6w8`;

      const res = await fetch(firestoreUrl);
      if (res.ok) {
        const doc = (await res.json()) as any;
        const dataUrl = doc?.fields?.dataUrl?.stringValue;
        if (dataUrl) {
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mime = match[1];
            const binaryStr = atob(match[2]);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return new Response(bytes.buffer, {
              headers: {
                "Content-Type": mime,
                "Cache-Control": "no-cache, must-revalidate",
                "Pragma": "no-cache",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        }
      }
    }
  } catch (fsErr) {
    console.warn("[Cloudflare Image Firestore Fallback Notice]:", fsErr);
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
