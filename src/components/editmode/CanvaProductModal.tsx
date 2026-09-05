import React, { useState, useEffect } from "react";
import { useEditMode } from "./EditModeContext";
import { useStore } from "../../context/StoreContext";
import { X, SlidersHorizontal, Image as ImageIcon, Sparkles, Check, Plus, Upload } from "lucide-react";
import { Product } from "../../types";
import { optimizeImageFile, persistAssetToFirestore } from "../../services/imageUploadService";

export default function CanvaProductModal() {
  const { activeModal, setActiveModal, modalData, quickEditImage, saveChanges } = useEditMode();
  const { products, setProducts } = useStore();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [formProduct, setFormProduct] = useState<Partial<Product>>({});

  useEffect(() => {
    if (modalData && modalData.id) {
      setSelectedProductId(modalData.id);
      setFormProduct(modalData);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setFormProduct(products[0]);
    }
  }, [modalData, products]);

  if (activeModal !== "productModal") return null;

  const currentProduct = products.find((p) => p.id === selectedProductId) || formProduct;

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    const found = products.find((p) => p.id === id);
    if (found) setFormProduct(found);
  };

  const handleFieldChange = (field: keyof Product, value: any) => {
    setFormProduct((prev) => ({ ...prev, [field]: value }));

    // Apply live to the product catalog immediately
    setProducts((prev) =>
      prev.map((p) => (p.id === selectedProductId ? { ...p, [field]: value, updatedAt: new Date().toISOString() } : p))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121915] text-[#faf8f5] border border-[#d4af37]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0f0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#b88c29] flex items-center justify-center text-black shadow-md">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-amber-200 tracking-wide">
                Canva Product Card Editor
              </h2>
              <p className="text-xs text-white/60">
                Update prices, fabric types, titles, and photos with live preview
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product selector dropdown */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#0d1411] flex items-center gap-3 text-xs">
          <label className="text-white/70 font-medium">Select Suit to Edit:</label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="flex-1 bg-[#1a2520] text-amber-100 border border-white/15 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.price})
              </option>
            ))}
          </select>
        </div>

        {/* Body Fields */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-amber-200 font-medium mb-1">Product Title</label>
              <input
                type="text"
                value={formProduct.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Selling Price (e.g. ₹3,899)</label>
              <input
                type="text"
                value={formProduct.price || ""}
                onChange={(e) => handleFieldChange("price", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-bold"
              />
            </div>

            {/* Original Price */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Original Price (Strike-through)</label>
              <input
                type="text"
                value={formProduct.originalPrice || ""}
                onChange={(e) => handleFieldChange("originalPrice", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Savings Badge */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Savings Pill (e.g. Save 29%)</label>
              <input
                type="text"
                value={formProduct.savings || ""}
                onChange={(e) => handleFieldChange("savings", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Fabric Type */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Fabric Type & Loom</label>
              <input
                type="text"
                value={formProduct.fabricType || ""}
                onChange={(e) => handleFieldChange("fabricType", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Color / Tone</label>
              <input
                type="text"
                value={formProduct.color || ""}
                onChange={(e) => handleFieldChange("color", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Collection Category</label>
              <select
                value={formProduct.category || "Party Wear"}
                onChange={(e) => handleFieldChange("category", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Cotton Suits">Cotton Suits</option>
                <option value="Daily Wear Suits">Daily Wear Suits</option>
                <option value="Co-ord Sets">Co-ord Sets</option>
                <option value="Party Wear">Party Wear</option>
                <option value="Festive Wear">Festive Wear</option>
                <option value="Seasonal Drop">Seasonal Drop</option>
              </select>
            </div>

            {/* Product Photo from Device */}
            <div className="sm:col-span-2">
              <label className="block text-amber-200 font-medium mb-1">Product Photo (Direct Device Upload)</label>
              <div className="flex items-center gap-3 bg-black/40 border border-white/15 rounded-lg p-2.5">
                {formProduct.image && (
                  <img
                    src={formProduct.image}
                    alt="Product"
                    className="w-14 h-14 object-cover rounded-md border border-white/20 shrink-0"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0d4f3c] text-amber-200 border border-amber-400/40 text-xs font-semibold rounded-lg cursor-pointer hover:bg-[#145d48] transition-colors">
                    <Upload size={13} />
                    <span>Upload Product Photo From Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const optimized = await optimizeImageFile(file);
                          await persistAssetToFirestore(optimized, selectedProductId);
                          handleFieldChange("image", optimized.url);
                          if (formProduct.images && formProduct.images.length > 0) {
                            const newImgs = [...formProduct.images];
                            newImgs[0] = optimized.url;
                            handleFieldChange("images", newImgs as any);
                          }
                        } catch (err) {
                          console.error("Product photo upload error:", err);
                          alert("Failed to upload photo from device.");
                        }
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-white/50">
                    High-resolution photo is optimized and saved securely to the catalog.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-amber-200 font-medium mb-1">Description</label>
              <textarea
                rows={2}
                value={formProduct.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#0a0f0d] flex items-center justify-between text-xs">
          <span className="text-white/60">
            ✦ Product card updates are live on the page
          </span>
          <button
            onClick={() => {
              saveChanges();
              setActiveModal(null);
            }}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-black font-semibold hover:brightness-110 shadow-md"
          >
            Done & Save
          </button>
        </div>

      </div>
    </div>
  );
}
