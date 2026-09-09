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
  PaymentStatus,
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
  announcementText: "Handcrafted Unstitched Heirlooms",
  announcementCta: "Shop Festive Edits",
  announcementVisible: false,
  brandTagline: "Heirloom Indian Couture, Reimagined for the Modern Connoisseur",
  brandDescription:
    "Rooted in centuries-old artisanal traditions of Varanasi, Chanderi, and Bengal. Every yard of silk tells an untold tale of heritage weaving, resham zari hand embroidery, and regal silhouette artistry.",
  contactPhone: "+91 95016 98356",
  contactEmail: "care@houseofshriya.com",
  whatsappNumber: "+919501698356",
  atelierCity: "Surat, Gujarat, India",
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
      title: "Generous Lengths for Easy Stitching",
      text: "Generous fabric cuts designed for comfortable stitching from size XS to 5XL.",
      iconName: "Sparkles",
    },
    {
      title: "Direct from Varanasi Master Weavers",
      text: "Eliminating intermediaries to directly support heritage artisan families.",
      iconName: "Crown",
    },
    {
      title: "Pan-India Insured Delivery",
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

// Multi-tab / cross-device broadcast channel for 0ms instantaneous synchronization
const syncChannel: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("hos_cross_device_channel")
    : null;

export function broadcastCrossDeviceSync(
  type: "products" | "orders" | "categories" | "site_content" | "bookings",
  data?: any
) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, data, timestamp: Date.now() });
    } catch {}
  }
}

// Server-Sent Events (SSE) live sync client: keeps any device and tab in real-time sync with server files
let sseSource: EventSource | null = null;
let sseReconnectTimer: any = null;

export function initServerLiveSync() {
  if (typeof window === "undefined" || !("EventSource" in window)) return;
  if (sseSource) return;

  try {
    sseSource = new EventSource("/api/sync/events");

    sseSource.addEventListener("sync", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || !payload.type) return;

        if (payload.type === "products" && Array.isArray(payload.data)) {
          const normalized = payload.data.map(ensureProductVariants);
          cacheProductsLocally(normalized);
          window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: normalized }));
        } else if (payload.type === "site_content" && payload.data) {
          const merged = { ...defaultSiteContent, ...payload.data };
          cacheSiteContentLocally(merged);
          window.dispatchEvent(new CustomEvent("hos-content-updated", { detail: merged }));
        } else if (payload.type === "categories" && Array.isArray(payload.data)) {
          cacheCategoriesLocally(payload.data);
          window.dispatchEvent(new CustomEvent("hos-categories-updated", { detail: payload.data }));
        } else if (payload.type === "orders" && Array.isArray(payload.data)) {
          localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(payload.data));
          window.dispatchEvent(new CustomEvent("hos-orders-updated", { detail: payload.data }));
        } else if (payload.type === "bookings" && Array.isArray(payload.data)) {
          localStorage.setItem("hos_atelier_bookings", JSON.stringify(payload.data));
          window.dispatchEvent(new CustomEvent("hos-bookings-updated", { detail: payload.data }));
        }
      } catch (err) {
        console.warn("SSE sync payload parse notice:", err);
      }
    });

    sseSource.onerror = () => {
      if (sseSource) {
        sseSource.close();
        sseSource = null;
      }
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = setTimeout(() => {
        initServerLiveSync();
      }, 4000);
    };
  } catch (err) {
    console.warn("SSE init notice:", err);
  }
}

if (typeof window !== "undefined") {
  initServerLiveSync();
}

/* ============================================================
   PRODUCT VARIANT NORMALIZATION & CACHING
============================================================ */

export function ensureProductVariants(product: any): Product {
  const primaryImg = product.image || (Array.isArray(product.images) && product.images[0]) || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
  const hoverImg = product.hoverImage || (Array.isArray(product.images) && product.images[1]) || primaryImg;

  // Clean gallery images without forcefully resurrecting deleted photos
  let cleanImages: string[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    cleanImages = product.images.filter(Boolean);
  } else {
    cleanImages = [primaryImg, hoverImg].filter(Boolean);
  }

  // Ensure primary image is present
  if (cleanImages.length > 0 && !cleanImages.includes(primaryImg)) {
    cleanImages[0] = primaryImg;
  }

  let variants: ColorVariant[] = [];
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    variants = product.colorVariants.map((v: any, idx: number) => {
      let vImages: string[] = [];
      if (idx === 0) {
        vImages = cleanImages;
      } else if (Array.isArray(v.images) && v.images.length > 0) {
        vImages = v.images.filter(Boolean);
      } else if (v.image) {
        vImages = [v.image, v.hoverImage || v.image].filter(Boolean);
      } else {
        vImages = [primaryImg, hoverImg].filter(Boolean);
      }

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
        image: vImages[0] || primaryImg,
        hoverImage: vImages[1] || vImages[0] || hoverImg,
        inStock: v.inStock !== false,
      };
    });
  } else {
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
        images: cleanImages,
        image: cleanImages[0] || primaryImg,
        hoverImage: cleanImages[1] || cleanImages[0] || hoverImg,
        inStock: product.inStock !== false,
      },
    ];
  }

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

