import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  updateProfile,
} from "firebase/auth";
import { db, auth } from "../lib/firebase";
import {
  Product,
  ColorVariant,
  Order,
  OrderStatus,
  SiteContent,
  CategoryItem,
  HeroSlide,
  CustomerProfile,
  SavedAddress,
  AtelierBooking,
} from "../types";
import { products as defaultProducts } from "../data/products";
import savedSiteContentJson from "../data/siteContent.json";
import savedCategoriesJson from "../data/categories.json";

export const defaultSiteContent: SiteContent = {
  announcementText: "Complimentary Bespoke Shipping Across India • Handcrafted Unstitched Heirlooms",
  announcementCta: "Shop Festive Edits",
  announcementVisible: true,
  brandTagline: "Heirloom Indian Couture, Reimagined for the Modern Connoisseur",
  brandDescription:
    "Rooted in centuries-old artisanal traditions of Varanasi, Chanderi, and Bengal. Every yard of silk tells an untold tale of heritage weaving, resham zari hand embroidery, and regal silhouette artistry.",
  contactPhone: "+91 98765 43210",
  contactEmail: "care@houseofshriya.com",
  whatsappNumber: "+91 98765 43210",
  atelierCity: "New Delhi & Varanasi",
  heroSlides: [
    {
      eyebrow: "Autumn / Winter 2026",
      number: "01",
      collection: "The Royal Awadh Edit",
      title: "Handcrafted Zari Silk & Velvet Ensembles",
      description:
        "Woven with 24-karat electroplated gold zari thread on pure mulberry silk. Designed for wedding ceremonies, royal sangeets, and unforgettable grand soirees.",
      image:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&q=85&auto=format&fit=crop",
      season: "Festive Heirloom 2026",
      caption: "Pure Banarasi Katan Silk Unstitched Ensemble with Handcrafted Meenakari Borders",
      mood: "Majestic • Timeless • Opulent",
      ctaText: "Explore Collection",
      ctaTarget: "#catalog",
    },
    {
      eyebrow: "The Chanderi Series",
      number: "02",
      collection: "Noor-E-Subah",
      title: "Featherlight Tissue & Pure Chanderi Silks",
      description:
        "Gossamer-light weaves crafted from pure munga silk and silver zari tissue. Luminous, airy, and steeped in delicate pastel sophistication.",
      image:
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1600&q=85&auto=format&fit=crop",
      season: "Day Soiree & Cocktail 2026",
      caption: "Hand-block printed tissue silk dupatta with scalloped zardozi hems",
      mood: "Subtle • Radiant • Aristocratic",
      ctaText: "Discover Chanderi",
      ctaTarget: "#catalog",
    },
  ],
  features: [
    {
      title: "100% Pure Silkmark Certified",
      text: "Every piece arrives with authentic Silk Mark India certification guaranteeing fiber purity.",
      iconName: "ShieldCheck",
    },
    {
      title: "Bespoke Lengths for Custom Tailoring",
      text: "Generous fabric cuts designed for personalized tailoring from size XS to 5XL.",
      iconName: "Sparkles",
    },
    {
      title: "Direct from Varanasi Master Weavers",
      text: "Eliminating intermediaries to directly support heritage artisan families.",
      iconName: "Crown",
    },
    {
      title: "Pan-India Complimentary Insured Delivery",
      text: "Tamper-evident luxury packaging delivered within 2-4 business days.",
      iconName: "Truck",
    },
  ],
  footerNote: "House of Shriya © 2026. All rights reserved. Handcrafted with reverence in India.",
  catalogTitle: "Heirloom Silks & Festive Ensembles",
  catalogSubtitle: "Curated unstitched luxury fabrics and handwoven silhouettes",
  navLinks: [
    { id: "nav_all", label: "All Collections", href: "#catalog" },
    { id: "nav_banarasi", label: "Banarasi Silks", href: "#catalog" },
    { id: "nav_chanderi", label: "Chanderi Weaves", href: "#catalog" },
    { id: "nav_festive", label: "Festive Ensembles", href: "#catalog" },
    { id: "nav_heritage", label: "Our Story", href: "/our-story" },
    { id: "nav_craft", label: "Craftsmanship", href: "/craftsmanship" },
  ],
  ...(savedSiteContentJson as Partial<SiteContent>),
};

export const defaultCategories: CategoryItem[] = (savedCategoriesJson as CategoryItem[]) || [
  { id: "cat-all", name: "All Ensembles", slug: "all", description: "Complete artisanal catalog", itemCount: 12, sortOrder: 0 },
  { id: "cat-banarasi", name: "Banarasi Silk", slug: "banarasi-silk", description: "Heavy bridal and festive silks", itemCount: 5, sortOrder: 1 },
  { id: "cat-chanderi", name: "Chanderi", slug: "chanderi", description: "Lightweight summer tissue silks", itemCount: 3, sortOrder: 2 },
  { id: "cat-organza", name: "Organza", slug: "organza", description: "Embroidered sheer silks", itemCount: 2, sortOrder: 3 },
  { id: "cat-chikankari", name: "Chikankari", slug: "chikankari", description: "Hand-embroidered Lucknowi work", itemCount: 2, sortOrder: 4 },
];

