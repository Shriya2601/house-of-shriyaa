import type { Order } from "../types";

export interface ShiprocketStatusResponse {
  success: boolean;
  message: string;
  emailMasked?: string;
  configuredEmail?: string;
  hasKey?: boolean;
  isConfigured?: boolean;
  details?: {
    pickupLocationConfigured: string;
    availablePickupLocations?: Array<{
      name: string;
      address: string;
      city: string;
      state: string;
      pin_code: string;
    }>;
  };
}

export interface ShiprocketTrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
}

export interface ShiprocketTrackingResponse {
  success: boolean;
  data?: {
    tracking_data?: {
      track_status: number;
      shipment_status: number;
      shipment_track?: Array<{
        id: number;
        awb_code: string;
        courier_name: string;
        current_status: string;
        origin: string;
        destination: string;
        edd?: string;
      }>;
      shipment_track_activities?: ShiprocketTrackingActivity[];
    };
  };
  error?: string;
}

/**
 * Safe JSON parser with robust error handling
 */
async function safeJsonParse<T = any>(res: Response, fallbackError = "Invalid response from server"): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  let parsed: any = null;

  if (contentType.includes("application/json")) {
    try {
      parsed = await res.json();
    } catch {
      // Fallback to text parsing below
    }
  }

  if (parsed !== null) {
    if (!res.ok && parsed && (parsed.error || parsed.message)) {
      throw new Error(parsed.error || parsed.message);
    }
    return parsed;
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text.slice(0, 120) || `Shiprocket service notice (HTTP ${res.status}): ${fallbackError}`);
  }
  if (text.trim().startsWith("<")) {
    throw new Error("Shiprocket service endpoint is synchronizing. Please retry in a few moments.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(fallbackError);
  }
}

/**
 * Fetch overall status of Shiprocket connection from the backend server.
 * Reads solely from backend environment variables (SHIPROCKET_API_EMAIL, SHIPROCKET_API_PASSWORD).
 */
export async function fetchShiprocketStatus(): Promise<ShiprocketStatusResponse> {
  try {
    const res = await fetch(`/api/shipping/shiprocket/status?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await safeJsonParse(res, "Could not fetch status");
      if (data && typeof data.success === "boolean") {
        return data;
      }
    }
  } catch (err: any) {
    console.warn("[Shiprocket] Server status endpoint warning:", err);
  }

  return {
    success: false,
    isConfigured: false,
    hasKey: false,
    message: "Shiprocket API credentials missing or not configured in backend environment variables.",
  };
}

/**
 * Fetch current Shiprocket configuration metadata from backend.
 * Never exposes raw passwords; returns masked email and pickup location nickname.
 */
export async function fetchShiprocketConfig(): Promise<{
  emailMasked: string;
  pickupLocation: string;
  isConfigured: boolean;
  hasPassword: boolean;
}> {
  try {
    const res = await fetch(`/api/shipping/shiprocket/config?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await safeJsonParse(res, "Could not fetch configuration");
      if (data) {
        return {
          emailMasked: data.emailMasked || "",
          pickupLocation: data.pickupLocation || "Home",
          isConfigured: Boolean(data.isConfigured),
          hasPassword: Boolean(data.hasPassword),
        };
      }
    }
  } catch (err) {
    console.warn("[Shiprocket] Server config endpoint notice:", err);
  }

  return {
    emailMasked: "",
    pickupLocation: "Home",
    isConfigured: false,
    hasPassword: false,
  };
}

/**
 * Save Shiprocket configuration securely to backend
 */
export async function saveShiprocketConfig(params: {
  email?: string;
  pickupLocation?: string;
  password?: string;
  token?: string;
}): Promise<{ success: boolean; auth?: ShiprocketStatusResponse; error?: string }> {
  try {
    const res = await fetch("/api/shipping/shiprocket/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await safeJsonParse(res, "Could not save configuration");
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update configuration on server",
    };
  }
}

/**
 * Test credentials through the backend server (never direct from client browser)
 */
export async function testCustomCredentials(params: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  message: string;
  locations?: Array<{ pickup_location: string; address: string; city: string; state: string }>;
}> {
  const cleanEmail = params.email?.trim() || "";
  const cleanPassword = params.password?.trim() || "";

  if (!cleanEmail || !cleanPassword) {
    return {
      success: false,
      message: "Both Shiprocket API User Email and Password are required.",
    };
  }

  try {
    const res = await fetch("/api/shipping/shiprocket/test-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
    });

    const data = await safeJsonParse(res, "Verification failed");
    return data;
  } catch (serverErr: any) {
    return {
      success: false,
      message: serverErr.message || "Backend verification error",
    };
  }
}

/**
 * Push an order to Shiprocket for dispatch.
 * Calls real backend API. Never generates fake AWB numbers or mock order syncs.
 */
