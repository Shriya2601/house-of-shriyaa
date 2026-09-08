import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User } from "firebase/auth";
import {
  Product,
  SiteContent,
  CategoryItem,
  CartItem,
  Order,
  ShippingAddress,
  CustomerInfo,
  PaymentMethod,
  OrderPaymentDetails,
  CustomerProfile,
  AtelierBooking,
} from "../types";
import {
  defaultSiteContent,
  defaultCategories,
  getCachedProducts,
  getCachedCategories,
  subscribeSiteContent,
  subscribeProducts,
  subscribeCategories,
  createRealOrder,
  createAtelierBooking,
  fetchAtelierBookings,
  subscribeAuthState,
  seedInitialProductsIfEmpty,
  fetchCustomerProfile,
  updateCustomerProfile as saveProfileToDb,
  customerSignIn,
  customerSignUp,
  customerSignOut,
  customerResetPassword,
} from "../services/storeService";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { products as initialFallbackProducts } from "../data/products";

interface StoreContextType {
  // Content & Catalog
  siteContent: SiteContent;
  products: Product[];
  categories: CategoryItem[];
  loadingCatalog: boolean;

  // Cart / Shopping Bag
  cart: CartItem[];
  addToCart: (product: Product, size?: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  totalCartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Checkout
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  instantCheckoutProduct: { product: Product; size: string } | null;
  startInstantCheckout: (product: Product, size?: string) => void;
  closeCheckout: () => void;
  placeOrder: (details: {
    customer: CustomerInfo;
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    paymentDetails?: OrderPaymentDetails;
    notes?: string;
    referralCode?: string;
    referralDiscount?: number;
  }) => Promise<Order>;

  // Wishlist (Persisted)
  wishlist: Set<string>;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;

  // Customer & Auth
  currentUser: User | null;
  authLoading: boolean;
  customerProfile: CustomerProfile | null;
  customerOrders: Order[];
  atelierBookings: AtelierBooking[];
  refreshCustomerOrders: () => Promise<void>;
  updateProfileDetails: (updates: Partial<CustomerProfile>) => Promise<void>;
  bookAtelierSession: (
    bookingData: Omit<AtelierBooking, "id" | "bookingNumber" | "createdAt" | "updatedAt" | "status">
  ) => Promise<AtelierBooking>;
  signIn: (email: string, pass: string, referralCode?: string) => Promise<User>;
  signUp: (
    email: string,
    pass: string,
    fullName: string,
    phone?: string,
    confirmPass?: string,
    referralCode?: string
  ) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;

  // Live CMS & Catalog Editing
  setSiteContent: React.Dispatch<React.SetStateAction<SiteContent>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [products, setProducts] = useState<Product[]>(() => getCachedProducts());
  const [categories, setCategories] = useState<CategoryItem[]>(() => getCachedCategories());
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Cart state persisted in localStorage for smooth guest shopping experience
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("hos_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("hos_wishlist");
      return saved ? new Set(JSON.parse(saved)) : new Set(initialFallbackProducts.filter(p => p.activeWishlist).map(p => p.id));
    } catch {
      return new Set();
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [instantCheckoutProduct, setInstantCheckoutProduct] = useState<{ product: Product; size: string } | null>(null);

  // Auth & Customer state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(() => {
    try {
      const saved = localStorage.getItem("hos_customer_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [customerOrders, setCustomerOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem("hos_placed_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [atelierBookings, setAtelierBookings] = useState<AtelierBooking[]>(() => {
    try {
      const saved = localStorage.getItem("hos_atelier_bookings");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync Cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hos_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Cart local storage sync notice:", e);
    }
  }, [cart]);

  // Capture referral code from URL parameter if present (?ref=CODE)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        localStorage.setItem("hos_pending_referral", refCode.trim().toUpperCase());
      }
    } catch {}
  }, []);

