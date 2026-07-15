import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { 
  Sparkles, Send, Bot, User, RefreshCw, AlertCircle, TrendingUp, 
  Tag, MessageSquare, Box, ShoppingCart, HelpCircle, X, 
  Settings, Paperclip, Mic, MicOff, Info, Check, ArrowRight,
  Sparkle, Compass
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShopState, Product } from "../types";

export interface AIAssistantProps {
  store: ShopState;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onClose?: () => void;
  adminSection?: string;
  onEditProduct?: (product: Product) => void;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  hasAttachment?: boolean;
}

export default function AIAssistant({ store, showToast, onClose, adminSection = "dashboard", onEditProduct }: AIAssistantProps) {
  // Read and write messages with LocalStorage to preserve history
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("copilot_juem_history_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Persisted Copilot settings
  const [configSettings, setConfigSettings] = useState(() => {
    const saved = localStorage.getItem("copilot_juem_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      proactiveMode: true,
      creativity: "medium", // low, medium, high
      responseFormat: "detallado", // sintetico, detallado
    };
  });

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // File attachment states
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-save history
  useEffect(() => {
    localStorage.setItem("copilot_juem_history_v3", JSON.stringify(messages));
  }, [messages]);

  // Auto-save config
  useEffect(() => {
    localStorage.setItem("copilot_juem_config", JSON.stringify(configSettings));
  }, [configSettings]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Speech to text integration
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "es-UY"; // Uruguayan Spanish!

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? " " : "") + text);
        showToast("Voz procesada con éxito", "success");
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        setIsRecording(false);
        showToast("Error al procesar voz. Escribe tu consulta.", "warning");
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      showToast("La entrada por voz no es compatible con este navegador.", "info");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("La imagen supera el límite de 5MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        showToast("Imagen de factura/producto adjuntada correctamente.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Prepares personal welcome text
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Buenos días, Uriel";
    if (hours < 20) return "Buenas tardes, Uriel";
    return "Buenas noches, Uriel";
  };

  // Scan live metrics from the system state
  const activeProducts = store.products.filter(p => p.active !== false);
  const lowStockProducts = activeProducts.filter(p => p.stock <= 3);
  const noImageProducts = activeProducts.filter(p => !p.imageUrl || p.imageUrl.trim() === "");
  const pendingOrdersCount = store.orders ? store.orders.filter(o => o.status === "pedido_iniciado" || o.status === "pago_pendiente").length : 0;
  
  // Average profit margin
  let avgMargin = 0;
  let marginCount = 0;
  activeProducts.forEach(p => {
    if (p.precioCompra && p.price) {
      const margin = ((p.price - p.precioCompra) / p.price) * 100;
      avgMargin += margin;
      marginCount++;
    }
  });
  const finalAvgMargin = marginCount > 0 ? Math.round(avgMargin / marginCount) : 48;

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() && !attachedImage) return;

    let textWithImageNote = textToSend;
    if (attachedImage) {
      textWithImageNote += " [Imagen de factura/producto adjuntada para análisis multimodal]";
    }

    const userMessage: Message = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: textToSend || "Analiza la imagen adjunta",
      timestamp: new Date(),
      hasAttachment: !!attachedImage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsLoading(true);

    try {
      const token = localStorage.getItem("apex_admin_token") || "";
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textWithImageNote,
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();
      if (data.success && data.text) {
        setMessages(prev => [...prev, {
          id: "msg-" + (Date.now() + 1),
          sender: "assistant",
          text: data.text,
          timestamp: new Date()
        }]);
      } else {
        throw new Error(data.message || "No se pudo obtener una respuesta válida");
      }
    } catch (err: any) {
      console.error("Error sending message to AI Assistant:", err);
      showToast("Error de conexión con el Copilot. Inténtalo de nuevo.", "error");
      setMessages(prev => [...prev, {
        id: "msg-err-" + Date.now(),
        sender: "assistant",
        text: "⚠️ **Error de conexión**: No pude comunicarme con el servidor. Por favor, verifica que tu conexión sea estable e inténtalo de nuevo.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionType: string) => {
    let promptText = "";
    switch (actionType) {
      case "stock":
        promptText = "Haz una auditoría rápida de mi stock. ¿Cuáles son los productos con stock más bajo o crítico? Distingue por favor entre el depósito de Montevideo y Pinamar.";
        break;
      case "profit":
        promptText = "Calcula los márgenes de rentabilidad de mis productos activos basándote en el precio de costo (precio de compra) y el precio de venta actual. ¿Cuáles son los 3 más rentables?";
        break;
      case "summary":
        promptText = "Dame un resumen del estado general de la tienda: cantidad de productos activos, categorías, estado de los pedidos recientes y configuración de envíos gratis.";
        break;
      case "shipping":
        promptText = "Dame recomendaciones sobre cómo optimizar el envío gratis y las agencias logísticas basándote en la configuración actual.";
        break;
      case "billing":
        promptText = "Dame una auditoría rápida de las facturas ingresadas al stock recientes y resumen de egresos.";
        break;
      case "mercadolibre":
        promptText = "Dime cómo optimizar mis comisiones fijas de Mercado Libre y mis precios sugeridos de venta.";
        break;
      case "whatsapp":
        promptText = "Escribe una plantilla de cobro amigable por WhatsApp para enviarle a los clientes que tienen compras con estado de Pago Pendiente.";
        break;
      case "reordering":
        promptText = "Dime qué orden de reposición inteligente propones para los productos con baja existencia en Montevideo y Pinamar.";
        break;
      case "critical_stock":
        promptText = "Muéstrame un reporte del stock crítico detallado con productos en stock cero o negativo.";
        break;
      default:
        promptText = "";
    }
    if (promptText) {
      handleSendMessage(promptText);
    }
  };

  const parseInlineFormatting = (text: string) => {
    const parts = [];
    let currentIdx = 0;
    const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|(`)(.*?)\5/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      if (matchStart > currentIdx) {
        parts.push(text.substring(currentIdx, matchStart));
      }

      if (match[1]) {
        // Bold
        parts.push(<strong key={matchStart} className="font-extrabold text-white">{match[2]}</strong>);
      } else if (match[3]) {
        // Italic
        parts.push(<em key={matchStart} className="italic text-zinc-300">{match[4]}</em>);
      } else if (match[5]) {
        // Code backticks
        parts.push(<code key={matchStart} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 rounded text-[10px] font-mono text-indigo-300">{match[6]}</code>);
      }

      currentIdx = regex.lastIndex;
    }

    if (currentIdx < text.length) {
      parts.push(text.substring(currentIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, lineIndex) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={lineIndex} className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-400 mt-3 mb-1 font-mono">
            {parseInlineFormatting(line.slice(4))}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={lineIndex} className="text-xs font-black text-white mt-4 mb-1.5 font-sans border-b border-zinc-850 pb-1 flex items-center gap-1">
            <Sparkle className="h-3 w-3 text-indigo-400" />
            {parseInlineFormatting(line.slice(3))}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={lineIndex} className="text-sm font-black text-white mt-4 mb-2 font-sans tracking-tight">
            {parseInlineFormatting(line.slice(2))}
          </h2>
        );
      }

      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const content = line.trim().substring(2);
        return (
          <li key={lineIndex} className="ml-3 list-none text-xs text-zinc-350 py-0.5 leading-relaxed font-sans flex items-start gap-1.5">
            <span className="text-indigo-500 mt-1.5 block w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
            <span>{parseInlineFormatting(content)}</span>
          </li>
        );
      }

      const numListMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numListMatch) {
        const content = numListMatch[2];
        return (
          <li key={lineIndex} className="ml-3 list-none text-xs text-zinc-350 py-0.5 leading-relaxed font-sans flex items-start gap-1.5">
            <span className="text-indigo-400 font-mono text-[10px] font-bold mt-0.5 shrink-0">{numListMatch[1]}.</span>
            <span>{parseInlineFormatting(content)}</span>
          </li>
        );
      }

      if (!line.trim()) {
        return <div key={lineIndex} className="h-1.5" />;
      }

      return (
        <p key={lineIndex} className="text-xs text-zinc-350 leading-relaxed py-0.5 font-sans">
          {parseInlineFormatting(line)}
        </p>
      );
    });
  };

  const cleanChatHistory = () => {
    if (window.confirm("¿Seguro que deseas reiniciar el historial de chat con el asistente?")) {
      setMessages([]);
      showToast("Conversación reiniciada con éxito", "info");
    }
  };

  // Interactive Product Cards matching the SKU referenced in message
  const renderSmartCardsForMessage = (msg: Message) => {
    if (msg.sender !== "assistant") return null;

    // Detect if message has any SKU codes
    const found = store.products.filter(p => {
      if (p.active === false || !p.codigo) return false;
      const code = p.codigo.trim().toUpperCase();
      if (!code) return false;
      const regex = new RegExp(`\\b${code}\\b`, "i");
      return regex.test(msg.text);
    }).slice(0, 2);

    if (found.length === 0) return null;

    return (
      <div className="mt-3.5 space-y-2">
        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
          Ficha Comercial Detectada
        </p>
        {found.map(p => {
          const cost = p.precioCompra || 0;
          const price = p.price || 0;
          const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

          return (
            <motion.div 
              key={p.id} 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl space-y-2.5 hover:border-indigo-500/30 transition-all shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-9 h-9 object-cover rounded-lg border border-zinc-800 shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-xs shrink-0">📦</div>
                )}
                <div className="min-w-0 flex-grow">
                  <h4 className="text-[11px] font-bold text-white truncate leading-snug">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.5 bg-zinc-800 text-[8px] font-bold text-zinc-400 rounded uppercase font-mono">{p.codigo}</span>
                    <span className="text-[9px] text-zinc-400 font-medium">Stock: <strong className={p.stock <= 3 ? "text-amber-500 font-bold" : "text-zinc-200"}>{p.stock}</strong></span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-1 py-1.5 border-t border-zinc-850 text-[9px] font-mono">
                <div>
                  <span className="text-zinc-500 block">Costo:</span>
                  <span className="text-zinc-300 font-bold">${cost}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Precio:</span>
                  <span className="text-zinc-300 font-bold">${price}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Margen:</span>
                  <span className={`font-bold ${margin >= 40 ? "text-emerald-400" : "text-amber-400"}`}>{margin}%</span>
                </div>
              </div>

              {onEditProduct && (
                <button
                  onClick={() => onEditProduct(p)}
                  className="w-full py-1.5 bg-zinc-850 hover:bg-indigo-600 hover:text-white text-[10px] font-bold text-zinc-300 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Ver y Editar Producto</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Visual text helper describing context
  const getContextLabel = () => {
    switch (adminSection) {
      case "products":
        return "Foco en Catálogo de Productos";
      case "stock":
        return "Foco en Inventario de Sucursales";
      case "sales":
        return "Foco en Ventas y Pedidos";
      case "shippings":
        return "Foco en Envíos y Logística";
      case "payments":
        return "Foco en Pasarelas y Caja";
      default:
        return "Foco Administrativo General";
    }
  };

  return (
    <div id="ai-assistant-container" className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden relative select-none">
      {/* 1. Header Redesign (Super clean, elegant and minimal) */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded flex items-center justify-center">
            <Sparkles className="h-3 w-3 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white tracking-tight uppercase font-mono flex items-center gap-1.5">
              Copilot JUEM
            </h2>
            <p className="text-[8px] text-zinc-500 font-semibold">{getContextLabel()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden xs:flex items-center gap-1 text-[8px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-500">LIVE</span>
          </div>

          <button
            onClick={cleanChatHistory}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-900 transition-all cursor-pointer"
            title="Reiniciar conversación"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded transition-all cursor-pointer ${showConfig ? "text-indigo-400 bg-zinc-900" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"}`}
            title="Ajustes de Copilot"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-900 transition-all cursor-pointer"
              title="Cerrar Copilot"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Collapsible Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900 border-b border-zinc-850 px-4 py-3 space-y-2.5 overflow-hidden text-[10px] text-zinc-400 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200">Asistencia Proactiva</span>
              <button 
                onClick={() => setConfigSettings({...configSettings, proactiveMode: !configSettings.proactiveMode})}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${configSettings.proactiveMode ? "bg-indigo-600" : "bg-zinc-800"}`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${configSettings.proactiveMode ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-zinc-200 block">Creatividad de Respuestas</span>
              <div className="grid grid-cols-3 gap-1">
                {(["low", "medium", "high"] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setConfigSettings({...configSettings, creativity: level})}
                    className={`py-1 rounded font-bold uppercase tracking-wider text-[8px] border cursor-pointer ${
                      configSettings.creativity === level 
                        ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/35" 
                        : "bg-zinc-950 border-zinc-850 hover:bg-zinc-850"
                    }`}
                  >
                    {level === "low" ? "Bajo" : level === "medium" ? "Medio" : "Alto"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-zinc-200 block">Formato de Respuestas</span>
              <div className="grid grid-cols-2 gap-1">
                {(["sintetico", "detallado"] as const).map(format => (
                  <button
                    key={format}
                    onClick={() => setConfigSettings({...configSettings, responseFormat: format})}
                    className={`py-1 rounded font-bold uppercase tracking-wider text-[8px] border cursor-pointer ${
                      configSettings.responseFormat === format 
                        ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/35" 
                        : "bg-zinc-950 border-zinc-850 hover:bg-zinc-850"
                    }`}
                  >
                    {format === "sintetico" ? "Sintético" : "Detallado"}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Messages & Main Dashboard Feed */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          /* Welcome state - Business Intelligence Dashboard View */
          <div className="space-y-4 py-1.5">
            {/* Saludo minimalista */}
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-white tracking-tight">{getGreeting()}</h3>
              <p className="text-[11px] text-zinc-400 leading-snug">¿Qué querés resolver hoy en el sistema?</p>
            </div>

            {/* Proactive Intelligence Cards (La IA detecta situaciones importantes sin esperar preguntas) */}
            {configSettings.proactiveMode && (
              <div className="space-y-1.5">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Compass className="h-3 w-3 text-indigo-400" />
                  Alertas Inteligentes Activas
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {lowStockProducts.length > 0 && (
                    <div 
                      onClick={() => handleSendMessage(`Audita el stock crítico en Pinamar y Montevideo. Recomienda reposición para los ${lowStockProducts.length} productos con stock de 3 o menos.`)}
                      className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-amber-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-zinc-850/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <div>
                          <p className="text-[10px] font-bold text-zinc-200">Inventario Crítico</p>
                          <p className="text-[9px] text-zinc-500">{lowStockProducts.length} artículos en stock crítico.</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-500 font-bold">➜</span>
                    </div>
                  )}

                  {pendingOrdersCount > 0 && (
                    <div 
                      onClick={() => handleSendMessage(`Muéstrame un listado de los ${pendingOrdersCount} pedidos que están pendientes y recomiéndame acciones o plantillas de WhatsApp.`)}
                      className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-indigo-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-zinc-850/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <div>
                          <p className="text-[10px] font-bold text-zinc-200">Pedidos Pendientes</p>
                          <p className="text-[9px] text-zinc-500">{pendingOrdersCount} pedidos requieren atención.</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold">➜</span>
                    </div>
                  )}

                  {noImageProducts.length > 0 && (
                    <div 
                      onClick={() => handleSendMessage(`Haz una lista de los ${noImageProducts.length} productos activos que no tienen imágenes cargadas.`)}
                      className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-rose-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-zinc-850/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <div>
                          <p className="text-[10px] font-bold text-zinc-200">Productos sin Fotografías</p>
                          <p className="text-[9px] text-zinc-500">{noImageProducts.length} artículos sin imágenes cargadas.</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-rose-500 font-bold">➜</span>
                    </div>
                  )}

                  <div 
                    onClick={() => handleSendMessage(`Muéstrame una auditoría completa de márgenes de ganancia en el catálogo y cuáles son los 3 más rentables.`)}
                    className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-emerald-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-zinc-850/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <p className="text-[10px] font-bold text-zinc-200">Margen Promedio</p>
                        <p className="text-[9px] text-zinc-500">Rentabilidad media del {finalAvgMargin}% en catálogo.</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold">➜</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Grid (Pequeños, minimalistas, no botones largos) */}
            <div className="space-y-1.5 pt-1.5">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono">
                Atajos de Copilot
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => handleQuickAction("stock")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">📦</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">Stock</span>
                </button>
                <button onClick={() => handleQuickAction("profit")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">💰</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">Rentabilidad</span>
                </button>
                <button onClick={() => handleQuickAction("summary")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">📈</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">Ventas</span>
                </button>
                <button onClick={() => handleQuickAction("shipping")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">🚚</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">Envíos</span>
                </button>
                <button onClick={() => handleQuickAction("billing")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">🧾</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">Facturas</span>
                </button>
                <button onClick={() => handleQuickAction("mercadolibre")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">📢</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">M. Libre</span>
                </button>
                <button onClick={() => handleQuickAction("whatsapp")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">📱</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">WhatsApp</span>
                </button>
                <button onClick={() => handleQuickAction("reordering")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">📦</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">Reposición</span>
                </button>
                <button onClick={() => handleQuickAction("critical_stock")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700 transition duration-150 cursor-pointer text-center space-y-1">
                  <span className="text-xs">⚠️</span>
                  <span className="text-[9px] text-zinc-300 font-bold tracking-tight">S. Crítico</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Conversational message feed */
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {msg.sender === "user" ? (
                    /* User message styled clean and elegant (Notion block quote style) */
                    <div className="py-2.5 px-3 border-l-2 border-indigo-500 bg-zinc-900/40 rounded-r-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-zinc-400 font-mono tracking-widest">USUARIO</span>
                        <span className="text-[8px] text-zinc-600 font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{msg.text}</p>
                      {msg.hasAttachment && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950 border border-zinc-850 rounded-md text-[8px] text-indigo-400 font-mono mt-1 font-bold">
                          <Paperclip className="h-3 w-3" />
                          IMAGEN ADJUNTADA
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Assistant / Copilot response formatted like elegant documentation */
                    <div className="py-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-[9px] font-black text-indigo-400 font-mono tracking-widest uppercase">COPILOT</span>
                        </div>
                        <span className="text-[8px] text-zinc-600 font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      <div className="text-xs text-zinc-300 leading-relaxed space-y-2 font-sans break-words whitespace-pre-wrap">
                        {renderFormattedText(msg.text)}
                      </div>

                      {/* Render custom smart visual cards for products */}
                      {renderSmartCardsForMessage(msg)}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-4 space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
              <span className="text-[9px] font-black text-indigo-400 font-mono tracking-widest">COPILOT PROCESANDO</span>
            </div>
            <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider ml-1 font-bold">Consultando base ERP de Juem...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Attachment Previews */}
      <AnimatePresence>
        {attachedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-zinc-900/80 border-t border-zinc-850 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2 text-[10px]">
              <img src={attachedImage} alt="Attachment" className="w-8 h-8 object-cover rounded-lg border border-zinc-800" />
              <span className="text-zinc-400 font-mono text-[9px]">Factura / Imagen cargada lista</span>
            </div>
            <button onClick={removeAttachment} className="p-1 text-zinc-500 hover:text-rose-500 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Sleek Search-Bar Style Input Area */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-850 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="flex flex-col bg-zinc-900/80 border border-zinc-800/80 rounded-xl focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all overflow-hidden"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={
              adminSection === "products" 
                ? "Preguntá sobre catálogo, precios o comisiones..." 
                : adminSection === "stock"
                ? "Preguntá sobre inventario de depósitos..."
                : "Preguntá cualquier cosa al Copilot..."
            }
            className="w-full px-3 py-2.5 bg-transparent border-0 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:ring-0"
          />

          <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between border-t border-zinc-850 bg-zinc-900/30">
            <div className="flex items-center gap-1">
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-850/80 transition-colors cursor-pointer"
                title="Adjuntar imagen de factura o artículo"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleRecording}
                className={`p-1.5 rounded transition-colors cursor-pointer ${isRecording ? "text-rose-400 bg-rose-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850/80"}`}
                title={isRecording ? "Detener grabación" : "Preguntar con voz"}
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={(!inputValue.trim() && !attachedImage) || isLoading}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
