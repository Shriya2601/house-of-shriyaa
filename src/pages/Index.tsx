import React, { createElement, useEffect, useMemo, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Product } from "../types";
import { useStore } from "../context/StoreContext";
import { useEditMode, CanvaEditable } from "../components/editmode";
import SimpleIntroScreen from "../components/intro/SimpleIntroScreen";
import CustomerAuthModal from "../components/customer/CustomerAuthModal";
import WhatsAppHelpButton, { getWhatsAppHelpUrl } from "../components/whatsapp/WhatsAppHelpButton";
import { customerSignOut, findOrderByOrderNumber } from "../services/storeService";
import { SavedAddress, Order } from "../types";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Edit3,
  Gift,
  GraduationCap,
  Heart,
  HelpCircle,
  Home,
  Info,
  Layers,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  User,
  UserRound,
  X,
  Zap,
  ZoomIn,
} from "lucide-react";
import LuxuryImageViewerModal from "../components/gallery/LuxuryImageViewerModal";

type BuilderTextProps = {
  key?: React.Key;
  id?: string;
  as?: ElementType;
  text?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  fieldPath?: string;
  label?: string;
  type?: "text" | "heading" | "button" | "brand";
};

export function BuilderText({
  as: Tag = "span",
  id,
  text,
  className,
  style,
  children,
  fieldPath,
  label,
  type = "text",
}: BuilderTextProps) {
  const generatedId =
    id ||
    (typeof text === "string"
      ? `txt_${text.slice(0, 24).toLowerCase().replace(/[^a-z0-9]/g, "_")}`
      : `el_${Math.random().toString(36).slice(2, 7)}`);

  return (
    <CanvaEditable
      id={generatedId}
      as={Tag}
      text={text}
      className={className}
      style={style}
      fieldPath={fieldPath}
      type={type}
      label={label || (typeof text === "string" ? text.slice(0, 24) : undefined)}
    >
      {children}
    </CanvaEditable>
  );
}

const imageUrls = {
  silk: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
  chanderi: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85",
  fabric: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=800&q=80",
  luxury: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=900&q=85",
  festive: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=85",
  daily: "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?auto=format&fit=crop&w=900&q=85",
  college: "https://images.unsplash.com/photo-1583391733975-27a928923a1a?auto=format&fit=crop&w=900&q=85",
};

const products: Product[] = [
  {
    id: "hos-001",
    name: "Gul-e-Noor Emerald Anarkali Suit Set",
    description: "Pure Chanderi Silk with Hand-woven Golden Booti",
    color: "Royal Emerald",
    rating: "4.9",
    reviews: "38",
    price: "₹3,899",
    originalPrice: "₹5,499",
    savings: "Save 29%",
    badges: ["Bestseller", "New Drop", "Stitched & Unstitched"],
    image: imageUrls.silk,
    hoverImage: imageUrls.festive,
    category: "Party Wear",
    fabricType: "Satin & Silk",
    tags: ["Party Wear", "Satin Wear", "Festive Wear"],
    activeWishlist: true,
  },
  {
    id: "hos-002",
    name: "Kashmiri Saffron Tilla Silk Unstitched Suit",
    description: "Pure Katan Weave Handloom Silk with Zari Dupatta",
    color: "Saffron Mustard",
    rating: "4.8",
    reviews: "29",
    price: "₹2,999",
    originalPrice: "₹4,200",
    savings: "Save 29%",
    badges: ["Bestseller", "Unstitched Fabric"],
    image: imageUrls.luxury,
    hoverImage: imageUrls.chanderi,
    category: "Festive Wear",
    fabricType: "Pure Silk",
    tags: ["Festive Wear", "Satin Wear", "All Collections"],
    activeWishlist: false,
  },
  {
    id: "hos-003",
    name: "Rooh-e-Gulab Velvet Sharara Suit Set",
    description: "Ultra-plush Micro Velvet 9000 with Soft Gold Sheen",
    color: "Royal Wine",
    rating: "5.0",
    reviews: "19",
    price: "₹4,699",
    originalPrice: "₹6,599",
    savings: "Save 29%",
    badges: ["New Drop", "Seasonal Drop"],
    image: imageUrls.chanderi,
    hoverImage: imageUrls.silk,
    category: "Seasonal Drop",
    fabricType: "Micro Velvet 9000",
    tags: ["Seasonal Drop", "Party Wear", "Festive Wear"],
    activeWishlist: false,
  },
  {
    id: "hos-004",
    name: "Lilac Blossom Hand-Block Chanderi Daily Set",
    description: "100% Breathable Chanderi Cotton Blend",
    color: "Pastel Lilac",
    rating: "4.9",
    reviews: "54",
    price: "₹1,899",
    originalPrice: "₹2,699",
    savings: "Save 30%",
    badges: ["Bestseller", "Daily Chic"],
    image: imageUrls.daily,
    hoverImage: imageUrls.luxury,
    category: "Cotton Suits",
    fabricType: "Chanderi Cotton",
    tags: ["Cotton Suits", "Daily & College Wear"],
    activeWishlist: false,
  },
  {
    id: "hos-005",
    name: "Aura Peaches & Indigo College Co-ord Suit",
    description: "Soft Organic Slub Cotton with Deep Side Pockets",
    color: "Peach & Indigo",
    rating: "4.9",
    reviews: "42",
    price: "₹1,499",
    originalPrice: "₹2,199",
    savings: "Save 32%",
    badges: ["Gen-Z Favorite", "New Drop"],
    image: imageUrls.college,
    hoverImage: imageUrls.daily,
    category: "Daily & College Wear",
    fabricType: "Organic Cotton",
    tags: ["Daily & College Wear", "Cotton Suits"],
    activeWishlist: true,
  },
  {
    id: "hos-006",
    name: "Noor-e-Bahar Ivory Mirror-Work Alia Cut Suit",
    description: "Pure Viscose Georgette with Butter Silk Inner Lining",
    color: "Royal Ivory",
    rating: "5.0",
    reviews: "31",
    price: "₹3,499",
    originalPrice: "₹4,899",
    savings: "Save 29%",
    badges: ["Bestseller", "Alia Cut"],
    image: imageUrls.festive,
    hoverImage: imageUrls.silk,
    category: "Party Wear",
    fabricType: "Viscose Georgette",
    tags: ["Party Wear", "Satin Wear", "Festive Wear"],
    activeWishlist: false,
  },
  {
    id: "hos-007",
    name: "Banarasi Katan Brocade Unstitched Royal Suit",
    description: "Authentic Banarasi Katan Handloom Silk with Zardozi Borders",
    color: "Royal Crimson",
    rating: "4.9",
    reviews: "24",
    price: "₹3,299",
    originalPrice: "₹4,799",
    savings: "Save 31%",
    badges: ["Bestseller", "Pure Handloom"],
    image: imageUrls.chanderi,
    hoverImage: imageUrls.luxury,
    category: "Festive Wear",
    fabricType: "Banarasi Katan",
    tags: ["Festive Wear", "Satin Wear", "Seasonal Drop"],
    activeWishlist: false,
  },
  {
    id: "hos-008",
    name: "Sage Garden Mulmul Breezy Stitched Kurti Pant",
    description: "100% Organic Mulmul Cotton with Hand Block Print",
    color: "Sage Green",
    rating: "4.8",
    reviews: "26",
    price: "₹1,799",
    originalPrice: "₹2,499",
    savings: "Save 28%",
    badges: ["Pure Mulmul", "Summer Edit"],
    image: imageUrls.daily,
    hoverImage: imageUrls.college,
    category: "Cotton Suits",
    fabricType: "Pure Mulmul",
    tags: ["Cotton Suits", "Daily & College Wear"],
    activeWishlist: false,
  },
];

