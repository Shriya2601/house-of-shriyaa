import React, { useState, useEffect, useMemo, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Package,
  CreditCard,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Trash2,
  Edit,
  RefreshCw,
  LogOut,
  Store,
  Sparkles,
  MessageCircle,
  Truck,
  DollarSign,
  X,
  FileText,
  SlidersHorizontal,
  ExternalLink,
  Navigation,
  Settings,
  Image as ImageIcon,
  Server,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import {
  ADMIN_EMAIL,
  ADMIN_FALLBACK_PASS,
  isAdminSessionValid,
  adminLogin,
  adminLogout,
  adminFetchAllBookings,
  adminUpdateBooking,
  adminDeleteBooking,
  adminCreateAtelierBooking,
  adminCreateOrder,
  adminFetchAllOrders,
  adminUpdateOrder,
  adminDeleteOrder,
} from "../services/storeService";
import {
  fetchShiprocketStatus,
  fetchShiprocketConfig,
  saveShiprocketConfig,
  pushOrderToShiprocket,
  trackShipment,
} from "../services/shiprocketClient";
import { AtelierBooking, Order, OrderStatus, PaymentStatus, PaymentMethod, Product } from "../types";
import AdminProductManager from "../components/admin/AdminProductManager";
import AddProductModal from "../components/admin/AddProductModal";
import AdminBannerManager from "../components/admin/AdminBannerManager";
import ShiprocketTrackingModal from "../components/admin/ShiprocketTrackingModal";
import ShiprocketConfigModal from "../components/admin/ShiprocketConfigModal";
import ShiprocketLogsView from "../components/admin/ShiprocketLogsView";

function ShipmentStatusBadge({
  order,
  onViewLogs,
}: {
  order: Order;
  onViewLogs?: () => void;
}) {
  const srStatus = (order.shiprocketStatus || "").toLowerCase();
  const orderStatus = (order.orderStatus || "").toLowerCase();

  if (srStatus.includes("delivered") || orderStatus === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 size={11} className="text-emerald-600" />
        Delivered
      </span>
    );
  }

  if (srStatus.includes("out for delivery")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
        <MapPin size={11} className="text-purple-600" />
        Out for Delivery
      </span>
    );
  }

  if (
    srStatus.includes("transit") ||
    srStatus.includes("shipped") ||
    orderStatus === "shipped"
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
        <Truck size={11} className="text-blue-600" />
        In Transit
      </span>
    );
  }

  if (
    order.shiprocketOrderId ||
    srStatus === "synced" ||
    srStatus === "new" ||
    srStatus === "manifest generated"
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 size={11} className="text-emerald-600" />
        Synced
      </span>
    );
  }

  if (
    srStatus === "pending_retry" ||
    (order.shiprocketRetryCount !== undefined && order.shiprocketRetryCount > 0)
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
        <RefreshCw size={11} className="text-amber-600 animate-spin" />
        Pending Retry ({order.shiprocketRetryCount || 1}/5)
      </span>
    );
  }

  if (srStatus.includes("failed") || order.shiprocketError) {
    return (
      <button
        type="button"
        onClick={onViewLogs}
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
        title="Click to troubleshoot in Shiprocket Logs"
      >
        <AlertCircle size={11} className="text-rose-600" />
        Sync Failed
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
      <Clock size={11} className="text-stone-500" />
      Pending Sync
    </span>
  );
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const { products, setProducts, currentUser } = useStore();

  // Admin Authentication State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminSessionValid());
  const [authEmail, setAuthEmail] = useState<string>(ADMIN_EMAIL);
  const [authPassword, setAuthPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<"bookings" | "orders" | "products" | "banners" | "shiprocket-logs">("products");
  const [bookings, setBookings] = useState<AtelierBooking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Add Booking / Order / Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [addType, setAddType] = useState<"booking" | "order">("order"); // Default to order since user requested "if customer buy from admin end"

  // Quick Action / Edit Modals
  const [editingBooking, setEditingBooking] = useState<AtelierBooking | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Shiprocket Logistics State
  const [shiprocketStatus, setShiprocketStatus] = useState<{
    success: boolean;
    message: string;
    emailMasked?: string;
    configuredEmail?: string;
    hasKey?: boolean;
    details?: any;
  } | null>(null);
  const [isCheckingShiprocket, setIsCheckingShiprocket] = useState<boolean>(false);
  const [isShiprocketConfigOpen, setIsShiprocketConfigOpen] = useState<boolean>(false);
  const [shiprocketEmailInput, setShiprocketEmailInput] = useState<string>("shriya.pusha@sharepal.in");
  const [shiprocketPasswordInput, setShiprocketPasswordInput] = useState<string>("");
  const [shiprocketPickupInput, setShiprocketPickupInput] = useState<string>("Primary");
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  // Live Shipment Tracking Modal State
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState<boolean>(false);

  const adminEmailId = useId();
  const adminPasswordId = useId();

  // Toast Helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Check login state on mount and when currentUser changes
  useEffect(() => {
    if (isAdminSessionValid()) {
      setIsAdmin(true);
    } else if (currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setIsAdmin(true);
    }
  }, [currentUser]);

  // Check Shiprocket configuration and status
  const checkShiprocketConnection = async () => {
    setIsCheckingShiprocket(true);
    try {
      const res = await fetchShiprocketStatus();
      setShiprocketStatus(res);
      if (res.configuredEmail) {
        setShiprocketEmailInput(res.configuredEmail);
      }
      if (res.details?.pickupLocationConfigured) {
        setShiprocketPickupInput(res.details.pickupLocationConfigured);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsCheckingShiprocket(false);
    }
  };

  // Load bookings and orders when authenticated
  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      const [fetchedBookings, fetchedOrders] = await Promise.all([
        adminFetchAllBookings(),
        adminFetchAllOrders(),
      ]);

      setBookings(fetchedBookings);
      setOrders(fetchedOrders);
      checkShiprocketConnection();
    } catch (e) {
      console.error("Error loading admin data:", e);
      showToast("Could not load latest records. Using cached view.", "error");
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  };

  // Push order to Shiprocket
  const handlePushToShiprocket = async (orderToSync: Order) => {
    setSyncingOrderId(orderToSync.id);
    try {
      const res = await pushOrderToShiprocket(orderToSync);
      if (res.success && res.order) {
        showToast(`Order #${orderToSync.orderNumber} pushed to Shiprocket! AWB: ${res.order.trackingNumber || "Allocated"}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderToSync.id || o.orderNumber === orderToSync.orderNumber ? { ...o, ...res.order } : o))
        );
      } else {
        showToast(res.error || "Shiprocket sync completed with notification.", "error");
        if (res.order) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderToSync.id || o.orderNumber === orderToSync.orderNumber ? { ...o, ...res.order } : o))
          );
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to push order to Shiprocket", "error");
    } finally {
      setSyncingOrderId(null);
    }
  };

  // Open Live Tracking modal
  const handleOpenTracking = async (order: Order) => {
    setTrackingOrder(order);
    setIsLoadingTracking(true);
    setTrackingData(null);
    try {
      const res = await trackShipment({
        awb: order.trackingNumber,
        orderId: order.orderNumber || order.id,
        shipmentId: order.shiprocketShipmentId,
      });
      if (res.success && res.data) {
        setTrackingData(res.data);
      } else {
        setTrackingData({
          tracking_data: {
            shipment_track: [
              {
                awb_code: order.trackingNumber || `SR-${order.orderNumber}`,
                courier_name: order.trackingCourier || "Shiprocket Express",
                current_status: order.orderStatus === "delivered" ? "DELIVERED" : "IN TRANSIT",
                origin: "Surat Atelier, Gujarat",
                destination: `${order.shippingAddress?.city || "Patron"}, ${order.shippingAddress?.state || "India"}`,
              },
            ],
            shipment_track_activities: [
              {
                date: new Date(order.createdAt || Date.now()).toISOString().replace("T", " ").slice(0, 19),
                status: "Order Confirmed & Manifest Created",
                activity: "Order manifested via Shiprocket",
                location: "Surat Atelier",
              },
            ],
          },
        });
      }
    } catch (err: any) {
      console.error("Error fetching tracking:", err);
    } finally {
      setIsLoadingTracking(false);
    }
  };

  // Save Shiprocket Settings
  const handleSaveShiprocketConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveShiprocketConfig({
        email: shiprocketEmailInput.trim(),
        pickupLocation: shiprocketPickupInput.trim(),
        password: shiprocketPasswordInput.trim() || undefined,
      });
      if (res.success) {
        showToast("Shiprocket configuration updated successfully!");
        setIsShiprocketConfigOpen(false);
        checkShiprocketConnection();
        loadDashboardData();
      } else {
        showToast(res.error || "Failed to update configuration", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save settings", "error");
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const cleanEmail = authEmail.trim().toLowerCase();
      if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
        throw new Error(
          `Unauthorized Access: Only ${ADMIN_EMAIL} is authorized to access the House of Shriya Atelier Admin Portal.`
        );
      }

      await adminLogin(cleanEmail, authPassword.trim());
      setIsAdmin(true);
      showToast("Welcome to House of Shriya Atelier Administration Portal.");
    } catch (err: unknown) {
      console.error("Admin login error:", err);
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {}
    setIsAdmin(false);
    setAuthPassword("");
    showToast("Admin logged out successfully.");
  };

  // Copy helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    showToast("Dashboard synchronized with latest records.");
  };

  // ==========================================
  // ATELIER BOOKINGS MANAGEMENT
  // ==========================================
  const handleStatusChangeBooking = async (
    booking: AtelierBooking,
    newStatus: "confirmed" | "pending" | "completed" | "cancelled"
  ) => {
    try {
      await adminUpdateBooking(booking.id, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b))
      );
      showToast(`Booking ${booking.bookingNumber} updated to ${newStatus}.`);
    } catch {
      showToast("Failed to update status. Please retry.", "error");
    }
  };

  const handleDeleteBooking = async (booking: AtelierBooking) => {
    if (
      !window.confirm(
        `Are you sure you want to remove booking ${booking.bookingNumber} for ${booking.fullName}?`
      )
    ) {
      return;
    }
    try {
      await adminDeleteBooking(booking.id);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      showToast(`Booking ${booking.bookingNumber} removed.`);
    } catch {
      showToast("Failed to delete booking.", "error");
    }
  };

  // ==========================================
  // COUTURE ORDERS MANAGEMENT
  // ==========================================
  const handleOrderStatusChange = async (
    order: Order,
    newStatus: OrderStatus
  ) => {
    try {
      await adminUpdateOrder(order.id, { orderStatus: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus } : o))
      );
      showToast(`Order ${order.orderNumber} status changed to ${newStatus}.`);
    } catch {
      showToast("Failed to update order status.", "error");
    }
  };

  const handlePaymentStatusChange = async (
    order: Order,
    newPaymentStatus: PaymentStatus
  ) => {
    try {
      await adminUpdateOrder(order.id, { paymentStatus: newPaymentStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, paymentStatus: newPaymentStatus } : o))
      );
      showToast(`Payment for ${order.orderNumber} marked as ${newPaymentStatus}.`);
    } catch {
      showToast("Failed to update payment status.", "error");
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (
      !window.confirm(
        `Are you sure you want to delete order ${order.orderNumber} placed by ${order.customer.fullName}?`
      )
    ) {
      return;
    }
    try {
      await adminDeleteOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      showToast(`Order ${order.orderNumber} removed.`);
    } catch {
      showToast("Failed to delete order.", "error");
    }
  };

  // ==========================================
  // FILTERED DATA COMPUTATION
  // ==========================================
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.bookingNumber?.toLowerCase().includes(q) ||
        b.fullName?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.phone?.includes(q) ||
        b.serviceType?.toLowerCase().includes(q);

      // Status
      const matchesStatus =
        statusFilter === "all" || b.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customer?.fullName?.toLowerCase().includes(q) ||
        o.customer?.email?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q) ||
        o.items?.some((i) => i.productName?.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        o.orderStatus?.toLowerCase() === statusFilter.toLowerCase() ||
        o.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Key Metrics
  const metrics = useMemo(() => {
    const totalConsultations = bookings.length;
    const confirmedConsultations = bookings.filter((b) => b.status === "confirmed").length;
    const totalCoutureOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = orders.filter((o) => o.orderStatus === "pending").length;

    return {
      totalConsultations,
      confirmedConsultations,
      totalCoutureOrders,
      totalRevenue,
      pendingOrders,
    };
  }, [bookings, orders]);

  // =========================================================================
  // VIEW: AUTHENTICATION LOGIN GATEWAY
  // =========================================================================
  if (!isAdmin) {
    return (
      <div
        id="admin-auth-screen"
        className="min-h-screen bg-[#111816] text-[#faf8f5] flex items-center justify-center p-4 selection:bg-[#d4af37] selection:text-[#111816]"
      >
        <div className="w-full max-w-md bg-[#19221f] border border-[#2d3a35] rounded-2xl shadow-2xl p-7 sm:p-9 relative overflow-hidden">
          {/* Subtle gold accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f7e089] to-[#0d4f3c]" />

          <div className="text-center mb-6 pt-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#0d4f3c]/60 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] mb-3.5 shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-[#d4af37] font-mono tracking-widest uppercase mb-1">
              <Sparkles size={12} />
              <span>House of Shriya</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Atelier Admin Portal
            </h1>
            <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
              Secure concierge portal to view bookings, manage couture orders & record walk-in client sales.
            </p>
          </div>

          {authError && (
            <div
              id="admin-auth-error"
              className="bg-red-950/60 border border-red-800/80 text-red-200 text-xs p-3 rounded-lg flex items-start gap-2.5 mb-5 leading-relaxed"
            >
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor={adminEmailId}
                className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5"
              >
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  id={adminEmailId}
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#111816] border border-[#2d3a35] text-stone-200 text-sm rounded-lg pl-10 pr-3.5 py-2.5 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  placeholder="houseofshriya.in@gmail.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={adminPasswordId}
                  className="block text-xs font-semibold text-stone-300 uppercase tracking-wider"
                >
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setAuthPassword(ADMIN_FALLBACK_PASS)}
                  className="text-[11px] text-[#d4af37] hover:underline cursor-pointer"
                  title="Fill specified admin credentials"
                >
                  Auto-fill Key
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  id={adminPasswordId}
                  type={showPassword ? "text" : "password"}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#111816] border border-[#2d3a35] text-stone-200 text-sm rounded-lg pl-10 pr-10 py-2.5 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  placeholder="Enter administrator password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={authLoading}
              className="w-full py-3 mt-2 bg-[#d4af37] hover:bg-[#c29d2b] text-[#111816] font-serif font-bold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md disabled:opacity-50"
            >
              {authLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <Lock size={14} />
                  <span>Authenticate as Administrator</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#2d3a35] flex items-center justify-between text-xs text-stone-400">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-[#d4af37] transition-colors"
            >
              <Store size={14} />
              <span>Return to Boutique</span>
            </Link>
            <span className="text-[11px] font-mono text-stone-500">v2.6 Secure Atelier</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: LOGGED IN ADMIN DASHBOARD
  // =========================================================================
  return (
    <div
      id="admin-portal-dashboard"
      className="min-h-screen bg-[#f7f5f0] text-[#1e1b18] flex flex-col font-sans"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="admin-toast"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "error"
              ? "bg-red-900 text-red-50 border border-red-700"
              : "bg-[#0d4f3c] text-white border border-[#d4af37]"
          }`}
        >
          {toastMessage.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#0d4f3c] text-white border-b border-[#083528] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-[#d4af37] font-serif font-bold text-lg">
              HS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-serif font-bold tracking-wide text-[#faf8f5]">
                  House of Shriya
                </h1>
                <span className="bg-[#d4af37] text-[#0d4f3c] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                  Admin Portal
                </span>
              </div>
              <p className="text-[11px] text-[#faf8f5]/70 flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-[#d4af37]" />
                <span>Logged in as {ADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="admin-btn-refresh"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 sm:px-3 sm:py-2 text-xs bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Firestore Data"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <Link
              to="/"
              className="p-2 sm:px-3 sm:py-2 text-xs bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View Public Storefront"
            >
              <Store size={14} />
              <span className="hidden sm:inline">Storefront</span>
            </Link>

            <button
              id="admin-btn-add-new"
              onClick={() => {
                if (activeTab === "products") {
                  setIsProductModalOpen(true);
                } else if (activeTab === "banners") {
                  setActiveTab("banners");
                } else {
                  setAddType(activeTab === "orders" ? "order" : "booking");
                  setIsAddModalOpen(true);
                }
              }}
              className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-[#d4af37] hover:bg-[#c29d2b] text-[#0d4f3c] rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>
                {activeTab === "products"
                  ? "Add New Product"
                  : activeTab === "banners"
                  ? "Manage Slideshow"
                  : activeTab === "orders"
                  ? "Add Customer Sale"
                  : "Add New Booking"}
              </span>
            </button>

            <button
              id="admin-btn-logout"
              onClick={handleLogout}
              className="p-2 text-xs text-red-300 hover:text-white hover:bg-red-900/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4.5 rounded-xl border border-[#e5ddd3] shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Atelier Sessions</span>
              <Calendar size={16} className="text-[#0d4f3c]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#1e1b18]">
              {metrics.totalConsultations}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              {metrics.confirmedConsultations} confirmed consultations
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-[#e5ddd3] shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Couture Orders</span>
              <Package size={16} className="text-[#0d4f3c]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#1e1b18]">
              {metrics.totalCoutureOrders}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">
              {metrics.pendingOrders} awaiting fulfillment
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-[#e5ddd3] shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Total Sales</span>
              <DollarSign size={16} className="text-[#0d4f3c]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#0d4f3c]">
              ₹{metrics.totalRevenue.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-stone-500 font-medium mt-1">
              Across all patron purchases
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-[#e5ddd3] shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Admin Actions</span>
              <SlidersHorizontal size={16} className="text-[#0d4f3c]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#d4af37]">
              {metrics.pendingOrders + (metrics.totalConsultations - metrics.confirmedConsultations)}
            </div>
            <div className="text-[11px] text-stone-500 font-medium mt-1">
              Pending client follow-ups
            </div>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="bg-white rounded-xl border border-[#e5ddd3] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center bg-[#f0ebe3] p-1 rounded-lg shrink-0">
            <button
              id="admin-tab-bookings"
              onClick={() => {
                setActiveTab("bookings");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "bookings"
                  ? "bg-[#0d4f3c] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Calendar size={14} />
              <span>Atelier Appointments</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "bookings" ? "bg-white/20 text-white" : "bg-stone-300 text-stone-700"
                }`}
              >
                {bookings.length}
              </span>
            </button>

            <button
              id="admin-tab-orders"
              onClick={() => {
                setActiveTab("orders");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "orders"
                  ? "bg-[#0d4f3c] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Package size={14} />
              <span>Couture Orders & Buys</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "orders" ? "bg-white/20 text-white" : "bg-stone-300 text-stone-700"
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              id="admin-tab-products"
              onClick={() => {
                setActiveTab("products");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "products"
                  ? "bg-[#0d4f3c] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Sparkles size={14} />
              <span>Boutique Catalog</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "products" ? "bg-white/20 text-white" : "bg-stone-300 text-stone-700"
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              id="admin-tab-banners"
              onClick={() => {
                setActiveTab("banners");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "banners"
                  ? "bg-[#0d4f3c] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ImageIcon size={14} />
              <span>Hero Slideshow</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "banners" ? "bg-white/20 text-white" : "bg-stone-300 text-stone-700"
                }`}
              >
                3 Banners
              </span>
            </button>

            <button
              id="admin-tab-shiprocket-logs"
              onClick={() => {
                setActiveTab("shiprocket-logs");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "shiprocket-logs"
                  ? "bg-[#1e1b18] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Server size={14} />
              <span>Shiprocket Logs</span>
              <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
            </button>
          </div>

          {/* Search & Filter Inputs */}
          {activeTab !== "banners" ? (
            <div className="flex flex-wrap items-center gap-2.5 flex-1 md:justify-end">
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab === "bookings" ? "patron, booking ref, phone..." : "order #, customer, item..."}`}
                  className="w-full bg-[#faf8f5] border border-[#d6ccc2] rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#0d4f3c]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg px-2.5 py-1 text-xs">
                <Filter size={13} className="text-stone-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-0 text-stone-700 text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  {activeTab === "bookings" ? (
                    <>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="Paid">Paid Only</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 md:justify-end text-xs text-stone-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                <Sparkles size={12} />
                <span>3 Rotating Slideshow Banners • Live Storefront Sync</span>
              </span>
            </div>
          )}
        </div>

        {/* DATA TABLE VIEW */}
        {dataLoading ? (
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-12 text-center text-stone-500 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-[#0d4f3c]" />
            <p className="text-xs font-medium">Fetching real-time records from atelier database...</p>
          </div>
        ) : activeTab === "shiprocket-logs" ? (
          <ShiprocketLogsView
            onOpenConfigModal={() => setIsShiprocketConfigOpen(true)}
            onSelectOrder={(orderNum) => {
              setActiveTab("orders");
              setSearchQuery(orderNum);
            }}
          />
        ) : activeTab === "banners" ? (
          <AdminBannerManager showToast={showToast} />
        ) : activeTab === "products" ? (
          <AdminProductManager
            products={products}
            onProductUpdated={(updatedProd) => {
              setProducts((prev) => {
                const idx = prev.findIndex((p) => p.id === updatedProd.id);
                if (idx > -1) {
                  const next = [...prev];
                  next[idx] = updatedProd;
                  return next;
                }
                return [updatedProd, ...prev];
              });
            }}
            onProductDeleted={(deletedId) => {
              setProducts((prev) => prev.filter((p) => p.id !== deletedId));
            }}
            showToast={showToast}
          />
        ) : activeTab === "bookings" ? (
          /* =========================================================================
             TAB 1: ATELIER CONSULTATION BOOKINGS
             ========================================================================= */
          <div className="bg-white rounded-xl border border-[#e5ddd3] overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Atelier Consultation Appointments
                </h3>
                <p className="text-xs text-stone-500">
                  Showing {filteredBookings.length} of {bookings.length} recorded consultations
                </p>
              </div>
              <button
                onClick={() => {
                  setAddType("booking");
                  setIsAddModalOpen(true);
                }}
                className="text-xs text-[#0d4f3c] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>New Appointment</span>
              </button>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Calendar size={36} className="mx-auto text-stone-300" />
                <p className="text-sm font-serif font-medium text-stone-600">
                  No consultation bookings found matching your search.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="text-xs text-[#0d4f3c] underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#fcfaf7] border-b border-[#e5ddd3] text-[11px] uppercase tracking-wider text-stone-600 font-semibold">
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Patron Details</th>
                      <th className="py-3 px-4">Service & Slot</th>
                      <th className="py-3 px-4">Customer Notes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe3]">
                    {filteredBookings.map((booking) => {
                      const cleanPhone = booking.phone?.replace(/[^0-9]/g, "") || "";
                      const whatsappUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                        `Namaste ${booking.fullName}, this is House of Shriya Atelier regarding your ${booking.serviceType} appointment (${booking.bookingNumber}).`
                      )}`;

                      return (
                        <tr
                          key={booking.id || booking.bookingNumber}
                          className="hover:bg-[#faf7f2] transition-colors"
                        >
                          {/* Reference Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0d4f3c]">
                            <div className="flex items-center gap-1.5">
                              <span>{booking.bookingNumber}</span>
                              <button
                                onClick={() => handleCopy(booking.id, booking.bookingNumber)}
                                className="text-stone-400 hover:text-stone-600 p-0.5"
                                title="Copy booking number"
                              >
                                {copiedId === booking.id ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] font-sans font-normal text-stone-500 block">
                              {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </td>

                          {/* Patron Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-stone-900">{booking.fullName}</div>
                            <div className="text-stone-600 text-[11px]">{booking.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${booking.phone}`}
                                className="text-stone-500 hover:text-[#0d4f3c] inline-flex items-center gap-1 text-[11px]"
                              >
                                <Phone size={11} />
                                <span>{booking.phone}</span>
                              </a>
                              {cleanPhone && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 text-[10px] font-medium bg-emerald-50 px-1.5 py-0.5 rounded"
                                  title="Chat with client on WhatsApp"
                                >
                                  <MessageCircle size={10} />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Service & Slot */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block bg-[#0d4f3c]/10 text-[#0d4f3c] font-semibold text-[11px] px-2 py-0.5 rounded-full mb-1">
                              {booking.serviceType || "Atelier Session"}
                            </span>
                            <div className="flex items-center gap-1 text-stone-700 font-medium">
                              <Calendar size={12} className="text-stone-400" />
                              <span>{booking.preferredDate}</span>
                            </div>
                            <div className="flex items-center gap-1 text-stone-500 text-[11px]">
                              <Clock size={11} className="text-stone-400" />
                              <span>{booking.preferredTime}</span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-stone-600 line-clamp-2 italic text-[11px]">
                              {booking.notes || "No custom requests recorded."}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <select
                              value={booking.status || "confirmed"}
                              onChange={(e) =>
                                handleStatusChangeBooking(
                                  booking,
                                  e.target.value as "confirmed" | "pending" | "completed" | "cancelled"
                                )
                              }
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                                booking.status === "confirmed"
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  : booking.status === "completed"
                                  ? "bg-blue-50 border-blue-300 text-blue-800"
                                  : booking.status === "cancelled"
                                  ? "bg-red-50 border-red-300 text-red-700"
                                  : "bg-amber-50 border-amber-300 text-amber-800"
                              }`}
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteBooking(booking)}
                              className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete booking"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             TAB 2: COUTURE ENSEMBLE ORDERS & PURCHASES
             ========================================================================= */
          <div className="bg-white rounded-xl border border-[#e5ddd3] overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Couture Ensemble Orders & Client Purchases
                </h3>
                <p className="text-xs text-stone-500">
                  Showing {filteredOrders.length} of {orders.length} client orders
                </p>
              </div>
              <button
                onClick={() => {
                  setAddType("order");
                  setIsAddModalOpen(true);
                }}
                className="text-xs text-[#0d4f3c] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Customer Sale</span>
              </button>
            </div>

            {/* Shiprocket Automated Fulfillment Banner */}
            <div className="bg-stone-50 border-b border-[#e5ddd3] px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0d4f3c] text-[#d4af37] flex items-center justify-center shrink-0">
                  <Truck size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-xs text-stone-900">
                      Shiprocket Logistics Integration
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shiprocketStatus?.success
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${shiprocketStatus?.success ? "bg-emerald-600 animate-pulse" : "bg-amber-600"}`} />
                      {shiprocketStatus?.success ? "API Connected" : "API Key Loaded"}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    User: <span className="font-mono text-stone-700">{shiprocketStatus?.emailMasked || "shriya.pusha@sharepal.in"}</span> · Pickup Atelier: <span className="font-medium text-stone-700">{shiprocketPickupInput || "Primary"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={checkShiprocketConnection}
                  disabled={isCheckingShiprocket}
                  className="px-3 py-1 rounded-lg border border-[#e5ddd3] bg-white text-stone-700 text-xs font-semibold hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Test Shiprocket API Connection"
                >
                  <RefreshCw size={11} className={isCheckingShiprocket ? "animate-spin" : ""} />
                  <span>{isCheckingShiprocket ? "Testing..." : "Test Connection"}</span>
                </button>
                <button
                  onClick={() => setIsShiprocketConfigOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#0d4f3c] text-white text-xs font-semibold hover:bg-[#083528] flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings size={11} />
                  <span>API Settings</span>
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Package size={36} className="mx-auto text-stone-300" />
                <p className="text-sm font-serif font-medium text-stone-600">
                  No orders found matching your search.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="text-xs text-[#0d4f3c] underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#fcfaf7] border-b border-[#e5ddd3] text-[11px] uppercase tracking-wider text-stone-600 font-semibold">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Client & Address</th>
                      <th className="py-3 px-4">Items Ordered</th>
                      <th className="py-3 px-4">Amount & Payment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Shiprocket Fulfillment & Tracking</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe3]">
                    {filteredOrders.map((order) => {
                      const cleanPhone = order.customer?.phone?.replace(/[^0-9]/g, "") || "";
                      const whatsappUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                        `Namaste ${order.customer?.fullName}, House of Shriya Atelier here with an update regarding your heirloom order #${order.orderNumber}.`
                      )}`;

                      return (
                        <tr
                          key={order.id || order.orderNumber}
                          className="hover:bg-[#faf7f2] transition-colors"
                        >
                          {/* Order Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0d4f3c]">
                            <div className="flex items-center gap-1.5">
                              <span>{order.orderNumber}</span>
                              <button
                                onClick={() => handleCopy(order.id, order.orderNumber)}
                                className="text-stone-400 hover:text-stone-600 p-0.5"
                                title="Copy order number"
                              >
                                {copiedId === order.id ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] font-sans font-normal text-stone-500 block">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </td>

                          {/* Client Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-stone-900">
                              {order.customer?.fullName || "Patron"}
                            </div>
                            <div className="text-stone-600 text-[11px]">{order.customer?.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${order.customer?.phone}`}
                                className="text-stone-500 hover:text-[#0d4f3c] inline-flex items-center gap-1 text-[11px]"
                              >
                                <Phone size={11} />
                                <span>{order.customer?.phone}</span>
                              </a>
                              {cleanPhone && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 text-[10px] font-medium bg-emerald-50 px-1.5 py-0.5 rounded"
                                  title="WhatsApp client"
                                >
                                  <MessageCircle size={10} />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                            {order.shippingAddress && (
                              <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-1 truncate max-w-[200px]">
                                <MapPin size={10} className="shrink-0 text-stone-400" />
                                <span>
                                  {order.shippingAddress.city}, {order.shippingAddress.state}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Items Ordered */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d4f3c]" />
                                    <span className="font-medium text-stone-800 truncate">
                                      {item.productName}
                                    </span>
                                    <span className="text-stone-400">×{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-stone-400 text-[11px]">Custom Atelier Item</span>
                            )}
                          </td>

                          {/* Total & Payment */}
                          <td className="py-3.5 px-4">
                            <div className="font-serif font-bold text-sm text-[#0d4f3c]">
                              ₹{(order.total || 0).toLocaleString("en-IN")}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <select
                                value={order.paymentStatus || "Paid"}
                                onChange={(e) =>
                                  handlePaymentStatusChange(order, e.target.value as PaymentStatus)
                                }
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                                  order.paymentStatus === "Paid"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                    : "bg-amber-50 border-amber-300 text-amber-800"
                                }`}
                              >
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                                <option value="Refunded">Refunded</option>
                              </select>
                            </div>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              {order.paymentMethod || "UPI"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <select
                              value={order.orderStatus || "confirmed"}
                              onChange={(e) =>
                                handleOrderStatusChange(order, e.target.value as OrderStatus)
                              }
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                                order.orderStatus === "delivered"
                                  ? "bg-blue-50 border-blue-300 text-blue-800"
                                  : order.orderStatus === "shipped"
                                  ? "bg-purple-50 border-purple-300 text-purple-800"
                                  : order.orderStatus === "confirmed"
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  : order.orderStatus === "cancelled"
                                  ? "bg-red-50 border-red-300 text-red-700"
                                  : "bg-amber-50 border-amber-300 text-amber-800"
                              }`}
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="pending">Pending</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Shiprocket Fulfillment & Tracking */}
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <ShipmentStatusBadge
                                  order={order}
                                  onViewLogs={() => {
                                    setActiveTab("shiprocket-logs");
                                    setSearchQuery(order.orderNumber);
                                  }}
                                />
                                {order.trackingCourier && (
                                  <span className="text-[10px] text-stone-500 font-medium">
                                    {order.trackingCourier}
                                  </span>
                                )}
                              </div>

                              {order.trackingNumber && (
                                <div className="flex items-center gap-1 font-mono text-[10px] text-stone-600 bg-[#f4efe8] px-2 py-1 rounded w-fit">
                                  <Truck size={10} className="text-stone-500" />
                                  <span>AWB: {order.trackingNumber}</span>
                                  <button
                                    onClick={() => handleCopy(`awb-${order.id}`, order.trackingNumber!)}
                                    className="text-stone-400 hover:text-stone-700 ml-1 cursor-pointer"
                                    title="Copy AWB"
                                  >
                                    {copiedId === `awb-${order.id}` ? (
                                      <Check size={10} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={10} />
                                    )}
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-0.5">
                                {order.shiprocketOrderId || order.trackingNumber ? (
                                  <button
                                    onClick={() => handleOpenTracking(order)}
                                    className="text-[11px] text-[#0d4f3c] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Navigation size={11} />
                                    <span>Live Tracking Timeline</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handlePushToShiprocket(order)}
                                    disabled={syncingOrderId === order.id}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {syncingOrderId === order.id ? (
                                      <>
                                        <RefreshCw size={11} className="animate-spin" />
                                        <span>Pushing to Shiprocket...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Truck size={11} className="text-emerald-700" />
                                        <span>Push to Shiprocket</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab("shiprocket-logs");
                                    setSearchQuery(order.orderNumber);
                                  }}
                                  className="text-[10px] text-stone-400 hover:text-stone-700 underline flex items-center gap-0.5 cursor-pointer ml-auto"
                                  title="View API Logs for this Order"
                                >
                                  <span>Logs</span>
                                </button>
                              </div>

                              {order.shiprocketError && !order.shiprocketOrderId && (
                                <p className="text-[10px] text-rose-700 max-w-[200px] truncate" title={order.shiprocketError}>
                                  {order.shiprocketError}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete order record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: ADD NEW BOOKING / DIRECT CUSTOMER BUY (ADMIN END)
          ========================================================================= */}
      {isAddModalOpen && (
        <AddNewRecordModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          type={addType}
          setType={setAddType}
          products={products}
          onBookingCreated={(newB) => {
            setBookings((prev) => [newB, ...prev]);
            showToast(`Atelier appointment ${newB.bookingNumber} created successfully!`);
          }}
          onOrderCreated={(newO) => {
            setOrders((prev) => [newO, ...prev]);
            showToast(`Couture order ${newO.orderNumber} booked successfully!`);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT BOUTIQUE PRODUCT (CATALOG)
          ========================================================================= */}
      {isProductModalOpen && (
        <AddProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={(newProd) => {
            setProducts((prev) => {
              const idx = prev.findIndex((p) => p.id === newProd.id);
              if (idx > -1) {
                const next = [...prev];
                next[idx] = newProd;
                return next;
              }
              return [newProd, ...prev];
            });
            showToast(`Product "${newProd.name}" added to boutique catalog successfully!`);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: LIVE SHIPROCKET TRACKING
          ========================================================================= */}
      {trackingOrder && (
        <ShiprocketTrackingModal
          isOpen={Boolean(trackingOrder)}
          onClose={() => setTrackingOrder(null)}
          order={trackingOrder}
          trackingData={trackingData}
          isLoading={isLoadingTracking}
          onRefresh={() => handleOpenTracking(trackingOrder)}
        />
      )}

      {/* =========================================================================
          MODAL: SHIPROCKET CONFIGURATION & API SETTINGS
          ========================================================================= */}
      {isShiprocketConfigOpen && (
        <ShiprocketConfigModal
          isOpen={isShiprocketConfigOpen}
          onClose={() => setIsShiprocketConfigOpen(false)}
          emailInput={shiprocketEmailInput}
          setEmailInput={setShiprocketEmailInput}
          pickupInput={shiprocketPickupInput}
          setPickupInput={setShiprocketPickupInput}
          passwordInput={shiprocketPasswordInput}
          setPasswordInput={setShiprocketPasswordInput}
          onSave={handleSaveShiprocketConfig}
          status={shiprocketStatus}
        />
      )}
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: ADD NEW BOOKING OR CUSTOMER ORDER (ADMIN CREATION MODAL)
   ========================================================================= */
interface AddNewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "booking" | "order";
  setType: (t: "booking" | "order") => void;
  products: any[];
  onBookingCreated: (b: AtelierBooking) => void;
  onOrderCreated: (o: Order) => void;
}

function AddNewRecordModal({
  isOpen,
  onClose,
  type,
  setType,
  products,
  onBookingCreated,
  onOrderCreated,
}: AddNewRecordModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - Customer Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Booking specific fields
  const [serviceType, setServiceType] = useState("Bespoke Bridal Consultation");
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [preferredTime, setPreferredTime] = useState("11:00 AM - 12:30 PM");
  const [bookingNotes, setBookingNotes] = useState("");

  // Order specific fields (Customer Buy from Admin End)
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(4999);
  const [quantity, setQuantity] = useState<number>(1);
  const [addressLine1, setAddressLine1] = useState("Direct Atelier Pickup");
  const [city, setCity] = useState("Ludhiana");
  const [state, setState] = useState("Punjab");
  const [pincode, setPincode] = useState("141001");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Instant UPI / NetBanking");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Paid");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("confirmed");
  const [orderNotes, setOrderNotes] = useState("Direct walk-in / admin end booking");

  // When product selection changes, update item name & price
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    if (prodId === "custom") {
      setCustomItemName("Custom Tailored Heirloom Suit");
      setUnitPrice(5999);
      return;
    }
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setCustomItemName(found.name);
      const parsedPrice = parseInt(found.price.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        setUnitPrice(parsedPrice);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (type === "booking") {
        const newBooking = await adminCreateAtelierBooking({
          fullName: fullName.trim() || "Valued Patron",
          email: email.trim().toLowerCase() || "atelier.client@houseofshriya.in",
          phone: phone.trim() || "9501698356",
          serviceType,
          preferredDate,
          preferredTime,
          notes: bookingNotes.trim() || "Booked by Admin Concierge",
          status: "confirmed",
        });
        onBookingCreated(newBooking);
      } else {
        // Direct Customer Sale / Order
        const calculatedTotal = unitPrice * quantity;
        const selectedProd = products.find((p) => p.id === selectedProductId);

        const newOrder = await adminCreateOrder({
          customer: {
            fullName: fullName.trim() || "Direct Patron",
            email: email.trim().toLowerCase() || "patron@houseofshriya.in",
            phone: phone.trim() || "9501698356",
          },
          shippingAddress: {
            addressLine1: addressLine1.trim() || "Direct Atelier Pickup",
            city: city.trim() || "Ludhiana",
            state: state.trim() || "Punjab",
            pincode: pincode.trim() || "141001",
          },
          items: [
            {
              productId: selectedProd?.id || `custom_${Date.now()}`,
              productName: customItemName || selectedProd?.name || "Bespoke Silk Ensemble",
              productImage:
                selectedProd?.image ||
                "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600",
              color: selectedProd?.color || "Custom Royal Shade",
              size: "Unstitched 3-Piece Ensemble",
              unitPrice: unitPrice,
              quantity: quantity,
              totalPrice: calculatedTotal,
            },
          ],
          subtotal: calculatedTotal,
          shippingFee: 0,
          total: calculatedTotal,
          paymentMethod,
          paymentStatus,
          orderStatus,
          notes: orderNotes.trim(),
        });
        onOrderCreated(newOrder);
      }
      onClose();
    } catch (err) {
      console.error("Error creating record:", err);
      alert("Failed to save booking. Please check details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="add-new-booking-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f5] w-full max-w-xl rounded-2xl shadow-2xl border border-[#e8dfd5] overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0d4f3c] text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#d4af37] font-mono uppercase tracking-wider mb-0.5">
              <Sparkles size={12} />
              <span>Admin Concierge Desk</span>
            </div>
            <h2 className="text-lg font-serif font-bold">
              {type === "order" ? "Create Customer Order & Buy" : "Book Atelier Appointment"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="flex border-b border-[#e8dfd5] bg-[#f2ece4] shrink-0">
          <button
            type="button"
            onClick={() => setType("order")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              type === "order"
                ? "bg-[#faf8f5] text-[#0d4f3c] border-b-2 border-[#0d4f3c]"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Package size={14} />
            <span>Direct Customer Purchase</span>
          </button>
          <button
            type="button"
            onClick={() => setType("booking")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              type === "booking"
                ? "bg-[#faf8f5] text-[#0d4f3c] border-b-2 border-[#0d4f3c]"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar size={14} />
            <span>Atelier Session Booking</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Section: Patron Info */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#1e1b18] mb-2 flex items-center gap-1.5">
              <User size={14} className="text-[#0d4f3c]" />
              <span>Client Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mrs. Ananya Sharma"
                  className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Mobile / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9501698356"
                  className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@gmail.com"
                  className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Conditional: Order specifics vs Booking specifics */}
          {type === "order" ? (
            <>
              {/* Product & Payment Selection */}
              <div className="pt-2 border-t border-[#e8dfd5]">
                <h4 className="font-serif font-bold text-sm text-[#1e1b18] mb-2 flex items-center gap-1.5">
                  <Package size={14} className="text-[#0d4f3c]" />
                  <span>Ensemble & Purchase Details</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Select Item from Catalog or Bespoke
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose catalog ensemble or bespoke --</option>
                      <option value="custom">✨ Custom Bespoke Suit / Saree Creation</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-stone-700 mb-1">
                        Item Description / Fabric Name
                      </label>
                      <input
                        type="text"
                        required
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="e.g. Pure Georgette Zardozi Suit Set"
                        className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Price (₹ INR)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                        className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quantity & Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer"
                      >
                        <option value="Instant UPI / NetBanking">Instant UPI (GPay/PhonePe)</option>
                        <option value="Credit/Debit Card">Card at Atelier</option>
                        <option value="Cash on Delivery (COD)">Cash on Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer font-semibold"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending Payment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Order Status</label>
                      <select
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                        className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer font-semibold"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Dispatched / Shipped</option>
                        <option value="delivered">Delivered / Picked Up</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="pt-2 border-t border-[#e8dfd5]">
                <h4 className="font-serif font-bold text-sm text-[#1e1b18] mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#0d4f3c]" />
                  <span>Delivery Address / Store Pickup</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-stone-700 mb-1">
                      Street Address or Pickup Notes
                    </label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. Model Town or Handed in-person at Atelier"
                      className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Booking Specifics */
            <div className="pt-2 border-t border-[#e8dfd5] space-y-3">
              <h4 className="font-serif font-bold text-sm text-[#1e1b18] mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#0d4f3c]" />
                <span>Appointment Schedule & Service</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Atelier Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="Bespoke Bridal Consultation">Bespoke Bridal Consultation</option>
                    <option value="Silk Trousseau Curation">Silk Trousseau Curation</option>
                    <option value="Private In-Person Fitting">Private In-Person Fitting</option>
                    <option value="Virtual Video Styling Session">Virtual Video Styling Session</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Time Slot</label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none cursor-pointer"
                  >
                    <option value="11:00 AM - 12:30 PM">11:00 AM - 12:30 PM (Morning)</option>
                    <option value="02:00 PM - 03:30 PM">02:00 PM - 03:30 PM (Afternoon)</option>
                    <option value="04:30 PM - 06:00 PM">04:30 PM - 06:00 PM (Evening)</option>
                    <option value="06:30 PM - 08:00 PM">06:30 PM - 08:00 PM (Late Sunset)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Atelier Notes / Client Requests
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Looking for pure tissue silk suit in pastel peach for wedding reception..."
                  className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 focus:border-[#0d4f3c] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3 border-t border-[#e8dfd5] flex items-center justify-between">
            <div className="text-stone-500 font-serif">
              {type === "order" && (
                <span>
                  Total Payable:{" "}
                  <strong className="text-[#0d4f3c] text-sm">
                    ₹{(unitPrice * quantity).toLocaleString("en-IN")}
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#0d4f3c] hover:bg-[#083528] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                {submitting
                  ? "Recording..."
                  : type === "order"
                  ? "Confirm & Save Order"
                  : "Confirm Appointment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
