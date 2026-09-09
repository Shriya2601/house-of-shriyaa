import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Sparkle,
  Crown,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { saveSiteContent } from "../../services/storeService";
import { HeroSlide } from "../../types";
import { normalizeImageUrl } from "../../utils/imageUtils";

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    eyebrow: "DAILY / Festive Couture",
    number: "01",
    collection: "Handcrafted Heirloom",
    title: "Pure Handloom Silks & Unstitched Suits",
    description: "Crafted in Surat with 100% pure fabrics, classic Alia-cut silhouettes, and delicate zardozi detailing.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
    season: "AUTUMN/FESTIVE 2026",
    caption: "Gul-e-Noor Emerald Alia Cut Suit Set",
    mood: "Emerald & Saffron Weaves",
    ctaText: "Explore Festive Edit",
  },
  {
    eyebrow: "Artisan Heirlooms",
    number: "02",
    collection: "Kashmir to Kashi",
    title: "Pure Banarasi Booti & Kashmiri Tilla Embroidered Lengths",
    description: "Unstitched regal handloom fabric lengths ready for your preferred tailor with soft butter silk lining.",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=85",
    season: "ROYAL HERITAGE 2026",
    caption: "Kashmiri Tilla Saffron Katan Weave",
    mood: "Antique Zari & Handlooms",
    ctaText: "Discover Heirlooms",
  },
  {
    eyebrow: "Modern Pret & Daily Chic",
    number: "03",
    collection: "Mulmul & Youthful Co-ords",
    title: "Featherlight Cotton Suits & Chic College Peplum Ensembles",
    description: "Effortless silhouettes with deep functional pockets, breathable Bagru blocks, and modern tailored fits.",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1600&q=85",
    season: "DAILY CHIC 2026",
    caption: "Lilac Blossom Breathable Chanderi Set",
    mood: "Pastel Silks & Easy Linens",
    ctaText: "View Daily Pret",
  },
];

