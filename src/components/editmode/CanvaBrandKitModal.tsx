import React from "react";
import { useEditMode } from "./EditModeContext";
import { X, Palette, Check, Sparkles, RefreshCw } from "lucide-react";

interface PalettePreset {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  accent: string;
  background: string;
  headingFont: string;
  bodyFont: string;
}

const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "royal-emerald",
    name: "Royal Emerald & Antique Gold",
    tagline: "Signature House of Shriya couture palette",
    primary: "#0d4f3c",
    accent: "#d4af37",
    background: "#faf8f5",
    headingFont: "Cinzel",
    bodyFont: "Plus Jakarta Sans",
  },
  {
    id: "champagne-rose",
    name: "Champagne Silk & Rose Gold",
    tagline: "Romantic pastel bridal aesthetic",
    primary: "#6c2b3e",
    accent: "#d89c7a",
    background: "#fdfbf9",
    headingFont: "Playfair Display",
    bodyFont: "Plus Jakarta Sans",
  },
  {
    id: "regal-crimson",
    name: "Regal Crimson & Zardozi",
    tagline: "Opulent festive Banarasi wedding tones",
    primary: "#7a1122",
    accent: "#e5b84c",
    background: "#faf6f0",
    headingFont: "Cormorant Garamond",
    bodyFont: "Plus Jakarta Sans",
  },
  {
    id: "midnight-sapphire",
    name: "Midnight Sapphire & Velvet",
    tagline: "Deep dramatic evening soiree palette",
    primary: "#14213d",
    accent: "#e5c07b",
    background: "#f4f5f8",
    headingFont: "Cinzel",
    bodyFont: "Montserrat",
  },
  {
    id: "chanderi-ivory",
    name: "Chanderi Ivory & Sage Gold",
    tagline: "Airy summer handloom minimalism",
    primary: "#2d4a3e",
    accent: "#c59e4b",
    background: "#f7f5f0",
    headingFont: "Playfair Display",
    bodyFont: "Plus Jakarta Sans",
  },
];

const HEADING_FONTS = [
  { id: "Cinzel", name: "Cinzel", sample: "HOUSE OF SHRIYA", desc: "Regal Royal Serif" },
  { id: "Playfair Display", name: "Playfair Display", sample: "Heirloom Couture", desc: "Haute Fashion Editorial" },
  { id: "Cormorant Garamond", name: "Cormorant Garamond", sample: "Surat Handlooms", desc: "Artisanal Classic Elegance" },
  { id: "Montserrat", name: "Montserrat", sample: "Modern Luxury", desc: "Geometric Contemporary" },
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans", sample: "Boutique Minimal", desc: "Clean & Architectural" },
];

const BODY_FONTS = [
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans", desc: "Modern, balanced readability" },
  { id: "Montserrat", name: "Montserrat", desc: "Fashion-forward geometric" },
];