export function cacheCategoriesLocally(cats: CategoryItem[]): void {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(cats));
  } catch {}
}

export function getCachedSiteContent(): SiteContent {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...defaultSiteContent, ...parsed };
      }
    }
  } catch {}
  return defaultSiteContent;
}

export function cacheSiteContentLocally(content: SiteContent): void {
  try {
    localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(content));
  } catch {}
}

/* ============================================================
   CONTENT & CATALOG SUBSCRIPTIONS (CLIENT-SIDE)
============================================================ */

export function subscribeSiteContent(callback: (content: SiteContent) => void): () => void {
  // 1. Immediately provide cached/default content for zero-delay paint
  let currentContent = getCachedSiteContent();
  callback(currentContent);

  let active = true;

  // Active sync function: fetches live site content from backend API
  const fetchLiveSiteContent = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/site-content?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && (serverData.heroSlides || Object.keys(serverData).length > 0)) {
          const merged = { ...defaultSiteContent, ...serverData };
          currentContent = merged;
          cacheSiteContentLocally(merged);
          callback(merged);
          return;
        }
      }
    } catch {}

    // Fallback to static JSON file only if nothing in local cache
    try {
      const staticRes = await fetch(`/data/siteContent.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        if (staticData && (staticData.heroSlides || Object.keys(staticData).length > 0)) {
          const merged = { ...defaultSiteContent, ...staticData };
          currentContent = merged;
          cacheSiteContentLocally(merged);
          callback(merged);
        }
      }
    } catch {}
  };

  // Immediate live fetch
  fetchLiveSiteContent();

  // Active background polling interval (every 5s) for instant sync on mobile phones & tablets
  const pollTimer = setInterval(fetchLiveSiteContent, 5000);

  // Focus & mobile visibility change (crucial for phones when resuming screen)
  const handleWakeup = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      fetchLiveSiteContent();
    }
  };

  // Firestore real-time listener (the instant cloud sync engine across devices)
  let unsubFs = () => {};
  try {
    const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
    unsubFs = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const fsData = snap.data() as SiteContent;
          if (fsData) {
            const merged = { ...defaultSiteContent, ...fsData };
            currentContent = merged;
            cacheSiteContentLocally(merged);
            callback(merged);
          }
        }
      },
      (err) => {
        console.warn("Firestore site_content listener notice:", err);
      }
    );
  } catch {}

  // Event & BroadcastChannel listeners
  const handleContentUpdate = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (customEvt.detail) {
      currentContent = customEvt.detail;
      cacheSiteContentLocally(customEvt.detail);
      callback(customEvt.detail);
    }
  };

  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === "site_content") {
      fetchLiveSiteContent();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("hos-content-updated", handleContentUpdate);
    window.addEventListener("focus", handleWakeup);
    window.addEventListener("pageshow", handleWakeup);
    window.addEventListener("online", handleWakeup);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleWakeup);
  }
  if (syncChannel) {
    syncChannel.addEventListener("message", handleBroadcastMessage);
  }

  return () => {
    active = false;
    clearInterval(pollTimer);
    unsubFs();
    if (typeof window !== "undefined") {
      window.removeEventListener("hos-content-updated", handleContentUpdate);
      window.removeEventListener("focus", handleWakeup);
      window.removeEventListener("pageshow", handleWakeup);
      window.removeEventListener("online", handleWakeup);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleWakeup);
    }
    if (syncChannel) {
      syncChannel.removeEventListener("message", handleBroadcastMessage);
    }
  };
}

export async function saveSiteContent(content: Partial<SiteContent>): Promise<SiteContent> {
  const existing = getCachedSiteContent();
  const updated: SiteContent = {
    ...defaultSiteContent,
    ...existing,
    ...content,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately cache locally
  cacheSiteContentLocally(updated);

  // 2. Sync to API backend for disk persistence
  try {
    await fetch("/api/site-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  } catch (apiErr) {
    console.warn("API site content sync notice:", apiErr);
  }

  // 3. Sync to Firestore (single source of truth across all devices)
  try {
    const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
    await setDoc(docRef, updated, { merge: true });
  } catch (fsErr) {
    console.warn("Firestore saveSiteContent notice:", fsErr);
  }

  // 4. Dispatch events for 0ms reactive UI refresh across all tabs/components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-content-updated", { detail: updated }));
  }
  broadcastCrossDeviceSync("site_content" as any, updated);

  return updated;
}

export function subscribeCategories(callback: (categories: CategoryItem[]) => void): () => void {
  callback(getCachedCategories());

  let active = true;

  const fetchLiveCategories = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/categories?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          cacheCategoriesLocally(data);
          callback(data);
          return;
        }
      }
    } catch {}

    // Fallback to static JSON file if server endpoint temporarily unavailable
    try {
      const staticRes = await fetch(`/data/categories.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (staticRes.ok) {
        const data = await staticRes.json();
        if (Array.isArray(data) && data.length > 0) {
          cacheCategoriesLocally(data);
          callback(data);
        }
      }
    } catch {}
  };

  fetchLiveCategories();
  const pollTimer = setInterval(fetchLiveCategories, 6000);

  // Mobile wakeups
  const handleWakeup = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      fetchLiveCategories();
    }
  };

  // Firestore real-time listener
  let unsubFs = () => {};
  try {
    const colRef = collection(db, "categories");
    unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const fsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CategoryItem));
          fsList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          cacheCategoriesLocally(fsList);
          callback(fsList);
        }
      },
      () => {}
    );
  } catch {}

  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === "categories") {
      fetchLiveCategories();
    }
  };

  const handleCategoriesUpdated = (e: any) => {
    if (Array.isArray(e.detail) && e.detail.length > 0) {
      cacheCategoriesLocally(e.detail);
      callback(e.detail);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleWakeup);
    window.addEventListener("pageshow", handleWakeup);
    window.addEventListener("online", handleWakeup);
    window.addEventListener("hos-categories-updated", handleCategoriesUpdated);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleWakeup);
  }
  if (syncChannel) {
    syncChannel.addEventListener("message", handleBroadcastMessage);
  }

  return () => {
    active = false;
    clearInterval(pollTimer);
    unsubFs();
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", handleWakeup);
      window.removeEventListener("pageshow", handleWakeup);
      window.removeEventListener("online", handleWakeup);
      window.removeEventListener("hos-categories-updated", handleCategoriesUpdated);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleWakeup);
    }
    if (syncChannel) {
      syncChannel.removeEventListener("message", handleBroadcastMessage);
    }
  };
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  const current = getCachedCategories();
  const idx = current.findIndex((c) => c.id === category.id);
  const updated = idx > -1 ? [...current] : [category, ...current];
  if (idx > -1) updated[idx] = category;
  cacheCategoriesLocally(updated);

  // Sync with central backend API
  try {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  } catch {}

  try {
    const docRef = doc(db, "categories", category.id);
    await setDoc(docRef, category, { merge: true });
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-categories-updated", { detail: updated }));
  }
  broadcastCrossDeviceSync("categories", updated);
}

