import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { PRIMARY_ADMIN_EMAILS } from "../../services/adminAuthService";

interface AdminLoginViewProps {
  onSuccess?: () => void;
}

export default function AdminLoginView({ onSuccess }: AdminLoginViewProps) {
  const { login, register, resetPassword, error, clearError } = useAdminAuth();

  const [mode, setMode] = useState<"signin" | "setup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"superadmin" | "admin">("superadmin");
  const [showPassword, setShowPassword] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      setSuccessMessage("Authentication successful. Welcome to House of Shriya Atelier.");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
        setLocalError("Invalid email or password. Please verify your administrator credentials.");
      } else if (msg.includes("auth/too-many-requests")) {
        setLocalError("Access temporarily restricted due to multiple failed attempts. Please try again in a few moments or reset your password.");
      } else {
        setLocalError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError("Please enter an email and password.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), password, displayName.trim() || "Atelier Owner", role);
      setSuccessMessage("Administrator account created and securely stored in Firestore!");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create administrator account.";
      if (msg.includes("auth/email-already-in-use")) {
        setLocalError("An account with this email already exists. Please switch to the Sign In tab.");
      } else {
        setLocalError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    if (!email.trim()) {
      setLocalError("Please provide your registered administrator email.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSuccessMessage("Password reset instructions sent. Please inspect your email inbox.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send password reset email.";
      setLocalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-screen bg-[#080e0c] text-white flex flex-col justify-between selection:bg-[#d4af37] selection:text-black">
      {/* Top Bar with Return Link */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-[#1c2c25]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#a89f91] hover:text-[#d4af37] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Return to Storefront</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#a89f91]">
            Firebase Auth Secured
          </span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-[#0f1714] border border-[#2b3d35] rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Decorative Gold Corner Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#0d4f3c]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Atelier Brand Header */}
          <div className="text-center mb-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-[#0d4f3c]/40 border border-[#d4af37]/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Shield className="text-[#d4af37]" size={22} />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white">
              House of Shriya
            </h1>
            <p className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37] mt-1">
              Atelier Management Portal
            </p>
          </div>

          {/* Navigation Tabs (Sign In, First-Time Setup, Reset Key) */}
          <div className="flex border-b border-[#22332c] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setLocalError(null);
                setSuccessMessage(null);
                clearError();
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                mode === "signin"
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[#7a8c83] hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("setup");
                setLocalError(null);
                setSuccessMessage(null);
                clearError();
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                mode === "setup"
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[#7a8c83] hover:text-white"
              }`}
            >
              First-Time Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("reset");
                setLocalError(null);
                setSuccessMessage(null);
                clearError();
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                mode === "reset"
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[#7a8c83] hover:text-white"
              }`}
            >
              Reset Key
            </button>
          </div>

          {/* Alert Messages */}
          {displayedError && (
            <div className="mb-4 bg-red-950/60 border border-red-800 text-red-300 text-xs px-3.5 py-3 rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div className="leading-relaxed">{displayedError}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs px-3.5 py-3 rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Mode 1: Sign In */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-[#7a8c83]" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. shriyapusha01@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-[#4c5f55] focus:outline-hidden focus:border-[#d4af37] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase">
                    Security Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setLocalError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[10px] text-[#d4af37] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3.5 text-[#7a8c83]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-[#4c5f55] focus:outline-hidden focus:border-[#d4af37] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#7a8c83] hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Quick Fill Button for Atelier Owner */}
              <div className="bg-[#0d4f3c]/20 border border-[#d4af37]/30 rounded-xl p-3 text-[11px] text-[#cfc8bc] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                    <Sparkles size={12} /> Registered Owner Email
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(PRIMARY_ADMIN_EMAILS[0]);
                    }}
                    className="text-[10px] text-[#d4af37] font-semibold underline hover:text-white"
                  >
                    Fill Email
                  </button>
                </div>
                <p className="text-[11px] font-mono text-[#dcd6ca]">
                  {PRIMARY_ADMIN_EMAILS[0]}
                </p>
                <p className="text-[10px] text-[#7a8c83] leading-relaxed">
                  First time? Click <strong>First-Time Setup</strong> above to create your password and initialize your Firestore admin credentials.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[#0d4f3c] hover:bg-[#146e54] text-[#faf8f5] font-bold text-xs uppercase tracking-widest py-3 rounded-xl border border-[#d4af37]/40 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <KeyRound size={15} className="text-[#d4af37]" />
                <span>{submitting ? "Verifying Firebase Credentials..." : "Enter Secure Dashboard"}</span>
              </button>
            </form>
          )}

          {/* Mode 2: First-Time Setup */}
          {mode === "setup" && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="bg-[#0d4f3c]/20 border border-[#0d4f3c]/40 p-3 rounded-xl text-[11px] text-[#cfc8bc] leading-relaxed">
                Configure your administrator profile. This creates your account in <strong>Firebase Authentication</strong> and records your admin role in <strong>Firestore</strong>.
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3.5 text-[#7a8c83]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shriya Sharma"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-[#4c5f55] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-[#7a8c83]" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. shriyapusha01@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-[#4c5f55] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1.5">
                  Set Master Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3.5 text-[#7a8c83]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-[#4c5f55] focus:outline-hidden focus:border-[#d4af37]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#7a8c83] hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1.5">
                  Role Privilege
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "superadmin" | "admin")}
                  className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-[#d4af37]"
                >
                  <option value="superadmin">Superadmin (Full Boutique & Settings Access)</option>
                  <option value="admin">Administrator (Orders, Catalog, CMS)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[#d4af37] hover:bg-[#e0be48] text-black font-bold text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <ShieldCheck size={16} />
                <span>{submitting ? "Creating Admin Profile in Firebase..." : "Create & Initialize Admin"}</span>
              </button>
            </form>
          )}

          {/* Mode 3: Reset Password */}
          {mode === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="bg-[#0d4f3c]/20 border border-[#0d4f3c]/40 p-3 rounded-xl text-[11px] text-[#cfc8bc] leading-relaxed">
                Provide your registered administrator email address to receive a secure password reset link directly from Firebase Authentication.
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-[#cfc8bc] uppercase mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-[#7a8c83]" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. shriyapusha01@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#09110e] border border-[#2b3d35] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-[#4c5f55] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[#0d4f3c] hover:bg-[#146e54] text-[#faf8f5] font-bold text-xs uppercase tracking-widest py-3 rounded-xl border border-[#d4af37]/40 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Mail size={15} className="text-[#d4af37]" />
                <span>{submitting ? "Sending Reset Email..." : "Send Reset Link via Firebase"}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-[#d4af37] hover:underline"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Notice */}
          <div className="mt-6 pt-4 border-t border-[#1c2c25] text-center">
            <p className="text-[10px] font-mono text-[#5c6d64]">
              House of Shriya Atelier · Strict ABAC Access Control
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-[#5c6d64] border-t border-[#1c2c25]">
        &copy; {new Date().getFullYear()} House of Shriya. All rights reserved.
      </footer>
    </div>
  );
}
