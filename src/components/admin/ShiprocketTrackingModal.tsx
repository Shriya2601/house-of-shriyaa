import React, { useState } from "react";
import {
  X,
  Truck,
  MapPin,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Order } from "../../types";

interface ShiprocketTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  trackingData: any;
  isLoading: boolean;
  onRefresh?: () => void;
}

export default function ShiprocketTrackingModal({
  isOpen,
  onClose,
  order,
  trackingData,
  isLoading,
  onRefresh,
}: ShiprocketTrackingModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const awbCode =
    order.trackingNumber ||
    trackingData?.tracking_data?.shipment_track?.[0]?.awb_code ||
    `SR-${order.orderNumber}`;

  const courierName =
    order.trackingCourier ||
    trackingData?.tracking_data?.shipment_track?.[0]?.courier_name ||
    "Shiprocket Express Carrier";

  const currentStatus =
    trackingData?.tracking_data?.shipment_track?.[0]?.current_status ||
    (order.orderStatus === "delivered"
      ? "DELIVERED"
      : order.orderStatus === "shipped"
      ? "IN TRANSIT"
      : "MANIFEST CREATED");

  const edd =
    trackingData?.tracking_data?.shipment_track?.[0]?.edd ||
    trackingData?.tracking_data?.etd ||
    "3-4 Business Days";

  const activities =
    trackingData?.tracking_data?.shipment_track_activities || [
      {
        date: new Date(order.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Order Confirmed & Manifest Created",
        activity: "Manifest registered with Shiprocket Logistics",
        location: "Surat Atelier, Gujarat",
      },
    ];

  const handleCopyAWB = () => {
    navigator.clipboard.writeText(awbCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clientPhone = order.customer?.phone?.replace(/[^0-9]/g, "") || "";
  const trackingUrl = order.trackingUrl || `https://shiprocket.co/tracking/${awbCode}`;

  const whatsappMsg = `Namaste ${order.customer?.fullName || "Patron"}, your House of Shriya order #${order.orderNumber} is dispatched via ${courierName}. Your tracking AWB is ${awbCode}. Track live here: ${trackingUrl}`;
  const whatsappUrl = `https://wa.me/91${clientPhone.slice(-10)}?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl bg-white text-stone-900 rounded-2xl shadow-2xl border border-[#e5ddd3] overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between bg-[#fcfaf7]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0d4f3c] text-[#d4af37] flex items-center justify-center">
              <Truck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Shiprocket Live Tracking
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {currentStatus}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Order #{order.orderNumber} · Courier: {courierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw size={32} className="animate-spin text-[#0d4f3c] mx-auto" />
              <p className="text-xs font-medium text-stone-600">
                Fetching real-time tracking data from Shiprocket...
              </p>
            </div>
          ) : (
            <>
              {/* AWB & EDD Card */}
              <div className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Air Waybill (AWB) Number
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-sm text-[#0d4f3c]">{awbCode}</span>
                    <button
                      onClick={handleCopyAWB}
                      className="text-stone-400 hover:text-stone-700 p-1 rounded hover:bg-stone-200/50 cursor-pointer transition-colors"
                      title="Copy AWB Code"
                    >
                      {copied ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Estimated Delivery
                  </span>
                  <div className="flex items-center sm:justify-end gap-1.5 mt-0.5 text-stone-800 font-semibold text-xs">
                    <Calendar size={13} className="text-stone-400" />
                    <span>{edd}</span>
                  </div>
                </div>
              </div>

              {/* Route Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Origin Atelier
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                    <MapPin size={13} className="text-[#0d4f3c] shrink-0" />
                    <span>Surat Atelier, Gujarat</span>
                  </div>
                  <span className="text-[11px] text-stone-500">Packaging & Insured Dispatch</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Patron Destination
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                    <MapPin size={13} className="text-amber-600 shrink-0" />
                    <span className="truncate">
                      {order.shippingAddress?.city || "Client City"},{" "}
                      {order.shippingAddress?.state || "India"}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    PIN: {order.shippingAddress?.pincode || "141001"}
                  </span>
                </div>
              </div>

              {/* Milestone Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#0d4f3c]" />
                  <span>Shipment Activity Logs</span>
                </h4>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e5ddd3]">
                  {activities.map((act: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white ${
                          idx === 0
                            ? "bg-emerald-600 ring-2 ring-emerald-100"
                            : "bg-stone-300"
                        }`}
                      />
                      <div className="bg-white border border-[#e8dfd5] rounded-lg p-3 text-xs shadow-2xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="font-bold text-stone-900">
                            {act.status || act.activity || "In Transit"}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {act.date || "Recently"}
                          </span>
                        </div>
                        {act.activity && act.activity !== act.status && (
                          <p className="text-stone-600 text-[11px]">{act.activity}</p>
                        )}
                        {act.location && (
                          <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1">
                            <MapPin size={10} />
                            <span>{act.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#fcfaf7] border-t border-[#e5ddd3] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {clientPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#1faa53] transition-colors"
            >
              <MessageCircle size={13} />
              <span>Send Tracking via WhatsApp</span>
            </a>
          )}

          <div className="flex items-center gap-2 justify-end">
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#e5ddd3] bg-white text-stone-700 hover:bg-stone-100 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Shiprocket Web Page</span>
              <ExternalLink size={12} />
            </a>
            <button
              onClick={onClose}
              className="bg-[#0d4f3c] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#083528] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
