import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Sparkles,
  MessageCircle,
  ArrowRight,
  Loader2,
  Gift,
  Tag,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  QrCode,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Order, PaymentMethod } from "../../types";
import { validateReferralCode } from "../../services/storeService";
import OrderConfirmationView from "./OrderConfirmationView";
import { lookupPincode } from "../../utils/pincodeLookup";

export default function CheckoutModal() {
  const {
    isCheckoutOpen,
    closeCheckout,
    cart,
    cartSubtotal,
    instantCheckoutProduct,
    placeOrder,
    currentUser,
    customerProfile,
    siteContent,
  } = useStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Surat");
  const [state, setState] = useState("Gujarat");
  const [pincode, setPincode] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash on Delivery (COD)");
  const [upiOption, setUpiOption] = useState<"apps" | "id" | "qr">("apps");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [notes, setNotes] = useState("");
  const [upiUtrInput, setUpiUtrInput] = useState("");

  // Referral code state
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    discount: number;
    referrerName?: string;
  } | null>(null);
  const [validatingRef, setValidatingRef] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      setPincodeLoading(true);
      try {
        const info = await lookupPincode(clean);
        if (info) {
          if (info.city) setCity(info.city);
          if (info.state) setState(info.state);
          setPincodeFeedback(`Auto-detected: ${info.city ? info.city + ", " : ""}${info.state}`);
        } else {
          setPincodeFeedback(null);
        }
      } catch {
        setPincodeFeedback(null);
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setPincodeFeedback(null);
    }
  };

  // Auto-fill from logged in profile if available & auto-check referral
  useEffect(() => {
    if (customerProfile || currentUser) {
      if (!fullName) {
        setFullName(customerProfile?.fullName || currentUser?.displayName || "");
      }
      if (!email) {
        setEmail(currentUser?.email || customerProfile?.email || "");
      }
      if (!phone && customerProfile?.phone) {
        setPhone(customerProfile.phone);
      }
      if (customerProfile?.savedAddresses && customerProfile.savedAddresses.length > 0) {
        const defaultAddr = customerProfile.savedAddresses.find((a) => a.isDefault) || customerProfile.savedAddresses[0];
        if (!addressLine1 && defaultAddr) {
          setAddressLine1(defaultAddr.addressLine1 || "");
          setAddressLine2(defaultAddr.addressLine2 || "");
          setCity(defaultAddr.city || "Surat");
          setState(defaultAddr.state || "Gujarat");
          setPincode(defaultAddr.pincode || "");
        }
      }
    }
  }, [customerProfile, currentUser, isCheckoutOpen]);

  // Initial referral auto-detection
  useEffect(() => {
    if (isCheckoutOpen && !appliedReferral) {
      try {
        if (customerProfile?.claimedReferralDiscount || customerProfile?.usedReferralCode) {
          return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const refUrl = urlParams.get("ref");
        const pendingRef = refUrl || customerProfile?.referredBy || localStorage.getItem("hos_pending_referral") || "";
        if (pendingRef && !referralInput) {
          const clean = pendingRef.trim().toUpperCase();
          setReferralInput(clean);
          autoApplyReferral(clean);
        }
      } catch (err) {
        console.warn("Referral auto-fill check error:", err);
      }
    }
  }, [isCheckoutOpen, customerProfile]);

  const autoApplyReferral = async (code: string) => {
    if (!code) return;
    setValidatingRef(true);
    try {
      const buyerEmail = email || customerProfile?.email || currentUser?.email;
      const buyerId = currentUser?.uid || customerProfile?.uid;
      const res = await validateReferralCode(code, buyerEmail, buyerId);
      if (res.valid) {
        setAppliedReferral({
          code: res.referralCode || code,
          discount: res.discountAmount || 100,
          referrerName: res.referrerName,
        });
        setReferralFeedback({
          type: "success",
          message: `₹${res.discountAmount || 100} Referral discount applied! (Referred by ${res.referrerName || "Patron"})`,
        });
      }
    } catch {
      // Non-blocking on auto-apply
    } finally {
      setValidatingRef(false);
    }
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) {
      setReferralFeedback({ type: "error", message: "Please enter a referral code." });
      return;
    }
    setValidatingRef(true);
    setReferralFeedback(null);
    try {
      const buyerEmail = email.trim() || customerProfile?.email || currentUser?.email;
      const buyerId = currentUser?.uid || customerProfile?.uid;
      const res = await validateReferralCode(referralInput.trim(), buyerEmail, buyerId);
      if (res.valid) {
        setAppliedReferral({
          code: res.referralCode || referralInput.trim().toUpperCase(),
          discount: res.discountAmount || 100,
          referrerName: res.referrerName,
        });
        setReferralFeedback({
          type: "success",
          message: `₹${res.discountAmount || 100} Referral discount applied! (Referred by ${res.referrerName || "Patron"})`,
        });
      } else {
        setAppliedReferral(null);
        setReferralFeedback({
          type: "error",
          message: res.error || "Invalid referral code. Please check and try again.",
        });
      }
    } catch {
      setReferralFeedback({ type: "error", message: "Unable to validate referral code right now." });
    } finally {
      setValidatingRef(false);
    }
  };

  const handleRemoveReferral = () => {
    setAppliedReferral(null);
    setReferralInput("");
    setReferralFeedback(null);
    try {
      localStorage.removeItem("hos_pending_referral");
    } catch {}
  };

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (!isCheckoutOpen) return null;

  // Calculate pricing for checkout
  const parsePrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/[^\d]/g, "");
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const isInstant = Boolean(instantCheckoutProduct);
  const checkoutItems = isInstant && instantCheckoutProduct
    ? [
        {
          product: instantCheckoutProduct.product,
          size: instantCheckoutProduct.size,
          quantity: 1,
        },
      ]
    : cart;

  const subtotal = isInstant && instantCheckoutProduct
    ? parsePrice(instantCheckoutProduct.product.price)
    : cartSubtotal;

  const referralDiscount = appliedReferral ? appliedReferral.discount : 0;
  const shippingFee = subtotal >= 1999 || subtotal === 0 ? 0 : 150;
  const total = Math.max(0, subtotal - referralDiscount + shippingFee);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number for delivery coordination.");
      return;
    }
    if (!addressLine1.trim()) {
      setErrorMessage("Please enter your delivery street address.");
      return;
    }
    if (!city.trim() || !pincode.trim()) {
      setErrorMessage("Please provide your city and delivery pincode.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        customer: {
          fullName: fullName.trim(),
          email: email.trim() || `${phone.replace(/\D/g, "")}@houseofshriya.customer`,
          phone: phone.trim(),
        },
        shippingAddress: {
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        paymentMethod,
        paymentDetails: paymentMethod === "Instant UPI / NetBanking" ? {
          methodType: "upi",
          utrNumber: upiUtrInput.trim() || undefined,
          transactionReference: upiUtrInput.trim() || undefined,
        } : undefined,
        paymentStatus: (paymentMethod === "Instant UPI / NetBanking" && upiUtrInput.trim())
          ? "Payment Verification Pending"
          : "Pending",
        notes: notes.trim(),
        referralCode: appliedReferral?.code,
        referralDiscount: appliedReferral?.discount,
      });

      setPlacedOrder(order);
    } catch (err: unknown) {
      console.error("Order creation failure:", err);
      const msg = err instanceof Error ? err.message : "Failed to place order. Please check connection and try again.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPlacedOrder(null);
    closeCheckout();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#faf8f5] text-[#1e1b18] rounded-2xl shadow-2xl border border-[#d4af37]/30 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e8dfd8] flex items-center justify-between bg-[#f4eee6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0d4f3c] flex items-center justify-center text-[#d4af37]">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#0d4f3c] uppercase block">
                ATELIER CHECKOUT
              </span>
              <h2 className="font-serif font-bold text-lg text-[#1e1b18]">
                {placedOrder ? "Order Confirmed" : "Complete Your Order"}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5a544c] hover:text-black hover:bg-[#e8dfd8]"
            aria-label="Close checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {placedOrder ? (
            <OrderConfirmationView order={placedOrder} onClose={handleClose} />
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Items Summary Strip */}
              <div className="bg-[#f4eee6] rounded-xl p-3.5 border border-[#e8dfd8]">
                <span className="text-[11px] font-bold tracking-wider text-[#6b6257] uppercase block mb-2">
                  Order Items ({checkoutItems.length})
                </span>
                <div className="divide-y divide-[#e3dcd3] max-h-40 overflow-y-auto pr-1">
                  {checkoutItems.map((item) => (
                    <div key={`${item.product.id}-${item.size}`} className="py-2 flex items-center gap-3">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-10 h-12 object-cover rounded border border-[#e0d7cb]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-[#1e1b18] truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-[#6b6257]">
                          Unstitched Suit · Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#0d4f3c]">
                        {item.product.price}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#e0d7cb] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5a544c]">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {appliedReferral && (
                    <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-sm border border-emerald-200">
                      <span className="flex items-center gap-1">
                        <Gift size={12} />
                        Referral Discount ({appliedReferral.code})
                      </span>
                      <span>-₹{appliedReferral.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5a544c]">
                    <span>Express Atelier Courier</span>
                    <span className="text-emerald-700 font-medium">{shippingFee === 0 ? "FREE" : `₹${shippingFee}`}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#e0d7cb] flex justify-between font-bold text-[#1e1b18]">
                    <span>Grand Total</span>
                    <span className="text-[#0d4f3c] font-serif text-sm">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Customer Contact Information */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-sm text-[#1e1b18] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#0d4f3c] text-white text-[11px] flex items-center justify-center font-mono">1</span>
                  Delivery Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Radhika Deshmukh"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      Mobile Number (For Courier Tracking) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 95016 98356"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      Email Address (Optional for Invoice receipt)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. radhika@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-sm text-[#1e1b18] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#0d4f3c] text-white text-[11px] flex items-center justify-center font-mono">2</span>
                  Shipping Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      House / Flat / Building No. & Street *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 402, Royal Residency, Ring Road"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1 flex items-center justify-between">
                      <span>Pincode (PIN) *</span>
                      {pincodeLoading && <Loader2 size={12} className="animate-spin text-[#0d4f3c]" />}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 395007"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>

                  {pincodeFeedback && (
                    <div className="sm:col-span-3 text-[11px] text-[#0d4f3c] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                      <span>{pincodeFeedback}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-sm text-[#1e1b18] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#0d4f3c] text-white text-[11px] flex items-center justify-center font-mono">3</span>
                  Payment Selection
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`cursor-pointer border p-3 rounded-xl flex items-start gap-2.5 transition-all ${
                      paymentMethod === "Instant UPI / NetBanking"
                        ? "border-[#0d4f3c] bg-[#0d4f3c]/5 text-[#0d4f3c] font-semibold"
                        : "border-[#d6ccc2] bg-white text-[#5a544c]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="mt-0.5"
                      checked={paymentMethod === "Instant UPI / NetBanking"}
                      onChange={() => setPaymentMethod("Instant UPI / NetBanking")}
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Sparkles size={14} /> Instant UPI / GPay
                      </div>
                      <div className="text-[10px] text-[#6b6257] mt-0.5">
                        Scan QR or UPI ID on delivery
                      </div>
                    </div>
                  </label>

                  <label
                    className={`cursor-pointer border p-3 rounded-xl flex items-start gap-2.5 transition-all ${
                      paymentMethod === "Credit/Debit Card"
                        ? "border-[#0d4f3c] bg-[#0d4f3c]/5 text-[#0d4f3c] font-semibold"
                        : "border-[#d6ccc2] bg-white text-[#5a544c]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="mt-0.5"
                      checked={paymentMethod === "Credit/Debit Card"}
                      onChange={() => setPaymentMethod("Credit/Debit Card")}
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <CreditCard size={14} /> Card Payment
                      </div>
                      <div className="text-[10px] text-[#6b6257] mt-0.5">
                        Visa, Mastercard, RuPay
                      </div>
                    </div>
                  </label>
                </div>

                {/* Instant UPI Scanner Box */}
                {paymentMethod === "Instant UPI / NetBanking" && (
                  <div className="bg-[#faf8f5] border border-[#0d4f3c]/30 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1e1b18] flex items-center gap-1.5">
                        <QrCode size={14} className="text-[#0d4f3c]" />
                        <span>Official Payment Scanner (Zero Gateway Fee)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={10} /> Verified Atelier QR
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-stone-200">
                      <div className="bg-white p-1.5 rounded-lg border border-stone-300 shrink-0 shadow-xs">
                        <img
                          src={
                            siteContent?.upiScannerUrl ||
                            "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=upi%3A%2F%2Fpay%3Fpa%3Dhouseofshriya%40upi%26pn%3DHouse%20of%20Shriya%20Atelier%26cu%3DINR"
                          }
                          alt="House of Shriya Official Payment Scanner"
                          className="w-28 h-28 object-contain rounded"
                        />
                      </div>
                      <div className="space-y-1.5 text-xs flex-1 w-full">
                        <div className="text-[11px] font-bold text-[#0d4f3c] flex items-center gap-1">
                          <Sparkles size={12} className="text-[#d4af37]" />
                          <span>House of Shriya Official Verified QR</span>
                        </div>
                        <p className="text-[10px] text-stone-600 leading-tight">
                          Open Google Pay, PhonePe, Paytm, CRED or BHIM to scan and pay ₹{total.toLocaleString("en-IN")}.
                        </p>
                        <div className="text-[10px] text-emerald-800 font-medium flex items-center gap-1">
                          <ShieldCheck size={11} className="text-emerald-700 shrink-0" />
                          <span>Direct atelier dispatch upon payment verification</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#1e1b18]">
                        12-Digit UPI Reference Number / UTR
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 423891029384 (Optional now, can also submit after placing)"
                        value={upiUtrInput}
                        onChange={(e) => setUpiUtrInput(e.target.value.replace(/[^\d\w]/g, ""))}
                        className="w-full text-xs px-3 py-2 bg-white border border-[#d6ccc2] rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                      />
                      <p className="text-[10px] text-stone-500">
                        Entering your UTR accelerates order dispatch and live courier assignment.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Referral Code / Privilege Code */}
              <div className="bg-[#f4eee6] border border-[#e8dfd8] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e1b18]">
                    <Gift size={15} className="text-[#0d4f3c]" />
                    <span>Have a Referral or Privilege Code?</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Save ₹100
                  </span>
                </div>

                {appliedReferral ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300/80 px-3 py-2 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-700" />
                      <div>
                        <span className="font-mono font-bold text-emerald-900">{appliedReferral.code}</span>
                        <span className="text-emerald-700 ml-1.5">(₹{appliedReferral.discount} applied)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveReferral}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter friend's referral code (e.g. HOS-ABC12)"
                      value={referralInput}
                      onChange={(e) => {
                        setReferralInput(e.target.value.toUpperCase());
                        if (referralFeedback) setReferralFeedback(null);
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-white border border-[#d6ccc2] rounded-lg uppercase tracking-wider font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyReferral}
                      disabled={validatingRef || !referralInput.trim()}
                      className="bg-[#0d4f3c] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#083528] disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {validatingRef ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                )}

                {referralFeedback && (
                  <p
                    className={`text-[11px] ${
                      referralFeedback.type === "success" ? "text-emerald-700 font-medium" : "text-red-600"
                    }`}
                  >
                    {referralFeedback.message}
                  </p>
                )}
              </div>

              {/* Special Order Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                  Special Delivery / Order Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gift packaging requested, delivery before 5 PM, or landmark details."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#0d4f3c] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#083528] transition-colors shadow-md disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Confirming Order with Atelier...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Real Order (₹{total.toLocaleString("en-IN")})</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 text-[11px] text-[#6b6257] text-center pt-1">
                <span className="flex items-center gap-1"><Truck size={13} /> Insured Express Delivery</span>
                <span>·</span>
                <span className="flex items-center gap-1"><ShieldCheck size={13} /> 100% Genuine Handloom Guarantee</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
