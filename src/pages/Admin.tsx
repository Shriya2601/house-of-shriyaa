import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Crown,
  ShoppingBag,
  Package,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  Search,
  Check,
  X,
  AlertCircle,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  LogOut,
  UserCheck,
  Lock,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Printer,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Sliders,
  FileText,
  Save,
  ChevronRight,
  Shield,
  ArrowLeft,
  Menu,
  Key,
  Upload,
  Copy,
  Palette,
  ArrowRight,
  Star,
  Camera,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import {
  Product,
  ColorVariant,
  Order,
  OrderStatus,
  CategoryItem,
  SiteContent,
  HeroSlide,
  FeatureItem,
  NavItem,
} from "../types";
import {
  subscribeOrders,
  updateOrderStatus,
  updateOrderNotes,
  deleteOrder,
  subscribeProducts,
  saveProduct,
  deleteProduct,
  ensureProductVariants,
  subscribeCategories,
  saveCategory,
  deleteCategory,
  subscribeSiteContent,
  saveSiteContent,
  adminSignIn,
  adminSignUp,
  adminSignOut,
  adminResetPassword,
  adminConfirmResetPassword,
  subscribeAuthState,
  verifyAdminLogin,
  checkAdminSession,
  changeAdminCredentials,
  getStoredAdminSession,
  setStoredAdminSession,
  clearStoredAdminSession,
  defaultSiteContent,
} from "../services/storeService";
import { User } from "firebase/auth";
import { ProductImageUploader } from "../components/admin/ProductImageUploader";
import { UserAccountsManager } from "../components/admin/UserAccountsManager";
import { MediaManager } from "../components/admin/MediaManager";
import { optimizeImageFile, persistAssetToFirestore } from "../services/imageUploadService";

