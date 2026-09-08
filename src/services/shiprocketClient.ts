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

export async function fetchShiprocketStatus(): Promise<ShiprocketStatusResponse> {
  try {
    const res = await fetch("/api/shipping/shiprocket/status");
    if (!res.ok) {
      return {
        success: false,
        message: `HTTP error ${res.status}`,
      };
    }
    return await res.json();
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
    return await res.json();
  } catch (err) {
    return {
      email: "",
      emailMasked: "",
      pickupLocation: "Primary",
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
