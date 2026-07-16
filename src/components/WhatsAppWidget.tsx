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
          className="absolute bottom-24 right-0 w-[calc(100vw-32px)] sm:w-[360px] max-w-[380px] bg-[#0B1730]/95 backdrop-blur-md rounded-3xl border border-[#D4A55A]/25 shadow-[0_12px_40px_rgba(5,11,26,0.65)] overflow-hidden flex flex-col transform origin-bottom-right animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          {/* Header Banner - Sleek Professional Styling */}
          <div className="bg-[#0B1730] p-4 shrink-0 text-[#F4EAD7] flex items-center justify-between border-b border-[#D4A55A]/20 relative overflow-hidden">
            {/* Subtle inner background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A55A]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 relative z-10">
              {/* Profile Photo Mock with Golden Glow pulsing dot */}
              <div className="relative">
                <div className="h-10 w-10 rounded-2xl bg-[#050B1A] flex items-center justify-center border border-[#D4A55A]/30 overflow-hidden font-serif font-bold text-[#E6BF76] text-sm tracking-wider shadow-sm">
                  {siteTitle.substring(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-[#D4A55A] border-2 border-[#0B1730] animate-pulse"></span>
              </div>
              <div>
                <h4 className="font-serif font-bold text-xs tracking-wider leading-tight text-[#F4EAD7] flex items-center gap-1.5">
                  Soporte de {siteTitle}
                </h4>
                <p className="text-[10px] text-[#E6BF76]/80 font-mono tracking-wide font-medium mt-0.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4A55A]" /> En línea • Soporte inmediato
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar ventana"
              className="p-1.5 rounded-xl bg-[#050B1A] border border-[#D4A55A]/15 hover:bg-[#D4A55A]/15 hover:border-[#D4A55A]/35 text-[#F4EAD7]/70 hover:text-[#E6BF76] transition duration-200 cursor-pointer relative z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Timeline (Scrollable Messages Area) */}
          <div className="flex-1 overflow-y-auto max-h-[300px] p-4 bg-[#050B1A] space-y-3 min-h-[220px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"} animate-in fade-in duration-200`}
              >
                {/* Speech Bubble */}
                <div
                  className={`p-3 px-4 rounded-2xl relative shadow-sm text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#D4A55A]/15 text-[#F4EAD7] border border-[#D4A55A]/30 rounded-tr-none"
                      : "bg-[#0B1730] text-[#F4EAD7]/90 border border-[#D4A55A]/10 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
                {/* Info Text */}
                <span className="text-[9px] text-zinc-500 mt-1 px-1 flex items-center gap-1 font-mono">
                  {m.time}
                  {m.sender === "user" && <CheckCheck className="h-3 w-3 text-[#D4A55A]" />}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-[#0B1730] border border-[#D4A55A]/10 px-3 py-2 rounded-xl text-zinc-500 max-w-[80px] shadow-sm self-start">
                <span className="w-1.5 h-1.5 bg-[#D4A55A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-[#D4A55A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-[#D4A55A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            )}
          </div>

          {/* Quick Replies Options Bar */}
          <div className="p-2 bg-[#0B1730] border-t border-[#D4A55A]/10 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none shrink-0">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickReply(reply)}
                className="inline-block bg-[#050B1A] hover:bg-[#D4A55A]/10 text-zinc-350 hover:text-[#E6BF76] rounded-full px-3 py-1 text-[10px] font-bold border border-[#D4A55A]/15 hover:border-[#D4A55A]/40 transition duration-200 cursor-pointer"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Bottom Chat Editor Footer Form */}
          <form onSubmit={handleSubmitForm} className="p-3 bg-[#0B1730] border-t border-[#D4A55A]/15 shrink-0 flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribe tu consulta y presiona Enviar..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-[#050B1A] text-[#F4EAD7] placeholder:text-zinc-550 rounded-xl outline-none border border-[#D4A55A]/20 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]/40"
            />
            <button
              type="submit"
              disabled={!userMessage.trim()}
              title="Iniciar conversación en WhatsApp"
              className={`p-2.5 rounded-xl transition duration-250 cursor-pointer ${
                userMessage.trim()
                  ? "bg-[#D4A55A] text-[#050B1A] hover:bg-[#E6BF76] hover:scale-105"
                  : "bg-[#050B1A] text-zinc-600 border border-[#D4A55A]/10 cursor-not-allowed"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
      
      {/* 3. Main Circular WhatsApp Trigger Button - Beautifully Rounded, Glow styled */}
      <button
        id="wa-widget-trigger"
        onClick={handleOpenWidget}
        aria-label="Abrir chat de WhatsApp"
        className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-300 relative border group z-50 ${
          isOpen 
            ? "bg-[#0B1730] text-[#E6BF76] border-[#D4A55A]/35 rotate-[360deg] shadow-[0_8px_24px_rgba(5,11,26,0.4)]" 
            : "bg-[#D4A55A] text-[#050B1A] border-[#E6BF76]/30 shadow-[0_8px_24px_rgba(212,165,90,0.3)] hover:shadow-[0_12px_32px_rgba(212,165,90,0.5)] animate-soft-glow"
        }`}
      >
        {/* Pulsing Concentric Aura Ring (only when closed) */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#D4A55A]/35 animate-soft-ping pointer-events-none" />
        )}

        {isOpen ? (
          <X className="h-6 w-6 shrink-0" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 sm:w-8 sm:h-8 fill-current transition-transform duration-300 group-hover:scale-105"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
      </button>

    </div>
  );
}
