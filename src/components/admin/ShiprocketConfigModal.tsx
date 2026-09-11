import React, { useState, useEffect } from "react";
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
  Eye,
  EyeOff,
  ShieldCheck,
  Save,
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
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTokenField, setShowTokenField] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    if (status?.configuredEmail) {
      setEmailInput(status.configuredEmail);
    } else if (!emailInput) {
      setEmailInput("shriyapusha01@gmail.com");
    }
    if (!passwordInput) {
      setPasswordInput("d1Iq14dVBWxqUVZ8cJO3!f1DLhJCGDRo");
    }
  }, [status?.configuredEmail, status?.hasKey]);

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

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const payload: any = {
        pickupLocation: pickupInput.trim() || "Home",
      };
      if (emailInput.trim()) {
        payload.email = emailInput.trim();
      }
      if (passwordInput.trim()) {
        payload.password = passwordInput.trim();
      }
      if (tokenInput.trim()) {
        payload.token = tokenInput.trim();
      }

      const res = await saveShiprocketConfig(payload);
      if (res.auth) {
        setTestResult(res.auth);
      } else if (res.success) {
        setTestResult({
          success: true,
          message: "Shiprocket credentials saved and verified successfully!",
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Failed to save configuration",
        });
      }
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setSaving(false);
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
      <div className="relative z-10 w-full max-w-xl bg-white text-stone-900 rounded-2xl shadow-2xl border border-[#e5ddd3] overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between bg-[#fcfaf7]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0d4f3c] text-[#d4af37] flex items-center justify-center">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                Shiprocket API & Dispatch Settings
              </h3>
              <p className="text-xs text-stone-500">
                Automated order fulfillment & tracking synchronization
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
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Indicator Banner */}
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
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold block">
                  {status?.success
                    ? "Shiprocket API Connected & Operational"
                    : isConfigured
                    ? "Credentials Stored — Verification Required"
                    : "Shiprocket API Credentials Required"}
                </span>
                {status?.details?.companyName && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                    {status.details.companyName}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                {status?.message ||
                  "The server automatically uses verified Shiprocket credentials for instant order dispatches."}
              </p>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-3.5">
            <div className="p-4 bg-[#faf7f2] border border-[#e5ddd3] rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#e5ddd3]">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#0d4f3c]" />
                  API Credentials
                </span>
                <span className="text-[10px] text-stone-500 font-mono">Backend Secure Vault</span>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
                  <Mail size={12} className="text-stone-500" />
                  Shiprocket API User Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. shriyapusha01@gmail.com"
                  className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:outline-hidden font-mono"
                />
              </div>

              {/* Password / API Key Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
                    <Key size={12} className="text-stone-500" />
                    Shiprocket API Password / Key
                  </label>
                  {status?.hasKey && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      ✓ Active on Server
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={status?.hasKey ? "•••••••••••• (Leave blank to keep current)" : "Enter Shiprocket API Password"}
                    className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2.5 pr-9 text-xs text-stone-800 focus:border-[#0d4f3c] focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span className="text-[10px] text-stone-500 block">
                  Found in Shiprocket under <strong>Settings &gt; API &gt; Configure API Users</strong>.
                </span>
              </div>

              {/* Pickup Location */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
                    <MapPin size={12} className="text-stone-500" />
                    Pickup Location Nickname
                  </label>
                  {status?.details?.availablePickupLocations?.length > 0 && (
                    <span className="text-[10px] text-stone-500">
                      {status.details.availablePickupLocations.length} registered in Shiprocket
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={pickupInput}
                  onChange={(e) => setPickupInput(e.target.value)}
                  placeholder="e.g. Home"
                  className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2.5 text-xs text-stone-800 focus:border-[#0d4f3c] focus:outline-hidden"
                />

                {/* Location Quick Select Pills */}
                {status?.details?.availablePickupLocations?.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {status.details.availablePickupLocations.map((loc: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPickupInput(loc.name)}
                        className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer font-medium ${
                          pickupInput === loc.name
                            ? "bg-[#0d4f3c] text-white border-[#0d4f3c]"
                            : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        ✓ {loc.name} {loc.city ? `(${loc.city})` : ""}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-stone-500 block">
                  Must match the exact pickup address nickname configured in your Shiprocket panel.
                </span>
              </div>

              {/* Optional Advanced Direct Bearer Token Accordion */}
              <div className="pt-1 border-t border-[#e5ddd3]/70">
                <button
                  type="button"
                  onClick={() => setShowTokenField(!showTokenField)}
                  className="text-[11px] text-[#0d4f3c] hover:underline font-medium cursor-pointer flex items-center gap-1"
                >
                  <span>{showTokenField ? "Hide" : "Show"} Direct Token Override (Advanced)</span>
                </button>
                {showTokenField && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste Shiprocket JWT Bearer Token directly..."
                      className="w-full bg-white border border-[#d6ccc2] rounded-lg p-2 text-[11px] text-stone-800 focus:border-[#0d4f3c] focus:outline-hidden font-mono"
                    />
                    <span className="text-[10px] text-stone-500 block">
                      Directly overrides authentication if login attempts are temporarily rate-limited.
                    </span>
                  </div>
                )}
              </div>

              {/* Save & Verify Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !emailInput.trim() || !pickupInput.trim()}
                  className="w-full py-2.5 px-4 bg-[#0d4f3c] hover:bg-[#083528] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving &amp; Verifying with Shiprocket...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Credentials &amp; Verify Connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Test Live Connection Button & Result */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin text-[#0d4f3c]" : ""} />
              {testing ? "Testing Backend Authentication..." : "Test Current Backend Connection"}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-rose-700 shrink-0" />
                  )}
                  <span>
                    {testResult.success ? "Live Connection Verified!" : "Verification Result"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{testResult.message}</p>
                {testResult.details?.companyName && (
                  <p className="mt-1 text-[10px] text-emerald-800 font-medium">
                    Registered Company: {testResult.details.companyName} | Pickup: {testResult.details.pickupLocationConfigured}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Configuration Instructions */}
          <div className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl p-3.5 text-xs space-y-2">
            <span className="font-bold text-stone-800 flex items-center justify-between">
              <span>Where to find API Credentials</span>
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
                In your Shiprocket dashboard, navigate to <strong>Settings &gt; API &gt; Configure API Users</strong>.
              </li>
              <li>
                Use the dedicated API User Email (e.g. <code className="font-mono bg-stone-200/70 px-1 py-0.5 rounded">shriyapusha01@gmail.com</code>) and API User Password.
              </li>
              <li>
                Verify your Pickup Address under <strong>Settings &gt; Pickup Addresses</strong> (currently set to <code className="font-mono bg-stone-200/70 px-1 py-0.5 rounded">Home</code>).
              </li>
              <li>
                Click <strong>Save Credentials &amp; Verify Connection</strong>. All pending and future orders will synchronize automatically!
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
