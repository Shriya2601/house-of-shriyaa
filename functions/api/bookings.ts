/**
 * Cloudflare Pages Function: /api/bookings
 * Cloudflare D1 Database Powered Atelier Bookings
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

  try {
    await ensureD1Tables(env);

    let query = "SELECT data_json FROM bookings";
    const params: any[] = [];

    if (email) {
      query += " WHERE email = ? ORDER BY created_at DESC";
      params.push(email.toLowerCase().trim());
    } else {
      query += " ORDER BY created_at DESC";
    }

    const { results } = await executeD1Query(env, query, params);
    const bookings: any[] = [];

    for (const row of results) {
      try {
        const b = JSON.parse(row.data_json);
        if (b) bookings.push(b);
      } catch {}
    }

    return jsonResponse(bookings);
  } catch (err: any) {
    console.error("[D1 Bookings GET Error]:", err);
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

    const booking = body;
    const id = String(booking.id || `hos-bkg-${Date.now()}`);
    const bookingNumber = String(booking.bookingNumber || booking.booking_number || id);
    const email = String(booking.email || "").toLowerCase().trim();
    const phone = String(booking.phone || "");
    const patronName = String(booking.patronName || booking.name || "");
    const service = String(booking.service || "Bridal Consultation");
    const date = String(booking.date || "");
    const slot = String(booking.slot || "");
    const status = String(booking.status || "confirmed");
    const now = new Date().toISOString();
    const createdAt = String(booking.createdAt || booking.created_at || now);
    const updatedAt = now;

    const fullBooking = {
      ...booking,
      id,
      bookingNumber,
      email,
      phone,
      patronName,
      service,
      date,
      slot,
      status,
      createdAt,
      updatedAt,
    };

    const dataJson = JSON.stringify(fullBooking);

    const db = getD1Binding(env);
    if (db) {
      await db
        .prepare(
          `INSERT INTO bookings (
            id, booking_number, email, phone, patron_name, service, date, slot,
            status, data_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            booking_number = excluded.booking_number,
            email = excluded.email,
            phone = excluded.phone,
            patron_name = excluded.patron_name,
            service = excluded.service,
            date = excluded.date,
            slot = excluded.slot,
            status = excluded.status,
            data_json = excluded.data_json,
            updated_at = excluded.updated_at`
        )
        .bind(
          id,
          bookingNumber,
          email,
          phone,
          patronName,
          service,
          date,
          slot,
          status,
          dataJson,
          createdAt,
          updatedAt
        )
        .run();
    } else {
      await executeD1Query(
        env,
        `INSERT OR REPLACE INTO bookings (
          id, booking_number, email, phone, patron_name, service, date, slot,
          status, data_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          bookingNumber,
          email,
          phone,
          patronName,
          service,
          date,
          slot,
          status,
          dataJson,
          createdAt,
          updatedAt,
        ]
      );
    }

    return jsonResponse({
      success: true,
      booking: fullBooking,
      bookingId: id,
    });
  } catch (err: any) {
    console.error("[D1 Bookings POST Error]:", err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}