export default function CanvaBrandKitModal() {
  const {
    activeModal,
    setActiveModal,
    brandStyles,
    updateBrandStyles,
    resetToDefaults,
    saveChanges,
  } = useEditMode();

  if (activeModal !== "brandKit") return null;

  const handleSelectPreset = (preset: PalettePreset) => {
    updateBrandStyles(
      {
        primaryColor: preset.primary,
        accentColor: preset.accent,
        backgroundColor: preset.background,
        headingFont: preset.headingFont,
        bodyFont: preset.bodyFont,
      },
      `Applied ${preset.name} palette`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121915] text-[#faf8f5] border border-[#d4af37]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0f0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7D2AE8] to-[#d4af37] flex items-center justify-center text-white shadow-md">
              <Palette size={16} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-amber-200 tracking-wide">
                Canva Brand Kit & Styles
              </h2>
              <p className="text-xs text-white/60">
                Click any palette or customize colors & fonts for real-time live preview
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Section 1: Curated Palettes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={13} />
                Curated Luxury Brand Palettes
              </span>
              <button
                onClick={resetToDefaults}
                className="text-[0.7rem] text-white/50 hover:text-amber-200 flex items-center gap-1"
              >
                <RefreshCw size={11} /> Reset Original
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PALETTE_PRESETS.map((p) => {
                const isActive =
                  brandStyles.primaryColor === p.primary &&
                  brandStyles.accentColor === p.accent &&
                  brandStyles.backgroundColor === p.background;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                      isActive
                        ? "border-amber-400 bg-amber-400/10 shadow-lg"
                        : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <strong className="text-sm text-white font-serif tracking-wide block">
                        {p.name}
                      </strong>
                      {isActive && (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[0.65rem] font-bold">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-[0.7rem] text-white/60 mb-2.5">{p.tagline}</p>
                    
                    {/* Swatch bars */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span
                          className="w-5 h-5 rounded-md border border-white/20 shadow-inner"
                          style={{ backgroundColor: p.primary }}
                          title={`Primary: ${p.primary}`}
                        />
                        <span
                          className="w-5 h-5 rounded-md border border-white/20 shadow-inner"
                          style={{ backgroundColor: p.accent }}
                          title={`Accent: ${p.accent}`}
                        />
                        <span
                          className="w-5 h-5 rounded-md border border-white/20 shadow-inner"
                          style={{ backgroundColor: p.background }}
                          title={`Background: ${p.background}`}
                        />
                      </div>
                      <span className="text-[0.65rem] text-white/50 font-mono ml-auto">
                        {p.headingFont}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Color Controls */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-3">
              Custom Colors
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Primary Color */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Primary Shade</span>
                  <span className="text-[0.68rem] text-white/50 font-mono uppercase">
                    {brandStyles.primaryColor}
                  </span>
                </div>
                <input
                  type="color"
                  value={brandStyles.primaryColor}
                  onChange={(e) => updateBrandStyles({ primaryColor: e.target.value }, "Updated primary color")}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0"
                />
              </div>

              {/* Accent Color */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Accent Gold</span>
                  <span className="text-[0.68rem] text-white/50 font-mono uppercase">
                    {brandStyles.accentColor}
                  </span>
                </div>
                <input
                  type="color"
                  value={brandStyles.accentColor}
                  onChange={(e) => updateBrandStyles({ accentColor: e.target.value }, "Updated accent color")}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0"
                />
              </div>

              {/* Background Color */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Site Canvas</span>
                  <span className="text-[0.68rem] text-white/50 font-mono uppercase">
                    {brandStyles.backgroundColor}
                  </span>
                </div>
                <input
                  type="color"
                  value={brandStyles.backgroundColor}
                  onChange={(e) => updateBrandStyles({ backgroundColor: e.target.value }, "Updated background color")}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0"
                />
              </div>

            </div>
          </div>

          {/* Section 3: Typography & Fonts */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-3">
              Couture Typography & Headings
            </h3>
            
            <div className="space-y-2">
              {HEADING_FONTS.map((f) => {
                const isSelected = brandStyles.headingFont === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => updateBrandStyles({ headingFont: f.id }, `Changed heading font to ${f.name}`)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-amber-400 bg-amber-400/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-white">{f.name}</strong>
                        <span className="text-[0.68rem] text-white/50">· {f.desc}</span>
                      </div>
                      <p
                        className="text-base text-amber-200 mt-1"
                        style={{
                          fontFamily:
                            f.id === "Cinzel"
                              ? "'Cinzel', Georgia, serif"
                              : f.id === "Playfair Display"
                              ? "'Playfair Display', Georgia, serif"
                              : f.id === "Cormorant Garamond"
                              ? "'Cormorant Garamond', Georgia, serif"
                              : f.id === "Montserrat"
                              ? "'Montserrat', sans-serif"
                              : "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {f.sample}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-bold shrink-0">
                        <Check size={13} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#0a0f0d] flex items-center justify-between text-xs">
          <span className="text-white/60">
            ✦ All updates apply live to the website instantly
          </span>
          <button
            onClick={() => {
              saveChanges();
              setActiveModal(null);
            }}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-black font-semibold hover:brightness-110 shadow-md"
          >
            Apply & Save
          </button>
        </div>

      </div>
    </div>
  );
}
