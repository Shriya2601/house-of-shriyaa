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
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { testCustomCredentials } from "../../services/shiprocketClient";

interface ShiprocketConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailInput: string;
  setEmailInput: (val: string) => void;
  pickupInput: string;
  setPickupInput: (val: string) => void;
  passwordInput?: string;
  setPasswordInput?: (val: string) => void;
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
  passwordInput = "",
  setPasswordInput,
  onSave,
  status,
}: ShiprocketConfigModalProps) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localPassword, setLocalPassword] = useState(passwordInput);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    locations?: any[];
  } | null>(null);

  if (!isOpen) return null;

  const handlePasswordChange = (val: string) => {
    setLocalPassword(val);
    if (setPasswordInput) {
      setPasswordInput(val);
    }
  };

  const handleTestConnection = async () => {
    if (!emailInput.trim()) {
      setTestResult({ success: false, message: "Please enter your Shiprocket API User Email." });
      return;
    }
    if (!localPassword.trim()) {
      setTestResult({ success: false, message: "Please enter your Shiprocket API User Password to test connection." });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testCustomCredentials({
        email: emailInput.trim(),
        password: localPassword.trim(),
      });
      setTestResult(res);
      if (res.success && res.locations && res.locations.length > 0 && !pickupInput) {
        setPickupInput(res.locations[0].pickup_location);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Failed to reach Shiprocket API." });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
                {status?.message || "Enter your Shiprocket API credentials below to enable automated dispatch."}
              </p>
            </div>
          </div>

          {/* Field: API User Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Mail size={13} className="text-[#0d4f3c]" />
              <span>Shiprocket API User Email *</span>
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. shriya.pusha@sharepal.in"
              className="w-full bg-[#fcfaf7] border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:bg-white focus:outline-hidden"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              The email of the API user created in your Shiprocket dashboard.
            </span>
          </div>

          {/* Field: API User Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Key size={13} className="text-[#0d4f3c]" />
              <span>Shiprocket API User Password *</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={localPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter Shiprocket API User password"
                className="w-full bg-[#fcfaf7] border border-[#d6ccc2] rounded-lg p-2.5 pr-10 text-xs text-stone-800 focus:border-[#0d4f3c] focus:bg-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Configured under Shiprocket &gt; Settings &gt; API &gt; Configure API Users.
            </span>
          </div>

          {/* Field: Pickup Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-[#0d4f3c]" />
              <span>Pickup Location Nickname</span>
            </label>
            <input
              type="text"
              required
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value)}
              placeholder="Primary (or your exact Shiprocket pickup nickname)"
              className="w-full bg-[#fcfaf7] border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:bg-white focus:outline-hidden"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Default is usually <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">Primary</code> or your registered Atelier address nickname.
            </span>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin text-[#0d4f3c]" : ""} />
              {testing ? "Testing Shiprocket Credentials..." : "Test Connection with Shiprocket API"}
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
                  <span>{testResult.success ? "Connection Verified!" : "Verification Failed"}</span>
                </div>
                <p className="mt-1 text-[11px]">{testResult.message}</p>
                {testResult.locations && testResult.locations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 text-[11px]">
                    <span className="font-bold block mb-1">Available Pickup Addresses in Shiprocket:</span>
                    <ul className="space-y-1">
                      {testResult.locations.map((loc, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span>{loc.pickup_location} ({loc.city}, {loc.state})</span>
                          <button
                            type="button"
                            onClick={() => setPickupInput(loc.pickup_location)}
                            className="text-[#0d4f3c] underline font-semibold hover:text-[#083528]"
                          >
                            Use this
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step-by-Step Info Box */}
          <div className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl p-3.5 text-xs space-y-2">
            <span className="font-bold text-stone-800 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-[#0d4f3c]" />
              <span>Where to find Shiprocket API Credentials</span>
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 leading-relaxed">
              <li>
                In <a href="https://app.shiprocket.in" target="_blank" rel="noreferrer" className="text-[#0d4f3c] underline font-medium">app.shiprocket.in</a>, go to <strong>Settings &gt; API &gt; Configure API Users</strong>.
              </li>
              <li>
                Click <strong>Add New User</strong> or check existing API User Email and set/view the password.
              </li>
              <li>
                Enter the email and password above and click <strong>Save Settings</strong>. All orders will now automatically push to Shiprocket!
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
              className="px-5 py-2 bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "Verifying & Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
