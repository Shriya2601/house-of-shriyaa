import React, { useState } from "react";
import {
  X,
  SlidersHorizontal,
  Mail,
  MapPin,
  Key,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface ShiprocketConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailInput: string;
  setEmailInput: (val: string) => void;
  pickupInput: string;
  setPickupInput: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
  status: any;
}

export default function ShiprocketConfigModal({
  isOpen,
  onClose,
  emailInput,
  setEmailInput,
  pickupInput,
  setPickupInput,
  onSave,
  status,
}: ShiprocketConfigModalProps) {
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    setSaving(true);
    try {
      await onSave(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg bg-white text-stone-900 rounded-2xl shadow-2xl border border-[#e5ddd3] overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between bg-[#fcfaf7]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0d4f3c] text-[#d4af37] flex items-center justify-center">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                Shiprocket API Configuration
              </h3>
              <p className="text-xs text-stone-500">
                Automate order sync, courier selection, and AWB generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Status Indicator */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
              status?.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {status?.success ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold block">
                {status?.success ? "Active Shiprocket Integration" : "Configuration Status"}
              </span>
              <p className="text-[11px] mt-0.5">
                {status?.message || "API key loaded. Ensure API user email matches your Shiprocket credentials."}
              </p>
            </div>
          </div>

          {/* Field: API User Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Mail size={13} className="text-[#0d4f3c]" />
              <span>Shiprocket API User Email</span>
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. shriya.pusha@sharepal.in"
              className="w-full bg-[#fcfaf7] border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:bg-white focus:outline-none"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              The email of the API user created in your Shiprocket dashboard.
            </span>
          </div>

          {/* Field: Pickup Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-[#0d4f3c]" />
              <span>Pickup Location Name</span>
            </label>
            <input
              type="text"
              required
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value)}
              placeholder="Primary (or your exact Shiprocket pickup nickname)"
              className="w-full bg-[#fcfaf7] border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:bg-white focus:outline-none"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Default is usually <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">Primary</code> or your registered Surat Atelier address nickname.
            </span>
          </div>

          {/* Step-by-Step Info Accordion / Box */}
          <div className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl p-3.5 text-xs space-y-2">
            <span className="font-bold text-stone-800 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-[#0d4f3c]" />
              <span>How Shiprocket API Works</span>
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 leading-relaxed">
              <li>
                In <a href="https://app.shiprocket.in" target="_blank" rel="noreferrer" className="text-[#0d4f3c] underline font-medium">app.shiprocket.in</a>, go to <strong>Settings &gt; API &gt; Configure API Users</strong>.
              </li>
              <li>
                Create or check your API user email &amp; generate/view your API credentials.
              </li>
              <li>
                Orders placed in boutique or admin portal will automatically create an order in Shiprocket and generate your AWB tracking code.
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#e5ddd3] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "Verifying & Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
