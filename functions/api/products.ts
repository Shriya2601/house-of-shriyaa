/**
 * Cloudflare Pages Function: /api/products
 * Reads and persists products directly with Firestore for Cloudflare Pages deployments
 */

interface Env {
  [key: string]: any;
}

const FIRESTORE_PROJECT_ID = "house-of-shriya-d49d6";
const PRODUCTS_COL_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/products`;

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
  if (!doc?.fields) return null;
  const obj: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = firestoreValueToJs(v);
  }
  const nameParts = (doc.name || "").split("/");
  const id = nameParts[nameParts.length - 1];
  if (id && !obj.id) obj.id = id;
  return obj;
}

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

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const res = await fetch(`${PRODUCTS_COL_URL}?pageSize=300`, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json() as any;
      const documents = data?.documents || [];
      const prods = documents.map(firestoreDocToJs).filter((p: any) => p && p.id);
      return jsonResponse(prods, 200);
    }

    return jsonResponse([], 200);
  } catch (err: any) {
    console.warn("[Cloudflare products GET]:", err);
    return jsonResponse([], 200);
  }
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = await context.request.json() as any;
    if (!body || typeof body !== "object" || !body.id) {
      return jsonResponse({ error: "Product id is required" }, 400);
    }

    const updated = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(updated)) {
      if (v !== undefined) {
        fields[k] = jsToFirestoreValue(v);
      }
    }

    const productDocUrl = `${PRODUCTS_COL_URL}/${encodeURIComponent(body.id)}`;
    await fetch(productDocUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    return jsonResponse({ success: true, product: updated }, 200);
  } catch (err: any) {
    console.error("[Cloudflare products POST error]:", err);
    return jsonResponse({ error: err?.message || "Failed to update product" }, 500);
  }
}

export const onRequestPut = onRequestPost;
export const onRequestPatch = onRequestPost;
