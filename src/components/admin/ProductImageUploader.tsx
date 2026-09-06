import React, { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Star,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  X,
} from "lucide-react";
import {
  processAndUploadDeviceImages,
  replaceImageFromDevice,
  MAX_PRODUCT_IMAGES,
  ALLOWED_IMAGE_TYPES,
  UploadProgress,
} from "../../services/imageUploadService";

interface ProductImageUploaderProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  productId?: string;
  productTitle?: string;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  images = [],
  onChange,
  productId,
  productTitle = "Suit Piece",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const currentCount = images.length;
  const slotsRemaining = MAX_PRODUCT_IMAGES - currentCount;

  // Handle file selection directly from device
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const filesArray = Array.from(fileList);
    setIsProcessing(true);

    try {
      const result = await processAndUploadDeviceImages(
        filesArray,
        images,
        productId,
        (progress) => setUploadProgress(progress)
      );

      if (result.newImages.length > 0) {
        const updated = [...images, ...result.newImages].slice(0, MAX_PRODUCT_IMAGES);
        onChange(updated);
        setSuccessMessage(`Successfully uploaded ${result.newImages.length} photo(s) from device.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }

      if (result.errors.length > 0) {
        setErrorMessage(result.errors.join(" "));
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMessage("An unexpected error occurred while processing device images.");
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    if (slotsRemaining <= 0) {
      setErrorMessage(`Maximum limit of ${MAX_PRODUCT_IMAGES} images reached for this product. You can replace or delete existing photos.`);
      return;
    }
    fileInputRef.current?.click();
  };

  // Drag & drop handlers
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove image at index
  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    setErrorMessage(null);
  };

  // Set as Cover (Main)
  const handleSetAsCover = (index: number) => {
    if (index === 0 || index >= images.length) return;
    const target = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
    setSuccessMessage("Selected photo is now set as the primary cover photo.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Move image position
  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    onChange(reordered);
  };

  // Replace single image from device
  const handleTriggerReplace = (index: number) => {
    setReplacingIndex(index);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingIndex === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await replaceImageFromDevice(
        file,
        productId,
        (progress) => setUploadProgress(progress)
      );
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.url) {
        const updated = [...images];
        updated[replacingIndex] = res.url;
        onChange(updated);
        setSuccessMessage(`Photo #${replacingIndex + 1} successfully replaced from device.`);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err) {
      console.error("Replace error:", err);
      setErrorMessage("Failed to replace image from device.");
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs for Direct Device Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        aria-label="Upload device images"
      />

      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceFile}
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        aria-label="Replace single image from device"
      />

      {/* Header bar with Count and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5ded6]">
        <div>
          <label className="block text-xs font-bold text-[#1e1b18] uppercase tracking-wider">
            Product Photography Gallery
          </label>
          <p className="text-[11px] text-[#6b6257]">
            Upload up to 10 high-resolution photos directly from your phone or PC. Photo #1 serves as the Main Cover.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-[#faf8f5] px-3 py-1 rounded-full border border-[#e5ded6]">
            <span className="w-2 h-2 rounded-full bg-[#0d4f3c]" />
            <span className="text-[11px] font-bold text-[#0d4f3c]">
              {currentCount} / {MAX_PRODUCT_IMAGES} Photos
            </span>
          </div>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div className="bg-[#faf8f5] border border-[#d4af37]/60 rounded-xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <RefreshCw size={13} className="animate-spin text-[#0d4f3c]" />
              <span className="font-bold text-[#1e1b18]">
                Uploading photo {uploadProgress.current} of {uploadProgress.total} ({uploadProgress.percent}%)
              </span>
            </div>
            <span className="text-[11px] text-[#6b6257] truncate max-w-[220px]">
              {uploadProgress.fileName}
            </span>
          </div>
          <div className="w-full bg-[#e5ded6] rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#0d4f3c] via-[#1a7358] to-[#d4af37] h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <p className="text-[10px] text-[#6b6257]">
            Optimizing high-resolution photo and archiving permanently to store storage...
          </p>
        </div>
      )}

      {/* Alert Notices */}
      {errorMessage && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-xl">
          <CheckCircle2 size={15} className="shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Direct Device Upload Target Box */}
      {slotsRemaining > 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[#0d4f3c] bg-[#0d4f3c]/10 scale-[1.01]"
              : "border-[#d6ccc2] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-[#f5efe6]"
          } ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-white border border-[#d4af37]/40 shadow-xs flex items-center justify-center text-[#0d4f3c]">
              {isProcessing ? (
                <RefreshCw size={22} className="animate-spin text-[#0d4f3c]" />
              ) : (
                <Upload size={22} strokeWidth={1.75} />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-[#1e1b18]">
                {isProcessing
                  ? "Processing and archiving images to storage..."
                  : "Click to select photos from device or drag and drop here"}
              </p>
              <p className="text-[11px] text-[#6b6257] mt-0.5">
                Multiple selection supported · JPG, PNG, WEBP · Up to 10MB per photo
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d4f3c] text-white text-[11px] font-bold shadow-xs">
              <ImageIcon size={13} />
              <span>Browse Device Photos ({slotsRemaining} slots remaining)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-[#0d4f3c]/20 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-[#0d4f3c] flex items-center justify-center gap-1.5">
            <CheckCircle2 size={15} /> All 10 photo slots filled
          </p>
          <p className="text-[11px] text-[#6b6257] mt-0.5">
            Maximum capacity reached. You can replace, rearrange, or delete any photo using the controls below.
          </p>
        </div>
      )}

      {/* Uploaded Images Grid */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#6b6257]">
            <span>Uploaded Photos for {productTitle}</span>
            <span>Rearrange or set main cover below</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((imgUrl, idx) => {
              const isCover = idx === 0;
              const isHover = idx === 1;

              return (
                <div
                  key={`${imgUrl.slice(0, 40)}_${idx}`}
                  className={`relative group bg-white rounded-xl border overflow-hidden shadow-2xs transition-all flex flex-col ${
                    isCover
                      ? "border-[#0d4f3c] ring-2 ring-[#0d4f3c]/20"
                      : "border-[#e0d7cb] hover:border-[#8c8275]"
                  }`}
                >
                  {/* Image View */}
                  <div className="relative aspect-3/4 bg-[#f2ece4] overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={`Product photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Position and Role Badge */}
                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
                      {isCover ? (
                        <span className="bg-[#0d4f3c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                          <Star size={9} fill="currentColor" /> Cover
                        </span>
                      ) : isHover ? (
                        <span className="bg-[#253630] text-[#d4af37] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          Hover #2
                        </span>
                      ) : (
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          #{idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Zoom / Full Preview trigger */}
                    <button
                      type="button"
                      onClick={() => setPreviewModalUrl(imgUrl)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 hover:bg-black"
                      title="Enlarge preview"
                    >
                      <Maximize2 size={11} />
                    </button>
                  </div>

                  {/* Card Actions Bar */}
                  <div className="p-1.5 bg-[#faf8f5] border-t border-[#e5ded6] flex flex-col gap-1">
                    {/* Primary actions row */}
                    <div className="flex items-center justify-between gap-1">
                      {/* Replace */}
                      <button
                        type="button"
                        onClick={() => handleTriggerReplace(idx)}
                        disabled={isProcessing}
                        className="flex-1 text-[10px] font-bold text-[#0d4f3c] hover:bg-[#0d4f3c]/10 py-1 px-1.5 rounded transition-colors flex items-center justify-center gap-1 border border-[#0d4f3c]/30"
                        title="Replace this image from device"
                      >
                        <RefreshCw size={10} />
                        <span>Replace</span>
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        disabled={isProcessing}
                        className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors border border-red-200"
                        title="Remove photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Secondary row: Reorder & Make Cover */}
                    <div className="flex items-center justify-between gap-0.5 pt-0.5 border-t border-[#eee7de]">
                      {!isCover ? (
                        <button
                          type="button"
                          onClick={() => handleSetAsCover(idx)}
                          className="text-[9px] font-bold text-[#8c8275] hover:text-[#0d4f3c] py-0.5 px-1 rounded flex items-center gap-0.5"
                          title="Promote to main cover image"
                        >
                          <Star size={9} /> Set Cover
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-[#0d4f3c] py-0.5 px-1">
                          Primary
                        </span>
                      )}

                      <div className="flex items-center gap-0.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "left")}
                          disabled={idx === 0}
                          className="p-1 text-[#6b6257] hover:text-black disabled:opacity-30"
                          title="Move left"
                        >
                          <ArrowLeft size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "right")}
                          disabled={idx === images.length - 1}
                          className="p-1 text-[#6b6257] hover:text-black disabled:opacity-30"
                          title="Move right"
                        >
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#faf8f5] rounded-xl border border-[#e5ded6] p-4 text-center">
          <p className="text-xs text-[#6b6257]">
            No photos uploaded yet for this product. Use the button above to upload photos from your device.
          </p>
        </div>
      )}

      {/* Modal Preview */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-[#121916] rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-2">
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              <X size={18} />
            </button>
            <img
              src={previewModalUrl}
              alt="High resolution preview"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;
