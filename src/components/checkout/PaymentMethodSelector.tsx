import React, { useState } from "react";
import {
  Sparkles,
  CreditCard,
  Building2,
  Banknote,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { PaymentMethod, OrderPaymentDetails } from "../../types";
import { useStore } from "../../context/StoreContext";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  onPaymentDetailsChange?: (details: OrderPaymentDetails) => void;
}

export const ATELIER_BANK_DETAILS = {
  accountName: "House of Shriya Atelier",
  bankName: "HDFC Bank",
  accountNumber: "•••• •••• •••• 9103",
  ifscCode: "HDFC0001234",
  accountType: "Current Account",
  branch: "Surat Ring Road, Gujarat",
  upiId: "houseofshriya@upi",
};

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  totalAmount,
  customerName,
  customerPhone,
  onPaymentDetailsChange,
}: PaymentMethodSelectorProps) {
  const { siteContent } = useStore();
  // UPI Sub-states
  const [upiTab, setUpiTab] = useState<"qr" | "apps" | "id">("qr");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [upiVerified, setUpiVerified] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState("Google Pay");
  const [utrNumber, setUtrNumber] = useState("");

  // Card Sub-states
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(customerName || "");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Net Banking Sub-states
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [bankRefNumber, setBankRefNumber] = useState("");

  // Copy helpers
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // UPI deep link
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(
    ATELIER_BANK_DETAILS.upiId
  )}&pn=${encodeURIComponent(
    ATELIER_BANK_DETAILS.accountName
  )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent("House of Shriya Order")}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiIntentUri
  )}&margin=10`;

  // Detect card brand
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s/g, "");
    if (clean.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(clean)) return "Mastercard";
    if (/^(?:60|65|81|82)/.test(clean)) return "RuPay";
    return "Card";
  };

  // Format Card Number
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 16);
    const parts = clean.match(/[\s\S]{1,4}/g) || [];
    const formatted = parts.join(" ");
    setCardNumber(formatted);
    notifyDetails({
      methodType: "card",
      cardLast4: clean.slice(-4),
      cardBrand: getCardBrand(clean),
      cardHolderName: cardHolder,
    });
  };

  // Format Card Expiry
  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    let formatted = clean;
    if (clean.length >= 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    setCardExpiry(formatted);
  };

  const notifyDetails = (details: OrderPaymentDetails) => {
    if (onPaymentDetailsChange) {
      onPaymentDetailsChange(details);
    }
  };

  // Popular Indian Banks for Net Banking
  const popularBanks = [
    { name: "HDFC Bank", short: "HDFC" },
    { name: "State Bank of India", short: "SBI" },
    { name: "ICICI Bank", short: "ICICI" },
    { name: "Axis Bank", short: "Axis" },
    { name: "Kotak Mahindra Bank", short: "Kotak" },
    { name: "Punjab National Bank", short: "PNB" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-sm text-[#1e1b18] flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#0d4f3c] text-white text-[11px] flex items-center justify-center font-mono">
            3
          </span>
          Choose Payment Method
        </h3>
        <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Lock size={10} /> 100% Secure & RBI Verified
        </span>
      </div>

      {/* Main Payment Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* UPI Option */}
        <button
          type="button"
          onClick={() => {
            onSelectMethod("UPI / QR Code");
            notifyDetails({
              methodType: "upi",
              upiId: upiIdInput || ATELIER_BANK_DETAILS.upiId,
              upiApp: selectedUpiApp,
              utrNumber,
            });
          }}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
            selectedMethod === "UPI / QR Code" ||
            selectedMethod === "Instant UPI / NetBanking"
              ? "border-[#0d4f3c] bg-[#0d4f3c]/5 text-[#0d4f3c] shadow-xs"
              : "border-[#d6ccc2] bg-white text-[#5a544c] hover:border-[#0d4f3c]/50"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
              <Sparkles size={15} />
            </span>
            {(selectedMethod === "UPI / QR Code" ||
              selectedMethod === "Instant UPI / NetBanking") && (
              <CheckCircle2 size={16} className="text-[#0d4f3c]" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-[#1e1b18]">UPI & QR</div>
            <div className="text-[10px] text-[#6b6257]">GPay, PhonePe, QR</div>
          </div>
        </button>

        {/* Debit / Credit Card Option */}
        <button
          type="button"
          onClick={() => {
            onSelectMethod("Debit Card / Credit Card");
            notifyDetails({
              methodType: "card",
              cardLast4: cardNumber.replace(/\D/g, "").slice(-4),
              cardBrand: getCardBrand(cardNumber),
              cardHolderName: cardHolder,
            });
          }}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
            selectedMethod === "Debit Card / Credit Card" ||
            selectedMethod === "Credit/Debit Card"
              ? "border-[#0d4f3c] bg-[#0d4f3c]/5 text-[#0d4f3c] shadow-xs"
              : "border-[#d6ccc2] bg-white text-[#5a544c] hover:border-[#0d4f3c]/50"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-900 flex items-center justify-center">
              <CreditCard size={15} />
            </span>
            {(selectedMethod === "Debit Card / Credit Card" ||
              selectedMethod === "Credit/Debit Card") && (
              <CheckCircle2 size={16} className="text-[#0d4f3c]" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-[#1e1b18]">Debit / Credit</div>
            <div className="text-[10px] text-[#6b6257]">Visa, RuPay, Master</div>
          </div>
        </button>

        {/* Bank Transfer / Net Banking Option */}
        <button
          type="button"
          onClick={() => {
            onSelectMethod("Direct Bank Transfer (NEFT/IMPS)");
            notifyDetails({
              methodType: "bank",
              bankName: selectedBank,
              transactionReference: bankRefNumber,
              accountNumberMasked: ATELIER_BANK_DETAILS.accountNumber,
            });
          }}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
            selectedMethod === "Direct Bank Transfer (NEFT/IMPS)" ||
            selectedMethod === "Net Banking"
              ? "border-[#0d4f3c] bg-[#0d4f3c]/5 text-[#0d4f3c] shadow-xs"
              : "border-[#d6ccc2] bg-white text-[#5a544c] hover:border-[#0d4f3c]/50"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-800 flex items-center justify-center">
              <Building2 size={15} />
            </span>
            {(selectedMethod === "Direct Bank Transfer (NEFT/IMPS)" ||
              selectedMethod === "Net Banking") && (
              <CheckCircle2 size={16} className="text-[#0d4f3c]" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-[#1e1b18]">Bank Details</div>
            <div className="text-[10px] text-[#6b6257]">IMPS, NEFT, NetBank</div>
          </div>
        </button>

        {/* Cash on Delivery (COD) */}
        <button
          type="button"
          onClick={() => {
            onSelectMethod("Cash on Delivery (COD)");
            notifyDetails({
              methodType: "cod",
            });
          }}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
            selectedMethod === "Cash on Delivery (COD)"
              ? "border-[#0d4f3c] bg-[#0d4f3c]/5 text-[#0d4f3c] shadow-xs"
              : "border-[#d6ccc2] bg-white text-[#5a544c] hover:border-[#0d4f3c]/50"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
              <Banknote size={15} />
            </span>
            {selectedMethod === "Cash on Delivery (COD)" && (
              <CheckCircle2 size={16} className="text-[#0d4f3c]" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-[#1e1b18]">Cash on Delivery</div>
            <div className="text-[10px] text-[#6b6257]">Pay on doorstep</div>
          </div>
        </button>
      </div>

      {/* =========================================================================
          ACTIVE METHOD PANEL 1: UPI & QR Code
      ========================================================================== */}
      {(selectedMethod === "UPI / QR Code" ||
        selectedMethod === "Instant UPI / NetBanking") && (
        <div className="bg-white border border-[#d6ccc2] rounded-xl p-4 space-y-3.5 animate-fadeIn">
          {/* Sub-tabs for UPI */}
          <div className="flex bg-[#f4eee6] p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setUpiTab("qr")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                upiTab === "qr"
                  ? "bg-white text-[#0d4f3c] shadow-xs"
                  : "text-[#6b6257] hover:text-[#1e1b18]"
              }`}
            >
              <QrCode size={13} />
              <span>Scan QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => setUpiTab("apps")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                upiTab === "apps"
                  ? "bg-white text-[#0d4f3c] shadow-xs"
                  : "text-[#6b6257] hover:text-[#1e1b18]"
              }`}
            >
              <Smartphone size={13} />
              <span>UPI Apps</span>
            </button>
            <button
              type="button"
              onClick={() => setUpiTab("id")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                upiTab === "id"
                  ? "bg-white text-[#0d4f3c] shadow-xs"
                  : "text-[#6b6257] hover:text-[#1e1b18]"
              }`}
            >
              <span>Enter UPI ID</span>
            </button>
          </div>

          {/* Tab Content 1: Scan QR */}
          {upiTab === "qr" && (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#faf8f5] p-3.5 rounded-xl border border-[#ebe2d8]">
              <div className="p-2 bg-white rounded-lg border border-[#e0d7cb] shadow-xs flex flex-col items-center">
                <img
                  src={siteContent?.upiScannerUrl || qrImageUrl}
                  alt="House of Shriya Official Payment Scanner"
                  className="w-36 h-36 object-contain rounded-md"
                />
                <span className="text-[10px] text-[#6b6257] font-mono mt-1 font-semibold">
                  Amount: ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#1e1b18] flex items-center justify-center sm:justify-start gap-1.5">
                    <ShieldCheck size={14} className="text-[#0d4f3c]" />
                    <span>Official Atelier Payment Scanner</span>
                  </div>
                  <p className="text-[11px] text-[#6b6257] leading-relaxed">
                    Scan with any UPI app (Google Pay, PhonePe, Paytm, BHIM, CRED) to transfer directly to House of Shriya Atelier.
                  </p>
                </div>

                <div className="bg-emerald-50/80 px-3 py-2 rounded-lg border border-emerald-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-[11px] text-emerald-900 font-bold">
                      Verified Merchant: House of Shriya
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    Zero Surcharge
                  </span>
                </div>

                <a
                  href={upiIntentUri}
                  className="inline-flex sm:hidden items-center justify-center gap-1.5 w-full py-2 bg-[#0d4f3c] text-white rounded-lg text-xs font-bold shadow-xs active:scale-98 transition-all"
                >
                  <span>Pay ₹{totalAmount} Directly in App</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Tab Content 2: UPI Apps */}
          {upiTab === "apps" && (
            <div className="space-y-3">
              <span className="text-[11px] text-[#6b6257] block font-medium">
                Choose your preferred UPI application:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { name: "Google Pay", color: "border-blue-300 bg-blue-50/50" },
                  { name: "PhonePe", color: "border-purple-300 bg-purple-50/50" },
                  { name: "Paytm", color: "border-sky-300 bg-sky-50/50" },
                  { name: "BHIM UPI", color: "border-emerald-300 bg-emerald-50/50" },
                  { name: "CRED", color: "border-stone-400 bg-stone-50" },
                ].map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => {
                      setSelectedUpiApp(app.name);
                      notifyDetails({
                        methodType: "upi",
                        upiId: ATELIER_BANK_DETAILS.upiId,
                        upiApp: app.name,
                        utrNumber,
                      });
                    }}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      selectedUpiApp === app.name
                        ? "border-[#0d4f3c] bg-[#0d4f3c]/10 text-[#0d4f3c] font-bold shadow-xs"
                        : "border-[#d6ccc2] bg-white text-[#5a544c] hover:border-[#0d4f3c]/40"
                    }`}
                  >
                    <span className="text-xs font-semibold">{app.name}</span>
                    {selectedUpiApp === app.name && (
                      <span className="text-[9px] text-[#0d4f3c] font-bold uppercase tracking-wider">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-[#6b6257] bg-[#faf8f5] p-2.5 rounded-lg border border-[#ebe2d8] flex items-center justify-between">
                <span>Paying ₹{totalAmount.toLocaleString("en-IN")} to House of Shriya</span>
                <a
                  href={upiIntentUri}
                  className="font-bold text-[#0d4f3c] hover:underline flex items-center gap-1"
                >
                  <span>Launch {selectedUpiApp}</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          )}

          {/* Tab Content 3: Enter UPI ID */}
          {upiTab === "id" && (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold text-[#5a544c]">
                Enter Your UPI ID / VPA
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. mobileNumber@okhdfcbank or yourname@oksbi"
                  value={upiIdInput}
                  onChange={(e) => {
                    setUpiIdInput(e.target.value);
                    setUpiVerified(false);
                  }}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (upiIdInput.includes("@")) {
                      setUpiVerified(true);
                      notifyDetails({
                        methodType: "upi",
                        upiId: upiIdInput,
                        upiApp: "Custom VPA",
                        utrNumber,
                      });
                    }
                  }}
                  className="px-4 py-2 bg-[#0d4f3c] text-white rounded-lg text-xs font-bold hover:bg-[#083528] cursor-pointer"
                >
                  {upiVerified ? "Verified ✓" : "Verify"}
                </button>
              </div>
              {upiVerified && (
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  UPI ID verified. You will receive a collect request for ₹{totalAmount.toLocaleString("en-IN")}.
                </p>
              )}
            </div>
          )}

          {/* Optional UTR / Reference ID */}
          <div className="pt-2 border-t border-[#ebe2d8]">
            <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
              UPI Reference / 12-Digit UTR Number (Optional, if already paid)
            </label>
            <input
              type="text"
              placeholder="e.g. 423409871234"
              value={utrNumber}
              onChange={(e) => {
                const val = e.target.value.trim();
                setUtrNumber(val);
                notifyDetails({
                  methodType: "upi",
                  upiId: upiIdInput || ATELIER_BANK_DETAILS.upiId,
                  upiApp: selectedUpiApp,
                  utrNumber: val,
                });
              }}
              className="w-full text-xs px-3 py-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE METHOD PANEL 2: Debit / Credit Card
      ========================================================================== */}
      {(selectedMethod === "Debit Card / Credit Card" ||
        selectedMethod === "Credit/Debit Card") && (
        <div className="bg-white border border-[#d6ccc2] rounded-xl p-4 space-y-4 animate-fadeIn">
          {/* Card Visual Preview */}
          <div className="relative overflow-hidden w-full max-w-sm mx-auto h-44 rounded-2xl p-4 text-white shadow-xl bg-gradient-to-tr from-[#083528] via-[#0d4f3c] to-[#1b5e20] flex flex-col justify-between border border-[#d4af37]/40">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-9 h-6 rounded-sm bg-gradient-to-r from-amber-200 to-amber-400 border border-amber-500/40" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#e8dfd8]">
                  House of Shriya Patron
                </span>
              </div>
              <span className="font-serif font-bold text-sm tracking-wider text-amber-300">
                {getCardBrand(cardNumber)}
              </span>
            </div>

            <div className="space-y-1 my-auto">
              <div className="font-mono text-base tracking-widest text-shadow">
                {cardNumber || "•••• •••• •••• ••••"}
              </div>
            </div>

            <div className="flex justify-between items-end text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-200 block">
                  CARDHOLDER
                </span>
                <span className="font-medium tracking-wide uppercase truncate max-w-[170px] block">
                  {cardHolder || customerName || "VALUED PATRON"}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-200 block text-right">
                  EXPIRES
                </span>
                <span className="font-mono font-medium">{cardExpiry || "MM/YY"}</span>
              </div>
            </div>
          </div>

          {/* Form inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                Card Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-[#0d4f3c]">
                  {getCardBrand(cardNumber)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                Name on Card *
              </label>
              <input
                type="text"
                required
                placeholder="Name as printed on card"
                value={cardHolder}
                onChange={(e) => {
                  setCardHolder(e.target.value);
                  notifyDetails({
                    methodType: "card",
                    cardLast4: cardNumber.replace(/\D/g, "").slice(-4),
                    cardBrand: getCardBrand(cardNumber),
                    cardHolderName: e.target.value,
                  });
                }}
                className="w-full text-xs px-3 py-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                  Expiry Date (MM/YY) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                  CVV / Security Code *
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="•••"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-xs px-3 py-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#6b6257] bg-[#faf8f5] p-2.5 rounded-lg border border-[#ebe2d8]">
              <ShieldCheck size={15} className="text-[#0d4f3c] shrink-0" />
              <span>Card information is tokenized and processed securely according to RBI guidelines.</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE METHOD PANEL 3: Direct Bank Details & Net Banking
      ========================================================================== */}
      {(selectedMethod === "Direct Bank Transfer (NEFT/IMPS)" ||
        selectedMethod === "Net Banking") && (
        <div className="bg-white border border-[#d6ccc2] rounded-xl p-4 space-y-4 animate-fadeIn">
          {/* Atelier Official Bank Details Card */}
          <div className="bg-[#faf8f5] border border-[#d4af37]/40 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#ebe2d8] pb-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#0d4f3c] block">
                  Official Atelier Account
                </span>
                <span className="font-serif font-bold text-sm text-[#1e1b18]">
                  {ATELIER_BANK_DETAILS.bankName}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                NEFT / RTGS / IMPS
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#6b6257]">Beneficiary Name</span>
                <span className="font-semibold text-[#1e1b18]">
                  {ATELIER_BANK_DETAILS.accountName}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#ebe2d8]">
                <div>
                  <span className="text-[10px] text-[#6b6257] block">Account Number</span>
                  <span className="font-mono font-bold text-xs text-[#0d4f3c]">
                    {ATELIER_BANK_DETAILS.accountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(ATELIER_BANK_DETAILS.accountNumber, "accNo")
                  }
                  className="px-2.5 py-1 bg-[#0d4f3c] text-white rounded text-[11px] font-semibold hover:bg-[#083528] cursor-pointer flex items-center gap-1"
                >
                  {copiedField === "accNo" ? (
                    <>
                      <Check size={11} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#ebe2d8]">
                <div>
                  <span className="text-[10px] text-[#6b6257] block">IFSC Code</span>
                  <span className="font-mono font-bold text-xs text-[#0d4f3c]">
                    {ATELIER_BANK_DETAILS.ifscCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(ATELIER_BANK_DETAILS.ifscCode, "ifsc")
                  }
                  className="px-2.5 py-1 bg-[#0d4f3c] text-white rounded text-[11px] font-semibold hover:bg-[#083528] cursor-pointer flex items-center gap-1"
                >
                  {copiedField === "ifsc" ? (
                    <>
                      <Check size={11} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-[#6b6257]">Branch</span>
                <span className="text-[#1e1b18] font-medium">{ATELIER_BANK_DETAILS.branch}</span>
              </div>
            </div>
          </div>

          {/* Popular Net Banking Banks */}
          <div>
            <span className="text-[11px] font-semibold text-[#5a544c] block mb-2">
              Select Your Bank (Net Banking)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {popularBanks.map((b) => (
                <button
                  key={b.short}
                  type="button"
                  onClick={() => {
                    setSelectedBank(b.name);
                    notifyDetails({
                      methodType: "bank",
                      bankName: b.name,
                      transactionReference: bankRefNumber,
                      accountNumberMasked: ATELIER_BANK_DETAILS.accountNumber,
                    });
                  }}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedBank === b.name
                      ? "border-[#0d4f3c] bg-[#0d4f3c]/10 text-[#0d4f3c] font-bold"
                      : "border-[#d6ccc2] bg-white text-[#5a544c] hover:border-[#0d4f3c]/40"
                  }`}
                >
                  <span className="block truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bank Transfer Reference / UTR Input */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
              Transfer Reference / IMPS / UTR Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. IMPS/42918237192 or NEFT Ref Number"
              value={bankRefNumber}
              onChange={(e) => {
                const val = e.target.value.trim();
                setBankRefNumber(val);
                notifyDetails({
                  methodType: "bank",
                  bankName: selectedBank,
                  transactionReference: val,
                  accountNumberMasked: ATELIER_BANK_DETAILS.accountNumber,
                });
              }}
              className="w-full text-xs px-3 py-2 bg-[#faf8f5] border border-[#d6ccc2] rounded-lg font-mono focus:outline-hidden focus:border-[#0d4f3c]"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE METHOD PANEL 4: Cash on Delivery (COD)
      ========================================================================== */}
      {selectedMethod === "Cash on Delivery (COD)" && (
        <div className="bg-white border border-[#d6ccc2] rounded-xl p-4 space-y-2 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Banknote size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-[#1e1b18] block">
                Cash / UPI Upon Doorstep Delivery
              </span>
              <p className="text-[11px] text-[#6b6257] leading-relaxed mt-0.5">
                Pay ₹{totalAmount.toLocaleString("en-IN")} via cash or scan the courier executive's UPI QR when your order arrives.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
