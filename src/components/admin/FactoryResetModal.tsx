import React, { useState, useMemo } from "react";
import {
  RotateCcw,
  AlertTriangle,
  Trash2,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Check,
  X,
  Loader2,
  Package,
  Image as ImageIcon,
  Layers,
  HardDrive,
} from "lucide-react";
import { Product } from "../../types";
import { factoryResetCatalog, FactoryResetResult } from "../../services/storeService";

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProducts: Product[];
  onResetSuccess: (result: FactoryResetResult) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export default function FactoryResetModal({
  isOpen,
  onClose,
  currentProducts,
  onResetSuccess,
  showToast,
}: FactoryResetModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [wipeImages, setWipeImages] = useState(true);
  const [clearCaches, setClearCaches] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<string>("");
  const [completionResult, setCompletionResult] = useState<FactoryResetResult | null>(null);

  // Compute metrics on current catalog scope
  const stats = useMemo(() => {
    const totalProducts = currentProducts.length;
    let totalVariants = 0;
    let totalImageRefs = 0;

    for (const p of currentProducts) {
      if (p.image) totalImageRefs++;
      if (p.hoverImage) totalImageRefs++;
      if (Array.isArray(p.images)) totalImageRefs += p.images.length;
      if (Array.isArray(p.colorVariants)) {
        totalVariants += p.colorVariants.length;
        for (const v of p.colorVariants) {
          if (v.image) totalImageRefs++;
          if (v.hoverImage) totalImageRefs++;
          if (Array.isArray(v.images)) totalImageRefs += v.images.length;
        }
      }
    }

    return { totalProducts, totalVariants, totalImageRefs };
  }, [currentProducts]);

  if (!isOpen) return null;

  const isConfirmed = confirmationText.trim().toUpperCase() === "RESET";

  const handleExecuteReset = async () => {
    if (!isConfirmed || isExecuting) return;

    setIsExecuting(true);
    setExecutionStep("Initiating catalog factory reset...");

    try {
      setExecutionStep("Wiping product catalog records & variations...");
      await new Promise((r) => setTimeout(r, 400));

      if (wipeImages) {
        setExecutionStep("Purging product image files & references (preserving hero banners)...");
        await new Promise((r) => setTimeout(r, 400));
      }

      setExecutionStep("Synchronizing clean state across devices & storage...");
      const result = await factoryResetCatalog({ wipeImages });

      setExecutionStep("Restoring clean store state...");
      await new Promise((r) => setTimeout(r, 300));

      setCompletionResult(result);
      if (showToast) {
        showToast(
          `Factory reset complete: ${result.wipedProductsCount} products wiped, ${result.wipedImagesCount} images purged.`,
          "success"
        );
      }
      onResetSuccess(result);
    } catch (err: any) {
      console.error("Factory reset failed:", err);
      if (showToast) {
        showToast(err.message || "Failed to complete factory reset", "error");
      }
      setIsExecuting(false);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    if (isExecuting) return;
    setConfirmationText("");
    setCompletionResult(null);
    onClose();
  };

  return (
    <div
      id="factory-reset-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="factory-reset-modal-title"
    >
      <div
        id="factory-reset-modal"
        className="w-full max-w-lg bg-[#faf8f5] rounded-2xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 sm:p-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
              <RotateCcw size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="factory-reset-modal-title"
                  className="text-lg font-serif font-bold text-white tracking-wide"
                >
                  Factory Reset Store Catalog
                </h3>
                <span className="text-[10px] font-mono tracking-widest uppercase bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-semibold">
                  Clean State
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Restore your boutique to a pristine, clean state for a fresh start
              </p>
            </div>
          </div>

          {!isExecuting && (
            <button
              id="factory-reset-close-btn"
              type="button"
              onClick={handleClose}
              className="absolute top-5 right-5 p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {completionResult ? (
            /* Success State */
            <div className="space-y-4 py-3 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-serif font-bold text-[#0d4f3c]">
                  Catalog Successfully Reset to Clean State
                </h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  All prior product records, color variations, and image references have been wiped.
                  Your boutique is now in a fresh, pristine condition ready for new inventory.
                </p>
              </div>

              {/* Stats pill summary */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Products Wiped
                  </span>
                  <span className="text-xl font-serif font-bold text-stone-900">
                    {completionResult.wipedProductsCount ?? stats.totalProducts}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Images Purged
                  </span>
                  <span className="text-xl font-serif font-bold text-stone-900">
                    {completionResult.wipedImagesCount ?? 0}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  id="factory-reset-done-btn"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 bg-[#0d4f3c] hover:bg-[#093a2c] text-white font-medium text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} className="text-[#d4af37]" />
                  <span>Return to Clean Catalog</span>
                </button>
              </div>
            </div>
          ) : (
            /* Confirmation & Options State */
            <>
              {/* Catalog Snapshot Pill */}
              <div className="bg-white rounded-xl border border-stone-200 p-3.5 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center justify-between">
                  <span>Current Catalog Footprint</span>
                  <span className="text-rose-600 font-semibold">Scope of Action</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <div className="text-lg font-serif font-bold text-stone-800">
                      {stats.totalProducts}
                    </div>
                    <div className="text-[10px] text-stone-500">Active Products</div>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <div className="text-lg font-serif font-bold text-stone-800">
                      {stats.totalVariants}
                    </div>
                    <div className="text-[10px] text-stone-500">Color Variants</div>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <div className="text-lg font-serif font-bold text-stone-800">
                      {stats.totalImageRefs}
                    </div>
                    <div className="text-[10px] text-stone-500">Image Links</div>
                  </div>
                </div>
              </div>

              {/* Warning Notice Box */}
              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>Important: Irreversible Store Cleanup</span>
                </div>
                <ul className="text-[11px] text-rose-900/90 space-y-1.5 list-disc list-inside">
                  <li>
                    Wipes all products, descriptions, prices, fabric specifications, and custom variants.
                  </li>
                  <li>
                    Decouples and removes all product image references and catalog thumbnails.
                  </li>
                  <li>
                    Resets category counters and clears shopping bags across patron devices.
                  </li>
                  <li className="font-semibold text-emerald-800">
                    Hero slideshow banners and the official boutique UPI scanner are strictly preserved.
                  </li>
                </ul>
              </div>

              {/* Options */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-stone-300 transition-colors">
                  <input
                    id="chk-wipe-images"
                    type="checkbox"
                    checked={wipeImages}
                    disabled={isExecuting}
                    onChange={(e) => setWipeImages(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-stone-800 block">
                      Purge orphaned product image files from storage
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Deletes uploaded product files from <code className="text-stone-700">/uploads/</code>.
                      Preserves hero banners and payment QR codes.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-stone-300 transition-colors">
                  <input
                    id="chk-clear-caches"
                    type="checkbox"
                    checked={clearCaches}
                    disabled={isExecuting}
                    onChange={(e) => setClearCaches(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-stone-800 block">
                      Purge customer cart and wishlist cached references
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Ensures shoppers don't see ghost entries of wiped products in active sessions.
                    </span>
                  </div>
                </label>
              </div>

              {/* Safety Confirmation Input */}
              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="factory-reset-confirm-input"
                  className="block text-xs font-medium text-stone-700"
                >
                  Type <span className="font-bold text-rose-700">RESET</span> below to confirm factory reset:
                </label>
                <input
                  id="factory-reset-confirm-input"
                  type="text"
                  disabled={isExecuting}
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type RESET"
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 text-xs tracking-wider uppercase font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-stone-900 transition-all placeholder:text-stone-400 placeholder:normal-case placeholder:font-sans"
                />
              </div>

              {/* Progress Step Indicator during execution */}
              {isExecuting && (
                <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-rose-600 shrink-0" />
                  <span className="text-xs text-stone-700 font-medium">{executionStep}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  id="factory-reset-cancel-btn"
                  type="button"
                  disabled={isExecuting}
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel & Keep Catalog
                </button>

                <button
                  id="factory-reset-submit-btn"
                  type="button"
                  disabled={!isConfirmed || isExecuting}
                  onClick={handleExecuteReset}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      <span>Wipe & Clean State</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