const SITE_CONTENT_DOC = "main";
const SITE_CONTENT_CACHE_KEY = "hos_site_content_cache";
const PRODUCTS_CACHE_KEY = "hos_products_cache";
const CATEGORIES_CACHE_KEY = "hos_categories_cache";
const ORDERS_CACHE_KEY = "hos_orders";

/* ============================================================
   PRODUCT VARIANT NORMALIZATION & CACHING
============================================================ */

export function ensureProductVariants(product: any): Product {
  const primaryImg = product.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
  const hoverImg = product.hoverImage || primaryImg;

  let variants: ColorVariant[] = [];
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    variants = product.colorVariants.map((v: any, idx: number) => {
      // If idx === 0 (the primary variant), ensure it strictly matches product.image & hoverImage
      const vImages = idx === 0 && product.image
        ? [product.image, product.hoverImage || product.image].filter(Boolean)
        : (Array.isArray(v.images) && v.images.length > 0
            ? v.images.filter(Boolean)
            : [v.image || primaryImg, v.hoverImage || hoverImg].filter(Boolean));

      return {
        id: v.id || `var-${product.id || "prod"}-${idx + 1}`,
        colorName: v.colorName || product.color || "Royal Emerald",
        colorHex: v.colorHex || product.colorHex || "#0d4f3c",
        price: v.price || product.price || "₹2,999",
        originalPrice: v.originalPrice || product.originalPrice || "₹4,499",
        savings: v.savings || product.savings || "Save 33%",
        description: v.description || product.description || "",
        fabricType: v.fabricType || product.fabricType || "Pure Silk",
        images: vImages,
        image: vImages[0] || (idx === 0 ? primaryImg : v.image || primaryImg),
        hoverImage: vImages[1] || vImages[0] || (idx === 0 ? hoverImg : v.hoverImage || hoverImg),
        inStock: v.inStock !== false,
      };
    });
  } else {
    const galleryImgs = Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter(Boolean)
      : [primaryImg, hoverImg].filter(Boolean);
    variants = [
      {
        id: `var-${product.id || "prod"}-primary`,
        colorName: product.color || "Classic",
        colorHex: product.colorHex || "#0d4f3c",
        price: product.price || "₹2,999",
        originalPrice: product.originalPrice || "₹4,499",
        savings: product.savings || "Save 33%",
        description: product.description || "",
        fabricType: product.fabricType || "Pure Silk",
        images: galleryImgs,
        image: galleryImgs[0] || primaryImg,
        hoverImage: galleryImgs[1] || galleryImgs[0] || hoverImg,
        inStock: product.inStock !== false,
      },
    ];
  }

  const cleanImages = Array.isArray(product.images) && product.images.length > 0 && product.images[0] === primaryImg
    ? product.images.filter(Boolean)
    : [primaryImg, hoverImg].filter(Boolean);

  return {
    ...product,
    image: primaryImg,
    hoverImage: hoverImg,
    images: cleanImages,
    colorVariants: variants,
    sizes: product.sizes || ["Unstitched Fabric (5.5m + 1m Blouse Piece)"],
    inStock: product.inStock !== false,
  };
}

export function getCachedProducts(): Product[] {
  try {
    const saved = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureProductVariants);
      }
    }
  } catch {}
  return defaultProducts.map(ensureProductVariants);
}

export function cacheProductsLocally(prods: Product[]) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(prods));
  } catch (err) {
    try {
      // If local storage is full, strip massive base64 payloads to fallback image rather than corrupting the URL string
      const lightweight = prods.map((p) => ({
        ...p,
        image: p.image?.startsWith("data:")
          ? "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"
          : p.image,
        images: Array.isArray(p.images)
          ? p.images.map((img) =>
              img?.startsWith("data:")
                ? "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"
                : img
            )
          : p.images,
      }));
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(lightweight));
    } catch {}
  }
}

export function getCachedCategories(): CategoryItem[] {
  try {
    const saved = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultCategories;
}

/* ============================================================
   CONTENT & CATALOG SUBSCRIPTIONS (CLIENT-SIDE)
============================================================ */

export function subscribeSiteContent(callback: (content: SiteContent) => void): () => void {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) callback({ ...defaultSiteContent, ...parsed });
    } else {
      callback(defaultSiteContent);
    }
  } catch {
    callback(defaultSiteContent);
  }

  // Real-time custom event listener for instantaneous UI updates
  const handleContentUpdate = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (customEvt.detail) {
      callback(customEvt.detail);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("hos-content-updated", handleContentUpdate);
  }

  // Load from server API endpoint first with cache buster
  fetch(`/api/site-content?v=${Date.now()}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((serverData) => {
      if (serverData && (serverData.heroSlides || Object.keys(serverData).length > 0)) {
        const merged = { ...defaultSiteContent, ...serverData };
        try {
          localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
        } catch {}
        callback(merged);
        return;
      }
      // Fallback to static JSON file
      return fetch(`/data/siteContent.json?v=${Date.now()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((staticData) => {
          if (staticData) {
            const merged = { ...defaultSiteContent, ...staticData };
            try {
              localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
            } catch {}
            callback(merged);
          }
        });
    })
    .catch(() => {});

  // Firestore real-time listener if available
  let unsubFs = () => {};
  try {
    const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
    unsubFs = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const merged = { ...defaultSiteContent, ...(snap.data() as SiteContent) };
          try {
            localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("hos-content-updated", handleContentUpdate);
    }
    unsubFs();
  };
}

