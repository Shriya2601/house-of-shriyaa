import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Product } from "../../types";
import {
  generatePookieAnswer,
  POOKIE_WELCOME_MESSAGE,
  POOKIE_INITIAL_QUICK_REPLIES,
} from "./pookieKnowledge";

interface ChatMessage {
  id: string;
  sender: "pookie" | "user";
  text: string;
  timestamp: string;
  suggestedProducts?: Product[];
  quickReplies?: string[];
}

export default function PookieChatbot() {
  const { products, siteContent, addToCart, setIsCartOpen } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showGreetingTooltip, setShowGreetingTooltip] = useState(true);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-1",
      sender: "pookie",
      text: POOKIE_WELCOME_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickReplies: POOKIE_INITIAL_QUICK_REPLIES,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat when new messages appear or typing changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setShowGreetingTooltip(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Dismiss greeting bubble after 10 seconds if unopened
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreetingTooltip(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, []);

  // Listen to custom window event to open Pookie from any part of the site
  // (e.g. from header "Ask Pookie" button, hero "Ask Pookie" button, etc.)
  useEffect(() => {
    const handleOpenPookie = (e: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      if (customEvent.detail?.prompt) {
        handleSendMessage(customEvent.detail.prompt);
      }
    };

    window.addEventListener("open-pookie-chat", handleOpenPookie);
    return () => {
      window.removeEventListener("open-pookie-chat", handleOpenPookie);
    };
  }, [products]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Natural typing delay for conversational feel (350ms - 550ms)
    setTimeout(() => {
      const response = generatePookieAnswer(query, products || []);
      const pookieMsg: ChatMessage = {
        id: `pookie-${Date.now()}`,
        sender: "pookie",
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedProducts: response.suggestedProducts,
        quickReplies: response.quickReplies,
      };

      setMessages((prev) => [...prev, pookieMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "pookie",
        text: "Conversation reset! ✨ Hi, I'm Pookie, your styling concierge. What suit or occasion can I help you with right now?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickReplies: POOKIE_INITIAL_QUICK_REPLIES,
      },
    ]);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, "Standard Fit", 1);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 2200);
    setIsCartOpen(true);
  };

  const handleScrollToProduct = (product: Product) => {
    setIsOpen(false);
    const catalogSection = document.getElementById("catalog-section");
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const whatsappNumber = siteContent?.whatsappNumber || "9501698356";
  const getWhatsAppHelpUrl = (inquiry?: string) => {
    const text = encodeURIComponent(
      `Hello House of Shriya atelier, I was chatting with Pookie on your website regarding: ${inquiry || "Custom suit styling and order inquiry"}. Could you please guide me?`
    );
    return `https://wa.me/91${whatsappNumber}?text=${text}`;
  };

  return (
    <>
      {/* 1. FLOATING CHAT BUTTON (BOTTOM RIGHT) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 print:hidden flex flex-col items-end">
        {/* Cute Speech Bubble Greeting (Collapsible) */}
        {showGreetingTooltip && !isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="mb-2 cursor-pointer bg-[#0c1410] border border-[#d4af37]/60 text-[#faf8f5] px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-[260px] animate-bounce duration-1000 select-none group hover:border-[#d4af37]"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f3e5ab] text-[#0c1410] flex items-center justify-center font-serif text-xs font-bold shadow">
              ✨
            </span>
            <div className="text-xs">
              <p className="font-medium text-[#fbf8f2] leading-tight flex items-center gap-1">
                Hi, I'm Pookie!
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </p>
              <p className="text-[0.68rem] text-[#c0b5aa] leading-tight mt-0.5">
                Need styling or suit help? Tap to chat!
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGreetingTooltip(false);
              }}
              className="text-[#998b7d] hover:text-white p-0.5"
              aria-label="Dismiss greeting"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* The Small Cute Chat Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close Pookie Chat" : "Chat with Pookie AI Stylist"}
          className={`group relative flex items-center justify-center rounded-full transition-all duration-300 shadow-2xl active:scale-95 ${
            isOpen
              ? "w-11 h-11 sm:w-12 sm:h-12 bg-[#17241f] text-[#faf8f5] border border-[#d4af37]/50"
              : "w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-br from-[#0e1814] via-[#09100d] to-[#162720] border-2 border-[#d4af37] text-white shadow-[0_4px_22px_rgba(212,175,55,0.4)] hover:scale-105 hover:shadow-[0_6px_28px_rgba(212,175,55,0.55)]"
          }`}
          title="Chat with Pookie AI Styling Concierge"
        >
          {isOpen ? (
            <ChevronDown size={20} className="text-[#faf8f5] transition-transform duration-200" />
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Cute Stylist Sparkle Icon */}
              <Sparkles
                size={22}
                className="text-[#f5d77f] group-hover:rotate-12 transition-transform duration-300 animate-pulse"
              />

              {/* Online Indicator Dot */}
              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#09100d]"></span>
              </span>

              {/* Mini Cute Label */}
              <span className="absolute -bottom-4 bg-[#d4af37] text-[#0c1410] font-bold text-[0.58rem] tracking-wider uppercase px-1.5 py-0.2 rounded-full shadow pointer-events-none whitespace-nowrap">
                Pookie
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 2. CLEAN CHAT WINDOW */}
      {isOpen && (
        <div
          className="fixed bottom-19 right-3 sm:bottom-23 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[410px] max-w-[430px] h-[580px] max-h-[82vh] bg-[#0c1410]/98 border border-[#d4af37]/45 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl flex flex-col overflow-hidden text-[#faf8f5] animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="Pookie AI Chat"
        >
          {/* Top Window Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#121d18] via-[#0f1915] to-[#15231d] border-b border-[#d4af37]/25">
            <div className="flex items-center gap-2.5">
              {/* Pookie Mascot Avatar */}
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#f3e5ab] to-[#b88c29] p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full rounded-full bg-[#0c1410] flex items-center justify-center">
                  <Sparkles size={16} className="text-[#f5d77f]" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1410]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-sm font-semibold tracking-wide text-[#faf8f5]">
                    Pookie
                  </h3>
                  <span className="text-[0.62rem] bg-[#d4af37]/20 text-[#f5d77f] px-1.5 py-0.5 rounded border border-[#d4af37]/35 font-medium">
                    AI Stylist
                  </span>
                </div>
                <p className="text-[0.68rem] text-[#b8ab9a] flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  House of Shriya · Online
                </p>
              </div>
            </div>

            {/* Header Actions: Reset & Close */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-[#b8ab9a] hover:text-[#f5d77f] hover:bg-white/5 rounded-lg transition-colors"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#b8ab9a] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Close chat"
                aria-label="Close chat"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Conversation Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Sender Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-[#0c1410] font-medium rounded-tr-xs"
                      : "bg-[#14201a] text-[#fbf8f2] border border-[#d4af37]/20 rounded-tl-xs"
                  }`}
                >
                  <div className="whitespace-pre-line break-words">{msg.text}</div>

                  {/* Interactive Recommended Product Cards */}
                  {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
                      <p className="text-[0.65rem] font-semibold text-[#f5d77f] uppercase tracking-wider">
                        Handpicked Recommendations:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.suggestedProducts.map((product) => {
                          const isAdded = addedProductId === product.id;
                          return (
                            <div
                              key={product.id}
                              className="flex items-center gap-2.5 p-2 rounded-xl bg-[#09100d] border border-white/10 hover:border-[#d4af37]/40 transition-colors"
                            >
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-14 object-cover rounded-lg flex-shrink-0 bg-[#16201a]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-serif font-medium text-xs text-white truncate">
                                  {product.name}
                                </p>
                                <p className="text-[0.65rem] text-[#b8ab9a] truncate">
                                  {product.fabricType} · {product.color}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-[#f5d77f]">
                                    {product.price}
                                  </span>
                                  {product.savings && (
                                    <span className="text-[0.6rem] text-emerald-400 bg-emerald-950/60 px-1 rounded">
                                      {product.savings}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleAddToCart(product)}
                                  disabled={isAdded}
                                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                                    isAdded
                                      ? "bg-emerald-500 text-white"
                                      : "bg-[#d4af37] text-[#0c1410] hover:brightness-110 active:scale-95"
                                  }`}
                                  title="Add to Bag"
                                  aria-label={`Add ${product.name} to cart`}
                                >
                                  {isAdded ? <Check size={13} /> : <ShoppingBag size={13} />}
                                </button>
                                <button
                                  onClick={() => handleScrollToProduct(product)}
                                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
                                  title="View in Store"
                                  aria-label={`View ${product.name} in store`}
                                >
                                  <ExternalLink size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <span
                    className={`block text-[0.6rem] mt-1 text-right ${
                      msg.sender === "user" ? "text-[#0c1410]/70" : "text-[#8c7e70]"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {/* Quick Reply Suggestion Chips */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                    {msg.quickReplies.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip)}
                        className="text-[0.68rem] px-2.5 py-1 rounded-full bg-[#17251f] hover:bg-[#20342b] text-[#f3e5ab] border border-[#d4af37]/30 hover:border-[#d4af37] transition-all cursor-pointer active:scale-95 text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Pookie Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-[#b8ab9a] bg-[#14201a] border border-[#d4af37]/20 rounded-2xl rounded-tl-xs px-3.5 py-2 max-w-[120px]">
                <Sparkles size={13} className="text-[#f5d77f] animate-spin" />
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce"></span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp Atelier Escalation Banner */}
          <div className="px-3 py-1.5 bg-[#09100d] border-t border-white/5 flex items-center justify-between text-[0.68rem] text-[#b8ab9a]">
            <span className="flex items-center gap-1 truncate">
              Need suit styling assistance?
            </span>
            <a
              href={getWhatsAppHelpUrl(inputText || "Suit styling & collection assistance")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium whitespace-nowrap"
            >
              <MessageCircle size={12} />
              WhatsApp Master Stylist ↗
            </a>
          </div>

          {/* Bottom Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-[#121d18] border-t border-[#d4af37]/20 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Pookie about suits, colors, fabrics, unstitched sets..."
              className="flex-1 bg-[#0a120e] text-[#faf8f5] text-xs px-3.5 py-2.5 rounded-xl border border-[#d4af37]/25 focus:border-[#d4af37] focus:outline-none placeholder:text-[#7f7467]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-[#0c1410] font-semibold hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
              aria-label="Send message to Pookie"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
