import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  MessageCircle,
  Truck,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  ShieldCheck,
  Gift,
  Building2,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
  Clock,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { Order, PaymentStatus } from "../../types";
import { confirmOrderPayment } from "../../services/storeService";
import { useStore } from "../../context/StoreContext";

interface OrderConfirmationViewProps {
  order: Order;
  onClose: () => void;
}

export default function OrderConfirmationView({
  order: initialOrder,
  onClose,
}: OrderConfirmationViewProps) {
  const { siteContent } = useStore();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [autoNotified, setAutoNotified] = useState(false);

  // Payment Confirmation State
  const [utrInput, setUtrInput] = useState("");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);
  const [utrErrorMsg, setUtrErrorMsg] = useState<string | null>(null);

  const cleanPhone = (order.customer.phone || "").replace(/\D/g, "");
  const customerName = order.customer.fullName || "Valued Patron";
  const storePhone = "9501698356";
  const storePhoneDisplay = "+91 95016 98356";
  const storeUpiId = "9501698356@upi";

  // Build the WhatsApp message
  const itemsText = order.items
    .map((item) => `• ${item.productName} (Qty: ${item.quantity}) - ₹${item.totalPrice.toLocaleString("en-IN")}`)
    .join("\n");

  const courierText = order.trackingNumber
    ? `\n🚚 *Courier:* ${order.trackingCourier || "Shiprocket Express"}\n🏷️ *AWB Tracking:* ${order.trackingNumber}\n🔗 *Live Track:* ${order.trackingUrl || `https://shiprocket.co/tracking/${order.trackingNumber}`}`
    : `\n🚚 *Courier:* Shiprocket Express (AWB will be assigned upon dispatch)`;

  const paymentText =
    order.paymentDetails?.methodType === "upi"
      ? `UPI / QR Code${order.paymentDetails.utrNumber ? ` (Ref/UTR: ${order.paymentDetails.utrNumber})` : ""}`
      : order.paymentDetails?.methodType === "card"
      ? `Card (${order.paymentDetails.cardBrand || "Debit/Credit"} **** ${order.paymentDetails.cardLast4 || "Card"})`
      : order.paymentDetails?.methodType === "bank"
      ? `Bank Transfer (${order.paymentDetails.bankName || "HDFC Bank"})${order.paymentDetails.transactionReference ? ` (Ref: ${order.paymentDetails.transactionReference})` : ""}`
      : order.paymentMethod;

  const fullWhatsAppMessage = `🌸 *HOUSE OF SHRIYA - ORDER CONFIRMATION* 🌸

Dear ${customerName},
Thank you for your order with House of Shriya! Your luxury unstitched ethnic ensemble order has been confirmed with our Surat Atelier.

📋 *Order Number:* ${order.orderNumber}
📅 *Date:* ${new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}

🛍️ *Order Items:*
${itemsText}

💰 *Total Amount:* ₹${order.total.toLocaleString("en-IN")}
💳 *Payment Mode:* ${paymentText}
📊 *Payment Status:* ${order.paymentStatus}
📍 *Delivery Address:* ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}${courierText}

Our master couturiers are currently inspecting and packaging your pieces with signature tissue, authentic handloom tags, and organic lavender sachets.

Atelier WhatsApp: ${storePhoneDisplay}
Website: www.houseofshriya.com`;

  // Dynamic WhatsApp URLs
  // 1. Direct message to Atelier support (Store owner at 9501698356)
  const storeOwnerWhatsAppUrl = `https://wa.me/91${storePhone}?text=${encodeURIComponent(
    `Namaste House of Shriya! I just placed order ${order.orderNumber} for ₹${order.total.toLocaleString("en-IN")}.
Customer: ${customerName} (${order.customer.phone})
Delivery: ${order.shippingAddress.city}, ${order.shippingAddress.state} (${order.shippingAddress.pincode})
Payment: ${order.paymentMethod} (${order.paymentStatus})
${order.paymentDetails?.utrNumber ? `UTR / Ref: ${order.paymentDetails.utrNumber}` : ""}

