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
  images?: string[];
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
  upiScannerUrl?: string;
  upiMerchantName?: string;
  updatedAt?: string;
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
export type PaymentMethod =
  | "Cash on Delivery (COD)"
  | "Instant UPI / NetBanking"
  | "Credit/Debit Card"
  | "UPI / QR Code"
  | "Debit Card / Credit Card"
  | "Net Banking"
  | "Direct Bank Transfer (NEFT/IMPS)";
export type PaymentStatus = "Pending" | "Payment Verification Pending" | "Paid" | "Refunded";

export interface OrderPaymentDetails {
  methodType: "upi" | "card" | "bank" | "cod";
  upiId?: string;
  utrNumber?: string;
  upiApp?: string;
  cardLast4?: string;
  cardBrand?: string;
  cardHolderName?: string;
  bankName?: string;
  accountNumberMasked?: string;
  transactionReference?: string;
  paidAt?: string;
}

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
  userId?: string;
  customer: CustomerInfo;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails?: OrderPaymentDetails;
  confirmationMessageDispatched?: boolean;
  confirmationMessageChannel?: "WhatsApp" | "SMS" | "Both";
  orderStatus: OrderStatus;
  trackingCourier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shiprocketOrderId?: string | number;
  shiprocketShipmentId?: string | number;
  shiprocketStatus?: string;
  shiprocketSyncedAt?: string;
  shiprocketRetryCount?: number;
  shiprocketError?: string;
  notes?: string;
  referralCode?: string;
  referralDiscount?: number;
  createdAt: string; // ISO date string
  updatedAt: string;
  isTest?: boolean;
  // Compatibility aliases
  status?: string;
  totalAmount?: number;
  customerAddress?: ShippingAddress;
  utrNumber?: string;
}

export interface AtelierBooking {
  id: string;
  bookingNumber: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  paymentMethod?: string;
  advancePaid?: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface SavedAddress extends ShippingAddress {
  id: string;
  label?: string;
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
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralEarnings?: number;
  referralDiscountAvailable?: number;
  claimedReferralDiscount?: boolean;
  usedReferralCode?: string;
  createdAt?: string;
  updatedAt?: string;
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
  lastResetDate: string;
  history: {
    timestamp: number;
    suitName: string;
    action: string;
  }[];
}
