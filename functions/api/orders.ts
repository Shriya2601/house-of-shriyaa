/**
 * Cloudflare Pages Function: /api/orders
 * Cloudflare D1 Database Powered Order System
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
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const id = url.searchParams.get("id");

  try {
    await ensureD1Tables(env);

    let query = "SELECT data_json FROM orders";
    const params: any[] = [];

    if (id) {
      query += " WHERE id = ? LIMIT 1";
      params.push(id);
    } else if (email) {
      query += " WHERE customer_email = ? ORDER BY created_at DESC";
      params.push(email.toLowerCase().trim());
    } else {
      query += " ORDER BY created_at DESC";
    }

    const { results } = await executeD1Query(env, query, params);
    const orders: any[] = [];

    for (const row of results) {
      try {
        const o = JSON.parse(row.data_json);
        if (o) orders.push(o);
      } catch {}
    }

    if (id) {
      if (orders.length > 0) return jsonResponse({ success: true, order: orders[0] });
      return jsonResponse({ success: false, error: "Order not found" }, 404);
    }

    return jsonResponse(orders);
  } catch (err: any) {
    console.error("[D1 Orders GET Error]:", err);
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

    const order = body;
    const id = String(order.id || `hos-ord-${Date.now()}`);
    const orderNumber = String(order.orderNumber || order.order_number || id);
    const customerEmail = String(order.customerEmail || order.email || "").toLowerCase().trim();
    const customerName = String(order.customerName || order.name || order.shippingAddress?.fullName || "");
    const customerPhone = String(order.customerPhone || order.phone || order.shippingAddress?.phone || "");
    const totalAmount = parseFloat(String(order.totalAmount || order.total || order.amount || 0)) || 0;
    const status = String(order.status || "confirmed");
    const paymentStatus = String(order.paymentStatus || order.payment_status || "Pending");
    const paymentMethod = String(order.paymentMethod || order.payment_method || "UPI");
    const utrNumber = String(order.utrNumber || order.utr || "");
    const now = new Date().toISOString();
    const createdAt = String(order.createdAt || order.created_at || now);
    const updatedAt = now;

    const fullOrder = {
      ...order,
      id,
      orderNumber,
      customerEmail,
      customerName,
      customerPhone,
      totalAmount,
      status,
      paymentStatus,
      paymentMethod,
      utrNumber,
      createdAt,
      updatedAt,
    };

    const dataJson = JSON.stringify(fullOrder);

    const db = getD1Binding(env);
    if (db) {
      await db
        .prepare(
          `INSERT INTO orders (
            id, order_number, customer_email, customer_name, customer_phone, total_amount,
            status, payment_status, payment_method, utr_number, data_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            order_number = excluded.order_number,
            customer_email = excluded.customer_email,
            customer_name = excluded.customer_name,
            customer_phone = excluded.customer_phone,
            total_amount = excluded.total_amount,
            status = excluded.status,
            payment_status = excluded.payment_status,
            payment_method = excluded.payment_method,
            utr_number = excluded.utr_number,
            data_json = excluded.data_json,
            updated_at = excluded.updated_at`
        )
        .bind(
          id,
          orderNumber,
          customerEmail,
          customerName,
          customerPhone,
          totalAmount,
          status,
          paymentStatus,
          paymentMethod,
          utrNumber,
          dataJson,
          createdAt,
          updatedAt
        )
        .run();
    } else {
      await executeD1Query(
        env,
        `INSERT OR REPLACE INTO orders (
          id, order_number, customer_email, customer_name, customer_phone, total_amount,
          status, payment_status, payment_method, utr_number, data_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          orderNumber,
          customerEmail,
          customerName,
          customerPhone,
          totalAmount,
          status,
          paymentStatus,
          paymentMethod,
          utrNumber,
          dataJson,
          createdAt,
          updatedAt,
        ]
      );
    }

    return jsonResponse({
      success: true,
      order: fullOrder,
      orderId: id,
      orderNumber,
    });
  } catch (err: any) {
    console.error("[D1 Orders POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