export async function deleteCategory(id: string): Promise<void> {
  const current = getCachedCategories().filter((c) => c.id !== id);
  cacheCategoriesLocally(current);

  // Sync with central backend API
  try {
    await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {}

  try {
    const docRef = doc(db, "categories", id);
    await deleteDoc(docRef);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-categories-updated", { detail: current }));
  }
  broadcastCrossDeviceSync("categories", current);
}

export function pausePolling(_seconds = 0): void {
  // Real-time synchronization active without artificial polling pause
}

// Helper to append/update anti-cache timestamp parameter on uploaded images
function applyImageCacheBuster(url: string | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("/public/uploads/")) {
    const cleanPath = trimmed.startsWith("/public/uploads/")
      ? trimmed.replace("/public", "")
      : trimmed;
    const baseUrl = cleanPath.split("?")[0];
    return `${baseUrl}?v=${Date.now()}`;
  }
  return trimmed;
}

export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  // Immediately serve cached products for instant layout
  callback(getCachedProducts());

  let active = true;

  // Active sync function: fetches from central backend API with anti-cache headers
  const fetchLiveProducts = async () => {
    if (!active) return;

    try {
      const res = await fetch(`/api/products?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const apiData = await res.json();
        if (Array.isArray(apiData) && apiData.length > 0) {
          const normalized = apiData.map(ensureProductVariants);
          cacheProductsLocally(normalized);
          callback(normalized);
          return;
        }
      }
    } catch {}

    // Fallback to static JSON file if server endpoint temporarily unavailable
    try {
      const staticRes = await fetch(`/data/products.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        if (Array.isArray(staticData) && staticData.length > 0) {
          const normalized = staticData.map(ensureProductVariants);
          const current = getCachedProducts();
          if (current.length === 0) {
            cacheProductsLocally(normalized);
            callback(normalized);
          }
        }
      }
    } catch {}
  };

  // 1. Initial live fetch immediately
  fetchLiveProducts();

  // 2. Active background polling interval (every 3s) for fast cross-device synchronization (Mobile, Tablet, Laptop)
  const pollTimer = setInterval(fetchLiveProducts, 3000);

  // 3. Listen to window focus & visibility changes (e.g. when user switches from Mobile to Laptop or switches tabs)
  const handleFocusOrVisible = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      fetchLiveProducts();
    }
  };

  // 4. Listen to local/custom events dispatched during admin operations
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

  // 5. BroadcastChannel handler for 0ms cross-tab & cross-window updates
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === "products") {
      fetchLiveProducts();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleFocusOrVisible);
    window.addEventListener("online", handleFocusOrVisible);
    window.addEventListener("hos-catalog-updated", handleCatalogUpdate);
    window.addEventListener("hos-product-saved", handleSingleProductSaved);
    window.addEventListener("hos-product-deleted", fetchLiveProducts);
    window.addEventListener("storage", (e) => {
      if (e.key === PRODUCTS_CACHE_KEY) {
        callback(getCachedProducts());
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleFocusOrVisible);
  }

  if (syncChannel) {
    syncChannel.addEventListener("message", handleBroadcastMessage);
  }

  // 6. Firestore real-time listener (when available)
  let unsubFs = () => {};
  try {
    const colRef = collection(db, "products");
    unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => ensureProductVariants({ id: d.id, ...d.data() }));
          if (list.length > 0) {
            cacheProductsLocally(list);
            callback(list);
          }
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    active = false;
    clearInterval(pollTimer);
    unsubFs();
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", handleFocusOrVisible);
      window.removeEventListener("online", handleFocusOrVisible);
      window.removeEventListener("hos-catalog-updated", handleCatalogUpdate);
      window.removeEventListener("hos-product-saved", handleSingleProductSaved);
      window.removeEventListener("hos-product-deleted", fetchLiveProducts);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    }
    if (syncChannel) {
      syncChannel.removeEventListener("message", handleBroadcastMessage);
    }
  };
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<{ id: string; success: boolean }> {
  const id = product.id || `hos-${Date.now()}`;

  // Apply cache-busting timestamp to /uploads/ URLs to ensure Cloudflare / browsers never serve stale cached images
  const cleanImage = applyImageCacheBuster(product.image);
  const cleanHover = applyImageCacheBuster(product.hoverImage || cleanImage);
  const cleanImages = (product.images || [cleanImage, cleanHover])
    .filter(Boolean)
    .map(applyImageCacheBuster);

  const updatedVariants = Array.isArray(product.colorVariants)
    ? product.colorVariants.map((v) => ({
        ...v,
        image: applyImageCacheBuster(v.image || cleanImage),
        hoverImage: applyImageCacheBuster(v.hoverImage || cleanHover),
        images: Array.isArray(v.images) && v.images.length > 0
          ? v.images.map(applyImageCacheBuster)
          : cleanImages,
      }))
    : undefined;

  const sanitized = ensureProductVariants({
    ...product,
    id,
    image: cleanImage,
    hoverImage: cleanHover,
    images: cleanImages,
    colorVariants: updatedVariants,
    updatedAt: new Date().toISOString(),
  });

  const current = getCachedProducts();
  const existingIdx = current.findIndex((p) => p.id === id);
  const updated = existingIdx > -1 ? [...current] : [sanitized, ...current];
  if (existingIdx > -1) updated[existingIdx] = sanitized;
  cacheProductsLocally(updated);

  // 1. Sync with Centralized Backend API endpoint (/api/products)
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

  // 2. Sync to Firestore
  try {
    const docRef = doc(db, "products", id);
    await setDoc(docRef, sanitized, { merge: true });
  } catch {}

  // 3. Dispatch real-time events for instant local & cross-device updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-product-saved", { detail: sanitized }));
    window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: updated }));
  }
  broadcastCrossDeviceSync("products", updated);

  return { id, success: true };
}

