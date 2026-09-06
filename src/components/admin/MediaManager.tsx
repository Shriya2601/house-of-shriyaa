import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Copy,
  Check,
  Maximize2,
  X,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  ArrowUpRight,
  HardDrive,
  FileImage,
} from "lucide-react";
import { UploadedAsset, Product } from "../../types";
import {
  subscribeUploadedAssets,
  uploadSingleImageFromDevice,
  deleteMediaAsset,
  UploadProgress,
  MAX_IMAGE_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
} from "../../services/imageUploadService";
import { subscribeProducts } from "../../services/storeService";

export const MediaManager: React.FC = () => {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Success and error banners
  const [uploadSuccess, setUploadSuccess] = useState<{
    fileName: string;
    url: string;
    sizeKb: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals & previews
  const [previewAsset, setPreviewAsset] = useState<UploadedAsset | null>(null);
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<UploadedAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagProductId, setTagProductId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to uploaded assets and products
  useEffect(() => {
    const unsubAssets = subscribeUploadedAssets((assetList) => {
      setAssets(assetList);
    }, 100);

    const unsubProducts = subscribeProducts((productList) => {
      setProducts(productList);
    });

    return () => {
      unsubAssets();
      unsubProducts();
    };
  }, []);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || a.name.toLowerCase().includes(q) || (a.productId && a.productId.toLowerCase().includes(q));
      const matchesProduct = selectedProductFilter === "all" || a.productId === selectedProductFilter;
      return matchesSearch && matchesProduct;
    });
  }, [assets, searchQuery, selectedProductFilter]);

  // Aggregate storage metrics
  const totalSizeBytes = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.size || 0), 0);
  }, [assets]);

  const formattedTotalSize = useMemo(() => {
    if (totalSizeBytes > 1024 * 1024) {
      return `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(totalSizeBytes / 1024)} KB`;
  }, [totalSizeBytes]);

  // Handle single file upload
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const result = await uploadSingleImageFromDevice(
        file,
        { productId: tagProductId || undefined },
        (progress) => setUploadProgress(progress)
      );

      if (result.success && result.asset) {
        setUploadSuccess({
          fileName: result.asset.name,
          url: result.asset.dataUrl,
          sizeKb: Math.round(result.asset.size / 1024),
        });
      } else {
        setUploadError(result.error || "Failed to upload image.");
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during image processing.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Confirm delete image
  const handleDeleteImage = async () => {
    if (!deleteConfirmAsset) return;
    try {
      await deleteMediaAsset(deleteConfirmAsset.id, deleteConfirmAsset.dataUrl, deleteConfirmAsset.name);
      setAssets((prev) => prev.filter((a) => a.id !== deleteConfirmAsset.id));
      setDeleteConfirmAsset(null);
    } catch {
      setUploadError("Failed to remove image asset.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Storage Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Media Library Assets</span>
            <ImageIcon size={16} className="text-[#d4af37]" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">{assets.length}</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Uploaded suit photos &amp; banners</div>
        </div>

        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Library Footprint</span>
            <HardDrive size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-300 tracking-tight">{formattedTotalSize}</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">WebP high-res compression</div>
        </div>

        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Storage Format</span>
            <FileImage size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-300 tracking-tight">WebP / JPG</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Retina 1100px canvas scale</div>
        </div>

        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Storage Backend</span>
            <CheckCircle2 size={16} className="text-[#d4af37]" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#d4af37] tracking-tight">Direct Cloud</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Firestore &amp; Edge storage</div>
        </div>
      </div>

      {/* Reliable Image Upload Flow Zone */}
      <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#22332c] pb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <UploadCloud size={20} className="text-[#d4af37]" />
              <span>Reliable Media Upload Flow</span>
            </h3>
            <p className="text-xs text-[#8fa398] mt-0.5">
              Upload suit piece photography, lookbooks, or editorial banners. Automatically optimized with zero loss in embroidery detail.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8fa398]">Tag Suit Set:</span>
            <select
              value={tagProductId}
              onChange={(e) => setTagProductId(e.target.value)}
              className="px-3 py-1.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-xs text-[#cfc8bc] focus:outline-none focus:border-[#d4af37]"
            >
              <option value="">General Media Asset</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.slice(0, 30)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Success Message Banner */}
        {uploadSuccess && (
          <div className="flex items-center justify-between p-4 bg-emerald-950/70 border border-emerald-700/60 rounded-xl text-emerald-100 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden border border-emerald-600/40 flex-shrink-0">
                <img src={uploadSuccess.url} alt="Uploaded" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Image Uploaded &amp; Optimized Successfully!</span>
                </div>
                <div className="text-[11px] text-emerald-200/80 mt-0.5">
                  {uploadSuccess.fileName} &bull; {uploadSuccess.sizeKb} KB &bull; Saved to persistent storage
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyUrl(uploadSuccess.url, "upload_success")}
                className="px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedId === "upload_success" ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedId === "upload_success" ? "Copied!" : "Copy URL"}</span>
              </button>
              <button onClick={() => setUploadSuccess(null)} className="p-1 text-emerald-300 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Clear Error Message Banner */}
        {uploadError && (
          <div className="flex items-center justify-between p-4 bg-red-950/70 border border-red-700/60 rounded-xl text-red-100 animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-red-300">Upload Validation Error</div>
                <div className="text-[11px] text-red-200/90 mt-0.5">{uploadError}</div>
              </div>
            </div>
            <button onClick={() => setUploadError(null)} className="p-1 text-red-300 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[#d4af37] bg-[#d4af37]/10"
              : "border-[#2b3e36] bg-[#0d1613] hover:border-[#d4af37]/60 hover:bg-[#131f1a]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1a2b24] border border-[#2e473b] flex items-center justify-center text-[#d4af37] shadow-inner">
              {isUploading ? (
                <RefreshCw size={26} className="animate-spin text-[#d4af37]" />
              ) : (
                <UploadCloud size={28} />
              )}
            </div>

            <div>
              <div className="text-sm font-bold text-white">
                {isUploading ? "Processing & Optimizing Image..." : "Click or drag & drop suit photos here"}
              </div>
              <p className="text-xs text-[#8fa398] mt-1">
                Supports JPG, PNG, and WebP up to 10MB. Automatically scales to retina standard.
              </p>
            </div>

            {/* Real-time progress bar */}
            {isUploading && uploadProgress && (
              <div className="pt-2 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-xs text-[#cfc8bc]">
                  <span className="truncate max-w-[200px]">{uploadProgress.fileName}</span>
                  <span className="font-semibold text-[#d4af37]">{uploadProgress.percent}%</span>
                </div>
                <div className="w-full bg-[#1e2d27] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#d4af37] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Gallery Controls: Search, Filters */}
      <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8c83]" />
            <input
              type="text"
              placeholder="Search media by filename, suit title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#7a8c83] focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-xs font-semibold text-[#cfc8bc] focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Associated Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.slice(0, 25)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Media Gallery Grid */}
      <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs uppercase font-semibold text-[#8fa398] tracking-wider">
            Uploaded Media Assets ({filteredAssets.length})
          </h4>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-16 text-center text-[#7a8c83]">
            <ImageIcon size={36} className="mx-auto mb-2 text-[#465a51] opacity-50" />
            <p className="text-sm font-medium text-white">No media assets found</p>
            <p className="text-xs text-[#7a8c83] mt-0.5">Upload high-resolution photos using the drag-and-drop zone above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredAssets.map((asset) => {
              const matchedProd = products.find((p) => p.id === asset.productId);
              return (
                <div
                  key={asset.id}
                  className="group relative bg-[#0d1613] border border-[#22332c] hover:border-[#d4af37]/60 rounded-xl overflow-hidden flex flex-col transition shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] bg-black/40 overflow-hidden">
                    <img
                      src={asset.dataUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Quick action overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => setPreviewAsset(asset)}
                        className="p-2 rounded-lg bg-black/70 hover:bg-[#d4af37] text-white hover:text-black transition"
                        title="View full size"
                      >
                        <Maximize2 size={14} />
                      </button>

                      <button
                        onClick={() => handleCopyUrl(asset.dataUrl, asset.id)}
                        className="p-2 rounded-lg bg-black/70 hover:bg-[#0d4f3c] text-white transition"
                        title="Copy image URL"
                      >
                        {copiedId === asset.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={() => setDeleteConfirmAsset(asset)}
                        className="p-2 rounded-lg bg-black/70 hover:bg-red-600 text-white transition"
                        title="Remove image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Size badge */}
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-[#d4af37]">
                      {Math.round(asset.size / 1024)} KB
                    </div>
                  </div>

                  {/* Asset info */}
                  <div className="p-2.5 flex flex-col justify-between flex-1 text-xs">
                    <div className="truncate font-medium text-white" title={asset.name}>
                      {asset.name}
                    </div>
                    <div className="text-[10px] text-[#7a8c83] mt-1 flex items-center justify-between">
                      <span>{new Date(asset.createdAt).toLocaleDateString("en-IN")}</span>
                      {matchedProd ? (
                        <span className="truncate max-w-[80px] text-[#d4af37]" title={matchedProd.name}>
                          {matchedProd.name}
                        </span>
                      ) : (
                        <span>General</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Size Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#121c18] border border-[#22332c] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#22332c] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white truncate max-w-md">{previewAsset.name}</h4>
                <div className="text-xs text-[#8fa398] mt-0.5">
                  Size: {Math.round(previewAsset.size / 1024)} KB &bull; Type: {previewAsset.type || "image/webp"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyUrl(previewAsset.dataUrl, "modal_preview")}
                  className="px-3 py-1.5 bg-[#0d4f3c] hover:bg-[#12634d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#d4af37]/40"
                >
                  {copiedId === "modal_preview" ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedId === "modal_preview" ? "Copied!" : "Copy URL"}</span>
                </button>
                <button onClick={() => setPreviewAsset(null)} className="text-[#8fa398] hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex items-center justify-center max-h-[75vh]">
              <img
                src={previewAsset.dataUrl}
                alt={previewAsset.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c18] border border-red-900/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Image Asset?</h3>
                <p className="text-xs text-[#8fa398]">This image will be permanently deleted from Firestore and server storage.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#0d1613] p-3 rounded-xl border border-[#22332c]">
              <div className="w-12 h-12 rounded-lg bg-black/50 overflow-hidden flex-shrink-0">
                <img src={deleteConfirmAsset.dataUrl} alt={deleteConfirmAsset.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-xs truncate">
                <div className="font-semibold text-white truncate">{deleteConfirmAsset.name}</div>
                <div className="text-[#8fa398]">{Math.round(deleteConfirmAsset.size / 1024)} KB</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmAsset(null)}
                className="px-4 py-2 text-xs font-medium text-[#8fa398] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteImage}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                <Trash2 size={13} />
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