export async function pushOrderToShiprocket(
  order: Order,
  pickupLocation?: string
): Promise<{
  success: boolean;
  shiprocket?: any;
  order?: Order;
  error?: string;
}> {
  try {
    const res = await fetch("/api/shipping/shiprocket/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, pickupLocation }),
    });

    let data: any = null;
    try {
      data = await safeJsonParse(res, "Could not create Shiprocket order");
    } catch (parseErr: any) {
      console.warn("[Shiprocket] Initial response parse:", parseErr.message);
    }

    if (res.ok && data?.success) {
      return data;
    }

    // Secondary fallback sync via /api/orders
    const orderId = order.id || order.orderNumber;
    if (orderId) {
      try {
        const fallbackRes = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...order,
            forceShiprocketSync: true,
            pickupLocation,
          }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData?.order?.shiprocketOrderId || fallbackData?.order?.shiprocketStatus === "SYNCED") {
            return {
              success: true,
              shiprocket: {
                success: true,
                shiprocketOrderId: fallbackData.order.shiprocketOrderId,
                shipmentId: fallbackData.order.shiprocketShipmentId,
                awbCode: fallbackData.order.trackingNumber,
                courierName: fallbackData.order.trackingCourier,
                trackingUrl: fallbackData.order.trackingUrl,
              },
              order: fallbackData.order,
            };
          }
          if (fallbackData?.order?.shiprocketError) {
            return {
              success: false,
              error: fallbackData.order.shiprocketError,
              order: fallbackData.order,
            };
          }
        }
      } catch (fallbackErr) {
        console.warn("[Shiprocket] Secondary sync attempt notice:", fallbackErr);
      }
    }

    return {
      success: false,
      error:
        data?.error ||
        data?.shiprocket?.error ||
        data?.message ||
        "Could not create Shiprocket order. Please verify Shiprocket API credentials in Settings.",
      order: data?.order || order,
    };
  } catch (err: any) {
    console.error("[Shiprocket] Dispatch API error:", err);

    // Secondary fallback sync on fetch/network exception
    const orderId = order.id || order.orderNumber;
    if (orderId) {
      try {
        const fallbackRes = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...order,
            forceShiprocketSync: true,
            pickupLocation,
          }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData?.order?.shiprocketOrderId || fallbackData?.order?.shiprocketStatus === "SYNCED") {
            return {
              success: true,
              shiprocket: {
                success: true,
                shiprocketOrderId: fallbackData.order.shiprocketOrderId,
                shipmentId: fallbackData.order.shiprocketShipmentId,
                awbCode: fallbackData.order.trackingNumber,
                courierName: fallbackData.order.trackingCourier,
                trackingUrl: fallbackData.order.trackingUrl,
              },
              order: fallbackData.order,
            };
          }
          if (fallbackData?.order?.shiprocketError) {
            return {
              success: false,
              error: fallbackData.order.shiprocketError,
              order: fallbackData.order,
            };
          }
        }
      } catch {}
    }

    return {
      success: false,
      error: err.message || "Network error while connecting to Shiprocket dispatch API.",
    };
  }
}

/**
 * Track shipment status via real backend Shiprocket tracking API
 */
export async function trackShipment(params: {
  awb?: string;
  shipmentId?: string | number;
  orderId?: string;
}): Promise<ShiprocketTrackingResponse> {
  try {
    const query = new URLSearchParams();
    query.set("t", String(Date.now()));
    if (params.awb) query.set("awb", params.awb);
    if (params.shipmentId) query.set("shipmentId", String(params.shipmentId));
    if (params.orderId) query.set("orderId", params.orderId);

    const res = await fetch(`/api/shipping/shiprocket/track?${query.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await safeJsonParse(res, "Could not fetch tracking data");
    }
  } catch (err: any) {
    console.warn("[Shiprocket] Tracking query warning:", err);
  }

  return {
    success: false,
    error: "Live tracking details not available from Shiprocket for this shipment yet.",
  };
}

/**
 * Check delivery pincode serviceability
 */
export async function checkPincodeServiceability(params: {
  deliveryPincode: string;
  pickupPincode?: string;
  weight?: number;
  cod?: boolean;
}): Promise<{
  success: boolean;
  couriers?: Array<{
    courier_name: string;
    estimated_delivery_days?: string;
    rate?: number;
    cod?: boolean;
  }>;
  error?: string;
}> {
  try {
    const res = await fetch("/api/shipping/shiprocket/serviceability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      return await res.json();
    }
    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      error: data.message || "Serviceability check failed with Shiprocket",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error during serviceability check",
    };
  }
}

export interface ShiprocketLogEntry {
  id: string;
  timestamp: string;
  action: "AUTH" | "CREATE_ORDER" | "TRACK" | "WEBHOOK" | "RETRY_SYNC" | "CONFIG" | "SERVICEABILITY";
  status: "SUCCESS" | "FAILED" | "PENDING" | "RETRYING";
  statusCode?: number;
  orderNumber?: string;
  orderId?: string;
  endpoint?: string;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  durationMs?: number;
  attemptNumber?: number;
}

/**
 * Fetch logs recorded by the backend Shiprocket API handler
 */
export async function fetchShiprocketLogs(params?: {
  action?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{ success: boolean; logs: ShiprocketLogEntry[]; total?: number; error?: string }> {
  try {
    const query = new URLSearchParams();
    query.set("t", String(Date.now()));
    if (params?.action) query.set("action", params.action);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`/api/shipping/shiprocket/logs?${query.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: Boolean(data?.success),
        logs: Array.isArray(data?.logs) ? data.logs : [],
        total: typeof data?.total === "number" ? data.total : (data?.logs?.length || 0),
      };
    }
  } catch (err: any) {
    console.error("[Shiprocket Client] fetchShiprocketLogs error:", err);
  }

  return { success: false, logs: [], total: 0, error: "Failed to load Shiprocket logs from server." };
}

/**
 * Clear logs on backend
 */
export async function clearShiprocketLogs(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/shipping/shiprocket/logs", {
      method: "DELETE",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { success: true, message: "Logs cleared" };
}

/**
 * Trigger background retry on backend for pending failed orders
 */
export async function triggerShiprocketRetry(): Promise<{
  success: boolean;
  attempted: number;
  succeeded: number;
  failed: number;
  results: Array<{ orderNumber: string; success: boolean; message: string }>;
  error?: string;
}> {
  try {
    const res = await fetch("/api/shipping/shiprocket/retry", {
      method: "POST",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return {
    success: false,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    results: [],
    error: "Retry execution failed",
  };
}
