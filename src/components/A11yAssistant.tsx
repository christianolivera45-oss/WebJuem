import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Eye, 
  Volume2, 
  VolumeX, 
  Accessibility, 
  Sparkles, 
  HelpCircle, 
  Maximize2, 
  Type, 
  Compass, 
  Check, 
  Undo, 
  BookOpen, 
  Keyboard, 
  Navigation,
  Info
} from "lucide-react";

interface A11yAssistantProps {
  cartCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCategory: string;
  navigateToProductRoute: (catId: string, subId: string, forceStorefront?: boolean) => void;
  products: any[];
}

export default function A11yAssistant({ 
  cartCount, 
  activeTab, 
  setActiveTab, 
  selectedCategory,
  navigateToProductRoute,
  products
}: A11yAssistantProps) {
  // Main states
  const [isOpen, setIsOpen] = useState(false);
  const [voiceGuide, setVoiceGuide] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [currentNarrating, setCurrentNarrating] = useState<string>("");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Synthesis and Custom Open Event
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Auto-detect focus elements when active
    const handleGlobalFocus = (e: FocusEvent) => {
      if (!voiceGuide) return;
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const accessibilityText = getAccessibleTextForElement(target);
      if (accessibilityText) {
        speakText(accessibilityText);
        playChime("hover");
      }
    };

    const handleOpenEvent = () => {
      setIsOpen(true);
      playChime("open");
      speakText("Menú de ayuda de accesibilidad abierto. Aquí puede activar la voz guiada o cambiar los modos visuales.");
    };

    document.addEventListener("focusin", handleGlobalFocus);
    window.addEventListener("open-a11y-panel", handleOpenEvent);
    return () => {
      document.removeEventListener("focusin", handleGlobalFocus);
      window.removeEventListener("open-a11y-panel", handleOpenEvent);
    };
  }, [voiceGuide, cartCount, activeTab, selectedCategory]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Assistant: Alt + A
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        togglePanel();
      }
      // Read Page Summary: Alt + P
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        narratePageSummary();
      }
      // Toggle Voice Guide directly: Alt + V
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        toggleVoiceGuide();
      }
      // Go to Storefront/Home: Alt + I (Inicio)
      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setActiveTab("storefront");
        navigateToProductRoute("todos", "all");
        speakText("Navegando al inicio del catálogo de Juem Uruguay.");
        playChime("success");
      }
      // Go to Checkout: Alt + C (Carrito / Checkout)
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (cartCount === 0) {
          speakText("Su carrito de compras está vacío actualmente. Agregue algún artículo primero.");
        } else {
          setActiveTab("checkout");
          speakText("Abriendo el formulario de confirmación de compra.");
          playChime("success");
        }
      }
      // Quick Keyboard Help: Alt + H
      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        speakText(
          !showKeyboardHelp 
            ? "Abriendo guía de atajos de teclado. Presione escape para cerrarla." 
            : "Guía de atajos de teclado cerrada."
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [voiceGuide, cartCount, showKeyboardHelp, activeTab]);

  // Handle high contrast mode injection
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (highContrast) {
      htmlElement.classList.add("a11y-high-contrast");
      // Add custom style block to override colors for pure high contrast
      let styleEl = document.getElementById("a11y-contrast-styles");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "a11y-contrast-styles";
        styleEl.innerHTML = `
          .a11y-high-contrast, .a11y-high-contrast body {
            background-color: #000000 !important;
            color: #FFFF00 !important;
          }
          .a11y-high-contrast p, 
          .a11y-high-contrast span, 
          .a11y-high-contrast h1, 
          .a11y-high-contrast h2, 
          .a11y-high-contrast h3, 
          .a11y-high-contrast h4,
          .a11y-high-contrast svg {
            color: #FFFF00 !important;
            fill: #FFFF00 !important;
          }
          .a11y-high-contrast button, 
          .a11y-high-contrast a, 
          .a11y-high-contrast input, 
          .a11y-high-contrast select, 
          .a11y-high-contrast textarea {
            background-color: #000000 !important;
            color: #00FFFF !important;
            border: 2px solid #FFFF00 !important;
          }
          .a11y-high-contrast button:focus, 
          .a11y-high-contrast a:focus, 
          .a11y-high-contrast input:focus {
            outline: 4px solid #FF00FF !important;
            outline-offset: 2px !important;
          }
          .a11y-high-contrast img {
            filter: grayscale(1) contrast(1.8) !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    } else {
      htmlElement.classList.remove("a11y-high-contrast");
      const styleEl = document.getElementById("a11y-contrast-styles");
      if (styleEl) styleEl.remove();
    }
  }, [highContrast]);

  // Handle large font mode injection
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (largeFont) {
      htmlElement.classList.add("a11y-large-font");
      let styleEl = document.getElementById("a11y-font-styles");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "a11y-font-styles";
        styleEl.innerHTML = `
          .a11y-large-font {
            font-size: 118% !important;
          }
          .a11y-large-font * {
            letter-spacing: 0.04em !important;
            line-height: 1.65 !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    } else {
      htmlElement.classList.remove("a11y-large-font");
      const styleEl = document.getElementById("a11y-font-styles");
      if (styleEl) styleEl.remove();
    }
  }, [largeFont]);

  // Handle link underlines
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (underlineLinks) {
      htmlElement.classList.add("a11y-underline-links");
      let styleEl = document.getElementById("a11y-underline-styles");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "a11y-underline-styles";
        styleEl.innerHTML = `
          .a11y-underline-links a, 
          .a11y-underline-links button {
            text-decoration: underline !important;
            text-underline-offset: 3px !important;
          }
          /* Custom screen-reader visible outline */
          .a11y-underline-links *:focus-visible {
            outline: 4px solid #D4A55A !important;
            outline-offset: 4px !important;
            box-shadow: 0 0 0 8px rgba(212, 165, 90, 0.35) !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    } else {
      htmlElement.classList.remove("a11y-underline-links");
      const styleEl = document.getElementById("a11y-underline-styles");
      if (styleEl) styleEl.remove();
    }
  }, [underlineLinks]);

  // Browser Audio Synthesizer for high-fidelity Chimes
  const playChime = (type: "open" | "success" | "toggle" | "hover") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "open") {
        // Comfort chord
        osc.type = "sine";
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else if (type === "success") {
        // Bright feedback
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "toggle") {
        // Toggle sound
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "hover") {
        // Subtle feedback
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (err) {
      // Ignored if user hasn't interacted yet
    }
  };

  // Text to Speech Narrator
  const speakText = (text: string) => {
    if (!synthRef.current) return;
    
    // Stop current speech
    try {
      synthRef.current.cancel();
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-UY"; // Localized Uruguayan Spanish accent if available, otherwise fallback es-ES
    utterance.rate = 1.05; // Slightly faster for high-usability listening
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setCurrentNarrating(text);
    };

    utterance.onend = () => {
      setCurrentNarrating("");
    };

    activeUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  // Parsing interactive HTML elements to describe them precisely
  const getAccessibleTextForElement = (el: HTMLElement): string => {
    // 1. Explicit aria-label
    if (el.getAttribute("aria-label")) {
      return el.getAttribute("aria-label")!;
    }

    // 2. Button and link text parsing
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === "button" || el.getAttribute("role") === "button") {
      let label = "Botón: " + (el.innerText || el.title || "sin texto");
      if (el.classList.contains("bg-[#D4A55A]") || el.innerText?.toLowerCase().includes("agregar")) {
        label += ". Presione enter para añadir al pedido.";
      }
      return label;
    }

    if (tagName === "a" || el.getAttribute("role") === "link") {
      return "Enlace a: " + (el.innerText || el.title || el.getAttribute("href") || "página interna");
    }

    if (tagName === "input") {
      const input = el as HTMLInputElement;
      let label = "Campo de escritura: " + (input.placeholder || input.name || "Texto");
      if (input.required) label += ". Requerido.";
      if (input.value) label += ". Valor actual: " + input.value;
      return label;
    }

    if (tagName === "select") {
      const select = el as HTMLSelectElement;
      return "Menú de selección: " + (select.name || "Opciones") + ". Use las flechas arriba y abajo para cambiar la opción.";
    }

    // 3. Category selector tags
    if (el.dataset?.category) {
      return `Categoría de productos: ${el.dataset.category}`;
    }

    return el.innerText ? el.innerText.substring(0, 150) : "";
  };

  // Global Page Summary for Blind Users
  const narratePageSummary = () => {
    let summaryText = "Resumen de Juem Uruguay. ";
    summaryText += `Estás en la pestaña de ${activeTab === "storefront" ? "Catálogo Principal" : activeTab === "checkout" ? "Confirmación de Pedido" : "Administración"}. `;
    
    if (activeTab === "storefront") {
      summaryText += `Viendo categoría ${selectedCategory || "Todas"}. `;
      summaryText += `Hay un total de ${products.filter(p => p.active !== false).length} productos activos en nuestro catálogo. `;
    }

    summaryText += `Tienes ${cartCount} artículos agregados al carrito de compras. `;
    summaryText += "Atajos recomendados: Presione Alt más I para ir al catálogo, Alt más C para completar el pedido, y Alt más H para ver todas las ayudas por teclado.";

    speakText(summaryText);
    playChime("success");
  };

  const togglePanel = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    playChime("open");
    
    if (nextState) {
      speakText("Menú de ayuda de accesibilidad abierto. Aquí puede activar la voz guiada o cambiar los modos visuales.");
    } else {
      speakText("Menú de accesibilidad cerrado.");
    }
  };

  const toggleVoiceGuide = () => {
    const nextState = !voiceGuide;
    setVoiceGuide(nextState);
    playChime("toggle");
    
    if (nextState) {
      setTimeout(() => {
        speakText("Lector por voz activado correctamente. Al pasar el mouse o enfocar con el teclado cualquier elemento de la pantalla, lo leeré en voz alta para usted.");
      }, 300);
    } else {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    }
  };

  return (
    <>
      {/* Screen Reader Voice HUD Indicator */}
      {voiceGuide && currentNarrating && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] bg-[#050B1A]/95 border border-[#D4A55A] text-[#F4EAD7] px-4 py-2.5 rounded-full shadow-2xl text-[11px] font-mono flex items-center gap-2 max-w-md pointer-events-none transition-all">
          <Volume2 className="h-4.5 w-4.5 text-[#E6BF76] animate-bounce shrink-0" />
          <span className="line-clamp-1">{currentNarrating}</span>
        </div>
      )}

      {/* Main Accessibility Control Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop panel */}
            <div 
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" 
              onClick={() => {
                setIsOpen(false);
                speakText("Menú de accesibilidad cerrado.");
              }}
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-full max-w-sm bg-[#050B1A] border-r border-[#D4A55A]/30 text-[#F4EAD7] z-50 flex flex-col shadow-2xl p-6"
              role="dialog"
              aria-modal="true"
              aria-label="Ajustes de accesibilidad de Juem"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#D4A55A]/20 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#D4A55A]/15 rounded-xl border border-[#D4A55A]/35">
                    <Accessibility className="h-5 w-5 text-[#E6BF76]" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-[#E6BF76]">
                      Menú de Accesibilidad
                    </h2>
                    <p className="text-[10px] text-zinc-400 font-medium">Atajo global: Alt + A</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    speakText("Menú de accesibilidad cerrado.");
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition cursor-pointer"
                  aria-label="Cerrar panel de accesibilidad"
                >
                  <Undo className="h-5 w-5" />
                </button>
              </div>

              {/* Assistance list */}
              <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                {/* Voice Assistant Toggle */}
                <div className="p-4 rounded-2xl bg-[#0B1730]/65 border border-[#D4A55A]/20 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="h-4.5 w-4.5 text-[#E6BF76]" />
                        <h3 className="font-black text-xs uppercase tracking-wide text-white">Audio-Guía de Navegación</h3>
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-relaxed font-semibold">
                        Lee en voz alta las opciones, productos y precios cuando los enfocas con el teclado o pasas el cursor.
                      </p>
                    </div>
                    <button
                      onClick={toggleVoiceGuide}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        voiceGuide ? "bg-emerald-500" : "bg-zinc-700"
                      }`}
                      aria-label="Activar o desactivar lector por voz de Juem"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          voiceGuide ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {voiceGuide && (
                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                      <button 
                        onClick={narratePageSummary}
                        className="w-full py-1.5 px-3 bg-[#D4A55A]/20 hover:bg-[#D4A55A]/35 text-[#E6BF76] font-bold rounded-lg text-[10px] tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Escuchar resumen de esta página (Alt + P)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Keyboard Shortcuts Prompt */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]/80">Navegación Asistida</h4>
                  <button
                    onClick={() => {
                      const next = !showKeyboardHelp;
                      setShowKeyboardHelp(next);
                      speakText(next ? "Atajos abiertos." : "Atajos cerrados.");
                      playChime("toggle");
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4 text-[#E6BF76]" />
                      <span className="text-xs font-black">Guía de Atajos de Teclado</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-lg">Alt + H</span>
                  </button>
                </div>

                {/* Visual Adjustments for Low Vision */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]/80">Ajustes Visuales (Baja Visión)</h4>
                  
                  {/* High Contrast */}
                  <button
                    onClick={() => {
                      const next = !highContrast;
                      setHighContrast(next);
                      speakText(next ? "Alto contraste amarillo y negro activado." : "Alto contraste desactivado.");
                      playChime("toggle");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      highContrast 
                        ? "bg-[#FFFF00] text-black border-[#FFFF00]" 
                        : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800 text-[#F4EAD7]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs font-black">Alto Contraste Extremo</span>
                    </div>
                    {highContrast && <Check className="h-4 w-4" />}
                  </button>

                  {/* Font Size Enlargement */}
                  <button
                    onClick={() => {
                      const next = !largeFont;
                      setLargeFont(next);
                      speakText(next ? "Tamaño de letra maximizado con espaciado amplio." : "Tamaño de letra restaurado al normal.");
                      playChime("toggle");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      largeFont 
                        ? "bg-[#D4A55A]/25 border-[#D4A55A] text-[#E6BF76]" 
                        : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800 text-[#F4EAD7]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Type className="h-4 w-4" />
                      <span className="text-xs font-black">Fuente Agrandada y Espaciada</span>
                    </div>
                    {largeFont && <Check className="h-4 w-4" />}
                  </button>

                  {/* Underline interactive items */}
                  <button
                    onClick={() => {
                      const next = !underlineLinks;
                      setUnderlineLinks(next);
                      speakText(next ? "Subrayados y bordes dorados de enfoque activados." : "Bordes de enfoque normales.");
                      playChime("toggle");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      underlineLinks 
                        ? "bg-[#D4A55A]/25 border-[#D4A55A] text-[#E6BF76]" 
                        : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800 text-[#F4EAD7]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Maximize2 className="h-4 w-4" />
                      <span className="text-xs font-black">Resaltar Bordes y Enlaces</span>
                    </div>
                    {underlineLinks && <Check className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Info footer */}
              <div className="pt-4 border-t border-[#D4A55A]/20 flex flex-col gap-1 text-[10px] text-zinc-400">
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-[#E6BF76]" />
                  <span>Nuestra tienda está optimizada para lectores de pantalla de sistemas operativos iOS, Android y Windows.</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Keyboard Help Modal Sheet */}
      <AnimatePresence>
        {showKeyboardHelp && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div 
              className="absolute inset-0" 
              onClick={() => {
                setShowKeyboardHelp(false);
                speakText("Guía de atajos de teclado cerrada.");
              }} 
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050B1A] border-2 border-[#D4A55A]/40 p-6 rounded-2xl max-w-md w-full relative z-10 space-y-4 text-[#F4EAD7] shadow-2xl"
              role="document"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-[#D4A55A]/20">
                <Keyboard className="h-5 w-5 text-[#E6BF76]" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Guía Completa para Personas No Videntes</h3>
              </div>

              <p className="text-[11px] text-zinc-300 leading-relaxed font-semibold">
                Para navegar por esta tienda sin ver la pantalla, puede utilizar estos atajos del teclado en cualquier momento:
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300">Abrir / Cerrar este menú</span>
                  <kbd className="bg-zinc-800 text-[#E6BF76] font-mono px-2 py-0.5 rounded font-bold text-[10px]">Alt + A</kbd>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300">Activar / Desactivar voz integrada</span>
                  <kbd className="bg-zinc-800 text-[#E6BF76] font-mono px-2 py-0.5 rounded font-bold text-[10px]">Alt + V</kbd>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300">Escuchar resumen de la pantalla</span>
                  <kbd className="bg-zinc-800 text-[#E6BF76] font-mono px-2 py-0.5 rounded font-bold text-[10px]">Alt + P</kbd>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300">Ir a la página de Inicio</span>
                  <kbd className="bg-zinc-800 text-[#E6BF76] font-mono px-2 py-0.5 rounded font-bold text-[10px]">Alt + I</kbd>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300">Ir a Confirmar Pedido (Carrito)</span>
                  <kbd className="bg-zinc-800 text-[#E6BF76] font-mono px-2 py-0.5 rounded font-bold text-[10px]">Alt + C</kbd>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-semibold text-zinc-300">Abrir ayuda de atajos</span>
                  <kbd className="bg-zinc-800 text-[#E6BF76] font-mono px-2 py-0.5 rounded font-bold text-[10px]">Alt + H</kbd>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowKeyboardHelp(false);
                    speakText("Guía de atajos de teclado cerrada.");
                  }}
                  className="w-full py-2 bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] font-black rounded-xl text-xs transition cursor-pointer"
                >
                  Entendido (Cerrar Guía)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