  // Sync Wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hos_wishlist", JSON.stringify(Array.from(wishlist)));
    } catch (e) {
      console.warn("Wishlist storage sync notice:", e);
    }
  }, [wishlist]);

  // Fetch / Sync customer orders and bookings from Firestore
  const refreshCustomerOrders = useCallback(async () => {
    let combinedOrders: Order[] = [];
    try {
      const local: Order[] = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
      combinedOrders = [...local];
    } catch {}

    if (currentUser?.email || currentUser?.uid) {
      try {
        const colRef = collection(db, "orders");
        const remoteOrders: Order[] = [];

        // 1. Query by customer.email (without requiring composite index)
        if (currentUser.email) {
          try {
            const q = query(
              colRef,
              where("customer.email", "==", currentUser.email.trim().toLowerCase())
            );
            const snap = await getDocs(q);
            snap.docs.forEach((d) => remoteOrders.push({ id: d.id, ...d.data() } as Order));
          } catch (err) {
            console.warn("Error querying orders by email:", err);
          }
        }

        // 2. Query by userId
        if (currentUser.uid) {
          try {
            const qUser = query(colRef, where("userId", "==", currentUser.uid));
            const snapUser = await getDocs(qUser);
            snapUser.docs.forEach((d) => remoteOrders.push({ id: d.id, ...d.data() } as Order));
          } catch (err) {
            console.warn("Error querying orders by userId:", err);
          }

          // 3. Query patron's personal bookings subcollection
          try {
            const userSubCol = collection(db, "customers", currentUser.uid, "bookings");
            const subSnap = await getDocs(userSubCol);
            subSnap.docs.forEach((d) => remoteOrders.push({ id: d.id, ...d.data() } as Order));
          } catch (err) {
            console.warn("Error querying patron bookings subcollection:", err);
          }
        }

        // Merge without duplicates and sort newest first
        const seen = new Set<string>();
        const merged: Order[] = [];
        for (const ord of [...remoteOrders, ...combinedOrders]) {
          const key = ord.orderNumber || ord.id;
          if (key && !seen.has(key)) {
            seen.add(key);
            merged.push({
              ...ord,
              status: ord.status || ord.orderStatus || "pending",
              totalAmount: ord.totalAmount ?? ord.total ?? 0,
              customerAddress: ord.customerAddress || ord.shippingAddress,
            });
          }
        }
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        combinedOrders = merged;
      } catch (e) {
        console.warn("Error querying customer remote orders:", e);
      }
    }

    setCustomerOrders(combinedOrders);

    // Also fetch atelier bookings
    if (currentUser?.email || currentUser?.uid) {
      try {
        const bookings = await fetchAtelierBookings(currentUser.email || currentUser.uid);
        setAtelierBookings(bookings);
      } catch (e) {
        console.warn("Error syncing atelier bookings:", e);
      }
    }
  }, [currentUser]);

  // Subscribe to real-time Firebase Auth & load profile
  useEffect(() => {
    const unsubAuth = subscribeAuthState(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        try {
          const prof = await fetchCustomerProfile(user.uid);
          if (prof) {
            setCustomerProfile(prof);
          } else {
            // Build initial profile
            const newProf: CustomerProfile = {
              uid: user.uid,
              email: user.email || "",
              fullName: user.displayName || user.email?.split("@")[0] || "Valued Patron",
              savedAddresses: [],
              tier: "House Patron",
            };
            setCustomerProfile(newProf);
          }
        } catch (e) {
          console.warn("Error loading customer profile:", e);
        }
      } else {
        setCustomerProfile(null);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    refreshCustomerOrders();
  }, [currentUser, refreshCustomerOrders]);

  const updateProfileDetails = async (updates: Partial<CustomerProfile>) => {
    if (!currentUser) return;
    const updated = await saveProfileToDb(currentUser.uid, updates);
    setCustomerProfile(updated);
  };

  const handleSignIn = async (email: string, pass: string, referralCode?: string): Promise<User> => {
    const user = await customerSignIn(email, pass, referralCode);
    setCurrentUser(user);
    try {
      const prof = await fetchCustomerProfile(user.uid);
      if (prof) setCustomerProfile(prof);
    } catch {}
    await refreshCustomerOrders();
    return user;
  };

  const handleSignUp = async (
    email: string,
    pass: string,
    fullName: string,
    phone?: string,
    confirmPass?: string,
    referralCode?: string
  ): Promise<User> => {
    const user = await customerSignUp(email, pass, fullName, phone, confirmPass, referralCode);
    setCurrentUser(user);
    try {
      const prof = await fetchCustomerProfile(user.uid);
      if (prof) setCustomerProfile(prof);
    } catch {}
    await refreshCustomerOrders();
    return user;
  };

  const handleSignOut = async (): Promise<void> => {
    await customerSignOut();
    setCurrentUser(null);
    setCustomerProfile(null);
    setCustomerOrders([]);
    setAtelierBookings([]);
  };

  const handleResetPassword = async (email: string): Promise<void> => {
    await customerResetPassword(email);
  };

  // Subscribe to real-time Firestore content, products, and categories
  useEffect(() => {
    // Attempt initial database bootstrap if products empty
    seedInitialProductsIfEmpty().catch(() => {});

    const unsubContent = subscribeSiteContent((content) => {
      setSiteContent(content);
    });

    const unsubProducts = subscribeProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
      setLoadingCatalog(false);
    });

    const unsubCategories = subscribeCategories((cats) => {
      setCategories(cats);
    });

    // Real-time deletion listeners
    const handleProdDel = (e: any) => {
      const id = e.detail?.id;
      if (id) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setCart((prev) => prev.filter((item) => item.product.id !== id));
        setWishlist((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    };
    const handleProdSaved = (e: any) => {
      const prod = e.detail;
      if (prod && prod.id) {
        setProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === prod.id);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = prod;
            return next;
          }
          return [prod, ...prev];
        });
      }
    };
    const handleCatDel = (e: any) => {
      const id = e.detail?.id;
      if (id) setCategories((prev) => prev.filter((c) => c.id !== id));
    };
    const handleCatSaved = (e: any) => {
      const cat = e.detail;
      if (cat && cat.id) {
        setCategories((prev) => {
          const idx = prev.findIndex((c) => c.id === cat.id);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = cat;
            return next;
          }
          return [...prev, cat];
        });
      }
    };
    const handleContentUpdated = (e: any) => {
      if (e.detail) {
        setSiteContent(e.detail);
      }
    };
    const handleCatalogUpdated = (e: any) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setProducts(e.detail);
      }
    };
    window.addEventListener("hos-product-deleted", handleProdDel);
    window.addEventListener("hos-product-saved", handleProdSaved);
    window.addEventListener("hos-catalog-updated", handleCatalogUpdated);
    window.addEventListener("hos-content-updated", handleContentUpdated);
    window.addEventListener("hos-category-deleted", handleCatDel);
    window.addEventListener("hos-category-saved", handleCatSaved);

    return () => {
      unsubContent();
      unsubProducts();
      unsubCategories();
      window.removeEventListener("hos-product-deleted", handleProdDel);
      window.removeEventListener("hos-product-saved", handleProdSaved);
      window.removeEventListener("hos-catalog-updated", handleCatalogUpdated);
      window.removeEventListener("hos-content-updated", handleContentUpdated);
      window.removeEventListener("hos-category-deleted", handleCatDel);
      window.removeEventListener("hos-category-saved", handleCatSaved);
    };
  }, []);

  // Helper to parse price string "₹3,899" -> 3899
  const parsePrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/[^\d]/g, "");
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  // Cart operations
  const addToCart = (product: Product, size = "Unstitched Fabric", quantity = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.size === size &&
          (item.product.color || "") === (product.color || "")
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [...prev, { product, size, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size: string, color?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.size === size &&
            (color === undefined || (item.product.color || "") === (color || ""))
          )
      )
    );
  };

  const updateQuantity = (productId: string, size: string, quantity: number, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId &&
        item.size === size &&
        (color === undefined || (item.product.color || "") === (color || ""))
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const cartSubtotal = cart.reduce((acc, item) => {
    const price = parsePrice(item.product.price);
    return acc + price * item.quantity;
  }, 0);

  // Instant Checkout for "Buy Now" flow
  const startInstantCheckout = (product: Product, size = "Unstitched Fabric") => {
    setInstantCheckoutProduct({ product, size });
    setIsCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setInstantCheckoutProduct(null);
  };

  // Real Order Placement (Called during checkout)
  const placeOrder = async (details: {
    customer: CustomerInfo;
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    paymentDetails?: OrderPaymentDetails;
    notes?: string;
    referralCode?: string;
    referralDiscount?: number;
  }): Promise<Order> => {
    let orderItems: {
      productId: string;
      productName: string;
      productImage: string;
      color: string;
      size: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }[] = [];

    let subtotal = 0;

    if (instantCheckoutProduct) {
      const p = instantCheckoutProduct.product;
      const unit = parsePrice(p.price);
      orderItems = [
        {
          productId: p.id,
          productName: p.name,
          productImage: p.image,
          color: p.color,
          size: instantCheckoutProduct.size,
          unitPrice: unit,
          quantity: 1,
          totalPrice: unit,
        },
      ];
      subtotal = unit;
    } else {
      orderItems = cart.map((item) => {
        const unit = parsePrice(item.product.price);
        return {
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.image,
          color: item.product.color,
          size: item.size,
          unitPrice: unit,
          quantity: item.quantity,
          totalPrice: unit * item.quantity,
        };
      });
      subtotal = cartSubtotal;
    }

    // Free delivery on ₹1,999+ otherwise ₹150 express shipping
    const discount = Math.max(0, details.referralDiscount || 0);
    const shippingFee = subtotal >= 1999 || subtotal === 0 ? 0 : 150;
    const total = Math.max(0, subtotal - discount + shippingFee);

    // Create real order in Firestore database
    const newOrder = await createRealOrder({
      userId: currentUser?.uid,
      customer: details.customer,
      shippingAddress: details.shippingAddress,
      customerAddress: details.shippingAddress,
      items: orderItems.map((item) => ({
        ...item,
        name: item.productName,
      })),
      subtotal,
      shippingFee,
      total,
      totalAmount: total,
      referralDiscount: discount,
      referralCode: details.referralCode,
      paymentMethod: details.paymentMethod,
      paymentDetails: details.paymentDetails,
      paymentStatus: details.paymentMethod === "Cash on Delivery (COD)" ? "Pending" : "Paid",
      confirmationMessageDispatched: true,
      confirmationMessageChannel: "Both",
      orderStatus: "pending",
      status: "pending",
      notes: details.notes || "",
      isTest: false, // strictly marked as real customer order
    });

    // If referral discount was applied, mark referral code as consumed by this customer ID
    if (details.referralCode && discount > 0) {
      try {
        if (currentUser?.uid) {
          await updateProfileDetails({
            claimedReferralDiscount: true,
            usedReferralCode: details.referralCode,
            referralDiscountAvailable: 0,
          });
        }
        localStorage.removeItem("hos_pending_referral");
        localStorage.removeItem("hos_referral_discount");
        const custEmail = (details.customer?.email || currentUser?.email || "").toLowerCase().trim();
        if (custEmail) {
          localStorage.setItem(`hos_claimed_ref_${custEmail}`, "true");
        }
      } catch (e) {
        console.warn("Notice: customer referral state cleanup:", e);
      }
    }

    // Save to local placed orders list for immediate persistence and guest retrieval
    try {
      const existing: Order[] = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
      const updated = [newOrder, ...existing.filter((o) => o.id !== newOrder.id && o.orderNumber !== newOrder.orderNumber)];
      localStorage.setItem("hos_placed_orders", JSON.stringify(updated));
      setCustomerOrders(updated);
    } catch (e) {
      console.warn("Failed saving placed order locally:", e);
    }

    // Clear cart if this was a cart checkout
    if (!instantCheckoutProduct) {
      clearCart();
    }
    setInstantCheckoutProduct(null);

    return newOrder;
  };

  const bookAtelierSession = async (
    bookingData: Omit<AtelierBooking, "id" | "bookingNumber" | "createdAt" | "updatedAt" | "status">
  ): Promise<AtelierBooking> => {
    const booking = await createAtelierBooking({
      ...bookingData,
      userId: currentUser?.uid || bookingData.userId,
    });
    setAtelierBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
    return booking;
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      try {
        localStorage.setItem("hos_wishlist", JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn("Failed to persist wishlist:", e);
      }
      return next;
    });
  };

  const isWishlisted = (productId: string) => wishlist.has(productId);

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  };

  return (
    <StoreContext.Provider
      value={{
        siteContent,
        products,
        categories,
        loadingCatalog,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        instantCheckoutProduct,
        startInstantCheckout,
        closeCheckout,
        placeOrder,
        wishlist,
        toggleWishlist,
        isWishlisted,
        currentUser,
        authLoading,
        customerProfile,
        customerOrders,
        atelierBookings,
        refreshCustomerOrders,
        updateProfileDetails,
        bookAtelierSession,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        setSiteContent,
        setProducts,
        updateProduct,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
