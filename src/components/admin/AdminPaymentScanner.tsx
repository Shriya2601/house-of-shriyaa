import React, { useState, useRef, useEffect } from "react";
import {
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Link,
  Trash2,
  Lock,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { saveSiteContent } from "../../services/storeService";
import { storage, ref, uploadString, getDownloadURL } from "../../lib/firebase";
import { normalizeImageUrl } from "../../utils/imageUtils";

interface AdminPaymentScannerProps {
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function AdminPaymentScanner({ showToast }: AdminPaymentScannerProps) {
  const { siteContent } = useStore();
  const [scannerUrl, setScannerUrl] = useState<string>(
    siteContent?.upiScannerUrl || ""
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (siteContent?.upiScannerUrl !== undefined && !isSaving && !isUploading) {
      setScannerUrl(siteContent.upiScannerUrl);
    }
  }, [siteContent?.upiScannerUrl, isSaving, isUploading]);

  // Fallback verified QR if no custom scanner image uploaded yet
  const fallbackQr = "/uploads/house-of-shriya-official-upi-scanner.png";
  const activeScanner = scannerUrl.trim() || siteContent?.upiScannerUrl || fallbackQr;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage =
      (file.type && file.type.startsWith("image/")) ||
      /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file.name);

    if (!isImage) {
      showToast("Please upload a valid image file (PNG, JPG, WEBP, AVIF)", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast("Image size must be under 15MB", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
      });

      // Instant preview
      setScannerUrl(dataUrl);

      // Upload directly to Firebase Storage
      const scannerRef = ref(storage, `payment/scanner-qr-${Date.now()}.jpg`);
      await uploadString(scannerRef, dataUrl, "data_url", { contentType: "image/jpeg" });
      const uploadedUrl = await getDownloadURL(scannerRef);

      setScannerUrl(uploadedUrl);

      // Auto-save to site content so it immediately syncs
      const updated = await saveSiteContent({
        ...siteContent,
        upiScannerUrl: uploadedUrl,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hos-content-updated", { detail: updated })
        );
      }

      showToast("Payment Scanner uploaded & synced live to website!");
    } catch (err: any) {
      showToast(err.message || "Failed to upload scanner image", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveScanner = async () => {
    setIsSaving(true);
    try {
      const updated = await saveSiteContent({
        ...siteContent,
        upiScannerUrl: scannerUrl.trim(),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hos-content-updated", { detail: updated })
        );
      }
      showToast("Payment Scanner settings saved and synced successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to save scanner", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setScannerUrl("");
    setIsSaving(true);
    try {
      const updated = await saveSiteContent({
        ...siteContent,
        upiScannerUrl: "",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hos-content-updated", { detail: updated })
        );
      }
      showToast("Scanner reset to default brand QR!");
    } catch (err: any) {
      showToast(err.message || "Failed to reset scanner", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#fcfbf9] border border-[#e8dfd8] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0d4f3c] text-white">
                <QrCode size={20} />
              </span>
              <div>
                <h2 className="font-serif font-bold text-lg text-[#1e1b18]">
                  Official Payment Scanner (UPI QR Code)
                </h2>
                <p className="text-xs text-[#5a544c]">
                  Manage the official payment scanner shown to customers during checkout and payment confirmation.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Security Badge */}
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2 shrink-0">
            <ShieldCheck size={18} className="text-emerald-700 shrink-0" />
            <div className="text-[11px] leading-tight text-emerald-900">
              <span className="font-bold block">Privacy Guaranteed</span>
              <span className="text-emerald-700">Phone numbers & raw UPI IDs hidden from customers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Live Customer Preview */}
        <div className="bg-white border border-[#e8dfd8] rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-serif font-bold text-sm text-[#1e1b18] flex items-center gap-2">
              <Eye size={16} className="text-[#0d4f3c]" />
              Customer View Preview
            </h3>
            <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
              Live Rendering
            </span>
          </div>

          {/* The Exact Box Seen by Customers */}
          <div className="bg-[#f7f4ee] p-4 rounded-xl border border-[#e8dfd8] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1e1b18] flex items-center gap-1.5">
                <QrCode size={14} className="text-[#0d4f3c]" />
                <span>Scan & Pay via any UPI App</span>
              </span>
              <span className="text-[10px] bg-[#0d4f3c] text-white px-2 py-0.5 rounded-full font-semibold">
                Official Atelier QR
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-stone-200">
              <div className="bg-white p-2 rounded-lg border border-stone-300 shrink-0 shadow-xs">
                <img
                  src={normalizeImageUrl(activeScanner, fallbackQr)}
                  alt="House of Shriya Official Scanner"
                  className="w-32 h-32 object-contain rounded"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackQr;
                  }}
                />
              </div>
              <div className="space-y-1.5 text-xs w-full">
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#0d4f3c]">
                  <Sparkles size={13} className="text-[#d4af37]" />
                  <span>House of Shriya Official Verified QR</span>
                </div>
                <p className="text-[10px] text-stone-600">
                  Open Google Pay, PhonePe, Paytm, CRED, or BHIM, scan this QR code to transfer payment, and submit your 12-digit UTR reference number.
                </p>
                <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-800 font-medium">
                  <Lock size={11} className="text-emerald-700" />
                  <span>Personal account numbers & mobile numbers are protected</span>
                </div>
              </div>
            </div>

            {/* Mock Reference Form */}
            <div className="pt-2 border-t border-stone-200/70 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#1e1b18]">
                Customer Enters 12-Digit Reference (UTR):
              </label>
              <div className="flex gap-2 opacity-80 pointer-events-none">
                <input
                  type="text"
                  placeholder="e.g. 423891029384"
                  readOnly
                  className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#d6ccc2] rounded-lg font-mono text-stone-500"
                />
                <button
                  type="button"
                  className="bg-[#0d4f3c] text-white px-3 py-1.5 rounded-lg font-bold text-xs"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upload & Configuration Controls */}
        <div className="bg-white border border-[#e8dfd8] rounded-2xl p-5 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-sm text-[#1e1b18]">
                Upload or Change Scanner Image
              </h3>
              <p className="text-[11px] text-[#5a544c] mt-0.5">
                Upload a screenshot or photo of your Google Pay, PhonePe, or Paytm merchant QR code.
              </p>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#d6ccc2] hover:border-[#0d4f3c] bg-[#faf8f5] hover:bg-[#f4efe8] rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-[#0d4f3c] flex items-center justify-center">
                {isUploading ? (
                  <RefreshCw size={22} className="animate-spin" />
                ) : (
                  <Upload size={22} />
                )}
              </div>
              <div className="text-xs font-bold text-[#1e1b18]">
                {isUploading ? "Uploading & Syncing Scanner..." : "Click to Upload QR Scanner Image"}
              </div>
              <p className="text-[10px] text-stone-500">
                Supports PNG, JPG, WEBP (Max 8MB). Automatically compressed and optimized.
              </p>
            </div>

            {/* Direct Image URL Option */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1e1b18] flex items-center gap-1">
                <Link size={13} className="text-[#0d4f3c]" />
                <span>Or Custom Image URL / Path</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://... or /uploads/scanner.webp"
                  value={scannerUrl}
                  onChange={(e) => setScannerUrl(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-[#d6ccc2] rounded-xl font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                />
                {scannerUrl && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="p-2 text-stone-400 hover:text-rose-600 border border-stone-200 rounded-xl transition-colors cursor-pointer"
                    title="Clear custom URL"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Instructions box */}
            <div className="bg-[#f4eee6] p-3 rounded-xl border border-[#e8dfd8] text-[11px] text-[#5a544c] space-y-1">
              <div className="font-bold text-[#1e1b18] flex items-center gap-1">
                <CheckCircle2 size={13} className="text-[#0d4f3c]" />
                How the payment flow works:
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                <li>Customer adds items to cart and enters shipping details.</li>
                <li>Customer scans this QR code and pays on their UPI app.</li>
                <li>Customer enters their 12-digit UTR number and places order.</li>
                <li>You see the order and UTR in Admin Portal &gt; Orders.</li>
                <li>You click <strong>"Confirm &amp; Push to Shiprocket"</strong> to dispatch!</li>
              </ol>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="text-xs text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
            >
              Reset to Default QR
            </button>

            <button
              type="button"
              onClick={handleSaveScanner}
              disabled={isSaving || isUploading}
              className="bg-[#0d4f3c] hover:bg-[#083528] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving &amp; Syncing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-[#d4af37]" />
                  <span>Save &amp; Sync Scanner Live</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
