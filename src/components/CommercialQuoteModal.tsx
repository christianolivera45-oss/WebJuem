import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  FileText,
  Download,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Mail,
  Sliders,
  DollarSign,
  ShoppingCart,
  Copy,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  Search,
  Building2,
  CreditCard,
  ChevronRight,
  Tag,
  Package
} from "lucide-react";
import {
  CommercialQuote3D,
  CommercialQuoteItem,
  CommercialQuoteStatus,
  CompanyQuoteSettings
} from "../types";
import {
  downloadQuotePdf,
  generateQuotePdfBlobUrl,
  DEFAULT_COMPANY_SETTINGS
} from "../utils/generateQuotePdf";
import { ProductSearchProModal, SelectedProductPayload, matchProductSearch } from "./ProductSearchProModal";

export const JUEM_OFFICIAL_BANK_CONDITIONS = `• Validez de la cotización: 15 días a partir de su emisión.
• Plazo de entrega: A coordinar según volumen del pedido y disponibilidad del taller 3D.
• Forma de pago: 50% de seña para iniciar la producción y saldo restante contra entrega.
• Cuentas para pago / transferencia bancaria JUEM:
  - Banco / Mercado Pago: N° de cuenta 1004278620163
  - Redpagos y Abitab: Joana Baptista (C.I. 4.051.645-7)
• Enviar comprobante al WhatsApp (+598 99 234 567) indicando el N° de cotización para confirmar la orden.`;

export const JUEM_BANK_PAYMENT_DETAILS = `• Cuentas para pago / transferencia bancaria JUEM:
  - Banco / Mercado Pago: N° de cuenta 1004278620163
  - Redpagos y Abitab: Joana Baptista (C.I. 4.051.645-7)
• Enviar comprobante al WhatsApp (+598 99 234 567) indicando el N° de cotización para confirmar la orden.`;