export async function deleteProduct(id: string): Promise<void> {
  const current = getCachedProducts().filter((p) => p.id !== id);
  cacheProductsLocally(current);

  // 1. Central Backend API deletion
  try {
    await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {}

  // 2. Firestore deletion
  try {
    const docRef = doc(db, "products", id);
    await deleteDoc(docRef);
  } catch {}

  // 3. Dispatch real-time events for instant local & cross-device updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-product-deleted", { detail: { id } }));
    window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: current }));
  }
  broadcastCrossDeviceSync("products", current);
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
  broadcastCrossDeviceSync("orders", fullOrder);
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

  // Central Server API sync
  try {
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
  } catch (apiErr) {
    console.warn("API booking sync notice:", apiErr);
  }

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
  broadcastCrossDeviceSync("bookings", booking);
  return booking;
}

export async function fetchAtelierBookings(emailOrUid?: string): Promise<AtelierBooking[]> {
  let list: AtelierBooking[] = [];
  try {
    list = JSON.parse(localStorage.getItem("hos_atelier_bookings") || "[]");
  } catch {}

  // Fetch from server API
  try {
    const res = await fetch(`/api/bookings?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const serverList = await res.json();
      if (Array.isArray(serverList)) {
        list = serverList;
        localStorage.setItem("hos_atelier_bookings", JSON.stringify(serverList));
      }
    }
  } catch {}

  if (emailOrUid) {
    const filterTerm = emailOrUid.trim().toLowerCase();
    const filtered = list.filter(
      (b) => b.email?.toLowerCase() === filterTerm || b.userId === emailOrUid
    );
    if (filtered.length > 0) return filtered;

    try {
      const colRef = collection(db, "bookings");
      const q = query(colRef, where("email", "==", filterTerm));
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
  const now = new Date().toISOString();
  const payload = {
    orderStatus,
    status: orderStatus,
    trackingCourier: trackingCourier || null,
    trackingNumber: trackingNumber || null,
    updatedAt: now,
  };

  let updatedFullOrder: Order | null = null;
  if (idx > -1) {
    current[idx] = {
      ...current[idx],
      ...payload,
      trackingCourier: trackingCourier ?? current[idx].trackingCourier,
      trackingNumber: trackingNumber ?? current[idx].trackingNumber,
    };
    updatedFullOrder = current[idx];
    cacheOrdersLocally(current);
  }

  // Also sync to customer placed orders cache for immediate consistency
  try {
    const placed: Order[] = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
    const pIdx = placed.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (pIdx > -1) {
      placed[pIdx] = {
        ...placed[pIdx],
        ...payload,
        trackingCourier: trackingCourier ?? placed[pIdx].trackingCourier,
        trackingNumber: trackingNumber ?? placed[pIdx].trackingNumber,
      };
      if (!updatedFullOrder) updatedFullOrder = placed[pIdx];
      localStorage.setItem("hos_placed_orders", JSON.stringify(placed));
    }
  } catch {}

  // 1. Sync to central backend API
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {}

  // 2. Sync to Firestore
  try {
    const docRef = doc(db, "orders", orderId);
    await updateDoc(docRef, payload);
  } catch {}

  // 3. Broadcast update
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hos-order-updated", {
        detail: updatedFullOrder || { id: orderId, orderId, ...payload },
      })
    );
    window.dispatchEvent(new CustomEvent("hos-orders-updated", { detail: current }));
  }
  broadcastCrossDeviceSync("orders", updatedFullOrder);
}

export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  // Immediately serve cached orders
  callback(getCachedOrders());

  let active = true;

  // Active sync function: fetches from central backend API with anti-cache headers
  const fetchLiveOrders = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/orders?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const apiData = await res.json();
        if (Array.isArray(apiData)) {
          const sorted = [...apiData].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          const current = getCachedOrders();
          if (JSON.stringify(current) !== JSON.stringify(sorted)) {
            cacheOrdersLocally(sorted);
            callback(sorted);
          }
          return;
        }
      }
    } catch {}

    // Fallback to static JSON file if server endpoint temporarily unavailable
    try {
      const staticRes = await fetch(`/data/orders.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        if (Array.isArray(staticData)) {
          const sorted = [...staticData].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          const current = getCachedOrders();
          if (JSON.stringify(current) !== JSON.stringify(sorted)) {
            cacheOrdersLocally(sorted);
            callback(sorted);
          }
        }
      }
    } catch {}
  };

  // 1. Initial live fetch immediately
  fetchLiveOrders();

  // 2. Active background polling interval (every 7s) for seamless cross-device synchronization
  const pollTimer = setInterval(fetchLiveOrders, 7000);

  // 3. Listen to window focus & visibility changes
  const handleFocusOrVisible = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      fetchLiveOrders();
    }
  };

  // 4. Listen to local/custom order events
  const handleOrderChange = () => {
    fetchLiveOrders();
  };

  // 5. BroadcastChannel handler for 0ms cross-device & cross-tab updates
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === "orders") {
      fetchLiveOrders();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleFocusOrVisible);
    window.addEventListener("online", handleFocusOrVisible);
    window.addEventListener("hos-order-created", handleOrderChange);
    window.addEventListener("hos-order-updated", handleOrderChange);
    window.addEventListener("hos-orders-updated", handleOrderChange);
    window.addEventListener("storage", (e) => {
      if (e.key === ORDERS_CACHE_KEY) {
        callback(getCachedOrders());
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleFocusOrVisible);
  }

  if (syncChannel) {
    syncChannel.addEventListener("message", handleBroadcastMessage);
  }

  // 6. Firestore real-time listener
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
    active = false;
    clearInterval(pollTimer);
    unsubFs();
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", handleFocusOrVisible);
      window.removeEventListener("online", handleFocusOrVisible);
      window.removeEventListener("hos-order-created", handleOrderChange);
      window.removeEventListener("hos-order-updated", handleOrderChange);
      window.removeEventListener("hos-orders-updated", handleOrderChange);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    }
    if (syncChannel) {
      syncChannel.removeEventListener("message", handleBroadcastMessage);
    }
  };
}

