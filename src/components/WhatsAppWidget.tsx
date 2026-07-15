import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Play, CheckCheck } from "lucide-react";

interface WhatsAppWidgetProps {
  whatsappNumber: string;
  siteTitle?: string;
}

export default function WhatsAppWidget({ whatsappNumber, siteTitle = "Ventas Juem" }: WhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{ id: number; text: string; sender: "agent" | "user"; time: string }[]>([
    {
      id: 1,
      text: `¡Hola! 👋 Bienvenido a la tienda oficial de ${siteTitle}.`,
      sender: "agent",
      time: "Ahora"
    },
    {
      id: 2,
      text: "¿En qué talle, modelo o stock te podemos asesorar en este momento? Te responderemos directo en WhatsApp de manera personalizada.",
      sender: "agent",
      time: "Ahora"
    }
  ]);

  const popupRef = useRef<HTMLDivElement>(null);

  // Auto-show tooltip disabled
  useEffect(() => {
    // Disabled auto tooltip
  }, []);

  // Keyboard accessibility and click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        // Find if they clicked the main floating trigger to avoid double toggle
        const trigger = document.getElementById("wa-widget-trigger");
        if (trigger && trigger.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpenWidget = () => {
    setIsOpen(!isOpen);
    setHasUnread(false);
    setShowTooltip(false);
  };

  const handleCloseTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    sessionStorage.setItem("wa_tooltip_closed", "true");
  };

  const handleQuickReply = (text: string) => {
    setUserMessage(text);
  };

  const cleanNumber = (num: string) => {
    return num.replace(/[^0-9]/g, "");
  };

  const handleSendToWhatsApp = (messageText: string) => {
    if (!messageText.trim()) return;

    // Build WhatsApp complete URL
    const targetPhone = cleanNumber(whatsappNumber || "5491123456789");
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${targetPhone}?text=${encodedText}`;

    // Temporarily add to chat history as self action, simulating live experience before redirecting
    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        text: messageText,
        sender: "user",
        time: "Ahora"
      }
    ]);
    setUserMessage("");

    // Simulate typing answer and redirect
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }, 750);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendToWhatsApp(userMessage);
  };

  const quickReplies = [
    "¿Hacen envíos a todo el país?",
    "¿Tienen stock disponible del catálogo?",
    "Quiero coordinar un talle personalizado",
    "¿Qué medios de pago aceptan?"
  ];

  return (
    <div className="hidden lg:block fixed bottom-6 right-6 z-[999] font-sans select-none">
      
      {/* 1. Expandable Full Widget Popup Panel */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-20 right-0 w-[calc(100vw-32px)] sm:w-[360px] max-w-[380px] bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200/80 dark:border-zinc-850 shadow-2xl overflow-hidden flex flex-col transform origin-bottom-right animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          {/* Header Banner - Sleek Professional Styling */}
          <div className="bg-[#075E54] dark:bg-emerald-950 p-4 shrink-0 text-white flex items-center justify-between border-b border-emerald-900/10">
            <div className="flex items-center gap-3">
              {/* Profile Photo Mock with Green Glow pulsing dot */}
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-emerald-600/30 flex items-center justify-center border-2 border-white/20 overflow-hidden font-bold select-none text-white text-sm">
                  {siteTitle.substring(0, 2).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 animate-pulse"></span>
              </div>
              <div>
                <h4 className="font-bold text-xs tracking-wide leading-tight text-white flex items-center gap-1.5">
                  Soporte de {siteTitle}
                </h4>
                <p className="text-[10px] text-emerald-200 dark:text-emerald-400 font-medium">
                  En línea • Soporte inmediato
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar ventana"
              className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white/80 hover:text-white transition duration-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Timeline (Scrollable Messages Area) */}
          <div className="flex-1 overflow-y-auto max-h-[300px] p-4 bg-[#ece5dd]/50 dark:bg-zinc-900/60 space-y-3 min-h-[220px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                {/* Speech Bubble */}
                <div
                  className={`p-3 rounded-2xl relative shadow-sm text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#d9fdd3] dark:bg-emerald-900 text-slate-900 dark:text-zinc-100 rounded-tr-none"
                      : "bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-300 rounded-tl-none border border-slate-200/20"
                  }`}
                >
                  <p>{m.text}</p>
                  
                  {/* Bubble Tail Accent */}
                  <span
                    className={`absolute top-0 w-2 h-2 ${
                      m.sender === "user"
                        ? "right-[-4px] bg-[#d9fdd3] dark:bg-emerald-900 clip-path-[polygon(0_0,_0_100%,_100%_0)]"
                        : "left-[-4px] bg-white dark:bg-zinc-950 clip-path-[polygon(100%_0,_0_0,_100%_100%)] border-l border-t border-slate-200/20"
                    }`}
                  ></span>
                </div>
                {/* Info Text */}
                <span className="text-[9px] text-slate-500 dark:text-zinc-500 mt-1 px-1 flex items-center gap-1">
                  {m.time}
                  {m.sender === "user" && <CheckCheck className="h-3 w-3 text-emerald-500" />}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-3 py-2 rounded-xl text-zinc-500 max-w-[80px] shadow-sm self-start">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            )}
          </div>

          {/* Quick Replies Options Bar */}
          <div className="p-2 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200/50 dark:border-zinc-850 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none shrink-0">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickReply(reply)}
                className="inline-block bg-white hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-full px-3 py-1 text-[10px] font-medium border border-slate-200/60 dark:border-zinc-800 transition cursor-pointer"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Bottom Chat Editor Footer Form */}
          <form onSubmit={handleSubmitForm} className="p-3 bg-white dark:bg-zinc-950 border-t border-slate-200/60 dark:border-zinc-850 shrink-0 flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribe tu consulta y presiona Enviar..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200 dark:border-zinc-800"
            />
            <button
              type="submit"
              disabled={!userMessage.trim()}
              title="Iniciar conversación en WhatsApp"
              className={`p-2.5 rounded-xl transition duration-200 ${
                userMessage.trim()
                  ? "bg-[#128C7E] text-white hover:bg-emerald-700 hover:scale-105"
                  : "bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-650 cursor-not-allowed"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
      {/* 3. Main Circular Green WhatsApp Trigger Button - Beautifully Rounded, Glow styled */}
      <button
        id="wa-widget-trigger"
        onClick={handleOpenWidget}
        aria-label="Abrir chat de WhatsApp"
        className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-300 relative border border-emerald-400/30 group z-50 shadow-[0_8px_24px_rgba(37,211,102,0.25)] hover:shadow-[0_12px_32px_rgba(37,211,102,0.45)] ${
          isOpen ? "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 border-zinc-700 rotate-[360deg] shadow-zinc-500/15" : "animate-soft-glow"
        }`}
      >
        {/* Pulsing Concentric Aura Ring (only when closed) */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#25D366]/30 animate-soft-ping pointer-events-none" />
        )}

        {isOpen ? (
          <X className="h-6 w-6 text-white shrink-0" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-current transition-transform duration-300 group-hover:scale-105"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
      </button>

    </div>
  );
}