interface CommercialQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: CommercialQuote3D | null;
  initialItems?: CommercialQuoteItem[];
  companySettings?: CompanyQuoteSettings;
  onSaveSuccess: (savedQuote: CommercialQuote3D) => void;
  onConvertToOrder?: (quoteId: string) => void;
  authToken?: string;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const CommercialQuoteModal: React.FC<CommercialQuoteModalProps> = ({
  isOpen,
  onClose,
  quote,
  initialItems,
  companySettings = DEFAULT_COMPANY_SETTINGS,
  onSaveSuccess,
  onConvertToOrder,
  authToken,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [nextQuoteNumber, setNextQuoteNumber] = useState<string>("COT-2026-0001");

  // Form state
  const [quoteNumber, setQuoteNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [validityDays, setValidityDays] = useState<number>(companySettings.defaultValidityDays || 15);
  const [status, setStatus] = useState<CommercialQuoteStatus>("borrador");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [conditions, setConditions] = useState<string>(JUEM_OFFICIAL_BANK_CONDITIONS);

  // Technical display options: ALWAYS FALSE / DEACTIVATED BY DEFAULT
  const [showMaterial, setShowMaterial] = useState<boolean>(false);
  const [showColor, setShowColor] = useState<boolean>(false);
  const [showWeight, setShowWeight] = useState<boolean>(false);
  const [showPrintTime, setShowPrintTime] = useState<boolean>(false);

  // Items list
  const [items, setItems] = useState<CommercialQuoteItem[]>([]);

  // Search & Catalog state
  const [filterItemSearch, setFilterItemSearch] = useState<string>("");
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
  const [showCatalogSearchModal, setShowCatalogSearchModal] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<{ url: string; title: string } | null>(null);

  // Preview blob
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Fetch catalog products from store for instant searching
  useEffect(() => {
    if (isOpen) {
      setIsCatalogLoading(true);
      fetch("/api/store")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.products)) {
            setCatalogProducts(data.products);
          }
        })
        .catch((e) => console.error("Error fetching catalog products:", e))
        .finally(() => setIsCatalogLoading(false));
    }
  }, [isOpen]);

  // Fetch next quote number when creating new quote
  useEffect(() => {
    if (isOpen && !quote) {
      fetch("/api/3d/commercial-quotes-next-number")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.nextNumber) {
            setNextQuoteNumber(data.nextNumber);
            setQuoteNumber(data.nextNumber);
          }
        })
        .catch((e) => console.error("Could not fetch next quote number:", e));
    }
  }, [isOpen, quote]);

  // Global ESC key listener to close without saving
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCatalogSearchModal) {
          setShowCatalogSearchModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showCatalogSearchModal, onClose]);

  // Load data when opening
  useEffect(() => {
    if (isOpen) {
      // Información técnica desactivada por defecto
      setShowMaterial(false);
      setShowColor(false);
      setShowWeight(false);
      setShowPrintTime(false);
      setFilterItemSearch("");
      setActiveSuggestionIndex(null);

      const defaultBankConditions = companySettings.defaultConditions || JUEM_OFFICIAL_BANK_CONDITIONS;

      if (quote) {
        // Editing existing quote
        setQuoteNumber(quote.quoteNumber);
        setCustomerName(quote.customerName || "");
        setCustomerPhone(quote.customerPhone || "");
        setCustomerEmail(quote.customerEmail || "");
        setValidityDays(quote.validityDays || 15);
        setStatus(quote.status || "borrador");
        setDiscountAmount(quote.discountAmount || 0);
        setShippingCost(quote.shippingCost || 0);
        setNotes(quote.notes || "");
        
        // Cargar condiciones asegurando que contengan los datos bancarios oficiales de JUEM
        let loadedCond = (quote.conditions || "").trim();
        if (!loadedCond) {
          loadedCond = defaultBankConditions;
        } else if (!loadedCond.includes("1004278620163") && !loadedCond.includes("Joana Baptista")) {
          loadedCond = `${loadedCond}\n\n${JUEM_BANK_PAYMENT_DETAILS}`;
        }
        setConditions(loadedCond);

        setItems(quote.items && quote.items.length > 0 ? quote.items : []);
      } else {
        // New quote
        setQuoteNumber(nextQuoteNumber);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setValidityDays(companySettings.defaultValidityDays || 15);
        setStatus("borrador");
        setDiscountAmount(0);
        setShippingCost(0);
        setNotes("");
        setConditions(defaultBankConditions);

        if (initialItems && initialItems.length > 0) {
          setItems(initialItems);
        } else {
          // Default empty item
          setItems([
            {
              itemIndex: 1,
              pieceName: "Pieza 3D Personalizada",
              quantity: 1,
              material: "PLA+",
              color: "Negro",
              weightPerUnitGrams: 50,
              printTimeHours: 2,
              printTimeFormatted: "2h 00m",
              unitPrice: 350,
              subtotalPrice: 350
            }
          ]);
        }
      }
      setActiveTab("editor");
    }
  }, [isOpen, quote, initialItems, companySettings, nextQuoteNumber]);

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - Number(discountAmount || 0) + Number(shippingCost || 0));
  }, [subtotal, discountAmount, shippingCost]);

  // Construct current quote object for PDF generation / preview
  const currentQuoteObject = useMemo<CommercialQuote3D>(() => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + (validityDays || 15));

    return {
      id: quote?.id || "temp-id",
      quoteNumber: quoteNumber || nextQuoteNumber,
      correlativeSeq: quote?.correlativeSeq || 1,
      year: quote?.year || new Date().getFullYear(),
      customerName: customerName.trim() || "Cliente Particular",
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      createdAt: quote?.createdAt || new Date().toISOString(),
      validUntil: validUntilDate.toISOString(),
      validityDays,
      status,
      subtotal,
      discountAmount: Number(discountAmount || 0),
      shippingCost: Number(shippingCost || 0),
      totalAmount,
      notes,
      conditions,
      showTechnicalDetails: {
        showMaterial,
        showColor,
        showWeight,
        showPrintTime
      },
      companySnapshot: companySettings,
      convertedOrderId: quote?.convertedOrderId,
      items: items.map((it, idx) => ({
        ...it,
        itemIndex: idx + 1,
        subtotalPrice: (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)
      }))
    };
  }, [
    quote,
    quoteNumber,
    nextQuoteNumber,
    customerName,
    customerPhone,
    customerEmail,
    validityDays,
    status,
    subtotal,
    discountAmount,
    shippingCost,
    totalAmount,
    notes,
    conditions,
    showMaterial,
    showColor,
    showWeight,
    showPrintTime,
    companySettings,
    items
  ]);

  // Update preview blob URL when switching to preview
  useEffect(() => {
    if (activeTab === "preview") {
      try {
        const url = generateQuotePdfBlobUrl(currentQuoteObject, companySettings);
        setPreviewBlobUrl(url);
      } catch (err) {
        console.error("Error generating PDF preview blob:", err);
      }
    }
  }, [activeTab, currentQuoteObject, companySettings]);

  // Item modifications
  const handleItemChange = (index: number, field: keyof CommercialQuoteItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "unitPrice" || field === "quantity") {
        const q = field === "quantity" ? Number(value) : Number(item.quantity);
        const p = field === "unitPrice" ? Number(value) : Number(item.unitPrice);
        item.subtotalPrice = (q || 1) * (p || 0);
      }
      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemIndex: prev.length + 1,
        pieceName: `Pieza #${prev.length + 1}`,
        quantity: 1,
        material: "PLA+",
        color: "Estándar",
        weightPerUnitGrams: 0,
        printTimeHours: 0,
        unitPrice: 0,
        subtotalPrice: 0
      }
    ]);
  };

  const handleAddProductFromCatalog = (product: SelectedProductPayload) => {
    const unitP = Number(product.price || 0);
    const qty = Number(product.quantity || 1);
    setItems((prev) => [
      ...prev,
      {
        itemIndex: prev.length + 1,
        pieceName: product.name,
        internalCode: product.sku || "",
        quantity: qty,
        material: product.material || "PLA+",
        color: product.variant?.color || "Estándar",
        weightPerUnitGrams: 0,
        printTimeHours: 0,
        unitPrice: unitP,
        subtotalPrice: unitP * qty,
        imageUrl: product.imageUrl || ""
      }
    ]);
    showToast(`Artículo "${product.name}" agregado con foto a la cotización`, "success");
  };

  const handleSelectSuggestionForIndex = (index: number, product: any) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const unitP = Number(product.price || product.precioWeb || current.unitPrice || 0);
      const q = Number(current.quantity || 1);
      next[index] = {
        ...current,
        pieceName: product.name,
        internalCode: product.codigo || product.sku || current.internalCode || "",
        unitPrice: unitP,
        subtotalPrice: unitP * q,
        imageUrl: product.imageUrl || current.imageUrl
      };
      return next;
    });
    setActiveSuggestionIndex(null);
    showToast(`Datos completados desde catálogo: ${product.name}`, "info");
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast("La cotización debe tener al menos una pieza.", "error");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Filtered items in the current quote
  const filteredItemsWithOriginalIndex = useMemo(() => {
    const q = filterItemSearch.trim().toLowerCase();
    if (!q) return items.map((it, originalIdx) => ({ it, originalIdx }));
    const cleanQ = q.endsWith("s") && q.length > 3 ? q.slice(0, -1) : q;
    return items
      .map((it, originalIdx) => ({ it, originalIdx }))
      .filter(({ it }) => {
        const name = (it.pieceName || "").toLowerCase();
        const code = (it.internalCode || "").toLowerCase();
        const mat = (it.material || "").toLowerCase();
        const col = (it.color || "").toLowerCase();
        return (
          name.includes(q) ||
          name.includes(cleanQ) ||
          code.includes(q) ||
          mat.includes(q) ||
          col.includes(q)
        );
      });
  }, [items, filterItemSearch]);

  // Artículos del catálogo web/sistema que coinciden con el término de búsqueda
  const matchingCatalogProducts = useMemo(() => {
    const q = filterItemSearch.trim();
    if (!q || q.length < 2) return [];
    return catalogProducts.filter((p) => matchProductSearch(p, q));
  }, [catalogProducts, filterItemSearch]);

  // Save quote to server
  const handleSaveQuote = async () => {
    if (!customerName.trim()) {
      showToast("Por favor ingresa el nombre del cliente", "error");
      return;
    }

    if (items.length === 0) {
      showToast("Debes agregar al menos una pieza", "error");
      return;
    }

    try {
      setIsSaving(true);
      const isEdit = Boolean(quote?.id);
      const url = isEdit
        ? `/api/3d/commercial-quotes/${quote!.id}`
        : "/api/3d/commercial-quotes";
      const method = isEdit ? "PUT" : "POST";

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          quoteNumber: quoteNumber || nextQuoteNumber,
          customerName,
          customerPhone,
          customerEmail,
          validityDays,
          status,
          discountAmount: Number(discountAmount || 0),
          shippingCost: Number(shippingCost || 0),
          notes,
          conditions,
          showTechnicalDetails: {
            showMaterial,
            showColor,
            showWeight,
            showPrintTime
          },
          companySnapshot: companySettings,
          items: items.map((it, idx) => ({
            ...it,
            itemIndex: idx + 1,
            unitPrice: Number(it.unitPrice || 0),
            quantity: Number(it.quantity || 1),
            subtotalPrice: Number(it.unitPrice || 0) * Number(it.quantity || 1)
          }))
        })
      });

      const data = await res.json();
      if (data.success && data.quote) {
        showToast(isEdit ? "¡Cotización actualizada!" : `¡Cotización ${data.quote.quoteNumber} guardada!`, "success");
        onSaveSuccess(data.quote);
      } else {
        showToast(data.message || "Error al guardar cotización", "error");
      }
    } catch (err: any) {
      console.error("Error saving commercial quote:", err);
      showToast(err.message || "Error al conectar con el servidor", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Direct download PDF
  const handleDownload = () => {
    try {
      downloadQuotePdf(currentQuoteObject, companySettings);
      showToast("Descargando PDF de cotización...", "info");
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      showToast("Error al generar el archivo PDF", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-[#050B1A] border border-[#D4A55A]/40 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-[0_10px_60px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-6 py-4 bg-[#0B1730] border-b border-[#D4A55A]/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4A55A]/15 border border-[#D4A55A]/30 text-[#E6BF76]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-base sm:text-lg text-[#F4EAD7] tracking-wide">
                  Cotización Comercial Multi-Pieza
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4A55A]/20 border border-[#D4A55A]/40 text-[#E6BF76] font-mono text-xs font-bold">
                  {quoteNumber || nextQuoteNumber}
                </span>
              </div>
              <p className="text-xs text-[#A0AEC0]">
                Crea, edita y genera un documento PDF profesional con la identidad de JUEM.
              </p>
            </div>
          </div>

          {/* View Toggles & Close */}
          <div className="flex items-center gap-2">
            <div className="bg-[#050B1A] p-1 rounded-xl border border-[#D4A55A]/30 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "editor"
                    ? "bg-[#D4A55A] text-[#050B1A] shadow"
                    : "text-[#C5B499] hover:text-[#F4EAD7]"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-[#D4A55A] text-[#050B1A] shadow"
                    : "text-[#C5B499] hover:text-[#F4EAD7]"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Vista Previa</span>
              </button>
            </div>

            {/* BOTÓN CERRAR SIN GUARDAR DESTACADO */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              title="Cerrar sin guardar los cambios (Esc)"
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Cerrar sin guardar</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === "editor" ? (
            <div className="space-y-6">
              
              {/* SECCIÓN 1: DATOS DEL CLIENTE Y FECHAS */}
              <div className="bg-[#0B1730]/70 rounded-2xl border border-[#D4A55A]/25 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#D4A55A]/15 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#E6BF76]">
                    <User className="h-4 w-4 text-[#D4A55A]" />
                    <span>Datos del Cliente & Emisión</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#A0AEC0]">Estado:</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as CommercialQuoteStatus)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#E6BF76] font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="borrador">Borrador</option>
                      <option value="enviada">Enviada al Cliente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="vencida">Vencida</option>
                      <option value="convertida">Convertida en Pedido</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                      Nombre del Cliente *
                    </label>
                    <div className="relative">
                      <User className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                      <input
                        type="text"
                        placeholder="Ej. Estudio Arquitectura / Juan Pérez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                      <input
                        type="text"
                        placeholder="099 123 456"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                      Correo Electrónico (Opcional)
                    </label>
                    <div className="relative">
                      <Mail className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                      <input
                        type="email"
                        placeholder="cliente@ejemplo.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                      Validez de Oferta (Días)
                    </label>
                    <div className="relative">
                      <Calendar className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={validityDays}
                        onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value) || 15))}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: ARTÍCULOS / PIEZAS CON BUSCADOR INTELIGENTE */}
              <div className="bg-[#0B1730]/70 rounded-2xl border border-[#D4A55A]/25 p-5 space-y-4">
                
                {/* Cabecera de la sección de piezas */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4A55A]/15 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#D4A55A]" />
                    <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#E6BF76]">
                      Piezas y Artículos a Fabricar ({items.length})
                    </span>
                  </div>

                  {/* Acciones principales de agregar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3.5 py-2 rounded-xl bg-[#050B1A] hover:bg-[#D4A55A]/20 text-[#F4EAD7] text-xs font-bold transition-all border border-[#D4A55A]/30 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#D4A55A]" />
                      <span>Pieza vacía</span>
                    </button>
                  </div>
                </div>

                {/* BARRA BUSCADORA / FILTRADORA DE ARTÍCULOS EN LA COTIZACIÓN */}
                <div className="flex items-center gap-2.5 bg-[#050B1A]/80 p-2 rounded-xl border border-[#D4A55A]/20">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                    <input
                      type="text"
                      placeholder="Buscar por Pieza, SKU, o artículos de la web (ej: Soporte, Tablet)..."
                      value={filterItemSearch}
                      onChange={(e) => setFilterItemSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs bg-[#0B1730] border border-[#D4A55A]/25 text-[#F4EAD7] placeholder:text-[#A0AEC0]/60 focus:outline-none focus:border-[#E6BF76]"
                    />
                    {filterItemSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterItemSearch("")}
                        className="absolute right-2.5 top-2 text-[#A0AEC0] hover:text-[#F4EAD7] cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* RESULTADOS EN VIVO DE ARTÍCULOS DE LA WEB / CATÁLOGO DEL SISTEMA */}
                {filterItemSearch.trim().length >= 2 && matchingCatalogProducts.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 shadow-lg space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2 border-b border-[#D4A55A]/15 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-[#E6BF76] shrink-0" />
                        <span className="text-xs font-bold text-[#F4EAD7]">
                          Artículos en catálogo web ({matchingCatalogProducts.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCatalogSearchModal(true)}
                        className="text-[11px] text-[#E6BF76] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <span>Ver en Buscador Pro</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {matchingCatalogProducts.map((prod) => {
                        const displayPrice = prod.price || prod.precioWeb || prod.precioVentaML || 0;
                        const displayImg = prod.imageUrl;
                        const displaySku = prod.codigo || prod.sku;
                        const stockVal = prod.stock ?? 0;
                        return (
                          <div
                            key={prod.id}
                            className="p-2 rounded-xl bg-[#0B1730] border border-[#D4A55A]/20 hover:border-[#E6BF76]/50 transition-all flex items-center justify-between gap-2.5 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {displayImg ? (
                                <button
                                  type="button"
                                  onClick={() => setImageLightboxUrl({ url: displayImg, title: prod.name })}
                                  className="h-10 w-10 rounded-lg bg-[#050B1A] border border-[#D4A55A]/30 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-[#E6BF76] transition-colors"
                                  title="Clic para ampliar foto"
                                >
                                  <img
                                    src={displayImg}
                                    alt={prod.name}
                                    className="h-full w-full object-contain p-0.5"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </button>
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-[#050B1A] border border-dashed border-[#D4A55A]/25 flex items-center justify-center shrink-0 text-[#A0AEC0]/40">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div
                                  className="text-xs font-bold text-[#F4EAD7] truncate group-hover:text-[#E6BF76] transition-colors"
                                  title={prod.name}
                                >
                                  {prod.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-[#A0AEC0] mt-0.5">
                                  {displaySku && (
                                    <span className="font-mono bg-white/5 px-1 rounded border border-white/10 text-[#C5B499]">
                                      {displaySku}
                                    </span>
                                  )}
                                  <span
                                    className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                      stockVal > 0 ? "text-emerald-400 bg-emerald-950/50" : "text-amber-400 bg-amber-950/50"
                                    }`}
                                  >
                                    {stockVal > 0 ? `Stock: ${stockVal}` : "Bajo Pedido"}
                                  </span>
                                </div>
                                <div className="text-xs font-mono font-bold text-[#E6BF76] mt-0.5">
                                  ${displayPrice.toLocaleString("es-UY")} UYU
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddProductFromCatalog({
                                  name: prod.name,
                                  sku: displaySku,
                                  price: displayPrice,
                                  imageUrl: displayImg,
                                  category: prod.category,
                                  quantity: 1
                                });
                                showToast(`"${prod.name}" agregada`, "success");
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] hover:brightness-110 text-[#050B1A] text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1"
                              title="Agregar pieza a la cotización"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Agregar</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tabla de ítems */}
                <div className="overflow-x-auto min-h-[160px] pb-16">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#050B1A] text-[#A0AEC0] uppercase text-[10px] font-bold border-b border-[#D4A55A]/20">
                      <tr>
                        <th className="py-2.5 px-2 w-8 text-center">#</th>
                        <th className="py-2.5 px-2 w-12 text-center">Foto</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Pieza / Descripción</th>
                        <th className="py-2.5 px-2 w-28">SKU / Cód.</th>
                        {showMaterial && <th className="py-2.5 px-2 w-24">Material</th>}
                        {showColor && <th className="py-2.5 px-2 w-24">Color</th>}
                        <th className="py-2.5 px-2 w-20 text-center">Cant.</th>
                        <th className="py-2.5 px-2 w-28 text-right">Precio Unit. ($)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4A55A]/10">
                      {filteredItemsWithOriginalIndex.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-xs text-[#A0AEC0]/60 italic">
                            {filterItemSearch.trim() ? (
                              <span>Sin piezas añadidas que coincidan con "{filterItemSearch}".</span>
                            ) : (
                              <span>No hay piezas añadidas en esta cotización.</span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredItemsWithOriginalIndex.map(({ it, originalIdx }) => {
                          // Autocomplete suggestion matches when typing in pieceName
                          const suggestions = catalogProducts
                            .filter((p: any) => matchProductSearch(p, it.pieceName))
                            .slice(0, 6);

                          return (
                            <tr key={originalIdx} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 px-2 text-center text-[#A0AEC0] font-mono font-bold">
                                {originalIdx + 1}
                              </td>

                              {/* Foto / Imagen Thumbnail */}
                              <td className="py-2.5 px-2 text-center">
                                {it.imageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setImageLightboxUrl({ url: it.imageUrl!, title: it.pieceName })}
                                    className="h-10 w-10 rounded-lg bg-[#050B1A] border border-[#D4A55A]/40 overflow-hidden inline-flex items-center justify-center hover:scale-105 hover:border-[#E6BF76] transition-all cursor-pointer shadow-sm group"
                                    title="Clic para ampliar foto"
                                  >
                                    <img
                                      src={it.imageUrl}
                                      alt={it.pieceName}
                                      className="h-full w-full object-contain p-0.5 group-hover:brightness-110"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <div
                                    className="h-10 w-10 rounded-lg bg-[#050B1A] border border-dashed border-[#D4A55A]/25 inline-flex items-center justify-center text-[#A0AEC0]/30"
                                    title="Sin foto asignada"
                                  >
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </td>
                              
                              {/* Campo Pieza / Descripción con sugerencias automáticas con fotos */}
                              <td className="py-2.5 px-3 relative">
                                <input
                                  type="text"
                                  value={it.pieceName}
                                  onChange={(e) => {
                                    handleItemChange(originalIdx, "pieceName", e.target.value);
                                    setActiveSuggestionIndex(originalIdx);
                                  }}
                                  onFocus={() => setActiveSuggestionIndex(originalIdx)}
                                  placeholder="Nombre de la pieza o artículo..."
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs focus:outline-none focus:border-[#E6BF76]"
                                />

                                {/* Dropdown de sugerencias de catálogo con fotos */}
                                {activeSuggestionIndex === originalIdx && it.pieceName.length >= 2 && suggestions.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0B1730] border border-[#D4A55A]/40 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-[#D4A55A]/15 animate-in fade-in duration-100">
                                    <div className="p-2 bg-[#050B1A] text-[10px] text-[#C5B499] font-bold uppercase tracking-wider flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <Sparkles className="h-3 w-3 text-[#E6BF76]" />
                                        Artículos encontrados en el sistema ({suggestions.length})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setActiveSuggestionIndex(null)}
                                        className="text-[#A0AEC0] hover:text-[#F4EAD7]"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    {suggestions.map((s: any) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleSelectSuggestionForIndex(originalIdx, s)}
                                        className="w-full text-left p-2.5 hover:bg-[#D4A55A]/15 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="h-10 w-10 rounded-lg bg-[#050B1A] border border-[#D4A55A]/30 overflow-hidden shrink-0 flex items-center justify-center">
                                            {s.imageUrl ? (
                                              <img
                                                src={s.imageUrl}
                                                alt={s.name}
                                                className="h-full w-full object-contain p-0.5"
                                                referrerPolicy="no-referrer"
                                              />
                                            ) : (
                                              <Package className="h-4 w-4 text-[#A0AEC0]/40" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-bold text-xs text-[#F4EAD7] group-hover:text-[#E6BF76] truncate">
                                              {s.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-[#A0AEC0]">
                                              {(s.codigo || s.sku) && (
                                                <span className="font-mono bg-white/5 px-1 py-0.2 rounded border border-white/10">
                                                  SKU: {s.codigo || s.sku}
                                                </span>
                                              )}
                                              {s.category && <span>• {s.category}</span>}
                                              {s.stock !== undefined && (
                                                <span className={s.stock > 0 ? "text-emerald-400" : "text-amber-400"}>
                                                  • Stock: {s.stock}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-mono text-[#E6BF76] font-bold text-xs block">
                                            ${Number(s.price || s.precioWeb || 0).toLocaleString("es-UY")}
                                          </span>
                                          <span className="text-[9px] text-[#A0AEC0]">UYU</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-2">
                                <input
                                  type="text"
                                  value={it.internalCode || ""}
                                  onChange={(e) => handleItemChange(originalIdx, "internalCode", e.target.value)}
                                  placeholder="SKU-001"
                                  className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs font-mono focus:outline-none focus:border-[#E6BF76]"
                                />
                              </td>

                              {showMaterial && (
                                <td className="py-2.5 px-2">
                                  <input
                                    type="text"
                                    value={it.material || "PLA+"}
                                    onChange={(e) => handleItemChange(originalIdx, "material", e.target.value)}
                                    placeholder="PLA+"
                                    className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs focus:outline-none focus:border-[#E6BF76]"
                                  />
                                </td>
                              )}

                              {showColor && (
                                <td className="py-2.5 px-2">
                                  <input
                                    type="text"
                                    value={it.color || ""}
                                    onChange={(e) => handleItemChange(originalIdx, "color", e.target.value)}
                                    placeholder="Negro / Blanco"
                                    className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs focus:outline-none focus:border-[#E6BF76]"
                                  />
                                </td>
                              )}

                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantity}
                                  onChange={(e) => handleItemChange(originalIdx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs font-bold text-center focus:outline-none focus:border-[#E6BF76]"
                                />
                              </td>

                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.unitPrice}
                                  onChange={(e) => handleItemChange(originalIdx, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs font-mono font-bold text-right focus:outline-none focus:border-[#E6BF76]"
                                />
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#E6BF76]">
                                ${((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toLocaleString("es-UY")}
                              </td>

                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(originalIdx)}
                                  title="Quitar pieza"
                                  className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* OPCIONES DE COLUMNAS TÉCNICAS VISIBLES DIRECTAMENTE */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-[#050B1A] rounded-xl px-4 py-3 border border-[#D4A55A]/20 text-xs text-[#C5B499]">
                  <span className="text-[11px] font-bold text-[#E6BF76] uppercase tracking-wider">
                    Columnas técnicas:
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7] transition-colors">
                    <input
                      type="checkbox"
                      checked={showMaterial}
                      onChange={(e) => setShowMaterial(e.target.checked)}
                      className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0 cursor-pointer"
                    />
                    <span>Mostrar Material</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7] transition-colors">
                    <input
                      type="checkbox"
                      checked={showColor}
                      onChange={(e) => setShowColor(e.target.checked)}
                      className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0 cursor-pointer"
                    />
                    <span>Mostrar Color</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7] transition-colors">
                    <input
                      type="checkbox"
                      checked={showWeight}
                      onChange={(e) => setShowWeight(e.target.checked)}
                      className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0 cursor-pointer"
                    />
                    <span>Mostrar Peso</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7] transition-colors">
                    <input
                      type="checkbox"
                      checked={showPrintTime}
                      onChange={(e) => setShowPrintTime(e.target.checked)}
                      className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0 cursor-pointer"
                    />
                    <span>Mostrar Tiempo</span>
                  </label>
                </div>

              </div>

              {/* SECCIÓN 3: TOTALES, AJUSTES COMERCIALES & CONDICIONES CON DATOS BANCARIOS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Condiciones Comerciales & Observaciones con Datos de Pago JUEM (7 cols) */}
                <div className="lg:col-span-7 bg-[#0B1730]/70 rounded-2xl border border-[#D4A55A]/25 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D4A55A]/15 pb-2">
                    <div className="text-xs font-serif font-bold uppercase tracking-wider text-[#E6BF76] flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#D4A55A]" />
                      <span>Condiciones Comerciales & Datos de Pago JUEM</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setConditions(JUEM_OFFICIAL_BANK_CONDITIONS);
                        showToast("Condiciones y cuentas bancarias JUEM restauradas", "success");
                      }}
                      className="text-[10px] text-[#E6BF76] hover:underline font-bold cursor-pointer"
                      title="Restaurar condiciones oficiales con cuentas bancarias de JUEM"
                    >
                      ↺ Restaurar oficial JUEM
                    </button>
                  </div>

                  {/* TARJETA VISUAL DE CUENTAS BANCARIAS DE JUEM */}
                  <div className="p-3.5 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#E6BF76] tracking-wider flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#D4A55A]" />
                        Cuentas Bancarias de JUEM para el Cliente:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("Banco / Mercado Pago: N° 1004278620163\nRedpagos y Abitab: Joana Baptista (C.I. 4.051.645-7)\nWhatsApp: +598 99 234 567");
                          showToast("Datos bancarios copiados al portapapeles", "info");
                        }}
                        className="text-[10px] text-[#A0AEC0] hover:text-[#F4EAD7] flex items-center gap-1 cursor-pointer"
                        title="Copiar cuentas al portapapeles"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#F4EAD7] bg-[#0B1730]/80 p-2.5 rounded-lg border border-[#D4A55A]/20">
                      <div>
                        <span className="text-[#A0AEC0] block text-[9px] uppercase font-bold">Banco / Mercado Pago</span>
                        <span className="font-mono font-bold text-[#E6BF76] text-xs">1004278620163</span>
                      </div>
                      <div>
                        <span className="text-[#A0AEC0] block text-[9px] uppercase font-bold">Redpagos / Abitab</span>
                        <span className="font-bold text-xs">Joana Baptista (4.051.645-7)</span>
                      </div>
                    </div>
                  </div>

                  {/* Textarea de condiciones que se imprime en el PDF */}
                  <div>
                    <label className="text-[10px] text-[#A0AEC0] block mb-1">
                      Texto que aparecerá en el PDF comercial (incluye datos bancarios):
                    </label>
                    <textarea
                      rows={6}
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      className="w-full p-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] leading-relaxed resize-none font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A0AEC0] block mb-1">
                      Observaciones adicionales para el cliente (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Entrega sin costo en zona céntrica, embalaje reforzado incluido..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                    />
                  </div>
                </div>

                {/* Resumen Financiero y Totales (5 cols) */}
                <div className="lg:col-span-5 bg-[#0B1730]/70 rounded-2xl border border-[#D4A55A]/25 p-5 space-y-4 shadow-lg">
                  <div className="text-xs font-serif font-bold uppercase tracking-wider text-[#E6BF76] border-b border-[#D4A55A]/20 pb-2">
                    Resumen Financiero
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-[#A0AEC0]">
                      <span>Subtotal Piezas ({items.length}):</span>
                      <span className="font-mono font-bold text-[#F4EAD7]">
                        ${subtotal.toLocaleString("es-UY")} UYU
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-rose-400">Descuento Comercial ($):</span>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-28 px-2 py-1 rounded-lg bg-[#050B1A] border border-rose-500/30 text-rose-300 text-xs font-mono font-bold text-right focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#C5B499]">Costo de Envío ($):</span>
                      <input
                        type="number"
                        min="0"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-28 px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] text-xs font-mono font-bold text-right focus:outline-none"
                      />
                    </div>

                    {/* Total Final Card */}
                    <div className="pt-3 border-t border-[#D4A55A]/20">
                      <div className="bg-[#050B1A] rounded-xl p-3.5 border border-[#D4A55A]/40 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#A0AEC0] block">
                            Total Final de la Cotización
                          </span>
                          <span className="text-2xl font-serif font-black text-[#E6BF76]">
                            ${totalAmount.toLocaleString("es-UY")}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#D4A55A]">
                          UYU
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* VISTA PREVIA DEL PDF EN TIEMPO REAL */
            <div className="space-y-4">
              <div className="bg-[#0B1730] p-4 rounded-2xl border border-[#D4A55A]/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#E6BF76] font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>Vista Previa del documento A4 que recibirá el cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow hover:brightness-105"
                  >
                    <Download className="h-4 w-4" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>

              {previewBlobUrl ? (
                <div className="w-full bg-[#1E293B]/40 rounded-2xl border border-[#D4A55A]/20 p-2 overflow-hidden flex justify-center">
                  <iframe
                    src={previewBlobUrl}
                    title="Vista Previa de Cotización PDF"
                    className="w-full h-[650px] rounded-xl border border-black/50 bg-white"
                  />
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center p-6 text-[#A0AEC0]">
                  <AlertCircle className="h-8 w-8 text-[#D4A55A] mb-2" />
                  <p className="text-sm font-bold">Generando vista previa del documento...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 sm:px-6 py-4 bg-[#0B1730] border-t border-[#D4A55A]/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {/* BOTÓN CERRAR SIN GUARDAR DESTACADO EN EL PIE */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title="Cerrar sin guardar los cambios"
            >
              <X className="h-4 w-4" />
              <span>Cerrar sin guardar</span>
            </button>
            <span className="text-xs text-[#A0AEC0] hidden md:inline">
              Cotización <strong className="text-[#E6BF76]">{quoteNumber || nextQuoteNumber}</strong> • Total: <strong className="text-[#F4EAD7] font-mono">${totalAmount.toLocaleString("es-UY")} UYU</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Convert to order button (only if quote has an ID) */}
            {quote?.id && onConvertToOrder && quote.status !== "convertida" && (
              <button
                type="button"
                onClick={() => onConvertToOrder(quote.id)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Convertir en Pedido</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl bg-[#050B1A] hover:bg-[#D4A55A]/15 text-[#E6BF76] border border-[#D4A55A]/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveQuote}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A55A] via-[#E6BF76] to-[#D4A55A] text-[#050B1A] font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_15px_rgba(212,165,90,0.3)] hover:brightness-105 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSaving ? "Guardando..." : "Guardar Cotización"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* BUSCADOR PRO DE ARTÍCULOS CON IMAGEN */}
      <ProductSearchProModal
        isOpen={showCatalogSearchModal}
        onClose={() => setShowCatalogSearchModal(false)}
        onSelectProduct={handleAddProductFromCatalog}
        existingItems={items}
        title="Buscador Pro de Artículos — Catálogo JUEM con Fotos"
        initialProducts={catalogProducts}
        initialQuery={filterItemSearch}
      />

      {/* LIGHTBOX MODAL PARA VER IMAGEN EN TAMAÑO COMPLETO */}
      {imageLightboxUrl && (
        <div
          onClick={() => setImageLightboxUrl(null)}
          className="fixed inset-0 z-[100005] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-xl max-h-[85vh] bg-[#050B1A] border border-[#D4A55A]/50 rounded-2xl p-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setImageLightboxUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-[#D4A55A] hover:text-[#050B1A] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-sm font-bold text-[#F4EAD7] mb-3 text-center px-8">
              {imageLightboxUrl.title}
            </h4>
            <img
              src={imageLightboxUrl.url}
              alt={imageLightboxUrl.title}
              className="max-h-[70vh] w-auto object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

    </div>
  );
};