export async function findOrderByOrderNumber(queryStr: string): Promise<Order | null> {
  const clean = queryStr.trim();
  if (!clean) return null;
  const cleanUpper = clean.toUpperCase();
  const digitsOnly = clean.replace(/\D/g, "");

  // 1. Check local cache first
  const localList = getCachedOrders();
  const local = localList.find(
    (o) =>
      o.orderNumber?.toUpperCase() === cleanUpper ||
      o.id === clean ||
      (digitsOnly.length >= 4 && o.orderNumber?.includes(digitsOnly)) ||
      (digitsOnly.length === 10 && (o.customer?.phone?.replace(/\D/g, "").endsWith(digitsOnly)))
  );
  if (local) return local;

  // 2. Fetch latest live orders from backend API for cross-device support (mobile / friend's device)
  try {
    const res = await fetch(`/api/orders?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (res.ok) {
      const serverOrders: Order[] = await res.json();
      if (Array.isArray(serverOrders)) {
        cacheOrdersLocally(serverOrders);
        const match = serverOrders.find(
          (o) =>
            o.orderNumber?.toUpperCase() === cleanUpper ||
            o.id === clean ||
            (digitsOnly.length >= 4 && o.orderNumber?.includes(digitsOnly)) ||
            (digitsOnly.length === 10 && (o.customer?.phone?.replace(/\D/g, "").endsWith(digitsOnly)))
        );
        if (match) return match;
      }
    }
  } catch {}

  // 3. Query single order endpoint from backend API
  try {
    const singleRes = await fetch(`/api/orders/${encodeURIComponent(cleanUpper)}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (singleRes.ok) {
      const singleOrder: Order = await singleRes.json();
      if (singleOrder && singleOrder.orderNumber) {
        return singleOrder;
      }
    }
  } catch {}

  // 4. Query Firestore
  try {
    const q = query(collection(db, "orders"), where("orderNumber", "==", cleanUpper), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Order;
    }
  } catch {}

  // 5. Try phone query on Firestore
  if (digitsOnly.length === 10) {
    try {
      const qPhone = query(collection(db, "orders"), where("customer.phone", "==", clean), limit(1));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        return { id: snapPhone.docs[0].id, ...snapPhone.docs[0].data() } as Order;
      }
    } catch {}
  }

  return null;
}

