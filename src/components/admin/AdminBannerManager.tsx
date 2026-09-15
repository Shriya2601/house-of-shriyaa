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
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { saveSiteContent } from "../../services/storeService";
import { HeroSlide } from "../../types";
import { normalizeImageUrl } from "../../utils/imageUtils";

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    eyebrow: "NEW ARRIVAL / Contemporary Pret",
    number: "01",
    collection: "Festive Pret & Luxury Coordinates",
    title: "Sage & Turquoise Handcrafted Printed Kurti Set",
    description:
      "Handcrafted pure cotton-silk designer kurti tunic with traditional geometric & floral motifs, embroidered contrast placket, and effortless artisanal elegance.",
    image: "/uploads/hero-slide-1-turq.jpg",
    season: "SUMMER/FESTIVE 2026",
    caption: "Bespoke Printed Kurti with Embroidered Placket",
    mood: "Turquoise, Sage & Terracotta",
    ctaText: "Explore Collection",
    ctaTarget: "catalog-section",
  },
  {
    eyebrow: "Timeless Indian elegance",
    number: "02",
    collection: "The Festive Edit",
    title: "Grace, weave in Every Detail",
    description:
      "Elegant mint-green embroidered salwar suit paired with a soft peach striped dupatta featuring delicate scalloped detailing. A graceful choice for festive occasions, family gatherings, and elegant everyday wear",
    image:
      "https://plain-apac-prod-public.komododecks.com/202609/05/eA9kgNNZCuEDbWDBS8JI/image.jpg",
    season: "ROYAL HERITAGE 2026",
    caption: "Pastels • Delicate Embroidery • Effortless Grace",
    mood: "Antique Zari & Handlooms",
    ctaText: "Discover Unstitched",
    ctaTarget: "catalog-section",
  },
  {
    eyebrow: "Daily Chic",
    number: "03",
    collection:
      "Wrap yourself in the soft elegance of muted pistachio tones and hand-painted watercolor florals, finished with",
    title: "Grace in Every Print",
    description:
      "PURE MUL CHANDERI JACOARD WITH HANDWORK WITH ORGANZA EMBROIDERY FOR SLEEVES AND CONTRAST PIPING WITH LACE ON DAMAN.",
    image:
      "https://plain-apac-prod-public.komododecks.com/202609/05/4UmFSGtcoZdZF37bKc3R/image.jpg",
    season: "DAILY CHIC 2026",
    caption: "Printed Organza Dupatta Set in Sage & Pastel Rose",
    mood: "Pastel Silks & Easy Linens",
    ctaText: "Shop Daily Chic",
    ctaTarget: "catalog-section",
  },
];

