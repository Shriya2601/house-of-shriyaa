/**
 * Cloudflare Pages Function: /api/site-content
 * Reads and persists site content (Hero Slideshow, Features, Trust Badges)
 * directly to Firestore so updates persist on Cloudflare Pages and broadcast live.
 */

interface Env {
  [key: string]: any;
}

const FIRESTORE_PROJECT_ID = "house-of-shriya-d49d6";
const SITE_CONTENT_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/site_content/main`;

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

/**
 * Converts a JS object/primitive to Firestore REST format
 */
function jsToFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(jsToFirestoreValue),
      },
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = jsToFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Converts a Firestore REST value back to standard JS
 */
function firestoreValueToJs(val: any): any {
  if (!val) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    return (val.arrayValue.values || []).map(firestoreValueToJs);
  }
  if ("mapValue" in val) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = firestoreValueToJs(v);
    }
    return obj;
  }
  return null;
}

function firestoreDocToJs(doc: any): any {
  if (!doc?.fields) return {};
  const obj: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = firestoreValueToJs(v);
  }
  return obj;
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

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const res = await fetch(SITE_CONTENT_URL, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const doc = await res.json();
      const content = firestoreDocToJs(doc);
      if (content && Object.keys(content).length > 0) {
        return jsonResponse(content, 200);
      }
    }

    // Fallback: Return empty object so frontend uses its cached or default slides
    return jsonResponse({}, 200);
  } catch (err: any) {
    console.warn("[Cloudflare site-content GET]:", err);
    return jsonResponse({}, 200);
  }
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = await context.request.json() as any;
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const updated = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Construct Firestore fields
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(updated)) {
      if (v !== undefined) {
        fields[k] = jsToFirestoreValue(v);
      }
    }

    const res = await fetch(SITE_CONTENT_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("[Cloudflare site-content PATCH warning]:", errText);
    }

    return jsonResponse({ success: true, siteContent: updated }, 200);
  } catch (err: any) {
    console.error("[Cloudflare site-content POST error]:", err);
    return jsonResponse({ error: err?.message || "Failed to update site content" }, 500);
  }
}

export const onRequestPut = onRequestPost;
export const onRequestPatch = onRequestPost;
