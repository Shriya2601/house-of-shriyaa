import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Ruler,
  Clock,
  Layers,
  Award,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useEditMode, CanvaEditable } from "../components/editmode";
import { Product } from "../types";
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

const STANDARD_SIZES = [
  { id: "Unstitched Fabric", label: "Unstitched Fabric", sub: "2.5m Kurta + 2.5m Salwar + 2.25m Dupatta" },
  { id: "S", label: "S (36)", sub: "Bust 36\" | Waist 32\"" },
  { id: "M", label: "M (38)", sub: "Bust 38\" | Waist 34\"" },
  { id: "L", label: "L (40)", sub: "Bust 40\" | Waist 36\"" },
  { id: "XL", label: "XL (42)", sub: "Bust 42\" | Waist 38\"" },
  { id: "XXL", label: "XXL (44)", sub: "Bust 44\" | Waist 40\"" },
];

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
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
  const { isEditMode, isPreviewOnly, quickEditProduct } = useEditMode();

  // Find product by id from live store or fallback catalog
  const product = useMemo(() => {
    const found = products.find((p) => p.id === id);
    if (found) return found;
    return fallbackCatalog.find((p) => p.id === id);
  }, [products, id]);

  // Gallery images (deduplicated)
  const productImages = useMemo(() => {
    if (!product) return [];
    const imgs: string[] = [];
    if (product.image) imgs.push(product.image);
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img && !imgs.includes(img)) imgs.push(img);
      });
    }
    if (product.hoverImage && !imgs.includes(product.hoverImage)) {
      imgs.push(product.hoverImage);
    }
    return imgs.length > 0 ? imgs : [product.image || ""];
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("Unstitched Fabric");
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [pincode, setPincode] = useState("");
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

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
    if (product?.sizes?.[0]) {
      setSelectedSize(product.sizes[0]);
    } else {
      setSelectedSize("Unstitched Fabric");
    }
    if (product?.name) {
      document.title = `${product.name} | House of Shriya Atelier`;
    }
  }, [id, product?.name, product?.sizes]);

  const isWishlisted = Boolean(product && wishlist.has(product.id));

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, selectedSize, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
    setIsCartOpen(true);
  };

  const handleBuyNow = () => {
    if (!product) return;
    startInstantCheckout(product, selectedSize);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || "House of Shriya Suit",
          text: `Check out ${product?.name} at House of Shriya`,
          url: window.location.href,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const openPookie = () => {
    window.dispatchEvent(new CustomEvent("open-pookie-chat"));
  };

  const whatsappInquiryUrl = useMemo(() => {
    if (!product) return "https://wa.me/919501698356";
    const msg = `Namaste House of Shriya! I am interested in the ${product.name} (${product.price}, ${product.color || "Surat Handloom"}, Size: ${selectedSize}). Could you share more details and availability?`;
    return `https://wa.me/919501698356?text=${encodeURIComponent(msg)}`;
  }, [product, selectedSize]);

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          
          {/* LEFT: Luxury Image Gallery (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Primary Main Image Frame */}
            <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#f4eee6] border border-[#e8dfd5] shadow-xs group">
              {/* Canva Edit Button in Edit Mode */}
              {isEditMode && !isPreviewOnly && product && (
                <button
                  type="button"
                  onClick={() => quickEditProduct(product)}
                  className="absolute top-3 left-3 z-30 bg-[#7D2AE8] hover:bg-[#6d20d8] text-white text-xs px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1.5 font-sans font-semibold border border-white/20 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                  <span>Edit Product Content</span>
                </button>
              )}

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
                onClick={() => product && toggleWishlist(product.id)}
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
                key={activeImage}
                src={activeImage}
                alt={product?.name || "Suit"}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              />

              {/* Gallery Navigation Arrows on Image (Desktop & Tablet) */}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#2a241e] flex items-center justify-center shadow-md opacity-80 hover:opacity-100 transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#2a241e] flex items-center justify-center shadow-md opacity-80 hover:opacity-100 transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

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
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx
                        ? "border-[#0d4f3c] ring-2 ring-[#0d4f3c]/25 shadow-sm scale-102"
                        : "border-[#e8dfd5] opacity-75 hover:opacity-100 hover:border-[#0d4f3c]/50"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Atelier Trust Strip Underneath Gallery */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#e8dfd5]/80 text-xs">
              <div className="flex items-center gap-2 text-[#5a544c]">
                <Award className="text-[#c5a059] shrink-0" size={18} />
                <span className="font-medium leading-tight">100% Pure Handloom</span>
              </div>
              <div className="flex items-center gap-2 text-[#5a544c]">
                <Truck className="text-[#0d4f3c] shrink-0" size={18} />
                <span className="font-medium leading-tight">Free Express Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-[#5a544c]">
                <RotateCcw className="text-[#c5a059] shrink-0" size={18} />
                <span className="font-medium leading-tight">7-Day Easy Exchange</span>
              </div>
              <div className="flex items-center gap-2 text-[#5a544c]">
                <ShieldCheck className="text-[#0d4f3c] shrink-0" size={18} />
                <span className="font-medium leading-tight">COD & Prepaid Safe</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Details & Buying Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24">
            
            {/* Category / Collection Tag & Rating */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="uppercase tracking-widest text-[10px] font-bold text-[#0d4f3c] bg-[#0d4f3c]/10 px-2.5 py-1 rounded-full">
                {product?.category || "Festive Wear"} · {product?.color || "Surat Artisan"}
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
                Atelier Handcrafted in Surat, Gujarat · Style Code: #{product?.id.toUpperCase()}
              </p>
            </div>

            {/* Price Presentation Block */}
            <div className="p-4 rounded-xl bg-white border border-[#e8dfd5] shadow-2xs">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-[#0d4f3c] font-sans">
                  {product?.price}
                </span>
                {product?.originalPrice && (
                  <del className="text-sm text-[#8c827a] font-normal">
                    {product.originalPrice}
                  </del>
                )}
                {product?.savings && (
                  <span className="bg-[#fcf3dc] text-[#916212] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#f0dfaa]">
                    {product.savings}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#786d65] mt-1.5 flex items-center gap-1.5">
                <Check size={13} className="text-[#0d4f3c]" />
                <span>Inclusive of all taxes · Free insured doorstep delivery across India</span>
              </p>
            </div>

            {/* Editorial Description */}
            <div className="text-sm text-[#5a544c] leading-relaxed border-b border-[#e8dfd5] pb-4">
              <p>{product?.description}</p>
              <p className="text-xs text-[#8c827a] mt-2 italic">
                Woven on traditional Surat handlooms with heirloom finesse, this suit drapes with effortless regal poise for festive soirees and celebration dinners.
              </p>
            </div>

            {/* Size & Stitching Preference */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2a241e] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Select Size & Stitching:</span>
                  <span className="text-[#0d4f3c] font-semibold">{selectedSize}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs text-[#0d4f3c] hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Ruler size={13} />
                  <span>Size & Fabric Guide</span>
                </button>
              </div>

              {/* Interactive Size Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STANDARD_SIZES.map((size) => {
                  const isSelected = selectedSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size.id)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-[#0d4f3c] text-white border-[#0d4f3c] shadow-xs"
                          : "bg-white text-[#2a241e] border-[#e8dfd5] hover:border-[#0d4f3c] hover:bg-[#faf8f5]"
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>{size.label}</span>
                        {isSelected && <Check size={13} className="text-amber-300" />}
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate ${isSelected ? "text-white/80" : "text-[#786d65]"}`}>
                        {size.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Helper tip for unstitched */}
              {selectedSize === "Unstitched Fabric" && (
                <div className="bg-[#f9f6f0] p-3 rounded-xl border border-[#e8dfd5] text-xs text-[#6a5e53]">
                  <strong>Unstitched Fabric Set:</strong> Includes generous 2.5m Kurta material, 2.5m Salwar/Pants bottom material, and 2.25m full-width handwoven Dupatta. Ideal for tailoring bespoke necklines, sleeves, and customized fits.
                </div>
              )}
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
                  <span>Check Delivery & Cash on Delivery:</span>
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
                    Express delivery available to <strong>{pincode}</strong> in 3–4 days. Cash on Delivery is active.
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
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Cut / Silhouette</span>
                  <span className="font-medium text-[#2a241e]">{product?.cut || "Classic Anarkali / Straight Suit"}</span>
                </div>
                <div>
                  <span className="text-[#8c827a] block text-[10px] uppercase font-bold">Dupatta Style</span>
                  <span className="font-medium text-[#2a241e]">Handloom Zari Bordered Dupatta (2.25m)</span>
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8dfd5] p-3 shadow-lg flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-[#8c827a] line-clamp-1">{product?.name}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#0d4f3c]">{product?.price}</span>
            <span className="text-[10px] text-[#5a544c]">({selectedSize})</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 bg-[#f4eee6] text-[#0d4f3c] border border-[#d6ccc2] py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 uppercase"
          >
            <ShoppingBag size={14} />
            <span>Bag</span>
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 bg-[#0d4f3c] text-white py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm uppercase"
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

      {/* Interactive Info Modals (Order Tracker, Size Chart, Exchange Policy) */}
      <InteractiveModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            className="bg-white max-w-lg w-full rounded-2xl p-6 border border-[#e8dfd5] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e8dfd5] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#1a1612] font-semibold flex items-center gap-2">
                <Ruler size={18} className="text-[#0d4f3c]" />
                <span>House of Shriya Sizing & Fabric Guide</span>
              </h3>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="text-[#8c827a] hover:text-[#2a241e] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#5a544c]">
              <div className="bg-[#faf8f5] p-3 rounded-xl border border-[#e8dfd5]">
                <h4 className="font-bold text-[#0d4f3c] mb-1">Unstitched Fabric Option:</h4>
                <p>
                  Every unstitched suit box provides ample fabric lengths:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[#2a241e]">
                  <li><strong>Kurta / Top:</strong> 2.50 Meters (Pure Handloom Silk/Chanderi)</li>
                  <li><strong>Bottom / Salwar:</strong> 2.50 Meters (Santoon / Cotton Silk Blend)</li>
                  <li><strong>Dupatta:</strong> 2.25 Meters (Full width artisan zari border)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#2a241e] mb-2">Standard Stitched Measurements (Inches):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border border-[#e8dfd5] rounded-lg">
                    <thead className="bg-[#faf8f5] text-[#2a241e]">
                      <tr>
                        <th className="p-2 border-b border-[#e8dfd5]">Size</th>
                        <th className="p-2 border-b border-[#e8dfd5]">Bust</th>
                        <th className="p-2 border-b border-[#e8dfd5]">Waist</th>
                        <th className="p-2 border-b border-[#e8dfd5]">Hip</th>
                        <th className="p-2 border-b border-[#e8dfd5]">Kurta Length</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8dfd5]">
                      <tr><td className="p-2 font-bold">S</td><td className="p-2">36"</td><td className="p-2">32"</td><td className="p-2">38"</td><td className="p-2">46"</td></tr>
                      <tr><td className="p-2 font-bold">M</td><td className="p-2">38"</td><td className="p-2">34"</td><td className="p-2">40"</td><td className="p-2">46"</td></tr>
                      <tr><td className="p-2 font-bold">L</td><td className="p-2">40"</td><td className="p-2">36"</td><td className="p-2">42"</td><td className="p-2">47"</td></tr>
                      <tr><td className="p-2 font-bold">XL</td><td className="p-2">42"</td><td className="p-2">38"</td><td className="p-2">44"</td><td className="p-2">47"</td></tr>
                      <tr><td className="p-2 font-bold">XXL</td><td className="p-2">44"</td><td className="p-2">40"</td><td className="p-2">46"</td><td className="p-2">48"</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[11px] text-[#786d65] italic">
                Need custom boutique tailoring or sleeve adjustments? Connect with our master stylist on WhatsApp (+91 95016 98356).
              </div>
            </div>

            <button
              onClick={() => setShowSizeGuide(false)}
              className="mt-5 w-full bg-[#0d4f3c] text-white py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#0a3f30] transition-colors"
            >
              Got It, Continue
            </button>
          </div>
        </div>
      )}

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
