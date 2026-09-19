/**
 * Cloudflare Pages Function: /api/auth
 * Cloudflare D1 Database Powered Authentication & Customer Profiles
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

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");
  const email = url.searchParams.get("email");

  try {
    await ensureD1Tables(env);

    if (!uid && !email) {
      return jsonResponse({ success: false, error: "Missing uid or email" }, 400);
    }

    const { results } = await executeD1Query(
      env,
      uid
        ? "SELECT data_json FROM customers WHERE uid = ? LIMIT 1"
        : "SELECT data_json FROM customers WHERE email = ? LIMIT 1",
      [uid || email?.toLowerCase().trim()]
    );

    if (results && results.length > 0 && results[0].data_json) {
      const parsed = JSON.parse(results[0].data_json);
      return jsonResponse({ success: true, user: parsed });
    }

    return jsonResponse({ success: false, error: "Customer not found" }, 404);
  } catch (err: any) {
    console.error("[D1 Auth GET Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    await ensureD1Tables(env);

    const body = (await request.json()) as any;
    const action = body.action || "signin"; // "signin", "signup", "profile", "signout"

    if (action === "signout") {
      return jsonResponse({ success: true, message: "Signed out successfully" });
    }

    const email = String(body.email || "").toLowerCase().trim();
    const fullName = String(body.fullName || body.displayName || body.name || "House of Shriya Patron");
    const phone = String(body.phone || body.phoneNumber || "");
    const now = new Date().toISOString();

    if (action === "signup" || action === "register") {
      if (!email) {
        return jsonResponse({ success: false, error: "Email is required" }, 400);
      }

      const uid = `hos-cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const user = {
        uid,
        email,
        displayName: fullName,
        fullName,
        phone,
        phoneNumber: phone,
        createdAt: now,
        updatedAt: now,
      };

      const dataJson = JSON.stringify(user);
      const db = getD1Binding(env);

      if (db) {
        await db
          .prepare(
            `INSERT INTO customers (uid, email, full_name, phone, data_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(email) DO UPDATE SET
               full_name = excluded.full_name,
               phone = excluded.phone,
               data_json = excluded.data_json,
               updated_at = excluded.updated_at`
          )
          .bind(uid, email, fullName, phone, dataJson, now, now)
          .run();
      } else {
        await executeD1Query(
          env,
          `INSERT OR REPLACE INTO customers (uid, email, full_name, phone, data_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uid, email, fullName, phone, dataJson, now, now]
        );
      }

      return jsonResponse({ success: true, user });
    }

    if (action === "signin" || action === "login") {
      if (!email) {
        return jsonResponse({ success: false, error: "Email is required" }, 400);
      }

      const { results } = await executeD1Query(
        env,
        "SELECT data_json FROM customers WHERE email = ? LIMIT 1",
        [email]
      );

      if (results && results.length > 0 && results[0].data_json) {
        const existing = JSON.parse(results[0].data_json);
        return jsonResponse({ success: true, user: existing });
      }

      // Auto-create patron session on valid email signin
      const uid = `hos-cust-${Date.now()}`;
      const user = {
        uid,
        email,
        displayName: fullName || email.split("@")[0],
        fullName: fullName || email.split("@")[0],
        phone,
        phoneNumber: phone,
        createdAt: now,
        updatedAt: now,
      };

      const dataJson = JSON.stringify(user);
      const db = getD1Binding(env);
      if (db) {
        await db
          .prepare(
            `INSERT INTO customers (uid, email, full_name, phone, data_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(uid, email, user.displayName, phone, dataJson, now, now)
          .run();
      }

      return jsonResponse({ success: true, user });
    }

    if (action === "profile" || action === "update") {
      const uid = body.uid;
      if (!uid) return jsonResponse({ success: false, error: "Missing uid" }, 400);

      const user = {
        uid,
        email,
        displayName: fullName,
        fullName,
        phone,
        phoneNumber: phone,
        shippingAddress: body.shippingAddress || null,
        updatedAt: now,
      };

      const dataJson = JSON.stringify(user);
      const db = getD1Binding(env);
      if (db) {
        await db
          .prepare(
            `UPDATE customers SET full_name = ?, phone = ?, data_json = ?, updated_at = ? WHERE uid = ?`
          )
          .bind(fullName, phone, dataJson, now, uid)
          .run();
      }

      return jsonResponse({ success: true, user });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (err: any) {
    console.error("[D1 Auth POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
