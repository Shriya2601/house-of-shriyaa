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
  CustomerProfile,
} from "../types";
import {
  defaultSiteContent,
  defaultCategories,
  subscribeSiteContent,
  subscribeProducts,
  subscribeCategories,
  createRealOrder,
  subscribeAuthState,
  seedInitialProductsIfEmpty,
  fetchCustomerProfile,
  updateCustomerProfile as saveProfileToDb,
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
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
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
    notes?: string;
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
  refreshCustomerOrders: () => Promise<void>;
  updateProfileDetails: (updates: Partial<CustomerProfile>) => Promise<void>;

  // Live CMS & Catalog Editing
  setSiteContent: React.Dispatch<React.SetStateAction<SiteContent>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [products, setProducts] = useState<Product[]>(initialFallbackProducts);
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategories);
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

  // Sync Cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hos_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Cart local storage sync notice:", e);
    }
  }, [cart]);

  // Sync Wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hos_wishlist", JSON.stringify(Array.from(wishlist)));
    } catch (e) {
      console.warn("Wishlist storage sync notice:", e);
    }
  }, [wishlist]);

  // Fetch / Sync customer orders
  const refreshCustomerOrders = useCallback(async () => {
    let combinedOrders: Order[] = [];
    try {
      const local: Order[] = JSON.parse(localStorage.getItem("hos_placed_orders") || "[]");
      combinedOrders = [...local];
    } catch {}

    if (currentUser?.email) {
      try {
        const colRef = collection(db, "orders");
        const q = query(
          colRef,
          where("customer.email", "==", currentUser.email.trim().toLowerCase()),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const remoteOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        
        // Merge without duplicates
        const seen = new Set<string>();
        const merged: Order[] = [];
        for (const ord of [...remoteOrders, ...combinedOrders]) {
          const key = ord.orderNumber || ord.id;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(ord);
          }
        }
        combinedOrders = merged;
      } catch (e) {
        console.warn("Error querying customer remote orders:", e);
      }
    }

    setCustomerOrders(combinedOrders);
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

  // Subscribe to real-time Firestore content, products, and categories
  useEffect(() => {
    // Attempt initial database bootstrap if products empty
    seedInitialProductsIfEmpty().catch(() => {});

    const unsubContent = subscribeSiteContent((content) => {
      setSiteContent(content);
    });

    const unsubProducts = subscribeProducts((fetchedProducts) => {
      if (fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
      }
      setLoadingCatalog(false);
    });

    const unsubCategories = subscribeCategories((cats) => {
      if (cats.length > 0) {
        setCategories(cats);
      }
    });

    return () => {
      unsubContent();
      unsubProducts();
      unsubCategories();
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
        (item) => item.product.id === product.id && item.size === size
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

  const removeFromCart = (productId: string, size: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.size === size)));
  };

  const updateQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.size === size
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
    notes?: string;
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
    const shippingFee = subtotal >= 1999 || subtotal === 0 ? 0 : 150;
    const total = subtotal + shippingFee;

    // Create real order in Firestore database
    const newOrder = await createRealOrder({
      customer: details.customer,
      shippingAddress: details.shippingAddress,
      items: orderItems,
      subtotal,
      shippingFee,
      total,
      paymentMethod: details.paymentMethod,
      paymentStatus: details.paymentMethod === "Cash on Delivery (COD)" ? "Pending" : "Paid",
      orderStatus: "pending",
      notes: details.notes || "",
      isTest: false, // strictly marked as real customer order
    });

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
        refreshCustomerOrders,
        updateProfileDetails,
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
