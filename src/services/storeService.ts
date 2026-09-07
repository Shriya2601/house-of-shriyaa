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
  serverTimestamp,
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
  AdminAuthCredentials,
  CustomerProfile,
  SavedAddress,
  UserAccount,
  UserRole,
  UserAccountStatus,
} from "../types";
import { products as defaultProducts } from "../data/products";
import savedSiteContentJson from "../data/siteContent.json";
import savedCategoriesJson from "../data/categories.json";

export interface FirestoreWriteResult {
  success: boolean;
  error?: any;
  notice?: string;
}

/**
 * Safe Firestore write helper that sanitizes input and enforces a strict 3000ms timeout
 * so that exhausted quotas, offline states, or network stalls never hang the application UI.
 */
export async function safeFirestoreSet(
  docRef: any,
  data: any,
  options: { merge?: boolean } = { merge: true }
): Promise<FirestoreWriteResult> {
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    await Promise.race([
      setDoc(docRef, sanitized, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 3000)),
    ]);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isQuota =
      msg.includes("Quota limit exceeded") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      err?.code === "resource-exhausted";
    console.warn("Firestore sync status:", err);
    return {
      success: false,
      error: err,
      notice: isQuota
        ? "Cloud quota limit reached (saved to local & server storage)"
        : "Cloud write timeout (saved to local & server storage)",
    };
  }
}

export async function safeFirestoreDelete(docRef: any): Promise<boolean> {
  try {
    await Promise.race([
      deleteDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore delete timeout")), 2000)),
    ]);
    return true;
  } catch (err) {
    console.warn("Firestore delete skipped or unavailable (persisting locally & to repository):", err);
    return false;
  }
}

// Default Site Content
export const defaultSiteContent: SiteContent = (savedSiteContentJson && (savedSiteContentJson as any).brandTagline)
  ? (savedSiteContentJson as SiteContent)
  : {
  announcementText: "Explore Velvet Drop · Free Express Delivery on ₹1,999+",
  announcementCta: "Explore Velvet Drop",
  announcementVisible: true,
  brandTagline: "Heirloom Indian couture, thoughtfully woven and made to measure in Surat.",
  brandDescription: "Where pretty meets effortless elegance",
  contactPhone: "+91 95016 98356",
  contactEmail: "houseofshriya.in@gmail.com",
  whatsappNumber: "+919501698356",
  atelierCity: "Surat, Gujarat, India",
  footerNote: "© House of Shriya. Made for your forever wardrobe.",
  heroSlides: [
    {
      eyebrow: "DAILY / Festive Couture",
      number: "01",
      collection: "Velvet Marigold Edit",
      title: "Rooh-e-Gulab Micro Velvet 9000 & Hand-Woven Katan Silk",
      description: "Crafted in Surat with 100% pure fabrics, bespoke Alia-cut silhouettes, and delicate zardozi detailing.",
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
      season: "AUTUMN/FESTIVE 2026",
      caption: "Gul-e-Noor Emerald Alia Cut Suit Set",
      mood: "Emerald & Saffron Weaves",
      ctaText: "Explore Festive Edit",
      ctaTarget: "catalog-section",
    },
    {
      eyebrow: "Artisan Heirlooms",
      number: "02",
      collection: "Kashmir to Kashi",
      title: "Pure Banarasi Booti & Kashmiri Tilla Embroidered Lengths",
      description: "Unstitched 3-piece regal fabric lengths tailored for custom sizing from XS to 5XL with soft butter silk lining.",
      image: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=900&q=85",
      season: "ROYAL HERITAGE 2026",
      caption: "Kashmiri Tilla Saffron Katan Weave",
      mood: "Antique Zari & Handlooms",
      ctaText: "Discover Unstitched",
      ctaTarget: "catalog-section",
    },
    {
      eyebrow: "Modern Pret & Daily Chic",
      number: "03",
      collection: "Mulmul & Youthful Co-ords",
      title: "Featherlight Cotton Suits & Chic College Peplum Ensembles",
      description: "Effortless silhouettes with deep functional pockets, breathable Bagru blocks, and modern tailored fits.",
      image: "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?auto=format&fit=crop&w=900&q=85",
      season: "DAILY CHIC 2026",
      caption: "Lilac Blossom Breathable Chanderi Set",
      mood: "Pastel Silks & Easy Linens",
      ctaText: "Shop Daily Chic",
      ctaTarget: "catalog-section",
    },
  ],
  features: [
    { id: "f1", title: "Heritage Craftsmanship", text: "Artisanal hand-woven heirlooms", iconName: "Crown" },
    { id: "f2", title: "100% Pure Handlooms", text: "Authentic Banarasi & Chanderi", iconName: "Sparkles" },
    { id: "f3", title: "Instant UPI & Cards", text: "Zero-hassle secure checkout", iconName: "Check" },
    { id: "f4", title: "Worldwide Express", text: "Fast insured courier delivery", iconName: "PackageCheck" },
  ],
  catalogTitle: "Curated Boutique Catalog",
  catalogSubtitle: "Handcrafted pure fabrics, regal Alia silhouettes, and luxury unstitched sets",
  navLinks: [
    { id: "nav-1", label: "Catalog", href: "catalog-section" },
    { id: "nav-3", label: "Our Story", href: "/our-story" },
    { id: "nav-4", label: "Craftsmanship", href: "/craftsmanship" },
    { id: "nav-5", label: "Journal", href: "/journal" },
  ],
};

export const defaultCategories: CategoryItem[] = (savedCategoriesJson && Array.isArray(savedCategoriesJson) && savedCategoriesJson.length > 0)
  ? (savedCategoriesJson as CategoryItem[])
  : [
  { id: "cat-1", name: "All Collections", slug: "All Collections", description: "Complete handcrafted luxury catalog", sortOrder: 1 },
  { id: "cat-2", name: "Cotton Suits", slug: "Cotton Suits", description: "Pure Mulmul & Hand-block everyday sets", sortOrder: 2 },
  { id: "cat-3", name: "Satin Wear", slug: "Satin Wear", description: "Lustrous evening & celebration silks", sortOrder: 3 },
  { id: "cat-4", name: "Party Wear", slug: "Party Wear", description: "Statement embroidery, Alia cuts & Shararas", sortOrder: 4 },
  { id: "cat-5", name: "Festive Wear", slug: "Festive Wear", description: "Opulent Katan, Brocades & Tilla weaves", sortOrder: 5 },
  { id: "cat-6", name: "Daily & College Wear", slug: "Daily & College Wear", description: "Airy co-ords with functional pockets", sortOrder: 6 },
  { id: "cat-7", name: "Seasonal Drop", slug: "Seasonal Drop", description: "Limited micro velvet and heirloom drops", sortOrder: 7 },
];

const SITE_CONTENT_DOC = "global_settings";
const SITE_CONTENT_CACHE_KEY = "hos_site_content_cache_v2";

