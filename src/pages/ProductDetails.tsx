import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  ShieldCheck,
  Check,
  CheckCircle2,
  Share2,
  MessageCircle,
  RotateCcw,
  Clock,
  Layers,
  Award,
  ChevronDown,
  Palette,
  ZoomIn,
  Maximize2,
} from "lucide-react";
import LuxuryImageViewerModal from "../components/gallery/LuxuryImageViewerModal";
import { useStore } from "../context/StoreContext";
import { CanvaEditable } from "../components/editmode";
import { Product, ColorVariant } from "../types";
import { products as fallbackCatalog } from "../data/products";
import {
  StoreHeader,
  Footer,
  NavigationDrawer,
  InteractiveModal,
  BuilderText,
  ProductCard,
} from "./Index";
import CustomerAuthModal from "../components/customer/CustomerAuthModal";
import { getWhatsAppHelpUrl } from "../components/whatsapp/WhatsAppHelpButton";
import { normalizeImageUrl } from "../utils/imageUtils";
import { getLocallyDeletedIds } from "../services/storeService";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedColorParam = searchParams.get("color");
  const navigate = useNavigate();
  const {
    products,
    loadingCatalog,
    addToCart,
    startInstantCheckout,
    wishlist,
    toggleWishlist,
    siteContent,
    setIsCartOpen,
  } = useStore();

  // Find product by id from live store or fallback catalog
  const product = useMemo(() => {
    const deleted = getLocallyDeletedIds("products");
    if (id && (deleted.has(id) || deleted.has(id.trim()))) return null;
    const found = products.find((p) => p.id === id);
    if (found && !deleted.has(found.id) && !deleted.has((found as any).sku)) {
      return found;
    }
    const fallback = fallbackCatalog.find((p) => p.id === id);
    if (fallback && !deleted.has(fallback.id) && !deleted.has((fallback as any).sku)) {
      return fallback;
    }
    return null;
  }, [products, id]);

  // Normalized available color variants for this product
  const availableVariants = useMemo<ColorVariant[]>(() => {
    if (!product) return [];
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      return product.colorVariants;
    }
    const defaultImgs = Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter(Boolean)
      : [product.image || FALLBACK_IMAGE, ...(product.hoverImage && product.hoverImage !== product.image ? [product.hoverImage] : [])].filter(Boolean);

    return [
      {
        id: `var-${product.id}-0`,
        colorName: product.color || "Standard Edition",
        colorHex: product.colorHex || "#0d4f3c",
        price: product.price,
        originalPrice: product.originalPrice,
        savings: product.savings,
        description: product.description,
        fabricType: product.fabricType,
        images: defaultImgs.length > 0 ? defaultImgs : [FALLBACK_IMAGE],
        image: defaultImgs[0] || product.image || FALLBACK_IMAGE,
        hoverImage: defaultImgs[1] || defaultImgs[0] || product.image || FALLBACK_IMAGE,
        inStock: product.inStock !== false,
      },
    ];
  }, [product]);

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Sync selected color if URL specifies ?color=...
  useEffect(() => {
    if (requestedColorParam && availableVariants.length > 0) {
      const idx = availableVariants.findIndex(
        (v) => v.colorName.toLowerCase() === requestedColorParam.toLowerCase() || v.id === requestedColorParam
      );
      if (idx > -1) {
        setSelectedColorIndex(idx);
      }
    }
  }, [requestedColorParam, availableVariants]);

  // Currently active color variant
  const currentColorVariant = availableVariants[selectedColorIndex] || availableVariants[0];

  // Gallery images strictly for the selected color variant!
  const rawProductImages = useMemo(() => {
    if (!currentColorVariant) return [product?.image || FALLBACK_IMAGE];

    if (selectedColorIndex === 0 && product?.image) {
      if (Array.isArray(currentColorVariant.images) && currentColorVariant.images.length > 0) {
        const valid = currentColorVariant.images.filter(Boolean);
        return [product.image, ...valid.filter((img) => img !== product.image)];
      }
      if (Array.isArray(product.images) && product.images.length > 0) {
        const valid = product.images.filter(Boolean);
        return [product.image, ...valid.filter((img) => img !== product.image)];
      }
      return [product.image, ...(product.hoverImage && product.hoverImage !== product.image ? [product.hoverImage] : [])].filter(Boolean);
    }

    // Check if variant has its own images array
    if (Array.isArray(currentColorVariant.images) && currentColorVariant.images.length > 0) {
      const valid = currentColorVariant.images.filter(Boolean);
      if (valid.length > 0) return valid;
    }

    // Check single image/hoverImage for this variant
    if (currentColorVariant.image) {
      const list = [currentColorVariant.image];
      if (currentColorVariant.hoverImage && currentColorVariant.hoverImage !== currentColorVariant.image) {
        list.push(currentColorVariant.hoverImage);
      }
      return list;
    }

    // Only variant 0 (primary) falls back to product-level image
    if (selectedColorIndex === 0) {
      if (Array.isArray(product?.images) && product.images.length > 0) {
        return product.images.filter(Boolean);
      }
      return [product?.image || FALLBACK_IMAGE];
    }

    // Secondary variants without photos yet show the default fallback, NOT variant 0's photos
    return [FALLBACK_IMAGE];
  }, [currentColorVariant, selectedColorIndex, product]);

  const productImages = useMemo(() => {
    return rawProductImages.map((img) => normalizeImageUrl(img, FALLBACK_IMAGE));
  }, [rawProductImages]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image to cover photo when switching color variants
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColorIndex]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const handleOpenViewer = (index?: number) => {
    setViewerInitialIndex(typeof index === "number" ? index : activeImageIndex);
    setIsViewerOpen(true);
  };

  const selectedFormat = "Unstitched Suit";
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pincode, setPincode] = useState("");
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  // Dynamic values based on selected color variant
  const displayPrice = currentColorVariant?.price || product?.price || "₹2,999";
  const displayOriginalPrice = currentColorVariant?.originalPrice || product?.originalPrice;
  const displaySavings = currentColorVariant?.savings || product?.savings;
  const rawDescription = currentColorVariant?.description || product?.description || "";
  const displayDescription = useMemo(() => {
    return rawDescription
      .replace(/Format:\s*Unstitched[^\n.]*(?:\.|\n|$)/gi, "")
      .replace(/Complete 3-piece pure handloom unstitched set[^\n.]*(?:\.|\n|$)/gi, "")
      .replace(/Complete 3-piece pure handloom[^\n.]*(?:\.|\n|$)/gi, "")
      .replace(/Pure heirloom weave crafted with authentic Surat zari artistry\.?/gi, "")
      .replace(/\bComplete 3-piece\b/gi, "")
      .replace(/\n\s*\n+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }, [rawDescription]);
  const displayFabric = currentColorVariant?.fabricType || product?.fabricType || "Pure Chanderi Silk";
  const displayColor = currentColorVariant?.colorName || product?.color || "Artisan Craft";
  const isCurrentlyInStock = (currentColorVariant?.inStock !== false) && (product?.inStock !== false);

  // App chrome states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Related products (from same category or other luxury suits)
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const others = products.filter((p) => p.id !== product.id);
    const sameCategory = others.filter((p) => p.category === product.category);
    const combined = [...sameCategory, ...others.filter((p) => p.category !== product.category)];
    return combined.slice(0, 4);
  }, [products, product]);

  // Scroll to top on mount or when product ID changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveImageIndex(0);
    setQuantity(1);
    setPincodeChecked(false);
    if (product?.name) {
      document.title = `${product.name} (${displayColor}) | House of Shriya Atelier`;
    }
  }, [id, product?.name, displayColor]);

  const isWishlisted = Boolean(product && wishlist.has(product.id));

  const handleAddToCart = () => {
    if (!product) return;
    const variantProduct: Product = {
      ...product,
      color: currentColorVariant?.colorName || product.color,
      colorHex: currentColorVariant?.colorHex || product.colorHex,
      price: currentColorVariant?.price || product.price,
      originalPrice: currentColorVariant?.originalPrice || product.originalPrice,
      savings: currentColorVariant?.savings || product.savings,
      image: currentColorVariant?.images?.[0] || currentColorVariant?.image || product.image,
      hoverImage: currentColorVariant?.images?.[1] || currentColorVariant?.hoverImage || product.hoverImage,
      images: currentColorVariant?.images || product.images,
    };
    addToCart(variantProduct, selectedFormat, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
    setIsCartOpen(true);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const variantProduct: Product = {
      ...product,
      color: currentColorVariant?.colorName || product.color,
      colorHex: currentColorVariant?.colorHex || product.colorHex,
      price: currentColorVariant?.price || product.price,
      originalPrice: currentColorVariant?.originalPrice || product.originalPrice,
      savings: currentColorVariant?.savings || product.savings,
      image: currentColorVariant?.images?.[0] || currentColorVariant?.image || product.image,
      hoverImage: currentColorVariant?.images?.[1] || currentColorVariant?.hoverImage || product.hoverImage,
      images: currentColorVariant?.images || product.images,
    };
    startInstantCheckout(variantProduct, selectedFormat);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name ? `${product.name} (${displayColor})` : "House of Shriya Suit",
          text: `Check out ${product?.name} in ${displayColor} at House of Shriya`,
          url: `${window.location.origin}/product/${product?.id}?color=${encodeURIComponent(displayColor)}`,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/product/${product?.id}?color=${encodeURIComponent(displayColor)}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const openPookie = () => {
    window.dispatchEvent(new CustomEvent("open-pookie-chat"));
  };

  const whatsappInquiryUrl = useMemo(() => {
    if (!product) return "https://wa.me/919501698356";
    const msg = `Namaste House of Shriya! I am interested in the ${product.name} in ${displayColor} (${displayPrice}, Unstitched Suit). Could you share more details and availability?`;
    return `https://wa.me/919501698356?text=${encodeURIComponent(msg)}`;
  }, [product, displayColor, displayPrice]);

  // Product not found state
  if (!product && !loadingCatalog) {
    return (
      <div className="storefront min-h-screen flex flex-col bg-[#faf8f5]">
        <StoreHeader
          onPookie={openPookie}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          wishlistCount={wishlist.size}
        />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <Sparkles className="mx-auto text-[#c5a059] mb-4" size={32} />
            <h1 className="font-serif text-2xl text-[#2a241e] mb-2 font-medium">Piece Not Found</h1>
            <p className="text-sm text-[#786d65] mb-6">
              This handcrafted piece may have moved or been updated in our atelier catalog.
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 bg-[#0d4f3c] text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#0a3f30] transition-colors"
            >
              <ArrowLeft size={14} /> Return to Store
            </button>
          </div>
        </main>
        <Footer onOpenModal={(type) => setActiveModal(type)} />
      </div>
    );
  }

  const activeImage = productImages[activeImageIndex] || product?.image || "";

  return (
    <div className="storefront min-h-screen flex flex-col bg-[#faf8f5] text-[#2a241e]">
      {/* Global Header */}
      <StoreHeader
        onPookie={openPookie}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenModal={(type) => setActiveModal(type)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        wishlistCount={wishlist.size}
        onSelectCategory={(cat) => navigate(`/?category=${encodeURIComponent(cat)}`)}
      />

      {/* Top Navigation & Breadcrumbs */}
      <div className="border-b border-[#e8dfd5]/70 bg-white/70 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#5a544c] hover:text-[#0d4f3c] py-1 px-3 rounded-full hover:bg-[#f4eee6] transition-colors border border-[#e8dfd5]/80"
              title="Return to boutique catalog"
            >
              <ArrowLeft size={13} />
              <span>Back to Shop</span>
            </button>
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-[#8c827a]">
              <Link to="/" className="hover:text-[#0d4f3c] transition-colors">Home</Link>
              <span>/</span>
              <span className="text-[#5a544c] font-medium">{product?.category || "Collections"}</span>
              <span>/</span>
              <span className="text-[#2a241e] font-semibold truncate max-w-[200px]">{product?.name}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-full border border-[#e8dfd5] text-[#6b625b] hover:text-[#0d4f3c] hover:bg-[#f4eee6] transition-all"
              title="Share this suit"
              aria-label="Share product"
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => product && toggleWishlist(product.id)}
              className={`p-2 rounded-full border transition-all ${
                isWishlisted
                  ? "border-[#9b2c2c] bg-[#9b2c2c] text-white"
                  : "border-[#e8dfd5] text-[#6b625b] hover:text-[#9b2c2c] hover:bg-[#fff0f0]"
              }`}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-label="Wishlist"
            >
              <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Product Showcase Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 pb-24 md:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-12 items-start">
          
          {/* LEFT: Luxury Image Gallery */}
          <div className="md:col-span-6 lg:col-span-7 flex flex-col gap-4">
            {/* Primary Main Image Frame */}
            <div
              onClick={() => handleOpenViewer()}
              className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#f4eee6] border border-[#e8dfd5] shadow-xs group cursor-zoom-in"
              title="Click to open full high-resolution image viewer (Zoom & Pan)"
            >
              {/* Product Badges */}
              <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 max-w-[calc(100%-80px)]">
                {(product?.badges || ["Bestseller", "Pure Surat Silk"]).map((badge) => (
                  <span
                    key={badge}
                    className="bg-[#0d4f3c] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Wishlist Button Overlay */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  product && toggleWishlist(product.id);
                }}
                className={`absolute top-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md shadow-md transition-all ${
                  isWishlisted
                    ? "bg-[#9b2c2c] border-[#9b2c2c] text-white"
                    : "bg-white/90 border-white text-[#786d65] hover:scale-110 hover:text-[#9b2c2c]"
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
              </button>

              {/* Main Image with Smooth Fade */}
              <motion.img
                key={`${product?.id}-${currentColorVariant?.id}-${activeImageIndex}`}
                src={activeImage}
                alt={`${product?.name || "Suit"} - ${displayColor}`}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />

              {/* Gallery Navigation Arrows on Image (Desktop & Tablet) */}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#2a241e] flex items-center justify-center shadow-md opacity-80 hover:opacity-100 transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#2a241e] flex items-center justify-center shadow-md opacity-80 hover:opacity-100 transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Click to Zoom Pill Indicator */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenViewer();
                }}
                className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white text-xs font-medium backdrop-blur-md border border-white/20 transition-all shadow-md group-hover:scale-105"
                title="Click to open full-screen high-resolution zoom viewer"
              >
                <ZoomIn size={14} className="text-[#d4af37]" />
                <span>Click to Zoom</span>
              </button>

              {/* Image Counter Indicator */}
              {productImages.length > 1 && (
                <div className="absolute bottom-3 right-3 z-20 bg-black/60 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {activeImageIndex + 1} / {productImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Carousel Row */}
            {productImages.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (activeImageIndex === idx) {
                        handleOpenViewer(idx);
                      } else {
                        setActiveImageIndex(idx);
                      }
                    }}
                    onDoubleClick={() => handleOpenViewer(idx)}
                    className={`relative w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImageIndex === idx
                        ? "border-[#0d4f3c] ring-2 ring-[#0d4f3c]/25 shadow-sm scale-102"
                        : "border-[#e8dfd5] opacity-75 hover:opacity-100 hover:border-[#0d4f3c]/50"
                    }`}
                    title={activeImageIndex === idx ? "Click to open full-screen zoom" : `Switch to photo ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Atelier Trust Strip Underneath Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#e8dfd5]/80 text-xs">
              <div className="flex items-center gap-2 text-[#5a544c]">
                <Award className="text-[#c5a059] shrink-0" size={18} />
                <span className="font-medium leading-tight">100% Pure Handloom</span>
              </div>
              <div className="flex items-center gap-2 text-[#5a544c]">
                <Truck className="text-[#0d4f3c] shrink-0" size={18} />
                <span className="font-medium leading-tight">Free Express Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-[#5a544c]">
                <ShieldCheck className="text-[#0d4f3c] shrink-0" size={18} />
                <span className="font-medium leading-tight">100% Secure Online Payment</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Details & Buying Controls */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-5 md:sticky md:top-24">
            
            {/* Category / Collection Tag & Rating */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="uppercase tracking-widest text-[10px] font-bold text-[#0d4f3c] bg-[#0d4f3c]/10 px-2.5 py-1 rounded-full">
                {product?.category || "Festive Wear"} · {displayColor}
              </span>

              <div className="flex items-center gap-1 text-xs text-[#786d65]">
                <div className="flex text-[#c5a059]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} fill="currentColor" />
                  ))}
                </div>
                <span className="font-bold text-[#2a241e] ml-1">{product?.rating || "4.9"}</span>
                <span>({product?.reviews || "148"} reviews)</span>
              </div>
            </div>

            {/* Product Title */}
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1612] font-normal leading-tight tracking-tight">
                {product?.name}
              </h1>
              <p className="text-xs text-[#8c827a] mt-1">
                Atelier Handcrafted in Surat, Gujarat · Style Code: #{product?.id.toUpperCase()} · Edition: {displayColor}
              </p>
            </div>

            {/* Price Presentation Block */}
            <div className="p-4 rounded-xl bg-white border border-[#e8dfd5] shadow-2xs">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-[#0d4f3c] font-sans">
                  {displayPrice}
                </span>
                {displayOriginalPrice && (
                  <del className="text-sm text-[#8c827a] font-normal">
                    {displayOriginalPrice}
                  </del>
                )}
                {displaySavings && (
                  <span className="bg-[#fcf3dc] text-[#916212] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#f0dfaa]">
                    {displaySavings}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#786d65] mt-1.5 flex items-center gap-1.5">
                <Check size={13} className="text-[#0d4f3c]" />
                <span>Inclusive of all taxes · Free insured doorstep delivery across India</span>
              </p>
            </div>

            {/* Independent Color Variant Selection Component */}
            <div className="p-4 rounded-xl bg-white border border-[#e8dfd5] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2a241e] uppercase tracking-wider flex items-center gap-2">
                  <Palette size={14} className="text-[#0d4f3c]" />
                  <span>Select Color Variant:</span>
                  <span className="text-[#0d4f3c] font-serif capitalize font-semibold text-sm">
                    {displayColor}
                  </span>
                </label>
                <span className="text-[11px] font-medium text-[#786d65]">
                  {availableVariants.length} {availableVariants.length === 1 ? "edition" : "editions"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {availableVariants.map((variant, idx) => {
                  const isSelected = selectedColorIndex === idx;
                  const vPrice = variant.price || product?.price;
                  return (
                    <button
                      key={variant.id || idx}
                      type="button"
                      onClick={() => {
                        setSelectedColorIndex(idx);
                        setActiveImageIndex(0);
                      }}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                        isSelected
                          ? "bg-[#0d4f3c] text-white border-[#0d4f3c] shadow-sm font-semibold scale-[1.02]"
                          : "bg-[#faf8f5] text-[#2a241e] border-[#d6ccc2] hover:border-[#0d4f3c]/60 hover:bg-white"
                      }`}
                      title={`Switch to ${variant.colorName}`}
                    >
                      {/* Swatch color dot */}
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0 flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110"
                        style={{ backgroundColor: variant.colorHex || "#0d4f3c" }}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                      </span>

                      <span className="font-medium whitespace-nowrap">{variant.colorName}</span>

                      {vPrice && vPrice !== displayPrice && !isSelected && (
                        <span className="text-[10px] text-[#786d65] font-normal">
                          ({vPrice})
                        </span>
                      )}

                      {variant.inStock === false && (
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded-full ${isSelected ? "bg-red-500/20 text-red-200" : "bg-red-100 text-red-700"}`}>
                          Out of stock
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {currentColorVariant && (
                <div className="text-[11px] text-[#786d65] flex items-center justify-between pt-1 border-t border-[#f0eae1]">
                  <span>Viewing {productImages.length} photos exclusively for <strong>{displayColor}</strong></span>
                  <span className="text-[#0d4f3c] font-medium">Independent Edition</span>
                </div>
              )}
            </div>

            {/* Editorial Description */}
            <div className="text-sm text-[#5a544c] leading-relaxed border-b border-[#e8dfd5] pb-4">
              <p>{displayDescription}</p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-bold text-[#2a241e] uppercase tracking-wider">Quantity:</span>
              <div className="inline-flex items-center border border-[#d6ccc2] rounded-full bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center text-[#5a544c] hover:bg-[#f4eee6] transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold text-[#2a241e]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center text-[#5a544c] hover:bg-[#f4eee6] transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Primary Action Buttons (Add to Cart, Buy Now, WhatsApp) */}
            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex items-center gap-3">
                {/* Instant Buy Now Button */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 bg-[#0d4f3c] hover:bg-[#0a3f30] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold py-3.5 px-6 rounded-full shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                  title="Buy Now - Instant Checkout"
                >
                  <Sparkles size={16} className="text-amber-300" />
                  <span>Buy Now</span>
                </button>

                {/* Add to Cart / Shopping Bag Button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 bg-[#f4eee6] hover:bg-[#eae2d5] active:scale-[0.99] text-[#0d4f3c] border border-[#d6ccc2] text-xs sm:text-sm font-semibold py-3.5 px-6 rounded-full transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                  title="Add to Shopping Bag"
                >
                  <ShoppingBag size={16} />
                  <span>Add to Bag</span>
                </button>
              </div>

              {/* WhatsApp Concierge Consultation Button */}
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/40 text-xs font-semibold py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} className="text-[#25D366]" />
                <span>Inquire with Master Stylist on WhatsApp</span>
              </a>
            </div>

            {/* Delivery Pincode Checker */}
            <div className="p-3.5 rounded-xl bg-white border border-[#e8dfd5] text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#2a241e] flex items-center gap-1.5">
                  <Truck size={14} className="text-[#0d4f3c]" />
                  <span>Check Delivery Estimate:</span>
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit Pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value.replace(/\D/g, ""));
                    setPincodeChecked(false);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#d6ccc2] text-xs focus:outline-none focus:border-[#0d4f3c]"
                />
                <button
                  type="button"
                  onClick={() => pincode.length === 6 && setPincodeChecked(true)}
                  disabled={pincode.length !== 6}
                  className="px-4 py-1.5 bg-[#0d4f3c] text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-[#0a3f30] transition-colors"
                >
                  Check
                </button>
              </div>
              {pincodeChecked && (
                <div className="mt-2 text-[11px] text-[#0d4f3c] bg-[#eef7f3] p-2 rounded-md flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>
                    Express delivery available to <strong>{pincode}</strong> in 3–4 days across India.
                  </span>
                </div>
              )}
            </div>

            {/* Detailed Product Specifications */}
            <div className="border border-[#e8dfd5] rounded-xl bg-white overflow-hidden divide-y divide-[#e8dfd5]">
              <div className="p-3.5 bg-[#faf8f5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2a241e]">
                  Suit Specifications & Atelier Notes
                </h3>
              </div>
              <div className="p-3.5 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Fabric Material</span>
                  <span className="font-medium text-[#2a241e]">{product?.fabricType || "Pure Surat Handloom Silk"}</span>
                </div>
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Color Palette</span>
                  <span className="font-medium text-[#2a241e]">{product?.color || "Royal Emerald & Zari"}</span>
                </div>
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Suit Format</span>
                  <span className="font-medium text-[#2a241e]">Premium Unstitched Suit</span>
                </div>
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Dupatta Style</span>
                  <span className="font-medium text-[#2a241e]">Handloom Zari Bordered Dupatta</span>
                </div>
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Wash Care</span>
                  <span className="font-medium text-[#2a241e]">Dry Clean Only recommended</span>
                </div>
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Atelier Craft</span>
                  <span className="font-medium text-[#2a241e]">Surat Handloom Weave</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RELATED PRODUCTS SECTION ("You May Also Admire") */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 sm:mt-24 pt-12 border-t border-[#e8dfd5]">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#c5a059] flex items-center gap-1.5 mb-1">
                  <Sparkles size={13} />
                  <span>Curated Heirloom Pieces</span>
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1a1612]">
                  You May Also Admire
                </h2>
              </div>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#0d4f3c] hover:underline"
              >
                <span>View Full Catalog</span>
                <ArrowLeft size={13} className="rotate-180" />
              </button>
            </div>

            <div className="product-grid">
              {relatedProducts.map((relProduct, idx) => (
                <ProductCard
                  key={relProduct.id}
                  product={relProduct}
                  index={idx}
                  isWishlisted={wishlist.has(relProduct.id)}
                  onWishlist={(pId) => toggleWishlist(pId)}
                />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8dfd5] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg flex items-center gap-3">
        <div className="flex flex-col min-w-0 max-w-[40%]">
          <span className="text-xs text-[#8c827a] truncate font-medium">{displayColor} · {product?.name}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#0d4f3c]">{displayPrice}</span>
            <span className="text-[10px] font-semibold text-[#0d4f3c] bg-[#0d4f3c]/10 px-1.5 py-0.5 rounded truncate">Unstitched</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 bg-[#f4eee6] text-[#0d4f3c] border border-[#d6ccc2] py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 uppercase transition-colors"
          >
            <ShoppingBag size={14} />
            <span>Bag</span>
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 bg-[#0d4f3c] text-white py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm uppercase transition-colors"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <Footer onOpenModal={(type) => setActiveModal(type)} />

      {/* Navigation Drawer Menu */}
      <NavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectCategory={(cat) => {
          setDrawerOpen(false);
          navigate(`/?category=${encodeURIComponent(cat)}`);
        }}
        onOpenModal={(type) => {
          setDrawerOpen(false);
          setActiveModal(type);
        }}
        onOpenAuth={() => {
          setDrawerOpen(false);
          setIsAuthOpen(true);
        }}
        wishlistCount={wishlist.size}
      />

      {/* Customer Authentication Modal */}
      <CustomerAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Interactive Info Modals */}
      <InteractiveModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* High-Resolution Myntra-Style Fullscreen Image Viewer with Smooth Zoom */}
      <LuxuryImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={productImages}
        initialIndex={viewerInitialIndex}
        title={product?.name}
        subtitle={product?.category}
        colorName={displayColor}
        price={displayPrice}
      />

      {/* Copy link confirmation toast */}
      {copiedLink && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0d4f3c] text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Check size={14} className="text-amber-300" />
          <span>Product link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
