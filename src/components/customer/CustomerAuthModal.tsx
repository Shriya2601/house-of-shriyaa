import React, { useState, useEffect, useId } from "react";
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  Loader2,
  ArrowRight,
  Gift,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
}

type AuthMode = "signin" | "signup" | "forgot";

export default function CustomerAuthModal({
  isOpen,
  onClose,
  initialMode = "signin",
}: CustomerAuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // UI state toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const fullNameInputId = useId();
  const phoneInputId = useId();
  const referralInputId = useId();

  const {
    currentUser,
    customerProfile,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshCustomerOrders,
  } = useStore();

  // Handle modal lifecycle & reset form
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage("");
      setSuccessMessage("");
      setShowPassword(false);
      setShowConfirmPassword(false);

      // Pre-fill email if user or profile has one
      if (currentUser?.email) {
        setEmail(currentUser.email);
      }

      // Check for referral code in URL (?ref=CODE) or localStorage
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get("ref");
        const savedRef =
          refParam || localStorage.getItem("hos_pending_referral") || "";
        if (savedRef) {
          setReferralCode(savedRef.toUpperCase());
        }
      } catch {}
    }
  }, [isOpen, initialMode, currentUser]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Forgot Password Mode
    if (mode === "forgot") {
      if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }

      setLoading(true);
      try {
        await resetPassword(cleanEmail);
        setSuccessMessage(
          `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox and spam folder.`
        );
      } catch (err: unknown) {
        console.error("Reset password error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to send reset link. Please check your email address and try again.";
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Sign In or Sign Up Mode
    if (!cleanEmail || !cleanPass) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (mode === "signup") {
      if (!fullName.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (!confirmPassword.trim()) {
        setErrorMessage("Please re-enter your password to confirm.");
        return;
      }
      if (cleanPass !== confirmPassword.trim()) {
        setErrorMessage("Passwords do not match. Please ensure both passwords match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(
          cleanEmail,
          cleanPass,
          fullName.trim(),
          phone.trim(),
          confirmPassword.trim(),
          referralCode.trim()
        );
        setSuccessMessage(
          "Patron account created successfully! Welcome to House of Shriya."
        );
      } else {
        await signIn(cleanEmail, cleanPass);
        setSuccessMessage("Signed in successfully! Welcome back.");
      }

      await refreshCustomerOrders();

      // Automatically dismiss modal after brief notification
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      console.error("Authentication error:", err);
      let msg = "Authentication failed. Please verify your details.";
      if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setSuccessMessage("Signed out of your account successfully.");
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      console.error("Sign out error:", err);
      setErrorMessage("Failed to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Passwords match validation flag for sign-up
  const passwordsMatch =
    confirmPassword.length > 0 && password.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;

  return (
    <div
      id="customer-auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="customer-auth-modal-card"
        className="bg-[#faf8f5] w-full max-w-md rounded-2xl shadow-2xl border border-[#e8dfd5] overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0d4f3c] text-white px-6 py-5 relative shrink-0">
          <button
            id="auth-modal-close-button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-[#d4af37] font-mono uppercase tracking-wider mb-1">
            <Sparkles size={13} />
            <span>House of Shriya Atelier</span>
          </div>

          <h2 className="text-xl font-serif font-bold text-[#faf8f5]">
            {currentUser
              ? "Your Patron Account"
              : mode === "signin"
              ? "Sign In to Your Account"
              : mode === "signup"
              ? "Create Patron Account"
              : "Reset Password"}
          </h2>

          <p className="text-xs text-[#faf8f5]/80 mt-1 leading-relaxed">
            {currentUser
              ? "Manage your heirloom couture orders, saved addresses & atelier bookings"
              : mode === "signin"
              ? "Access your saved addresses, track couture orders & view private appointments"
              : mode === "signup"
              ? "Register to unlock exclusive atelier perks, order tracking & ₹100 referral credits"
              : "Enter your registered email address and we'll send a secure password reset link"}
          </p>
        </div>

        {/* ALREADY LOGGED IN VIEW */}
        {currentUser ? (
          <div className="p-6 space-y-5 overflow-y-auto">
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2 leading-relaxed">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Profile Info Card */}
            <div className="bg-white border border-[#e8dfd5] rounded-xl p-4.5 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#0d4f3c] text-[#faf8f5] flex items-center justify-center font-serif text-lg font-bold shrink-0 border-2 border-[#d4af37]/40 shadow-xs">
                  {(customerProfile?.fullName || currentUser.displayName || currentUser.email || "P")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-serif font-bold text-[#1e1b18] truncate">
                      {customerProfile?.fullName || currentUser.displayName || "Valued Patron"}
                    </h3>
                    <span className="inline-flex items-center gap-1 bg-[#0d4f3c]/10 text-[#0d4f3c] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <ShieldCheck size={11} />
                      {customerProfile?.tier || "Patron"}
                    </span>
                  </div>
                  <p className="text-xs text-[#706458] truncate mt-0.5">
                    {currentUser.email}
                  </p>
                  {customerProfile?.phone && (
                    <p className="text-[11px] text-[#8c827a] mt-0.5">
                      +91 {customerProfile.phone}
                    </p>
                  )}
                </div>
              </div>

              {customerProfile?.referralCode && (
                <div className="mt-3.5 pt-3 border-t border-[#f0e8de] flex items-center justify-between text-xs">
                  <span className="text-[#706458] flex items-center gap-1">
                    <Gift size={13} className="text-[#0d4f3c]" /> Your Referral Code:
                  </span>
                  <span className="font-mono font-bold text-[#0d4f3c] bg-[#0d4f3c]/5 px-2.5 py-0.5 rounded border border-[#0d4f3c]/20">
                    {customerProfile.referralCode}
                  </span>
                </div>
              )}
            </div>

            {/* Privileges Badge */}
            <div className="bg-[#f7f4ee] rounded-xl p-3.5 border border-[#e8dfd5] text-xs text-[#706458] space-y-1.5">
              <strong className="text-[#1e1b18] block font-serif font-semibold">
                Your Atelier Privileges
              </strong>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d4f3c]" />
                  <span>Real-time Order Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d4f3c]" />
                  <span>Atelier Consultations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d4f3c]" />
                  <span>1-Click Saved Addresses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d4f3c]" />
                  <span>Silk Mark Guarantee</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                id="auth-continue-shopping-btn"
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-full bg-[#0d4f3c] hover:bg-[#083528] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <span>Continue Shopping</span>
                <ArrowRight size={14} />
              </button>

              <button
                id="auth-signout-btn"
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2.5 rounded-full bg-white hover:bg-red-50 border border-red-200 text-red-600 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SEGMENTED TAB SWITCHER (Sign In vs Create Account) */}
            {mode !== "forgot" && (
              <div className="flex border-b border-[#e8dfd5] bg-[#f5efeb] shrink-0">
                <button
                  id="tab-btn-signin"
                  type="button"
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    mode === "signin"
                      ? "bg-[#faf8f5] text-[#0d4f3c] border-b-2 border-[#0d4f3c]"
                      : "text-[#706458] hover:text-[#1e1b18]"
                  }`}
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                >
                  Sign In
                </button>
                <button
                  id="tab-btn-signup"
                  type="button"
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    mode === "signup"
                      ? "bg-[#faf8f5] text-[#0d4f3c] border-b-2 border-[#0d4f3c]"
                      : "text-[#706458] hover:text-[#1e1b18]"
                  }`}
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* FORM BODY */}
            <form
              id="customer-auth-form"
              onSubmit={handleSubmit}
              className="p-6 space-y-3.5 overflow-y-auto"
            >
              {/* Error Notice */}
              {errorMessage && (
                <div
                  id="auth-error-notice"
                  className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-lg flex items-start gap-2 leading-relaxed animate-in fade-in duration-150"
                >
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Notice */}
              {successMessage && (
                <div
                  id="auth-success-notice"
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg flex items-start gap-2 leading-relaxed animate-in fade-in duration-150"
                >
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* FORGOT PASSWORD MODE HEADER */}
              {mode === "forgot" && (
                <div className="pb-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[#0d4f3c] hover:underline cursor-pointer font-medium"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Sign In</span>
                  </button>
                  <span className="text-[11px] text-[#8c827a] font-mono uppercase">
                    Account Recovery
                  </span>
                </div>
              )}

              {/* SIGN UP: Full Name */}
              {mode === "signup" && (
                <div>
                  <label
                    htmlFor={fullNameInputId}
                    className="block text-xs font-semibold text-[#1e1b18] mb-1"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3 top-3 text-[#8c827a] pointer-events-none"
                    />
                    <input
                      id={fullNameInputId}
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. Priya Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
                    />
                  </div>
                </div>
              )}

              {/* EMAIL FIELD (Common to all modes) */}
              <div>
                <label
                  htmlFor={emailInputId}
                  className="block text-xs font-semibold text-[#1e1b18] mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-3 text-[#8c827a] pointer-events-none"
                  />
                  <input
                    id={emailInputId}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="your.email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
                  />
                </div>
              </div>

              {/* SIGN UP: Mobile Number */}
              {mode === "signup" && (
                <div>
                  <label
                    htmlFor={phoneInputId}
                    className="block text-xs font-semibold text-[#1e1b18] mb-1"
                  >
                    Mobile / WhatsApp (For courier dispatch updates)
                  </label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="absolute left-3 top-3 text-[#8c827a] pointer-events-none"
                    />
                    <input
                      id={phoneInputId}
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. 9501698356"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
                    />
                  </div>
                </div>
              )}

              {/* PASSWORD FIELD (Sign In and Sign Up) */}
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor={passwordInputId}
                      className="block text-xs font-semibold text-[#1e1b18]"
                    >
                      Password <span className="text-red-500">*</span>
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setErrorMessage("");
                          setSuccessMessage("");
                        }}
                        className="text-[11px] text-[#0d4f3c] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-3 text-[#8c827a] pointer-events-none"
                    />
                    <input
                      id={passwordInputId}
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#8c827a] hover:text-[#1e1b18] cursor-pointer p-0.5"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* SIGN UP: Confirm Password */}
              {mode === "signup" && (
                <div>
                  <label
                    htmlFor={confirmPasswordInputId}
                    className="block text-xs font-semibold text-[#1e1b18] mb-1 flex items-center justify-between"
                  >
                    <span>
                      Confirm Password <span className="text-red-500">*</span>
                    </span>
                    {passwordsMatch && (
                      <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Passwords match
                      </span>
                    )}
                    {passwordsMismatch && (
                      <span className="text-red-600 text-[11px] font-medium">
                        Passwords do not match
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-3 text-[#8c827a] pointer-events-none"
                    />
                    <input
                      id={confirmPasswordInputId}
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-9 pr-10 py-2 text-xs bg-white border rounded-lg focus:outline-none ${
                        passwordsMatch
                          ? "border-emerald-500 focus:border-emerald-600"
                          : passwordsMismatch
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#d6ccc2] focus:border-[#0d4f3c]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-[#8c827a] hover:text-[#1e1b18] cursor-pointer p-0.5"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* SIGN UP: Referral Code */}
              {mode === "signup" && (
                <div>
                  <label
                    htmlFor={referralInputId}
                    className="block text-xs font-semibold text-[#1e1b18] mb-1 flex items-center justify-between"
                  >
                    <span>Referral Code (Optional)</span>
                    <span className="text-[#0d4f3c] font-medium text-[11px] flex items-center gap-1">
                      <Gift size={12} /> Get ₹100 Off
                    </span>
                  </label>
                  <div className="relative">
                    <Gift
                      size={15}
                      className="absolute left-3 top-3 text-[#8c827a] pointer-events-none"
                    />
                    <input
                      id={referralInputId}
                      type="text"
                      placeholder="e.g. SHRIYA-7890"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c] uppercase font-mono"
                    />
                  </div>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#0d4f3c] hover:bg-[#083528] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer mt-3 disabled:opacity-60 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>
                      {mode === "signin"
                        ? "Signing in..."
                        : mode === "signup"
                        ? "Creating account..."
                        : "Sending reset link..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === "signin"
                        ? "Sign In to Atelier"
                        : mode === "signup"
                        ? "Register Patron Account"
                        : "Send Password Reset Email"}
                    </span>
                    {mode === "forgot" ? <KeyRound size={15} /> : <ArrowRight size={15} />}
                  </>
                )}
              </button>

              {/* FOOTER SWITCH LINK */}
              <div className="text-center pt-2">
                {mode === "signin" && (
                  <p className="text-[11px] text-[#706458]">
                    Don't have an account yet?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="font-bold text-[#0d4f3c] hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                )}
                {mode === "signup" && (
                  <p className="text-[11px] text-[#706458]">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="font-bold text-[#0d4f3c] hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
                {mode === "forgot" && (
                  <p className="text-[11px] text-[#706458]">
                    Remembered your password?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="font-bold text-[#0d4f3c] hover:underline cursor-pointer"
                    >
                      Return to Sign In
                    </button>
                  </p>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
