export interface ColorVariant {
  id: string; // Unique variant ID, e.g. "var-emerald-1"
  colorName: string; // e.g. "Royal Emerald", "Pastel Lilac"
  colorHex?: string; // e.g. "#0d4f3c", "#e2725b" for visual color dot
  price?: string; // Independent price, e.g. "₹2,999"
  originalPrice?: string; // Independent original price, e.g. "₹4,499"
  savings?: string; // e.g. "Save 33%"
  description?: string; // Independent description for this color
  fabricType?: string; // Specific fabric notes if any
  images: string[]; // Independent images for this color variant (up to 10)
  image?: string; // Primary image for this color
  hoverImage?: string; // Hover image for this color
  inStock?: boolean; // Independent in-stock status for this color
}

export interface Product {
  id: string;
  name: string;
  description: string;
  color: string;
  colorHex?: string;
  colorVariants?: ColorVariant[];
  rating: string;
  reviews: string;
  price: string;
  originalPrice: string;
  savings: string;
  badges: string[];
  image: string;
  hoverImage: string;
  images?: string[]; // Up to 10 product images uploaded from device
  category: string;
  fabricType: string;
  tags: string[];
  cut?: string;
  inStock?: boolean;
  sizes?: string[];
  activeWishlist?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroSlide {
  id?: string;
  eyebrow: string;
  number: string;
  collection: string;
  title: string;
  description: string;
  image: string;
  season: string;
  caption: string;
  mood: string;
  ctaText?: string;
  ctaTarget?: string;
}

export interface FeatureItem {
  id?: string;
  title: string;
  text: string;
  iconName?: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
}

export interface SiteContent {
  announcementText: string;
  announcementCta: string;
  announcementVisible: boolean;
  brandTagline: string;
  brandDescription: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  atelierCity: string;
  heroSlides: HeroSlide[];
  features: FeatureItem[];
  footerNote: string;
  catalogTitle?: string;
  catalogSubtitle?: string;
  navLinks?: NavItem[];
  updatedAt?: string;
}

export interface AdminAuthCredentials {
  username: string; // e.g. "house of shriya"
  passwordHash: string;
  salt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  itemCount?: number;
  sortOrder: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface ShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "refunded" | "cancelled";
export type PaymentMethod = "Cash on Delivery (COD)" | "Instant UPI / NetBanking" | "Credit/Debit Card";
export type PaymentStatus = "Pending" | "Paid" | "Refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. HOS-2026-1001
  customer: CustomerInfo;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingCourier?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string; // ISO date string
  updatedAt: string;
  isTest?: boolean; // For keeping test and real orders strictly isolated
}

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "superadmin" | "editor";
  createdAt: string;
}

export interface SavedAddress extends ShippingAddress {
  id: string;
  label?: string; // "Home", "Work", "Studio", etc.
  phone?: string;
  isDefault?: boolean;
}

export interface CustomerSizingProfile {
  standardSize?: string;
  cutPreference?: string;
  pantLength?: string;
  dupattaDrape?: string;
  bust?: string;
  waist?: string;
  hips?: string;
}

export interface CustomerProfile {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  savedAddresses?: SavedAddress[];
  measurements?: CustomerSizingProfile;
  tier?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = "customer" | "vip" | "wholesale" | "admin" | "editor";
export type UserAccountStatus = "active" | "suspended" | "pending";

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserAccountStatus;
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
  savedAddresses?: SavedAddress[];
  city?: string;
  state?: string;
}


export type AccessoryCategory = "earrings" | "necklaces" | "bangles" | "handbags" | "footwear";

export interface AccessorySuggestion {
  id: string;
  category: AccessoryCategory;
  name: string;
  description: string;
  pairingNote: string;
  metalOrMaterial: string;
  recommendedColors: string[];
  image: string;
  isNonPurchasable: true;
}

export interface ModelPreset {
  id: string;
  name: string;
  undertone: string;
  height: string;
  description: string;
  image: string;
  pose: string;
}

export interface TryOnResult {
  id: string;
  suitId: string;
  suitName: string;
  suitColor: string;
  userImage: string;
  compositeImage: string;
  timestamp: number;
  fitStyle: "Bespoke Royal" | "Tailored Slim" | "Comfort Drape";
  selectedAccessories: string[];
}

export interface DailyCreditsState {
  creditsRemaining: number;
  maxCredits: number;
  lastResetDate: string; // YYYY-MM-DD
  history: {
    timestamp: number;
    suitName: string;
    action: string;
  }[];
}

export interface UploadedAsset {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  type: string;
  productId?: string;
  createdAt: string;
}
