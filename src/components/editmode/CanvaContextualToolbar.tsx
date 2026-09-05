import React, { useState, useEffect } from "react";
import { useEditMode } from "./EditModeContext";
import { isInsideAIStudioEditor } from "./EditModeUtils";
import {
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Image as ImageIcon,
  SlidersHorizontal,
  X,
  Edit2,
  Check,
} from "lucide-react";

export default function CanvaContextualToolbar() {
  const {
    isEditMode,
    isPreviewOnly,
    selectedElement,
    setSelectedElement,
    updateCustomOverride,
    getOverride,
    quickEditImage,
    quickEditProduct,
    quickEditSlide,
    setActiveModal,
    updateContentField,
    saveChanges,
  } = useEditMode();

  const [inlineEditing, setInlineEditing] = useState(false);
  const [textVal, setTextVal] = useState("");

  useEffect(() => {
    if (selectedElement) {
      const override = getOverride(selectedElement.id);
      setTextVal(override?.text !== undefined ? override.text : selectedElement.currentValue || "");
      setInlineEditing(false);
    }
  }, [selectedElement, getOverride]);

  if (!isInsideAIStudioEditor() || !isEditMode || isPreviewOnly || !selectedElement) {
    return null;
  }

  const override = getOverride(selectedElement.id) || {};
  const isBold = override.fontWeight === "bold" || override.fontWeight === "700" || override.fontWeight === "800";
  const isItalic = override.fontStyle === "italic";

  const toggleBold = () => {
    updateCustomOverride(selectedElement.id, {
      fontWeight: isBold ? "normal" : "bold",
    }, `Toggled bold on ${selectedElement.label}`);
  };

  const toggleItalic = () => {
    updateCustomOverride(selectedElement.id, {
      fontStyle: isItalic ? "normal" : "italic",
    }, `Toggled italic on ${selectedElement.label}`);
  };

  const setAlign = (align: "left" | "center" | "right") => {
    updateCustomOverride(selectedElement.id, { textAlign: align }, `Aligned ${align} on ${selectedElement.label}`);
  };

  const setFont = (fontFamily: string) => {
    updateCustomOverride(selectedElement.id, { fontFamily }, `Changed font to ${fontFamily}`);
  };

  const setColor = (color: string) => {
    updateCustomOverride(selectedElement.id, { color }, `Changed text color`);
  };

  const changeFontSize = (delta: number) => {
    const current = parseInt(override.fontSize || "16", 10);
    const next = Math.max(10, Math.min(84, current + delta));
    updateCustomOverride(selectedElement.id, { fontSize: `${next}px` }, `Changed font size to ${next}px`);
  };

  const handleApplyText = () => {
    if (selectedElement.fieldPath) {
      updateContentField(selectedElement.fieldPath, textVal);
    }
    updateCustomOverride(selectedElement.id, { text: textVal }, `Updated text for ${selectedElement.label}`);
    setTimeout(() => {
      saveChanges();
    }, 50);
    setInlineEditing(false);
  };

  // Color Swatches
  const swatches = [
    { name: "Gold", hex: "#d4af37" },
    { name: "Emerald", hex: "#0d4f3c" },
    { name: "Charcoal", hex: "#1e1b18" },
    { name: "Pure White", hex: "#faf8f5" },
    { name: "Crimson", hex: "#851426" },
  ];

  return (
    <aside
      aria-label="Canva element inspector toolbar"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#161f1b] text-white border border-[#d4af37]/40 shadow-2xl rounded-2xl p-2.5 flex flex-col gap-2 max-w-[95vw] w-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top row: Label & quick actions */}
      <div className="flex items-center justify-between gap-3 text-xs pb-1.5 border-b border-white/10 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#7D2AE8] animate-ping" />
          <strong className="font-serif text-amber-200 tracking-wide font-medium">
            {selectedElement.label}
          </strong>
          <span className="text-[0.65rem] px-1.5 py-0.2 bg-white/10 rounded text-white/70 uppercase">
            {selectedElement.type}
          </span>
        </div>

        <button
          onClick={() => setSelectedElement(null)}
          className="p-1 text-white/50 hover:text-white rounded hover:bg-white/10 transition-colors"
          title="Deselect element"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Controls Row */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        
        {/* TEXT CONTROLS */}
        {(selectedElement.type === "text" || selectedElement.type === "heading" || selectedElement.type === "button") && (
          <>
            {/* Font Family selector */}
            <select
              value={override.fontFamily || ""}
              onChange={(e) => setFont(e.target.value)}
              className="bg-[#24332c] text-amber-100 border border-white/15 rounded px-2 py-1 text-xs cursor-pointer hover:border-amber-400 focus:outline-none"
              title="Change Font Family"
            >
              <option value="">Font: Default</option>
              <option value="'Cinzel', serif">Cinzel (Royal Display)</option>
              <option value="'Playfair Display', serif">Playfair Display (Haute)</option>
              <option value="'Cormorant Garamond', serif">Cormorant Garamond (Artisan)</option>
              <option value="'Montserrat', sans-serif">Montserrat (Modern)</option>
              <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans (Clean)</option>
            </select>

            {/* Font size +/- */}
            <div className="flex items-center bg-[#24332c] rounded border border-white/15 overflow-hidden">
              <button
                onClick={() => changeFontSize(-2)}
                className="px-2 py-1 hover:bg-white/15 text-white/80 hover:text-white font-bold"
                title="Decrease font size"
              >
                -
              </button>
              <span className="px-1.5 text-[0.7rem] text-white/90 font-mono">
                {override.fontSize || "Size"}
              </span>
              <button
                onClick={() => changeFontSize(2)}
                className="px-2 py-1 hover:bg-white/15 text-white/80 hover:text-white font-bold"
                title="Increase font size"
              >
                +
              </button>
            </div>

            {/* Bold & Italic */}
            <div className="flex items-center gap-0.5 bg-[#24332c] rounded border border-white/15 p-0.5">
              <button
                onClick={toggleBold}
                className={`p-1 rounded ${
                  isBold ? "bg-[#d4af37] text-black font-bold" : "text-white/80 hover:text-white"
                }`}
                title="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                onClick={toggleItalic}
                className={`p-1 rounded ${
                  isItalic ? "bg-[#d4af37] text-black" : "text-white/80 hover:text-white"
                }`}
                title="Italic"
              >
                <Italic size={13} />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 bg-[#24332c] rounded border border-white/15 p-0.5">
              <button
                onClick={() => setAlign("left")}
                className="p-1 text-white/80 hover:text-white rounded"
                title="Align Left"
              >
                <AlignLeft size={13} />
              </button>
              <button
                onClick={() => setAlign("center")}
                className="p-1 text-white/80 hover:text-white rounded"
                title="Align Center"
              >
                <AlignCenter size={13} />
              </button>
              <button
                onClick={() => setAlign("right")}
                className="p-1 text-white/80 hover:text-white rounded"
                title="Align Right"
              >
                <AlignRight size={13} />
              </button>
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-1.5 pl-1">
              {swatches.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setColor(s.hex)}
                  style={{ backgroundColor: s.hex }}
                  className="w-4 h-4 rounded-full border border-white/30 hover:scale-125 transition-transform"
                  title={s.name}
                />
              ))}
              <input
                type="color"
                value={override.color || "#d4af37"}
                onChange={(e) => setColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                title="Custom color"
              />
            </div>

            {/* Inline text edit trigger */}
            <button
              onClick={() => setInlineEditing(!inlineEditing)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#7D2AE8] hover:bg-[#6d20d8] text-white font-medium transition-colors"
            >
              <Edit2 size={12} />
              <span>{inlineEditing ? "Done" : "Edit Text"}</span>
            </button>
          </>
        )}

        {/* IMAGE CONTROLS */}
        {selectedElement.type === "image" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => quickEditImage(selectedElement.id, selectedElement.currentValue || "", selectedElement.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7D2AE8] to-[#0d4f3c] text-white font-medium hover:brightness-110 shadow"
            >
              <ImageIcon size={14} />
              <span>Replace Photo</span>
            </button>
          </div>
        )}

        {/* PRODUCT CONTROLS */}
        {selectedElement.type === "product" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveModal("productModal");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-black font-semibold hover:brightness-110 shadow"
            >
              <SlidersHorizontal size={14} />
              <span>Edit Product Details</span>
            </button>
          </div>
        )}

        {/* BANNER / SLIDE CONTROLS */}
        {selectedElement.type === "banner" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                quickEditSlide(selectedElement.slideIndex || 0);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7D2AE8] to-[#0d4f3c] text-white font-semibold hover:brightness-110 shadow"
            >
              <SlidersHorizontal size={14} />
              <span>Edit Slide Content</span>
            </button>
          </div>
        )}

      </div>

      {/* Quick Text Editor popover if inlineEditing is active */}
      {inlineEditing && (
        <div className="pt-2 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyText();
            }}
            autoFocus
            className="flex-1 bg-black/40 border border-amber-400/50 rounded px-2.5 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Enter custom text..."
          />
          <button
            onClick={handleApplyText}
            className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded text-xs flex items-center gap-1"
          >
            <Check size={12} />
            <span>Apply</span>
          </button>
        </div>
      )}
    </aside>
  );
}