export default function Admin() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminSession, setAdminSession] = useState<{ authenticated: boolean; username: string } | null>(() =>
    getStoredAdminSession()
  );
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation tabs in Admin
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "products" | "colors" | "categories" | "media" | "users" | "banners" | "content" | "settings"
  >("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth form states
  const [searchParams, setSearchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<"signin" | "setup" | "reset" | "confirm_reset">("signin");
  const [authUsername, setAuthUsername] = useState("House of Shriya");
  const [authPassword, setAuthPassword] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [resetTokenParam, setResetTokenParam] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Auto-detect resetToken / oobCode in URL
  useEffect(() => {
    const tokenFromUrl =
      searchParams.get("resetToken") ||
      searchParams.get("token") ||
      searchParams.get("oobCode") ||
      searchParams.get("code") ||
      searchParams.get("resetCode");
    const emailFromUrl = searchParams.get("email");
    const modeFromUrl = searchParams.get("mode");

    if (tokenFromUrl || modeFromUrl === "resetPassword" || modeFromUrl === "confirm_reset") {
      if (tokenFromUrl) setResetTokenParam(tokenFromUrl);
      if (emailFromUrl) setAuthEmail(emailFromUrl);
      setAuthMode("confirm_reset");
      setAuthSuccess(
        tokenFromUrl
          ? "Reset code/token detected. Please enter your new administrator password below."
          : "Please enter your security code/token and new administrator password below."
      );
      setAuthError("");
    }
  }, [searchParams]);

  // Credentials management in Settings tab
  const [credCurrentPassword, setCredCurrentPassword] = useState("");
  const [credNewUsername, setCredNewUsername] = useState("");
  const [credNewPassword, setCredNewPassword] = useState("");
  const [credConfirmPassword, setCredConfirmPassword] = useState("");
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credMessage, setCredMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Navigation links CMS
  const [newNavLabel, setNewNavLabel] = useState("");
  const [newNavHref, setNewNavHref] = useState("");

  // Core Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);

  // Orders sub-tab: Real Customer Orders vs Test Orders
  const [ordersMode, setOrdersMode] = useState<"real" | "test">("real");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [courierInput, setCourierInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  // Product Editing / Adding Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productSaveSuccess, setProductSaveSuccess] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [categoryNotice, setCategoryNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dedicated Color Palette Option & Studio States
  const [selectedPaletteProductId, setSelectedPaletteProductId] = useState<string>("");
  const [selectedPaletteVariantIndex, setSelectedPaletteVariantIndex] = useState<number>(0);
  const [paletteSaving, setPaletteSaving] = useState(false);
  const [paletteSaveNotice, setPaletteSaveNotice] = useState<string | null>(null);
  const [paletteSearchQuery, setPaletteSearchQuery] = useState("");

  // Category Editing
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  // CMS Content Saving status
  const [cmsSaving, setCmsSaving] = useState(false);
  const [cmsSaveNotice, setCmsSaveNotice] = useState("");

  const isAuthenticated = Boolean(adminSession?.authenticated);
  const currentAdminName = adminSession?.username || "House of Shriya";

  // Validate active admin session with backend on mount
  useEffect(() => {
    const session = getStoredAdminSession();
    if (session?.authenticated && session.token) {
      checkAdminSession().then((res) => {
        if (!res.valid) {
          setAdminSession(null);
        } else if (res.username) {
          setAdminSession({ authenticated: true, username: res.username });
        }
      });
    } else {
      setAdminSession(null);
    }
  }, []);

  // Listen to Auth
  useEffect(() => {
    const unsub = subscribeAuthState((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen to Real-Time Data when logged in
  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen to orders
    const unsubOrders = subscribeOrders((allOrders) => {
      setOrders(allOrders);
    }, true); // includeTest=true so we can isolate into real vs test tabs

    // Listen to products
    const unsubProducts = subscribeProducts((prods) => {
      setProducts(prods);
    });

    // Listen to categories
    const unsubCategories = subscribeCategories((cats) => {
      setCategories(cats);
    });

    // Listen to site content
    const unsubContent = subscribeSiteContent((content) => {
      setSiteContent(content);
    });

    // Listen to real-time custom deletion events
    const handleProdDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) setProducts((prev) => prev.filter((p) => p.id !== deletedId));
    };
    const handleCatDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) setCategories((prev) => prev.filter((c) => c.id !== deletedId));
    };
    window.addEventListener("hos-product-deleted", handleProdDeleted);
    window.addEventListener("hos-category-deleted", handleCatDeleted);

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCategories();
      unsubContent();
      window.removeEventListener("hos-product-deleted", handleProdDeleted);
      window.removeEventListener("hos-category-deleted", handleCatDeleted);
    };
  }, [isAuthenticated]);

  // Auth Handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthSubmitting(true);
    try {
      // Direct backend verification against server environment variable
      const verified = await verifyAdminLogin(authUsername, authPassword);
      if (verified.success) {
        const verifiedName = verified.username || "House of Shriya";
        setAdminSession({ authenticated: true, username: verifiedName });
        setAuthSuccess("Authentication verified. Entering dashboard...");
        setAuthPassword(""); // Clear password from component memory
        return;
      }

      setAuthError(verified.error || "Invalid username or password. Access denied.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify credentials.";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthSubmitting(true);
    try {
      await adminSignUp(authEmail, authPassword, authDisplayName || "Atelier Owner");
      setAuthSuccess("Admin account established successfully! Welcome to House of Shriya CMS.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to establish admin. Please verify email and password length (min 6 chars).";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!authEmail.trim()) {
      setAuthError("Please enter your registered email address.");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await adminResetPassword(authEmail);
      if (res.success) {
        setAuthSuccess(res.message || `Password reset instructions sent to ${authEmail}. Check your inbox.`);
      } else {
        setAuthError(res.error || "Failed to dispatch reset email. Please ensure email credentials are configured.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process reset request.";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!resetTokenParam.trim()) {
      setAuthError("Please enter your 8-character code or reset link token.");
      return;
    }
    if (!newResetPassword || newResetPassword.length < 6) {
      setAuthError("New password must be at least 6 characters long.");
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setAuthError("New passwords do not match. Please re-enter.");
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await adminConfirmResetPassword(resetTokenParam, newResetPassword, authEmail);
      if (res.success) {
        // Attempt automatic login with the newly confirmed password
        try {
          const autoLogin = await verifyAdminLogin(authUsername || authEmail || "House of Shriya", newResetPassword);
          if (autoLogin.success) {
            setAdminSession({ authenticated: true, username: autoLogin.username || "House of Shriya" });
            setAuthSuccess("Password updated and verified! Welcome to the administrator portal.");
            setAuthPassword("");
            setResetTokenParam("");
            setNewResetPassword("");
            setConfirmResetPassword("");
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
              setSearchParams({});
            } catch {}
            return;
          }
        } catch {}

        setAuthSuccess(res.message || "Password updated successfully! Please sign in with your new permanent password.");
        setAuthMode("signin");
        setAuthPassword(newResetPassword);
        setResetTokenParam("");
        setNewResetPassword("");
        setConfirmResetPassword("");
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
          setSearchParams({});
        } catch {}
      } else {
        setAuthError(res.error || "Failed to update password. Code may be expired or already used.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm password reset.";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredMessage(null);
    if (!credNewUsername.trim() || credNewUsername.trim().length < 3) {
      setCredMessage({ type: "error", text: "New username must be at least 3 characters long." });
      return;
    }
    if (!credNewPassword || credNewPassword.length < 6) {
      setCredMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (credNewPassword !== credConfirmPassword) {
      setCredMessage({ type: "error", text: "New passwords do not match. Please re-enter." });
      return;
    }
    setCredSubmitting(true);
    try {
      const res = await changeAdminCredentials(credCurrentPassword, credNewUsername, credNewPassword);
      if (res.success) {
        setCredMessage({
          type: "success",
          text: `Credentials updated successfully! Active username is now "${credNewUsername.trim()}". Please use this new password for future logins.`,
        });
        setAdminSession({ authenticated: true, username: credNewUsername.trim() });
        setCredCurrentPassword("");
        setCredNewPassword("");
        setCredConfirmPassword("");
      } else {
        setCredMessage({ type: "error", text: res.error || "Failed to update credentials in database." });
      }
    } catch (err: unknown) {
      setCredMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update credentials in database.",
      });
    } finally {
      setCredSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    clearStoredAdminSession();
    setAdminSession(null);
    try {
      await adminSignOut();
    } catch {
      // non-blocking
    }
    setSelectedOrder(null);
  };

  // Orders Calculations (Separating Real vs Test Orders)
  const realOrders = useMemo(() => orders.filter((o) => !o.isTest), [orders]);
  const testOrders = useMemo(() => orders.filter((o) => Boolean(o.isTest)), [orders]);

  const displayedOrders = useMemo(() => {
    const list = ordersMode === "real" ? realOrders : testOrders;
    return list.filter((order) => {
      // Filter by status
      if (orderStatusFilter !== "all" && order.orderStatus !== orderStatusFilter) {
        return false;
      }
      // Search
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchNumber = order.orderNumber.toLowerCase().includes(q);
        const matchName = order.customer.fullName.toLowerCase().includes(q);
        const matchPhone = order.customer.phone.includes(q);
        const matchCity = order.shippingAddress.city.toLowerCase().includes(q);
        return matchNumber || matchName || matchPhone || matchCity;
      }
      return true;
    });
  }, [ordersMode, realOrders, testOrders, orderStatusFilter, orderSearchQuery]);

  // Statistics
  const totalRevenue = useMemo(() => {
    return realOrders.reduce((acc, o) => {
      if (o.orderStatus !== "cancelled") return acc + (o.total || 0);
      return acc;
    }, 0);
  }, [realOrders]);

  const pendingFulfillments = useMemo(() => {
    return realOrders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "confirmed").length;
  }, [realOrders]);

  // Handle Order Status Changes
  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!selectedOrder) return;
    setIsUpdatingOrder(true);
    try {
      await updateOrderStatus(selectedOrder.id, status, courierInput, trackingInput);
      setSelectedOrder((prev) => prev ? { ...prev, orderStatus: status, trackingCourier: courierInput, trackingNumber: trackingInput } : null);
    } catch (err) {
      console.error("Order status update failure:", err);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleSaveOrderNotes = async () => {
    if (!selectedOrder) return;
    try {
      await updateOrderNotes(selectedOrder.id, notesInput);
      setSelectedOrder((prev) => prev ? { ...prev, notes: notesInput } : null);
    } catch (err) {
      console.error("Failed to save order notes:", err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this order record?")) return;
    try {
      await deleteOrder(orderId);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (err) {
      console.error("Order deletion error:", err);
    }
  };

  // Select Order for Drawer
  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setCourierInput(order.trackingCourier || "");
    setTrackingInput(order.trackingNumber || "");
    setNotesInput(order.notes || "");
  };

  // Product Saving with Independent Color Variant Management
  const handleOpenProductModal = (product?: Product) => {
    setActiveVariantIndex(0);
    if (product) {
      const normalized = ensureProductVariants(product);
      setEditingProduct(normalized);
    } else {
      const newId = `hos-${Date.now()}`;
      const defaultVariant: ColorVariant = {
        id: `var-${newId}-0`,
        colorName: "Royal Emerald",
        colorHex: "#0d4f3c",
        price: "₹2,999",
        originalPrice: "₹4,499",
        savings: "Save 33%",
        description: "Handcrafted pure fabric with intricate artisanal border detailing.",
        fabricType: "Pure Chanderi Silk",
        images: [],
        image: "",
        hoverImage: "",
        inStock: true,
      };

      setEditingProduct({
        id: newId,
        name: "",
        category: categories[0]?.name || "Cotton Suits",
        fabricType: "Pure Chanderi Silk",
        color: "Royal Emerald",
        colorHex: "#0d4f3c",
        price: "₹2,999",
        originalPrice: "₹4,499",
        savings: "Save 33%",
        description: "Handcrafted pure fabric with intricate artisanal border detailing.",
        badges: ["New Drop"],
        image: "",
        hoverImage: "",
        images: [],
        inStock: true,
        sizes: ["Unstitched Suit"],
        colorVariants: [defaultVariant],
      });
    }
    setIsProductModalOpen(true);
  };

  const activeVariant: ColorVariant | undefined = useMemo(() => {
    if (!editingProduct?.colorVariants || editingProduct.colorVariants.length === 0) return undefined;
    const safeIdx = Math.min(activeVariantIndex, editingProduct.colorVariants.length - 1);
    return editingProduct.colorVariants[safeIdx] || editingProduct.colorVariants[0];
  }, [editingProduct?.colorVariants, activeVariantIndex]);

  const updateActiveVariant = (updates: Partial<ColorVariant>) => {
    if (!editingProduct || !editingProduct.colorVariants) return;
    const currentVariants = [...editingProduct.colorVariants];
    const idx = Math.min(activeVariantIndex, currentVariants.length - 1);
    if (idx < 0) return;

    const existing = currentVariants[idx];
    const updated: ColorVariant = {
      ...existing,
      ...updates,
    };
    currentVariants[idx] = updated;

    // If this is variant 0 (the primary edition), also sync with top-level fields for backwards-compatibility
    const topLevelSync: Partial<Product> = idx === 0 ? {
      color: updated.colorName,
      colorHex: updated.colorHex,
      price: updated.price,
      originalPrice: updated.originalPrice,
      savings: updated.savings,
      fabricType: updated.fabricType,
      description: updated.description,
      inStock: updated.inStock,
      images: updated.images,
      image: updated.images?.[0] || updated.image || "",
      hoverImage: updated.images?.[1] || updated.hoverImage || updated.images?.[0] || "",
    } : {};

    setEditingProduct({
      ...editingProduct,
      ...topLevelSync,
      colorVariants: currentVariants,
    });
  };

  const handleAddVariant = () => {
    if (!editingProduct) return;
    const current = editingProduct.colorVariants || [];
    const newIdx = current.length;
    const newVariant: ColorVariant = {
      id: `var-${editingProduct.id || "prod"}-${newIdx}-${Date.now()}`,
      colorName: `New Color Edition ${newIdx + 1}`,
      colorHex: "#c5a059",
      price: editingProduct.price || "₹2,999",
      originalPrice: editingProduct.originalPrice || "₹4,499",
      savings: editingProduct.savings || "Save 30%",
      description: editingProduct.description || "",
      fabricType: editingProduct.fabricType || "Pure Handloom",
      images: [],
      image: "",
      hoverImage: "",
      inStock: true,
    };
    const updatedVariants = [...current, newVariant];
    setEditingProduct({
      ...editingProduct,
      colorVariants: updatedVariants,
    });
    setActiveVariantIndex(newIdx);
  };

  const handleDuplicateVariant = (idx: number) => {
    if (!editingProduct || !editingProduct.colorVariants) return;
    const target = editingProduct.colorVariants[idx];
    if (!target) return;

    const newIdx = editingProduct.colorVariants.length;
    const cloned: ColorVariant = {
      ...target,
      id: `var-${editingProduct.id || "prod"}-${newIdx}-${Date.now()}`,
      colorName: `${target.colorName} (Copy)`,
      images: [...(target.images || [])],
    };

    setEditingProduct({
      ...editingProduct,
      colorVariants: [...editingProduct.colorVariants, cloned],
    });
    setActiveVariantIndex(newIdx);
  };

  const handleRemoveVariant = (idx: number) => {
    if (!editingProduct || !editingProduct.colorVariants || editingProduct.colorVariants.length <= 1) {
      alert("A product must have at least one color edition.");
      return;
    }
    const variantToRemove = editingProduct.colorVariants[idx];
    if (!window.confirm(`Are you sure you want to remove the "${variantToRemove.colorName}" color edition?`)) {
      return;
    }

    const filtered = editingProduct.colorVariants.filter((_, i) => i !== idx);
    const newActiveIdx = Math.max(0, Math.min(activeVariantIndex, filtered.length - 1));

    // If we removed the primary variant (0), sync the new primary to top-level
    const primary = filtered[0];
    setEditingProduct({
      ...editingProduct,
      color: primary.colorName,
      colorHex: primary.colorHex,
      price: primary.price,
      originalPrice: primary.originalPrice,
      savings: primary.savings,
      fabricType: primary.fabricType,
      description: primary.description,
      inStock: primary.inStock,
      images: primary.images,
      image: primary.images?.[0] || primary.image || "",
      hoverImage: primary.images?.[1] || primary.hoverImage || primary.images?.[0] || "",
      colorVariants: filtered,
    });
    setActiveVariantIndex(newActiveIdx);
  };

  const handleMoveVariant = (idx: number, direction: "left" | "right") => {
    if (!editingProduct?.colorVariants) return;
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editingProduct.colorVariants.length) return;

    const list = [...editingProduct.colorVariants];
    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);

    const primary = list[0];
    setEditingProduct({
      ...editingProduct,
      color: primary.colorName,
      colorHex: primary.colorHex,
      price: primary.price,
      originalPrice: primary.originalPrice,
      savings: primary.savings,
      fabricType: primary.fabricType,
      description: primary.description,
      inStock: primary.inStock,
      images: primary.images,
      image: primary.images?.[0] || primary.image || "",
      hoverImage: primary.images?.[1] || primary.hoverImage || primary.images?.[0] || "",
      colorVariants: list,
    });
    setActiveVariantIndex(targetIdx);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    if (!editingProduct || !editingProduct.name?.trim()) {
      setProductFormError("Please enter a product title.");
      return;
    }

    const variants = editingProduct.colorVariants || [];
    if (variants.length === 0) {
      setProductFormError("Please add at least one color edition for this product.");
      return;
    }

    // Check that every variant has a color name
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].colorName?.trim()) {
        setProductFormError(`Color variant #${i + 1} needs a valid color name.`);
        setActiveVariantIndex(i);
        return;
      }
    }

    // Check that at least one variant has at least one image
    const hasAnyImage =
      variants.some((v) => (v.images && v.images.length > 0) || v.image) ||
      (editingProduct.images && editingProduct.images.length > 0) ||
      editingProduct.image;
    if (!hasAnyImage) {
      setProductFormError("Please upload at least one image from your device for this suit piece.");
      return;
    }

    setSavingProduct(true);
    try {
      // Find first variant with images if primary variant has none
      const variantWithImages = variants.find((v) => (v.images && v.images.length > 0) || v.image);
      const fallbackImages = variantWithImages?.images?.length
        ? variantWithImages.images
        : editingProduct.images || [];

      // Normalize all variants so each has complete image arrays
      const normalizedVariants = variants.map((v) => {
        const vImages = v.images && v.images.length > 0 ? v.images : (v.image ? [v.image] : fallbackImages);
        const vImg = vImages[0] || v.image || "";
        const vHover = vImages[1] || v.hoverImage || vImg;
        return {
          ...v,
          images: vImages,
          image: vImg,
          hoverImage: vHover,
        };
      });

      const primary = normalizedVariants[0];
      const primaryImages = primary.images?.length ? primary.images : fallbackImages;
      const primaryImage = primaryImages[0] || primary.image || editingProduct.image || "";
      const primaryHover = primaryImages[1] || primary.hoverImage || primaryImage;

      const productToSave: Product = {
        ...editingProduct,
        id: editingProduct.id || `hos-${Date.now()}`,
        name: editingProduct.name.trim(),
        category: editingProduct.category || categories[0]?.name || "Cotton Suits",
        fabricType: primary.fabricType || editingProduct.fabricType || "Pure Handloom",
        color: primary.colorName || editingProduct.color || "Standard Edition",
        colorHex: primary.colorHex || editingProduct.colorHex || "#0d4f3c",
        price: primary.price || editingProduct.price || "₹2,999",
        originalPrice: primary.originalPrice || editingProduct.originalPrice || "₹4,499",
        savings: primary.savings || editingProduct.savings || "Save 30%",
        description: primary.description !== undefined ? primary.description : editingProduct.description || "",
        image: primaryImage,
        hoverImage: primaryHover,
        images: primaryImages,
        inStock: primary.inStock !== false && editingProduct.inStock !== false,
        colorVariants: normalizedVariants,
      } as Product;

      const saveRes = await saveProduct(productToSave);

      // Instantly update products state so table and storefront reflect changes immediately
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === productToSave.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = productToSave;
          return updated;
        }
        return [productToSave, ...prev];
      });

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductFormError(null);
      const noticeSuffix = saveRes?.firestoreNotice ? ` (${saveRes.firestoreNotice})` : "";
      setProductSaveSuccess(
        `Product "${productToSave.name}" & all ${productToSave.colorVariants?.length || 1} color editions saved & published live to boutique! ✓${noticeSuffix}`
      );
      setTimeout(() => setProductSaveSuccess(null), 6000);
    } catch (err: any) {
      console.error("Product save failure:", err);
      setProductFormError(err?.message || "Could not save product to database. Please check your network and try again.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const targetProduct = products.find((p) => p.id === id);
    const prodName = targetProduct ? `"${targetProduct.name}"` : "this product";
    if (!window.confirm(`Are you sure you want to permanently delete ${prodName} from the live boutique?`)) return;

    const previousProducts = [...products];
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      const associatedUploads: string[] = [];
      if (targetProduct) {
        const collectUpload = (url?: string) => {
          if (url && typeof url === "string" && (url.startsWith("/uploads/") || url.includes("/uploads/"))) {
            associatedUploads.push(url);
          }
        };
        (targetProduct.images || []).forEach(collectUpload);
        collectUpload(targetProduct.image);
        collectUpload(targetProduct.hoverImage);
        (targetProduct.colorVariants || []).forEach((v) => {
          (v.images || []).forEach(collectUpload);
          collectUpload(v.image);
          collectUpload(v.hoverImage);
        });
      }

      await deleteProduct(id, associatedUploads);
      setProductSaveSuccess(`Product ${prodName} deleted permanently from live boutique. ✓`);
      setTimeout(() => setProductSaveSuccess(null), 4000);
    } catch (err: any) {
      console.error("Product deletion failure:", err);
      // Revert optimistic delete on error
      setProducts(previousProducts);
      alert(`Could not delete product: ${err?.message || "Server error"}`);
    }
  };

  const handleToggleProductStock = async (product: Product) => {
    const nextStock = !product.inStock;
    const updatedProduct = { ...product, inStock: nextStock };
    try {
      await saveProduct(updatedProduct);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updatedProduct : p)));
      setProductSaveSuccess(`"${product.name}" marked as ${nextStock ? "In Stock" : "Out of Stock"} ✓`);
      setTimeout(() => setProductSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to toggle product stock:", err);
      alert(`Could not update stock status: ${err?.message || "Server error"}`);
    }
  };

  // Luxury Indian Couture Color Palette Presets
  const LUXURY_PALETTE_PRESETS = [
    { name: "Royal Emerald", hex: "#0d4f3c" },
    { name: "Crimson Maroon", hex: "#8b0000" },
    { name: "Mustard Zari", hex: "#c5a059" },
    { name: "Midnight Navy", hex: "#102a43" },
    { name: "Rani Gulabi Pink", hex: "#d94f70" },
    { name: "Pastel Mint", hex: "#70a9a1" },
    { name: "Dusty Terracotta", hex: "#c06c52" },
    { name: "Lavender Mist", hex: "#9d81ba" },
    { name: "Ivory Pearl", hex: "#f4f1ea" },
    { name: "Banarasi Gold", hex: "#b8860b" },
    { name: "Peacock Teal", hex: "#005f73" },
    { name: "Deep Plum Wine", hex: "#5c1349" },
  ];

  // Active product for Color Palette Studio
  const activePaletteProduct = useMemo(() => {
    if (!products.length) return null;
    return products.find((p) => p.id === selectedPaletteProductId) || products[0];
  }, [products, selectedPaletteProductId]);

  const activePaletteVariants = useMemo(() => {
    if (!activePaletteProduct) return [];
    return ensureProductVariants(activePaletteProduct).colorVariants || [];
  }, [activePaletteProduct]);

  const currentPaletteVariant = useMemo(() => {
    if (!activePaletteVariants.length) return null;
    const safeIdx = Math.min(selectedPaletteVariantIndex, activePaletteVariants.length - 1);
    return activePaletteVariants[safeIdx] || activePaletteVariants[0];
  }, [activePaletteVariants, selectedPaletteVariantIndex]);

  const handlePaletteAddColor = (targetProduct: Product) => {
    const currentVars = targetProduct.colorVariants?.length
      ? targetProduct.colorVariants
      : [
          {
            id: `var-${targetProduct.id}-0`,
            colorName: targetProduct.color || "Standard Edition",
            colorHex: targetProduct.colorHex || "#0d4f3c",
            price: targetProduct.price,
            originalPrice: targetProduct.originalPrice,
            savings: targetProduct.savings,
            description: targetProduct.description,
            fabricType: targetProduct.fabricType,
            images: targetProduct.images || [],
            image: targetProduct.image || "",
            hoverImage: targetProduct.hoverImage || "",
            inStock: targetProduct.inStock !== false,
          },
        ];

    const newIdx = currentVars.length;
    const newVariant: ColorVariant = {
      id: `var-${targetProduct.id}-${newIdx}-${Date.now()}`,
      colorName: `New Color Edition ${newIdx + 1}`,
      colorHex: "#c5a059",
      price: targetProduct.price || "₹2,999",
      originalPrice: targetProduct.originalPrice || "₹4,499",
      savings: targetProduct.savings || "Save 30%",
      description: targetProduct.description || "",
      fabricType: targetProduct.fabricType || "Pure Handloom",
      images: [],
      image: "",
      hoverImage: "",
      inStock: true,
    };

    const updatedProduct = {
      ...targetProduct,
      colorVariants: [...currentVars, newVariant],
    };

    setProducts((prev) => prev.map((p) => (p.id === targetProduct.id ? updatedProduct : p)));
    setSelectedPaletteVariantIndex(newIdx);
    setPaletteSaveNotice("Added new color edition. Click 'Save Color Palette' to commit.");
    setTimeout(() => setPaletteSaveNotice(null), 4000);
  };

  const handlePaletteUpdateColor = (productId: string, variantIndex: number, updates: Partial<ColorVariant>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentVars = [...(p.colorVariants || [])];
        if (!currentVars[variantIndex]) return p;
        const updatedVar: ColorVariant = {
          ...currentVars[variantIndex],
          ...updates,
        };
        currentVars[variantIndex] = updatedVar;

        // If primary variant (0), sync top-level attributes
        const topSync =
          variantIndex === 0
            ? {
                color: updatedVar.colorName,
                colorHex: updatedVar.colorHex,
                price: updatedVar.price,
                originalPrice: updatedVar.originalPrice,
                savings: updatedVar.savings,
                fabricType: updatedVar.fabricType,
                description: updatedVar.description,
                inStock: updatedVar.inStock,
                images: updatedVar.images,
                image: updatedVar.images?.[0] || updatedVar.image || "",
                hoverImage: updatedVar.images?.[1] || updatedVar.hoverImage || updatedVar.images?.[0] || "",
              }
            : {};

        return {
          ...p,
          ...topSync,
          colorVariants: currentVars,
        };
      })
    );
  };

  const handlePaletteDeleteColor = (targetProduct: Product, variantIndex: number) => {
    const currentVars = targetProduct.colorVariants || [];
    if (currentVars.length <= 1) {
      alert("A suit piece must retain at least one color option.");
      return;
    }
    const varToDelete = currentVars[variantIndex];
    if (!window.confirm(`Are you sure you want to delete the "${varToDelete?.colorName || 'this'}" color option?`)) {
      return;
    }

    const filtered = currentVars.filter((_, i) => i !== variantIndex);
    const newIdx = Math.max(0, Math.min(selectedPaletteVariantIndex, filtered.length - 1));

    const primary = filtered[0];
    const updatedProduct: Product = {
      ...targetProduct,
      color: primary.colorName,
      colorHex: primary.colorHex,
      price: primary.price,
      originalPrice: primary.originalPrice,
      savings: primary.savings,
      fabricType: primary.fabricType,
      description: primary.description,
      inStock: primary.inStock,
      images: primary.images,
      image: primary.images?.[0] || primary.image || "",
      hoverImage: primary.images?.[1] || primary.hoverImage || primary.images?.[0] || "",
      colorVariants: filtered,
    };

    setProducts((prev) => prev.map((p) => (p.id === targetProduct.id ? updatedProduct : p)));
    setSelectedPaletteVariantIndex(newIdx);
    setPaletteSaveNotice(`Deleted color edition. Remember to click "Save Color Palette" to commit.`);
    setTimeout(() => setPaletteSaveNotice(null), 4000);
  };

  const handlePaletteReorderColor = (targetProduct: Product, fromIndex: number, toIndex: number) => {
    const list = [...(targetProduct.colorVariants || [])];
    if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return;

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const primary = list[0];
    const updatedProduct: Product = {
      ...targetProduct,
      color: primary.colorName,
      colorHex: primary.colorHex,
      price: primary.price,
      originalPrice: primary.originalPrice,
      savings: primary.savings,
      fabricType: primary.fabricType,
      description: primary.description,
      inStock: primary.inStock,
      images: primary.images,
      image: primary.images?.[0] || primary.image || "",
      hoverImage: primary.images?.[1] || primary.hoverImage || primary.images?.[0] || "",
      colorVariants: list,
    };

    setProducts((prev) => prev.map((p) => (p.id === targetProduct.id ? updatedProduct : p)));
    setSelectedPaletteVariantIndex(toIndex);
  };

  const handleSaveColorPalette = async (targetProduct: Product) => {
    setPaletteSaving(true);
    try {
      const variants = targetProduct.colorVariants || [];
      const sanitizedVariants = variants.map((v, i) => {
        const vImgs =
          v.images && v.images.length > 0
            ? v.images
            : v.image
            ? [v.image, ...(v.hoverImage && v.hoverImage !== v.image ? [v.hoverImage] : [])]
            : [];
        return {
          ...v,
          images: vImgs,
          image: vImgs[0] || v.image || (i === 0 ? targetProduct.image || "" : ""),
          hoverImage: vImgs[1] || v.hoverImage || vImgs[0] || (i === 0 ? targetProduct.hoverImage || "" : ""),
        };
      });

      const fallbackImages =
        sanitizedVariants.find((v) => v.images && v.images.length > 0)?.images || targetProduct.images || [];

      const primary = sanitizedVariants[0] || {
        colorName: targetProduct.color,
        colorHex: targetProduct.colorHex,
        price: targetProduct.price,
        originalPrice: targetProduct.originalPrice,
        savings: targetProduct.savings,
        fabricType: targetProduct.fabricType,
        description: targetProduct.description,
        inStock: targetProduct.inStock,
        images: targetProduct.images,
        image: targetProduct.image,
        hoverImage: targetProduct.hoverImage,
      };

      const primaryImages = primary.images?.length ? primary.images : fallbackImages;
      const primaryImage = primaryImages[0] || primary.image || targetProduct.image || "";
      const primaryHover = primaryImages[1] || primary.hoverImage || primaryImage;

      const productToSave: Product = {
        ...targetProduct,
        fabricType: primary.fabricType || targetProduct.fabricType || "Pure Handloom",
        color: primary.colorName || targetProduct.color || "Standard Edition",
        colorHex: primary.colorHex || targetProduct.colorHex || "#0d4f3c",
        price: primary.price || targetProduct.price || "₹2,999",
        originalPrice: primary.originalPrice || targetProduct.originalPrice || "₹4,499",
        savings: primary.savings || targetProduct.savings || "Save 30%",
        description: primary.description !== undefined ? primary.description : targetProduct.description || "",
        image: primaryImage,
        hoverImage: primaryHover,
        images: primaryImages,
        inStock: primary.inStock !== false && targetProduct.inStock !== false,
        colorVariants: sanitizedVariants,
      };

      const saveRes = await saveProduct(productToSave);
      const noticeSuffix = saveRes?.firestoreNotice ? ` (${saveRes.firestoreNotice})` : "";
      setPaletteSaveNotice(`All ${sanitizedVariants.length} color edition(s) & photos saved & published live to boutique! ✓${noticeSuffix}`);
      setTimeout(() => setPaletteSaveNotice(null), 6000);
    } catch (err: any) {
      console.error("Failed to save color palette:", err);
      setPaletteSaveNotice(`Failed to save color palette: ${err?.message || "Check network connection"}`);
      alert(`Failed to save color palette changes: ${err?.message || "Please check your network and try again."}`);
    } finally {
      setPaletteSaving(false);
    }
  };

  // Category Add
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategoryNotice(null);
    try {
      const newCat: CategoryItem = {
        id: `cat-${Date.now()}`,
        name: newCategoryName.trim(),
        slug: newCategoryName.trim(),
        description: newCategoryDesc.trim() || "Exclusive curated collection",
        sortOrder: categories.length + 1,
      };
      await saveCategory(newCat);
      setCategories((prev) => [...prev, newCat]);
      setNewCategoryName("");
      setNewCategoryDesc("");
      setCategoryNotice({ type: "success", message: `Category "${newCat.name}" added successfully! ✓` });
      setTimeout(() => setCategoryNotice(null), 4000);
    } catch (err: any) {
      console.error("Category add failure:", err);
      setCategoryNotice({ type: "error", message: `Failed to add category: ${err?.message || "Server error"}` });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const targetCat = categories.find((c) => c.id === id);
    const catName = targetCat ? `"${targetCat.name}"` : "this category";
    if (!window.confirm(`Delete ${catName}?`)) return;
    setCategoryNotice(null);
    const prevCategories = [...categories];
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteCategory(id);
      setCategoryNotice({ type: "success", message: `Category ${catName} deleted successfully! ✓` });
      setTimeout(() => setCategoryNotice(null), 4000);
    } catch (err: any) {
      console.error("Failed to delete category:", err);
      setCategories(prevCategories);
      setCategoryNotice({ type: "error", message: `Failed to delete category: ${err?.message || "Server error"}` });
    }
  };

  // CMS Content Saving
  const handleSaveCMSContent = async () => {
    if (!siteContent) return;
    setCmsSaving(true);
    setCmsSaveNotice("");
    try {
      await saveSiteContent(siteContent);
      setCmsSaveNotice("Website content successfully updated live!");
      setTimeout(() => setCmsSaveNotice(""), 3500);
    } catch (err) {
      console.error("CMS save failure:", err);
      setCmsSaveNotice("Failed to update content. Check connection.");
    } finally {
      setCmsSaving(false);
    }
  };

  // Export Orders
  const exportOrdersCSV = () => {
    const list = ordersMode === "real" ? realOrders : testOrders;
    if (list.length === 0) return;
    const headers = ["Order Number", "Date", "Customer Name", "Phone", "Email", "City", "State", "Pincode", "Total (INR)", "Payment Mode", "Status", "Tracking"];
    const rows = list.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString(),
      `"${o.customer.fullName}"`,
      `"${o.customer.phone}"`,
      `"${o.customer.email}"`,
      `"${o.shippingAddress.city}"`,
      `"${o.shippingAddress.state}"`,
      `"${o.shippingAddress.pincode}"`,
      o.total,
      `"${o.paymentMethod}"`,
      o.orderStatus,
      `"${o.trackingNumber || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HouseOfShriya_${ordersMode}_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080e0c] flex items-center justify-center text-[#d4af37]">
        <div className="text-center space-y-3">
          <Crown size={36} className="animate-spin mx-auto text-[#d4af37]" />
          <p className="font-serif tracking-widest text-sm text-[#faf8f5] uppercase">
            Loading House of Shriya Atelier CMS...
          </p>
        </div>
      </div>
    );
  }

  // Not Authenticated: Secure Admin Login / Setup View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080e0c] text-[#faf8f5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle decorative radial background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0d4f3c]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0d4f3c] border border-[#d4af37]/40 shadow-xl mb-4 text-[#d4af37]">
            <Crown size={32} strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#d4af37] uppercase block">
            ATELIER GOVERNANCE
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-[#faf8f5] mt-1">
            House of Shriya
          </h1>
          <p className="text-xs text-[#a39e93] mt-1.5">
            Official Admin Dashboard &amp; Real-time Content Management Suite
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-[#121916] border border-[#d4af37]/30 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
            {/* Mode switch tabs */}
            <div className="flex border-b border-[#22302a] mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode("signin"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  authMode === "signin"
                    ? "border-[#d4af37] text-[#d4af37]"
                    : "border-transparent text-[#8a857b] hover:text-white"
                }`}
              >
                Admin Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("reset"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  authMode === "reset" || authMode === "confirm_reset"
                    ? "border-[#d4af37] text-[#d4af37]"
                    : "border-transparent text-[#8a857b] hover:text-white"
                }`}
              >
                Forgot / Reset Password
              </button>
            </div>

            {authError && (
              <div className="mb-4 bg-red-950/60 border border-red-800 text-red-300 text-xs px-3.5 py-2.5 rounded-lg flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                  <span>{authError}</span>
                </div>
                {authMode === "confirm_reset" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("reset");
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="self-start text-[11px] font-semibold text-[#d4af37] underline hover:text-[#e6c34f] pl-6 transition-colors"
                  >
                    Request a new reset email →
                  </button>
                )}
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs px-3.5 py-2.5 rounded-lg flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{authSuccess}</span>
              </div>
            )}

            {authMode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Admin Username
                  </label>
                  <div className="relative">
                    <UserCheck size={15} className="absolute left-3 top-3 text-[#7a7469]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. house of shriya"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Security Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3 text-[#7a7469]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Security Protection Notice */}
                <div className="bg-[#0d4f3c]/15 border border-[#2b3d35] rounded-xl p-3 text-[11px] text-[#cfc8bc] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#d4af37] text-[10px] uppercase tracking-wider">
                    <Shield size={12} /> Server-Protected Admin Portal
                  </div>
                  <p className="text-[10px] text-[#9c9588] leading-relaxed">
                    Credentials and administrative routes are authenticated via server-side secrets. Unauthorized access attempts are rejected.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full mt-2 bg-[#0d4f3c] hover:bg-[#146e54] text-[#faf8f5] font-bold text-xs uppercase tracking-widest py-3 rounded-xl border border-[#d4af37]/40 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Shield size={15} className="text-[#d4af37]" />
                  <span>{authSubmitting ? "Authenticating..." : "Enter Secure Dashboard"}</span>
                </button>
              </form>
            )}

            {authMode === "setup" && (
              <form onSubmit={handleSetupAdmin} className="space-y-4">
                <div className="bg-[#0d4f3c]/20 border border-[#0d4f3c]/40 p-3 rounded-lg text-[11px] text-[#cfc8bc]">
                  First time configuring your store? Create the primary owner admin credentials below.
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Owner Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shriya Sharma"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. shriyapusha01@gmail.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Create Password (Min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full mt-2 bg-[#d4af37] hover:bg-[#e6c34f] text-[#080e0c] font-bold text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Crown size={15} />
                  <span>{authSubmitting ? "Provisioning..." : "Create Admin Account"}</span>
                </button>
              </form>
            )}

            {authMode === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-[#a39e93]">
                  Enter your registered admin email address and we’ll send a password reset link directly to your inbox.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. shriyapusha01@gmail.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full mt-2 bg-[#0d4f3c] hover:bg-[#146e54] text-[#faf8f5] font-bold text-xs uppercase tracking-widest py-3 rounded-xl border border-[#d4af37]/40 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Mail size={15} />
                  <span>{authSubmitting ? "Sending Link..." : "Send Reset Link"}</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("confirm_reset");
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-xs text-[#d4af37] hover:underline"
                  >
                    Already have a reset code or link token? Set new password →
                  </button>
                </div>
              </form>
            )}

            {authMode === "confirm_reset" && (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <p className="text-xs text-[#a39e93]">
                  Enter your single-use reset code or token received via email, along with your desired new password.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Registered Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. shriyapusha01@gmail.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Security Code / Reset Token
                  </label>
                  <div className="relative">
                    <Key size={15} className="absolute left-3 top-3 text-[#7a7469]" />
                    <input
                      type="text"
                      required
                      placeholder="Enter 8-character code or token"
                      value={resetTokenParam}
                      onChange={(e) => setResetTokenParam(e.target.value)}
                      className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    New Security Password (Min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3 text-[#7a7469]" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3 text-[#7a7469]" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      className="w-full bg-[#080e0c] border border-[#2b3d35] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5a544a] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full mt-2 bg-[#d4af37] hover:bg-[#e6c34f] text-[#080e0c] font-bold text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CheckCircle2 size={15} />
                  <span>{authSubmitting ? "Updating Password..." : "Update Password & Sign In"}</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("reset");
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-xs text-[#a39e93] hover:text-[#d4af37] transition-colors"
                  >
                    ← Back to Request Reset Link
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-[#22302a] text-center">
              <Link
                to="/"
                className="text-xs text-[#d4af37] hover:underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={13} /> Return to House of Shriya Storefront
              </Link>
            </div>
          </div>

          <p className="text-[11px] text-center text-[#6e685f] mt-4">
            Domain-independent cloud persistence · Secured by Google Firebase
          </p>
        </div>
      </div>
    );
  }

  // Authenticated: Production-Ready Admin Dashboard / CMS
  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#1e1b18] flex flex-col font-sans">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 bg-[#080e0c] text-[#faf8f5] border-b border-[#d4af37]/30 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-[#d4af37] hover:bg-[#15221e] transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu size={20} />
          </button>

          <div className="w-8 h-8 rounded-full bg-[#0d4f3c] border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37] shrink-0">
            <Crown size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-sm tracking-wider text-[#faf8f5]">
                HOUSE OF SHRIYA
              </h1>
              <span className="bg-[#0d4f3c] text-[#d4af37] text-[10px] font-bold px-2 py-0.2 rounded-full border border-[#d4af37]/40 uppercase tracking-wider">
                ADMIN CMS
              </span>
            </div>
            <p className="text-[10px] text-[#9c9588]">
              Live Storefront Controller · Admin: <span className="text-[#faf8f5] font-semibold">{currentAdminName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1a2622] hover:bg-[#253630] text-[#faf8f5] px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#31473f] transition-colors"
            title="Preview Live Boutique in new tab"
          >
            <Eye size={14} className="text-[#d4af37]" />
            <span className="hidden xs:inline sm:inline">Preview Live Site</span>
            <ExternalLink size={12} className="text-[#9c9588]" />
          </Link>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#2a1717] hover:bg-[#3d1f1f] text-red-300 px-3 py-1.5 rounded-lg border border-red-900/40 transition-colors"
            title="Sign out of Admin"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation for phone & tablet */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a110e] border-b border-[#22332c] p-3 space-y-1 z-30 shadow-xl">
          {[
            { id: "overview", label: "Dashboard Overview", icon: Sliders },
            { id: "orders", label: `Customer Orders (${realOrders.length})`, icon: Package },
            { id: "products", label: `Products Catalog (${products.length})`, icon: ShoppingBag },
            { id: "colors", label: "Color Palettes & Photos", icon: Palette },
            { id: "categories", label: `Categories (${categories.length})`, icon: Layers },
            { id: "media", label: "Media & Images Library", icon: ImageIcon },
            { id: "users", label: "User Accounts & Patrons", icon: Users },
            { id: "banners", label: "Hero & Announcement", icon: Sparkles },
            { id: "content", label: "Atelier & Story CMS", icon: FileText },
            { id: "settings", label: "Store & Credentials", icon: Key },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                activeTab === tab.id
                  ? "bg-[#0d4f3c] text-white border border-[#d4af37]/40"
                  : "text-[#cfc8bc] hover:bg-[#15221e]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <tab.icon size={15} className={activeTab === tab.id ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick Mobile Horizontal Tabs Bar for phone and tablet */}
      <div className="md:hidden bg-[#0a110e] border-b border-[#22332c] px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { id: "overview", label: "Overview", icon: Sliders },
          { id: "orders", label: `Orders (${realOrders.length})`, icon: Package },
          { id: "products", label: `Products (${products.length})`, icon: ShoppingBag },
          { id: "colors", label: "Colors & Photos", icon: Palette },
          { id: "categories", label: `Categories (${categories.length})`, icon: Layers },
          { id: "media", label: "Media", icon: ImageIcon },
          { id: "users", label: "Users", icon: Users },
          { id: "banners", label: "Banners", icon: Sparkles },
          { id: "content", label: "CMS Story", icon: FileText },
          { id: "settings", label: "Settings", icon: Key },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              activeTab === tab.id
                ? "bg-[#0d4f3c] text-white border border-[#d4af37]/40 shadow-xs"
                : "bg-[#15221e] text-[#cfc8bc] hover:text-white"
            }`}
          >
            <tab.icon size={13} className={activeTab === tab.id ? "text-[#d4af37]" : "text-[#7a8c83]"} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:block w-64 bg-[#0d1613] text-[#d1cbbf] border-r border-[#22332c] flex-shrink-0">
          <div className="p-3 sm:p-4 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders size={16} className={activeTab === "overview" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Dashboard Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "orders"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package size={16} className={activeTab === "orders" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Customer Orders</span>
              </div>
              <span className="bg-[#1e332a] text-[#d4af37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {realOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "products"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={16} className={activeTab === "products" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Products Catalog</span>
              </div>
              <span className="text-[11px] text-[#8fa398]">{products.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("colors")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "colors"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Palette size={16} className={activeTab === "colors" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Color Palettes &amp; Photos</span>
              </div>
              <span className="bg-[#1e332a] text-[#d4af37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                Palette
              </span>
            </button>

            <button
              onClick={() => setActiveTab("categories")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "categories"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers size={16} className={activeTab === "categories" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Categories &amp; Drops</span>
              </div>
              <span className="text-[11px] text-[#8fa398]">{categories.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("media")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "media"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ImageIcon size={16} className={activeTab === "media" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Media &amp; Images</span>
              </div>
              <span className="bg-[#1e332a] text-[#d4af37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                CDN
              </span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} className={activeTab === "users" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>User Accounts &amp; Patrons</span>
              </div>
              <span className="bg-[#1e332a] text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                CRM
              </span>
            </button>

            <button
              onClick={() => setActiveTab("banners")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "banners"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className={activeTab === "banners" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Hero &amp; Announcement</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("content")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "content"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} className={activeTab === "content" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Atelier &amp; Story CMS</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-[#0d4f3c] text-white shadow-sm border border-[#d4af37]/40"
                  : "hover:bg-[#15221e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key size={16} className={activeTab === "settings" ? "text-[#d4af37]" : "text-[#7a8c83]"} />
                <span>Store &amp; Credentials</span>
              </div>
            </button>
          </div>

          <div className="p-4 border-t border-[#22332c] hidden md:block">
            <div className="bg-[#121c18] rounded-xl p-3 border border-[#22332c] text-[11px] space-y-1 text-[#8fa398]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Database Sync: Live</span>
              </div>
              <p>Direct real-time link with Firestore storage bucket.</p>
            </div>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {/* ============================================================
              TAB 1: DASHBOARD OVERVIEW
          ============================================================ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                  ATELIER INSIGHTS
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#1e1b18] mt-0.5">
                  Welcome to House of Shriya CMS
                </h2>
                <p className="text-xs text-[#6b6257]">
                  Monitor live checkout orders, catalog inventory, and storefront content in real-time.
                </p>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5ded6] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6b6257] uppercase tracking-wider">
                      Real Orders
                    </span>
                    <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      <Package size={15} />
                    </div>
                  </div>
                  <div className="font-serif font-bold text-2xl sm:text-3xl text-[#1e1b18] mt-2">
                    {realOrders.length}
                  </div>
                  <p className="text-[11px] text-[#6b6257] mt-1">
                    Direct customer checkouts
                  </p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5ded6] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6b6257] uppercase tracking-wider">
                      Sales Volume
                    </span>
                    <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center">
                      <Crown size={15} />
                    </div>
                  </div>
                  <div className="font-serif font-bold text-2xl sm:text-3xl text-[#0d4f3c] mt-2">
                    ₹{totalRevenue.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-[#6b6257] mt-1">
                    Confirmed order value
                  </p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5ded6] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6b6257] uppercase tracking-wider">
                      Pending Dispatch
                    </span>
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center">
                      <Clock size={15} />
                    </div>
                  </div>
                  <div className="font-serif font-bold text-2xl sm:text-3xl text-[#1e1b18] mt-2">
                    {pendingFulfillments}
                  </div>
                  <p className="text-[11px] text-[#6b6257] mt-1">
                    Awaiting shipping / courier
                  </p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5ded6] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6b6257] uppercase tracking-wider">
                      Catalog Pieces
                    </span>
                    <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-800 flex items-center justify-center">
                      <ShoppingBag size={15} />
                    </div>
                  </div>
                  <div className="font-serif font-bold text-2xl sm:text-3xl text-[#1e1b18] mt-2">
                    {products.length}
                  </div>
                  <p className="text-[11px] text-[#6b6257] mt-1">
                    Across {categories.length} categories
                  </p>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Quick Management Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="p-4 rounded-xl border border-[#e5ded6] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-white text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#0d4f3c] text-[#d4af37] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Package size={18} />
                    </div>
                    <strong className="block text-sm text-[#1e1b18]">Manage Orders</strong>
                    <span className="text-xs text-[#6b6257]">Fulfill live customer orders.</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("products");
                      handleOpenProductModal();
                    }}
                    className="p-4 rounded-xl border border-[#e5ded6] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-white text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#d4af37] text-[#080e0c] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Plus size={18} />
                    </div>
                    <strong className="block text-sm text-[#1e1b18]">Add New Suit</strong>
                    <span className="text-xs text-[#6b6257]">Publish a new design.</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("media")}
                    className="p-4 rounded-xl border border-[#e5ded6] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-white text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#122b22] text-[#d4af37] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <ImageIcon size={18} />
                    </div>
                    <strong className="block text-sm text-[#1e1b18]">Media Library</strong>
                    <span className="text-xs text-[#6b6257]">Upload and manage images.</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("users")}
                    className="p-4 rounded-xl border border-[#e5ded6] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-white text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1a2f26] text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Users size={18} />
                    </div>
                    <strong className="block text-sm text-[#1e1b18]">User Accounts</strong>
                    <span className="text-xs text-[#6b6257]">Manage patrons &amp; tiers.</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("banners")}
                    className="p-4 rounded-xl border border-[#e5ded6] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-white text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#22332c] text-[#d4af37] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Sparkles size={18} />
                    </div>
                    <strong className="block text-sm text-[#1e1b18]">Hero &amp; Banners</strong>
                    <span className="text-xs text-[#6b6257]">Edit promotional slides.</span>
                  </button>
                </div>
              </div>

              {/* Latest Incoming Live Orders Preview */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                      Recent Live Customer Orders
                    </h3>
                    <p className="text-xs text-[#6b6257]">
                      Only authentic customer checkouts from the storefront.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-[#0d4f3c] hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                {realOrders.length === 0 ? (
                  <div className="text-center py-8 bg-[#faf8f5] rounded-xl border border-dashed border-[#d6ccc2] space-y-2">
                    <Package size={32} className="mx-auto text-[#a89f91]" />
                    <p className="text-xs font-medium text-[#1e1b18]">Orders list is completely fresh &amp; empty</p>
                    <p className="text-[11px] text-[#6b6257] max-w-sm mx-auto">
                      Zero mock data. When customers place real orders through the storefront checkout, they will instantly appear here with live notification!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e8dfd8]">
                    {realOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          setActiveTab("orders");
                          openOrderDetails(order);
                        }}
                        className="py-3 flex items-center justify-between hover:bg-[#faf8f5] px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0d4f3c]/10 text-[#0d4f3c] flex items-center justify-center font-mono text-xs font-bold">
                            {order.orderNumber.slice(-4)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-[#1e1b18]">
                              {order.customer.fullName} · {order.orderNumber}
                            </div>
                            <div className="text-[11px] text-[#6b6257]">
                              {order.items.length} piece(s) · {order.shippingAddress.city} · {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif font-bold text-xs text-[#0d4f3c]">
                            ₹{order.total.toLocaleString("en-IN")}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.orderStatus === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : order.orderStatus === "shipped"
                              ? "bg-blue-100 text-blue-800"
                              : order.orderStatus === "delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 2: REAL CUSTOMER ORDERS MANAGEMENT (The Core Request)
          ============================================================ */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                    ORDERS SUITE
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                    Customer Orders Management
                  </h2>
                  <p className="text-xs text-[#6b6257]">
                    Real-time fulfillment tracking with zero mock data.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportOrdersCSV}
                    disabled={displayedOrders.length === 0}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-[#faf8f5] text-[#1e1b18] px-3.5 py-2 rounded-xl border border-[#d6ccc2] shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Isolation Tabs: Real Customer Orders vs Test Orders */}
              <div className="flex items-center justify-between border-b border-[#e5ded6] pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrdersMode("real")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      ordersMode === "real"
                        ? "bg-[#0d4f3c] text-white shadow-xs"
                        : "bg-white text-[#6b6257] hover:text-[#1e1b18] border border-[#e5ded6]"
                    }`}
                  >
                    Real Customer Orders ({realOrders.length})
                  </button>

                  <button
                    onClick={() => setOrdersMode("test")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      ordersMode === "test"
                        ? "bg-[#253630] text-[#d4af37] shadow-xs"
                        : "bg-white text-[#6b6257] hover:text-[#1e1b18] border border-[#e5ded6]"
                    }`}
                  >
                    Test Sandbox ({testOrders.length})
                  </button>
                </div>

                <span className="text-[11px] text-[#8c8275] hidden sm:inline">
                  {ordersMode === "real" ? "Strictly real checkouts" : "Isolated test orders"}
                </span>
              </div>

              {/* Filters and Search Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#e5ded6] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3 top-2.5 text-[#8c8275]" />
                  <input
                    type="text"
                    placeholder="Search Order #, customer name, phone, city..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden focus:border-[#0d4f3c]"
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-[#8c8275] hover:text-black"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {["all", "pending", "confirmed", "shipped", "delivered", "refunded", "cancelled"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize transition-colors whitespace-nowrap ${
                        orderStatusFilter === status
                          ? "bg-[#0d4f3c] text-white"
                          : "bg-[#f2ece4] text-[#6b6257] hover:bg-[#e6ded3]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List / Table */}
              {displayedOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#e5ded6] p-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#f2ece4] text-[#8c8275] mx-auto flex items-center justify-center">
                    <Package size={32} />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#1e1b18]">
                    {orderSearchQuery || orderStatusFilter !== "all"
                      ? "No matching orders found"
                      : "Zero Orders in List (Fresh & Ready)"}
                  </h3>
                  <p className="text-xs text-[#6b6257] max-w-md mx-auto leading-relaxed">
                    {orderSearchQuery || orderStatusFilter !== "all"
                      ? "Try clearing your search query or status filter to view all orders."
                      : "The system is started completely fresh with zero mock or fake orders. As customers complete checkout on the live website, their orders will appear here automatically with instant status synchronization."}
                  </p>
                  {(orderSearchQuery || orderStatusFilter !== "all") && (
                    <button
                      onClick={() => {
                        setOrderSearchQuery("");
                        setOrderStatusFilter("all");
                      }}
                      className="mt-2 text-xs font-bold text-[#0d4f3c] hover:underline"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile Order Cards View (md:hidden) */}
                  <div className="grid grid-cols-1 gap-3 md:hidden">
                    {displayedOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => openOrderDetails(order)}
                        className="bg-white p-4 rounded-xl border border-[#e5ded6] shadow-2xs space-y-2.5 active:bg-[#faf8f5] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-mono font-bold text-xs text-[#0d4f3c]">
                            {order.orderNumber}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              order.orderStatus === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : order.orderStatus === "confirmed"
                                ? "bg-indigo-100 text-indigo-800"
                                : order.orderStatus === "shipped"
                                ? "bg-blue-100 text-blue-800"
                                : order.orderStatus === "delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : order.orderStatus === "refunded"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.orderStatus}
                          </span>
                        </div>

                        <div className="flex items-start justify-between text-xs">
                          <div>
                            <strong className="block text-[#1e1b18] font-semibold">{order.customer.fullName}</strong>
                            <div className="text-[11px] text-[#6b6257]">{order.customer.phone}</div>
                            <div className="text-[10px] text-[#8c8275]">{order.shippingAddress.city}, {order.shippingAddress.state}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-serif font-bold text-sm text-[#1e1b18]">
                              ₹{order.total.toLocaleString("en-IN")}
                            </div>
                            <span className="text-[10px] text-[#6b6257] block">
                              {order.paymentMethod === "Cash on Delivery (COD)" ? "COD" : "Prepaid"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#f2ece4] flex items-center justify-between text-[11px] text-[#6b6257]">
                          <span>{order.items.length} item(s)</span>
                          <span className="text-[#0d4f3c] font-bold">Manage Order →</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Orders Table (hidden md:block) */}
                  <div className="hidden md:block bg-white rounded-2xl border border-[#e5ded6] shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f7f4ef] border-b border-[#e5ded6] text-[#6b6257] uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Order Ref</th>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Items</th>
                            <th className="py-3 px-4">Destination</th>
                            <th className="py-3 px-4">Total</th>
                            <th className="py-3 px-4">Payment</th>
                            <th className="py-3 px-4">Fulfillment</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8dfd8]">
                          {displayedOrders.map((order) => (
                            <tr
                              key={order.id}
                              className="hover:bg-[#faf8f5] transition-colors cursor-pointer"
                              onClick={() => openOrderDetails(order)}
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-[#0d4f3c]">
                                {order.orderNumber}
                                <div className="text-[10px] font-sans font-normal text-[#8c8275]">
                                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <strong className="block text-[#1e1b18]">{order.customer.fullName}</strong>
                                <span className="text-[11px] text-[#6b6257]">{order.customer.phone}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-[#1e1b18]">{order.items.length} Piece(s)</span>
                                <div className="text-[11px] text-[#6b6257] truncate max-w-[150px]">
                                  {order.items.map((i) => i.productName).join(", ")}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-[#5a544c]">
                                <div>{order.shippingAddress.city}, {order.shippingAddress.state}</div>
                                <span className="text-[10px] text-[#8c8275]">{order.shippingAddress.pincode}</span>
                              </td>

                              <td className="py-3.5 px-4 font-serif font-bold text-sm text-[#1e1b18]">
                                ₹{order.total.toLocaleString("en-IN")}
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="text-[11px] font-medium block text-[#1e1b18]">
                                  {order.paymentMethod === "Cash on Delivery (COD)" ? "COD" : "Prepaid"}
                                </span>
                                <span className={`text-[10px] font-semibold ${
                                  order.paymentStatus === "Paid" ? "text-emerald-700" : "text-amber-700"
                                }`}>
                                  {order.paymentStatus}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    order.orderStatus === "pending"
                                      ? "bg-amber-100 text-amber-800"
                                      : order.orderStatus === "confirmed"
                                      ? "bg-indigo-100 text-indigo-800"
                                      : order.orderStatus === "shipped"
                                      ? "bg-blue-100 text-blue-800"
                                      : order.orderStatus === "delivered"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : order.orderStatus === "refunded"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {order.orderStatus}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => openOrderDetails(order)}
                                  className="px-2.5 py-1 text-xs font-bold text-[#0d4f3c] hover:bg-[#0d4f3c]/10 rounded-lg transition-colors mr-1"
                                >
                                  Details →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Detail Drawer / Modal */}
              {selectedOrder && (
                <div className="fixed inset-0 z-50 flex justify-end">
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                    onClick={() => setSelectedOrder(null)}
                  />

                  <div className="relative z-10 w-full max-w-lg bg-[#faf8f5] text-[#1e1b18] shadow-2xl flex flex-col h-full border-l border-[#d4af37]/30">
                    {/* Drawer Header */}
                    <div className="p-4 sm:p-5 border-b border-[#e5ded6] flex items-center justify-between bg-[#f4eee6]">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-[#0d4f3c] uppercase block">
                          ORDER DETAILS
                        </span>
                        <h3 className="font-mono font-bold text-lg text-[#1e1b18]">
                          {selectedOrder.orderNumber}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#5a544c] hover:text-black hover:bg-[#e8dfd8]"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Drawer Body */}
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                      {/* Status Management Box */}
                      <div className="bg-white p-4 rounded-xl border border-[#e5ded6] shadow-2xs space-y-3">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-[#1e1b18]">Update Order Status</strong>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              selectedOrder.orderStatus === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : selectedOrder.orderStatus === "confirmed"
                                ? "bg-indigo-100 text-indigo-800"
                                : selectedOrder.orderStatus === "shipped"
                                ? "bg-blue-100 text-blue-800"
                                : selectedOrder.orderStatus === "delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : selectedOrder.orderStatus === "refunded"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            Current: {selectedOrder.orderStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {(["pending", "confirmed", "shipped", "delivered", "refunded", "cancelled"] as OrderStatus[]).map(
                            (st) => (
                              <button
                                key={st}
                                onClick={() => handleUpdateStatus(st)}
                                disabled={isUpdatingOrder}
                                className={`py-2 px-1 rounded-lg text-[11px] font-bold capitalize transition-all border ${
                                  selectedOrder.orderStatus === st
                                    ? "bg-[#0d4f3c] text-white border-[#0d4f3c]"
                                    : "bg-[#faf8f5] text-[#5a544c] hover:bg-[#f2ece4] border-[#d6ccc2]"
                                }`}
                              >
                                {st}
                              </button>
                            )
                          )}
                        </div>

                        {/* Courier Tracking Inputs */}
                        <div className="pt-2 border-t border-[#e5ded6] space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6b6257] uppercase mb-1">
                                Courier Partner
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Bluedart / Delhivery"
                                value={courierInput}
                                onChange={(e) => setCourierInput(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6b6257] uppercase mb-1">
                                AWB / Tracking #
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 789218931"
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.orderStatus)}
                            className="w-full text-[11px] font-bold bg-[#0d4f3c] text-white py-1.5 rounded-lg hover:bg-[#083528]"
                          >
                            Save Tracking Details
                          </button>
                        </div>
                      </div>

                      {/* Customer Contact & WhatsApp Trigger */}
                      <div className="bg-white p-4 rounded-xl border border-[#e5ded6] shadow-2xs space-y-2.5">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-[#1e1b18]">Customer Contact</strong>
                          <a
                            href={`https://wa.me/${selectedOrder.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Namaste ${selectedOrder.customer.fullName}! Your House of Shriya order ${selectedOrder.orderNumber} is ${selectedOrder.orderStatus.toUpperCase()}.${
                                selectedOrder.trackingNumber ? ` Tracking: ${selectedOrder.trackingCourier || "Courier"} AWB ${selectedOrder.trackingNumber}` : ""
                              }`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                          >
                            <MessageCircle size={13} />
                            <span>Notify on WhatsApp</span>
                          </a>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-[#6b6257]">Name:</span>{" "}
                            <strong className="text-[#1e1b18]">{selectedOrder.customer.fullName}</strong>
                          </div>
                          <div>
                            <span className="text-[#6b6257]">Phone:</span>{" "}
                            <a href={`tel:${selectedOrder.customer.phone}`} className="text-[#0d4f3c] font-semibold hover:underline">
                              {selectedOrder.customer.phone}
                            </a>
                          </div>
                          <div>
                            <span className="text-[#6b6257]">Email:</span>{" "}
                            <span className="text-[#1e1b18]">{selectedOrder.customer.email}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#e5ded6]">
                          <span className="text-[10px] font-bold text-[#6b6257] uppercase block mb-1">
                            Shipping Destination:
                          </span>
                          <p className="text-xs text-[#1e1b18] leading-relaxed">
                            {selectedOrder.shippingAddress.addressLine1}
                            {selectedOrder.shippingAddress.addressLine2 ? `, ${selectedOrder.shippingAddress.addressLine2}` : ""},{" "}
                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} -{" "}
                            <b>{selectedOrder.shippingAddress.pincode}</b>
                          </p>
                        </div>
                      </div>

                      {/* Ordered Items List */}
                      <div className="bg-white p-4 rounded-xl border border-[#e5ded6] shadow-2xs space-y-3">
                        <strong className="text-xs text-[#1e1b18]">
                          Items Ordered ({selectedOrder.items.length})
                        </strong>
                        <div className="divide-y divide-[#e8dfd8]">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="py-2.5 flex items-center gap-3">
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-12 h-14 object-cover rounded-md border border-[#e0d7cb]"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-xs text-[#1e1b18] truncate">
                                  {item.productName}
                                </h4>
                                <div className="text-[11px] text-[#6b6257] mt-0.5">
                                  Format: <span className="font-bold text-[#0d4f3c]">{item.size || "Unstitched Suit"}</span> · Color: {item.color} · Qty: {item.quantity}
                                </div>
                              </div>
                              <div className="font-serif font-bold text-xs text-[#0d4f3c]">
                                ₹{item.totalPrice.toLocaleString("en-IN")}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pricing Summary */}
                        <div className="pt-2 border-t border-[#e5ded6] space-y-1 text-xs">
                          <div className="flex justify-between text-[#6b6257]">
                            <span>Subtotal</span>
                            <span>₹{selectedOrder.subtotal.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-[#6b6257]">
                            <span>Shipping</span>
                            <span>{selectedOrder.shippingFee === 0 ? "FREE" : `₹${selectedOrder.shippingFee}`}</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-[#1e1b18] pt-1 border-t border-[#e5ded6]">
                            <span>Grand Total</span>
                            <span className="text-[#0d4f3c] font-serif">₹{selectedOrder.total.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="text-[11px] text-[#6b6257] pt-1">
                            Payment: <b>{selectedOrder.paymentMethod}</b> ({selectedOrder.paymentStatus})
                          </div>
                        </div>
                      </div>

                      {/* Internal Notes */}
                      <div className="bg-white p-4 rounded-xl border border-[#e5ded6] shadow-2xs space-y-2">
                        <label className="block text-xs font-bold text-[#1e1b18]">
                          Atelier / Sizing Internal Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Sizing confirmed over call, packed with gold gift ribbon."
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          className="w-full text-xs p-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg"
                        />
                        <button
                          onClick={handleSaveOrderNotes}
                          className="text-xs font-semibold bg-[#253630] text-white px-3 py-1.5 rounded-lg hover:bg-[#15221e]"
                        >
                          Update Notes
                        </button>
                      </div>

                      {/* Delete Danger Action */}
                      <div className="pt-2">
                        <button
                          onClick={() => handleDeleteOrder(selectedOrder.id)}
                          className="w-full text-xs font-bold text-red-700 hover:text-red-900 border border-red-200 bg-red-50 hover:bg-red-100 py-2.5 rounded-xl transition-colors"
                        >
                          Delete Order Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB 3: PRODUCTS CATALOG MANAGEMENT (CRUD)
          ============================================================ */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                    INVENTORY &amp; CATALOG
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                    Boutique Products Management
                  </h2>
                  <p className="text-xs text-[#6b6257]">
                    Manage handcrafted suit sets, fabrics, prices, and live boutique availability.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenProductModal()}
                  className="inline-flex items-center gap-2 text-xs font-bold bg-[#0d4f3c] hover:bg-[#083528] text-white px-4 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Plus size={16} />
                  <span>Add New Suit Piece</span>
                </button>
              </div>

              {/* Product Save & Publish Success Banner */}
              {productSaveSuccess && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-medium animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                  <span>{productSaveSuccess}</span>
                </div>
              )}

              {/* Product Search & Category Filter */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#e5ded6] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3 top-2.5 text-[#8c8275]" />
                  <input
                    type="text"
                    placeholder="Search suits by name, color, fabric..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden focus:border-[#0d4f3c]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="text-xs px-3 py-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden text-[#1e1b18]"
                  >
                    <option value="all">All Categories ({products.length})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products
                  .filter((p) => {
                    if (productCategoryFilter !== "all" && p.category !== productCategoryFilter) return false;
                    if (productSearchQuery.trim()) {
                      const q = productSearchQuery.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(q) ||
                        p.color.toLowerCase().includes(q) ||
                        p.fabricType.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-[#e5ded6] shadow-xs overflow-hidden flex flex-col group"
                    >
                      <div className="relative h-56 overflow-hidden bg-[#faf8f5]">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                          <span className="bg-[#0d4f3c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            {product.category}
                          </span>
                          {product.colorVariants && product.colorVariants.length > 1 && (
                            <span className="bg-amber-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                              {product.colorVariants.length} Colors
                            </span>
                          )}
                          {product.inStock === false && (
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                            📷 {product.images && product.images.length > 0 ? product.images.length : 1}/10
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-medium text-[#6b6257] mb-1">
                            <span>{product.fabricType || product.color}</span>
                            {product.colorVariants && product.colorVariants.length > 0 && (
                              <div className="flex items-center gap-1">
                                {product.colorVariants.slice(0, 5).map((cv, cIdx) => (
                                  <span
                                    key={cv.id || cIdx}
                                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                                    style={{ backgroundColor: cv.colorHex || "#0d4f3c" }}
                                    title={cv.colorName}
                                  />
                                ))}
                                {product.colorVariants.length > 5 && (
                                  <span className="text-[9px] text-[#8c8275]">+{product.colorVariants.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <h3 className="font-serif font-bold text-sm text-[#1e1b18] line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-[#6b6257] line-clamp-2 mt-1">
                            {product.description}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="font-serif font-bold text-base text-[#0d4f3c]">
                              {product.price}
                            </span>
                            <del className="text-xs text-[#8c8275]">{product.originalPrice}</del>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {product.savings}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#e5ded6] flex items-center justify-between">
                            <button
                              onClick={() => handleToggleProductStock(product)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                                product.inStock !== false
                                  ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-800 hover:bg-red-100"
                              }`}
                            >
                              {product.inStock !== false ? "● In Stock" : "○ Out of Stock"}
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedPaletteProductId(product.id);
                                  setSelectedPaletteVariantIndex(0);
                                  setActiveTab("colors");
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0d4f3c] bg-[#0d4f3c]/10 hover:bg-[#0d4f3c]/20 transition-colors"
                                title="Manage Color Palette & Photos"
                              >
                                <Palette size={13} />
                                <span>Palette ({product.colorVariants?.length || 1})</span>
                              </button>
                              <button
                                onClick={() => handleOpenProductModal(product)}
                                className="p-1.5 rounded-lg text-[#0d4f3c] hover:bg-[#0d4f3c]/10 transition-colors"
                                title="Edit Product"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Product Modal (Add / Edit) */}
              {isProductModalOpen && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-4 overflow-y-auto">
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                    onClick={() => setIsProductModalOpen(false)}
                  />

                  <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#e5ded6] overflow-hidden my-auto max-h-[96vh] sm:max-h-[90vh] flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-[#e5ded6] flex items-center justify-between bg-[#f7f4ef]">
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                          {editingProduct.id ? "Edit Suit Piece & Color Editions" : "Add New Handcrafted Suit Piece"}
                        </h3>
                        <p className="text-[11px] text-[#6b6257]">
                          Manage independent color options, dedicated photos, pricing, and details per color.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsProductModalOpen(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b6257] hover:text-black hover:bg-black/5"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                      {/* Product Form Error Banner */}
                      {productFormError && (
                        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between gap-2 text-xs shadow-xs animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0 text-red-600" />
                            <span className="font-medium">{productFormError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setProductFormError(null)}
                            className="text-red-500 hover:text-red-700 font-bold p-1 rounded-md hover:bg-red-100"
                            title="Dismiss error"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Master Piece Details */}
                      <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#e5ded6] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1e1b18] uppercase tracking-wider text-[11px]">
                            Suit Piece Essentials
                          </span>
                          <span className="text-[#8c8275] text-[11px]">
                            Applies across all color editions
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block font-bold text-[#1e1b18] mb-1">Product Title *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Rooh-e-Gulab Velvet Sharara Suit Set"
                              value={editingProduct.name || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                              className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:border-[#0d4f3c] focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[#1e1b18] mb-1">Category</label>
                            <select
                              value={editingProduct.category || categories[0]?.name}
                              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                              className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Color Variants Management Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="font-bold text-[#1e1b18] text-sm flex items-center gap-2">
                              <Palette size={16} className="text-[#0d4f3c]" />
                              Color Variants &amp; Independent Editions
                            </h4>
                            <p className="text-[11px] text-[#6b6257]">
                              Each color option has its own independent images, price, fabric, and description.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d4f3c] text-white rounded-lg font-bold text-xs hover:bg-[#083528] transition-colors shadow-xs"
                          >
                            <Plus size={14} /> Add Color Variant
                          </button>
                        </div>

                        {/* Variant Selection Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                          {editingProduct.colorVariants?.map((v, idx) => {
                            const isActive = idx === activeVariantIndex;
                            const countImgs = v.images?.length || (v.image ? 1 : 0);
                            return (
                              <div
                                key={v.id || idx}
                                className={`relative group shrink-0 flex items-center rounded-xl border transition-all ${
                                  isActive
                                    ? "bg-[#0d4f3c] text-white border-[#0d4f3c] shadow-sm"
                                    : "bg-white text-[#1e1b18] border-[#d6ccc2] hover:border-[#0d4f3c]/50"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setActiveVariantIndex(idx)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left"
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/50 shrink-0 shadow-2xs"
                                    style={{ backgroundColor: v.colorHex || "#0d4f3c" }}
                                  />
                                  <span>{v.colorName || `Variant ${idx + 1}`}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                      isActive ? "bg-white/20 text-white" : "bg-[#faf8f5] text-[#6b6257]"
                                    }`}
                                  >
                                    📷 {countImgs}
                                  </span>
                                </button>
                                {editingProduct.colorVariants && editingProduct.colorVariants.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveVariant(idx);
                                    }}
                                    className={`pr-2.5 pl-0.5 text-xs hover:text-red-300 ${
                                      isActive ? "text-white/70" : "text-[#8c8275] hover:text-red-600"
                                    }`}
                                    title="Delete this color variant"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Active Variant Detailed Editor Card */}
                        {activeVariant && (
                          <div className="bg-[#faf8f5] border-2 border-[#0d4f3c]/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between border-b border-[#e5ded6] pb-3 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                                  style={{ backgroundColor: activeVariant.colorHex || "#0d4f3c" }}
                                />
                                <span className="font-bold text-sm text-[#1e1b18]">
                                  Editing Variant #{activeVariantIndex + 1}: {activeVariant.colorName || "Color Option"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateVariant(activeVariantIndex)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-[#0d4f3c] bg-white border border-[#0d4f3c]/30 px-2.5 py-1 rounded-lg hover:bg-[#0d4f3c]/5"
                                  title="Duplicate this variant as a starting point"
                                >
                                  <Copy size={12} /> Duplicate
                                </button>
                                {activeVariantIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveVariant(activeVariantIndex, "left")}
                                    className="p-1 text-[#6b6257] bg-white border border-[#d6ccc2] rounded-lg hover:bg-white/80"
                                    title="Move Left (Make Primary)"
                                  >
                                    <ArrowLeft size={13} />
                                  </button>
                                )}
                                {editingProduct.colorVariants &&
                                  activeVariantIndex < editingProduct.colorVariants.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveVariant(activeVariantIndex, "right")}
                                      className="p-1 text-[#6b6257] bg-white border border-[#d6ccc2] rounded-lg hover:bg-white/80"
                                      title="Move Right"
                                    >
                                      <ArrowRight size={13} />
                                    </button>
                                  )}
                              </div>
                            </div>

                            {/* Color Name & Swatch Hex */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-[#1e1b18] mb-1">
                                  Color Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Royal Emerald, Dusty Rose, Midnight Navy"
                                  value={activeVariant.colorName || ""}
                                  onChange={(e) => updateActiveVariant({ colorName: e.target.value })}
                                  className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:border-[#0d4f3c] focus:outline-hidden"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#1e1b18] mb-1">
                                  Color Hex &amp; Swatch
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={activeVariant.colorHex || "#0d4f3c"}
                                    onChange={(e) => updateActiveVariant({ colorHex: e.target.value })}
                                    className="w-9 h-9 p-0.5 border border-[#d6ccc2] rounded-xl cursor-pointer bg-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#0d4f3c"
                                    value={activeVariant.colorHex || ""}
                                    onChange={(e) => updateActiveVariant({ colorHex: e.target.value })}
                                    className="w-28 text-xs p-2 bg-white border border-[#d6ccc2] rounded-xl font-mono focus:outline-hidden"
                                  />
                                  <div className="flex items-center gap-1 overflow-x-auto">
                                    {["#0d4f3c", "#9b2c2c", "#c5a059", "#1e3a8a", "#2d5a27", "#8b008b", "#1a1612", "#faf0e6"].map((hex) => (
                                      <button
                                        key={hex}
                                        type="button"
                                        onClick={() => updateActiveVariant({ colorHex: hex })}
                                        className="w-5 h-5 rounded-full border border-black/10 shrink-0 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: hex }}
                                        title={hex}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Pricing & Fabric */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block font-bold text-[#1e1b18] mb-1">Price (₹)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. ₹3,899"
                                  value={activeVariant.price || ""}
                                  onChange={(e) => updateActiveVariant({ price: e.target.value })}
                                  className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#1e1b18] mb-1">Original Price (₹)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. ₹5,499"
                                  value={activeVariant.originalPrice || ""}
                                  onChange={(e) => updateActiveVariant({ originalPrice: e.target.value })}
                                  className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#1e1b18] mb-1">Discount Tag</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Save 29%"
                                  value={activeVariant.savings || ""}
                                  onChange={(e) => updateActiveVariant({ savings: e.target.value })}
                                  className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#1e1b18] mb-1">Fabric Type</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Pure Chanderi Silk"
                                  value={activeVariant.fabricType || ""}
                                  onChange={(e) => updateActiveVariant({ fabricType: e.target.value })}
                                  className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                                />
                              </div>
                            </div>

                            {/* Description for this variant */}
                            <div>
                              <label className="block font-bold text-[#1e1b18] mb-1">
                                Description &amp; Specific Details for {activeVariant.colorName || "this color"}
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Details about this specific colorway, weave, matching dupatta or contrast styling..."
                                value={activeVariant.description || ""}
                                onChange={(e) => updateActiveVariant({ description: e.target.value })}
                                className="w-full text-xs p-2.5 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                              />
                            </div>

                            {/* Stock toggle for this variant */}
                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#1e1b18]">
                                <input
                                  type="checkbox"
                                  checked={activeVariant.inStock !== false}
                                  onChange={(e) => updateActiveVariant({ inStock: e.target.checked })}
                                  className="rounded text-[#0d4f3c]"
                                />
                                <span>This color edition ({activeVariant.colorName}) is currently In Stock</span>
                              </label>
                            </div>

                            {/* Independent Photos for this Color Variant */}
                            <div className="pt-2 border-t border-[#e5ded6]">
                              <div className="mb-2">
                                <div className="font-bold text-xs text-[#1e1b18] flex items-center justify-between">
                                  <span>
                                    📷 Photos for {activeVariant.colorName || "This Color"} (
                                    {activeVariant.images?.length || 0}/10)
                                  </span>
                                  <span className="text-[11px] text-[#0d4f3c] font-normal">
                                    Shown only when customer selects this color
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#6b6257] mt-0.5">
                                  Upload photos directly from your device. First photo will be the main cover for this color edition.
                                </p>
                              </div>
                              <ProductImageUploader
                                key={`variant-uploader-${editingProduct.id || "new"}-${activeVariant.id || activeVariantIndex}`}
                                images={
                                  activeVariant.images && activeVariant.images.length > 0
                                    ? activeVariant.images
                                    : activeVariant.image
                                    ? [
                                        activeVariant.image,
                                        ...(activeVariant.hoverImage && activeVariant.hoverImage !== activeVariant.image
                                          ? [activeVariant.hoverImage]
                                          : []),
                                      ]
                                    : []
                                }
                                onChange={(newImages) => {
                                  updateActiveVariant({
                                    images: newImages,
                                    image: newImages[0] || "",
                                    hoverImage: newImages[1] || newImages[0] || "",
                                  });
                                }}
                                productId={`${editingProduct.id || "prod"}-${activeVariant.id || activeVariantIndex}`}
                                productTitle={`${editingProduct.name || "Suit Piece"} - ${activeVariant.colorName}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer Actions */}
                      <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-[#e5ded6] flex items-center justify-between gap-2 flex-wrap z-20">
                        <div className="text-[11px] text-[#6b6257]">
                          Total {editingProduct.colorVariants?.length || 1} color edition(s) configured
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={savingProduct}
                            onClick={() => setIsProductModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-[#6b6257] hover:bg-[#faf8f5] rounded-xl disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingProduct}
                            className="px-6 py-2.5 text-xs font-bold bg-[#0d4f3c] text-white rounded-xl hover:bg-[#083528] transition-colors shadow-xs flex items-center gap-2 disabled:opacity-60"
                          >
                            {savingProduct ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Publishing to Database...</span>
                              </>
                            ) : (
                              <>
                                <Save size={14} />
                                <span>Save &amp; Publish</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: COLOR PALETTE & PHOTO STUDIO (Dedicated Option)
          ============================================================ */}
          {activeTab === "colors" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c] flex items-center gap-1.5">
                    <Palette size={14} />
                    <span>COLOR PALETTES &amp; MULTI-SHADE STUDIO</span>
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                    Product Color Palettes &amp; Photos
                  </h2>
                  <p className="text-xs text-[#6b6257] mt-0.5 max-w-2xl">
                    Add, edit, delete, and reorder color options for each suit piece. Each color option is independently
                    manageable with its own product photos, individual pricing, and fabric specs. When a customer selects
                    a color, the boutique displays the exact images for that color.
                  </p>
                </div>

                {activePaletteProduct && (
                  <button
                    onClick={() => handleSaveColorPalette(activePaletteProduct)}
                    disabled={paletteSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow self-start sm:self-auto shrink-0"
                  >
                    <Save size={14} />
                    <span>{paletteSaving ? "Publishing to Live Boutique..." : "Save & Publish"}</span>
                  </button>
                )}
              </div>

              {/* Success / Notification Banner */}
              {paletteSaveNotice && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-medium animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                  <span>{paletteSaveNotice}</span>
                </div>
              )}

              {/* Product Selector Bar */}
              <div className="bg-white border border-[#e5ded6] rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <label className="block text-xs font-bold text-[#1e1b18] mb-1.5">
                      Select Suit Piece to Manage Color Palette:
                    </label>
                    <select
                      value={selectedPaletteProductId || activePaletteProduct?.id || ""}
                      onChange={(e) => {
                        setSelectedPaletteProductId(e.target.value);
                        setSelectedPaletteVariantIndex(0);
                      }}
                      className="w-full text-xs font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3.5 py-2.5 text-[#1e1b18] focus:outline-none focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
                    >
                      {products.map((p) => {
                        const count = p.colorVariants?.length || 1;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} ({count} {count === 1 ? "color" : "colors"}) - {p.price}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {activePaletteProduct && (
                    <div className="flex items-center gap-3 bg-[#faf8f5] border border-[#e5ded6] rounded-xl p-2.5">
                      <img
                        src={
                          activePaletteProduct.images?.[0] ||
                          activePaletteProduct.image ||
                          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300"
                        }
                        alt={activePaletteProduct.name}
                        className="w-12 h-14 object-cover rounded-lg border border-[#e5ded6]"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300";
                        }}
                      />
                      <div className="text-xs">
                        <div className="font-serif font-bold text-[#1e1b18] line-clamp-1">
                          {activePaletteProduct.name}
                        </div>
                        <div className="text-[11px] text-[#6b6257] flex items-center gap-2 mt-0.5">
                          <span className="bg-[#e9e3da] px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#1e1b18]">
                            {activePaletteProduct.category}
                          </span>
                          <span className="font-bold text-[#0d4f3c]">{activePaletteProduct.price}</span>
                          <span>•</span>
                          <span className="text-[#0d4f3c] font-semibold">
                            {activePaletteVariants.length} Color {activePaletteVariants.length === 1 ? "Option" : "Options"}
                          </span>
                        </div>
                        <Link
                          to={`/product/${activePaletteProduct.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0d4f3c] hover:underline mt-1"
                        >
                          <span>Preview on live store</span>
                          <ExternalLink size={10} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Product Color Studio */}
              {activePaletteProduct && (
                <div className="space-y-5">
                  {/* Step 1: Color Palette Carousel & Swatches Tabs */}
                  <div className="bg-white border border-[#e5ded6] rounded-2xl p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5ded6]">
                      <div>
                        <h3 className="font-bold text-sm text-[#1e1b18] flex items-center gap-2">
                          <span>Available Color Options</span>
                          <span className="bg-[#0d4f3c]/10 text-[#0d4f3c] text-[11px] px-2 py-0.5 rounded-full font-semibold">
                            {activePaletteVariants.length} Active
                          </span>
                        </h3>
                        <p className="text-[11px] text-[#6b6257] mt-0.5">
                          Select any color below to manage its photos and details, or add a new color option.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePaletteAddColor(activePaletteProduct)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0d4f3c] text-white text-xs font-bold rounded-xl hover:bg-[#083528] transition-colors self-start sm:self-auto shadow-xs"
                      >
                        <Plus size={14} />
                        <span>Add Color Option</span>
                      </button>
                    </div>

                    {/* Color Swatch Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
                      {activePaletteVariants.map((variant, idx) => {
                        const isSelected = idx === selectedPaletteVariantIndex;
                        const photoCount = variant.images?.length || (variant.image ? 1 : 0);
                        const coverThumb =
                          variant.images?.[0] ||
                          variant.image ||
                          activePaletteProduct.images?.[0] ||
                          activePaletteProduct.image ||
                          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300";

                        return (
                          <div
                            key={variant.id || `palette-v-${idx}`}
                            onClick={() => setSelectedPaletteVariantIndex(idx)}
                            className={`cursor-pointer rounded-xl border p-3 transition-all relative ${
                              isSelected
                                ? "border-[#0d4f3c] bg-[#0d4f3c]/5 ring-2 ring-[#0d4f3c]/20 shadow-xs"
                                : "border-[#e5ded6] bg-[#faf8f5] hover:border-[#b88c29]/50 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Swatch & Thumbnail preview */}
                              <div className="relative shrink-0">
                                <img
                                  src={coverThumb}
                                  alt={variant.colorName}
                                  className="w-12 h-14 object-cover rounded-lg border border-[#e5ded6]"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300";
                                  }}
                                />
                                <span
                                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-xs"
                                  style={{ backgroundColor: variant.colorHex || "#0d4f3c" }}
                                  title={variant.colorHex}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-xs text-[#1e1b18] truncate">
                                    {variant.colorName || `Color #${idx + 1}`}
                                  </span>
                                  {idx === 0 && (
                                    <span className="text-[9px] font-bold bg-[#b88c29]/20 text-[#855e09] px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                      <Star size={8} className="fill-current" />
                                      <span>Cover</span>
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-bold text-[#0d4f3c] mt-0.5">
                                  {variant.price || activePaletteProduct.price}
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#6b6257]">
                                  <span className="flex items-center gap-0.5">
                                    <Camera size={10} />
                                    <span>{photoCount} {photoCount === 1 ? "photo" : "photos"}</span>
                                  </span>
                                  <span>•</span>
                                  <span
                                    className={`font-semibold ${
                                      variant.inStock !== false ? "text-emerald-700" : "text-red-700"
                                    }`}
                                  >
                                    {variant.inStock !== false ? "In Stock" : "Out of Stock"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Active Color Management Panel */}
                  {currentPaletteVariant && (
                    <div className="bg-white border border-[#e5ded6] rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
                      {/* Active Color Controls Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e5ded6]">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-full border-2 border-white shadow-md shrink-0"
                            style={{ backgroundColor: currentPaletteVariant.colorHex || "#0d4f3c" }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-bold text-base text-[#1e1b18]">
                                {currentPaletteVariant.colorName || `Color Edition #${selectedPaletteVariantIndex + 1}`}
                              </h4>
                              {selectedPaletteVariantIndex === 0 ? (
                                <span className="text-[10px] font-bold bg-[#b88c29] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Star size={10} className="fill-current" />
                                  <span>Primary Storefront Cover</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePaletteReorderColor(activePaletteProduct, selectedPaletteVariantIndex, 0)}
                                  className="text-[10px] font-bold text-[#b88c29] hover:underline flex items-center gap-1"
                                >
                                  <Star size={10} />
                                  <span>Make Primary Cover</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-[#6b6257]">
                              Hex: {currentPaletteVariant.colorHex || "#0d4f3c"} • Position #{selectedPaletteVariantIndex + 1} of {activePaletteVariants.length}
                            </p>
                          </div>
                        </div>

                        {/* Reorder and Delete Controls */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={selectedPaletteVariantIndex === 0}
                            onClick={() =>
                              handlePaletteReorderColor(
                                activePaletteProduct,
                                selectedPaletteVariantIndex,
                                selectedPaletteVariantIndex - 1
                              )
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold bg-[#faf8f5] border border-[#d6cec3] text-[#1e1b18] rounded-lg hover:bg-[#f0ebe3] disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Move color earlier in palette"
                          >
                            ← Move Left
                          </button>
                          <button
                            type="button"
                            disabled={selectedPaletteVariantIndex === activePaletteVariants.length - 1}
                            onClick={() =>
                              handlePaletteReorderColor(
                                activePaletteProduct,
                                selectedPaletteVariantIndex,
                                selectedPaletteVariantIndex + 1
                              )
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold bg-[#faf8f5] border border-[#d6cec3] text-[#1e1b18] rounded-lg hover:bg-[#f0ebe3] disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Move color later in palette"
                          >
                            Move Right →
                          </button>
                          <button
                            type="button"
                            disabled={activePaletteVariants.length <= 1}
                            onClick={() => handlePaletteDeleteColor(activePaletteProduct, selectedPaletteVariantIndex)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Delete this color option"
                          >
                            <Trash2 size={13} />
                            <span>Delete Color</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Dual Grid: Left = Color Specs, Right = Independent Photos & Store Preview */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Color Swatch, Identity, Pricing & Fabric */}
                        <div className="lg:col-span-6 space-y-4">
                          <h5 className="font-bold text-xs uppercase tracking-wider text-[#0d4f3c]">
                            1. Color Identity &amp; Pricing
                          </h5>

                          {/* Color Name & Hex */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Color Edition Name:
                              </label>
                              <input
                                type="text"
                                value={currentPaletteVariant.colorName || ""}
                                onChange={(e) =>
                                  handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                    colorName: e.target.value,
                                  })
                                }
                                placeholder="e.g. Royal Emerald, Mustard Zari"
                                className="w-full text-xs font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#1e1b18] focus:outline-none focus:border-[#0d4f3c]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Color Hex Code &amp; Picker:
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentPaletteVariant.colorHex || "#0d4f3c"}
                                  onChange={(e) =>
                                    handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                      colorHex: e.target.value,
                                    })
                                  }
                                  className="w-9 h-9 p-0.5 rounded-lg border border-[#d6cec3] cursor-pointer bg-white"
                                />
                                <input
                                  type="text"
                                  value={currentPaletteVariant.colorHex || ""}
                                  onChange={(e) =>
                                    handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                      colorHex: e.target.value,
                                    })
                                  }
                                  placeholder="#0d4f3c"
                                  className="flex-1 text-xs font-mono font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#1e1b18] focus:outline-none focus:border-[#0d4f3c]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quick Preset Luxury Indian Couture Colors */}
                          <div>
                            <label className="block text-[11px] font-bold text-[#6b6257] mb-1.5">
                              Quick Luxury Couture Presets:
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {LUXURY_PALETTE_PRESETS.map((preset) => (
                                <button
                                  key={preset.hex}
                                  type="button"
                                  onClick={() =>
                                    handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                      colorName: preset.name,
                                      colorHex: preset.hex,
                                    })
                                  }
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[#e5ded6] hover:border-[#0d4f3c] bg-white transition-all shadow-xs"
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: preset.hex }}
                                  />
                                  <span>{preset.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Pricing for this color */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#e5ded6]">
                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Selling Price (₹):
                              </label>
                              <input
                                type="text"
                                value={currentPaletteVariant.price || ""}
                                onChange={(e) =>
                                  handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                    price: e.target.value,
                                  })
                                }
                                placeholder="₹2,999"
                                className="w-full text-xs font-bold bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#0d4f3c] focus:outline-none focus:border-[#0d4f3c]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Original MRP (Strike):
                              </label>
                              <input
                                type="text"
                                value={currentPaletteVariant.originalPrice || ""}
                                onChange={(e) =>
                                  handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                    originalPrice: e.target.value,
                                  })
                                }
                                placeholder="₹4,499"
                                className="w-full text-xs font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#6b6257] focus:outline-none focus:border-[#0d4f3c]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Savings Pill:
                              </label>
                              <input
                                type="text"
                                value={currentPaletteVariant.savings || ""}
                                onChange={(e) =>
                                  handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                    savings: e.target.value,
                                  })
                                }
                                placeholder="Save 30%"
                                className="w-full text-xs font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#b88c29] focus:outline-none focus:border-[#0d4f3c]"
                              />
                            </div>
                          </div>

                          {/* Fabric & Stock */}
                          <div className="space-y-3 pt-2 border-t border-[#e5ded6]">
                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Fabric Type for {currentPaletteVariant.colorName}:
                              </label>
                              <input
                                type="text"
                                value={currentPaletteVariant.fabricType || ""}
                                onChange={(e) =>
                                  handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                    fabricType: e.target.value,
                                  })
                                }
                                placeholder="e.g. Pure Handloom Chanderi Silk with Zari Dupatta"
                                className="w-full text-xs font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#1e1b18] focus:outline-none focus:border-[#0d4f3c]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[#1e1b18] mb-1">
                                Color Edition Description &amp; Weave Notes:
                              </label>
                              <textarea
                                rows={2}
                                value={currentPaletteVariant.description || ""}
                                onChange={(e) =>
                                  handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Describe the shade nuances, embroidery highlights, or festive occasion suitability for this color..."
                                className="w-full text-xs font-medium bg-[#faf8f5] border border-[#d6cec3] rounded-xl px-3 py-2 text-[#1e1b18] focus:outline-none focus:border-[#0d4f3c]"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1e1b18]">
                                <input
                                  type="checkbox"
                                  checked={currentPaletteVariant.inStock !== false}
                                  onChange={(e) =>
                                    handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                      inStock: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 text-[#0d4f3c] rounded border-[#d6cec3] focus:ring-[#0d4f3c]"
                                />
                                <span>This color edition ({currentPaletteVariant.colorName}) is currently In Stock</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Dedicated Photos for this Color & Live Customer Preview */}
                        <div className="lg:col-span-6 space-y-4">
                          <h5 className="font-bold text-xs uppercase tracking-wider text-[#0d4f3c] flex items-center justify-between">
                            <span>2. Dedicated Photos for {currentPaletteVariant.colorName || "This Color"}</span>
                            <span className="text-[11px] text-[#0d4f3c] lowercase font-semibold">
                              ({currentPaletteVariant.images?.length || (currentPaletteVariant.image ? 1 : 0)}/10 photos)
                            </span>
                          </h5>

                          <p className="text-xs text-[#6b6257]">
                            Photos uploaded here are linked exclusively to the{" "}
                            <strong className="text-[#1e1b18]">{currentPaletteVariant.colorName}</strong> edition.
                            When shoppers click this color swatch on the store, these exact photos will be shown.
                            Existing photos are preserved and never lost.
                          </p>

                          {/* Image Uploader */}
                          <div className="bg-[#faf8f5] border border-[#e5ded6] rounded-xl p-3.5">
                            <ProductImageUploader
                              images={
                                currentPaletteVariant.images && currentPaletteVariant.images.length > 0
                                  ? currentPaletteVariant.images
                                  : currentPaletteVariant.image
                                  ? [
                                      currentPaletteVariant.image,
                                      ...(currentPaletteVariant.hoverImage &&
                                      currentPaletteVariant.hoverImage !== currentPaletteVariant.image
                                        ? [currentPaletteVariant.hoverImage]
                                        : []),
                                    ]
                                  : []
                              }
                              onChange={(newImages) => {
                                handlePaletteUpdateColor(activePaletteProduct.id, selectedPaletteVariantIndex, {
                                  images: newImages,
                                  image: newImages[0] || "",
                                  hoverImage: newImages[1] || newImages[0] || "",
                                });
                              }}
                              productId={`${activePaletteProduct.id}-${currentPaletteVariant.id || selectedPaletteVariantIndex}`}
                              productTitle={`${activePaletteProduct.name} (${currentPaletteVariant.colorName})`}
                            />
                          </div>

                          {/* Customer Storefront Live Simulation Card */}
                          <div className="pt-3 border-t border-[#e5ded6]">
                            <h6 className="text-xs font-bold text-[#1e1b18] mb-2 flex items-center gap-1.5">
                              <Eye size={13} className="text-[#0d4f3c]" />
                              <span>Live Customer Storefront Simulation</span>
                            </h6>

                            <div className="max-w-xs bg-white border border-[#e5ded6] rounded-xl overflow-hidden shadow-sm p-3">
                              <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-[#faf8f5] mb-2">
                                <img
                                  src={
                                    currentPaletteVariant.images?.[0] ||
                                    currentPaletteVariant.image ||
                                    activePaletteProduct.images?.[0] ||
                                    activePaletteProduct.image ||
                                    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300"
                                  }
                                  alt={currentPaletteVariant.colorName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300";
                                  }}
                                />
                                <span className="absolute top-2 left-2 bg-[#0d4f3c] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {currentPaletteVariant.colorName}
                                </span>
                              </div>

                              <div className="text-xs font-serif font-bold text-[#1e1b18] line-clamp-1">
                                {activePaletteProduct.name}
                              </div>
                              <div className="text-[11px] text-[#6b6257] mt-0.5">
                                {currentPaletteVariant.fabricType || activePaletteProduct.fabricType}
                              </div>

                              <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="font-bold text-sm text-[#0d4f3c]">
                                  {currentPaletteVariant.price || activePaletteProduct.price}
                                </span>
                                {currentPaletteVariant.originalPrice && (
                                  <span className="text-xs text-[#6b6257] line-through">
                                    {currentPaletteVariant.originalPrice}
                                  </span>
                                )}
                              </div>

                              {/* Swatches preview */}
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#f0ebe3]">
                                <span className="text-[10px] text-[#6b6257]">Color:</span>
                                <div className="flex items-center gap-1">
                                  {activePaletteVariants.map((v, i) => (
                                    <span
                                      key={i}
                                      className={`w-3.5 h-3.5 rounded-full border ${
                                        i === selectedPaletteVariantIndex
                                          ? "ring-2 ring-[#0d4f3c] border-white scale-110"
                                          : "border-black/20 opacity-70"
                                      }`}
                                      style={{ backgroundColor: v.colorHex || "#0d4f3c" }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Save & Add Button Bar */}
                      <div className="pt-4 border-t border-[#e5ded6] flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-[#6b6257] flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-700" />
                          <span>
                            Saved color palettes &amp; photos persist across sessions, refreshes, and deployments.
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-stretch sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handlePaletteAddColor(activePaletteProduct)}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-[#0d4f3c] bg-[#0d4f3c]/10 hover:bg-[#0d4f3c]/20 rounded-xl transition-colors"
                          >
                            + Add Another Color
                          </button>
                          <button
                            type="button"
                            disabled={paletteSaving}
                            onClick={() => handleSaveColorPalette(activePaletteProduct)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0d4f3c] text-white text-xs font-bold rounded-xl hover:bg-[#083528] transition-colors shadow-xs"
                          >
                            <Save size={14} />
                            <span>{paletteSaving ? "Publishing to Live Boutique..." : "Save & Publish"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB 4: CATEGORIES MANAGEMENT
          ============================================================ */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                  TAXONOMY &amp; COLLECTIONS
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                  Categories &amp; Seasonal Drops
                </h2>
                <p className="text-xs text-[#6b6257]">
                  Configure storefront category navigation pills and filter tabs.
                </p>
              </div>

              {/* Add Category Form */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs">
                <h3 className="font-serif font-bold text-sm text-[#1e1b18] mb-3">
                  Add New Category
                </h3>
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Category Name (e.g. Organza Silks)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} />
                    <span>Add Category</span>
                  </button>
                </form>
              </div>

              {/* Category Cards */}
              <div className="bg-white rounded-2xl border border-[#e5ded6] shadow-xs divide-y divide-[#e8dfd8]">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#f2ece4] text-[#8c8275] text-xs font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <strong className="font-serif text-sm text-[#1e1b18] block">{cat.name}</strong>
                        <span className="text-xs text-[#6b6257]">{cat.description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-[#0d4f3c]/10 text-[#0d4f3c] font-bold px-2.5 py-0.5 rounded-full">
                        Active on Storefront
                      </span>
                      {cat.name !== "All Collections" && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete category"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: MEDIA & IMAGES REPOSITORY
          ============================================================ */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                  HIGH-RESOLUTION ASSETS
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                  Media &amp; Images Management
                </h2>
                <p className="text-xs text-[#6b6257]">
                  Upload, preview, optimize, and remove suit photography and banners with real-time cloud persistence.
                </p>
              </div>

              <MediaManager />
            </div>
          )}

          {/* ============================================================
              TAB: USER ACCOUNTS & PATRONS
          ============================================================ */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                  PATRON CRM &amp; ACCOUNTS
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                  User Accounts &amp; Customer Management
                </h2>
                <p className="text-xs text-[#6b6257]">
                  Manage registered store patrons, customer tiers, account statuses, and credentials securely.
                </p>
              </div>

              <UserAccountsManager />
            </div>
          )}

          {/* ============================================================
              TAB 5: HERO SLIDER & ANNOUNCEMENT CMS
          ============================================================ */}
          {activeTab === "banners" && siteContent && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                    VISUAL CURATION
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                    Hero Slider &amp; Announcement Ribbon
                  </h2>
                  <p className="text-xs text-[#6b6257]">
                    Edit banner slides, promotional tags, and the top marquee ribbon without touching code.
                  </p>
                </div>

                <button
                  onClick={handleSaveCMSContent}
                  disabled={cmsSaving}
                  className="inline-flex items-center gap-2 text-xs font-bold bg-[#0d4f3c] hover:bg-[#083528] text-white px-5 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Save size={15} />
                  <span>{cmsSaving ? "Publishing Live..." : "Save & Publish"}</span>
                </button>
              </div>

              {cmsSaveNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{cmsSaveNotice}</span>
                </div>
              )}

              {/* Announcement Bar Settings */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                    Top Announcement Bar
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteContent.announcementVisible}
                      onChange={(e) =>
                        setSiteContent({ ...siteContent, announcementVisible: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span>Visible on Website</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b6257] uppercase mb-1">
                      Announcement Ribbon Text
                    </label>
                    <input
                      type="text"
                      value={siteContent.announcementText}
                      onChange={(e) =>
                        setSiteContent({ ...siteContent, announcementText: e.target.value })
                      }
                      className="w-full text-xs p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#6b6257] uppercase mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={siteContent.announcementCta}
                      onChange={(e) =>
                        setSiteContent({ ...siteContent, announcementCta: e.target.value })
                      }
                      className="w-full text-xs p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Hero Slider Editor */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                      Hero Carousel Slides ({siteContent.heroSlides.length})
                    </h3>
                    <p className="text-xs text-[#6b6257]">
                      Customize the prominent banners displayed when guests enter the boutique.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {siteContent.heroSlides.map((slide, sIndex) => (
                    <div
                      key={sIndex}
                      className="p-4 rounded-xl border border-[#e5ded6] bg-[#faf8f5] space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[#e5ded6] pb-2">
                        <strong className="font-serif text-sm text-[#0d4f3c]">
                          Slide #{sIndex + 1} · {slide.collection}
                        </strong>
                        <span className="text-[11px] text-[#8c8275]">{slide.season}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Eyebrow Tag
                          </label>
                          <input
                            type="text"
                            value={slide.eyebrow}
                            onChange={(e) => {
                              const updated = [...siteContent.heroSlides];
                              updated[sIndex] = { ...slide, eyebrow: e.target.value };
                              setSiteContent({ ...siteContent, heroSlides: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#d6ccc2] rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Collection Subheading
                          </label>
                          <input
                            type="text"
                            value={slide.collection}
                            onChange={(e) => {
                              const updated = [...siteContent.heroSlides];
                              updated[sIndex] = { ...slide, collection: e.target.value };
                              setSiteContent({ ...siteContent, heroSlides: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#d6ccc2] rounded-lg"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Hero Main Headline
                          </label>
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => {
                              const updated = [...siteContent.heroSlides];
                              updated[sIndex] = { ...slide, title: e.target.value };
                              setSiteContent({ ...siteContent, heroSlides: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#d6ccc2] rounded-lg"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Description Paragraph
                          </label>
                          <textarea
                            rows={2}
                            value={slide.description}
                            onChange={(e) => {
                              const updated = [...siteContent.heroSlides];
                              updated[sIndex] = { ...slide, description: e.target.value };
                              setSiteContent({ ...siteContent, heroSlides: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#d6ccc2] rounded-lg"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Slide Photo (Direct Device Upload)
                          </label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-2.5 rounded-xl border border-[#d6ccc2]">
                            {slide.image && (
                              <img
                                src={slide.image}
                                alt="Slide preview"
                                className="w-16 h-16 object-cover rounded-lg border border-[#e5ded6] shrink-0"
                              />
                            )}
                            <div className="flex-1 space-y-1">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0d4f3c] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#083528] transition-colors">
                                <Upload size={13} />
                                <span>Upload Slide Photo From Device</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const optimized = await optimizeImageFile(file);
                                      await persistAssetToFirestore(optimized);
                                      const updated = [...siteContent.heroSlides];
                                      updated[sIndex] = { ...slide, image: optimized.url };
                                      setSiteContent({ ...siteContent, heroSlides: updated });
                                    } catch (err) {
                                      console.error("Slide upload error:", err);
                                      alert("Failed to upload slide image from device.");
                                    }
                                  }}
                                />
                              </label>
                              <p className="text-[10px] text-[#6b6257]">
                                High-resolution photo is compressed and saved securely.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Button CTA Label
                          </label>
                          <input
                            type="text"
                            value={slide.ctaText || "Explore Festive Edit"}
                            onChange={(e) => {
                              const updated = [...siteContent.heroSlides];
                              updated[sIndex] = { ...slide, ctaText: e.target.value };
                              setSiteContent({ ...siteContent, heroSlides: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#d6ccc2] rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#6b6257] uppercase mb-1">
                            Caption Tag
                          </label>
                          <input
                            type="text"
                            value={slide.caption}
                            onChange={(e) => {
                              const updated = [...siteContent.heroSlides];
                              updated[sIndex] = { ...slide, caption: e.target.value };
                              setSiteContent({ ...siteContent, heroSlides: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#d6ccc2] rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 6: ATELIER & STORE CONTENT CMS
          ============================================================ */}
          {activeTab === "content" && siteContent && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                    TEXT &amp; CONTACT CMS
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                    Atelier Story, Contact &amp; Footer
                  </h2>
                  <p className="text-xs text-[#6b6257]">
                    Update contact phone, concierge WhatsApp, Surat studio address, and brand story.
                  </p>
                </div>

                <button
                  onClick={handleSaveCMSContent}
                  disabled={cmsSaving}
                  className="inline-flex items-center gap-2 text-xs font-bold bg-[#0d4f3c] hover:bg-[#083528] text-white px-5 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Save size={15} />
                  <span>{cmsSaving ? "Publishing Live..." : "Save Content Changes"}</span>
                </button>
              </div>

              {cmsSaveNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{cmsSaveNotice}</span>
                </div>
              )}

              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Atelier Concierge Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Customer Care Phone
                    </label>
                    <input
                      type="text"
                      value={siteContent.contactPhone}
                      onChange={(e) => setSiteContent({ ...siteContent, contactPhone: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Concierge WhatsApp (with Country Code)
                    </label>
                    <input
                      type="text"
                      value={siteContent.whatsappNumber}
                      onChange={(e) => setSiteContent({ ...siteContent, whatsappNumber: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Customer Support Email
                    </label>
                    <input
                      type="email"
                      value={siteContent.contactEmail}
                      onChange={(e) => setSiteContent({ ...siteContent, contactEmail: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Atelier City / Origin
                    </label>
                    <input
                      type="text"
                      value={siteContent.atelierCity}
                      onChange={(e) => setSiteContent({ ...siteContent, atelierCity: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Brand Story &amp; Footer Notes
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Main Brand Tagline
                    </label>
                    <input
                      type="text"
                      value={siteContent.brandTagline}
                      onChange={(e) => setSiteContent({ ...siteContent, brandTagline: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Brand Story &amp; Heritage Paragraph
                    </label>
                    <textarea
                      rows={3}
                      value={siteContent.brandDescription}
                      onChange={(e) => setSiteContent({ ...siteContent, brandDescription: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Footer Copyright Text
                    </label>
                    <input
                      type="text"
                      value={siteContent.footerNote}
                      onChange={(e) => setSiteContent({ ...siteContent, footerNote: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Catalog Section Heading CMS */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Catalog Section Titles &amp; Subtitle
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Catalog Section Heading
                    </label>
                    <input
                      type="text"
                      value={siteContent.catalogTitle || "Curated Boutique Catalog"}
                      onChange={(e) => setSiteContent({ ...siteContent, catalogTitle: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Catalog Section Subtitle
                    </label>
                    <input
                      type="text"
                      value={siteContent.catalogSubtitle || "Handcrafted pure fabrics, regal Alia silhouettes, and bespoke unstitched lengths"}
                      onChange={(e) => setSiteContent({ ...siteContent, catalogSubtitle: e.target.value })}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Links CMS */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                      Storefront Header Navigation Menu
                    </h3>
                    <p className="text-xs text-[#6b6257]">
                      Manage menu links shown in the top navigation bar of the store.
                    </p>
                  </div>
                </div>

                {/* Existing Nav Links */}
                <div className="space-y-2">
                  {(siteContent.navLinks || defaultSiteContent.navLinks).map((navItem, idx) => (
                    <div
                      key={navItem.id || idx}
                      className="flex items-center gap-2 bg-[#faf8f5] p-2.5 rounded-xl border border-[#e5ded6]"
                    >
                      <span className="text-xs font-mono text-[#8c8275] w-6 text-center">{idx + 1}.</span>
                      <input
                        type="text"
                        value={navItem.label}
                        onChange={(e) => {
                          const currentLinks = [...(siteContent.navLinks || defaultSiteContent.navLinks)];
                          currentLinks[idx] = { ...currentLinks[idx], label: e.target.value };
                          setSiteContent({ ...siteContent, navLinks: currentLinks });
                        }}
                        className="flex-1 p-1.5 text-xs bg-white border border-[#d6ccc2] rounded-lg"
                        placeholder="Link Label (e.g. All Sarees)"
                      />
                      <input
                        type="text"
                        value={navItem.href}
                        onChange={(e) => {
                          const currentLinks = [...(siteContent.navLinks || defaultSiteContent.navLinks)];
                          currentLinks[idx] = { ...currentLinks[idx], href: e.target.value };
                          setSiteContent({ ...siteContent, navLinks: currentLinks });
                        }}
                        className="flex-1 p-1.5 text-xs bg-white border border-[#d6ccc2] rounded-lg font-mono text-[11px]"
                        placeholder="Target (e.g. #catalog or category:sarees)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const currentLinks = (siteContent.navLinks || defaultSiteContent.navLinks).filter((_, i) => i !== idx);
                          setSiteContent({ ...siteContent, navLinks: currentLinks });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Nav Link */}
                <div className="pt-2 border-t border-[#f0eae1] flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="text"
                    placeholder="New link label (e.g. Festive Kurti Sets)"
                    value={newNavLabel}
                    onChange={(e) => setNewNavLabel(e.target.value)}
                    className="flex-1 text-xs p-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl w-full"
                  />
                  <input
                    type="text"
                    placeholder="Target href (e.g. #catalog or category:kurti-sets)"
                    value={newNavHref}
                    onChange={(e) => setNewNavHref(e.target.value)}
                    className="flex-1 text-xs p-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl w-full font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newNavLabel.trim() || !newNavHref.trim()) return;
                      const currentLinks = [...(siteContent.navLinks || defaultSiteContent.navLinks)];
                      currentLinks.push({
                        id: `nav_${Date.now()}`,
                        label: newNavLabel.trim(),
                        href: newNavHref.trim(),
                      });
                      setSiteContent({ ...siteContent, navLinks: currentLinks });
                      setNewNavLabel("");
                      setNewNavHref("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0d4f3c] text-white px-3.5 py-2 rounded-xl hover:bg-[#083528] shrink-0"
                  >
                    <Plus size={14} />
                    <span>Add Link</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 7: STORE SETTINGS & SECURE CREDENTIALS CMS
          ============================================================ */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#0d4f3c]">
                  GOVERNANCE &amp; SECURITY
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#1e1b18]">
                  Store Settings &amp; Admin Credentials
                </h2>
                <p className="text-xs text-[#6b6257]">
                  Manage administrator credentials, verify database persistence, and audit system status.
                </p>
              </div>

              {/* Status & Connection Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0eae1]">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#1e1b18] flex items-center gap-2">
                      <Shield size={18} className="text-[#0d4f3c]" />
                      <span>Live Production Database</span>
                    </h3>
                    <p className="text-xs text-[#6b6257]">
                      Google Cloud Firestore managed persistence instance
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected &amp; Synchronized</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#faf8f5] p-3 rounded-xl border border-[#e5ded6]">
                    <span className="text-[10px] uppercase font-bold text-[#8c8275] block mb-1">
                      Active Administrator
                    </span>
                    <span className="font-bold text-[#1e1b18] text-sm">
                      {currentAdminName}
                    </span>
                  </div>

                  <div className="bg-[#faf8f5] p-3 rounded-xl border border-[#e5ded6]">
                    <span className="text-[10px] uppercase font-bold text-[#8c8275] block mb-1">
                      Domain Independence
                    </span>
                    <span className="font-bold text-emerald-700 text-sm">
                      Domain Agnostic
                    </span>
                    <p className="text-[10px] text-[#8c8275] mt-0.5">
                      Always accessible at /admin on any custom domain.
                    </p>
                  </div>

                  <div className="bg-[#faf8f5] p-3 rounded-xl border border-[#e5ded6]">
                    <span className="text-[10px] uppercase font-bold text-[#8c8275] block mb-1">
                      Orders Isolation
                    </span>
                    <span className="font-bold text-[#0d4f3c] text-sm">
                      Clean Database ({realOrders.length} Real Orders)
                    </span>
                    <p className="text-[10px] text-[#8c8275] mt-0.5">
                      Zero mock or test orders in production queue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Change Credentials Form */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded6] shadow-xs space-y-4">
                <div className="border-b border-[#f0eae1] pb-3">
                  <h3 className="font-serif font-bold text-base text-[#1e1b18] flex items-center gap-2">
                    <Key size={18} className="text-[#d4af37]" />
                    <span>Change Admin Login Credentials</span>
                  </h3>
                  <p className="text-xs text-[#6b6257]">
                    Update your admin username and password. Changes take effect immediately and are saved directly to Firestore.
                  </p>
                </div>

                {credMessage && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                      credMessage.type === "success"
                        ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
                        : "bg-red-50 border border-red-300 text-red-800"
                    }`}
                  >
                    {credMessage.type === "success" ? (
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                    )}
                    <span>{credMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangeCredentials} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Current Password (Required for verification)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current master password"
                      value={credCurrentPassword}
                      onChange={(e) => setCredCurrentPassword(e.target.value)}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                        New Admin Username
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. house of shriya"
                        value={credNewUsername}
                        onChange={(e) => setCredNewUsername(e.target.value)}
                        className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                        New Password (Min 6 chars)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={credNewPassword}
                        onChange={(e) => setCredNewPassword(e.target.value)}
                        className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#6b6257] uppercase mb-1 text-[10px]">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={credConfirmPassword}
                      onChange={(e) => setCredConfirmPassword(e.target.value)}
                      className="w-full p-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-xl text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={credSubmitting}
                    className="inline-flex items-center gap-2 text-xs font-bold bg-[#0d4f3c] hover:bg-[#083528] text-white px-5 py-2.5 rounded-xl shadow-md transition-colors disabled:opacity-60"
                  >
                    <Save size={15} />
                    <span>{credSubmitting ? "Saving to Database..." : "Update Admin Credentials"}</span>
                  </button>
                </form>

                {/* Initial credentials reminder */}
                <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e5ded6] text-xs space-y-1 text-[#6b6257]">
                  <strong className="text-[#1e1b18] block text-[11px]">Credential Security &amp; Encryption</strong>
                  <p>
                    Passwords are salted with a cryptographic hex salt and digested using 256-bit SHA algorithms before persisting in Firestore. If you ever update credentials, the change applies immediately to all future logins.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
