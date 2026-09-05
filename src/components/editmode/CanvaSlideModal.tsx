import React, { useState, useEffect } from "react";
import { useEditMode } from "./EditModeContext";
import { useStore } from "../../context/StoreContext";
import { X, Layers, Image as ImageIcon, Plus, Trash2, Check, Upload } from "lucide-react";
import { HeroSlide } from "../../types";
import { optimizeImageFile, persistAssetToFirestore } from "../../services/imageUploadService";

export default function CanvaSlideModal() {
  const { activeModal, setActiveModal, modalData, updateContentField, saveChanges } = useEditMode();
  const { siteContent, setSiteContent } = useStore();

  const slides: HeroSlide[] = siteContent?.heroSlides || [];
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);

  useEffect(() => {
    if (modalData && typeof modalData.slideIndex === "number") {
      setSelectedSlideIndex(modalData.slideIndex);
    }
  }, [modalData]);

  if (activeModal !== "slideModal") return null;

  const currentSlide = slides[selectedSlideIndex] || slides[0] || {
    eyebrow: "Artisan Heirlooms",
    number: "01",
    collection: "Pure Silks",
    title: "Handcrafted Indian Suits",
    description: "Tailored to perfection",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
    season: "2026",
    caption: "Heirloom Edition",
    mood: "Gold Weaves",
    ctaText: "Shop Collection",
  };

  const handleFieldChange = (field: keyof HeroSlide, value: string) => {
    const updatedSlides = [...slides];
    if (!updatedSlides[selectedSlideIndex]) {
      updatedSlides[selectedSlideIndex] = { ...currentSlide };
    }
    updatedSlides[selectedSlideIndex] = {
      ...updatedSlides[selectedSlideIndex],
      [field]: value,
    };

    setSiteContent((prev) => ({
      ...prev,
      heroSlides: updatedSlides,
    }));
  };

  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      eyebrow: "New Couture Drop",
      number: `0${slides.length + 1}`,
      collection: "Bespoke Collection",
      title: "New Indian Handloom Suit Edit",
      description: "Crafted in Surat with 100% pure fabrics and handloom artistry.",
      image: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1200&q=85",
      season: "FESTIVE 2026",
      caption: "Bespoke Handloom Edit",
      mood: "Royal Gold & Emerald",
      ctaText: "Explore Now",
    };

    const next = [...slides, newSlide];
    setSiteContent((prev) => ({ ...prev, heroSlides: next }));
    setSelectedSlideIndex(next.length - 1);
  };

  const handleDeleteSlide = (indexToDelete: number) => {
    if (slides.length <= 1) {
      alert("At least one hero slide is required.");
      return;
    }
    const next = slides.filter((_, i) => i !== indexToDelete);
    setSiteContent((prev) => ({ ...prev, heroSlides: next }));
    setSelectedSlideIndex(Math.max(0, indexToDelete - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121915] text-[#faf8f5] border border-[#d4af37]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0f0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7D2AE8] to-[#0d4f3c] flex items-center justify-center text-white shadow-md">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-amber-200 tracking-wide">
                Canva Hero Banner & Slide Editor
              </h2>
              <p className="text-xs text-white/60">
                Customize titles, banner images, and buttons with real-time preview
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

        {/* Slide tabs */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-[#0d1411] flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedSlideIndex(i)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedSlideIndex === i
                    ? "bg-amber-400 text-black font-semibold"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Slide {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={handleAddSlide}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-[#7D2AE8] text-white flex items-center gap-1 shrink-0 font-medium transition-colors"
          >
            <Plus size={13} />
            <span>Add Slide</span>
          </button>
        </div>

        {/* Form fields */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-amber-200 font-medium mb-1">Headline Title</label>
              <textarea
                rows={2}
                value={currentSlide.title || ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Eyebrow */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Eyebrow / Tag</label>
              <input
                type="text"
                value={currentSlide.eyebrow || ""}
                onChange={(e) => handleFieldChange("eyebrow", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Collection */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Collection Name</label>
              <input
                type="text"
                value={currentSlide.collection || ""}
                onChange={(e) => handleFieldChange("collection", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* CTA Button Text */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Button CTA Text</label>
              <input
                type="text"
                value={currentSlide.ctaText || ""}
                onChange={(e) => handleFieldChange("ctaText", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Caption / Subtitle */}
            <div>
              <label className="block text-amber-200 font-medium mb-1">Image Caption Badge</label>
              <input
                type="text"
                value={currentSlide.caption || ""}
                onChange={(e) => handleFieldChange("caption", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Banner Image from Device */}
            <div className="sm:col-span-2">
              <label className="block text-amber-200 font-medium mb-1">Slide Photo (Direct Device Upload)</label>
              <div className="flex items-center gap-3 bg-black/40 border border-white/15 rounded-lg p-2.5">
                {currentSlide.image && (
                  <img
                    src={currentSlide.image}
                    alt="Slide photo"
                    className="w-14 h-14 object-cover rounded-md border border-white/20 shrink-0"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0d4f3c] text-amber-200 border border-amber-400/40 text-xs font-semibold rounded-lg cursor-pointer hover:bg-[#145d48] transition-colors">
                    <Upload size={13} />
                    <span>Upload Slide Photo From Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const optimized = await optimizeImageFile(file);
                          await persistAssetToFirestore(optimized);
                          handleFieldChange("image", optimized.url);
                        } catch (err) {
                          console.error("Slide upload error:", err);
                          alert("Failed to upload slide image from device.");
                        }
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-white/50">
                    High-resolution image is optimized and saved securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-amber-200 font-medium mb-1">Description</label>
              <textarea
                rows={2}
                value={currentSlide.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

          </div>

          {/* Delete slide action */}
          {slides.length > 1 && (
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => handleDeleteSlide(selectedSlideIndex)}
                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Slide {selectedSlideIndex + 1}</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#0a0f0d] flex items-center justify-between text-xs">
          <span className="text-white/60">
            ✦ Slide changes apply live to the hero banner
          </span>
          <button
            onClick={() => {
              const updatedContent = {
                ...siteContent,
                heroSlides: slides,
              };
              saveChanges({ siteContent: updatedContent });
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
