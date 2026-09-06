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
    { id: "f3", title: "Instant UPI & COD", text: "Zero-hassle secure checkout", iconName: "Check" },
    { id: "f4", title: "Worldwide Express", text: "Fast insured courier delivery", iconName: "PackageCheck" },
  ],
  catalogTitle: "Curated Boutique Catalog",
  catalogSubtitle: "Handcrafted pure fabrics, regal Alia silhouettes, and bespoke unstitched lengths",
  navLinks: [
    { id: "nav-1", label: "Catalog", href: "catalog-section" },
    { id: "nav-2", label: "Bespoke Fitting", href: "tryon-section" },
    { id: "nav-3", label: "Our Story", href: "/our-story" },
    { id: "nav-4", label: "Craftsmanship", href: "/craftsmanship" },
    { id: "nav-5", label: "Journal", href: "/journal" },
  ],
};

export const defaultCategories: CategoryItem[] = [
  { id: "cat-1", name: "All Collections", slug: "All Collections", description: "Complete handcrafted luxury catalog", sortOrder: 1 },
  { id: "cat-2", name: "Cotton Suits", slug: "Cotton Suits", description: "Pure Mulmul & Hand-block everyday sets", sortOrder: 2 },
  { id: "cat-3", name: "Satin Wear", slug: "Satin Wear", description: "Lustrous evening & celebration silks", sortOrder: 3 },
  { id: "cat-4", name: "Party Wear", slug: "Party Wear", description: "Statement embroidery, Alia cuts & Shararas", sortOrder: 4 },
  { id: "cat-5", name: "Festive Wear", slug: "Festive Wear", description: "Opulent Katan, Brocades & Tilla weaves", sortOrder: 5 },
  { id: "cat-6", name: "Daily & College Wear", slug: "Daily & College Wear", description: "Airy co-ords with functional pockets", sortOrder: 6 },
  { id: "cat-7", name: "Seasonal Drop", slug: "Seasonal Drop", description: "Limited micro velvet and heirloom drops", sortOrder: 7 },
];

const SITE_CONTENT_DOC = "global_settings";

/* ============================================================
   SITE CONTENT & CMS
============================================================ */

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...defaultSiteContent, ...(snap.data() as SiteContent) };
    }
  } catch (err) {
    console.warn("Firestore getSiteContent offline/fallback:", err);
  }
  return defaultSiteContent;
}

export function subscribeSiteContent(callback: (content: SiteContent) => void): () => void {
  const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...defaultSiteContent, ...(snap.data() as SiteContent) });
      } else {
        callback(defaultSiteContent);
      }
    },
    (err) => {
      console.warn("subscribeSiteContent listener error:", err);
      callback(defaultSiteContent);
    }
  );
}

export async function saveSiteContent(content: Partial<SiteContent>): Promise<void> {
  const docRef = doc(db, "site_content", SITE_CONTENT_DOC);
  await setDoc(
    docRef,
    {
      ...content,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/* ============================================================
   CATEGORIES MANAGEMENT
============================================================ */

export function subscribeCategories(callback: (categories: CategoryItem[]) => void): () => void {
  const colRef = collection(db, "categories");
  const q = query(colRef, orderBy("sortOrder", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CategoryItem));
        callback(list);
      } else {
        callback(defaultCategories);
      }
    },
    (err) => {
      console.warn("subscribeCategories listener error:", err);
      callback(defaultCategories);
    }
  );
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  const id = category.id || `cat-${Date.now()}`;
  const docRef = doc(db, "categories", id);
  await setDoc(docRef, { ...category, id }, { merge: true });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

/* ============================================================
   PRODUCTS MANAGEMENT (CRUD)
============================================================ */

export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  const colRef = collection(db, "products");
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          const imagesList: string[] = Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [data.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80", ...(data.hoverImage && data.hoverImage !== data.image ? [data.hoverImage] : [])];
          return {
            id: d.id,
            ...data,
            images: imagesList.slice(0, 10),
            image: imagesList[0] || data.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80",
            hoverImage: imagesList[1] || data.hoverImage || imagesList[0] || data.image,
          } as Product;
        });
        callback(list);
      } else {
        callback(defaultProducts);
      }
    },
    (err) => {
      console.warn("subscribeProducts listener error:", err);
      callback(defaultProducts);
    }
  );
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<string> {
  const id = product.id || `hos-${Date.now()}`;
  const docRef = doc(db, "products", id);

  // Synchronize up to 10 images array with primary image and hover image
  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : (product.image ? [product.image, ...(product.hoverImage && product.hoverImage !== product.image ? [product.hoverImage] : [])] : []);

  const sanitizedImages = rawImages.slice(0, 10);
  const primaryImage = sanitizedImages[0] || product.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80";
  const secondaryImage = sanitizedImages[1] || product.hoverImage || primaryImage;

  const data: Product = {
    id,
    name: product.name || "Untitled Suit Set",
    description: product.description || "",
    color: product.color || "Standard",
    rating: product.rating || "4.9",
    reviews: product.reviews || "12",
    price: product.price?.startsWith("₹") ? product.price : `₹${product.price || "2,999"}`,
    originalPrice: product.originalPrice?.startsWith("₹") ? product.originalPrice : `₹${product.originalPrice || "4,499"}`,
    savings: product.savings || "Save 30%",
    badges: product.badges || ["New Drop"],
    image: primaryImage,
    hoverImage: secondaryImage,
    images: sanitizedImages.length > 0 ? sanitizedImages : [primaryImage],
    category: product.category || "All Collections",
    fabricType: product.fabricType || "Pure Chanderi Silk",
    tags: product.tags || [product.category || "Party Wear"],
    inStock: product.inStock !== false,
    sizes: product.sizes || ["Unstitched Fabric", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
    activeWishlist: Boolean(product.activeWishlist),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, data, { merge: true });
  return id;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

export async function seedInitialProductsIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, "products");
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const p of defaultProducts) {
        await setDoc(doc(db, "products", p.id), {
          ...p,
          inStock: true,
          sizes: ["Unstitched Fabric", "XS", "S", "M", "L", "XL", "2XL"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      // Also seed categories
      for (const c of defaultCategories) {
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