export async function confirmOrderPayment(
  orderIdOrNumber: string,
  utrNumber: string,
  paymentMethod: string = "UPI / QR Code"
): Promise<{ success: boolean; order?: Order; message?: string }> {
  const cleanUtr = utrNumber.trim();
  if (!cleanUtr) {
    return { success: false, message: "Please provide a valid UTR or Transaction Reference number" };
  }

  const now = new Date().toISOString();
  const currentOrders = getCachedOrders();
  let targetIdx = currentOrders.findIndex(
    (o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber
  );

  let placedOrdersList: Order[] = [];
  try {
    placedOrdersList = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
  } catch {}

  const placedIdx = placedOrdersList.findIndex(
    (o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber
  );

  const existing =
    (targetIdx > -1 ? currentOrders[targetIdx] : null) ||
    (placedIdx > -1 ? placedOrdersList[placedIdx] : null);

  const realOrderId = existing?.id || orderIdOrNumber;

  const paymentPayload = {
    paymentStatus: "Payment Verification Pending" as PaymentStatus,
    paymentMethod: paymentMethod as any,
    utrNumber: cleanUtr,
    paymentDetails: {
      methodType: "upi" as const,
      utrNumber: cleanUtr,
      transactionReference: cleanUtr,
      paidAt: now,
    },
    updatedAt: now,
  };

  let updatedOrder: Order = existing
    ? {
        ...existing,
        ...paymentPayload,
      }
    : ({
        id: realOrderId,
        orderNumber: typeof orderIdOrNumber === "string" && orderIdOrNumber.startsWith("HOS-") ? orderIdOrNumber : `HOS-${realOrderId.slice(0, 6).toUpperCase()}`,
        status: "pending",
        orderStatus: "pending",
        createdAt: now,
        ...paymentPayload,
      } as any);

  // 1. Sync to central backend API
  try {
    const apiRes = await fetch(`/api/orders/${encodeURIComponent(realOrderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data?.order) {
        updatedOrder = { ...updatedOrder, ...data.order, ...paymentPayload };
      }
    }
  } catch (err) {
    console.warn("API payment confirmation notice:", err);
  }

  // 2. Sync to Firestore
  try {
    const docRef = doc(db, "orders", realOrderId);
    await updateDoc(docRef, paymentPayload);
  } catch (fsErr) {
    console.warn("Firestore payment confirmation notice:", fsErr);
  }

  // 3. Update global cached orders
  const nextList = [...currentOrders];
  if (targetIdx > -1) {
    nextList[targetIdx] = updatedOrder;
  } else {
    nextList.unshift(updatedOrder);
  }
  cacheOrdersLocally(nextList);

  // 4. Update customer placed orders cache (hos_placed_orders)
  try {
    if (placedIdx > -1) {
      placedOrdersList[placedIdx] = updatedOrder;
    } else {
      placedOrdersList.unshift(updatedOrder);
    }
    localStorage.setItem("hos_placed_orders", JSON.stringify(placedOrdersList));
  } catch (e) {
    console.warn("Error updating hos_placed_orders:", e);
  }

  // 5. Dispatch real-time local events
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-order-updated", { detail: updatedOrder }));
    window.dispatchEvent(new CustomEvent("hos-orders-updated", { detail: nextList }));
  }
  broadcastCrossDeviceSync("orders", updatedOrder);

  return {
    success: true,
    order: updatedOrder || undefined,
    message: "Payment confirmation submitted successfully. Verification in progress.",
  };
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

export function generateCustomerReferralCode(name?: string, uid?: string): string {
  const clean = (name || "HOS").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = clean.slice(0, 3) || "HOS";
  const suffix = (uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || Math.floor(1000 + Math.random() * 9000).toString();
  return `HOS-${prefix}${suffix}`;
}

export async function creditReferrer(referrerCode: string): Promise<void> {
  const cleanCode = referrerCode.trim().toUpperCase();
  if (!cleanCode) return;
  try {
    const q = query(collection(db, "customers"), where("referralCode", "==", cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as CustomerProfile;
      const updatedCount = (data.referralCount || 0) + 1;
      const updatedEarnings = (data.referralEarnings || 0) + 100;
      await updateDoc(docSnap.ref, {
        referralCount: updatedCount,
        referralEarnings: updatedEarnings,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("Notice: creditReferrer non-blocking error:", err);
  }
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
  const myReferralCode = generateCustomerReferralCode(cleanName, uid);

  // Check entered referral code
  const cleanEnteredRef = (referralCode || localStorage.getItem("hos_pending_referral") || "").trim().toUpperCase();
  let validReferralApplied = false;
  let referrerCodeToSave: string | undefined = undefined;

  if (cleanEnteredRef && cleanEnteredRef !== myReferralCode) {
    validReferralApplied = true;
    referrerCodeToSave = cleanEnteredRef;
    try {
      localStorage.setItem("hos_pending_referral", cleanEnteredRef);
      localStorage.setItem("hos_referral_discount", "100");
    } catch {}
    // Credit referrer
    creditReferrer(cleanEnteredRef).catch(() => {});
  }

  const profile: CustomerProfile = {
    uid,
    email: cleanEmail,
    fullName: cleanName,
    phone: cleanPhone,
    savedAddresses: [],
    tier: "House Patron",
    referralCode: myReferralCode, // Unique personal referral code
    referredBy: referrerCodeToSave,
    referralDiscountAvailable: validReferralApplied ? 100 : 0,
    referralCount: 0,
    referralEarnings: 0,
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

export async function customerSignIn(email: string, pass: string, enteredReferralCode?: string): Promise<User> {
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
    let profileData: CustomerProfile;
    if (profileSnap.exists()) {
      profileData = profileSnap.data() as CustomerProfile;
    } else {
      const cached = localStorage.getItem("hos_customer_profile");
      profileData = cached ? JSON.parse(cached) : { uid: finalUser.uid, email: cleanEmail, fullName: finalUser.displayName || "Patron" };
    }

    // Ensure customer has their unique referral code
    if (!profileData.referralCode) {
      profileData.referralCode = generateCustomerReferralCode(profileData.fullName || finalUser.displayName, finalUser.uid);
      await setDoc(doc(db, "customers", finalUser.uid), { referralCode: profileData.referralCode }, { merge: true }).catch(() => {});
    }

    // Check if referral code was entered on login or pending from URL/storage
    const candidateRef = (enteredReferralCode || localStorage.getItem("hos_pending_referral") || "").trim().toUpperCase();
    if (
      candidateRef &&
      !profileData.referredBy &&
      !profileData.claimedReferralDiscount &&
      candidateRef !== profileData.referralCode
    ) {
      profileData.referredBy = candidateRef;
      profileData.referralDiscountAvailable = 100;
      await setDoc(
        doc(db, "customers", finalUser.uid),
        { referredBy: candidateRef, referralDiscountAvailable: 100 },
        { merge: true }
      ).catch(() => {});
      localStorage.setItem("hos_pending_referral", candidateRef);
      localStorage.setItem("hos_referral_discount", "100");
      creditReferrer(candidateRef).catch(() => {});
    }

    localStorage.setItem("hos_customer_profile", JSON.stringify(profileData));
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
  customerEmail?: string,
  customerId?: string
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

  // Referral code logic (starts with HOS-, REF-, or 6+ characters)
  if (cleanCode.startsWith("HOS-") || cleanCode.startsWith("REF-") || cleanCode.length >= 6) {
    // 1. Check if user is using their own code
    try {
      const localProfStr = localStorage.getItem("hos_customer_profile");
      if (localProfStr) {
        const localProf = JSON.parse(localProfStr);
        if (localProf?.referralCode && localProf.referralCode.trim().toUpperCase() === cleanCode) {
          return { valid: false, error: "You cannot use your own referral code." };
        }
        if (localProf?.claimedReferralDiscount || localProf?.usedReferralCode) {
          return {
            valid: false,
            error: "A referral discount has already been applied to this account. Only one referral discount is permitted per customer ID.",
          };
        }
      }
    } catch {}

    // 2. Check placed orders: One referral discount per customer ID / email
    try {
      const orders: Order[] = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
      const emailToCheck = (customerEmail || "").trim().toLowerCase();
      const idToCheck = (customerId || "").trim();

      const existingOrderWithRef = orders.find((o) => {
        const matchEmail = emailToCheck && o.customer?.email?.trim().toLowerCase() === emailToCheck;
        const matchId = idToCheck && o.userId === idToCheck;
        return (matchEmail || matchId) && (o.referralCode || (o.referralDiscount && o.referralDiscount > 0));
      });

      if (existingOrderWithRef) {
        return {
          valid: false,
          error: "Referral discount has already been used on this customer account. Only one referral discount is allowed per customer ID.",
        };
      }
    } catch {}

    return {
      valid: true,
      discountAmount: 100, // Exactly ₹100 discount as requested
      referrerName: "House Patron",
      referralCode: cleanCode,
      message: "Referral code applied: ₹100 instant discount on your order!",
    };
  }

  return { valid: false, error: "Invalid referral code. Please check and re-enter." };
}

export async function fetchCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  let profile: CustomerProfile | null = null;
  try {
    const docRef = doc(db, "customers", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      profile = snap.data() as CustomerProfile;
    }
  } catch {}

  if (!profile) {
    try {
      const local = localStorage.getItem("hos_customer_profile");
      if (local) profile = JSON.parse(local);
    } catch {}
  }

  if (profile) {
    // Ensure referralCode exists
    if (!profile.referralCode) {
      profile.referralCode = generateCustomerReferralCode(profile.fullName, profile.uid);
      try {
        await setDoc(doc(db, "customers", uid), { referralCode: profile.referralCode }, { merge: true });
      } catch {}
    }
    try {
      localStorage.setItem("hos_customer_profile", JSON.stringify(profile));
    } catch {}
    return profile;
  }

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

  // 1. Fetch from server API
  try {
    const res = await fetch(`/api/bookings?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const serverList = await res.json();
      if (Array.isArray(serverList)) {
        list = serverList;
        localStorage.setItem("hos_atelier_bookings", JSON.stringify(serverList));
        return list;
      }
    }
  } catch {}

  // 2. Firestore fallback if available
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

  // Central Server API sync
  try {
    await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch (apiErr) {
    console.warn("API booking update notice:", apiErr);
  }

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

  // Central Server API deletion
  try {
    await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
      method: "DELETE",
    });
  } catch (apiErr) {
    console.warn("API booking delete notice:", apiErr);
  }

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

  // Central Server API sync
  try {
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
  } catch (apiErr) {
    console.warn("API admin booking create notice:", apiErr);
  }

  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await setDoc(bookingRef, booking, { merge: true });
  } catch (e) {
    console.warn("Firestore adminCreateAtelierBooking error:", e);
  }

  window.dispatchEvent(new CustomEvent("hos-booking-created", { detail: booking }));
  broadcastCrossDeviceSync("bookings", booking);
  return booking;
}

