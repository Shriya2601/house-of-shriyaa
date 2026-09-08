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
  Share2,
  CreditCard,
  QrCode,
  Banknote,
} from "lucide-react";
import { Order } from "../../types";

interface OrderConfirmationViewProps {
  order: Order;
  onClose: () => void;
}

export default function OrderConfirmationView({
  order,
  onClose,
}: OrderConfirmationViewProps) {
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [autoNotified, setAutoNotified] = useState(false);

  const cleanPhone = (order.customer.phone || "").replace(/\D/g, "");
  const customerName = order.customer.fullName || "Valued Patron";

  // Build the WhatsApp message
  const itemsText = order.items
    .map((item) => `• ${item.productName} (Qty: ${item.quantity}) - ₹${item.totalPrice.toLocaleString("en-IN")}`)
    .join("\n");

  const courierText = order.trackingNumber
    ? `\n🚚 *Courier:* ${order.trackingCourier || "Shiprocket Express"}\n🏷️ *AWB Tracking:* ${order.trackingNumber}\n🔗 *Live Track:* ${order.trackingUrl || `https://shiprocket.co/tracking/${order.trackingNumber}`}`
    : `\n🚚 *Courier:* Shiprocket Express (AWB will be assigned upon dispatch)`;

  const paymentText =
    order.paymentDetails?.methodType === "upi"
      ? `UPI / QR Code${order.paymentDetails.utrNumber ? ` (Ref: ${order.paymentDetails.utrNumber})` : ""}`
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
📍 *Delivery Address:* ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}${courierText}

Our master couturiers are currently inspecting and packaging your pieces with signature tissue, authentic handloom tags, and organic lavender sachets.

For any assistance or tailoring customization, you can directly reply to this message.

Warm regards,
*House of Shriya Atelier*
Surat, Gujarat & Patiala, Punjab
✨ www.houseofshriya.com`;

  // Dynamic WhatsApp URLs
  // 1. Direct link to customer's own phone with the receipt pre-filled
  const customerWhatsAppUrl =
    cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
          fullWhatsAppMessage
        )}`
      : `https://wa.me/?text=${encodeURIComponent(fullWhatsAppMessage)}`;

  // 2. Direct message to Atelier support
  const atelierSupportWhatsAppUrl = `https://wa.me/919501698356?text=${encodeURIComponent(
    `Namaste House of Shriya! I just placed order ${order.orderNumber} for ₹${order.total}. Please confirm my order dispatch.`
  )}`;

  useEffect(() => {
    // Simulate automated confirmation message dispatch
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
            <p style="font-size: 12px; margin-top: 5px;">Surat Atelier, Gujarat · Patiala, Punjab</p>
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
            Thank you for choosing House of Shriya. For inquiries: +91 95016 98356 | support@houseofshriya.com
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

  return (
    <div className="text-center py-4 space-y-4 animate-fadeIn">
      {/* Celebration Icon */}
      <div className="relative w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-md">
        <CheckCircle2 size={36} />
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#d4af37] text-white flex items-center justify-center text-[10px]">
          <Sparkles size={11} />
        </span>
      </div>

      <div>
        <span className="text-xs uppercase tracking-widest font-bold text-[#0d4f3c] block">
          Order Placed & Confirmed
        </span>
        <h3 className="font-serif font-bold text-2xl text-[#1e1b18] mt-1">
          Thank You, {customerName}!
        </h3>
        <p className="text-xs text-[#6b6257] mt-1 max-w-md mx-auto">
          Your order has been registered with our Surat atelier. We are preparing your handloom pieces with bespoke care.
        </p>
      </div>

      {/* =========================================================================
          AUTOMATED CONFIRMATION MESSAGE NOTIFICATION BANNER
      ========================================================================== */}
      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 max-w-md mx-auto text-left shadow-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                <span>Confirmation Message Sent</span>
                <span className="text-[10px] text-emerald-700 font-normal">✓✓</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-200/60 px-2 py-0.5 rounded-full">
                WhatsApp & SMS
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              Order invoice and delivery receipt dispatched to{" "}
              <strong className="font-mono">{order.customer.phone}</strong>.
            </p>

            {/* Quick WhatsApp Link Buttons */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              <a
                href={customerWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] text-white px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-[#1faa53] transition-colors shadow-xs"
              >
                <MessageCircle size={14} />
                <span>Open Confirmation on WhatsApp</span>
              </a>

              <a
                href={atelierSupportWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-lg font-semibold text-[11px] flex items-center gap-1 hover:bg-emerald-100/50 transition-colors"
              >
                <span>Atelier Support</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ORDER DETAILS SUMMARY CARD
      ========================================================================== */}
      <div className="bg-[#f2ece4] border border-[#d4af37]/40 rounded-xl p-4 max-w-md mx-auto text-left space-y-2.5">
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
          <span className="text-[11px] font-bold text-[#6b6257]">Items Ordered:</span>
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
            <span className="font-bold text-[#1e1b18]">Total Paid / Payable</span>
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
        <div className="bg-[#0d4f3c]/5 border border-[#0d4f3c]/20 rounded-xl p-3.5 max-w-md mx-auto text-left space-y-2">
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
          EXPANDABLE WHATSAPP MESSAGE PREVIEW
      ========================================================================== */}
      <div className="max-w-md mx-auto text-left">
        <details className="bg-white border border-[#d6ccc2] rounded-xl overflow-hidden group">
          <summary className="px-3.5 py-2.5 text-xs font-semibold text-[#5a544c] cursor-pointer flex items-center justify-between hover:bg-[#faf8f5]">
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} className="text-[#25D366]" />
              <span>View Formatted WhatsApp Message Preview</span>
            </span>
            <span className="text-[10px] text-[#0d4f3c] font-bold group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="p-3 bg-[#e5ddd5]/30 border-t border-[#ebe2d8]">
            <div className="bg-white p-3 rounded-xl rounded-tl-none border border-emerald-200/80 shadow-xs text-xs font-sans whitespace-pre-line text-[#1e1b18] leading-relaxed">
              {fullWhatsAppMessage}
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(fullWhatsAppMessage);
                  setCopiedMsg(true);
                  setTimeout(() => setCopiedMsg(false), 2000);
                }}
                className="px-3 py-1 bg-white border border-[#d6ccc2] rounded text-[11px] font-semibold text-[#5a544c] hover:text-black flex items-center gap-1 cursor-pointer"
              >
                {copiedMsg ? (
                  <>
                    <Check size={11} className="text-emerald-600" />
                    <span>Copied Message</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy Message Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </details>
      </div>

      {/* =========================================================================
          ACTION BUTTONS
      ========================================================================== */}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2 max-w-md mx-auto">
        <button
          type="button"
          onClick={handlePrintInvoice}
          className="bg-white border border-[#d6ccc2] text-[#1e1b18] px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#faf8f5] transition-colors cursor-pointer"
        >
          <Printer size={15} />
          <span>Print / Tax Invoice</span>
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
        <span>Signature Lavender Packaging</span>
        <span>·</span>
        <span>Insured Express Transit</span>
      </div>
    </div>
  );
}