interface AdminBannerManagerProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AdminBannerManager({ showToast }: AdminBannerManagerProps) {
  const { siteContent, setSiteContent } = useStore();
  const [slides, setSlides] = useState<HeroSlide[]>(() => {
    if (siteContent?.heroSlides && siteContent.heroSlides.length > 0) {
      return siteContent.heroSlides.map((s, idx) => ({
        ...DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length],
        ...s,
        number: s.number || `0${idx + 1}`,
      }));
    }
    return DEFAULT_SLIDES;
  });
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronous ref to prevent stale closures during rapid typing and uploads
  const slidesRef = useRef<HeroSlide[]>(slides);
  slidesRef.current = slides;

  // Auto-save debounce timer
  const autoSaveTimerRef = useRef<any>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Cleanup pending auto-saves on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Initialize slides from store only when user has not made unsaved modifications
  useEffect(() => {
    if (isDirtyRef.current || uploadingIndex !== null || isSaving) return;
    if (siteContent?.heroSlides && siteContent.heroSlides.length > 0) {
      const cleanSlides = siteContent.heroSlides.map((s, idx) => ({
        ...DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length],
        ...s,
        number: s.number || `0${idx + 1}`,
      }));
      setSlides((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(cleanSlides)) {
          return cleanSlides;
        }
        return prev;
      });
    }
  }, [siteContent, uploadingIndex, isSaving]);

  // Listen to cross-device and live sync content events
  useEffect(() => {
    const handleLiveSync = (e: any) => {
      if (isDirtyRef.current || uploadingIndex !== null || isSaving) return;
      const updatedContent = e.detail;
      if (updatedContent?.heroSlides && Array.isArray(updatedContent.heroSlides) && updatedContent.heroSlides.length > 0) {
        const cleanSlides = updatedContent.heroSlides.map((s: any, idx: number) => ({
          ...DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length],
          ...s,
          number: s.number || `0${idx + 1}`,
        }));
        setSlides((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(cleanSlides)) {
            return cleanSlides;
          }
          return prev;
        });
      }
    };

    window.addEventListener("hos-content-updated", handleLiveSync);
    return () => window.removeEventListener("hos-content-updated", handleLiveSync);
  }, [uploadingIndex, isSaving]);

  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Safely switch active slide, flushing any pending text auto-save first
  const handleSelectSlide = (targetIdx: number) => {
    if (targetIdx === activeSlideIndex) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      saveSiteContent({ heroSlides: slidesRef.current }).catch(() => {});
      isDirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveStatus("saved");
    }
    setActiveSlideIndex(targetIdx);
  };

  // Update a field on the current slide with 0ms local preview & debounced auto-save to cloud
  const handleFieldChange = (field: keyof HeroSlide, value: string) => {
    setIsDirty(true);
    isDirtyRef.current = true;
    setAutoSaveStatus("unsaved");

    // Compute next slides synchronously from ref
    const targetIdx = activeSlideIndex;
    const nextSlides = slidesRef.current.map((s, idx) =>
      idx === targetIdx
        ? {
            ...s,
            [field]: value,
          }
        : s
    );

    // Immediately update local state and ref
    setSlides(nextSlides);
    slidesRef.current = nextSlides;

    // Immediately update in-memory store so any open storefront view refreshes with 0ms delay
    setSiteContent((prev) => ({
      ...prev,
      heroSlides: nextSlides,
    }));

    // Debounced auto-save to disk, Firestore & SSE broadcast
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        const saved = await saveSiteContent({
          heroSlides: slidesRef.current,
        });
        setSiteContent(saved);
        isDirtyRef.current = false;
        setIsDirty(false);
        setAutoSaveStatus("saved");
      } catch (err) {
        console.warn("Auto-save banner error:", err);
      }
    }, 750);
  };

  // Add a new slide
  const handleAddSlide = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const newIdx = slidesRef.current.length;
    const newSlide: HeroSlide = {
      eyebrow: "New Collection",
      number: `0${newIdx + 1}`,
      collection: "Heirloom Edition",
      title: "Handcrafted Luxury Ensemble",
      description: "Handcrafted pure fabric unstitched ensemble tailored for royal celebrations.",
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
      season: "FESTIVE 2026",
      caption: "Bespoke Indian Couture Ensemble",
      mood: "Artisanal Weaves & Silks",
      ctaText: "Explore Collection",
      ctaTarget: "catalog-section",
    };
    const nextSlides = [...slidesRef.current, newSlide];
    setSlides(nextSlides);
    slidesRef.current = nextSlides;
    setActiveSlideIndex(newIdx);
    setSiteContent((prev) => ({ ...prev, heroSlides: nextSlides }));
    try {
      await saveSiteContent({ heroSlides: nextSlides });
      isDirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveStatus("saved");
      showToast(`Added Slide 0${newIdx + 1} and published live!`, "success");
    } catch {
      showToast(`Added Slide 0${newIdx + 1}.`, "info");
    }
  };

  // Remove a slide
  const handleDeleteSlide = async (idxToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slidesRef.current.length <= 1) {
      showToast("Cannot delete the only remaining slide.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Slide 0${idxToDelete + 1}?`)) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const nextSlides = slidesRef.current
      .filter((_, idx) => idx !== idxToDelete)
      .map((item, idx) => ({ ...item, number: `0${idx + 1}` }));

    setSlides(nextSlides);
    slidesRef.current = nextSlides;
    if (activeSlideIndex >= idxToDelete && activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    }
    setSiteContent((prev) => ({ ...prev, heroSlides: nextSlides }));
    try {
      await saveSiteContent({ heroSlides: nextSlides });
      isDirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveStatus("saved");
      showToast(`Deleted Slide 0${idxToDelete + 1} and updated live!`, "success");
    } catch {
      showToast(`Deleted Slide 0${idxToDelete + 1}.`, "info");
    }
  };

  // Reorder slides
  const handleMoveSlide = async (fromIdx: number, toIdx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (toIdx < 0 || toIdx >= slidesRef.current.length) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const next = [...slidesRef.current];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const nextSlides = next.map((item, idx) => ({ ...item, number: `0${idx + 1}` }));

    setSlides(nextSlides);
    slidesRef.current = nextSlides;
    setActiveSlideIndex(toIdx);
    setSiteContent((prev) => ({ ...prev, heroSlides: nextSlides }));
    try {
      await saveSiteContent({ heroSlides: nextSlides });
      isDirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveStatus("saved");
      showToast(`Reordered slides and published live!`, "success");
    } catch {}
  };

  // Core Image Compression and Upload Processor
  const processAndUploadFile = async (file: File) => {
    const isImage =
      (file.type && file.type.startsWith("image/")) ||
      /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file.name);

    if (!isImage) {
      showToast("Please upload a valid image file (JPEG, PNG, WebP, AVIF).", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const targetIdx = activeSlideIndex;
    setUploadingIndex(targetIdx);
    try {
      // Compress and convert to Base64 (max 1600px, high quality JPEG for universal compatibility)
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              const MAX_DIM = 1600;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_DIM) {
                  height = Math.round((height * MAX_DIM) / width);
                  width = MAX_DIM;
                }
              } else {
                if (height > MAX_DIM) {
                  width = Math.round((width * MAX_DIM) / height);
                  height = MAX_DIM;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(event.target?.result as string);
                return;
              }
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, width, height);

              // Use image/jpeg with 0.86 quality for reliable multi-platform compression
              const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
              resolve(dataUrl);
            } catch (canvasErr) {
              // Fallback to original dataUrl if canvas fails
              resolve(event.target?.result as string);
            }
          };
          img.onerror = () => {
            // Fallback directly to file reader output
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Unable to decode the selected photo file."));
            }
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Instantly show local photo with 0ms delay on admin screen
      const currentList = slidesRef.current.length > 0 ? slidesRef.current : slides;
      const immediateSlides = currentList.map((s, idx) =>
        idx === targetIdx
          ? {
              ...s,
              image: compressedDataUrl,
            }
          : s
      );
      setSlides(immediateSlides);
      slidesRef.current = immediateSlides;

      // Attempt server upload to /api/upload for permanent file storage
      let uploadedUrl = compressedDataUrl;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: compressedDataUrl,
            filename: `hero-slide-${targetIdx + 1}`,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.url) {
            uploadedUrl = resData.url;
          }
        } else {
          console.warn(`[Banner Upload] Server returned status ${res.status}, continuing with optimized photo.`);
        }
      } catch (uploadErr) {
        console.warn("[Banner Upload] Server upload endpoint notice:", uploadErr);
      }

      // Update slide image state synchronously and immediately persist to disk & live website
      const nextSlides = (slidesRef.current.length > 0 ? slidesRef.current : immediateSlides).map((s, idx) =>
        idx === targetIdx
          ? {
              ...s,
              image: uploadedUrl,
            }
          : s
      );

      // Immediately update local state, ref, and StoreContext
      setSlides(nextSlides);
      slidesRef.current = nextSlides;
      setSiteContent((prev) => ({
        ...prev,
        heroSlides: nextSlides,
      }));

      // Cancel any pending debounced auto-save because we are saving directly right now
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      try {
        setAutoSaveStatus("saving");
        const saved = await saveSiteContent({
          heroSlides: nextSlides,
        });
        setSiteContent(saved);
        isDirtyRef.current = false;
        setIsDirty(false);
        setAutoSaveStatus("saved");
        showToast(`Slide 0${targetIdx + 1} photo uploaded & published live to homepage!`, "success");
      } catch (saveErr: any) {
        console.error("Auto-save banner content error:", saveErr);
        showToast(`Slide 0${targetIdx + 1} image updated successfully!`, "success");
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

  // Image Upload Handler from File Input
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  // Save all slides
  const handleSaveAll = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setIsSaving(true);
    setAutoSaveStatus("saving");
    try {
      // Normalize any raw URLs on final save
      const normalizedSlides = slidesRef.current.map((s, idx) => ({
        ...DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length],
        ...s,
        number: s.number || `0${idx + 1}`,
        image: s.image || DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length]?.image,
      }));
      setSlides(normalizedSlides);
      slidesRef.current = normalizedSlides;

      const saved = await saveSiteContent({
        heroSlides: normalizedSlides,
      });
      setSiteContent(saved);
      isDirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveStatus("saved");
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
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSlides(DEFAULT_SLIDES);
    slidesRef.current = DEFAULT_SLIDES;
    setIsSaving(true);
    try {
      const saved = await saveSiteContent({
        heroSlides: DEFAULT_SLIDES,
      });
      setSiteContent(saved);
      isDirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveStatus("saved");
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
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-[#1e1b18]">
                  Homepage Hero Slideshow & Banners
                </h2>
                {autoSaveStatus === "saving" || isSaving ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                    <Loader2 size={11} className="animate-spin" /> Saving live to website...
                  </span>
                ) : isDirty ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                    <AlertCircle size={11} /> Auto-saving in a moment...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 size={11} /> Live on storefront (Saved)
                  </span>
                )}
              </div>
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
            className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              isDirty
                ? "bg-[#0d4f3c] hover:bg-[#0b3f30] ring-2 ring-emerald-400 ring-offset-1 animate-pulse"
                : "bg-[#0d4f3c] hover:bg-[#0b3f30]"
            }`}
          >
            <Save size={14} />
            <span>{isSaving ? "Publishing Changes..." : "Publish Banners"}</span>
          </button>
        </div>
      </div>

      {/* Slide Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {slides.map((s, idx) => {
          const isActive = activeSlideIndex === idx;
          return (
            <div
              key={idx}
              onClick={() => handleSelectSlide(idx)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 flex-1 min-w-[220px] max-w-[340px] relative group ${
                isActive
                  ? "bg-[#0d4f3c]/5 border-[#0d4f3c] shadow-xs"
                  : "bg-white border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="relative w-14 h-11 rounded-md overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                <img
                  src={normalizeImageUrl(s.image)}
                  alt={s.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
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
                <div className="flex items-center justify-between">
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
                  {/* Reordering Controls */}
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => handleMoveSlide(idx, idx - 1, e)}
                      title="Move slide left"
                      className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === slides.length - 1}
                      onClick={(e) => handleMoveSlide(idx, idx + 1, e)}
                      title="Move slide right"
                      className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSlide(idx, e)}
                        title="Delete slide"
                        className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs font-semibold text-stone-800 truncate">
                  {s.title || "Untitled Banner"}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  {s.collection || s.eyebrow}
                </p>
              </div>
            </div>
          );
        })}

        {/* Add Slide Button */}
        <button
          type="button"
          onClick={handleAddSlide}
          className="p-3 rounded-xl border border-dashed border-stone-300 hover:border-[#0d4f3c] hover:bg-[#0d4f3c]/5 text-stone-500 hover:text-[#0d4f3c] transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-pointer h-16 min-w-[130px]"
        >
          <Plus size={15} />
          <span>Add Slide</span>
        </button>
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
                    handleSelectSlide(activeSlideIndex > 0 ? activeSlideIndex - 1 : slides.length - 1)
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
                    handleSelectSlide(activeSlideIndex < slides.length - 1 ? activeSlideIndex + 1 : 0)
                  }
                  className="p-1 rounded hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Next Slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Simulated Storefront Hero Slide Card (Drag & Drop Zone) */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-lg overflow-hidden bg-stone-950 aspect-[4/5] shadow-md group cursor-pointer transition-all ${
                isDragging
                  ? "ring-4 ring-emerald-500 ring-offset-2 scale-[1.01]"
                  : "hover:ring-2 hover:ring-stone-400"
              }`}
            >
              <img
                src={normalizeImageUrl(currentSlide.image)}
                alt={currentSlide.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
                }}
              />

              {/* Dragging Overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-[#0d4f3c]/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-in fade-in duration-200">
                  <Upload size={36} className="animate-bounce mb-2" />
                  <p className="font-serif font-bold text-base">Drop photo to upload</p>
                  <p className="text-xs text-stone-200">Release to immediately publish live</p>
                </div>
              )}

              {/* Uploading Spinner Overlay */}
              {uploadingIndex === activeSlideIndex && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs font-semibold">Processing & publishing photo...</p>
                </div>
              )}

              {/* Hover upload button hint */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                <span className="px-3.5 py-2 bg-white/95 text-stone-900 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
                  <Upload size={14} className="text-[#0d4f3c]" />
                  <span>Click or Drag photo to replace</span>
                </span>
              </div>

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3 bg-[#0d4f3c]/90 backdrop-blur-xs text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-xs pointer-events-none">
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
                {currentSlide.caption && (
                  <p className="text-[11px] text-amber-200/90 font-medium line-clamp-1">
                    ✦ {currentSlide.caption}
                  </p>
                )}
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
                  placeholder="e.g. NEW ARRIVAL / Contemporary Pret"
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
                  placeholder="e.g. Festive Pret & Luxury Coordinates"
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
                placeholder="Handcrafted pure cotton-silk designer kurti tunic..."
                className="w-full text-xs px-3.5 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c] leading-relaxed"
              />
            </div>

            {/* Card Caption & Moodboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Photo Card Caption (Displayed under photo)
                </label>
                <input
                  type="text"
                  value={currentSlide.caption || ""}
                  onChange={(e) => handleFieldChange("caption", e.target.value)}
                  placeholder="e.g. Bespoke Printed Kurti with Embroidered Placket"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Moodboard Tag
                </label>
                <input
                  type="text"
                  value={currentSlide.mood || ""}
                  onChange={(e) => handleFieldChange("mood", e.target.value)}
                  placeholder="e.g. Turquoise, Sage & Terracotta"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>
            </div>

            {/* Season, CTA Text, & CTA Target */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Season Badge
                </label>
                <input
                  type="text"
                  value={currentSlide.season}
                  onChange={(e) => handleFieldChange("season", e.target.value)}
                  placeholder="e.g. SUMMER/FESTIVE 2026"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Button CTA Text
                </label>
                <input
                  type="text"
                  value={currentSlide.ctaText || "Explore Collection"}
                  onChange={(e) => handleFieldChange("ctaText", e.target.value)}
                  placeholder="e.g. Explore Collection"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Button Target Section / URL
                </label>
                <input
                  type="text"
                  value={currentSlide.ctaTarget || "catalog-section"}
                  onChange={(e) => handleFieldChange("ctaTarget", e.target.value)}
                  placeholder="e.g. catalog-section"
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