Please confirm my order dispatch!`
  )}`;

  // 2. Direct link to customer's own phone with the receipt pre-filled
  const customerWhatsAppUrl =
    cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
          fullWhatsAppMessage
        )}`
      : `https://wa.me/?text=${encodeURIComponent(fullWhatsAppMessage)}`;

  // Dynamic UPI Payment Link & QR Code
  const upiPayUrl = `upi://pay?pa=${storeUpiId}&pn=House%20of%20Shriya&am=${order.total}&cu=INR&tn=Order%20${encodeURIComponent(order.orderNumber)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiPayUrl)}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAutoNotified(true);
    }, 600);

    // Call server notification logging endpoint
    try {
      fetch("/api/notifications/order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          customerName: order.customer.fullName,
          customerPhone: order.customer.phone,
          total: order.total,
          message: fullWhatsAppMessage,
          channel: "WhatsApp & SMS",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}

    return () => clearTimeout(timer);
  }, [order.orderNumber]);

  // Handle Customer Payment UTR Submission directly on website
  const handleConfirmPaymentOnWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setUtrErrorMsg(null);
    setUtrSuccessMsg(null);

    const cleanUtr = utrInput.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setUtrErrorMsg("Please enter a valid 6 to 16 digit UPI UTR / Transaction Reference Number.");
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await confirmOrderPayment(order.id, cleanUtr, order.paymentMethod);
      if (res.success && res.order) {
        setOrder(res.order);
        setUtrSuccessMsg(`Payment reference ${cleanUtr} submitted successfully! Our Surat atelier team will verify and dispatch your parcel.`);
      } else {
        setUtrErrorMsg(res.message || "Failed to confirm payment. Please try again.");
      }
    } catch (err: any) {
      setUtrErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setSubmittingUtr(false);
    }
  };

  // Handle Printable Invoice
  const handlePrintInvoice = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.orderNumber} - House of Shriya</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #1e1b18; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0d4f3c; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 26px; font-weight: bold; letter-spacing: 2px; color: #0d4f3c; }
            .tagline { font-size: 12px; color: #786c5f; text-transform: uppercase; letter-spacing: 1.5px; }
            .details-grid { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #f4eee6; padding: 10px; border: 1px solid #ddd; text-align: left; }
            td { padding: 10px; border: 1px solid #ddd; }
            .total-row td { font-weight: bold; font-size: 15px; color: #0d4f3c; }
            .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">HOUSE OF SHRIYA</div>
            <div class="tagline">Luxury Handcrafted Unstitched Suits & Couture Fabrics</div>
            <p style="font-size: 12px; margin-top: 5px;">Surat Atelier, Gujarat · Patiala, Punjab · WhatsApp: ${storePhoneDisplay}</p>
          </div>
          <div class="details-grid">
            <div>
              <strong>BILLED TO:</strong><br>
              ${order.customer.fullName}<br>
              ${order.customer.phone}<br>
              ${order.shippingAddress.addressLine1}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
            </div>
            <div style="text-align: right;">
              <strong>INVOICE NO:</strong> ${order.orderNumber}<br>
              <strong>DATE:</strong> ${new Date(order.createdAt).toLocaleDateString("en-IN")}<br>
              <strong>PAYMENT:</strong> ${order.paymentMethod}<br>
              <strong>STATUS:</strong> ${order.paymentStatus}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Size / Fabric</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (i) => `
                <tr>
                  <td>${i.productName}</td>
                  <td>${i.size || "Unstitched Fabric"}</td>
                  <td>${i.quantity}</td>
                  <td>₹${i.unitPrice.toLocaleString("en-IN")}</td>
                  <td>₹${i.totalPrice.toLocaleString("en-IN")}</td>
                </tr>
              `
                )
                .join("")}
              <tr>
                <td colspan="4" style="text-align: right;">Subtotal:</td>
                <td>₹${order.subtotal.toLocaleString("en-IN")}</td>
              </tr>
              ${
                order.referralDiscount
                  ? `<tr>
                      <td colspan="4" style="text-align: right;">Referral Discount (${order.referralCode || ""}):</td>
                      <td>-₹${order.referralDiscount}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td colspan="4" style="text-align: right;">Shipping & Packaging:</td>
                <td>${order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Grand Total:</td>
                <td>₹${order.total.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Thank you for choosing House of Shriya. For inquiries: ${storePhoneDisplay} | care@houseofshriya.com
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const isPaymentPending = order.paymentStatus === "Pending";
  const isPaymentVerifying = order.paymentStatus === "Payment Verification Pending";
  const isPaymentPaid = order.paymentStatus === "Paid";

  return (
    <div className="text-center py-2 space-y-4 animate-fadeIn">
      {/* Celebration Icon */}
      <div className="relative w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
        <CheckCircle2 size={32} />
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#d4af37] text-white flex items-center justify-center text-[10px]">
          <Sparkles size={11} />
        </span>
      </div>

      <div>
        <span className="text-[11px] uppercase tracking-widest font-bold text-[#0d4f3c] block">
          Order Registered & Confirmed
        </span>
        <h3 className="font-serif font-bold text-2xl text-[#1e1b18] mt-0.5">
          Thank You, {customerName}!
        </h3>
        <p className="text-xs text-[#6b6257] mt-1 max-w-md mx-auto">
          Your order reference is <strong className="font-mono text-[#0d4f3c]">{order.orderNumber}</strong>. Our Surat atelier has scheduled your handcrafted unstitched pieces.
        </p>
      </div>

      {/* =========================================================================
          PRIMARY WHATSAPP NOTIFICATION STRIP - Direct to 9501698356
      ========================================================================== */}
      <div className="bg-[#f2faf5] border-2 border-[#25D366]/40 rounded-2xl p-4 max-w-md mx-auto text-left shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
            <MessageCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>WhatsApp Order Confirmation</span>
                <span className="text-[11px] text-emerald-600">✓✓</span>
              </span>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                Live Support
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
              Order invoice dispatched. Click below to share your order directly to our atelier WhatsApp for priority dispatch tracking.
            </p>
          </div>
        </div>

        {/* Action Buttons for WhatsApp */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <a
            href={storeOwnerWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#1faa53] transition-all shadow-sm active:scale-98"
          >
            <MessageCircle size={16} />
            <span>Send Order to Atelier WhatsApp</span>
          </a>

          {cleanPhone.length >= 10 && (
            <a
              href={customerWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-emerald-900 border border-emerald-300 px-3 py-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 hover:bg-emerald-50 transition-colors"
              title="Save invoice copy to my own WhatsApp"
            >
              <span>Send to My Phone</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* =========================================================================
          PAYMENT STATUS & ON-WEBSITE PAYMENT CONFIRMATION CARD
      ========================================================================== */}
      <div className={`border rounded-2xl p-4 max-w-md mx-auto text-left shadow-sm space-y-3.5 transition-all ${
        isPaymentPaid
          ? "bg-emerald-50/70 border-emerald-300"
          : isPaymentVerifying
          ? "bg-amber-50/70 border-amber-300"
          : "bg-[#fffdfa] border-[#d4af37]/60"
      }`}>
        {/* Status Header */}
        <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
          <div className="flex items-center gap-2">
            {isPaymentPaid ? (
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check size={16} />
              </div>
            ) : isPaymentVerifying ? (
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse">
                <Clock size={16} />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#d4af37]/20 text-[#0d4f3c] flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6b6257] block">
                Payment Status
              </span>
              <span className={`text-xs font-bold ${
                isPaymentPaid
                  ? "text-emerald-800"
                  : isPaymentVerifying
                  ? "text-amber-800"
                  : "text-[#b45309]"
              }`}>
                {isPaymentPaid
                  ? "Payment Confirmed & Verified"
                  : isPaymentVerifying
                  ? "Payment Verification in Progress"
                  : "Payment Pending - Complete on Website"}
              </span>
            </div>
          </div>

          <span className="font-serif font-bold text-base text-[#0d4f3c]">
            ₹{order.total.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Verification Success Toast */}
        {utrSuccessMsg && (
          <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs px-3 py-2.5 rounded-xl flex items-start gap-2">
            <Check size={15} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Confirmation Received!</span>
              <p className="text-[11px] mt-0.5">{utrSuccessMsg}</p>
            </div>
          </div>
        )}

        {/* If Payment is Pending or Verification Pending: Provide Instant UPI & Bank Transfer Options */}
        {!isPaymentPaid && (
          <div className="space-y-3 pt-1">
            <div className="bg-[#f7f4ee] p-3 rounded-xl border border-[#e8dfd8] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1e1b18] flex items-center gap-1.5">
                  <QrCode size={14} className="text-[#0d4f3c]" />
                  <span>Scan & Pay via any UPI App</span>
                </span>
                <span className="text-[10px] bg-[#0d4f3c] text-white px-2 py-0.5 rounded-full font-semibold">
                  Zero Extra Fee
                </span>
              </div>

              {/* QR Code and Quick Links */}
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-lg border border-stone-300 shrink-0 shadow-xs">
                  <img
                    src={siteContent?.upiScannerUrl || qrCodeUrl}
                    alt="House of Shriya Official Payment Scanner"
                    className="w-24 h-24 object-contain rounded"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-emerald-200">
                    <span className="text-[11px] font-bold text-[#0d4f3c] flex items-center gap-1 truncate">
                      <ShieldCheck size={13} className="text-emerald-700" />
                      <span>House of Shriya Verified QR</span>
                    </span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      Official
                    </span>
                  </div>

                  {/* UPI App Quick Intent Links */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <a
                      href={upiPayUrl}
                      className="bg-white hover:bg-stone-50 border border-stone-200 text-[#1e1b18] py-1 px-1.5 rounded text-[10px] font-bold text-center truncate block shadow-xs"
                    >
                      ⚡ Open GPay / PhonePe
                    </a>
                    <a
                      href={upiPayUrl}
                      className="bg-white hover:bg-stone-50 border border-stone-200 text-[#1e1b18] py-1 px-1.5 rounded text-[10px] font-bold text-center truncate block shadow-xs"
                    >
                      ⚡ Paytm / BHIM
                    </a>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Details Accordion */}
              <details className="text-[11px] text-[#5a544c] cursor-pointer">
                <summary className="font-semibold text-[#0d4f3c] hover:underline flex items-center gap-1">
                  <Building2 size={12} />
                  <span>View Atelier Bank Account (NEFT / IMPS)</span>
                </summary>
                <div className="mt-2 p-2.5 bg-white rounded-lg border border-stone-200 space-y-1 font-mono text-[10px]">
                  <div><strong>Account Name:</strong> House of Shriya Atelier</div>
                  <div><strong>Account Number:</strong> 50200088916244</div>
                  <div><strong>IFSC Code:</strong> HDFC0000240</div>
                  <div><strong>Bank:</strong> HDFC Bank, Surat Ring Road</div>
                </div>
              </details>
            </div>

            {/* Customer Payment Confirmation / UTR Submission Form */}
            <form onSubmit={handleConfirmPaymentOnWebsite} className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-[#1e1b18]">
                Already Paid? Confirm Payment on Website
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 12-digit UPI UTR / Reference No."
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-[#d6ccc2] rounded-xl focus:outline-hidden focus:border-[#0d4f3c] font-mono"
                />
                <button
                  type="submit"
                  disabled={submittingUtr}
                  className="bg-[#0d4f3c] text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-[#083528] transition-colors disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
                >
                  {submittingUtr ? "Submitting..." : "Confirm Payment"}
                </button>
              </div>

              {utrErrorMsg && (
                <p className="text-[11px] text-red-600 font-medium">{utrErrorMsg}</p>
              )}

              {order.paymentDetails?.utrNumber && (
                <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-100 px-2.5 py-1.5 rounded-lg">
                  <span>Recorded UTR / Reference:</span>
                  <span className="font-mono font-bold text-[#0d4f3c]">
                    {order.paymentDetails.utrNumber}
                  </span>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* =========================================================================
          ORDER DETAILS SUMMARY CARD
      ========================================================================== */}
      <div className="bg-[#f2ece4] border border-[#d4af37]/40 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2.5 shadow-xs">
        <div className="flex justify-between items-center border-b border-[#e0d7cb] pb-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6b6257] block">
              Order Reference
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm text-[#0d4f3c]">
                {order.orderNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(order.orderNumber);
                  setCopiedOrderNo(true);
                  setTimeout(() => setCopiedOrderNo(false), 2000);
                }}
                className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                title="Copy Order Number"
              >
                {copiedOrderNo ? (
                  <Check size={12} className="text-emerald-600" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          </div>
          <span className="bg-[#0d4f3c] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {order.orderStatus}
          </span>
        </div>

        {/* Ordered Items List */}
        <div className="space-y-1.5 text-xs">
          <span className="text-[11px] font-bold text-[#6b6257]">Items Ordered ({order.items.length}):</span>
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-[11px] bg-white/70 px-2.5 py-1.5 rounded-lg border border-[#e0d7cb]/60"
            >
              <div className="truncate pr-2">
                <span className="font-medium text-[#1e1b18]">{item.productName}</span>
                <span className="text-[#786c5f] ml-1">({item.size} · x{item.quantity})</span>
              </div>
              <span className="font-semibold text-[#0d4f3c] shrink-0">
                ₹{item.totalPrice.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>

        {/* Payment & Address Info */}
        <div className="pt-2 border-t border-[#e0d7cb] space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#6b6257]">Payment Mode</span>
            <span className="font-semibold text-[#0d4f3c] flex items-center gap-1">
              {order.paymentDetails?.methodType === "upi" && <QrCode size={12} />}
              {order.paymentDetails?.methodType === "card" && <CreditCard size={12} />}
              {order.paymentDetails?.methodType === "bank" && <Building2 size={12} />}
              {order.paymentDetails?.methodType === "cod" && <Banknote size={12} />}
              <span>{paymentText}</span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6b6257]">Delivery To</span>
            <span className="font-medium text-[#1e1b18] text-right truncate max-w-[200px]">
              {order.shippingAddress.city}, {order.shippingAddress.state} ({order.shippingAddress.pincode})
            </span>
          </div>

          {Boolean(order.referralDiscount && order.referralDiscount > 0) && (
            <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-sm border border-emerald-200">
              <span className="flex items-center gap-1">
                <Gift size={12} />
                Referral Privilege ({order.referralCode})
              </span>
              <span>-₹{order.referralDiscount}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[#e0d7cb]">
            <span className="font-bold text-[#1e1b18]">Total Payable</span>
            <span className="font-serif font-bold text-base text-[#0d4f3c]">
              ₹{order.total.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SHIPROCKET DISPATCH & TRACKING STRIP
      ========================================================================== */}
      {(order.trackingNumber || order.shiprocketOrderId) && (
        <div className="bg-[#0d4f3c]/5 border border-[#0d4f3c]/20 rounded-2xl p-3.5 max-w-md mx-auto text-left space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-xs text-[#0d4f3c] flex items-center gap-1.5">
              <Truck size={15} />
              <span>Shiprocket Express Dispatch</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              {order.shiprocketStatus || "Manifest Created"}
            </span>
          </div>

          {order.trackingNumber && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6b6257]">Air Waybill (AWB)</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-[#0d4f3c]">
                  {order.trackingNumber}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(order.trackingNumber!);
                    setCopiedAwb(true);
                    setTimeout(() => setCopiedAwb(false), 2000);
                  }}
                  className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Copy AWB"
                >
                  {copiedAwb ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>
          )}

          {order.trackingUrl && (
            <div className="pt-1 border-t border-[#0d4f3c]/10 flex items-center justify-between text-[11px]">
              <span className="text-stone-500">Live Courier Status:</span>
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#0d4f3c] hover:underline inline-flex items-center gap-1"
              >
                <span>Track on Shiprocket</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ACTION BUTTONS
      ========================================================================== */}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1 max-w-md mx-auto">
        <button
          type="button"
          onClick={handlePrintInvoice}
          className="bg-white border border-[#d6ccc2] text-[#1e1b18] px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#faf8f5] transition-colors cursor-pointer"
        >
          <Printer size={15} />
          <span>Print Tax Invoice</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="bg-[#0d4f3c] text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#083528] transition-colors cursor-pointer shadow-md"
        >
          Continue Shopping
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 text-[10px] text-[#6b6257] pt-1">
        <span className="flex items-center gap-1">
          <ShieldCheck size={12} className="text-[#0d4f3c]" /> 100% Authentic Handloom
        </span>
        <span>·</span>
        <span>Surat Atelier Dispatch</span>
        <span>·</span>
        <span>Insured Express Transit</span>
      </div>
    </div>
  );
}
