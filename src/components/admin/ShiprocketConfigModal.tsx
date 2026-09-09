import React, { useState } from "react";
import {
  X,
  SlidersHorizontal,
  Mail,
  MapPin,
  Key,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { fetchShiprocketStatus, saveShiprocketConfig } from "../../services/shiprocketClient";

interface ShiprocketConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupInput: string;
  setPickupInput: (val: string) => void;
  status: any;
  onRefreshStatus: () => void;
}

export default function ShiprocketConfigModal({
  isOpen,
  onClose,
  pickupInput,
  setPickupInput,
  status,
  onRefreshStatus,
}: ShiprocketConfigModalProps) {
  const [testing, setTesting] = useState(false);
  const [savingPickup, setSavingPickup] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchShiprocketStatus();
      setTestResult(res);
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to reach Shiprocket backend endpoint.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSavePickupLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupInput.trim()) return;
    setSavingPickup(true);
    try {
      await saveShiprocketConfig({ pickupLocation: pickupInput.trim() });
      onRefreshStatus();
    } finally {
      setSavingPickup(false);
    }
  };

  const isConfigured = Boolean(status?.hasKey || status?.isConfigured || status?.success);

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
                Shiprocket Environment & API Status
              </h3>
              <p className="text-xs text-stone-500">
                Backend environment variables and dispatch verification
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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Indicator */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              status?.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : isConfigured
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-stone-100 border-stone-200 text-stone-800"
            }`}
          >
            {status?.success ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">
                {status?.success
                  ? "Shiprocket API Connected & Verified"
                  : isConfigured
                  ? "Credentials Detected in Environment"
                  : "Environment Variables Required"}
              </span>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                {status?.message ||
                  "The backend reads Shiprocket credentials securely via server environment variables."}
              </p>
            </div>
          </div>

          {/* Environment Variables Inspection Card */}
          <div className="border border-[#e5ddd3] rounded-xl overflow-hidden bg-[#faf7f2]">
            <div className="px-3.5 py-2 bg-stone-100 border-b border-[#e5ddd3] flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={12} className="text-[#0d4f3c]" />
                Backend Environment Variables
              </span>
              <span className="text-[10px] text-stone-500 font-mono">Server-Side Only</span>
            </div>

            <div className="p-3.5 space-y-2.5 text-xs">
              {/* SHIPROCKET_API_EMAIL */}
              <div className="flex items-center justify-between pb-2 border-b border-[#e5ddd3]">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-stone-500" />
                  <code className="font-mono text-[11px] font-semibold text-stone-800">
                    SHIPROCKET_API_EMAIL
                  </code>
                </div>
                <div>
                  {status?.emailMasked ? (
                    <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {status.emailMasked}
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-mono bg-stone-200/70 px-2 py-0.5 rounded">
                      Not Set
                    </span>
                  )}
                </div>
              </div>

              {/* SHIPROCKET_API_PASSWORD */}
              <div className="flex items-center justify-between pb-2 border-b border-[#e5ddd3]">
                <div className="flex items-center gap-2">
                  <Key size={13} className="text-stone-500" />
                  <code className="font-mono text-[11px] font-semibold text-stone-800">
                    SHIPROCKET_API_PASSWORD
                  </code>
                </div>
                <div>
                  {status?.hasKey ? (
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                      Configured on Server
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-mono bg-stone-200/70 px-2 py-0.5 rounded">
                      Not Set
                    </span>
                  )}
                </div>
              </div>

              {/* SHIPROCKET_PICKUP_LOCATION */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-stone-500" />
                  <code className="font-mono text-[11px] font-semibold text-stone-800">
                    SHIPROCKET_PICKUP_LOCATION
                  </code>
                </div>
                <div className="font-mono text-[11px] text-stone-700 bg-stone-200/70 px-2 py-0.5 rounded">
                  {status?.details?.pickupLocationConfigured || pickupInput || "Home"}
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Location Nickname Form */}
          <form onSubmit={handleSavePickupLocation} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#0d4f3c]" />
                <span>Pickup Location Nickname</span>
              </label>
              {status?.details?.availablePickupLocations?.length > 0 && (
                <span className="text-[10px] text-stone-500">
                  {status.details.availablePickupLocations.length} registered in Shiprocket
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={pickupInput}
                onChange={(e) => setPickupInput(e.target.value)}
                placeholder="e.g. Home or Primary"
                className="flex-1 bg-[#fcfaf7] border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={savingPickup || !pickupInput.trim()}
                className="px-3.5 py-2 bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingPickup ? "Saving..." : "Set Nickname"}
              </button>
            </div>

            {status?.details?.availablePickupLocations?.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {status.details.availablePickupLocations.map((loc: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPickupInput(loc.name)}
                    className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-2 py-0.5 rounded cursor-pointer font-medium"
                  >
                    Use "{loc.name}" ({loc.city})
                  </button>
                ))}
              </div>
            )}
            <span className="text-[11px] text-stone-500 block">
              Matches the exact nickname registered in your Shiprocket panel under Settings &gt; Pickup Addresses.
            </span>
          </form>

          {/* Test Live Connection Button & Result */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin text-[#0d4f3c]" : ""} />
              {testing ? "Testing Backend Authentication..." : "Test Backend Connection to Shiprocket"}
            </button>

            {testResult && (
              <div
                className={`mt-2.5 p-3 rounded-xl border text-xs ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 size={14} className="text-emerald-700" />
                  ) : (
                    <AlertCircle size={14} className="text-rose-700" />
                  )}
                  <span>
                    {testResult.success ? "Live Connection Verified!" : "Verification Result"}
                  </span>
                </div>
                <p className="mt-1 text-[11px]">{testResult.message}</p>
              </div>
            )}
          </div>

          {/* Configuration Instructions */}
          <div className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl p-3.5 text-xs space-y-2">
            <span className="font-bold text-stone-800 flex items-center justify-between">
              <span>Setting Up Environment Variables</span>
              <a
                href="https://app.shiprocket.in"
                target="_blank"
                rel="noreferrer"
                className="text-[#0d4f3c] inline-flex items-center gap-1 hover:underline text-[11px]"
              >
                <span>Shiprocket Panel</span>
                <ExternalLink size={11} />
              </a>
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 leading-relaxed">
              <li>
                In Shiprocket, navigate to <strong>Settings &gt; API &gt; Configure API Users</strong>.
              </li>
              <li>
                Note your API User Email and generate/retrieve your API User Password.
              </li>
              <li>
                Provide <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">SHIPROCKET_API_EMAIL</code> and{" "}
                <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">SHIPROCKET_API_PASSWORD</code> in your environment settings.
              </li>
              <li>
                The backend automatically uses these credentials for all automated order dispatches and logs every event in the Dispatch &amp; Response Logs.
              </li>
            </ol>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 border-t border-[#e5ddd3] bg-[#fcfaf7] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
