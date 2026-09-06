import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  Move,
} from "lucide-react";

export interface LuxuryImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
  colorName?: string;
  price?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

export default function LuxuryImageViewerModal({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title,
  subtitle,
  colorName,
  price,
}: LuxuryImageViewerModalProps) {
  // Ensure we have a valid, non-empty list of images
  const validImages = React.useMemo(() => {
    const list = Array.isArray(images) ? images.filter(Boolean) : [];
    return list.length > 0 ? list : ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80"];
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);

  // Sync initial index when opening
  useEffect(() => {
    if (isOpen) {
      const safeIndex = Math.min(Math.max(0, initialIndex), validImages.length - 1);
      setCurrentIndex(safeIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setShowHint(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialIndex, validImages.length]);

  // Hide hint after 3.5s
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, currentIndex]);

  // Reset zoom and pan on image switch
  const handleSelectImage = useCallback((index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : validImages.length - 1));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [validImages.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < validImages.length - 1 ? prev + 1 : 0));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [validImages.length]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, Number((prev + SCALE_STEP).toFixed(2))));
    setShowHint(false);
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(MIN_SCALE, Number((prev - SCALE_STEP).toFixed(2)));
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Double click / double tap: toggle between 1x and 2.5x zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowHint(false);
    if (scale > 1) {
      handleResetZoom();
    } else {
      const targetScale = 2.4;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;
      setScale(targetScale);
      setPosition({
        x: -clickX * (targetScale - 1) * 0.7,
        y: -clickY * (targetScale - 1) * 0.7,
      });
    }
  }, [scale, handleResetZoom]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowHint(false);
    const delta = e.deltaY;
    if (delta < 0) {
      // Zoom in
      setScale((prev) => Math.min(MAX_SCALE, Number((prev + 0.25).toFixed(2))));
    } else {
      // Zoom out
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Number((prev - 0.25).toFixed(2)));
        if (next === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return next;
      });
    }
  }, []);

  // Mouse dragging when zoomed in
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const maxBound = (scale - 1) * 450;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({
      x: Math.max(-maxBound, Math.min(maxBound, newX)),
      y: Math.max(-maxBound, Math.min(maxBound, newY)),
    });
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handling for mobile: drag & pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, touchStartScaleRef.current * factor));
      setScale(Number(newScale.toFixed(2)));
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const maxBound = (scale - 1) * 350;
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({
        x: Math.max(-maxBound, Math.min(maxBound, newX)),
        y: Math.max(-maxBound, Math.min(maxBound, newY)),
      });
    }
  }, [isDragging, scale, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchStartDistRef.current = null;
  }, []);

  // Toggle browser fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Keep thumbnail in view
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeEl = thumbnailsRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex]);

  if (!isOpen) return null;

  const currentImageSrc = validImages[currentIndex] || validImages[0];

  return (
    <AnimatePresence>
      <div
        ref={containerRef}
        className="fixed inset-0 z-[99999] flex flex-col bg-[#0f0e0c]/96 text-white backdrop-blur-md select-none overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Top Bar (Myntra-style header: title, badge, zoom tools, close) */}
        <div className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-sm sm:text-base text-[#f7f3ed] truncate max-w-[200px] sm:max-w-md">
                  {title || "House of Shriya Handloom Suit"}
                </span>
                {colorName && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0d4f3c] text-[#d4af37] border border-[#d4af37]/30">
                    <Sparkles size={10} />
                    {colorName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#a89f91]">
                <span>
                  Photo {currentIndex + 1} of {validImages.length}
                </span>
                {price && <span>• {price}</span>}
                {subtitle && <span className="hidden md:inline">• {subtitle}</span>}
              </div>
            </div>
          </div>

          {/* Zoom and Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
              className={`p-2 rounded-xl border transition-all ${
                scale <= MIN_SCALE
                  ? "border-white/5 text-white/25 cursor-not-allowed"
                  : "border-white/15 text-white/80 hover:text-white hover:bg-white/10"
              }`}
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
              className={`p-2 rounded-xl border transition-all ${
                scale >= MAX_SCALE
                  ? "border-white/5 text-white/25 cursor-not-allowed"
                  : "border-white/15 text-white/80 hover:text-white hover:bg-white/10"
              }`}
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            {/* Reset */}
            {scale > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/15 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset zoom to 100%"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="ml-1 sm:ml-2 p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white border border-white/20 transition-all shadow-md"
              title="Close viewer (Esc)"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Stage: High-Resolution Viewer with Drag & Zoom */}
        <div
          className={`relative flex-1 flex items-center justify-center overflow-hidden w-full ${
            scale > 1
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          }`}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Subtle Helper Hint on first opening */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute top-4 z-20 pointer-events-none px-3.5 py-1.5 rounded-full bg-black/75 border border-white/20 text-[#f7f3ed] text-xs flex items-center gap-2 shadow-xl backdrop-blur-md"
              >
                <Sparkles size={13} className="text-[#c5a059]" />
                <span>Scroll or double-click to zoom in • Drag to inspect handloom details</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Previous Image Arrow */}
          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 sm:left-6 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-[#0d4f3c] text-white border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md hover:scale-105 transition-all"
              title="Previous photo (Left Arrow)"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Next Image Arrow */}
          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 sm:right-6 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-[#0d4f3c] text-white border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md hover:scale-105 transition-all"
              title="Next photo (Right Arrow)"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* High-Resolution Main Image */}
          <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <motion.div
              key={currentImageSrc}
              className="relative max-w-full max-h-full flex items-center justify-center"
              initial={{ opacity: 0.3, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22 }}
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
            >
              <img
                src={currentImageSrc}
                alt={title || "Luxury Handcrafted Suit"}
                className="max-w-[90vw] max-h-[70vh] sm:max-h-[74vh] object-contain rounded-lg shadow-2xl pointer-events-none"
                draggable={false}
              />
            </motion.div>
          </div>

          {/* Drag Indicator Badge when zoomed */}
          {scale > 1 && (
            <div className="absolute bottom-4 left-4 z-20 pointer-events-none px-3 py-1 rounded-full bg-black/70 border border-white/15 text-white/90 text-[11px] flex items-center gap-1.5 backdrop-blur-md">
              <Move size={12} className="text-[#c5a059]" />
              <span>Pan enabled ({Math.round(scale * 100)}%)</span>
            </div>
          )}
        </div>

        {/* Bottom Thumbnail Strip (Myntra style) */}
        {validImages.length > 1 && (
          <div className="relative z-30 border-t border-white/10 bg-black/70 backdrop-blur-md py-3 px-4">
            <div
              ref={thumbnailsRef}
              className="flex items-center justify-center gap-2.5 overflow-x-auto max-w-4xl mx-auto scrollbar-none py-1"
            >
              {validImages.map((img, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectImage(idx)}
                    className={`relative w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      isActive
                        ? "border-[#c5a059] ring-2 ring-[#0d4f3c] scale-105 shadow-lg"
                        : "border-white/20 opacity-60 hover:opacity-100 hover:border-white/60"
                    }`}
                    title={`View photo ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isActive && (
                      <div className="absolute inset-0 border border-[#c5a059] rounded-lg pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