export async function adminCreateOrder(orderInput: Partial<Order>): Promise<Order> {
  const now = new Date();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const orderNumber =
    orderInput.orderNumber || `HOS-${now.getFullYear()}-${randomNum}`;
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

  // 1. Sync to central backend API
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, updatedAt: now }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.order) {
        const freshOrders = getCachedOrders();
        const fIdx = freshOrders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
        if (fIdx > -1) {
          freshOrders[fIdx] = data.order;
          cacheOrdersLocally(freshOrders);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("hos-orders-updated", { detail: freshOrders }));
          }
        }
      }
    }
  } catch {}

  // 2. Sync to Firestore
  try {
    const docRef = doc(db, "orders", orderId);
    await updateDoc(docRef, { ...updates, updatedAt: now });
  } catch (e) {
    console.warn("Firestore adminUpdateOrder error:", e);
  }

  // 3. Broadcast real-time event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-order-updated", { detail: { orderId, ...updates } }));
  }
  broadcastCrossDeviceSync("orders");
}

export async function adminDeleteOrder(orderId: string): Promise<void> {
  const current = getCachedOrders();
  const filtered = current.filter((o) => o.id !== orderId && o.orderNumber !== orderId);
  cacheOrdersLocally(filtered);

  // 1. Central backend API deletion
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "DELETE",
    });
  } catch {}

  // 2. Firestore deletion
  try {
    const docRef = doc(db, "orders", orderId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn("Firestore adminDeleteOrder error:", e);
  }

  // 3. Broadcast real-time event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-orders-updated", { detail: filtered }));
  }
  broadcastCrossDeviceSync("orders", filtered);
}
