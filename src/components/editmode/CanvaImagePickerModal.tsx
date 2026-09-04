import React, { useState } from "react";
import { useEditMode } from "./EditModeContext";
import { X, Image as ImageIcon, Upload, Check, Link as LinkIcon, Sparkles } from "lucide-react";

interface StockImage {
  title: string;
  category: string;
  url: string;
}

const CURATED_STOCK_PHOTOS: StockImage[] = [
  {
    title: "Pure Banarasi Katan Silk with Zari",
    category: "Silks & Heirloom",
    url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
  },
  {
    title: "Royal Emerald Handloom Alia Cut",
    category: "Party Wear",
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Surat Artisan Golden Brocade & Zardozi",
    category: "Silks & Heirloom",
    url: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Airy Chanderi Hand-block Cotton Suit",
    category: "Cotton & Daily",
    url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Breathable Mulmul Lavender Co-ord Ensemble",
    category: "Cotton & Daily",
    url: "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Youthful Mustard Silk College Kurti Set",
    category: "Cotton & Daily",
    url: "https://images.unsplash.com/photo-1583391733975-27a928923a1a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Luxury Textile Weft & Handloom Threads",
    category: "Atelier Details",
    url: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Bespoke Royal Zari Embroidered Neckline",
    category: "Atelier Details",
    url: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?auto=format&fit=crop&w=1200&q=85",
  },
];

export default function CanvaImagePickerModal() {
  const {
    activeModal,
    setActiveModal,
    modalData,
    updateCustomOverride,
    updateContentField,
    saveChanges,
  } = useEditMode();

  const [activeTab, setActiveTab] = useState<"presets" | "url" | "upload">("presets");
  const [customUrl, setCustomUrl] = useState(modalData?.currentUrl || "");
  const [selectedCategory, setSelectedCategory] = useState("All");

  if (activeModal !== "imagePicker") return null;

  const targetId = modalData?.targetId;
  const label = modalData?.label || "Image";

  const handleApplyImage = (url: string) => {
    if (!url) return;

    if (modalData?.fieldPath) {
      updateContentField(modalData.fieldPath, url, `Changed image for ${label}`);
    } else if (targetId) {
      updateCustomOverride(targetId, { src: url }, `Updated photo for ${label}`);
    }

    saveChanges();
    setActiveModal(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleApplyImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const categories = ["All", "Silks & Heirloom", "Cotton & Daily", "Party Wear", "Atelier Details"];

  const filteredStock =
    selectedCategory === "All"
      ? CURATED_STOCK_PHOTOS
      : CURATED_STOCK_PHOTOS.filter((img) => img.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121915] text-[#faf8f5] border border-[#d4af37]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0f0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7D2AE8] to-[#0d4f3c] flex items-center justify-center text-white shadow-md">
              <ImageIcon size={16} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-amber-200 tracking-wide">
                Canva Photo Selector: {label}
              </h2>
              <p className="text-xs text-white/60">
                Choose high-resolution Indian couture photography or upload your own
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

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#0d1411] px-6 text-xs">
          <button
            onClick={() => setActiveTab("presets")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "presets"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <Sparkles size={14} />
            Curated Couture Photos
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "url"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <LinkIcon size={14} />
            Paste Image URL
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <Upload size={14} />
            Upload from Device
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          
          {/* TAB 1: CURATED PHOTOS */}
          {activeTab === "presets" && (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === c
                        ? "bg-amber-400 text-black font-semibold"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filteredStock.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => handleApplyImage(img.url)}
                    className="group relative rounded-xl overflow-hidden border border-white/10 aspect-3/4 cursor-pointer hover:border-amber-400 transition-all hover:scale-[1.02] shadow-md"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                      <span className="text-[0.7rem] text-white font-medium line-clamp-2">
                        {img.title}
                      </span>
                      <span className="text-[0.62rem] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                        <Check size={11} /> Select Photo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: URL INPUT */}
          {activeTab === "url" && (
            <div className="space-y-4 max-w-lg mx-auto py-6">
              <div>
                <label className="block text-xs font-medium text-amber-200 mb-1.5">
                  Direct Image Web Address (Unsplash, Cloudinary, etc.):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleApplyImage(customUrl)}
                    disabled={!customUrl}
                    className="px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-black font-semibold rounded-lg hover:brightness-110 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {customUrl && (
                <div className="border border-white/10 rounded-xl p-3 bg-white/5">
                  <span className="text-[0.7rem] text-white/60 block mb-2">Live Preview:</span>
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                    <img
                      src={customUrl}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPLOAD */}
          {activeTab === "upload" && (
            <div className="space-y-4 max-w-lg mx-auto py-6 text-center">
              <label className="border-2 border-dashed border-white/20 hover:border-amber-400/60 rounded-2xl p-8 block cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                <Upload size={32} className="mx-auto text-amber-300 mb-3" />
                <strong className="text-sm text-white block mb-1">
                  Click to browse image from your computer
                </strong>
                <span className="text-xs text-white/50 block">
                  Supports JPG, PNG, WEBP files
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