const slides = [
  {
    eyebrow: "DAILY / Festive Couture",
    number: "01",
    collection: "Velvet Marigold Edit",
    title: "Rooh-e-Gulab Micro Velvet 9000 & Hand-Woven Katan Silk",
    description: "Crafted in Surat with 100% pure fabrics, classic Alia-cut silhouettes, and delicate zardozi detailing.",
    image: imageUrls.silk,
    season: "AUTUMN/FESTIVE 2026",
    caption: "Gul-e-Noor Emerald Alia Cut Suit Set",
    mood: "Emerald & Saffron Weaves",
  },
  {
    eyebrow: "Artisan Heirlooms",
    number: "02",
    collection: "Kashmir to Kashi",
    title: "Pure Banarasi Booti & Kashmiri Tilla Embroidered Lengths",
    description: "Unstitched 3-piece regal fabric lengths tailored for custom sizing from XS to 5XL with soft butter silk lining.",
    image: imageUrls.luxury,
    season: "ROYAL HERITAGE 2026",
    caption: "Kashmiri Tilla Saffron Katan Weave",
    mood: "Antique Zari & Handlooms",
  },
  {
    eyebrow: "Modern Pret & Daily Chic",
    number: "03",
    collection: "Mulmul & Youthful Co-ords",
    title: "Featherlight Cotton Suits & Chic College Peplum Ensembles",
    description: "Effortless silhouettes with deep functional pockets, breathable Bagru blocks, and modern tailored fits.",
    image: imageUrls.daily,
    season: "DAILY CHIC 2026",
    caption: "Lilac Blossom Breathable Chanderi Set",
    mood: "Pastel Silks & Easy Linens",
  },
];

export function LogoMark({ small = false }: { small?: boolean }) {
  return (
    <span data-editable="true" className={small ? "logo-mark-small" : "logo-mark"}>
      <Crown size={small ? 14 : 28} strokeWidth={1.75} />
    </span>
  );
}

function IntroOverlay({ onEnter }: { onEnter: () => void }) {
  return <SimpleIntroScreen onComplete={onEnter} />;
}

