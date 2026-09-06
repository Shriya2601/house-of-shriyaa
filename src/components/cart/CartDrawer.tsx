import React, { useState } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Sparkles, ZoomIn } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import LuxuryImageViewerModal from "../gallery/LuxuryImageViewerModal";
import { Product } from "../../types";

export default function CartDrawer() {
  const [viewerProduct, setViewerProduct] = useState<Product | null>(null);
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    cartSubtotal,
    totalCartCount,
    setIsCheckoutOpen,
  } = useStore();

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = 1999;
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));
  const amountToFreeDelivery = freeDeliveryThreshold - cartSubtotal;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-[420px] bg-[#faf8f5] text-[#1e1b18] shadow-2xl flex flex-col h-full border-l border-[#d4af37]/20">
        {/* Header */}
        <div className="p-4 border-b border-[#e8dfd8] flex items-center justify-between bg-[#f4eee6]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#0d4f3c]" />
            <h2 className="font-serif font-bold text-lg text-[#1e1b18] tracking-wide">
              Your Shopping Bag
            </h2>
            <span className="bg-[#0d4f3c] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {totalCartCount}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5a544c] hover:text-black hover:bg-[#e8dfd8] transition-colors"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Delivery Bar */}
        <div className="bg-[#0d4f3c]/5 border-b border-[#0d4f3c]/10 px-4 py-2.5">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5 text-[#0d4f3c]">
            {amountToFreeDelivery <= 0 ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <Sparkles size={13} className="text-[#c5a059]" /> Congratulations! You have unlocked Free Express Delivery
              </span>
            ) : (
              <span>Add <b>₹{amountToFreeDelivery.toLocaleString("en-IN")}</b> more to unlock <b>Free Delivery</b></span>
            )}
          </div>
          <div className="w-full bg-[#e3dcd3] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#0d4f3c] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#e8dfd8]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#e8dfd8] flex items-center justify-center text-[#8e857b]">
                <ShoppingBag size={28} />
              </div>
              <h3 className="font-serif font-bold text-base text-[#1e1b18]">Your bag is currently empty</h3>
              <p className="text-xs text-[#6b6257] max-w-[240px]">
                Explore our pure Chanderi, Katan silk, and breathable mulmul collections to select your heirloom pieces.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-2 text-xs uppercase tracking-wider font-bold text-[#0d4f3c] border border-[#0d4f3c] rounded-full px-5 py-2 hover:bg-[#0d4f3c] hover:text-white transition-colors"
              >
                Browse Collections
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.product.id}-${item.size}`} className="py-4 flex gap-3.5 items-start">
                <div
                  className="relative group cursor-zoom-in shrink-0"
                  onClick={() => setViewerProduct(item.product as Product)}
                  title="Click to view high-resolution photo"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-18 h-22 object-cover rounded-md border border-[#e8dfd8] transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-md transition-opacity flex items-center justify-center text-white">
                    <ZoomIn size={14} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-[#1e1b18] truncate leading-snug">
                    {item.product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-medium text-[#0d4f3c] bg-[#ede5db] px-2 py-0.5 rounded">
                      Unstitched Suit
                    </span>
                    <span className="text-[11px] text-[#6b6257]">
                      {item.product.color}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-[#0d4f3c] mt-2">
                    {item.product.price}
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center border border-[#d6ccc2] rounded-full bg-white px-1 py-0.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#5a544c] hover:text-black"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#5a544c] hover:text-black"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id, item.size)}
                      className="text-[#9e3b3b] hover:text-red-700 p-1 transition-colors"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Subtotal and Checkout CTA */}
        {cart.length > 0 && (
          <div className="p-4 bg-[#f4eee6] border-t border-[#e8dfd8] space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#6b6257]">
                <span>Bag Subtotal</span>
                <span className="font-semibold text-[#1e1b18]">₹{cartSubtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[#6b6257]">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-emerald-800">
                  {cartSubtotal >= 1999 ? "FREE" : "₹150"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#e3dcd3] flex justify-between items-baseline">
              <span className="font-serif font-bold text-sm text-[#1e1b18]">Estimated Total</span>
              <span className="font-serif font-bold text-lg text-[#0d4f3c]">
                ₹{(cartSubtotal + (cartSubtotal >= 1999 ? 0 : 150)).toLocaleString("en-IN")}
              </span>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full bg-[#0d4f3c] text-white py-3 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#083528] transition-colors shadow-md active:scale-[0.99]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={15} />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-[#6b6257] pt-1">
              <ShieldCheck size={14} className="text-[#0d4f3c]" />
              <span>Authentic Handloom Guarantee · 100% Secure Instant UPI & Card</span>
            </div>
          </div>
        )}
      </div>

      {/* High-Resolution Viewer for Cart Items */}
      {viewerProduct && (
        <LuxuryImageViewerModal
          isOpen={!!viewerProduct}
          onClose={() => setViewerProduct(null)}
          images={Array.isArray(viewerProduct.images) && viewerProduct.images.length > 0 ? viewerProduct.images : [viewerProduct.image]}
          title={viewerProduct.name}
          subtitle={viewerProduct.category}
          colorName={viewerProduct.color}
          price={viewerProduct.price}
        />
      )}
    </div>
  );
}
