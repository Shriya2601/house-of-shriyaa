import React, { useState, useEffect } from "react";
import { X, CheckCircle2, ShieldCheck, Truck, CreditCard, Banknote, Sparkles, MessageCircle, ArrowRight, Loader2 } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Order, PaymentMethod } from "../../types";

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
  } = useStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Surat");
  const [state, setState] = useState("Gujarat");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Instant UPI / NetBanking");
  const [notes, setNotes] = useState("");

  // Auto-fill from logged in profile if available
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

  const shippingFee = subtotal >= 1999 || subtotal === 0 ? 0 : 150;
  const total = subtotal + shippingFee;

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
    if (paymentMethod === "Cash on Delivery (COD)") {
      setErrorMessage("Cash on Delivery is currently disabled. Please pay securely via Instant UPI / NetBanking or Card.");
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
        notes: notes.trim(),
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
            /* Order Placed Success View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-[#0d4f3c] block">
                  Thank You For Patronizing House of Shriya
                </span>
                <h3 className="font-serif font-bold text-2xl text-[#1e1b18] mt-1">
                  Order Successfully Placed!
                </h3>
              </div>

              {/* Order Reference Box */}
              <div className="bg-[#f2ece4] border border-[#d4af37]/40 rounded-xl p-4 max-w-md mx-auto text-left space-y-2">
                <div className="flex justify-between items-center border-b border-[#e0d7cb] pb-2">
                  <span className="text-xs text-[#6b6257]">Order Reference Number</span>
                  <span className="font-mono font-bold text-sm text-[#0d4f3c]">{placedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6b6257]">Customer</span>
                  <span className="font-semibold text-[#1e1b18]">{placedOrder.customer.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6b6257]">Delivery To</span>
                  <span className="font-medium text-[#1e1b18] text-right truncate max-w-[200px]">
                    {placedOrder.shippingAddress.city}, {placedOrder.shippingAddress.state} ({placedOrder.shippingAddress.pincode})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6b6257]">Payment Mode</span>
                  <span className="font-semibold text-[#0d4f3c]">{placedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#e0d7cb]">
                  <span className="font-bold text-[#1e1b18]">Total Amount</span>
                  <span className="font-serif font-bold text-base text-[#0d4f3c]">₹{placedOrder.total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <p className="text-xs text-[#6b6257] max-w-md mx-auto leading-relaxed">
                Our Surat atelier has registered your order and will package your pieces with signature tissue, lavender sachets, and authentic handloom certification.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                <a
                  href={`https://wa.me/919501698356?text=${encodeURIComponent(
                    `Namaste House of Shriya! I just placed order ${placedOrder.orderNumber} for ₹${placedOrder.total}. Please confirm my bespoke sizing.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#1faa53] transition-colors"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp Atelier Support</span>
                </a>
                <button
                  onClick={handleClose}
                  className="bg-[#0d4f3c] text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#083528] transition-colors"
                >
                  Return to Boutique
                </button>
              </div>
            </div>
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
                          {item.size} · Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#0d4f3c]">
                        {item.product.price}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#e0d7cb] flex justify-between text-xs font-bold">
                  <span>Grand Total (Free Shipping Included)</span>
                  <span className="text-[#0d4f3c] font-serif text-sm">₹{total.toLocaleString("en-IN")}</span>
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

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 395007"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d6ccc2] rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-sm text-[#1e1b18] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#0d4f3c] text-white text-[11px] flex items-center justify-center font-mono">3</span>
                  Payment Selection
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    className="border border-dashed border-[#d6ccc2] p-3 rounded-xl flex items-start gap-2.5 bg-[#fbf9f6] text-[#8c827a] opacity-60 cursor-not-allowed select-none"
                    title="Cash on Delivery is currently disabled"
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="mt-0.5 cursor-not-allowed"
                      disabled
                      checked={false}
                      readOnly
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold flex items-center justify-between text-[#8c827a]">
                        <span className="flex items-center gap-1">
                          <Banknote size={14} /> Cash on Delivery
                        </span>
                        <span className="text-[9px] bg-[#eedede] text-[#9b2c2c] px-1.5 py-0.5 rounded font-semibold uppercase">
                          Disabled
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8c827a] mt-0.5 leading-tight">
                        COD is disabled. Please pay online via UPI or Card.
                      </div>
                    </div>
                  </div>

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
              </div>

              {/* Special Atelier Customization Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5a544c] mb-1">
                  Atelier Sizing / Customization Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please tailor kurta length to 46 inches, or include extra fabric border."
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
