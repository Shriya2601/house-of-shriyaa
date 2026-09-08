import type { Order } from "../types";

export interface ShiprocketStatusResponse {
  success: boolean;
  message: string;
  emailMasked?: string;
  configuredEmail?: string;
  hasKey?: boolean;
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

async function safeJsonParse<T = any>(res: Response, fallbackError = "Invalid response from server"): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      // Fallback to text parsing
    }
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Server status ${res.status}: ${text.slice(0, 120) || fallbackError}`);
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

export async function fetchShiprocketStatus(): Promise<ShiprocketStatusResponse> {
  try {
    const res = await fetch("/api/shipping/shiprocket/status");
    return await safeJsonParse(res, "Could not fetch status");
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not reach shipping server",
    };
  }
}

export async function fetchShiprocketConfig(): Promise<{
  email: string;
  emailMasked: string;
  pickupLocation: string;
  isConfigured: boolean;
  hasPassword: boolean;
}> {
  try {
    const res = await fetch("/api/shipping/shiprocket/config");
    return await safeJsonParse(res, "Could not fetch configuration");
  } catch (err) {
    return {
      email: "",
      emailMasked: "",
      pickupLocation: "Home",
      isConfigured: false,
      hasPassword: false,
    };
  }
}

export async function saveShiprocketConfig(params: {
  email?: string;
  pickupLocation?: string;
  password?: string;
}): Promise<{ success: boolean; auth?: ShiprocketStatusResponse; error?: string }> {
  try {
    const res = await fetch("/api/shipping/shiprocket/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return await safeJsonParse(res, "Could not save configuration");
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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
    return await safeJsonParse(res, "Could not create Shiprocket order");
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function trackShipment(params: {
  awb?: string;
  shipmentId?: string | number;
  orderId?: string;
}): Promise<ShiprocketTrackingResponse> {
  try {
    const query = new URLSearchParams();
    if (params.awb) query.set("awb", params.awb);
    if (params.shipmentId) query.set("shipmentId", String(params.shipmentId));
    if (params.orderId) query.set("orderId", params.orderId);

    const res = await fetch(`/api/shipping/shiprocket/track?${query.toString()}`);
    return await safeJsonParse(res, "Could not fetch tracking data");
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
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

export async function fetchShiprocketLogs(params?: {
  action?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{ success: boolean; logs: ShiprocketLogEntry[]; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params?.action) query.set("action", params.action);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`/api/shipping/shiprocket/logs?${query.toString()}`);
    if (!res.ok) {
      return { success: false, logs: [], error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, logs: [], error: err.message };
  }
}

export async function clearShiprocketLogs(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/shipping/shiprocket/logs", {
      method: "DELETE",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      error: err.message,
    };
  }
}

export async function testCustomCredentials(params: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  message: string;
  locations?: Array<{ pickup_location: string; address: string; city: string; state: string }>;
}> {
  try {
    const res = await fetch("/api/shipping/shiprocket/test-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return await safeJsonParse(res, "Failed to verify credentials with Shiprocket");
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Network request failed",
    };
  }
}

