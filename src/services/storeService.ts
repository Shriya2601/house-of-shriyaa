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
} from "../types";
import { products as defaultProducts } from "../data/products";
import savedSiteContentJson from "../data/siteContent.json";
import savedCategoriesJson from "../data/categories.json";

/**
 * Safe Firestore write helper that sanitizes input and enforces a strict 2000ms timeout
 * so that exhausted quotas, offline states, or network stalls never hang the application UI.
 */
export async function safeFirestoreSet(docRef: any, data: any, options: { merge?: boolean } = { merge: true }): Promise<boolean> {
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    await Promise.race([
      setDoc(docRef, sanitized, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 2000)),
    ]);
    return true;
  } catch (err) {
    console.warn("Firestore sync skipped or unavailable (persisting locally & to repository):", err);
    return false;
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
  footerNote: "© House of Shriya. Made for your forever wardrobe. SURAT · WORLDWIDE SHIPPING",
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

  // Background fetch from static data to guarantee latest live deploy updates
  if (typeof window !== "undefined") {
    fetch(`/data/siteContent.json?v=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const merged = { ...defaultSiteContent, ...data };
          try {
            localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      })
      .catch(() => {});
  }

  const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged = { ...defaultSiteContent, ...(snap.data() as SiteContent) };
        try {
          localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
        } catch {}
        callback(merged);
      } else {
        callback(defaultSiteContent);
      }
    },
    (err) => {
      console.warn("subscribeSiteContent listener error:", err);
    }
  );
}

export async function saveSiteContent(content: Partial<SiteContent>): Promise<void> {
  const merged = { ...defaultSiteContent, ...content, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(merged));
  } catch {}

  // Sync to repository
  try {
    fetch("/api/save-repo-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteContent: merged,
        commitMessage: `chore(cms): updated site content and announcement`,
      }),
    }).catch(() => {});
  } catch {}

  // Firestore attempt with timeout protection (non-blocking)
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

  // Background fetch from static data
  if (typeof window !== "undefined") {
    fetch(`/data/categories.json?v=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((remoteCategories) => {
        if (Array.isArray(remoteCategories) && remoteCategories.length > 0) {
          const deletedIds = getDeletedCategoryIds();
          const filtered = remoteCategories.filter((c: CategoryItem) => !deletedIds.has(c.id));
          if (filtered.length > 0) {
            cacheCategoriesLocally(filtered);
            callback(filtered);
          }
        }
      })
      .catch(() => {});
  }

  const colRef = collection(db, "categories");
  const q = query(colRef, orderBy("sortOrder", "asc"));
  return onSnapshot(
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
      console.warn("subscribeCategories listener error:", err);
      const fallback = getCachedCategories();
      callback(fallback);
    }
  );
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

    try {
      fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    // 2. Persist to git/server repository
    try {
      fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: filtered,
          commitMessage: `chore(catalog): permanently deleted category folder ${id}`,
        }),
      }).catch(() => {});
    } catch {}

    // 3. Dispatch real-time event to all UI elements
    window.dispatchEvent(new CustomEvent("hos-category-deleted", { detail: { id } }));
  } catch (err) {
    console.warn("deleteCategory cache update error:", err);
  }

  // 4. Non-blocking Firestore deletion with timeout protection
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

      const vPrimary = vImgs[0] || v.image || (idx === 0 ? fallbackImage : "");
      const vHover = vImgs[1] || v.hoverImage || vPrimary;

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

  // Background fetch latest /data/products.json from server or static deploy
  if (typeof window !== "undefined") {
    fetch(`/data/products.json?v=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((remoteProducts) => {
        if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
          const deletedIds = getDeletedProductIds();
          const normalized = remoteProducts.map(ensureProductVariants).filter((p) => !deletedIds.has(p.id));
          if (normalized.length > 0) {
            cacheProductsLocally(normalized);
            callback(normalized);
          }
        }
      })
      .catch(() => {});
  }

  const colRef = collection(db, "products");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const deletedIds = getDeletedProductIds();
      if (!snapshot.empty) {
        const list = snapshot.docs
          .map((d) => ensureProductVariants({ id: d.id, ...d.data() }))
          .filter((p) => !deletedIds.has(p.id));
        cacheProductsLocally(list);
        callback(list);
      }
    },
    (err) => {
      console.warn("subscribeProducts listener error, using cached products:", err);
      const fallback = getCachedProducts();
      callback(fallback);
    }
  );
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<string> {
  const id = product.id || `hos-${Date.now()}`;
  const docRef = doc(db, "products", id);

  // Normalize product through ensureProductVariants so all variants are fully structured
  const sanitized = ensureProductVariants({
    ...product,
    id,
    updatedAt: new Date().toISOString(),
  });

  // 1. Update local cache and un-delete if previously marked immediately
  try {
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

    // 2. Persist to project source files & git repository so changes survive rebuilds, refreshes, and deployments
    try {
      await fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  } catch (err) {
    console.warn("Local storage update warning:", err);
  }

  // 3. Write to Firestore with timeout protection (non-blocking, won't hang if quota exceeded)
  safeFirestoreSet(docRef, sanitized, { merge: true }).catch(() => {});

  return id;
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    const deletedIds = getDeletedProductIds();
    deletedIds.add(id);
    saveDeletedProductIds(deletedIds);

    const current = getCachedProducts();
    const filtered = current.filter((p) => p.id !== id);
    cacheProductsLocally(filtered);

    try {
      await fetch("/api/save-repo-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: filtered,
          commitMessage: `chore(catalog): permanently deleted product ${id}`,
        }),
      });
    } catch {}

    window.dispatchEvent(new CustomEvent("hos-product-deleted", { detail: { id } }));
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
  const colRef = collection(db, "orders");
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const ordersList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Order[];

      // Filter: Keep test data completely separate if requested
      const filtered = includeTest
        ? ordersList
        : ordersList.filter((o) => !o.isTest);

      callback(filtered);
    },
    (err) => {
      console.warn("subscribeOrders listener notice:", err);
      callback([]);
    }
  );
}

export async function createRealOrder(
  orderInput: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">
): Promise<Order> {
  const colRef = collection(db, "orders");
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

  const docRef = doc(db, "orders", orderId);
  await setDoc(docRef, fullOrder);
  return fullOrder;
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: OrderStatus,
  trackingCourier?: string,
  trackingNumber?: string
): Promise<void> {
  const docRef = doc(db, "orders", orderId);
  const updates: Record<string, unknown> = {
    orderStatus,
    updatedAt: new Date().toISOString(),
  };
  if (trackingCourier !== undefined) updates.trackingCourier = trackingCourier;
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (orderStatus === "delivered") updates.paymentStatus = "Paid";
  if (orderStatus === "refunded") updates.paymentStatus = "Refunded";

  await updateDoc(docRef, updates);
}

export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
  const docRef = doc(db, "orders", orderId);
  await updateDoc(docRef, {
    notes,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, "orders", orderId));
}

/* ============================================================
   DATABASE-BACKED ADMIN CREDENTIALS & SESSIONS
   Stored in Firestore: admin_settings/auth_credentials
   Initial credentials:
     username: "house of shriya"
     password: "house of shriya@2601"
   Fully changeable by admin in Settings tab!
============================================================ */

const ADMIN_CREDS_DOC = "auth_credentials";
const SESSION_KEY = "hos_admin_active_session";

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + "::" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getAdminCredentials(): Promise<AdminAuthCredentials> {
  const docRef = doc(db, "admin_settings", ADMIN_CREDS_DOC);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AdminAuthCredentials;
    }
  } catch (err) {
    console.warn("Notice reading admin credentials from db:", err);
  }

  // Not yet created in database: Initialize with requested initial credentials
  const initialSalt = generateSalt();
  const initialHash = await hashPassword("house of shriya@2601", initialSalt);
  const initialCreds: AdminAuthCredentials = {
    username: "house of shriya",
    passwordHash: initialHash,
    salt: initialSalt,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, initialCreds);
  } catch (err) {
    console.warn("Notice saving initial admin credentials:", err);
  }

  return initialCreds;
}

export async function verifyAdminLogin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; username?: string; error?: string }> {
  try {
    const creds = await getAdminCredentials();
    const inputUser = usernameInput.trim().toLowerCase();
    const storedUser = creds.username.trim().toLowerCase();

    // Check username (matches stored or handles shriya/shreya migration seamlessly)
    const isUserMatch =
      inputUser === storedUser ||
      ((inputUser === "house of shriya" || inputUser === "house of shreya") &&
        (storedUser === "house of shriya" || storedUser === "house of shreya"));

    if (!isUserMatch) {
      return { success: false, error: "Invalid username or password." };
    }

    const computedHash = await hashPassword(passwordInput, creds.salt);
    let isPasswordValid = computedHash === creds.passwordHash;

    // Backward-compatibility fallback if database was initialized with the alternative spelling
    if (!isPasswordValid && (passwordInput === "house of shriya@2601" || passwordInput === "house of shreya@2601")) {
      const altPassword = passwordInput === "house of shriya@2601" ? "house of shreya@2601" : "house of shriya@2601";
      const altHash = await hashPassword(altPassword, creds.salt);
      if (altHash === creds.passwordHash) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return { success: false, error: "Invalid username or password." };
    }

    // Success! Update last login timestamp in database
    try {
      await updateDoc(doc(db, "admin_settings", ADMIN_CREDS_DOC), {
        lastLoginAt: new Date().toISOString(),
      });
    } catch {
      // Non-blocking
    }

    setStoredAdminSession(creds.username);
    return { success: true, username: creds.username };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error connecting to database.";
    return { success: false, error: msg };
  }
}

export async function changeAdminCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      return { success: false, error: "Username must be at least 3 characters long." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    const creds = await getAdminCredentials();
    const currentHash = await hashPassword(currentPassword, creds.salt);
    if (currentHash !== creds.passwordHash) {
      return { success: false, error: "Current password does not match database record." };
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    const updatedCreds: AdminAuthCredentials = {
      username: newUsername.trim(),
      passwordHash: newHash,
      salt: newSalt,
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "admin_settings", ADMIN_CREDS_DOC), updatedCreds, { merge: true });
    setStoredAdminSession(updatedCreds.username);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update credentials in database.";
    return { success: false, error: msg };
  }
}

export function getStoredAdminSession(): { authenticated: boolean; username: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.authenticated && parsed.expiresAt > Date.now()) {
      return { authenticated: true, username: parsed.username || "house of shriya" };
    }
  } catch {
    // ignore
  }
  return null;
}

export function setStoredAdminSession(username: string): void {
  try {
    const payload = JSON.stringify({
      authenticated: true,
      username,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24-hour session
    });
    sessionStorage.setItem(SESSION_KEY, payload);
    localStorage.setItem(SESSION_KEY, payload);
  } catch {
    // ignore
  }
}

export function clearStoredAdminSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/* ============================================================
   SECURE ADMIN AUTHENTICATION (Firebase Auth)
   Works on all domains: localhost, preview, and custom domains.
============================================================ */

export async function adminSignIn(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
}

export async function adminSignUp(email: string, pass: string, displayName: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  // Record admin profile document
  try {
    await setDoc(doc(db, "admins", cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || "Atelier Admin",
      role: "superadmin",
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Admin profile doc write:", e);
  }
  return cred.user;
}

export async function adminSignOut(): Promise<void> {
  await signOut(auth);
}

export async function adminResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/* ============================================================
   CUSTOMER AUTHENTICATION & PROFILE PERSISTENCE
============================================================ */

export async function customerSignUp(
  email: string,
  pass: string,
  fullName: string,
  phone?: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const cleanName = fullName.trim() || "Customer";
  if (cred.user) {
    await updateProfile(cred.user, { displayName: cleanName });
  }

  const initialProfile: CustomerProfile = {
    uid: cred.user.uid,
    email: cred.user.email || email.trim(),
    fullName: cleanName,
    phone: phone?.trim() || "",
    savedAddresses: [],
    measurements: {
      standardSize: "M",
      cutPreference: "Straight Kurta Set",
    },
    tier: "House Patron",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "customers", cred.user.uid), initialProfile);
  } catch (e) {
    console.warn("Error saving customer profile doc:", e);
  }

  try {
    localStorage.setItem("hos_customer_profile", JSON.stringify(initialProfile));
  } catch {
    // ignore
  }

  return cred.user;
}

export async function customerSignIn(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
}

export async function customerSignOut(): Promise<void> {
  try {
    localStorage.removeItem("hos_customer_profile");
  } catch {
    // ignore
  }
  await signOut(auth);
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
