import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Megaphone,
  Layers,
  Crown,
  Info,
  ExternalLink,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { saveSiteContent, defaultSiteContent } from "../../services/storeService";
import { SiteContent } from "../../types";

interface AdminContentManagerProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AdminContentManager({ showToast }: AdminContentManagerProps) {
  const { siteContent } = useStore();
  const [formData, setFormData] = useState<SiteContent>(defaultSiteContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (isDirtyRef.current || isSaving) return;
    if (siteContent) {
      setFormData({
        ...defaultSiteContent,
        ...siteContent,
      });
    }
  }, [siteContent, isSaving]);

  useEffect(() => {
    const handleLiveSync = (e: any) => {
      if (isDirtyRef.current || isSaving) return;
      if (e.detail) {
        setFormData({
          ...defaultSiteContent,
          ...e.detail,
        });
      }
    };
    window.addEventListener("hos-content-updated", handleLiveSync);
    return () => window.removeEventListener("hos-content-updated", handleLiveSync);
  }, [isSaving]);

  // Debounced auto-save: automatically persist changes after typing ceases
  useEffect(() => {
    if (!isDirty || isSaving) return;
    const timer = setTimeout(async () => {
      try {
        const { heroSlides: _unused, ...safeContent } = formData;
        await saveSiteContent(safeContent);
        isDirtyRef.current = false;
        setIsDirty(false);
      } catch (err) {
        console.warn("Auto-save content warning:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isDirty, formData, isSaving]);

  const handleChange = (field: keyof SiteContent, value: any) => {
    setIsDirty(true);
    isDirtyRef.current = true;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      // Exclude heroSlides from AdminContentManager so it never overwrites banners
      const { heroSlides: _unused, ...safeContent } = formData;
      await saveSiteContent(safeContent);
      isDirtyRef.current = false;
      setIsDirty(false);
      showToast("Website content published live to Firebase & storefront!", "success");
    } catch (err: any) {
      console.error("Save content error:", err);
      showToast("Failed to save content: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm("Reset all website text content to defaults?")) return;
    setFormData((prev) => ({
      ...defaultSiteContent,
      heroSlides: prev.heroSlides, // Preserve banners safely
    }));
    setIsDirty(true);
    isDirtyRef.current = true;
    showToast("Content restored to defaults. Click 'Publish All Changes' to apply.", "info");
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-[#0d4f3c]/10 text-[#0d4f3c] rounded-xl">
            <FileText size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-lg text-[#1e1b18]">
                Website Content & Live CMS
              </h2>
              {isDirty ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertCircle size={10} /> Unsaved edits
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 size={10} /> Live on storefront
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Edit announcement ribbon, brand story, atelier concierge details, and headings. Changes sync instantly across all devices without redeploying.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-medium text-stone-700 hover:text-[#0d4f3c] hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors flex items-center gap-1.5"
          >
            <span>Preview Live Site</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              isDirty
                ? "bg-[#0d4f3c] hover:bg-[#0b3f30] ring-2 ring-emerald-400 ring-offset-1 animate-pulse"
                : "bg-[#0d4f3c] hover:bg-[#0b3f30]"
            }`}
          >
            <Save size={14} />
            <span>{isSaving ? "Publishing to Live Site..." : "Publish All Changes"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Announcement & Brand Story (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Announcement Ribbon Section */}
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Megaphone size={16} className="text-[#0d4f3c]" />
                <h3 className="font-serif font-bold text-sm text-[#1e1b18]">
                  Top Announcement Ribbon
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                <span>Display on Storefront:</span>
                <input
                  type="checkbox"
                  checked={formData.announcementVisible}
                  onChange={(e) => handleChange("announcementVisible", e.target.checked)}
                  className="w-4 h-4 text-[#0d4f3c] rounded border-stone-300 focus:ring-[#0d4f3c] cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Headline Announcement Text
                </label>
                <input
                  type="text"
                  value={formData.announcementText || ""}
                  onChange={(e) => handleChange("announcementText", e.target.value)}
                  placeholder="e.g. Complimentary Luxury Packaging on all Festive Ensembles"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Call-to-Action (CTA) Label
                </label>
                <input
                  type="text"
                  value={formData.announcementCta || ""}
                  onChange={(e) => handleChange("announcementCta", e.target.value)}
                  placeholder="e.g. Shop Festive Edits"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-2.5 rounded-lg bg-[#0d4f3c] text-white text-center text-xs flex items-center justify-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              <span>
                {formData.announcementText || "Handcrafted Unstitched Heirlooms"} ·{" "}
                <span className="underline decoration-[#d4af37] font-bold">
                  {formData.announcementCta || "Shop Now"}
                </span>
              </span>
            </div>
          </div>

          {/* Brand Story & Tagline */}
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Crown size={16} className="text-[#0d4f3c]" />
              <h3 className="font-serif font-bold text-sm text-[#1e1b18]">
                Brand Identity & Heritage Story
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Main Brand Tagline
              </label>
              <input
                type="text"
                value={formData.brandTagline || ""}
                onChange={(e) => handleChange("brandTagline", e.target.value)}
                placeholder="Heirloom Indian Couture, Reimagined for the Modern Connoisseur"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Brand Description & Atelier Introduction
              </label>
              <textarea
                rows={3}
                value={formData.brandDescription || ""}
                onChange={(e) => handleChange("brandDescription", e.target.value)}
                placeholder="Rooted in centuries-old artisanal traditions..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
              />
            </div>
          </div>

          {/* Catalog Section Headings */}
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Layers size={16} className="text-[#0d4f3c]" />
              <h3 className="font-serif font-bold text-sm text-[#1e1b18]">
                Storefront Catalog Section Headings
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Catalog Main Title
                </label>
                <input
                  type="text"
                  value={formData.catalogTitle || ""}
                  onChange={(e) => handleChange("catalogTitle", e.target.value)}
                  placeholder="Grand Boutique Catalog"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Catalog Subtitle
                </label>
                <input
                  type="text"
                  value={formData.catalogSubtitle || ""}
                  onChange={(e) => handleChange("catalogSubtitle", e.target.value)}
                  placeholder="Curated unstitched luxury fabrics and handwoven silhouettes"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Atelier Contacts & Footer (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Atelier Concierge & Contacts */}
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <MessageCircle size={16} className="text-[#0d4f3c]" />
              <h3 className="font-serif font-bold text-sm text-[#1e1b18]">
                Atelier Concierge & Customer Contacts
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <MessageCircle size={13} className="text-emerald-600" />
                <span>WhatsApp Concierge Phone (with country code)</span>
              </label>
              <input
                type="text"
                value={formData.whatsappNumber || ""}
                onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                placeholder="+919501698356"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Customers clicking &quot;WhatsApp Concierge&quot; or &quot;Order on WhatsApp&quot; will be routed here.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <Phone size={13} className="text-stone-600" />
                <span>Display Calling Phone</span>
              </label>
              <input
                type="text"
                value={formData.contactPhone || ""}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                placeholder="+91 95016 98356"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <Mail size={13} className="text-stone-600" />
                <span>Support Email Address</span>
              </label>
              <input
                type="email"
                value={formData.contactEmail || ""}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                placeholder="care@houseofshriya.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-stone-600" />
                <span>Atelier City / Origin</span>
              </label>
              <input
                type="text"
                value={formData.atelierCity || ""}
                onChange={(e) => handleChange("atelierCity", e.target.value)}
                placeholder="Surat, Gujarat, India"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
              />
            </div>
          </div>

          {/* Footer & Copyright Note */}
          <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Info size={16} className="text-[#0d4f3c]" />
              <h3 className="font-serif font-bold text-sm text-[#1e1b18]">
                Footer Note & Copyright
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Footer Copyright Text
              </label>
              <input
                type="text"
                value={formData.footerNote || ""}
                onChange={(e) => handleChange("footerNote", e.target.value)}
                placeholder="House of Shriya © 2026. All rights reserved. Handcrafted with reverence in India."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
              />
            </div>
          </div>

          {/* Quick Save Card */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
            <span>Ready to publish changes?</span>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-4 py-2 bg-[#0d4f3c] hover:bg-[#0b3f30] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save size={13} />
              <span>{isSaving ? "Saving..." : "Save Now"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
