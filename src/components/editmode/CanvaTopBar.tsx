import React from "react";
import { useEditMode } from "./EditModeContext";
import { isInsideAIStudioEditor } from "./EditModeUtils";
import {
  Sparkles,
  Undo2,
  Redo2,
  Palette,
  Type,
  Image as ImageIcon,
  Layers,
  Save,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  SlidersHorizontal,
  Crown,
  Cloud,
} from "lucide-react";

export default function CanvaTopBar() {
  const {
    isEditMode,
    setIsEditMode,
    toggleEditMode,
    isPreviewOnly,
    setIsPreviewOnly,
    canUndo,
    canRedo,
    undo,
    redo,
    lastActionDescription,
    saveChanges,
    isSaving,
    saveSuccess,
    hasUnsavedChanges,
    resetToDefaults,
    setActiveModal,
  } = useEditMode();

  // Hide Canva Edit Mode completely from preview and customer views
  if (!isInsideAIStudioEditor()) {
    return null;
  }

  // If Edit Mode is OFF, render a discreet, luxury Canva Edit Mode launcher button inside AI Studio editor only
  if (!isEditMode) {
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-23 sm:right-6 z-40 flex items-center gap-2 print:hidden">
        <button
          onClick={toggleEditMode}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#7D2AE8] via-[#6d20d8] to-[#0d4f3c] text-white font-medium text-xs shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20 backdrop-blur-md"
          title="Open Canva-Style Visual Edit Mode (Ctrl + E)"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          <Sparkles size={15} className="text-amber-300 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold tracking-wide">Canva Edit Mode</span>
          <span className="hidden sm:inline-block text-[0.65rem] bg-black/30 px-1.5 py-0.5 rounded text-white/90">
            Ctrl+E
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Top Floating Canva Studio Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e1311]/95 text-white border-b border-[#253830] backdrop-blur-md shadow-2xl transition-all select-none">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-3 text-xs">
          
          {/* Left section: Brand + Mode Switch + Undo/Redo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7D2AE8] to-[#d4af37] flex items-center justify-center text-white shadow-sm font-bold text-[0.7rem]">
                <Crown size={14} className="text-amber-200" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-serif font-bold text-xs tracking-wider text-amber-200">
                  HOUSE OF SHRIYA
                </span>
                <span className="text-[0.6rem] text-purple-300 font-sans uppercase tracking-widest flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block animate-pulse" />
                  Canva Studio
                </span>
              </div>
            </div>

            {/* Preview toggle */}
            <button
              onClick={() => setIsPreviewOnly(!isPreviewOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors ${
                isPreviewOnly
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-white/10 hover:bg-white/15 text-white/90"
              }`}
              title={isPreviewOnly ? "Return to visual click-to-edit" : "Preview site without edit outlines"}
            >
              {isPreviewOnly ? <Eye size={14} /> : <EyeOff size={14} />}
              <span className="hidden md:inline">{isPreviewOnly ? "Previewing" : "Edit Mode"}</span>
            </button>

            {/* Undo / Redo */}
            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`p-1.5 rounded-md transition-colors ${
                  canUndo
                    ? "hover:bg-white/10 text-white cursor-pointer"
                    : "text-white/30 cursor-not-allowed"
                }`}
                title="Undo (Ctrl + Z)"
                aria-label="Undo"
              >
                <Undo2 size={15} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`p-1.5 rounded-md transition-colors ${
                  canRedo
                    ? "hover:bg-white/10 text-white cursor-pointer"
                    : "text-white/30 cursor-not-allowed"
                }`}
                title="Redo (Ctrl + Y)"
                aria-label="Redo"
              >
                <Redo2 size={15} />
              </button>
            </div>

            {/* Ticker note */}
            <div className="hidden lg:flex items-center gap-1.5 text-[0.7rem] text-white/60 max-w-[180px] truncate pl-2 border-l border-white/10 font-mono">
              <span className="truncate">{lastActionDescription}</span>
            </div>
          </div>

          {/* Middle section: Canva Tools (Brand Kit, Fonts, Banners, Products) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <button
              onClick={() => setActiveModal("brandKit")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-[#7D2AE8]/40 hover:border-[#7D2AE8] border border-white/10 text-white font-medium transition-all shrink-0"
              title="Customize brand colors, palettes & typography"
            >
              <Palette size={14} className="text-amber-300" />
              <span>Colors & Styles</span>
            </button>

            <button
              onClick={() => setActiveModal("slideModal")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-[#7D2AE8]/40 hover:border-[#7D2AE8] border border-white/10 text-white font-medium transition-all shrink-0"
              title="Edit hero slides & banners"
            >
              <Layers size={14} className="text-cyan-300" />
              <span>Banners</span>
            </button>

            <button
              onClick={() => setActiveModal("productModal")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-[#7D2AE8]/40 hover:border-[#7D2AE8] border border-white/10 text-white font-medium transition-all shrink-0"
              title="Quick edit product prices, names, photos"
            >
              <SlidersHorizontal size={14} className="text-emerald-300" />
              <span>Products</span>
            </button>

            <button
              onClick={() => setActiveModal("imagePicker")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-[#7D2AE8]/40 hover:border-[#7D2AE8] border border-white/10 text-white font-medium transition-all shrink-0"
              title="Browse couture stock photos & uploads"
            >
              <ImageIcon size={14} className="text-pink-300" />
              <span>Photos</span>
            </button>

            <button
              onClick={() => setActiveModal("deployModal")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-[#0d4f3c]/60 hover:border-[#0d4f3c] border border-white/10 text-white font-medium transition-all shrink-0"
              title="View GitHub Repository & Cloudflare Pages Continuous Deployment"
            >
              <Cloud size={14} className="text-amber-300" />
              <span>Deploy & Git</span>
            </button>
          </div>

          {/* Right section: Reset, Save & Exit */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Reset */}
            <button
              onClick={resetToDefaults}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors"
              title="Reset styles and overrides to default"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            {/* Save & Publish */}
            <button
              onClick={async () => {
                const token = (typeof window !== "undefined" && localStorage.getItem("gh_pat_token")) || "";
                const ok = await saveChanges();
                if (ok && !token) {
                  setActiveModal("deployModal");
                }
              }}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-xs shadow-md transition-all ${
                saveSuccess
                  ? "bg-emerald-600 text-white"
                  : hasUnsavedChanges
                  ? "bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-[#090e0c] hover:brightness-110"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title="Save changes to repository source files and push to GitHub"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{hasUnsavedChanges ? "Publish Changes" : "Saved"}</span>
                </>
              )}
            </button>

            {/* Close / Exit Edit Mode */}
            <button
              onClick={() => setIsEditMode(false)}
              className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Exit Edit Mode"
              aria-label="Exit Edit Mode"
            >
              <X size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* Spacer so the fixed top bar doesn't cover the very top of the page */}
      <div className="h-11 w-full" />
    </>
  );
}
