import React from "react";
import { MessageCircle } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export const WHATSAPP_HELP_MESSAGE =
  "Hi House of Shriya! I need some help with my order/product. Could you please assist me?";

export function getWhatsAppHelpUrl(phoneNumber = "919501698356"): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone || "919501698356"}?text=${encodeURIComponent(WHATSAPP_HELP_MESSAGE)}`;
}

export default function WhatsAppHelpButton() {
  const { siteContent } = useStore();
  const phone = siteContent?.whatsappNumber || "919501698356";
  const whatsappUrl = getWhatsAppHelpUrl(phone);

  return (
    <aside
      aria-label="Atelier customer assistance"
      className="fixed bottom-6 right-6 z-40 print:hidden"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20"
        title="Need Help? / Open WhatsApp"
        aria-label="Need Help? Open WhatsApp with pre-filled support message"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <MessageCircle size={17} className="text-white shrink-0" />
        <span className="font-semibold tracking-wide text-white whitespace-nowrap">
          Need Help? / Open WhatsApp
        </span>
      </a>
    </aside>
  );
}