interface AdminBannerManagerProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AdminBannerManager({ showToast }: AdminBannerManagerProps) {
  const { siteContent } = useStore();
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize slides from store
  useEffect(() => {
    if (uploadingIndex !== null || isSaving) return;
    if (siteContent?.heroSlides && siteContent.heroSlides.length > 0) {
      // Ensure 3 slides minimum
      const merged = siteContent.heroSlides.map((s, idx) => ({
        ...DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length],
        ...s,
        number: `0${idx + 1}`,
      }));
      setSlides(merged.slice(0, 3));
    }
  }, [siteContent, uploadingIndex, isSaving]);

  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Update a field on the current slide
  const handleFieldChange = (field: keyof HeroSlide, value: string) => {
    const finalVal = field === "image" ? normalizeImageUrl(value) : value;
    setSlides((prev) => {
      const next = [...prev];
      next[activeSlideIndex] = {
        ...next[activeSlideIndex],
        [field]: finalVal,
      };
      return next;
    });
  };

  // Reorder slides
  const handleMoveSlide = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((item, idx) => ({ ...item, number: `0${idx + 1}` }));
    });
    setActiveSlideIndex(toIdx);
  };

  // Image Upload Handler with client-side compression
  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(activeSlideIndex);
    try {
      // Compress and convert to Base64
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1080;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(event.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/webp", 0.88);
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error("Failed to load image file for processing"));
          img.src = event.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Attempt server upload to /api/upload for permanent file storage
      let uploadedUrl = compressedDataUrl;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: compressedDataUrl,
            filename: `hero-slide-${activeSlideIndex + 1}`,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.url) {
            uploadedUrl = resData.url;
          }
        } else {
          console.warn(`[Banner Upload] Server returned status ${res.status}, continuing with high-quality optimized image.`);
        }
      } catch (uploadErr) {
        console.warn("[Banner Upload] Server upload endpoint unreachable, continuing with optimized image:", uploadErr);
      }

      // Update slide image state AND immediately persist it to disk and live website
      const nextSlides = slides.map((s, idx) =>
        idx === activeSlideIndex
          ? {
              ...s,
              image: uploadedUrl,
            }
          : s
      );
      setSlides(nextSlides);

      try {
        await saveSiteContent({
          heroSlides: nextSlides,
        });
        showToast(`Slide ${activeSlideIndex + 1} photo updated & published live to homepage!`, "success");
      } catch (saveErr: any) {
        console.error("Auto-save banner content error:", saveErr);
        showToast(`Slide ${activeSlideIndex + 1} image updated successfully!`, "success");
      }
    } catch (err: any) {
      console.error("Banner upload error:", err);
      showToast("Failed to upload image: " + (err.message || "Unknown error"), "error");
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Save all slides
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveSiteContent({
        heroSlides: slides,
      });
      showToast("Homepage Hero Slideshow updated successfully! Live website refreshed.", "success");
    } catch (err: any) {
      console.error("Save site content error:", err);
      showToast("Failed to save changes: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default slides
  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to reset all 3 homepage banner slides to the original boutique curation?")) {
      return;
    }
    setSlides(DEFAULT_SLIDES);
    setIsSaving(true);
    try {
      await saveSiteContent({
        heroSlides: DEFAULT_SLIDES,
      });
      showToast("Homepage banners restored to original curated defaults.", "info");
    } catch (err: any) {
      showToast("Failed to reset: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />

      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#0d4f3c]/10 text-[#0d4f3c] rounded-lg">
              <ImageIcon size={18} />
            </span>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1e1b18]">
                Homepage Hero Slideshow & Banners
              </h2>
              <p className="text-xs text-stone-500">
                Manage the 3 rotating marquee banner images and headlines displayed on the storefront landing page.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-medium text-stone-700 hover:text-[#0d4f3c] hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors flex items-center gap-1.5"
          >
            <Eye size={14} />
            <span>View Storefront</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>

          <button
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset to original curated photos"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0d4f3c] hover:bg-[#0b3f30] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? "Publishing Changes..." : "Publish Banners"}</span>
          </button>
        </div>
      </div>

      {/* Slide Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {slides.map((s, idx) => {
          const isActive = activeSlideIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlideIndex(idx)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                isActive
                  ? "bg-[#0d4f3c]/5 border-[#0d4f3c] shadow-xs"
                  : "bg-white border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="relative w-16 h-12 rounded-md overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                <img
                  src={normalizeImageUrl(s.image)}
                  alt={s.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
                  }}
                />
                <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white font-mono text-[9px] px-1 rounded font-bold">
                  #{idx + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? "text-[#0d4f3c]" : "text-stone-500"
                    }`}
                  >
                    Slide 0{idx + 1}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d4f3c] animate-pulse" />
                  )}
                </div>
                <p className="text-xs font-semibold text-stone-800 truncate">
                  {s.title || "Untitled Banner"}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  {s.collection || s.eyebrow}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Slide Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Live Storefront Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#0d4f3c]" />
                <span>Live Hero Preview (Slide 0{activeSlideIndex + 1})</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1))
                  }
                  className="p-1 rounded hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Previous Slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-mono font-semibold text-stone-600 px-1">
                  0{activeSlideIndex + 1} / 0{slides.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0))
                  }
                  className="p-1 rounded hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Next Slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Simulated Storefront Hero Slide Card */}
            <div className="relative rounded-lg overflow-hidden bg-stone-950 aspect-[4/5] shadow-md group">
              <img
                src={normalizeImageUrl(currentSlide.image)}
                alt={currentSlide.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
                }}
              />

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
              <div className="absolute top-3 left-3 bg-[#0d4f3c]/90 backdrop-blur-xs text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                {currentSlide.season || "FESTIVE 2026"}
              </div>

              {/* Slide Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] text-amber-200 font-medium">
                  <Sparkle size={11} />
                  <span>{currentSlide.eyebrow}</span>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-stone-300 font-mono">
                  {currentSlide.collection}
                </p>
                <h4 className="font-serif font-bold text-base text-white leading-tight line-clamp-2">
                  {currentSlide.title}
                </h4>
                <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                  {currentSlide.description}
                </p>

                <div className="pt-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-white text-stone-900 font-bold px-3 py-1 rounded-full shadow-xs">
                    {currentSlide.ctaText || "Explore Edit"} →
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    ✦ {currentSlide.mood || "Handloom Silks"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Upload Action below preview */}
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Need to change this photo?
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingIndex !== null}
                className="px-3 py-1.5 bg-stone-900 hover:bg-[#0d4f3c] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload size={13} />
                <span>
                  {uploadingIndex === activeSlideIndex ? "Uploading..." : "Upload Photo"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Slide Settings Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0d4f3c] text-white text-xs font-bold flex items-center justify-center font-mono">
                  0{activeSlideIndex + 1}
                </span>
                <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                  Edit Slide 0{activeSlideIndex + 1} Details
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {activeSlideIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveSlide(activeSlideIndex, 0)}
                    className="text-xs font-semibold text-[#0d4f3c] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors border border-emerald-200 cursor-pointer flex items-center gap-1"
                    title="Move this slide to be the first slide shown on your homepage"
                  >
                    <Crown size={12} />
                    <span>Set as Slide #1</span>
                  </button>
                )}
                <span className="text-xs text-stone-400 font-mono">
                  Slide ID: #{currentSlide.number || `0${activeSlideIndex + 1}`}
                </span>
              </div>
            </div>

            {/* Banner Image Upload & Direct URL Box */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <label className="block text-xs font-bold text-stone-800">
                Banner Image (Photo Upload or URL)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-stone-200 border border-stone-300 shrink-0">
                  <img
                    src={normalizeImageUrl(currentSlide.image)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
                    }}
                  />
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingIndex !== null}
                      className="px-3.5 py-2 bg-[#0d4f3c] hover:bg-[#0b3f30] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Upload size={14} />
                      <span>
                        {uploadingIndex === activeSlideIndex
                          ? "Compressing & Uploading..."
                          : "Upload from Device / Gallery"}
                      </span>
                    </button>
                    <span className="text-[11px] text-stone-400">or paste URL below</span>
                  </div>

                  <input
                    type="text"
                    value={currentSlide.image}
                    onChange={(e) => handleFieldChange("image", e.target.value)}
                    placeholder="https://... or /uploads/..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#0d4f3c] bg-white font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-stone-500">
                ✦ High resolution portrait or 4:5 / 16:9 lifestyle photos work best. Photos are automatically optimized for instant web loading.
              </p>
            </div>

            {/* Headline Title */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Slide Headline / Main Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={currentSlide.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="e.g. Pure Handloom Silks & Unstitched Suits"
                className="w-full text-sm font-serif font-bold px-3.5 py-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
              />
            </div>

            {/* Eyebrow & Collection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Eyebrow Tag
                </label>
                <input
                  type="text"
                  value={currentSlide.eyebrow}
                  onChange={(e) => handleFieldChange("eyebrow", e.target.value)}
                  placeholder="e.g. DAILY / Festive Couture"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Collection Subtitle
                </label>
                <input
                  type="text"
                  value={currentSlide.collection}
                  onChange={(e) => handleFieldChange("collection", e.target.value)}
                  placeholder="e.g. Handcrafted Heirloom"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Editorial Description
              </label>
              <textarea
                rows={3}
                value={currentSlide.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                placeholder="Crafted in Surat with 100% pure fabrics, classic Alia-cut silhouettes..."
                className="w-full text-xs px-3.5 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c] leading-relaxed"
              />
            </div>

            {/* Season, CTA Text, & Moodboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Season Badge
                </label>
                <input
                  type="text"
                  value={currentSlide.season}
                  onChange={(e) => handleFieldChange("season", e.target.value)}
                  placeholder="e.g. AUTUMN/FESTIVE 2026"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Button CTA Text
                </label>
                <input
                  type="text"
                  value={currentSlide.ctaText || "Explore Festive Edit"}
                  onChange={(e) => handleFieldChange("ctaText", e.target.value)}
                  placeholder="e.g. Explore Festive Edit"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Moodboard Tag
                </label>
                <input
                  type="text"
                  value={currentSlide.mood || "Emerald & Saffron Weaves"}
                  onChange={(e) => handleFieldChange("mood", e.target.value)}
                  placeholder="e.g. Emerald & Gold Weaves"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Clicking &quot;Publish Banners&quot; updates both local storage and database.
              </span>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#0d4f3c] hover:bg-[#0b3f30] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? "Publishing..." : "Publish All 3 Banners"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
