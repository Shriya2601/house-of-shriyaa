import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Plus,
  Image as ImageIcon,
  Check,
  Upload,
  Camera,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Layers,
  AlertCircle,
} from "lucide-react";
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Client-side image compression: optimizes raw camera/phone photos to ~60-120KB JPEG data URL
async function compressImageFile(
  file: File,
  maxWidth = 1400,
  quality = 0.85
): Promise<{ dataUrl: string; sizeText: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose a valid image file (JPG, PNG, or WebP)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read photo from your device."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to process image format."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            const raw = e.target?.result as string;
            resolve({ dataUrl: raw, sizeText: formatFileSize(file.size) });
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", quality);
          const approxBytes = Math.round((compressed.length * 3) / 4);
          resolve({ dataUrl: compressed, sizeText: formatFileSize(approxBytes) });
        } catch {
          const raw = e.target?.result as string;
          resolve({ dataUrl: raw, sizeText: formatFileSize(file.size) });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
    "Handcrafted pure artisanal unstitched fabric with intricate zari border and bespoke heirloom finish."
  );

  // Image Upload State
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [image, setImage] = useState("");
  const [hoverImage, setHoverImage] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [mainImageDetails, setMainImageDetails] = useState<{ name: string; size: string } | null>(null);
  const [hoverImageDetails, setHoverImageDetails] = useState<{ name: string; size: string } | null>(null);
  const [isProcessingMain, setIsProcessingMain] = useState(false);
  const [isProcessingHover, setIsProcessingHover] = useState(false);
  const [isProcessingExtra, setIsProcessingExtra] = useState(false);
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const [isDragOverHover, setIsDragOverHover] = useState(false);

  // File Input References
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const hoverFileInputRef = useRef<HTMLInputElement>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);

  const [inStock, setInStock] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState("New Drop");

  // Helper to immediately purge removed image from server disk & prevent caching
  const purgeOldImage = async (url: string) => {
    if (!url || typeof url !== "string") return;
    try {
      if (url.startsWith("/uploads/")) {
        await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
          method: "DELETE",
        });
      }
    } catch {}
  };

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
      setImage(productToEdit.image || "");
      setHoverImage(productToEdit.hoverImage || productToEdit.image || "");
      const allImgs = Array.isArray(productToEdit.images) ? productToEdit.images.filter(Boolean) : [];
      const extras = allImgs.filter(
        (u) => u !== productToEdit.image && u !== productToEdit.hoverImage
      );
      setExtraImages(extras);
      setInStock(productToEdit.inStock !== false);
      setSelectedBadge(productToEdit.badges?.[0] || "New Drop");
      setMainImageDetails(productToEdit.image ? { name: "Current Product Photo", size: "Ready" } : null);
      setHoverImageDetails(productToEdit.hoverImage ? { name: "Current Hover Photo", size: "Ready" } : null);
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
        "Handcrafted pure artisanal unstitched fabric with intricate zari border and bespoke heirloom finish."
      );
      setImage("");
      setHoverImage("");
      setExtraImages([]);
      setMainImageDetails(null);
      setHoverImageDetails(null);
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

  // Handle Main Image File Select
  const handleMainFileChange = async (file: File) => {
    setIsProcessingMain(true);
    setError(null);
    try {
      const { dataUrl, sizeText } = await compressImageFile(file);
      let finalUrl = dataUrl;
      // Immediately upload file to server to obtain clean web URL /uploads/...
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.url) {
            finalUrl = uploadJson.url;
          }
        }
      } catch (uploadErr) {
        console.warn("Direct upload fallback to dataUrl", uploadErr);
      }

      setImage(finalUrl);
      setMainImageDetails({ name: file.name, size: sizeText });
      // If hover image isn't set yet, default it to main image
      if (!hoverImage) {
        setHoverImage(finalUrl);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to process photo from device.");
    } finally {
      setIsProcessingMain(false);
    }
  };

  // Handle Hover Image File Select
  const handleHoverFileChange = async (file: File) => {
    setIsProcessingHover(true);
    setError(null);
    try {
      const { dataUrl, sizeText } = await compressImageFile(file);
      let finalUrl = dataUrl;
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.url) {
            finalUrl = uploadJson.url;
          }
        }
      } catch (uploadErr) {
        console.warn("Direct hover upload fallback to dataUrl", uploadErr);
      }

      setHoverImage(finalUrl);
      setHoverImageDetails({ name: file.name, size: sizeText });
    } catch (err: any) {
      setError(err?.message || "Failed to process secondary photo.");
    } finally {
      setIsProcessingHover(false);
    }
  };

  // Handle Additional Gallery Image File Select
  const handleExtraFileChange = async (file: File) => {
    setIsProcessingExtra(true);
    setError(null);
    try {
      const { dataUrl } = await compressImageFile(file);
      let finalUrl = dataUrl;
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.url) {
            finalUrl = uploadJson.url;
          }
        }
      } catch (uploadErr) {
        console.warn("Gallery upload fallback to dataUrl", uploadErr);
      }

      setExtraImages((prev) => [...prev, finalUrl]);
    } catch (err: any) {
      setError(err?.message || "Failed to upload gallery photo.");
    } finally {
      setIsProcessingExtra(false);
    }
  };

  const handleRemoveExtraImage = (indexToRemove: number) => {
    const targetUrl = extraImages[indexToRemove];
    if (targetUrl) purgeOldImage(targetUrl);
    setExtraImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a product title or name.");
      return;
    }

    if (!image.trim()) {
      setError("Please upload at least one photo of the suit from your device or choose an image.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const prodId = productToEdit?.id || `hos-${Date.now()}`;
    const savings = calculateSavings(price, originalPrice);

    // If images are still raw data URLs, attempt saving to /api/upload as well
    let finalMainImg = image.trim();
    if (finalMainImg.startsWith("data:")) {
      try {
        const upRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: finalMainImg, filename: `main-${prodId}` }),
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) finalMainImg = upJson.url;
        }
      } catch {}
    }

    let finalHoverImage = hoverImage.trim() || finalMainImg;
    if (finalHoverImage.startsWith("data:")) {
      try {
        const upRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: finalHoverImage, filename: `hover-${prodId}` }),
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) finalHoverImage = upJson.url;
        }
      } catch {}
    }

    const finalImages = [
      finalMainImg,
      finalHoverImage && finalHoverImage !== finalMainImg ? finalHoverImage : null,
      ...extraImages.filter((u) => u && u !== finalMainImg && u !== finalHoverImage),
    ].filter(Boolean) as string[];

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
      image: finalMainImg,
      hoverImage: finalHoverImage,
      images: finalImages,
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
          image: finalMainImg,
          hoverImage: finalHoverImage,
          images: finalImages,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-hidden"
    >
      <div className="bg-white w-full h-[94vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#e5ddd3] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header (Sticky) */}
        <div className="shrink-0 bg-[#0d4f3c] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg leading-snug">
                {productToEdit ? "Edit Boutique Suit Piece" : "Add New Boutique Suit Piece"}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/70">
                Direct device photo upload • Auto-optimized • Live updates on site
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
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <div>
                <span className="font-bold">Error: </span>
                {error}
              </div>
            </div>
          )}

          {/* Section: Direct Image Upload (Priority Section) */}
          <div className="space-y-3 bg-[#faf8f5] p-4 rounded-xl border border-[#ebe2d8]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d4f3c] flex items-center gap-1.5">
                  <Camera size={14} className="text-[#0d4f3c]" />
                  <span>Product Photos (Upload from Device) *</span>
                </h4>
                <p className="text-[11px] text-stone-500">
                  Select photos directly from your phone gallery or computer. No URL link required!
                </p>
              </div>

              {/* Toggle upload mode */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    uploadMode === "file"
                      ? "bg-[#0d4f3c] text-white"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Device Upload
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    uploadMode === "url"
                      ? "bg-[#0d4f3c] text-white"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Or Image URL
                </button>
              </div>
            </div>

            {uploadMode === "file" ? (
              <div className="space-y-4 pt-1">
                {/* 1. Primary Photo Dropzone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>1. Main Suit Photo *</span>
                    {image && (
                      <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <Check size={12} />
                        <span>Ready & Optimized</span>
                      </span>
                    )}
                  </label>

                  {/* Hidden Main File Input */}
                  <input
                    ref={mainFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMainFileChange(f);
                    }}
                  />

                  {image ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        <img src={image} alt="Main Suit" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {mainImageDetails?.name || "Suit Primary Photo"}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {mainImageDetails?.size ? `Size: ${mainImageDetails.size}` : "Loaded from device"}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          ✓ Shown on boutique storefront and home grid
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => mainFileInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={11} />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (image) purgeOldImage(image);
                            setImage("");
                            setMainImageDetails(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOverMain(true);
                      }}
                      onDragLeave={() => setIsDragOverMain(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOverMain(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleMainFileChange(f);
                      }}
                      onClick={() => mainFileInputRef.current?.click()}
                      className={`p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                        isDragOverMain
                          ? "border-[#0d4f3c] bg-[#0d4f3c]/10 scale-[1.01]"
                          : "border-stone-300 bg-white hover:border-[#0d4f3c] hover:bg-[#faf8f5]"
                      }`}
                    >
                      {isProcessingMain ? (
                        <div className="py-2 flex flex-col items-center gap-2 text-stone-600">
                          <RefreshCw size={20} className="animate-spin text-[#0d4f3c]" />
                          <p className="text-xs font-medium">Optimizing photo for fast browsing...</p>
                        </div>
                      ) : (
                        <div className="py-1 flex flex-col items-center gap-1.5">
                          <div className="w-10 h-10 rounded-full bg-[#0d4f3c]/10 text-[#0d4f3c] flex items-center justify-center mb-1">
                            <Upload size={18} />
                          </div>
                          <p className="text-xs font-bold text-stone-800">
                            Click to upload or drag & drop Main Suit photo
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Phone photos, camera shots, JPG, PNG, WebP (auto-optimized)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Secondary / Hover / Close-Up Photo (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>2. Hover / Close-Up Photo (Optional)</span>
                    <span className="text-[11px] text-stone-400 font-normal">
                      Shows on hover or in customer gallery
                    </span>
                  </label>

                  {/* Hidden Hover File Input */}
                  <input
                    ref={hoverFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleHoverFileChange(f);
                    }}
                  />

                  {hoverImage && hoverImage !== image ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        <img src={hoverImage} alt="Hover Detail" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {hoverImageDetails?.name || "Secondary Angle / Embroidery Detail"}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {hoverImageDetails?.size ? `Size: ${hoverImageDetails.size}` : "Ready"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => hoverFileInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={11} />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (hoverImage && hoverImage !== image) purgeOldImage(hoverImage);
                            setHoverImage("");
                            setHoverImageDetails(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOverHover(true);
                      }}
                      onDragLeave={() => setIsDragOverHover(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOverHover(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleHoverFileChange(f);
                      }}
                      onClick={() => hoverFileInputRef.current?.click()}
                      className={`p-3.5 border border-dashed rounded-xl text-center cursor-pointer transition-all ${
                        isDragOverHover
                          ? "border-[#0d4f3c] bg-[#0d4f3c]/5"
                          : "border-stone-300 bg-white hover:border-[#0d4f3c] hover:bg-[#faf8f5]"
                      }`}
                    >
                      {isProcessingHover ? (
                        <div className="py-1 flex items-center justify-center gap-2 text-stone-600 text-xs">
                          <RefreshCw size={14} className="animate-spin text-[#0d4f3c]" />
                          <span>Optimizing secondary photo...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-stone-600 text-xs">
                          <Plus size={14} className="text-[#0d4f3c]" />
                          <span>Click to upload optional hover/embroidery detail photo</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Additional Gallery Photos */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>3. Additional Gallery Photos (Optional)</span>
                    <span className="text-[11px] text-stone-400 font-normal">
                      {extraImages.length} additional {extraImages.length === 1 ? "photo" : "photos"}
                    </span>
                  </label>

                  <input
                    ref={extraFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleExtraFileChange(f);
                      e.target.value = "";
                    }}
                  />

                  {extraImages.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mb-2.5">
                      {extraImages.map((extraImg, idx) => (
                        <div
                          key={idx}
                          className="relative group w-16 h-20 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs"
                        >
                          <img src={extraImg} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => extraFileInputRef.current?.click()}
                    disabled={isProcessingExtra}
                    className="w-full py-2.5 px-3 border border-dashed border-stone-300 hover:border-[#0d4f3c] hover:bg-[#faf8f5] rounded-xl text-xs text-stone-600 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isProcessingExtra ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-[#0d4f3c]" />
                        <span>Optimizing & uploading photo...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} className="text-[#0d4f3c]" />
                        <span>Add Another Gallery Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* URL Mode */
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Main Image URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="product-input-image"
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="https://... or /uploads/suit.jpg"
                      className="flex-1 text-sm px-3 py-2 border border-stone-300 rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                    {image && (
                      <img
                        src={image}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-md border border-stone-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Hover Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={hoverImage}
                    onChange={(e) => setHoverImage(e.target.value)}
                    placeholder="https://... (falls back to main image if empty)"
                    className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                  />
                </div>
              </div>
            )}

            {/* Quick Sample Selector */}
            <div className="pt-2 border-t border-[#ebe2d8]">
              <p className="text-[11px] text-stone-500 mb-1.5 flex items-center gap-1">
                <ImageIcon size={12} />
                <span>Or pick from House of Shriya curated atelier photography:</span>
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {SAMPLE_IMAGES.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setImage(imgUrl);
                      if (SAMPLE_IMAGES[i + 1]) setHoverImage(SAMPLE_IMAGES[i + 1]);
                      setMainImageDetails({ name: `Atelier Preset 0${i + 1}`, size: "Verified" });
                    }}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      image === imgUrl
                        ? "border-[#0d4f3c] scale-105 shadow-xs"
                        : "border-stone-200 opacity-70 hover:opacity-100"
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
          </div>

          {/* Modal Footer (Sticky) */}
          <div className="shrink-0 bg-[#faf8f5] border-t border-[#e5ddd3] px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-add-product"
              type="submit"
              disabled={submitting || isProcessingMain || isProcessingHover}
              className="px-4 sm:px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#0d4f3c] hover:bg-[#09382b] text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Plus size={15} />
              <span>
                {submitting
                  ? "Saving to Boutique..."
                  : productToEdit
                  ? "Update Product"
                  : "Save & Add Product"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