// Navigation Drawer Component (Myntra-style E-Commerce Side Menu)
export function NavigationDrawer({
  isOpen,
  onClose,
  onSelectCategory,
  onOpenModal,
  onOpenAuth,
  wishlistCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  onOpenModal: (type: string) => void;
  onOpenAuth: () => void;
  wishlistCount: number;
}) {
  if (!isOpen) return null;
  const { currentUser, customerProfile, customerOrders, siteContent } = useStore();
  const whatsappUrl = getWhatsAppHelpUrl(siteContent?.whatsappNumber);

  const initials = currentUser
    ? (customerProfile?.fullName || currentUser.displayName || currentUser.email || "P")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "HS";

  return (
    <>
      <div className="nav-drawer-backdrop" onClick={onClose} />
      <aside className="nav-drawer" aria-label="E-Commerce Navigation Menu">
        {/* Drawer Header */}
        <div className="nav-drawer-header">
          <div className="nav-drawer-top-row">
            <div className="flex items-center gap-2">
              <LogoMark small />
              <div>
                <span className="text-[0.6rem] uppercase tracking-widest text-[#d4af37] font-bold block">HAUTE COUTURE</span>
                <strong className="text-sm font-serif text-[#faf8f5] tracking-wider block">House of Shriya</strong>
              </div>
            </div>
            <button
              className="nav-drawer-close"
              aria-label="Close navigation menu"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {currentUser ? (
            <div className="nav-user-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="nav-user-avatar">{initials}</div>
                <div className="nav-user-info">
                  <strong>{customerProfile?.fullName || currentUser.displayName || currentUser.email?.split("@")[0] || "Patron"}</strong>
                  <span><Sparkles size={11} /> Atelier Patron · Tier {customerProfile?.tier || "Gold"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await customerSignOut();
                  onClose();
                }}
                className="text-[0.65rem] text-[#faf8f5]/70 hover:text-white px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="nav-user-card flex items-center justify-between">
              <div>
                <strong className="text-xs text-[#faf8f5] block font-serif">Welcome to Atelier</strong>
                <span className="text-[0.68rem] text-[#faf8f5]/70 block mt-0.5">Sign in for orders & patron privileges</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="text-xs bg-[#d4af37] hover:bg-[#b89528] text-[#0d4f3c] font-bold px-3 py-1.5 rounded-full shadow transition-all cursor-pointer"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        {/* Drawer Content */}
        <div className="nav-drawer-content">
          {/* SECTION 1: SHOP */}
          <div className="nav-section">
            <div className="nav-section-title">
              <span>Shop</span>
              <Layers size={13} />
            </div>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("All Collections");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Sparkles size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">All Collections</span>
                  <span className="nav-item-sub">Explore full handcrafted catalog</span>
                </div>
              </div>
              <span className="nav-item-badge">8 Pieces</span>
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Cotton Suits");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Shirt size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Cotton Suits</span>
                  <span className="nav-item-sub">Pure Mulmul & Hand-block sets</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Daily Wear Suits");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Sparkles size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Daily Wear Suits</span>
                  <span className="nav-item-sub">Comfortable modal & linen sets</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Co-ord Sets");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Layers size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Co-ord Sets</span>
                  <span className="nav-item-sub">Contemporary tunics & palazzos</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Satin Wear");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Crown size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Satin Wear</span>
                  <span className="nav-item-sub">Glossy silks & evening ensembles</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Party Wear");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Sparkles size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Party Wear</span>
                  <span className="nav-item-sub">Alia cut, Anarkalis & Shararas</span>
                </div>
              </div>
              <span className="nav-item-badge">Trending</span>
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Festive Wear");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Tag size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Festive Wear</span>
                  <span className="nav-item-sub">Banarasi Katan & Kashmiri Tilla</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Daily & College Wear");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><GraduationCap size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Daily & College Wear</span>
                  <span className="nav-item-sub">Youthful co-ords & breezy kurtis</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onSelectCategory("Seasonal Drop");
                onClose();
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Zap size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Seasonal Drop</span>
                  <span className="nav-item-sub">Velvet 9000 & Festive Angrakha</span>
                </div>
              </div>
              <span className="nav-item-badge">Limited</span>
            </button>
          </div>

          {/* SECTION 2: MY ORDERS */}
          <div className="nav-section">
            <div className="nav-section-title">
              <span>My Orders</span>
              <Package size={13} />
            </div>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("order_history");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Clock size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Order History</span>
                  <span className="nav-item-sub">Past bookings & invoices</span>
                </div>
              </div>
              <span className="nav-item-badge">
                {customerOrders.length > 0 ? `${customerOrders.length} ${customerOrders.length === 1 ? "Order" : "Orders"}` : "0 Orders"}
              </span>
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("track_order");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Truck size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Track Order</span>
                  <span className="nav-item-sub">Live shipment & courier status</span>
                </div>
              </div>
              <span className="nav-item-badge">Tracking</span>
            </button>
          </div>

          {/* SECTION 3: MY ACCOUNT */}
          <div className="nav-section">
            <div className="nav-section-title">
              <span>My Account</span>
              <User size={13} />
            </div>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                if (!currentUser) {
                  onOpenAuth();
                } else {
                  onOpenModal("profile");
                }
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><UserRound size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Profile</span>
                  <span className="nav-item-sub">Measurements, sizing & contact info</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                if (!currentUser) {
                  onOpenAuth();
                } else {
                  onOpenModal("addresses");
                }
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><MapPin size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Saved Addresses</span>
                  <span className="nav-item-sub">Delivery locations & pincodes</span>
                </div>
              </div>
              <span className="nav-item-badge">{customerProfile?.savedAddresses?.length || 0} Saved</span>
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onSelectCategory("Wishlist");
                document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Heart size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Wishlist</span>
                  <span className="nav-item-sub">Saved couture pieces</span>
                </div>
              </div>
              <span className="nav-item-badge">{wishlistCount} Saved</span>
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("payments");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><CreditCard size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Payment Methods</span>
                  <span className="nav-item-sub">Instant UPI & Cards</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>
          </div>

          {/* SECTION 4: SETTINGS */}
          <div className="nav-section">
            <div className="nav-section-title">
              <span>Settings</span>
              <Settings size={13} />
            </div>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("settings");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Settings size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Account Settings</span>
                  <span className="nav-item-sub">Security, password & preferences</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("notifications");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Bell size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Notifications</span>
                  <span className="nav-item-sub">WhatsApp & VIP drop alerts</span>
                </div>
              </div>
              <span className="nav-item-badge">Active</span>
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("privacy");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><ShieldCheck size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Privacy & Security</span>
                  <span className="nav-item-sub">100% encrypted & protected</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <button
              className="nav-item-btn"
              onClick={() => {
                onClose();
                onOpenModal("support");
              }}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><HelpCircle size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">Help & Support</span>
                  <span className="nav-item-sub">Atelier styling concierge 24/7</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </button>

            <Link
              to="/our-story"
              className="nav-item-btn"
              onClick={onClose}
            >
              <div className="nav-item-left">
                <div className="nav-item-icon"><Info size={17} /></div>
                <div className="nav-item-text">
                  <span className="nav-item-title">About House of Shriya</span>
                  <span className="nav-item-sub">Our Surat heritage & handloom journey</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#c5a059]" />
            </Link>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="nav-drawer-footer">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <MessageCircle size={16} />
            <span>Need Help? / Open WhatsApp</span>
          </a>
          <div className="text-center text-[0.62rem] text-[#8c827a] mt-2">
            <span>House of Shriya · 100% Authentic Handlooms</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// Interactive Information Modal System
export function InteractiveModal({
  type,
  onClose,
  onOpenAuth,
}: {
  type: string | null;
  onClose: () => void;
  onOpenAuth?: () => void;
}) {
  const { currentUser, customerProfile, customerOrders, siteContent, updateProfile } = useStore();
  const [trackSearchQuery, setTrackSearchQuery] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState("");
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState<Omit<SavedAddress, "id">>({
    label: "Home",
    fullName: customerProfile?.fullName || "",
    phone: customerProfile?.phone || "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  const whatsappUrl = getWhatsAppHelpUrl(siteContent?.whatsappNumber);

  if (!type) return null;

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackSearchQuery.trim()) return;
    setTrackError("");
    try {
      const found = await findOrderByOrderNumber(trackSearchQuery.trim());
      if (found) {
        setSearchedOrder(found);
      } else {
        setSearchedOrder(null);
        setTrackError(`No order found matching "${trackSearchQuery.trim()}". Please verify your order number.`);
      }
    } catch {
      setTrackError("Unable to locate order. Please check order number.");
    }
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerProfile || !newAddr.addressLine1 || !newAddr.pincode) return;
    const addressToAdd: SavedAddress = {
      ...newAddr,
      id: "addr_" + Date.now(),
    };
    const updated = [...(customerProfile.savedAddresses || []), addressToAdd];
    await updateProfile({ savedAddresses: updated });
    setIsAddingAddress(false);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!customerProfile) return;
    const updated = (customerProfile.savedAddresses || []).filter((a) => a.id !== id);
    await updateProfile({ savedAddresses: updated });
  };

  const renderContent = () => {
    switch (type) {
      case "track_order": {
        const orderToDisplay = searchedOrder || (customerOrders.length > 0 ? customerOrders[0] : null);

        return (
          <div className="space-y-4">
            <form onSubmit={handleTrackSearch} className="flex gap-2">
              <input
                type="text"
                value={trackSearchQuery}
                onChange={(e) => setTrackSearchQuery(e.target.value)}
                placeholder="Enter Order # (e.g. HOS-XXXXXX)"
                className="flex-1 px-3 py-2 text-xs border border-[#ebe2d8] rounded-lg bg-white text-[#1e1b18] focus:outline-none focus:border-[#0d4f3c]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#0d4f3c] text-white text-xs font-bold rounded-lg hover:bg-[#083427] transition-colors"
              >
                Track
              </button>
            </form>

            {trackError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {trackError}
              </p>
            )}

            {orderToDisplay ? (
              <div className="space-y-3 pt-1">
                <div className="bg-[#f7f2eb] p-3.5 rounded-xl border border-[#e8dfd5] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#8c6d37] font-bold block">ORDER #{orderToDisplay.orderNumber}</span>
                    <strong className="text-sm text-[#1e1b18] font-serif">
                      {orderToDisplay.items[0]?.name || "Luxury Couture Order"}
                    </strong>
                    <span className="text-xs text-[#706458] block mt-0.5">
                      {orderToDisplay.items.length} {orderToDisplay.items.length === 1 ? "item" : "items"} · Total: ₹{orderToDisplay.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <span className="bg-[#0d4f3c] text-[#faf8f5] text-xs font-bold px-2.5 py-1 rounded-full capitalize">
                    {orderToDisplay.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0d4f3c] text-white flex items-center justify-center shrink-0 text-xs">
                      ✓
                    </div>
                    <div>
                      <strong className="text-xs text-[#1e1b18] block">Order Placed & Confirmed</strong>
                      <span className="text-[0.7rem] text-[#706458]">
                        {new Date(orderToDisplay.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })} · Atelier Verification
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0d4f3c] text-white flex items-center justify-center shrink-0 text-xs">
                      ✓
                    </div>
                    <div>
                      <strong className="text-xs text-[#1e1b18] block">Handloom Artisan Inspection Passed</strong>
                      <span className="text-[0.7rem] text-[#706458]">Surat Atelier Flagship Quality Check</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0d4f3c] text-white flex items-center justify-center shrink-0 text-xs">
                      <Truck size={14} />
                    </div>
                    <div>
                      <strong className="text-xs text-[#1e1b18] block">Dispatched via Premium Express Carrier</strong>
                      <span className="text-[0.7rem] text-[#0d4f3c] font-medium">
                        Delivery to: {orderToDisplay.customerAddress.city}, {orderToDisplay.customerAddress.pincode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#706458] space-y-2">
                <p>No active shipments found. Enter an order number above or sign in to track your bookings.</p>
                {!currentUser && onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="inline-block mt-2 px-4 py-1.5 bg-[#0d4f3c] text-white rounded-full font-bold text-xs"
                  >
                    Sign In to View Orders
                  </button>
                )}
              </div>
            )}
          </div>
        );
      }

      case "order_history": {
        if (!currentUser) {
          return (
            <div className="text-center py-8 space-y-3 text-xs">
              <Package size={36} className="mx-auto text-[#c5a059]" />
              <div>
                <strong className="text-sm font-serif text-[#1e1b18] block">Customer Login Required</strong>
                <p className="text-[#706458] mt-1">Sign in with your account to view your past couture orders and invoices.</p>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-5 py-2 bg-[#0d4f3c] hover:bg-[#083427] text-white font-bold rounded-full text-xs shadow transition-all"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          );
        }

        if (customerOrders.length === 0) {
          return (
            <div className="text-center py-8 space-y-3 text-xs">
              <Package size={36} className="mx-auto text-[#c5a059]" />
              <div>
                <strong className="text-sm font-serif text-[#1e1b18] block">No Orders Yet</strong>
                <p className="text-[#706458] mt-1">You haven't placed any orders yet. Discover our latest couture collection!</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2 bg-[#0d4f3c] text-white font-bold rounded-full text-xs"
              >
                Browse Collections
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {customerOrders.map((order) => (
              <div key={order.id} className="bg-white p-3.5 rounded-xl border border-[#ebe2d8] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <strong className="text-[#8c6d37]">Order #{order.orderNumber}</strong>
                  <span className="text-[#0d4f3c] font-bold capitalize">{order.status.replace("_", " ")}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e1b18]">
                    {order.items.map((i) => i.name).join(", ")}
                  </p>
                  <span className="text-[0.7rem] text-[#706458] block mt-0.5">
                    Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#f5efeb] text-xs">
                  <span className="text-[#706458]">Total: ₹{order.totalAmount.toLocaleString()} ({order.paymentMethod.toUpperCase()})</span>
                  <button
                    onClick={() => {
                      setSearchedOrder(order);
                      setTrackSearchQuery(order.orderNumber);
                    }}
                    className="text-[#0d4f3c] font-bold hover:underline"
                  >
                    Track Package →
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "profile": {
        if (!currentUser) {
          return (
            <div className="text-center py-8 space-y-3 text-xs">
              <User size={36} className="mx-auto text-[#c5a059]" />
              <div>
                <strong className="text-sm font-serif text-[#1e1b18] block">Customer Login Required</strong>
                <p className="text-[#706458] mt-1">Please sign in to access your patron profile and privileges.</p>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-5 py-2 bg-[#0d4f3c] text-white font-bold rounded-full text-xs"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          );
        }

        const initials = (customerProfile?.fullName || currentUser.displayName || currentUser.email || "P")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center gap-3 p-3 bg-[#f5efeb] rounded-xl">
              <div className="w-11 h-11 rounded-full bg-[#0d4f3c] text-[#d4af37] flex items-center justify-center font-serif text-base font-bold">
                {initials}
              </div>
              <div>
                <strong className="text-sm font-serif text-[#1e1b18] block">
                  {customerProfile?.fullName || currentUser.displayName || "Atelier Patron"}
                </strong>
                <span className="text-[#8c6d37]">
                  {currentUser.email || "No email"} {customerProfile?.phone ? `· +91 ${customerProfile.phone}` : ""}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#ebe2d8] rounded-xl space-y-1.5">
              <strong className="text-xs text-[#1e1b18] block">Atelier Attire Preference</strong>
              <div className="grid grid-cols-2 gap-2 text-[#706458]">
                <span>Attire: <strong>100% Unstitched Luxury Suits</strong></span>
                <span>Cut Preference: <strong>{customerProfile?.sizingProfile?.cutPreference || "Classic Atelier"}</strong></span>
                <span>Fabric Craft: <strong>Surat Handloom Weave</strong></span>
                <span>Dupatta Drape: <strong>Artisan Handloom</strong></span>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#ebe2d8] rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-xs text-[#1e1b18] block">VIP Atelier Tier</strong>
                <span className="text-[#706458]">
                  {customerProfile?.tier || "Gold"} Heirloom Member ({customerOrders.length * 500 + 1000} points)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#f4ecd8] text-[#7a4e12] font-bold">
                {customerProfile?.tier || "Gold"}
              </span>
            </div>

            <button
              type="button"
              onClick={async () => {
                await customerSignOut();
                onClose();
              }}
              className="w-full py-2 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        );
      }

      case "addresses": {
        if (!currentUser) {
          return (
            <div className="text-center py-8 space-y-3 text-xs">
              <MapPin size={36} className="mx-auto text-[#c5a059]" />
              <div>
                <strong className="text-sm font-serif text-[#1e1b18] block">Sign In to View Addresses</strong>
                <p className="text-[#706458] mt-1">Save your shipping addresses for seamless 1-click checkout.</p>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-5 py-2 bg-[#0d4f3c] text-white font-bold rounded-full text-xs"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          );
        }

        const addresses = customerProfile?.savedAddresses || [];

        return (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-3.5 bg-white rounded-xl border ${
                  addr.isDefault ? "border-2 border-[#0d4f3c]" : "border-[#ebe2d8]"
                } space-y-1 text-xs relative`}
              >
                <div className="flex justify-between items-center">
                  <strong className="text-sm text-[#1e1b18] flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#0d4f3c]" /> {addr.label} ({addr.fullName})
                  </strong>
                  <div className="flex items-center gap-2">
                    {addr.isDefault && (
                      <span className="bg-[#0d4f3c] text-white text-[0.65rem] px-2 py-0.5 rounded-full font-bold">
                        Default
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Delete address"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-[#706458]">{addr.addressLine1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                <span className="text-[#1e1b18] font-semibold block pt-1">Phone: +91 {addr.phone}</span>
              </div>
            ))}

            {isAddingAddress ? (
              <form onSubmit={handleSaveNewAddress} className="bg-[#fcfaf7] p-3.5 rounded-xl border border-[#ebe2d8] space-y-2 text-xs">
                <strong className="text-xs text-[#1e1b18] block">Add New Delivery Address</strong>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={newAddr.fullName}
                    onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                    className="p-2 border border-[#ebe2d8] rounded bg-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (10 digits)"
                    required
                    value={newAddr.phone}
                    onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                    className="p-2 border border-[#ebe2d8] rounded bg-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street / Flat / Colony"
                  required
                  value={newAddr.addressLine1}
                  onChange={(e) => setNewAddr({ ...newAddr, addressLine1: e.target.value })}
                  className="w-full p-2 border border-[#ebe2d8] rounded bg-white"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    required
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    className="p-2 border border-[#ebe2d8] rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    required
                    value={newAddr.state}
                    onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                    className="p-2 border border-[#ebe2d8] rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="PIN Code"
                    required
                    value={newAddr.pincode}
                    onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    className="p-2 border border-[#ebe2d8] rounded bg-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#0d4f3c] text-white font-bold rounded-lg"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingAddress(true)}
                className="w-full py-2.5 border-2 border-dashed border-[#c5a059] text-[#8c6d37] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-[#fdfbf7] transition-colors"
              >
                <Plus size={14} />
                <span>Add New Address</span>
              </button>
            )}
          </div>
        );
      }

      case "payments": {
        return (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white border border-[#ebe2d8] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f5efeb] flex items-center justify-center text-[#0d4f3c]">
                  <CreditCard size={17} />
                </div>
                <div>
                  <strong className="text-xs text-[#1e1b18] block">Instant UPI Payment</strong>
                  <span className="text-[#706458]">Google Pay, PhonePe, Paytm, BHIM & Any UPI ID</span>
                </div>
              </div>
              <span className="text-[#0d4f3c] font-bold">Supported ✓</span>
            </div>

            <div className="p-3 bg-white border border-[#ebe2d8] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f5efeb] flex items-center justify-center text-[#7a4e12]">
                  <CreditCard size={17} />
                </div>
                <div>
                  <strong className="text-xs text-[#1e1b18] block">Credit & Debit Cards</strong>
                  <span className="text-[#706458]">Visa, MasterCard, RuPay, American Express & Net Banking</span>
                </div>
              </div>
              <span className="text-[#0d4f3c] font-bold">Supported ✓</span>
            </div>
          </div>
        );
      }

      case "shipping_policy": {
        return (
          <div className="space-y-3 text-xs text-[#1e1b18]">
            <div className="p-3 bg-white border border-[#ebe2d8] rounded-xl space-y-2">
              <strong className="text-sm font-serif block text-[#0d4f3c]">Atelier Shipping & Delivery Policy</strong>
              <p className="text-[#706458] leading-relaxed">
                Every House of Shriya ensemble undergoes artisanal quality checks before dispatch.
              </p>
              <div className="pt-2 border-t border-[#f5efeb] space-y-1.5 text-[#706458]">
                <p>✦ <strong>Domestic Shipping:</strong> Delivered within 4–7 business days via air cargo.</p>
                <p>✦ <strong>Artisan Inspection:</strong> Hand-inspected with artisanal care before dispatch.</p>
                <p>✦ <strong>Packaging:</strong> Sealed in heirloom bridal-grade garment bags.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-full bg-[#0d4f3c] text-white font-bold"
            >
              Close
            </button>
          </div>
        );
      }

      case "support":
        return (
          <div className="space-y-4 text-xs text-[#1e1b18] py-2">
            <div className="p-4 bg-white border border-[#ebe2d8] rounded-xl space-y-3">
              <p className="text-[#1e1b18] font-medium leading-relaxed text-sm">
                Customer Support Executive is available from Monday to Sunday,
              </p>
              <div className="pt-2 border-t border-[#f5efeb] flex flex-col gap-2.5 text-sm">
                <a
                  href="https://wa.me/919501698356"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-[#0d4f3c] font-semibold hover:underline"
                >
                  <MessageCircle size={17} className="text-[#25D366] shrink-0" />
                  <span>9501698356</span>
                </a>
                <a
                  href="mailto:houseofshriya.in@gmail.com"
                  className="flex items-center gap-2.5 text-[#0d4f3c] font-semibold hover:underline"
                >
                  <Mail size={17} className="text-[#c5a059] shrink-0" />
                  <span>houseofshriya.in@gmail.com</span>
                </a>
              </div>
            </div>

            <a
              href="https://wa.me/919501698356"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <MessageCircle size={16} />
              <span>Open WhatsApp</span>
            </a>
          </div>
        );

      case "settings":
      case "notifications":
      case "privacy":
      default:
        return (
          <div className="space-y-3 text-xs text-[#1e1b18] p-2">
            <p className="text-[#706458]">Your atelier preferences are active and secured.</p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-full bg-[#0d4f3c] text-white font-semibold mt-2"
            >
              Close
            </button>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (type) {
      case "track_order":
        return "Live Order Tracking";
      case "order_history":
        return "My Order History";
      case "profile":
        return "My Atelier Profile";
      case "addresses":
        return "Saved Addresses";
      case "payments":
        return "Payment Methods";
      case "notifications":
        return "Notification Preferences";
      case "privacy":
        return "Privacy & Security";
      case "shipping_policy":
        return "Shipping Policy";
      case "support":
        return "Contact Us";
      default:
        return "Atelier Concierge";
    }
  };

  return (
    <div className="interactive-modal-backdrop" onClick={onClose}>
      <div className="interactive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="interactive-modal-header">
          <strong className="text-sm font-serif text-[#faf8f5] tracking-wider">{getTitle()}</strong>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X size={15} />
          </button>
        </div>
        <div className="interactive-modal-body">{renderContent()}</div>
      </div>
    </div>
  );
}

export function StoreHeader({
  onPookie,
  onOpenDrawer,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  wishlistCount,
  onSelectCategory,
}: {
  onPookie: () => void;
  onOpenDrawer: () => void;
  onOpenAuth?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  wishlistCount: number;
  onSelectCategory?: (category: string) => void;
}) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const { siteContent, totalCartCount, setIsCartOpen, currentUser, customerProfile } = useStore();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <header className="store-header">
      {siteContent?.announcementVisible !== false && (
        <div className="announcement-bar">
          <button
            data-editable="true"
            onClick={() => scrollTo("catalog-section")}
            className="announcement-cta"
          >
            <BuilderText
              as="span"
              id="announcement_bar_text"
              fieldPath="announcementText"
              label="Announcement Bar"
              text={
                siteContent?.announcementText
                  ? `${siteContent.announcementText} · ${siteContent.announcementCta || "Shop Now"}`
                  : "Explore Velvet Drop · Free Express Delivery on ₹1,999+"
              }
            />
            <ArrowRight size={13} className="shrink-0 inline ml-1" />
          </button>
        </div>
      )}

      <div className="header-main">
        {/* Left Side: Three-line hamburger menu button prominently placed beside Search */}
        <div className="header-left">
          <button
            data-editable="true"
            className="icon-button header-menu-btn"
            aria-label="Open Navigation Menu"
            title="Open E-Commerce Menu"
            onClick={onOpenDrawer}
          >
            <Menu size={20} />
          </button>

          <div className={`search-box ${searchOpen ? "search-box-open" : ""}`}>
            <Search size={15} />
            <input
              data-editable="true"
              aria-label="Search products"
              placeholder="Search suits, silks, fabrics..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            />
          </div>

          <button
            data-editable="true"
            className="icon-button mobile-search"
            aria-label="Search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search size={18} />
          </button>

          <button
            data-editable="true"
            className="header-pill track-pill"
            onClick={onOpenDrawer}
          >
            <Truck size={14} /> <BuilderText as="span" id="nav_track_order" label="Track Order Pill" text="Track Order" />
          </button>
        </div>

        {/* Center: Brand Lockup */}
        <Link to="/" className="brand-lockup" aria-label="House of Shriya home">
          <LogoMark small />
          <span className="brand-title">
            <BuilderText as="span" id="brand_title_header" label="Brand Logo Title" type="brand" text="House of Shriya" />
          </span>
        </Link>

        {/* Right Side: Quick Action Pills & Icons */}
        <div className="header-right">
          <button data-editable="true" className="refer-pill" onClick={onOpenDrawer}>
            <Gift size={14} />
            <span data-editable="true"><BuilderText as="span" text="Refer & Earn" /> <BuilderText as="b" text="₹100" /></span>
          </button>
          
          <button
            data-editable="true"
            className="pookie-pill"
            onClick={onPookie}
            aria-label="Ask Pookie Styling Concierge"
            title="Ask Pookie Styling Concierge"
          >
            <Sparkles size={15} className="pookie-icon" />
            <span className="pookie-label">
              <BuilderText as="span" className="pookie-ask" text="Ask" />{" "}
              <BuilderText as="span" text="Pookie" />
            </span>
            <i />
          </button>

          <button
            data-editable="true"
            className="icon-button header-action wishlist-header-btn"
            aria-label={`Wishlist with ${wishlistCount} saved items`}
            title={`Wishlist (${wishlistCount} saved items)`}
            onClick={() => {
              if (onSelectCategory) {
                onSelectCategory("Wishlist");
              }
              scrollTo("catalog-section");
            }}
          >
            <Heart size={18} />
            <span
              className={`wishlist-badge ${wishlistCount === 0 ? "wishlist-badge-empty" : ""}`}
              id="header-wishlist-badge"
              aria-label={`${wishlistCount} saved items`}
              title={`${wishlistCount} saved items`}
            >
              {wishlistCount}
            </span>
          </button>

          {currentUser ? (
            <button
              data-editable="true"
              className="icon-button header-action account-action"
              aria-label="My Account"
              onClick={onOpenDrawer}
              title={customerProfile?.fullName || currentUser.displayName || "My Account"}
            >
              <UserRound size={18} />
              <span className="max-w-[70px] truncate">
                {customerProfile?.fullName?.split(" ")[0] || currentUser.displayName?.split(" ")[0] || "Account"}
              </span>
            </button>
          ) : (
            <button
              data-editable="true"
              className="icon-button header-action account-action"
              aria-label="Customer Login"
              onClick={onOpenAuth || onOpenDrawer}
              title="Sign In / Register"
            >
              <UserRound size={18} />
              <span>Login</span>
            </button>
          )}

          <button
            data-editable="true"
            className="bag-button"
            aria-label={`Shopping Bag with ${totalCartCount} items`}
            title="Open Shopping Bag"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag size={17} />
            <BuilderText as="span" text={String(totalCartCount)} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="mobile-search-bar">
          <Search size={16} className="text-[#c5a059] shrink-0" />
          <input
            data-editable="true"
            type="text"
            placeholder="Search suits, silks, fabrics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                setSearchOpen(false);
              }
            }}
          />
          <button
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  );
}

function Hero({ onPookie }: { onPookie: () => void }) {
  const { siteContent } = useStore();
  const [activeSlide, setActiveSlide] = useState(0);

  const activeSlides = useMemo(() => {
    if (siteContent?.heroSlides && siteContent.heroSlides.length > 0) {
      return siteContent.heroSlides.map((s, idx) => ({
        eyebrow: s.eyebrow || "DAILY / Festive Couture",
        number: `0${idx + 1}`,
        collection: s.collection || "Handcrafted Heirloom",
        title: s.title || "Pure Handloom Silks & Unstitched Suits",
        description: s.description || "Crafted in Surat with 100% pure fabrics and delicate artisan detailing.",
        image: s.image || imageUrls.silk,
        season: s.season || "AUTUMN/FESTIVE 2026",
        caption: s.caption || "Atelier Handloom Couture",
        mood: s.mood || "Emerald & Gold Weaves",
        ctaText: s.ctaText || "Explore Festive Edit",
      }));
    }
    return slides;
  }, [siteContent]);

  const slideIndex = activeSlide % activeSlides.length;
  const slide = activeSlides[slideIndex] || activeSlides[0];

  return (
    <section className="hero-section">
      <div className="hero-glow hero-glow-left" />
      <div className="hero-glow hero-glow-right" />
      <div className="hero-dots" />
      <BuilderText as="div" className="hero-word" text="SHRIYA" />
      <div className="site-container hero-container">
        <div className="hero-meta">
          <div data-editable="true">
            <span className="ping-dot" />
            <BuilderText as="strong" text="HOUSE OF SHRIYA" />
            <i><BuilderText as="span" text="·" /></i>
          </div>
          <div className="hero-meta-pills"><BuilderText as="span" text="Pure Fabrics" /><BuilderText as="span" text="Unstitched Set" /><BuilderText as="span" text="100% handloom" /></div>
        </div>
        <div className="hero-grid">
          <div className="hero-copy" key={slide.number}>
            <div data-editable="true" className="hero-eyebrow">
              <Sparkles size={13} />{" "}
              <BuilderText
                as="span"
                id={`hero_slide_${slideIndex}_eyebrow`}
                fieldPath={`heroSlides[${slideIndex}].eyebrow`}
                label="Hero Eyebrow"
                text={slide.eyebrow}
              />
            </div>
            <BuilderText
              as="p"
              id={`hero_slide_${slideIndex}_collection`}
              className="hero-collection"
              fieldPath={`heroSlides[${slideIndex}].collection`}
              label="Hero Collection"
              text={slide.collection}
            />
            <BuilderText
              as="h1"
              id={`hero_slide_${slideIndex}_title`}
              fieldPath={`heroSlides[${slideIndex}].title`}
              label="Hero Headline"
              type="heading"
              text={slide.title}
            />
            <BuilderText
              as="p"
              id={`hero_slide_${slideIndex}_desc`}
              className="hero-description"
              fieldPath={`heroSlides[${slideIndex}].description`}
              label="Hero Description"
              text={slide.description}
            />
            <div className="material-pills">
              <span data-editable="true">
                <Sparkles size={13} /> <BuilderText as="span" text="Pure Banarasi Katan · 100% Handloom" />
              </span>
              <span data-editable="true">
                <Sparkles size={13} /> <BuilderText as="span" text="Soft & Elegant" />
              </span>
            </div>
            <div className="hero-actions">
              <button
                data-editable="true"
                className="primary-action"
                onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                <BuilderText
                  as="span"
                  id={`hero_slide_${slideIndex}_cta`}
                  fieldPath={`heroSlides[${slideIndex}].ctaText`}
                  label="Hero Button CTA"
                  type="button"
                  text={slide.ctaText || "Explore Festive Edit"}
                />{" "}
                <ArrowRight size={17} />
              </button>
              <button data-editable="true" className="secondary-action pookie-action" onClick={onPookie}>
                <Sparkles size={15} /> <BuilderText as="span" text="Ask Pookie" />
              </button>
            </div>
            <div className="slide-controls">
              <div className="slide-dots">
                {activeSlides.map((item, index) => (
                  <button
                    data-editable="true"
                    key={item.number || index}
                    aria-label={`Go to slide ${index + 1}`}
                    className={index === slideIndex ? "active" : ""}
                    onClick={() => setActiveSlide(index)}
                  />
                ))}
              </div>
              <div className="slide-arrows">
                <button
                  data-editable="true"
                  aria-label="Previous Slide"
                  onClick={() => setActiveSlide((slideIndex + activeSlides.length - 1) % activeSlides.length)}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  data-editable="true"
                  aria-label="Next Slide"
                  onClick={() => setActiveSlide((slideIndex + 1) % activeSlides.length)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
          <div className="hero-media-wrap">
            <div data-editable="true" className="hero-media-label">
              <Crown size={15} /> <BuilderText as="span" text="Haute Couture Edit" />
            </div>
            <div className="hero-media">
              <CanvaEditable
                id={`hero_slide_${slideIndex}_image`}
                as="img"
                type="image"
                label={`Hero Slide ${slideIndex + 1} Photo`}
                src={slide.image}
                alt={slide.title}
                slideIndex={slideIndex}
                fieldPath={`heroSlides[${slideIndex}].image`}
              />
              <div className="media-gradient" />
              <button data-editable="true" className="save-pin">
                <Bookmark size={14} /> <BuilderText as="span" text="Save Pin" />
              </button>
              <div className="hero-caption">
                <div>
                  <BuilderText as="strong" text="HOUSE OF SHRIYA COUTURE" />
                  <BuilderText as="span" text={`${slide.number} · ${slide.season}`} />
                </div>
                <BuilderText as="h3" text={slide.caption} />
                <BuilderText as="p" text={`✦ Trending on Moodboard: ${slide.mood}`} />
              </div>
            </div>
            <div className="atelier-card">
              <div><BuilderText as="span" text="Atelier Detail" /></div>
            </div>
          </div>
        </div>
      </div>
      <FeatureStrip />
    </section>
  );
}

function FeatureStrip() {
  const features = [
    { icon: Crown, title: "Heritage Craftsmanship", text: "Artisanal hand-woven heirlooms" },
    { icon: Sparkles, title: "100% Pure Handlooms", text: "Authentic Banarasi & Chanderi" },
    { icon: Check, title: "Instant UPI & Cards", text: "Zero-hassle secure checkout" },
    { icon: PackageCheck, title: "Worldwide Express", text: "Fast insured courier delivery" },
  ];
  return <div className="feature-strip"><div className="site-container feature-grid">{features.map(({ icon: Icon, title, text }) => <div className="feature-item" key={title}><span data-editable="true"><Icon size={17} /></span><div><BuilderText as="strong" text={title} /><BuilderText as="small" text={text} /></div></div>)}</div></div>;
}

function Catalog({
  wishlist,
  onWishlist,
  activeCategory,
  onCategoryChange,
  query,
  onQueryChange,
}: {
  wishlist: Set<string>;
  onWishlist: (id: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const { products: dynamicProducts, categories, siteContent } = useStore();
  const [sort, setSort] = useState("Featured Couture");

  const categoryPills = useMemo(() => {
    const defaultPills = [
      "All Collections",
      "Wishlist",
      "Cotton Suits",
      "Daily Wear Suits",
      "Co-ord Sets",
      "Party Wear",
      "Festive Wear",
      "Seasonal Drop",
    ];
    if (!categories || categories.length === 0) return defaultPills;
    const catNames = categories.map((c) => c.name).filter((n) => n !== "Wishlist");
    return ["All Collections", "Wishlist", ...catNames];
  }, [categories]);

  const visibleProducts = useMemo(() => {
    const listToFilter = dynamicProducts && dynamicProducts.length > 0 ? dynamicProducts : products;
    let result = listToFilter.filter((product) => {
      let matchesFilter = true;
      if (activeCategory === "Wishlist") {
        matchesFilter = wishlist.has(product.id);
      } else if (activeCategory === "All Collections" || activeCategory === "All Suits") {
        matchesFilter = true;
      } else {
        const productTags = product.tags || [];
        matchesFilter =
          product.category === activeCategory ||
          productTags.includes(activeCategory);
      }

      const matchesQuery = `${product.name} ${product.description || ""} ${product.color || ""} ${product.fabricType || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchesFilter && matchesQuery;
    });

    if (sort === "Price: Low to High") {
      result = [...result].sort((a, b) => {
        const pA = Number(String(a.price).replace(/[^0-9]/g, "")) || 0;
        const pB = Number(String(b.price).replace(/[^0-9]/g, "")) || 0;
        return pA - pB;
      });
    }
    if (sort === "Price: High to Low") {
      result = [...result].sort((a, b) => {
        const pA = Number(String(a.price).replace(/[^0-9]/g, "")) || 0;
        const pB = Number(String(b.price).replace(/[^0-9]/g, "")) || 0;
        return pB - pA;
      });
    }
    if (sort === "Highest Rated") {
      result = [...result].sort((a, b) => {
        const rA = parseFloat(String(a.rating || "4.8")) || 4.8;
        const rB = parseFloat(String(b.rating || "4.8")) || 4.8;
        return rB - rA;
      });
    }
    return result;
  }, [dynamicProducts, activeCategory, query, sort]);

  return (
    <section id="catalog-section" className="catalog-section">
      <div className="site-container">
        <div className="catalog-heading">
          <div>
            <BuilderText
              as="p"
              id="catalog_subtitle"
              fieldPath="catalogSubtitle"
              label="Catalog Eyebrow"
              className="section-eyebrow"
              text={
                activeCategory === "Wishlist"
                  ? "Saved Heirloom Favorites"
                  : siteContent?.catalogSubtitle || "All Handcrafted Silks & Suits"
              }
            />
            <BuilderText
              as="h2"
              id="catalog_title"
              fieldPath="catalogTitle"
              label="Catalog Title"
              type="heading"
              text={
                activeCategory === "Wishlist"
                  ? `My Wishlist (${wishlist.size})`
                  : siteContent?.catalogTitle || "Grand Boutique Catalog"
              }
            />
          </div>
          <div className="catalog-search">
            <Search size={15} />
            <input
              data-editable="true"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by suit, fabric, or color..."
              aria-label="Search the catalog"
            />
          </div>
        </div>

        <div className="catalog-toolbar">
          <div className="filter-pills" style={{ overflowX: "auto", maxWidth: "100%", paddingBottom: "0.25rem" }}>
            {categoryPills.map((item) => (
              <button
                data-editable="true"
                key={item}
                className={activeCategory === item ? "active" : ""}
                onClick={() => onCategoryChange(item)}
              >
                <BuilderText as="span" text={item} />
              </button>
            ))}
          </div>

          <label className="sort-select">
            <BuilderText as="span" text="↕" />
            <select
              data-editable="true"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort products"
            >
              <option>Featured Couture</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Highest Rated</option>
            </select>
          </label>
        </div>

        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              index={index}
              product={product}
              isWishlisted={wishlist.has(product.id)}
              onWishlist={onWishlist}
            />
          ))}
        </div>

        {visibleProducts.length === 0 && (
          <div className="empty-state">
            {activeCategory === "Wishlist" ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <p className="text-[#5a544c] text-sm">Your wishlist is empty. Tap the heart on any suit piece to save it here.</p>
                <button
                  onClick={() => onCategoryChange("All Collections")}
                  className="mt-2 px-4 py-1.5 text-xs uppercase tracking-widest font-semibold bg-[#0d4f3c] text-white hover:bg-[#093a2c] transition-colors rounded-sm cursor-pointer"
                >
                  Explore All Collections
                </button>
              </div>
            ) : (
              <BuilderText as="span" text="No pieces found in this category or search. Try clearing filters." />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductCard({
  product,
  isWishlisted,
  onWishlist,
  index,
}: {
  product: Product;
  isWishlisted: boolean;
  onWishlist: (id: string) => void;
  index: number;
  key?: React.Key;
}) {
  const navigate = useNavigate();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { addToCart, startInstantCheckout } = useStore();
  const { isEditMode, isPreviewOnly, quickEditProduct } = useEditMode();

  const currentVariant = useMemo(() => {
    if (product.colorVariants && product.colorVariants.length > 0) {
      return product.colorVariants[selectedVariantIndex] || product.colorVariants[0];
    }
    return undefined;
  }, [product.colorVariants, selectedVariantIndex]);

  const productImages = useMemo(() => {
    if (currentVariant) {
      if (Array.isArray(currentVariant.images) && currentVariant.images.length > 0) {
        return currentVariant.images.filter(Boolean);
      }
      if (currentVariant.image) {
        return [currentVariant.image, currentVariant.hoverImage].filter(Boolean);
      }
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean);
    }
    return [product.image, ...(product.hoverImage && product.hoverImage !== product.image ? [product.hoverImage] : [])].filter(Boolean);
  }, [currentVariant, product.images, product.image, product.hoverImage]);

  const activeImage = productImages[activeImageIndex] || currentVariant?.image || product.image;

  const handleOpenDetails = () => {
    const colorParam = currentVariant?.colorName ? `?color=${encodeURIComponent(currentVariant.colorName)}` : "";
    navigate(`/product/${product.id}${colorParam}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize = product.sizes?.[0] || "Unstitched Suit";
    const variantProduct: Product = currentVariant
      ? {
          ...(product as Product),
          color: currentVariant.colorName || product.color,
          colorHex: currentVariant.colorHex || product.colorHex,
          price: currentVariant.price || product.price,
          originalPrice: currentVariant.originalPrice || product.originalPrice,
          savings: currentVariant.savings || product.savings,
          image: currentVariant.images?.[0] || currentVariant.image || product.image,
          hoverImage: currentVariant.images?.[1] || currentVariant.hoverImage || product.hoverImage,
          images: currentVariant.images || product.images,
        }
      : (product as Product);
    addToCart(variantProduct, defaultSize);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize = product.sizes?.[0] || "Unstitched Suit";
    const variantProduct: Product = currentVariant
      ? {
          ...(product as Product),
          color: currentVariant.colorName || product.color,
          colorHex: currentVariant.colorHex || product.colorHex,
          price: currentVariant.price || product.price,
          originalPrice: currentVariant.originalPrice || product.originalPrice,
          savings: currentVariant.savings || product.savings,
          image: currentVariant.images?.[0] || currentVariant.image || product.image,
          hoverImage: currentVariant.images?.[1] || currentVariant.hoverImage || product.hoverImage,
          images: currentVariant.images || product.images,
        }
      : (product as Product);
    startInstantCheckout(variantProduct, defaultSize);
  };

  const whatsappMsg = encodeURIComponent(
    `Namaste House of Shriya! I would like to inquire about ${product.name} (${currentVariant?.price || product.price}, ${currentVariant?.colorName || product.color || "Surat Handloom"}). Can you assist with delivery?`
  );

  return (
    <motion.article
      className="product-card relative cursor-pointer"
      onClick={handleOpenDetails}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        delay: (index % 3) * 0.08,
      }}
    >
      {/* Quick Edit button in Edit Mode */}
      {isEditMode && !isPreviewOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            quickEditProduct(product);
          }}
          className="absolute top-2 left-2 z-30 bg-[#7D2AE8] hover:bg-[#6d20d8] text-white text-[0.65rem] px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1 font-sans font-semibold cursor-pointer border border-white/20 transition-all hover:scale-105"
          title="Click to edit product in Canva modal"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
          <span>Edit Suit</span>
        </button>
      )}

      <div className="product-image">
        <CanvaEditable
          id={`product_${product.id}_image`}
          as="img"
          type="image"
          label={`${product.name} Photo`}
          src={activeImage}
          alt={product.name}
          productId={product.id}
          className="product-image-primary"
        />
        <img
          data-editable="true"
          className="product-image-hover"
          src={productImages[1] || currentVariant?.hoverImage || product.hoverImage || activeImage}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
          }}
        />
        <div className="product-badges">
          {(product.badges || []).slice(0, 2).map((badge) => (
            <BuilderText as="span" key={badge} text={badge} />
          ))}
        </div>
        <button
          type="button"
          data-editable="true"
          className={`wishlist-button ${isWishlisted ? "wishlisted" : ""}`}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          onClick={(e) => {
            e.stopPropagation();
            onWishlist(product.id);
          }}
        >
          <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          data-editable="true"
          className="absolute top-2.5 right-12 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#2a241e] hover:text-[#0d4f3c] flex items-center justify-center shadow-md opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border border-black/5"
          title="Zoom and Inspect High-Resolution Photos"
          aria-label={`Zoom ${product.name} photos`}
          onClick={(e) => {
            e.stopPropagation();
            setIsViewerOpen(true);
          }}
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          data-editable="true"
          className="quick-view"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails();
          }}
        >
          <BuilderText as="span" text="View Details" />
        </button>
      </div>
      <div className="product-content">
        <div className="rating-row">
          <span data-editable="true">
            <Star size={12} fill="currentColor" /> <BuilderText as="span" text={`${product.rating || "4.8"} (${product.reviews || "120+"})`} />
          </span>
          <BuilderText as="small" text={currentVariant?.colorName || product.color || "Artisan Craft"} />
        </div>

        {/* Color Palette Swatches on Card */}
        {product.colorVariants && product.colorVariants.length > 1 && (
          <div className="flex items-center gap-1.5 pt-1 pb-0.5" onClick={(e) => e.stopPropagation()}>
            {product.colorVariants.slice(0, 6).map((variant, vIdx) => {
              const isSelected = vIdx === selectedVariantIndex;
              return (
                <button
                  key={variant.id || vIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariantIndex(vIdx);
                    setActiveImageIndex(0);
                  }}
                  className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-[#0d4f3c] ring-offset-1 scale-110 shadow-xs"
                      : "opacity-75 hover:opacity-100 hover:scale-110 border border-black/20"
                  }`}
                  style={{ backgroundColor: variant.colorHex || "#0d4f3c" }}
                  title={`Select ${variant.colorName} edition (${variant.price || product.price})`}
                />
              );
            })}
            {product.colorVariants.length > 6 && (
              <span className="text-[10px] text-[#8c8275] font-medium">
                +{product.colorVariants.length - 6}
              </span>
            )}
          </div>
        )}

        <BuilderText
          as="h3"
          id={`product_${product.id}_title`}
          label={`${product.name} Title`}
          type="heading"
          text={product.name}
        />
        <BuilderText
          as="p"
          id={`product_${product.id}_desc`}
          label={`${product.name} Description`}
          text={currentVariant?.description || product.description}
        />
        <div className="price-row">
          <BuilderText
            as="strong"
            id={`product_${product.id}_price`}
            label={`${product.name} Price`}
            text={currentVariant?.price || product.price}
          />
          {(currentVariant?.originalPrice || product.originalPrice) && (
            <BuilderText
              as="del"
              id={`product_${product.id}_orig_price`}
              label={`${product.name} Original Price`}
              text={currentVariant?.originalPrice || product.originalPrice}
            />
          )}
          {(currentVariant?.savings || product.savings) && (
            <BuilderText
              as="span"
              id={`product_${product.id}_savings`}
              label={`${product.name} Savings`}
              text={currentVariant?.savings || product.savings}
            />
          )}
        </div>

        <div className="product-actions" style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "0.5rem" }}>
          <button
            type="button"
            data-editable="true"
            onClick={handleBuyNow}
            title="Instant Checkout"
            style={{
              flex: "1",
              backgroundColor: "#0d4f3c",
              color: "#faf8f5",
              fontWeight: 600,
              fontSize: "0.75rem",
              padding: "7px 12px",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            <BuilderText as="span" text="Buy Now" />
          </button>

          <button
            type="button"
            data-editable="true"
            onClick={handleAddToCart}
            title="Add to Shopping Bag"
            aria-label={`Add ${product.name} to Shopping Bag`}
            style={{
              backgroundColor: "#f4eee6",
              color: "#0d4f3c",
              fontWeight: 600,
              fontSize: "0.75rem",
              padding: "7px 10px",
              borderRadius: "9999px",
              border: "1px solid #d6ccc2",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ShoppingBag size={14} />
            <span>Bag</span>
          </button>

          <a
            data-editable="true"
            href={`https://wa.me/919501698356?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="whatsapp-button"
            aria-label={`Inquire on WhatsApp about ${product.name}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "9999px",
              backgroundColor: "#25D366",
              color: "#ffffff",
              textDecoration: "none",
            }}
          >
            <MessageCircle size={15} />
          </a>
        </div>
      </div>

      {/* Fullscreen High-Resolution Image Viewer */}
      <LuxuryImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={productImages}
        title={product.name}
        subtitle={product.category}
        colorName={product.color}
        price={product.price}
      />
    </motion.article>
  );
}

export function Footer({ onOpenModal }: { onOpenModal?: (type: string) => void }) {
  const { siteContent } = useStore();
  const whatsappHelpPookieUrl = "https://wa.me/919501698356?text=" + encodeURIComponent("Hi House of Shriya! POOKIE NEED A HELP ✨");

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-main">
          <div className="footer-brand">
            <LogoMark />
            <BuilderText as="h2" text="House of Shriya" />
            <BuilderText as="p" text={siteContent?.brandDescription || "Where pretty meets effortless elegance"} />
            <a
              data-editable="true"
              href={whatsappHelpPookieUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-[#f9a8d4] bg-[#f9a8d4]/10 hover:bg-[#f9a8d4]/20 border border-[#f9a8d4]/45 hover:border-[#f9a8d4] px-4 py-2 rounded-full transition-all duration-300 w-fit shadow-xs group"
              style={{
                fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
              title="Chat on WhatsApp (+919501698356)"
              aria-label="POOKIE NEED A HELP - Open WhatsApp chat"
            >
              <MessageCircle size={14} className="text-[#f9a8d4] group-hover:scale-110 transition-transform" />
              <BuilderText as="span" text="POOKIE NEED A HELP" />
              <Sparkles size={13} className="text-[#f9a8d4] group-hover:rotate-12 transition-transform opacity-90" />
            </a>
          </div>
          <div className="footer-links">
            <div>
              <BuilderText as="strong" text="Discover" />
              <Link data-editable="true" to="/our-story"><BuilderText as="span" text="Our Story" /></Link>
              <Link data-editable="true" to="/craftsmanship"><BuilderText as="span" text="Craftsmanship" /></Link>
              <Link data-editable="true" to="/journal"><BuilderText as="span" text="Journal" /></Link>
            </div>
            <div>
              <BuilderText as="strong" text="Client Care" />
              <button
                type="button"
                data-editable="true"
                onClick={() => onOpenModal?.("shipping_policy")}
                className="text-left text-[#faf8f5]/70 hover:text-white transition-colors"
              >
                <BuilderText as="span" text="Shipping Policy" />
              </button>
              <button
                type="button"
                data-editable="true"
                onClick={() => onOpenModal?.("support")}
                className="text-left text-[#faf8f5]/70 hover:text-white transition-colors"
              >
                <BuilderText as="span" text="Book a Styling" />
              </button>
              <button
                type="button"
                data-editable="true"
                onClick={() => onOpenModal?.("support")}
                className="text-left text-[#faf8f5]/70 hover:text-white transition-colors"
              >
                <BuilderText as="span" text="Contact Us" />
              </button>
            </div>
            <div>
              <BuilderText as="strong" text="Stay in the know" />
              <BuilderText as="p" text="Private previews, artisan stories, and first access to every drop." />
              <div className="footer-input">
                <input data-editable="true" placeholder="Your email address" aria-label="Email address" />
                <button data-editable="true" aria-label="Subscribe"><ArrowRight size={15} /></button>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <BuilderText as="span" text={siteContent?.footerNote || "© House of Shriya. Made for your forever wardrobe."} />
          <BuilderText as="span" text={`${siteContent?.atelierCity || "SURAT"} · WORLDWIDE SHIPPING`} />
        </div>
      </div>
    </footer>
  );
}

export default function Index() {
  const [showIntro, setShowIntro] = useState(true);
  const [pookieMessage, setPookieMessage] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All Collections");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Use persistent store wishlist and toggleWishlist
  const { wishlist, toggleWishlist } = useStore();

  const dismissIntro = () => setShowIntro(false);

  const openPookie = () => {
    window.dispatchEvent(new CustomEvent("open-pookie-chat"));
  };

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="storefront">
      {showIntro && (
        <IntroOverlay onEnter={dismissIntro} />
      )}

      <StoreHeader
        onPookie={openPookie}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        wishlistCount={wishlist.size}
        onSelectCategory={handleSelectCategory}
      />
          
          <main>
            <Hero onPookie={openPookie} />

            <Catalog
              wishlist={wishlist}
              onWishlist={toggleWishlist}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
          </main>

          <Footer onOpenModal={(type) => setActiveModal(type)} />

          {/* Navigation Drawer Menu */}
          <NavigationDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onSelectCategory={handleSelectCategory}
            onOpenModal={(type) => setActiveModal(type)}
            onOpenAuth={() => setIsAuthOpen(true)}
            wishlistCount={wishlist.size}
          />

          {/* Interactive Info Modal */}
          <InteractiveModal
            type={activeModal}
            onClose={() => setActiveModal(null)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          {/* Customer Authentication Modal */}
          <CustomerAuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
          />

          {pookieMessage && (
            <div className="pookie-toast">
              <span data-editable="true"><Sparkles size={16} /></span>
              <div>
                <BuilderText as="strong" text="Pookie is ready" />
                <BuilderText as="small" text="Tell me your occasion and I’ll style the perfect edit." />
              </div>
              <button data-editable="true" onClick={() => setPookieMessage(false)} aria-label="Close Pookie message">
                <X size={15} />
              </button>
            </div>
          )}
    </div>
  );
}
