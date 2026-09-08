import React, { useState, useEffect } from "react";
import { X, Sparkles, Plus, Image as ImageIcon, Check } from "lucide-react";
import { Product } from "../../types";
import { saveProduct } from "../../services/storeService";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSuccess: (product: Product) => void;
}

const SAMPLE_IMAGES = [
  "/uploads/hos-001-main-1788707076761-551.webp",
  "/uploads/hos-002-main-1788707076764-431.webp",
  "/uploads/hos-003-main-1788707076767-463.webp",
  "/uploads/hos-004-main-1788707076770-520.webp",
  "/uploads/hos-005-main-1788707076772-527.webp",
  "/uploads/hos-006-main-1788707076775-533.webp",
];

const STANDARD_CATEGORIES = [
  "Cotton Suits",
  "Satin Wear",
  "Silk Wear",
  "Chiffon & Organza",
  "Georgette Grace",
  "Velvet Luxe",
  "Handcrafted Couture",
  "Festive Heirloom",
];

export default function AddProductModal({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
}: AddProductModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cotton Suits");
  const [price, setPrice] = useState("₹2,999");
  const [originalPrice, setOriginalPrice] = useState("₹4,499");
  const [fabricType, setFabricType] = useState("Pure Chanderi Silk");
  const [color, setColor] = useState("Royal Emerald");
  const [colorHex, setColorHex] = useState("#0d4f3c");
  const [description, setDescription] = useState(
    "Handcrafted pure artisanal fabric with intricate zari border and bespoke heirloom finish."
  );
  const [image, setImage] = useState(SAMPLE_IMAGES[0]);
  const [hoverImage, setHoverImage] = useState(SAMPLE_IMAGES[1] || SAMPLE_IMAGES[0]);
  const [inStock, setInStock] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState("New Drop");

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setCategory(productToEdit.category || "Cotton Suits");
      setPrice(productToEdit.price || "₹2,999");
      setOriginalPrice(productToEdit.originalPrice || "₹4,499");
      setFabricType(productToEdit.fabricType || "Pure Chanderi Silk");
      setColor(productToEdit.color || "Royal Emerald");
      setColorHex(productToEdit.colorHex || "#0d4f3c");
      setDescription(productToEdit.description || "");
      setImage(productToEdit.image || SAMPLE_IMAGES[0]);
      setHoverImage(productToEdit.hoverImage || productToEdit.image || SAMPLE_IMAGES[0]);
      setInStock(productToEdit.inStock !== false);
      setSelectedBadge(productToEdit.badges?.[0] || "New Drop");
    } else {
      // Reset form
      setName("");
      setCategory("Cotton Suits");
      setPrice("₹2,999");
      setOriginalPrice("₹4,499");
      setFabricType("Pure Chanderi Silk");
      setColor("Royal Emerald");
      setColorHex("#0d4f3c");
      setDescription(
        "Handcrafted pure artisanal fabric with intricate zari border and bespoke heirloom finish."
      );
      setImage(SAMPLE_IMAGES[0]);
      setHoverImage(SAMPLE_IMAGES[1] || SAMPLE_IMAGES[0]);
      setInStock(true);
      setSelectedBadge("New Drop");
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Auto calculate savings percentage
  const calculateSavings = (p: string, orig: string): string => {
    const numP = parseInt(p.replace(/[^0-9]/g, ""), 10);
    const numOrig = parseInt(orig.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(numP) && !isNaN(numOrig) && numOrig > numP) {
      const pct = Math.round(((numOrig - numP) / numOrig) * 100);
      return `Save ${pct}%`;
    }
    return "Special Edition";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a product title or name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const prodId = productToEdit?.id || `hos-${Date.now()}`;
    const savings = calculateSavings(price, originalPrice);

    const productPayload: Product = {
      id: prodId,
      name: name.trim(),
      category: category.trim(),
      price: price.trim(),
      originalPrice: originalPrice.trim(),
      savings,
      fabricType: fabricType.trim(),
      color: color.trim(),
      colorHex: colorHex.trim(),
      description: description.trim(),
      image: image.trim(),
      hoverImage: hoverImage.trim() || image.trim(),
      images: [image.trim(), hoverImage.trim()].filter(Boolean),
      inStock,
      badges: selectedBadge ? [selectedBadge] : ["New Drop"],
      tags: productToEdit?.tags || [category.trim(), fabricType.trim(), selectedBadge].filter(Boolean),
      rating: productToEdit?.rating || "4.9",
      reviews: productToEdit?.reviews || "12",
      sizes: ["Unstitched Suit"],
      updatedAt: new Date().toISOString(),
      createdAt: productToEdit?.createdAt || new Date().toISOString(),
      colorVariants: [
        {
          id: `var-${prodId}-0`,
          colorName: color.trim(),
          colorHex: colorHex.trim(),
          price: price.trim(),
          originalPrice: originalPrice.trim(),
          savings,
          fabricType: fabricType.trim(),
          description: description.trim(),
          image: image.trim(),
          hoverImage: hoverImage.trim() || image.trim(),
          images: [image.trim(), hoverImage.trim()].filter(Boolean),
          inStock,
        },
      ],
    };

    try {
      await saveProduct(productPayload);
      onSuccess(productPayload);
      onClose();
    } catch (err: any) {
      console.error("Save product error:", err);
      setError(err?.message || "Failed to save product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="modal-add-product"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e5ddd3] overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-[#0d4f3c] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-snug">
                {productToEdit ? "Edit Boutique Suit Piece" : "Add New Boutique Suit Piece"}
              </h3>
              <p className="text-[11px] text-white/70">
                Syncs live to store catalog, database endpoints, and boutique collection
              </p>
            </div>
          </div>
          <button
            id="btn-close-product-modal"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1">
              Boutique Design & Title
            </h4>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Title / Name *
              </label>
              <input
                id="product-input-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Emerald Chanderi Silk Suit"
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
                <select
                  id="product-select-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0d4f3c]"
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fabric Type
                </label>
                <input
                  id="product-input-fabric"
                  type="text"
                  value={fabricType}
                  onChange={(e) => setFabricType(e.target.value)}
                  placeholder="e.g. Pure Chanderi Silk, Satin, Organza"
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>
            </div>
          </div>

          {/* Section: Pricing & Savings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1">
              Pricing & Value
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Selling Price *
                </label>
                <input
                  id="product-input-price"
                  type="text"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="₹2,999"
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg font-semibold text-[#0d4f3c] focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Original / Strikethrough Price
                </label>
                <input
                  id="product-input-orig-price"
                  type="text"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="₹4,499"
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg text-stone-500 focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Badge</label>
                <select
                  id="product-select-badge"
                  value={selectedBadge}
                  onChange={(e) => setSelectedBadge(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0d4f3c]"
                >
                  <option value="New Drop">New Drop</option>
                  <option value="Bestseller">Bestseller</option>
                  <option value="Limited Edition">Limited Edition</option>
                  <option value="Artisanal Handcraft">Artisanal Handcraft</option>
                  <option value="Festive Heirloom">Festive Heirloom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Color & Palette */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1">
              Color Edition & Swatch
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Color Shade Name
                </label>
                <input
                  id="product-input-color"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Royal Emerald, Dusty Rose, Champagne Gold"
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Color Swatch (Hex)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-stone-300 cursor-pointer p-0.5"
                  />
                  <input
                    id="product-input-hex"
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="flex-1 text-sm font-mono px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Imagery */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1">
              Imagery & Visuals
            </h4>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Main Image URL or Local Path
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="product-input-image"
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/uploads/hos-001-main-1788707076761-551.webp"
                  className="flex-1 text-sm px-3 py-2 border border-stone-300 rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                />
                {image && (
                  <img
                    src={image}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-md border border-stone-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>

            {/* Quick Sample Image Selector */}
            <div>
              <p className="text-[11px] text-stone-500 mb-1.5 flex items-center gap-1">
                <ImageIcon size={12} />
                <span>Or select from curated atelier assets:</span>
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {SAMPLE_IMAGES.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setImage(imgUrl);
                      if (SAMPLE_IMAGES[i + 1]) setHoverImage(SAMPLE_IMAGES[i + 1]);
                    }}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      image === imgUrl ? "border-[#0d4f3c] scale-105" : "border-stone-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Sample ${i}`} className="w-full h-full object-cover" />
                    {image === imgUrl && (
                      <div className="absolute inset-0 bg-[#0d4f3c]/40 flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Description & Stock */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1">
              Description & Availability
            </h4>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Atelier Description
              </label>
              <textarea
                id="product-input-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the fabric weave, borders, craftsmanship details..."
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div>
                <p className="text-xs font-bold text-stone-800">In Stock for Immediate Delivery</p>
                <p className="text-[11px] text-stone-500">
                  Allow customers to purchase directly or book an atelier trial
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="product-toggle-stock"
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d4f3c]"></div>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-add-product"
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#0d4f3c] hover:bg-[#09382b] text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Plus size={15} />
              <span>{submitting ? "Saving Product..." : productToEdit ? "Update Product" : "Save & Add Product"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
