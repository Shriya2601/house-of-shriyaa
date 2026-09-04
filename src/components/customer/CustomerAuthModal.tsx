import React, { useState } from "react";
import { X, Lock, Mail, User, Phone, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { customerSignIn, customerSignUp } from "../../services/storeService";
import { useStore } from "../../context/StoreContext";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  initialMode = "signin",
}: CustomerAuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { refreshCustomerOrders } = useStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await customerSignUp(email.trim(), password, fullName.trim(), phone.trim());
      } else {
        await customerSignIn(email.trim(), password);
      }
      await refreshCustomerOrders();
      onClose();
    } catch (err: unknown) {
      console.error("Auth error:", err);
      let msg = "Authentication failed. Please check your credentials.";
      if (err instanceof Error) {
        if (err.message.includes("email-already-in-use")) {
          msg = "An account with this email already exists. Please Sign In.";
        } else if (err.message.includes("wrong-password") || err.message.includes("user-not-found") || err.message.includes("invalid-credential")) {
          msg = "Incorrect email or password. Please try again.";
        } else if (err.message.includes("network")) {
          msg = "Network connection issue. Please check your internet.";
        } else {
          msg = err.message;
        }
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#faf8f5] w-full max-w-md rounded-2xl shadow-2xl border border-[#e8dfd5] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0d4f3c] text-white px-6 py-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-[#d4af37] font-mono uppercase tracking-wider mb-1">
            <Sparkles size={13} />
            <span>House of Shriya Atelier</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#faf8f5]">
            {mode === "signin" ? "Sign In to Your Account" : "Create Patron Account"}
          </h2>
          <p className="text-xs text-[#faf8f5]/80 mt-1">
            {mode === "signin"
              ? "Access your couture orders, saved addresses & bespoke sizing"
              : "Register to enjoy bespoke tailoring records and priority orders"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#e8dfd5] bg-[#f5efeb]">
          <button
            type="button"
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === "signin"
                ? "bg-[#faf8f5] text-[#0d4f3c] border-b-2 border-[#0d4f3c]"
                : "text-[#706458] hover:text-[#1e1b18]"
            }`}
            onClick={() => {
              setMode("signin");
              setErrorMessage("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === "signup"
                ? "bg-[#faf8f5] text-[#0d4f3c] border-b-2 border-[#0d4f3c]"
                : "text-[#706458] hover:text-[#1e1b18]"
            }`}
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-lg leading-relaxed">
              {errorMessage}
            </div>
          )}

          {mode === "signup" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#1e1b18] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-3 text-[#8c827a]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e1b18] mb-1">
                  Mobile Number (Optional for order SMS)
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-3 text-[#8c827a]" />
                  <input
                    type="tel"
                    placeholder="e.g. 9501698356"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1e1b18] mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-3 text-[#8c827a]" />
              <input
                type="email"
                required
                placeholder="your.email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e1b18] mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3 text-[#8c827a]" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#d6ccc2] rounded-lg focus:outline-none focus:border-[#0d4f3c]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#0d4f3c] hover:bg-[#083528] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === "signin" ? "Sign In" : "Register Account"}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-[11px] text-[#706458]">
              {mode === "signin" ? "Don't have an account yet?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErrorMessage("");
                }}
                className="font-bold text-[#0d4f3c] hover:underline"
              >
                {mode === "signin" ? "Create Account" : "Sign In"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