/* ============================================================
   SITE CONTENT & CMS
============================================================ */

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) return { ...defaultSiteContent, ...parsed };
    }
  } catch {}

  try {
    const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { ...defaultSiteContent, ...(snap.data() as SiteContent) };
      try {
        localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn("Firestore getSiteContent offline/fallback:", err);
  }
  return defaultSiteContent;
}

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

  // Live fetch from server database API with fallback to static JSON
  const fetchLatest = () => {
    fetch(`/api/site-content?v=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          const merged = { ...defaultSiteContent, ...data };
          try {
            localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        } else {
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
        }
      })
      .catch(() => {});
  };

  fetchLatest();

  // Instant update across tabs / windows via custom event
  const handleUpdate = (e: any) => {
    if (e.detail) callback(e.detail);
  };
  window.addEventListener("hos-sitecontent-updated", handleUpdate);

  // Firestore subscription with safe non-blocking handling
  const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
  let unsubFs = () => {};
  try {
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
      (err) => {
        console.warn("subscribeSiteContent Firestore notice:", err);
      }
    );
  } catch {}

  return () => {
    window.removeEventListener("hos-sitecontent-updated", handleUpdate);
    unsubFs();
  };
}

export async function saveSiteContent(content: Partial<SiteContent>): Promise<void> {
  const merged = { ...defaultSiteContent, ...content, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
  } catch {}

  // 1. Post directly to server database API
  try {
    await fetch("/api/site-content", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify(merged),
    });
  } catch (apiErr) {
    console.warn("API save site content notice:", apiErr);
  }

  // 2. Sync to repository
  try {
    fetch("/api/save-repo-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify({
        siteContent: merged,
        commitMessage: `chore(cms): updated site content and announcement`,
      }),
    }).catch(() => {});
  } catch {}

  // 3. Dispatch event for instant UI update
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hos-sitecontent-updated", { detail: merged }));
  }

  // 4. Firestore attempt with timeout protection (non-blocking)
  const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
  safeFirestoreSet(docRef, merged, { merge: true }).catch(() => {});
}

/* ============================================================
   CATEGORIES MANAGEMENT (PERSISTENT CRUD & REMOVALS)
============================================================ */

const DELETED_CATEGORIES_KEY = "hos_deleted_category_ids_v2";
const CATEGORIES_CACHE_KEY = "hos_categories_cache_v2";

export function getDeletedCategoryIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function saveDeletedCategoryIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getCachedCategories(): CategoryItem[] {
  const deletedIds = getDeletedCategoryIds();
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c) => !deletedIds.has(c.id));
      }
    }
  } catch {}
  return defaultCategories.filter((c) => !deletedIds.has(c.id));
}

export function cacheCategoriesLocally(categories: CategoryItem[]): void {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch {}
}

export function subscribeCategories(callback: (categories: CategoryItem[]) => void): () => void {
  const cached = getCachedCategories();
  if (cached.length > 0) {
    callback(cached);
  }

  // Live fetch from server database API with fallback to static JSON
  const fetchCategories = () => {
    fetch(`/api/categories?v=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((remoteCategories) => {
        if (Array.isArray(remoteCategories) && remoteCategories.length > 0) {
          const deletedIds = getDeletedCategoryIds();
          const filtered = remoteCategories.filter((c: CategoryItem) => !deletedIds.has(c.id));
          if (filtered.length > 0) {
            cacheCategoriesLocally(filtered);
            callback(filtered);
          }
        } else {
          return fetch(`/data/categories.json?v=${Date.now()}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((remote) => {
              if (Array.isArray(remote) && remote.length > 0) {
                const deletedIds = getDeletedCategoryIds();
                const filtered = remote.filter((c: CategoryItem) => !deletedIds.has(c.id));
                if (filtered.length > 0) {
                  cacheCategoriesLocally(filtered);
                  callback(filtered);
                }
              }
            });
        }
      })
      .catch(() => {});
  };

  fetchCategories();

  const handleSaved = () => fetchCategories();
  const handleDeleted = () => fetchCategories();
  window.addEventListener("hos-category-saved", handleSaved);
  window.addEventListener("hos-category-deleted", handleDeleted);

  const colRef = collection(db, "categories");
  const q = query(colRef, orderBy("sortOrder", "asc"));
  let unsubFs = () => {};
  try {
    unsubFs = onSnapshot(
      q,
      (snapshot) => {
        const deletedIds = getDeletedCategoryIds();
        if (!snapshot.empty) {
          const list = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() } as CategoryItem))
            .filter((c) => !deletedIds.has(c.id));
          cacheCategoriesLocally(list);
          callback(list);
        } else {
          const fallback = defaultCategories.filter((c) => !deletedIds.has(c.id));
          cacheCategoriesLocally(fallback);
          callback(fallback);
        }
      },
      (err) => {
        console.warn("subscribeCategories Firestore notice:", err);
        const fallback = getCachedCategories();
        callback(fallback);
      }
    );
  } catch {}

  return () => {
    window.removeEventListener("hos-category-saved", handleSaved);
    window.removeEventListener("hos-category-deleted", handleDeleted);
    unsubFs();
  };
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  const id = category.id || `cat-${Date.now()}`;
  const sanitized = { ...category, id };

  try {
    const deletedIds = getDeletedCategoryIds();
    if (deletedIds.has(id)) {
      deletedIds.delete(id);
      saveDeletedCategoryIds(deletedIds);
    }

    const current = getCachedCategories();
    const existingIdx = current.findIndex((c) => c.id === id);
    let updated: CategoryItem[];
    if (existingIdx > -1) {
      updated = [...current];
      updated[existingIdx] = sanitized;
    } else {
      updated = [...current, sanitized];
    }
    cacheCategoriesLocally(updated);

    // 1. Post to Server Database API
    try {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify(sanitized),
      });
    } catch (apiErr) {
      console.warn("API save category notice:", apiErr);
    }

    // 2. Sync to repository
    try {
      fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({
          categories: updated,
          commitMessage: `chore(catalog): saved category folder ${sanitized.name}`,
        }),
      }).catch(() => {});
    } catch {}

    window.dispatchEvent(new CustomEvent("hos-category-saved", { detail: sanitized }));
  } catch (err) {
    console.warn("Category local storage save warning:", err);
  }

  // Non-blocking Firestore update with timeout protection
  const docRef = doc(db, "categories", id);
  safeFirestoreSet(docRef, sanitized, { merge: true }).catch(() => {});
}

export async function deleteCategory(id: string): Promise<void> {
  // 1. Mark in persistent deleted set and local cache immediately
  try {
    const deletedIds = getDeletedCategoryIds();
    deletedIds.add(id);
    saveDeletedCategoryIds(deletedIds);

    const current = getCachedCategories();
    const filtered = current.filter((c) => c.id !== id);
    cacheCategoriesLocally(filtered);

    // 2. Delete from Server Database API
    try {
      await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...getAdminAuthHeaders() },
      });
    } catch (apiErr) {
      console.warn("API delete category notice:", apiErr);
    }

    // 3. Persist to git/server repository
    try {
      fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({
          categories: filtered,
          commitMessage: `chore(catalog): permanently deleted category folder ${id}`,
        }),
      }).catch(() => {});
    } catch {}

    // 4. Dispatch real-time event to all UI elements
    window.dispatchEvent(new CustomEvent("hos-category-deleted", { detail: { id } }));
  } catch (err) {
    console.warn("deleteCategory cache update error:", err);
  }

  // 5. Non-blocking Firestore deletion with timeout protection
  safeFirestoreDelete(doc(db, "categories", id)).catch(() => {});
}

/* ============================================================
   PRODUCTS MANAGEMENT (CRUD & INDEPENDENT COLOR VARIANTS)
============================================================ */

export const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80";
const PRODUCTS_CACHE_KEY = "hos_products_cache_v2";

/**
 * Normalizes any product document so that colorVariants is ALWAYS an array
 * with at least one fully formed variant, preserving all existing data and images.
 */
export function ensureProductVariants(data: any): Product {
  const imagesList: string[] = Array.isArray(data.images) && data.images.length > 0
    ? data.images.filter(Boolean)
    : [data.image || DEFAULT_FALLBACK_IMAGE, ...(data.hoverImage && data.hoverImage !== data.image ? [data.hoverImage] : [])].filter(Boolean);

  const fallbackImage = imagesList[0] || data.image || DEFAULT_FALLBACK_IMAGE;
  const fallbackHover = imagesList[1] || data.hoverImage || fallbackImage;

  let variants: ColorVariant[] = [];

  if (Array.isArray(data.colorVariants) && data.colorVariants.length > 0) {
    variants = data.colorVariants.map((v: any, idx: number) => {
      // Preserve this variant's specific images cleanly
      let vImgs: string[] = [];
      if (Array.isArray(v.images)) {
        vImgs = v.images.filter(Boolean);
      } else if (v.image) {
        vImgs = [v.image, ...(v.hoverImage && v.hoverImage !== v.image ? [v.hoverImage] : [])].filter(Boolean);
      } else if (idx === 0) {
        vImgs = imagesList;
      }

      // STRICT VARIANT ISOLATION:
      // Variant 0 (primary) uses fallback images if needed.
      // Secondary variants (idx > 0) MUST ONLY use their own photos!
      const vPrimary = vImgs[0] || (idx === 0 ? fallbackImage : "");
      const vHover = vImgs[1] || (idx === 0 ? fallbackHover : vPrimary);

      return {
        id: v.id || `var-${data.id || "prod"}-${idx}-${Date.now()}`,
        colorName: v.colorName || (idx === 0 ? (data.color || "Standard Edition") : `Color Variant ${idx + 1}`),
        colorHex: v.colorHex || (idx === 0 ? (data.colorHex || "#0d4f3c") : "#c5a059"),
        price: v.price?.startsWith("₹") ? v.price : (v.price ? `₹${v.price}` : data.price || "₹2,999"),
        originalPrice: v.originalPrice?.startsWith("₹") ? v.originalPrice : (v.originalPrice ? `₹${v.originalPrice}` : data.originalPrice || "₹4,499"),
        savings: v.savings || data.savings || "Save 30%",
        description: v.description !== undefined && v.description !== null ? v.description : (data.description || ""),
        fabricType: v.fabricType || data.fabricType || "Pure Handloom",
        images: vImgs.slice(0, 10),
        image: vPrimary,
        hoverImage: vHover,
        inStock: v.inStock !== false,
      };
    });
  } else {
    // Generate default variant from existing product fields - NO data or images lost!
    variants = [
      {
        id: `var-${data.id || "prod"}-0`,
        colorName: data.color || "Standard Edition",
        colorHex: data.colorHex || "#0d4f3c",
        price: data.price?.startsWith("₹") ? data.price : `₹${data.price || "2,999"}`,
        originalPrice: data.originalPrice?.startsWith("₹") ? data.originalPrice : `₹${data.originalPrice || "4,499"}`,
        savings: data.savings || "Save 30%",
        description: data.description || "",
        fabricType: data.fabricType || "Pure Handloom",
        images: imagesList.slice(0, 10),
        image: fallbackImage,
        hoverImage: fallbackHover,
        inStock: data.inStock !== false,
      },
    ];
  }

  const primaryVariant = variants[0];

  return {
    ...data,
    id: data.id || `hos-${Date.now()}`,
    name: data.name || "Handcrafted Suit Set",
    description: primaryVariant?.description || data.description || "",
    color: primaryVariant?.colorName || data.color || "Standard Edition",
    colorHex: primaryVariant?.colorHex || data.colorHex || "#0d4f3c",
    colorVariants: variants,
    rating: data.rating || "4.9",
    reviews: data.reviews || "18",
    price: primaryVariant?.price || data.price || "₹2,999",
    originalPrice: primaryVariant?.originalPrice || data.originalPrice || "₹4,499",
    savings: primaryVariant?.savings || data.savings || "Save 30%",
    badges: data.badges || ["New Drop"],
    image: primaryVariant?.image || fallbackImage,
    hoverImage: primaryVariant?.hoverImage || fallbackHover,
    images: primaryVariant?.images?.length ? primaryVariant.images : imagesList,
    category: data.category || "All Collections",
    fabricType: primaryVariant?.fabricType || data.fabricType || "Pure Handloom",
    tags: data.tags || [data.category || "Party Wear"],
    inStock: data.inStock !== false && primaryVariant?.inStock !== false,
    sizes: ["Unstitched Suit"],
    activeWishlist: Boolean(data.activeWishlist),
    updatedAt: data.updatedAt || new Date().toISOString(),
  } as Product;
}

// Helper to save products cache to localStorage
function cacheProductsLocally(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch (err) {
    console.warn("Failed to cache products locally (likely quota):", err);
  }
}

// Helper to load cached products from localStorage with deleted filtering
const DELETED_PRODUCTS_KEY = "hos_deleted_product_ids_v2";

export function getDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function saveDeletedProductIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getCachedProducts(): Product[] {
  const deletedIds = getDeletedProductIds();
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureProductVariants).filter((p) => !deletedIds.has(p.id));
      }
    }
  } catch {}
  return defaultProducts.map(ensureProductVariants).filter((p) => !deletedIds.has(p.id));
}

export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  // Immediately serve from cache so user sees their saved updates with zero delay
  const cached = getCachedProducts();
  if (cached.length > 0) {
    callback(cached);
  }

  // Live fetch from server database API with fallback to static JSON
  const fetchRemote = () => {
    fetch(`/api/products?v=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((remoteProducts) => {
        if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
          const deletedIds = getDeletedProductIds();
          const normalized = remoteProducts.map(ensureProductVariants).filter((p) => !deletedIds.has(p.id));
          if (normalized.length > 0) {
            cacheProductsLocally(normalized);
            callback(normalized);
          }
        } else {
          return fetch(`/data/products.json?v=${Date.now()}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((remote) => {
              if (Array.isArray(remote) && remote.length > 0) {
                const deletedIds = getDeletedProductIds();
                const normalized = remote.map(ensureProductVariants).filter((p) => !deletedIds.has(p.id));
                if (normalized.length > 0) {
                  cacheProductsLocally(normalized);
                  callback(normalized);
                }
              }
            });
        }
      })
      .catch(() => {});
  };

  fetchRemote();

  // Listen to window events
  const handleProductSaved = () => fetchRemote();
  const handleProductDeleted = () => fetchRemote();
  const handleCatalogUpdated = () => fetchRemote();
  const handleVisibility = () => {
    if (document.visibilityState === "visible") fetchRemote();
  };

  window.addEventListener("hos-product-saved", handleProductSaved);
  window.addEventListener("hos-product-deleted", handleProductDeleted);
  window.addEventListener("hos-catalog-updated", handleCatalogUpdated);
  document.addEventListener("visibilitychange", handleVisibility);

  // Poll server gently every 6 seconds to ensure instant sync between admin and storefront across tabs
  const pollTimer = setInterval(fetchRemote, 6000);

  const colRef = collection(db, "products");
  let unsubFs = () => {};
  try {
    unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        const deletedIds = getDeletedProductIds();
        if (!snapshot.empty) {
          const fsList = snapshot.docs
            .map((d) => ensureProductVariants({ id: d.id, ...d.data() }))
            .filter((p) => !deletedIds.has(p.id));

          // Safe catalog merge: overlay Firestore docs onto cached products
          // so that if Firestore has only partial items or quota errors, existing products are NEVER lost!
          const currentMap = new Map<string, Product>();
          getCachedProducts().forEach((p) => currentMap.set(p.id, p));
          fsList.forEach((p) => currentMap.set(p.id, p));

          const merged = Array.from(currentMap.values()).filter((p) => !deletedIds.has(p.id));
          cacheProductsLocally(merged);
          callback(merged);
        }
      },
      (err) => {
        console.warn("subscribeProducts Firestore notice (using server database API):", err);
      }
    );
  } catch {}

  return () => {
    window.removeEventListener("hos-product-saved", handleProductSaved);
    window.removeEventListener("hos-product-deleted", handleProductDeleted);
    window.removeEventListener("hos-catalog-updated", handleCatalogUpdated);
    document.removeEventListener("visibilitychange", handleVisibility);
    clearInterval(pollTimer);
    unsubFs();
  };
}

export interface SaveProductResult {
  id: string;
  serverSuccess: boolean;
  firestoreSuccess: boolean;
  firestoreNotice?: string;
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<SaveProductResult> {
  const id = product.id || `hos-${Date.now()}`;
  const docRef = doc(db, "products", id);

  // Normalize product through ensureProductVariants so all variants are fully structured
  const sanitized = ensureProductVariants({
    ...product,
    id,
    updatedAt: new Date().toISOString(),
  });

  // 1. Update local cache and un-delete if previously marked immediately
  const deletedIds = getDeletedProductIds();
  if (deletedIds.has(id)) {
    deletedIds.delete(id);
    saveDeletedProductIds(deletedIds);
  }

  const current = getCachedProducts();
  const existingIdx = current.findIndex((p) => p.id === id);
  let updated: Product[];
  if (existingIdx > -1) {
    updated = [...current];
    updated[existingIdx] = sanitized;
  } else {
    updated = [sanitized, ...current];
  }
  cacheProductsLocally(updated);

  // 2. Persist directly to Server Database API with accurate status check
  let serverSuccess = false;
  try {
    const apiRes = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify(sanitized),
    });
    if (apiRes.ok) {
      serverSuccess = true;
    } else {
      const errJson = await apiRes.json().catch(() => ({}));
      throw new Error(errJson.error || `Server database responded with status ${apiRes.status}`);
    }
  } catch (apiErr: any) {
    console.warn("API save-product error:", apiErr);
    // If it's a real server error (and not just network offline), surface it
    if (apiErr?.message && !apiErr.message.includes("Failed to fetch")) {
      throw apiErr;
    }
  }

  // 3. Persist to project source files & git repository so changes survive rebuilds, refreshes, and deployments
  try {
    await fetch("/api/save-repo-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify({
        products: updated,
        commitMessage: `chore(catalog): saved product ${sanitized.name} with ${sanitized.colorVariants?.length || 1} color variants`,
      }),
    });
  } catch (apiErr) {
    console.warn("API save-repo-changes notice:", apiErr);
  }

  // Notify any local listeners
  window.dispatchEvent(new CustomEvent("hos-product-saved", { detail: sanitized }));
  window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: updated }));

  // 4. Write to Firestore with status detection
  const fsResult = await safeFirestoreSet(docRef, sanitized, { merge: true });

  return {
    id,
    serverSuccess,
    firestoreSuccess: fsResult.success,
    firestoreNotice: fsResult.notice,
  };
}

export async function deleteProduct(id: string, imageUrls?: string[]): Promise<void> {
  try {
    const deletedIds = getDeletedProductIds();
    deletedIds.add(id);
    saveDeletedProductIds(deletedIds);

    const current = getCachedProducts();
    const filtered = current.filter((p) => p.id !== id);
    cacheProductsLocally(filtered);

    // 1. Delete from Server Database API
    try {
      await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...getAdminAuthHeaders() },
      });
    } catch (apiErr) {
      console.warn("API delete product notice:", apiErr);
    }

    // 2. Clean up any uploaded image files associated with this product
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      const uniqueUploads = Array.from(new Set(imageUrls.filter((u) => typeof u === "string" && u.includes("/uploads/"))));
      for (const imgUrl of uniqueUploads) {
        try {
          await fetch("/api/delete-image", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
            body: JSON.stringify({ url: imgUrl }),
          });
        } catch {}
      }
    }

    // 3. Persist to git repository
    try {
      await fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({
          products: filtered,
          commitMessage: `chore(catalog): permanently deleted product ${id}`,
        }),
      });
    } catch {}

    window.dispatchEvent(new CustomEvent("hos-product-deleted", { detail: { id } }));
    window.dispatchEvent(new CustomEvent("hos-catalog-updated", { detail: filtered }));
  } catch (err) {
    console.warn("deleteProduct cache update warning:", err);
  }

  // Non-blocking Firestore deletion with timeout protection
  safeFirestoreDelete(doc(db, "products", id)).catch(() => {});
}

export async function seedInitialProductsIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, "products");
    const snap = await getDocs(colRef);
    if (snap.empty) {
      const deletedProdIds = getDeletedProductIds();
      const deletedCatIds = getDeletedCategoryIds();

      for (const p of defaultProducts) {
        if (deletedProdIds.has(p.id)) continue;
        await setDoc(doc(db, "products", p.id), {
          ...p,
          inStock: true,
          sizes: ["Unstitched Suit"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      // Also seed categories
      for (const c of defaultCategories) {
        if (deletedCatIds.has(c.id)) continue;
        await setDoc(doc(db, "categories", c.id), c);
      }
      // Also seed site content
      await setDoc(doc(db, "site_content", SITE_CONTENT_DOC), defaultSiteContent);
    }
  } catch (err) {
    console.warn("Notice during initial catalog bootstrap:", err);
  }
}

/* ============================================================
   REAL CUSTOMER ORDERS MANAGEMENT
   Rule: Starts completely fresh & empty (zero mock orders).
   Only populated by real customer checkouts.
============================================================ */

export function subscribeOrders(
  callback: (orders: Order[]) => void,
  includeTest = false
): () => void {
  const fetchOrders = () => {
    fetch(`/api/orders?v=${Date.now()}`, {
      headers: {
        ...getAdminAuthHeaders(),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((ordersList) => {
        if (Array.isArray(ordersList)) {
          const filtered = includeTest ? ordersList : ordersList.filter((o) => !o.isTest);
          callback(filtered);
        }
      })
      .catch(() => {});
  };

  fetchOrders();

  const handleOrderCreated = () => fetchOrders();
  const handleOrderUpdated = () => fetchOrders();
  window.addEventListener("hos-order-created", handleOrderCreated);
  window.addEventListener("hos-order-updated", handleOrderUpdated);

  const poll = setInterval(fetchOrders, 8000);

  const colRef = collection(db, "orders");
  const q = query(colRef, orderBy("createdAt", "desc"));
  let unsubFs = () => {};
  try {
    unsubFs = onSnapshot(
      q,
      (snapshot) => {
        const ordersList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Order[];

        const filtered = includeTest
          ? ordersList
          : ordersList.filter((o) => !o.isTest);

        callback(filtered);
      },
      (err) => {
        console.warn("subscribeOrders Firestore notice (using server database API):", err);
      }
    );
  } catch {}

  return () => {
    window.removeEventListener("hos-order-created", handleOrderCreated);
    window.removeEventListener("hos-order-updated", handleOrderUpdated);
    clearInterval(poll);
    unsubFs();
  };
}

export async function createRealOrder(
  orderInput: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">
): Promise<Order> {
  const now = new Date();
  const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `HOS-${datePrefix}-${randomSuffix}`;
  const orderId = `ord_${Date.now()}_${randomSuffix}`;

  const fullOrder: Order = {
    ...orderInput,
    id: orderId,
    orderNumber,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    orderStatus: orderInput.orderStatus || "pending",
  };

  // 1. Post to Server Database API
  try {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullOrder),
    });
  } catch (err) {
    console.warn("API create order notice:", err);
  }

  // 2. Dispatch event for instant storefront / admin update
  window.dispatchEvent(new CustomEvent("hos-order-created", { detail: fullOrder }));

  // 3. Mirror to Firestore non-blocking
  const docRef = doc(db, "orders", orderId);
  safeFirestoreSet(docRef, fullOrder, { merge: true }).catch(() => {});

  return fullOrder;
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: OrderStatus,
  trackingCourier?: string,
  trackingNumber?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    orderStatus,
    updatedAt: new Date().toISOString(),
  };
  if (trackingCourier !== undefined) updates.trackingCourier = trackingCourier;
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (orderStatus === "delivered") updates.paymentStatus = "Paid";
  if (orderStatus === "refunded") updates.paymentStatus = "Refunded";

  // 1. Send PATCH to Server Database API
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn("API update order notice:", err);
  }

  // 2. Dispatch event
  window.dispatchEvent(new CustomEvent("hos-order-updated", { detail: { id: orderId, ...updates } }));

  // 3. Mirror to Firestore non-blocking
  const docRef = doc(db, "orders", orderId);
  updateDoc(docRef, updates).catch(() => {});
}

export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
  // 1. Send PATCH to Server Database API
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify({ notes }),
    });
  } catch {}

  const docRef = doc(db, "orders", orderId);
  updateDoc(docRef, {
    notes,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

export async function deleteOrder(orderId: string): Promise<void> {
  // 1. Send DELETE to Server Database API
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "DELETE",
      headers: { ...getAdminAuthHeaders() },
    });
  } catch {}

  deleteDoc(doc(db, "orders", orderId)).catch(() => {});
}

/* ============================================================
   SECURE ADMIN AUTHENTICATION & SESSION MANAGEMENT
   Server-side environment variables (ADMIN_PASSWORD) protect all admin access.
   Tokens are HMAC-SHA256 signed by the server and verified on all mutations.
============================================================ */

const SESSION_KEY = "hos_admin_session";
const LEGACY_SESSION_KEY = "hos_admin_active_session";
const COOKIE_NAME = "hos_admin_session";

/**
 * Returns authorization headers containing the active admin token.
 * Attached to all administrative mutation requests to protect APIs.
 */
export function getAdminAuthHeaders(): Record<string, string> {
  const session = getStoredAdminSession();
  const token = session?.token;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    "x-admin-token": token,
  };
}

/**
 * Robust cross-domain session cookie setter.
 * Dynamically configures cookie domain:
 * - On houseofshriya.com (or its subdomains), sets domain=.houseofshriya.com so sessions persist across www & apex domain
 * - On development (localhost) or preview environments (e.g. .run.app, .pages.dev), binds to current origin host
 */
export function setSessionCookie(name: string, value: string, maxAgeSeconds: number = 86400): void {
  if (typeof document === "undefined") return;
  try {
    const isHttps = typeof location !== "undefined" && location.protocol === "https:";
    const host = typeof location !== "undefined" ? location.hostname.toLowerCase() : "";
    const secureAttr = isHttps ? "; Secure" : "";
    const encoded = encodeURIComponent(value);

    // Host-bound cookie (guaranteed valid on localhost, cloud preview, or standalone domains)
    document.cookie = `${name}=${encoded}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureAttr}`;

    // Custom domain support: allow sharing between houseofshriya.com and www.houseofshriya.com
    if (host === "houseofshriya.com" || host.endsWith(".houseofshriya.com")) {
      document.cookie = `${name}=${encoded}; path=/; max-age=${maxAgeSeconds}; domain=.houseofshriya.com; SameSite=Lax${secureAttr}`;
    }
  } catch {
    // Non-blocking
  }
}

export function getSessionCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie.split(";");
    for (const c of cookies) {
      const [k, ...v] = c.trim().split("=");
      if (k === name) {
        return decodeURIComponent(v.join("="));
      }
    }
  } catch {
    // Non-blocking
  }
  return null;
}

export function clearSessionCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    const isHttps = typeof location !== "undefined" && location.protocol === "https:";
    const host = typeof location !== "undefined" ? location.hostname.toLowerCase() : "";
    const secureAttr = isHttps ? "; Secure" : "";

    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secureAttr}`;
    if (host === "houseofshriya.com" || host.endsWith(".houseofshriya.com")) {
      document.cookie = `${name}=; path=/; max-age=0; domain=.houseofshriya.com; SameSite=Lax${secureAttr}`;
    }
  } catch {
    // Non-blocking
  }
}

export async function getAdminCredentials(): Promise<AdminAuthCredentials> {
  const session = getStoredAdminSession();
  return {
    username: session?.username || "House of Shriya",
    passwordHash: "",
    salt: "",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Verifies admin credentials directly with the backend API.
 * The backend securely validates against the environment variable ADMIN_PASSWORD.
 */
export async function verifyAdminLogin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; username?: string; error?: string }> {
  try {
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: "Please enter both username and security password." };
    }

    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: cleanUser,
        password: cleanPass,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      const verifiedUsername = data.username || cleanUser || "House of Shriya";
      const token = data.token;
      setStoredAdminSession(verifiedUsername, token);
      return { success: true, username: verifiedUsername };
    }

    return {
      success: false,
      error: data.error || data.message || "Invalid username or security password. Access denied.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication network error.";
    return { success: false, error: msg };
  }
}

/**
 * Validates the currently active admin session token with the backend.
 * Clears expired or forged tokens automatically.
 */
export async function checkAdminSession(): Promise<{ valid: boolean; username?: string }> {
  const session = getStoredAdminSession();
  if (!session?.token) {
    return { valid: false };
  }

  try {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify({ token: session.token }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.valid) {
      return { valid: true, username: data.username || session.username };
    }

    clearStoredAdminSession();
    return { valid: false };
  } catch {
    // If network momentarily hiccups, retain validly formatted local session
    if (session.authenticated && session.token && session.token.includes(".")) {
      return { valid: true, username: session.username };
    }
    return { valid: false };
  }
}

export async function changeAdminCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    const res = await fetch("/api/admin/change-credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify({
        currentPassword: currentPassword.trim(),
        newUsername: newUsername.trim() || "House of Shriya",
        newPassword: newPassword.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      const verifiedUsername = "House of Shriya";
      if (data.token) {
        setStoredAdminSession(verifiedUsername, data.token);
      }
      return { success: true };
    }

    return { success: false, error: data.error || data.message || "Failed to update password on server." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update credentials.";
    return { success: false, error: msg };
  }
}

export function getStoredAdminSession(): { authenticated: boolean; username: string; token?: string } | null {
  try {
    let raw: string | null = null;

    // 1. Check active session storage
    if (typeof sessionStorage !== "undefined") {
      raw = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem(LEGACY_SESSION_KEY);
    }
    // 2. Check local storage
    if (!raw && typeof localStorage !== "undefined") {
      raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
    }
    // 3. Check session cookie
    if (!raw && typeof document !== "undefined") {
      raw = getSessionCookie(COOKIE_NAME) || getSessionCookie(LEGACY_SESSION_KEY);
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.authenticated && parsed.expiresAt > Date.now()) {
      return {
        authenticated: true,
        username: parsed.username || "house of shriya",
        token: parsed.token,
      };
    } else if (parsed && parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      clearStoredAdminSession();
    }
  } catch {
    // Non-blocking
  }
  return null;
}

export function setStoredAdminSession(username: string, token?: string): void {
  try {
    const sessionPayload = {
      authenticated: true,
      username: username || "house of shriya",
      token: token || `hos_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24-hour session
    };
    const raw = JSON.stringify(sessionPayload);

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, raw);
      sessionStorage.setItem(LEGACY_SESSION_KEY, raw);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSION_KEY, raw);
      localStorage.setItem(LEGACY_SESSION_KEY, raw);
    }

    // Set cross-domain session cookie
    setSessionCookie(COOKIE_NAME, raw, 86400);
    setSessionCookie(LEGACY_SESSION_KEY, raw, 86400);
  } catch {
    // Non-blocking
  }
}

export function clearStoredAdminSession(): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LEGACY_SESSION_KEY);
    }
    clearSessionCookie(COOKIE_NAME);
    clearSessionCookie(LEGACY_SESSION_KEY);
  } catch {
    // Non-blocking
  }
}

/* ============================================================
   SECURE ADMIN AUTHENTICATION (Firebase Auth)
   Works on all domains: localhost, preview, and custom domains.
============================================================ */

export async function adminSignIn(email: string, pass: string): Promise<User> {
  const verified = await verifyAdminLogin(email, pass);
  if (!verified.success) {
    throw new Error(verified.error || "Invalid administrator credentials. Access denied.");
  }
  const verifiedName = verified.username || "House of Shriya";
  return createSyntheticCustomerUser("admin_active", email.trim(), verifiedName);
}

export async function adminSignUp(email: string, pass: string, displayName: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  const cleanName = displayName.trim() || "House of Shriya Admin";

  const verified = await verifyAdminLogin(cleanEmail, cleanPass);
  if (verified.success) {
    return createSyntheticCustomerUser("admin_active", cleanEmail, verified.username || cleanName);
  }

  // Attempt credential initialization
  const res = await changeAdminCredentials("Houseofshriy@26", cleanName, cleanPass);
  if (res.success) {
    return createSyntheticCustomerUser("admin_active", cleanEmail, cleanName);
  }

  throw new Error("Admin credentials are authenticated securely by the server. Please sign in with your administrator password.");
}

export async function adminSignOut(): Promise<void> {
  clearStoredAdminSession();
  try {
    await signOut(auth);
  } catch {}
}

export async function adminResetPassword(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      return { success: false, error: "Please enter your registered administrator email address." };
    }

    const res = await fetch("/api/admin/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: clean }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || `Password reset instructions have been sent to ${clean}. Please check your inbox.`,
      };
    }

    // If server returned an explicit error, report it directly
    if (data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: false,
      error: "Unable to dispatch password reset email. You can sign in directly using the temporary master password.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error contacting password reset service.";
    return { success: false, error: msg };
  }
}

export async function adminConfirmResetPassword(
  token: string,
  newPassword: string,
  email?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cleanToken = token.trim();
    const cleanPass = newPassword.trim();
    if (!cleanToken) {
      return { success: false, error: "Please enter your password reset code or link token." };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    const res = await fetch("/api/admin/confirm-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: cleanToken,
        newPassword: cleanPass,
        email: email?.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || "Admin password has been successfully updated. You may now sign in.",
      };
    }

    if (data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    // Check if token can be confirmed via client Firebase Auth action code (oobCode)
    try {
      const { confirmPasswordReset: confirmClientFbReset } = await import("firebase/auth");
      await confirmClientFbReset(auth, cleanToken, cleanPass);
      await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: cleanPass, override: true }),
      }).catch(() => {});
      return {
        success: true,
        message: "Admin password successfully updated. You may now sign in.",
      };
    } catch (clientFbErr: any) {
      const fbMsg =
        clientFbErr?.code === "auth/invalid-action-code" || clientFbErr?.code === "auth/operation-not-allowed"
          ? "This reset link or code is invalid or has already been used. Please request a new password reset."
          : clientFbErr?.code === "auth/expired-action-code"
          ? "This password reset link or code has expired. Please request a new password reset."
          : clientFbErr?.message;
      return {
        success: false,
        error: data.error || fbMsg || "Failed to confirm password reset. Token may be invalid or expired.",
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error confirming password reset.";
    return { success: false, error: msg };
  }
}

// Global state broadcaster for customer and admin auth changes
const authListeners = new Set<(user: User | null) => void>();
let activeLocalCustomerUser: User | null = null;

function broadcastAuthState(user: User | null) {
  activeLocalCustomerUser = user;
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.warn("Auth subscriber callback error:", e);
    }
  });
}

function createSyntheticCustomerUser(uid: string, email: string, displayName: string): User {
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
    getIdToken: async () => localStorage.getItem("hos_customer_token") || "",
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({ uid, email, displayName }),
    phoneNumber: null,
    photoURL: null,
    providerId: "houseofshriya.custom",
  } as unknown as User;
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  authListeners.add(callback);

  // 1. If we already have an active in-memory customer user, emit immediately
  if (activeLocalCustomerUser) {
    callback(activeLocalCustomerUser);
  } else {
    // 2. Check localStorage for persisted customer session
    try {
      const storedProfile = localStorage.getItem("hos_customer_profile");
      const storedToken = localStorage.getItem("hos_customer_token");
      if (storedProfile && storedToken) {
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

  // 3. Verify customer session with server /api/customer/me (handles page reloads & refresh)
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("hos_customer_token") : null;
  fetch("/api/customer/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.authenticated && data.user) {
        if (data.profile) {
          try {
            localStorage.setItem("hos_customer_profile", JSON.stringify(data.profile));
          } catch {}
        }
        const synth = createSyntheticCustomerUser(
          data.user.uid,
          data.user.email,
          data.user.displayName || "Patron"
        );
        activeLocalCustomerUser = synth;
        broadcastAuthState(synth);
      } else if (!token) {
        if (activeLocalCustomerUser) {
          activeLocalCustomerUser = null;
          broadcastAuthState(null);
        }
      }
    })
    .catch(() => {});

  // 4. Also listen to Firebase Auth changes if active
  const unsubFirebase = onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      activeLocalCustomerUser = fbUser;
      callback(fbUser);
    }
  });

  return () => {
    authListeners.delete(callback);
    unsubFirebase();
  };
}

/* ============================================================
   CUSTOMER AUTHENTICATION & PROFILE PERSISTENCE
============================================================ */

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
  const cleanReferral = (referralCode || "").trim().toUpperCase();

  if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (cleanConfirm && cleanPass !== cleanConfirm) {
    throw new Error("Passwords do not match. Please verify your password.");
  }

  // 1. Authoritative Customer Registration via Backend API
  const res = await fetch("/api/customer/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: cleanEmail,
      password: cleanPass,
      confirmPassword: cleanConfirm || cleanPass,
      fullName: cleanName,
      phone: cleanPhone,
      referralCode: cleanReferral || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create customer account. Please try again.");
  }

  const { user, profile, token } = data;
  try {
    if (profile) localStorage.setItem("hos_customer_profile", JSON.stringify(profile));
    if (token) localStorage.setItem("hos_customer_token", token);
  } catch {}

  // 2. Safely sync to Firebase Client SDK in background (non-blocking, ignore operation-not-allowed)
  try {
    createUserWithEmailAndPassword(auth, cleanEmail, cleanPass)
      .then((cred) => {
        if (cred.user) {
          updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
        }
      })
      .catch((fbErr) => {
        // Silently caught: Email/Password provider setting in Firebase Console will not disrupt app functionality
        console.info("Notice: Firebase client auth background sync:", fbErr?.code || fbErr?.message);
      });
  } catch {}

  const synthUser = createSyntheticCustomerUser(user.uid, user.email, user.displayName);
  broadcastAuthState(synthUser);
  return synthUser;
}

export async function customerSignIn(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    throw new Error("Please enter both email address and password.");
  }

  // 1. Authoritative Customer Login via Backend API
  const res = await fetch("/api/customer/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: cleanEmail,
      password: cleanPass,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Incorrect email or password. Please try again.");
  }

  const { user, profile, token } = data;
  try {
    if (profile) localStorage.setItem("hos_customer_profile", JSON.stringify(profile));
    if (token) localStorage.setItem("hos_customer_token", token);
  } catch {}

  // 2. Safely sync to Firebase Client SDK in background
  try {
    signInWithEmailAndPassword(auth, cleanEmail, cleanPass).catch((fbErr) => {
      console.info("Notice: Firebase client auth background sync:", fbErr?.code || fbErr?.message);
    });
  } catch {}

  const synthUser = createSyntheticCustomerUser(user.uid, user.email, user.displayName);
  broadcastAuthState(synthUser);
  return synthUser;
}

export async function validateReferralCode(
  code: string,
  customerEmail?: string
): Promise<{ valid: boolean; discountAmount?: number; referrerName?: string; referralCode?: string; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/referral/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: code.trim().toUpperCase(),
        customerEmail: customerEmail?.trim().toLowerCase(),
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to validate referral code." };
  }
}

export async function customerSignOut(): Promise<void> {
  try {
    localStorage.removeItem("hos_customer_profile");
    localStorage.removeItem("hos_customer_token");
  } catch {}

  try {
    await fetch("/api/customer/logout", { method: "POST" }).catch(() => {});
  } catch {}

  try {
    await signOut(auth).catch(() => {});
  } catch {}

  broadcastAuthState(null);
}

export async function customerResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
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
  } catch (e) {
    console.warn("fetchCustomerProfile notice:", e);
  }

  try {
    const local = localStorage.getItem("hos_customer_profile");
    if (local) return JSON.parse(local);
  } catch {}

  return null;
}

export async function updateCustomerProfile(
  uid: string,
  updates: Partial<CustomerProfile>
): Promise<CustomerProfile> {
  const docRef = doc(db, "customers", uid);
  const dataToUpdate = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, dataToUpdate, { merge: true });
  } catch (e) {
    console.warn("updateCustomerProfile Firestore error:", e);
  }

  const currentLocal = (() => {
    try {
      const s = localStorage.getItem("hos_customer_profile");
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  })();

  const merged = { ...currentLocal, ...dataToUpdate, uid };
  try {
    localStorage.setItem("hos_customer_profile", JSON.stringify(merged));
  } catch {}

  return merged as CustomerProfile;
}

export async function findOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  const clean = orderNumber.trim().toUpperCase();
  if (!clean) return null;

  try {
    const colRef = collection(db, "orders");
    const q = query(colRef, where("orderNumber", "==", clean), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Order;
    }
  } catch (e) {
    console.warn("findOrderByOrderNumber error:", e);
  }

  // Fallback: check local customer orders
  try {
    const localOrders: Order[] = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
    const found = localOrders.find((o) => o.orderNumber?.toUpperCase() === clean);
    if (found) return found;
  } catch {}

  return null;
}

/* ============================================================
   USER ACCOUNTS MANAGEMENT (ADMIN DASHBOARD & AUTH STORE)
============================================================ */

const USER_ACCOUNTS_CACHE_KEY = "hos_cached_user_accounts";

export const defaultUserAccounts: UserAccount[] = [
  {
    id: "usr_admin_master",
    fullName: "House of Shriya (Master Admin)",
    email: "care@houseofshriya.com",
    phone: "+91 98765 43210",
    role: "admin",
    status: "active",
    totalOrders: 0,
    totalSpent: 0,
    city: "New Delhi",
    state: "Delhi",
    notes: "Master store administrator with full catalog and system access.",
    createdAt: "2026-01-26T10:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "usr_stylist_lead",
    fullName: "Shriya Pusha",
    email: "shriya.pusha@sharepal.in",
    phone: "+91 98111 22334",
    role: "editor",
    status: "active",
    totalOrders: 2,
    totalSpent: 11998,
    city: "Mumbai",
    state: "Maharashtra",
    notes: "Lead atelier designer & catalog curator.",
    createdAt: "2026-02-14T11:30:00.000Z",
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "usr_patron_ananya",
    fullName: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    phone: "+91 99887 76655",
    role: "vip",
    status: "active",
    totalOrders: 4,
    totalSpent: 28496,
    city: "Jaipur",
    state: "Rajasthan",
    notes: "VIP House Patron - enjoys Chanderi and pure silk handloom collections.",
    createdAt: "2026-03-01T09:15:00.000Z",
    lastLoginAt: "2026-09-02T14:20:00.000Z",
  },
  {
    id: "usr_patron_meera",
    fullName: "Meera Singhania",
    email: "meera.singhania@example.com",
    phone: "+91 97654 32109",
    role: "customer",
    status: "active",
    totalOrders: 1,
    totalSpent: 4999,
    city: "Bengaluru",
    state: "Karnataka",
    notes: "Ordered Royal Emerald Velvet ensemble for festive season.",
    createdAt: "2026-04-18T16:45:00.000Z",
    lastLoginAt: "2026-08-28T18:10:00.000Z",
  },
  {
    id: "usr_patron_priya",
    fullName: "Priya Kapoor",
    email: "priya.kapoor@example.com",
    phone: "+91 98234 56789",
    role: "wholesale",
    status: "active",
    totalOrders: 3,
    totalSpent: 45000,
    city: "Hyderabad",
    state: "Telangana",
    notes: "Boutique partner / festive bulk orders.",
    createdAt: "2026-05-10T12:00:00.000Z",
    lastLoginAt: "2026-08-15T11:00:00.000Z",
  },
];

export function getCachedUserAccounts(): UserAccount[] {
  if (typeof window === "undefined") return defaultUserAccounts;
  try {
    const raw = localStorage.getItem(USER_ACCOUNTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultUserAccounts;
}

export function cacheUserAccountsLocally(users: UserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_ACCOUNTS_CACHE_KEY, JSON.stringify(users));
  } catch {}
}

export function subscribeUserAccounts(
  callback: (users: UserAccount[]) => void
): () => void {
  const initial = getCachedUserAccounts();
  callback(initial);

  // Sync from server if admin authenticated
  const syncServerUsers = () => {
    fetch(`/api/admin/users?v=${Date.now()}`, {
      headers: {
        ...getAdminAuthHeaders(),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverUsers) => {
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          cacheUserAccountsLocally(serverUsers);
          callback(serverUsers);
        }
      })
      .catch(() => {});
  };

  syncServerUsers();

  const colRef = collection(db, "users");
  const q = query(colRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: UserAccount[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as UserAccount));
        cacheUserAccountsLocally(list);
        callback(list);
      } else {
        seedInitialUsersIfEmpty().catch(() => {});
        callback(initial);
      }
    },
    (err) => {
      console.warn("subscribeUserAccounts listener notice:", err);
      callback(initial);
    }
  );

  return () => {
    unsubscribe();
  };
}

export async function seedInitialUsersIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, "users");
    const snap = await Promise.race([
      getDocs(colRef),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
    ]);
    if (snap && snap.empty) {
      for (const user of defaultUserAccounts) {
        const docRef = doc(db, "users", user.id);
        await safeFirestoreSet(docRef, user);
      }
    }
  } catch (err) {
    console.warn("seedInitialUsersIfEmpty notice:", err);
  }
}

export async function saveUserAccount(
  userData: Partial<UserAccount> & { email: string; fullName: string }
): Promise<string> {
  const userId = userData.id || `usr_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanEmail = userData.email.trim().toLowerCase();
  
  const currentUsers = getCachedUserAccounts();
  const existingIndex = currentUsers.findIndex((u) => u.id === userId || u.email.toLowerCase() === cleanEmail);
  const existingUser = existingIndex >= 0 ? currentUsers[existingIndex] : null;

  const fullUser: UserAccount = {
    id: userId,
    fullName: userData.fullName.trim(),
    email: cleanEmail,
    phone: userData.phone?.trim() || existingUser?.phone || "",
    role: userData.role || existingUser?.role || "customer",
    status: userData.status || existingUser?.status || "active",
    totalOrders: typeof userData.totalOrders === "number" ? userData.totalOrders : (existingUser?.totalOrders || 0),
    totalSpent: typeof userData.totalSpent === "number" ? userData.totalSpent : (existingUser?.totalSpent || 0),
    city: userData.city?.trim() || existingUser?.city || "",
    state: userData.state?.trim() || existingUser?.state || "",
    notes: userData.notes || existingUser?.notes || "",
    savedAddresses: userData.savedAddresses || existingUser?.savedAddresses || [],
    createdAt: existingUser?.createdAt || userData.createdAt || new Date().toISOString(),
    lastLoginAt: existingUser?.lastLoginAt || new Date().toISOString(),
  };

  const updatedList = existingIndex >= 0
    ? currentUsers.map((u, i) => (i === existingIndex ? fullUser : u))
    : [fullUser, ...currentUsers];
  cacheUserAccountsLocally(updatedList);

  try {
    const docRef = doc(db, "users", userId);
    await safeFirestoreSet(docRef, fullUser);
    
    if (fullUser.role === "customer" || fullUser.role === "vip") {
      const custRef = doc(db, "customers", userId);
      const custData: CustomerProfile = {
        uid: userId,
        email: fullUser.email,
        fullName: fullUser.fullName,
        phone: fullUser.phone,
        savedAddresses: fullUser.savedAddresses,
        tier: fullUser.role === "vip" ? "VIP Royal Patron" : "House Patron",
        createdAt: fullUser.createdAt,
        updatedAt: new Date().toISOString(),
      };
      safeFirestoreSet(custRef, custData).catch(() => {});
    }
  } catch (err) {
    console.warn("Notice: Firestore user write notice (proceeding with local cache):", err);
  }

  // Sync to server users API
  fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(),
    },
    body: JSON.stringify(fullUser),
  }).catch(() => {});

  return userId;
}

export async function updateUserStatus(
  userId: string,
  status: UserAccountStatus
): Promise<void> {
  const currentUsers = getCachedUserAccounts();
  const updated = currentUsers.map((u) => (u.id === userId ? { ...u, status } : u));
  cacheUserAccountsLocally(updated);

  try {
    const docRef = doc(db, "users", userId);
    await safeFirestoreSet(docRef, { status }, { merge: true });
  } catch (err) {
    console.warn("updateUserStatus notice:", err);
  }

  fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(),
    },
    body: JSON.stringify({ id: userId, status }),
  }).catch(() => {});
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const currentUsers = getCachedUserAccounts();
  const updated = currentUsers.filter((u) => u.id !== userId);
  cacheUserAccountsLocally(updated);

  try {
    const docRef = doc(db, "users", userId);
    await safeFirestoreDelete(docRef);
    const custRef = doc(db, "customers", userId);
    safeFirestoreDelete(custRef).catch(() => {});
  } catch (err) {
    console.warn("deleteUserAccount notice:", err);
  }

  fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      ...getAdminAuthHeaders(),
    },
  }).catch(() => {});
}

export async function sendUserPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim();
  if (!cleanEmail) throw new Error("Email address is required.");
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err: any) {
    console.warn("sendUserPasswordReset notice:", err);
  }
}