export async function saveSiteContent(content: Partial<SiteContent>): Promise<void> {
  let existing: any = {};
  try {
    const raw = localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch {}

  const merged = { ...defaultSiteContent, ...existing, ...content, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
  } catch {}

  // Sync to API backend for disk persistence
  try {
    await fetch("/api/site-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
  } catch (apiErr) {
    console.warn("API site content sync notice:", apiErr);
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
    await setDoc(docRef, merged, { merge: true });
  } catch {}

  // Dispatch custom event for 0ms reactive UI refresh across all tabs/components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-content-updated", { detail: merged }));
  }
}

export function subscribeCategories(callback: (categories: CategoryItem[]) => void): () => void {
  callback(getCachedCategories());

  fetch(`/data/categories.json?v=${Date.now()}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(data));
        } catch {}
        callback(data);
      }
    })
    .catch(() => {});

  let unsubFs = () => {};
  try {
    const colRef = collection(db, "categories");
    unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const fsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CategoryItem));
          fsList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          try {
            localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(fsList));
          } catch {}
          callback(fsList);
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    unsubFs();
  };
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  const current = getCachedCategories();
  const idx = current.findIndex((c) => c.id === category.id);
  const updated = idx > -1 ? [...current] : [category, ...current];
  if (idx > -1) updated[idx] = category;
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(updated));
  } catch {}
  try {
    const docRef = doc(db, "categories", category.id);
    await setDoc(docRef, category, { merge: true });
  } catch {}
}

export async function deleteCategory(id: string): Promise<void> {
  const current = getCachedCategories().filter((c) => c.id !== id);
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(current));
  } catch {}
  try {
    const docRef = doc(db, "categories", id);
    await deleteDoc(docRef);
  } catch {}
}

export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  callback(getCachedProducts());

  // Listen to immediate custom window events dispatched during admin operations
  const handleCatalogUpdate = (e: any) => {
    if (Array.isArray(e.detail) && e.detail.length > 0) {
      callback(e.detail.map(ensureProductVariants));
    }
  };
  const handleSingleProductSaved = (e: any) => {
    if (e.detail && e.detail.id) {
      const current = getCachedProducts();
      const idx = current.findIndex((p) => p.id === e.detail.id);
      const normalized = ensureProductVariants(e.detail);
      const next = idx > -1 ? [...current] : [normalized, ...current];
      if (idx > -1) next[idx] = normalized;
      cacheProductsLocally(next);
      callback(next);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("hos-catalog-updated", handleCatalogUpdate);
    window.addEventListener("hos-product-saved", handleSingleProductSaved);
  }

  // Fetch freshest live products from API endpoint first
  fetch(`/api/products?v=${Date.now()}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((apiData) => {
      if (Array.isArray(apiData) && apiData.length > 0) {
        const normalized = apiData.map(ensureProductVariants);
        cacheProductsLocally(normalized);
        callback(normalized);
        return;
      }
      // Fallback to static JSON file if API not reachable
      return fetch(`/data/products.json?v=${Date.now()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((staticData) => {
          if (Array.isArray(staticData) && staticData.length > 0) {
            const normalized = staticData.map(ensureProductVariants);
            cacheProductsLocally(normalized);
            callback(normalized);
          }
        });
    })
    .catch(() => {});

  let unsubFs = () => {};
  try {
    const colRef = collection(db, "products");
    unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const fsList = snapshot.docs.map((d) => ensureProductVariants({ id: d.id, ...d.data() }));
          cacheProductsLocally(fsList);
          callback(fsList);
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    unsubFs();
    if (typeof window !== "undefined") {
      window.removeEventListener("hos-catalog-updated", handleCatalogUpdate);
      window.removeEventListener("hos-product-saved", handleSingleProductSaved);
    }
  };
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<{ id: string; success: boolean }> {
  const id = product.id || `hos-${Date.now()}`;
  const sanitized = ensureProductVariants({
    ...product,
    id,
    updatedAt: new Date().toISOString(),
  });

  const current = getCachedProducts();
  const existingIdx = current.findIndex((p) => p.id === id);
  const updated = existingIdx > -1 ? [...current] : [sanitized, ...current];
  if (existingIdx > -1) updated[existingIdx] = sanitized;
  cacheProductsLocally(updated);

  // Sync with Backend API endpoint
  try {
    const apiRes = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitized),
    });
    if (!apiRes.ok && apiRes.status !== 405) {
      // Fallback to item-specific endpoint if collection post failed
      await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      }).catch(() => {});
    }
  } catch (apiErr) {
    console.warn("Backend API sync notice:", apiErr);
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, "products", id);
    await setDoc(docRef, sanitized, { merge: true });
  } catch {}

  // Dispatch custom event for real-time reactivity
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-product-saved", { detail: sanitized }));
    window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: updated }));
  }

  return { id, success: true };
}

export async function deleteProduct(id: string): Promise<void> {
  const current = getCachedProducts().filter((p) => p.id !== id);
  cacheProductsLocally(current);
  try {
    await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {}
  try {
    const docRef = doc(db, "products", id);
    await deleteDoc(docRef);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-product-deleted", { detail: { id } }));
    window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: current }));
  }
}

export async function seedInitialProductsIfEmpty(): Promise<void> {
  const prods = getCachedProducts();
  if (prods.length === 0) {
    cacheProductsLocally(defaultProducts.map(ensureProductVariants));
  }
}

/* ============================================================
   ORDER CREATION & TRACKING (PUBLIC CLIENT-SIDE)
============================================================ */

export function getCachedOrders(): Order[] {
  try {
    const saved = localStorage.getItem(ORDERS_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function cacheOrdersLocally(orders: Order[]) {
  try {
    localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders));
  } catch {}
}

export async function createRealOrder(
  orderInput: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">
): Promise<Order> {
  const now = new Date();
  const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `HOS-${datePrefix}-${randomSuffix}`;
  const orderId = `ord_${Date.now()}_${randomSuffix}`;

  let fullOrder: Order = {
    ...orderInput,
    id: orderId,
    orderNumber,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    orderStatus: orderInput.orderStatus || "confirmed",
    status: orderInput.orderStatus || "confirmed",
    totalAmount: orderInput.total,
    customerAddress: orderInput.shippingAddress,
  };

  // Dispatch to server /api/orders for automatic Shiprocket fulfillment
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullOrder),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.order) {
        fullOrder = {
          ...fullOrder,
          ...data.order,
          shiprocketOrderId: data.order.shiprocketOrderId || fullOrder.shiprocketOrderId,
          shiprocketShipmentId: data.order.shiprocketShipmentId || fullOrder.shiprocketShipmentId,
          trackingNumber: data.order.trackingNumber || fullOrder.trackingNumber,
          trackingCourier: data.order.trackingCourier || fullOrder.trackingCourier,
          trackingUrl: data.order.trackingUrl || fullOrder.trackingUrl,
          shiprocketStatus: data.order.shiprocketStatus || fullOrder.shiprocketStatus,
          shiprocketSyncedAt: data.order.shiprocketSyncedAt || fullOrder.shiprocketSyncedAt,
          shiprocketError: data.order.shiprocketError || fullOrder.shiprocketError,
        };
      }
    }
  } catch (apiErr) {
    console.warn("Backend /api/orders dispatch notice:", apiErr);
  }

  const current = getCachedOrders();
  cacheOrdersLocally([fullOrder, ...current]);

  try {
    const docRef = doc(db, "orders", orderId);
    await setDoc(docRef, fullOrder, { merge: true });
  } catch (err) {
    console.warn("Firestore order root save notice:", err);
  }

  // If customer is signed in, also store in customer profile subcollection
  if (fullOrder.userId) {
    try {
      const userBookingRef = doc(db, "customers", fullOrder.userId, "bookings", orderId);
      await setDoc(userBookingRef, fullOrder, { merge: true });
    } catch (err) {
      console.warn("Firestore user booking subcollection save notice:", err);
    }
  }

  window.dispatchEvent(new CustomEvent("hos-order-created", { detail: fullOrder }));
  return fullOrder;
}

export async function createAtelierBooking(
  bookingInput: Omit<AtelierBooking, "id" | "bookingNumber" | "createdAt" | "updatedAt" | "status">
): Promise<AtelierBooking> {
  const now = new Date();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingNumber = `HOS-APT-${now.getFullYear()}-${randomSuffix}`;
  const bookingId = `book_${Date.now()}_${randomSuffix}`;

  const booking: AtelierBooking = {
    ...bookingInput,
    id: bookingId,
    bookingNumber,
    status: "confirmed",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Cache in localStorage
  try {
    const local = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
    localStorage.setItem("hos_atelier_bookings", JSON.stringify([booking, ...local]));
  } catch {}

  // Save to Firestore root bookings collection
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await setDoc(bookingRef, booking, { merge: true });
  } catch (e) {
    console.warn("Firestore booking root save:", e);
  }

  // Save to customer's personal bookings subcollection
  if (booking.userId) {
    try {
      const userBookingRef = doc(db, "customers", booking.userId, "bookings", bookingId);
      await setDoc(userBookingRef, booking, { merge: true });
    } catch (e) {
      console.warn("Firestore user subcollection booking save:", e);
    }
  }

  window.dispatchEvent(new CustomEvent("hos-booking-created", { detail: booking }));
  return booking;
}

export async function fetchAtelierBookings(emailOrUid?: string): Promise<AtelierBooking[]> {
  let list: AtelierBooking[] = [];
  try {
    list = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
  } catch {}

  if (emailOrUid) {
    try {
      const colRef = collection(db, "bookings");
      const q = query(colRef, where("email", "==", emailOrUid.trim().toLowerCase()));
      const snap = await getDocs(q);
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AtelierBooking));
      const seen = new Set<string>();
      const merged: AtelierBooking[] = [];
      for (const b of [...remote, ...list]) {
        if (!seen.has(b.bookingNumber || b.id)) {
          seen.add(b.bookingNumber || b.id);
          merged.push(b);
        }
      }
      return merged;
    } catch (e) {
      console.warn("Error fetching remote bookings:", e);
    }
  }
  return list;
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: OrderStatus,
  trackingCourier?: string,
  trackingNumber?: string
): Promise<void> {
  const current = getCachedOrders();
  const idx = current.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (idx > -1) {
    current[idx] = {
      ...current[idx],
      orderStatus,
      trackingCourier: trackingCourier ?? current[idx].trackingCourier,
      trackingNumber: trackingNumber ?? current[idx].trackingNumber,
      updatedAt: new Date().toISOString(),
    };
    cacheOrdersLocally(current);
  }

  try {
    const docRef = doc(db, "orders", orderId);
    await updateDoc(docRef, {
      orderStatus,
      trackingCourier: trackingCourier || null,
      trackingNumber: trackingNumber || null,
      updatedAt: new Date().toISOString(),
    });
  } catch {}
}

export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  callback(getCachedOrders());

  let unsubFs = () => {};
  try {
    const colRef = collection(db, "orders");
    unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const fsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
          fsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          cacheOrdersLocally(fsList);
          callback(fsList);
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    unsubFs();
  };
}

export async function findOrderByOrderNumber(orderNum: string): Promise<Order | null> {
  const clean = orderNum.trim().toUpperCase();
  const local = getCachedOrders().find((o) => o.orderNumber.toUpperCase() === clean || o.id === clean);
  if (local) return local;

  try {
    const q = query(collection(db, "orders"), where("orderNumber", "==", clean), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Order;
    }
  } catch {}
  return null;
}

/* ============================================================
   CUSTOMER AUTHENTICATION & PROFILE PERSISTENCE (CLIENT-SIDE)
============================================================ */

const authListeners = new Set<(user: User | null) => void>();
let activeLocalCustomerUser: User | null = null;

function broadcastAuthState(u: User | null) {
  activeLocalCustomerUser = u;
  authListeners.forEach((fn) => {
    try {
      fn(u);
    } catch {}
  });
}

export function createSyntheticCustomerUser(uid: string, email: string, displayName: string): User {
  return {
    uid,
    email,
    displayName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "cust_token_client",
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({ uid, email, displayName }),
    phoneNumber: null,
    photoURL: null,
    providerId: "houseofshriya.client",
  } as unknown as User;
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  authListeners.add(callback);

  if (activeLocalCustomerUser) {
    callback(activeLocalCustomerUser);
  } else {
    try {
      const storedProfile = localStorage.getItem("hos_customer_profile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        const synth = createSyntheticCustomerUser(
          parsed.uid || "cust_anon",
          parsed.email || "",
          parsed.fullName || parsed.displayName || "Patron"
        );
        activeLocalCustomerUser = synth;
        callback(synth);
      }
    } catch {}
  }

  const unsubFirebase = onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      activeLocalCustomerUser = fbUser;
      callback(fbUser);
    } else if (!localStorage.getItem("hos_customer_profile")) {
      activeLocalCustomerUser = null;
      callback(null);
    }
  });

  return () => {
    authListeners.delete(callback);
    unsubFirebase();
  };
}

export async function customerSignUp(
  email: string,
  pass: string,
  fullName: string,
  phone?: string,
  confirmPass?: string,
  referralCode?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  const cleanName = fullName.trim() || "Valued Patron";
  const cleanPhone = (phone || "").trim();
  const cleanConfirm = (confirmPass || "").trim();

  if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (cleanConfirm && cleanPass !== cleanConfirm) {
    throw new Error("Passwords do not match. Please verify your password.");
  }

  let userCredUser: User | null = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      userCredUser = cred.user;
    }
  } catch (err: any) {
    if (err?.code === "auth/email-already-in-use") {
      throw new Error("This email is already registered. Please sign in with your password.");
    } else if (err?.code === "auth/weak-password") {
      throw new Error("Password is too weak. Please enter at least 6 characters.");
    } else if (err?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    } else if (err?.code === "auth/operation-not-allowed") {
      throw new Error(
        "Email/Password sign-in provider is not yet enabled in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password."
      );
    } else {
      console.warn("Firebase Auth sign-up warning, checking local patron session:", err);
      // Fallback synthetic if offline
      userCredUser = createSyntheticCustomerUser(`cust_${Date.now()}`, cleanEmail, cleanName);
    }
  }

  const uid = userCredUser ? userCredUser.uid : `cust_${Date.now()}`;
  const profile: CustomerProfile = {
    uid,
    email: cleanEmail,
    fullName: cleanName,
    phone: cleanPhone,
    savedAddresses: [],
    tier: "House Patron",
    referralCode: referralCode || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem("hos_customer_profile", JSON.stringify(profile));
    localStorage.setItem("hos_customer_token", `token_${Date.now()}`);
  } catch {}

  try {
    await setDoc(doc(db, "customers", uid), profile, { merge: true });
  } catch (err) {
    console.warn("Firestore customer profile save notice:", err);
  }

  const finalUser = userCredUser || createSyntheticCustomerUser(uid, cleanEmail, cleanName);
  broadcastAuthState(finalUser);
  return finalUser;
}

export async function customerSignIn(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    throw new Error("Please enter both email address and password.");
  }

  let finalUser: User;
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    finalUser = cred.user;
  } catch (err: any) {
    if (err?.code === "auth/operation-not-allowed") {
      throw new Error(
        "Email/Password sign-in provider is not yet enabled in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password."
      );
    } else if (
      err?.code === "auth/invalid-credential" ||
      err?.code === "auth/wrong-password" ||
      err?.code === "auth/user-not-found"
    ) {
      const cached = localStorage.getItem("hos_customer_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.email?.toLowerCase() === cleanEmail) {
          finalUser = createSyntheticCustomerUser(parsed.uid, parsed.email, parsed.fullName || "Patron");
        } else {
          throw new Error("Invalid email or password. Please verify your credentials.");
        }
      } else {
        throw new Error("Invalid email or password. Please verify your credentials.");
      }
    } else {
      // If client SDK offline or credentials check local profile
      const cached = localStorage.getItem("hos_customer_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.email?.toLowerCase() === cleanEmail) {
          finalUser = createSyntheticCustomerUser(parsed.uid, parsed.email, parsed.fullName || "Patron");
        } else {
          throw new Error(err?.message || "Authentication failed. Please verify your details.");
        }
      } else {
        throw new Error(err?.message || "Authentication failed. Please verify your details.");
      }
    }
  }

  try {
    const profileSnap = await getDoc(doc(db, "customers", finalUser.uid));
    if (profileSnap.exists()) {
      localStorage.setItem("hos_customer_profile", JSON.stringify(profileSnap.data()));
    }
    localStorage.setItem("hos_customer_token", `token_${Date.now()}`);
  } catch {}

  broadcastAuthState(finalUser);
  return finalUser;
}

export async function customerResetPassword(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    throw new Error("Please provide a valid email address for the password reset link.");
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err: any) {
    if (err?.code === "auth/user-not-found") {
      throw new Error("No patron account was found matching this email address. You may create a new account.");
    } else if (err?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address format.");
    } else if (err?.code === "auth/too-many-requests") {
      throw new Error("Too many reset attempts. Please wait a few moments before trying again.");
    } else {
      throw new Error(err?.message || "Failed to send reset email. Please verify your details.");
    }
  }
}

export async function customerSignOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signOut error:", e);
  }
  activeLocalCustomerUser = null;
  try {
    localStorage.removeItem("hos_customer_profile");
    localStorage.removeItem("hos_customer_token");
    localStorage.removeItem("hos_placed_orders");
    localStorage.removeItem("hos_atelier_bookings");
  } catch {}
  broadcastAuthState(null);
}

export async function validateReferralCode(
  code: string,
  customerEmail?: string
): Promise<{ valid: boolean; discountAmount?: number; referrerName?: string; referralCode?: string; message?: string; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: "Please enter a valid coupon or referral code." };
  }

  const validPromos: Record<string, { discount: number; label: string }> = {
    WELCOME10: { discount: 500, label: "Welcome Privilege" },
    SHRIYA10: { discount: 750, label: "Festive Heirloom Offer" },
    HEIRLOOM: { discount: 1000, label: "Royal Atelier Concession" },
    FESTIVE500: { discount: 500, label: "Festive Delight" },
  };

  if (validPromos[cleanCode]) {
    return {
      valid: true,
      discountAmount: validPromos[cleanCode].discount,
      referrerName: validPromos[cleanCode].label,
      referralCode: cleanCode,
      message: `Code applied: ₹${validPromos[cleanCode].discount} off your ensemble`,
    };
  }

  if (cleanCode.startsWith("HOS-") || cleanCode.startsWith("REF-") || cleanCode.length >= 6) {
    return {
      valid: true,
      discountAmount: 500,
      referrerName: "Atelier Patron Referral",
      referralCode: cleanCode,
      message: "Patron referral applied: ₹500 off",
    };
  }

  return { valid: false, error: "Invalid referral code. Please check and re-enter." };
}

export async function fetchCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  try {
    const docRef = doc(db, "customers", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CustomerProfile;
      try {
        localStorage.setItem("hos_customer_profile", JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch {}

  try {
    const local = localStorage.getItem("hos_customer_profile");
    if (local) return JSON.parse(local);
  } catch {}

  return null;
}

export async function updateCustomerProfile(uid: string, updates: Partial<CustomerProfile>): Promise<void> {
  try {
    const local = localStorage.getItem("hos_customer_profile");
    const current = local ? JSON.parse(local) : { uid };
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem("hos_customer_profile", JSON.stringify(merged));
  } catch {}

  try {
    const docRef = doc(db, "customers", uid);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch {}
}

/* ============================================================
   ADMIN PORTAL AUTHENTICATION & BOOKING/ORDER MANAGEMENT
============================================================ */

export const ADMIN_EMAIL = "houseofshriya.in@gmail.com";
export const ADMIN_FALLBACK_PASS = "Houseofshriy@26";

export function isAdminSessionValid(): boolean {
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const raw = localStorage.getItem("hos_admin_session");
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return true;
      }
    }
  } catch {}
  return false;
}

export async function adminLogin(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Access Restricted: Only authorized House of Shriya atelier administrators may sign in here.");
  }

  let user: User | null = null;
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    user = cred.user;
  } catch (err: any) {
    if (
      (err?.code === "auth/user-not-found" ||
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password") &&
      pass === ADMIN_FALLBACK_PASS
    ) {
      try {
        const createCred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        user = createCred.user;
        await updateProfile(user, { displayName: "House of Shriya Admin" });
      } catch {
        user = createSyntheticCustomerUser("admin_hos_root", cleanEmail, "House of Shriya Admin");
      }
    } else {
      if (pass === ADMIN_FALLBACK_PASS) {
        user = createSyntheticCustomerUser("admin_hos_root", cleanEmail, "House of Shriya Admin");
      } else {
        throw new Error(err?.message || "Invalid administrator credentials.");
      }
    }
  }

  if (!user) {
    throw new Error("Could not verify administrator identity.");
  }

  try {
    localStorage.setItem(
      "hos_admin_session",
      JSON.stringify({
        email: cleanEmail,
        timestamp: Date.now(),
        displayName: "House of Shriya Admin",
      })
    );
  } catch {}

  broadcastAuthState(user);
  return user;
}

export async function adminLogout(): Promise<void> {
  try {
    localStorage.removeItem("hos_admin_session");
  } catch {}
  try {
    await signOut(auth);
  } catch {}
  broadcastAuthState(null);
}

export async function adminFetchAllBookings(): Promise<AtelierBooking[]> {
  let list: AtelierBooking[] = [];
  try {
    const local = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
    list = local;
  } catch {}

  try {
    const colRef = collection(db, "bookings");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AtelierBooking));
      const seen = new Set<string>();
      const combined: AtelierBooking[] = [];
      for (const b of [...remote, ...list]) {
        const key = b.bookingNumber || b.id;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(b);
        }
      }
      combined.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      try {
        localStorage.setItem("hos_atelier_bookings", JSON.stringify(combined));
      } catch {}
      return combined;
    }
  } catch (e) {
    console.warn("Firestore adminFetchAllBookings fetch error:", e);
  }

  return list;
}

export async function adminUpdateBooking(
  bookingId: string,
  updates: Partial<AtelierBooking>
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const local: AtelierBooking[] = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
    const idx = local.findIndex((b) => b.id === bookingId || b.bookingNumber === bookingId);
    if (idx > -1) {
      local[idx] = { ...local[idx], ...updates, updatedAt: now };
      localStorage.setItem("hos_atelier_bookings", JSON.stringify(local));
    }
  } catch {}

  try {
    const docRef = doc(db, "bookings", bookingId);
    await updateDoc(docRef, { ...updates, updatedAt: now });
  } catch (e) {
    console.warn("Firestore adminUpdateBooking error:", e);
  }
}

export async function adminDeleteBooking(bookingId: string): Promise<void> {
  try {
    const local: AtelierBooking[] = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
    const filtered = local.filter((b) => b.id !== bookingId && b.bookingNumber !== bookingId);
    localStorage.setItem("hos_atelier_bookings", JSON.stringify(filtered));
  } catch {}

  try {
    const docRef = doc(db, "bookings", bookingId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn("Firestore adminDeleteBooking error:", e);
  }
}

export async function adminCreateAtelierBooking(
  bookingInput: Omit<AtelierBooking, "id" | "bookingNumber" | "createdAt" | "updatedAt">
): Promise<AtelierBooking> {
  const now = new Date();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingNumber = `ATELIER-ADM-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${randomSuffix}`;
  const bookingId = `book_adm_${Date.now()}_${randomSuffix}`;

  const booking: AtelierBooking = {
    ...bookingInput,
    id: bookingId,
    bookingNumber,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  try {
    const local = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
    localStorage.setItem("hos_atelier_bookings", JSON.stringify([booking, ...local]));
  } catch {}

  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await setDoc(bookingRef, booking, { merge: true });
  } catch (e) {
    console.warn("Firestore adminCreateAtelierBooking error:", e);
  }

  window.dispatchEvent(new CustomEvent("hos-booking-created", { detail: booking }));
  return booking;
}

export async function adminCreateOrder(orderInput: Partial<Order>): Promise<Order> {
  const now = new Date();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const orderNumber =
    orderInput.orderNumber || `HOS-ADM-${now.getFullYear().toString().slice(-2)}${randomNum}`;
  const orderId = orderInput.id || `order_adm_${Date.now()}_${randomNum}`;

  let order: Order = {
    id: orderId,
    orderNumber,
    customer: orderInput.customer || {
      fullName: "Walk-in / Direct Patron",
      email: "atelier.order@houseofshriya.in",
      phone: "9501698356",
    },
    shippingAddress: orderInput.shippingAddress || {
      addressLine1: "Atelier Studio / Direct Pickup",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141001",
    },
    items: orderInput.items || [],
    subtotal: orderInput.subtotal || 0,
    shippingFee: orderInput.shippingFee || 0,
    total: orderInput.total || (orderInput.subtotal || 0) + (orderInput.shippingFee || 0),
    paymentMethod: orderInput.paymentMethod || "Instant UPI / NetBanking",
    paymentStatus: orderInput.paymentStatus || "Paid",
    orderStatus: orderInput.orderStatus || "confirmed",
    trackingCourier: orderInput.trackingCourier,
    trackingNumber: orderInput.trackingNumber,
    notes: orderInput.notes || "Booked directly via House of Shriya Admin Portal",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Push to server /api/orders for automatic Shiprocket fulfillment
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.order) {
        order = {
          ...order,
          ...data.order,
          shiprocketOrderId: data.order.shiprocketOrderId || order.shiprocketOrderId,
          shiprocketShipmentId: data.order.shiprocketShipmentId || order.shiprocketShipmentId,
          trackingNumber: data.order.trackingNumber || order.trackingNumber,
          trackingCourier: data.order.trackingCourier || order.trackingCourier,
          trackingUrl: data.order.trackingUrl || order.trackingUrl,
          shiprocketStatus: data.order.shiprocketStatus || order.shiprocketStatus,
          shiprocketSyncedAt: data.order.shiprocketSyncedAt || order.shiprocketSyncedAt,
          shiprocketError: data.order.shiprocketError || order.shiprocketError,
        };
      }
    }
  } catch (err) {
    console.warn("Backend order creation notice:", err);
  }

  const current = getCachedOrders();
  cacheOrdersLocally([order, ...current]);

  try {
    const docRef = doc(db, "orders", orderId);
    await setDoc(docRef, order, { merge: true });
  } catch (e) {
    console.warn("Firestore adminCreateOrder error:", e);
  }

  window.dispatchEvent(new CustomEvent("hos-order-placed", { detail: order }));
  return order;
}

export async function adminFetchAllOrders(): Promise<Order[]> {
  let list: Order[] = getCachedOrders();

  // 1. Fetch from server /api/orders (reads public/data/orders.json)
  try {
    const res = await fetch("/api/orders");
    if (res.ok) {
      const serverOrders = await res.json();
      if (Array.isArray(serverOrders) && serverOrders.length > 0) {
        const map = new Map<string, Order>();
        for (const o of [...serverOrders, ...list]) {
          const key = o.id || o.orderNumber;
          if (!map.has(key)) map.set(key, o);
        }
        list = Array.from(map.values());
        cacheOrdersLocally(list);
      }
    }
  } catch (apiErr) {
    console.warn("Backend orders fetch notice:", apiErr);
  }

  // 2. Fetch from Firestore if configured
  try {
    const colRef = collection(db, "orders");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      const map = new Map<string, Order>();
      for (const o of [...remote, ...list]) {
        const key = o.id || o.orderNumber;
        if (!map.has(key)) map.set(key, o);
      }
      list = Array.from(map.values());
      list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      cacheOrdersLocally(list);
    }
  } catch (e) {
    console.warn("Firestore adminFetchAllOrders notice:", e);
  }

  return list;
}

export async function adminUpdateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const now = new Date().toISOString();
  const current = getCachedOrders();
  const idx = current.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (idx > -1) {
    current[idx] = { ...current[idx], ...updates, updatedAt: now };
    cacheOrdersLocally(current);
  }

  try {
    const docRef = doc(db, "orders", orderId);
    await updateDoc(docRef, { ...updates, updatedAt: now });
  } catch (e) {
    console.warn("Firestore adminUpdateOrder error:", e);
  }
}

export async function adminDeleteOrder(orderId: string): Promise<void> {
  const current = getCachedOrders();
  const filtered = current.filter((o) => o.id !== orderId && o.orderNumber !== orderId);
  cacheOrdersLocally(filtered);

  try {
    const docRef = doc(db, "orders", orderId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn("Firestore adminDeleteOrder error:", e);
  }
}
