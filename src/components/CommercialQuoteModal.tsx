import React, { useState, useEffect, useMemo } from "react";
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
  AlertCircle
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
  const [conditions, setConditions] = useState<string>(companySettings.defaultConditions || "");

  // Technical display options
  const [showMaterial, setShowMaterial] = useState<boolean>(false);
  const [showColor, setShowColor] = useState<boolean>(false);
  const [showWeight, setShowWeight] = useState<boolean>(false);
  const [showPrintTime, setShowPrintTime] = useState<boolean>(false);

  // Items list
  const [items, setItems] = useState<CommercialQuoteItem[]>([]);

  // Preview blob
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

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

  // Load data when opening
  useEffect(() => {
    if (isOpen) {
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
        setConditions(quote.conditions || companySettings.defaultConditions || "");

        const tech = quote.showTechnicalDetails || {
          showMaterial: false,
          showColor: false,
          showWeight: false,
          showPrintTime: false
        };
        setShowMaterial(!!tech.showMaterial);
        setShowColor(!!tech.showColor);
        setShowWeight(!!tech.showWeight);
        setShowPrintTime(!!tech.showPrintTime);

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
        setConditions(companySettings.defaultConditions || DEFAULT_COMPANY_SETTINGS.defaultConditions);
        setShowMaterial(false);
        setShowColor(false);
        setShowWeight(false);
        setShowPrintTime(false);

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

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast("La cotización debe tener al menos una pieza.", "error");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save quote to server
  const handleSaveQuote = async () => {
    if (!customerName.trim()) {
      showToast("Ingresa el nombre del cliente para identificar la cotización.", "error");
      return;
    }
    if (items.length === 0) {
      showToast("Agrega al menos una pieza a la cotización.", "error");
      return;
    }

    try {
      setIsSaving(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        customerName,
        customerPhone,
        customerEmail,
        validityDays,
        status,
        discountAmount,
        shippingCost,
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
          quantity: Math.max(1, parseInt(it.quantity as any) || 1),
          unitPrice: Math.max(0, parseFloat(it.unitPrice as any) || 0)
        }))
      };

      const isEdit = !!quote?.id;
      const url = isEdit ? `/api/3d/commercial-quotes/${quote.id}` : "/api/3d/commercial-quotes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#050B1A] border border-[#D4A55A]/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#0B1730] border-b border-[#D4A55A]/25 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4A55A]/15 border border-[#D4A55A]/30 text-[#E6BF76]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-lg text-[#F4EAD7] tracking-wide">
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

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

              {/* SECCIÓN 2: ARTÍCULOS / PIEZAS (1 a 20+ ÍTEMS) */}
              <div className="bg-[#0B1730]/70 rounded-2xl border border-[#D4A55A]/25 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#D4A55A]/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#D4A55A]" />
                    <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#E6BF76]">
                      Piezas y Artículos a Fabricar ({items.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-xl bg-[#D4A55A]/20 hover:bg-[#D4A55A] hover:text-[#050B1A] text-[#E6BF76] text-xs font-bold transition-all border border-[#D4A55A]/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar otra pieza</span>
                  </button>
                </div>

                {/* Table of items */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#050B1A] text-[#A0AEC0] uppercase text-[10px] font-bold border-b border-[#D4A55A]/20">
                      <tr>
                        <th className="py-2.5 px-2 w-8 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[170px]">Pieza / Descripción</th>
                        <th className="py-2.5 px-2 w-24">SKU / Cód.</th>
                        <th className="py-2.5 px-2 w-28">Material</th>
                        <th className="py-2.5 px-2 w-24">Color</th>
                        <th className="py-2.5 px-2 w-20 text-center">Cant.</th>
                        <th className="py-2.5 px-2 w-28 text-right">Precio Unit. ($)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4A55A]/10">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-2 text-center text-[#A0AEC0] font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={it.pieceName}
                              onChange={(e) => handleItemChange(idx, "pieceName", e.target.value)}
                              placeholder="Nombre de la pieza"
                              className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs focus:outline-none focus:border-[#E6BF76]"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={it.internalCode || ""}
                              onChange={(e) => handleItemChange(idx, "internalCode", e.target.value)}
                              placeholder="3D-001"
                              className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs font-mono focus:outline-none focus:border-[#E6BF76]"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={it.material || ""}
                              onChange={(e) => handleItemChange(idx, "material", e.target.value)}
                              placeholder="PLA+ / PETG"
                              className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs focus:outline-none focus:border-[#E6BF76]"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={it.color || ""}
                              onChange={(e) => handleItemChange(idx, "color", e.target.value)}
                              placeholder="Negro / Blanco"
                              className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs focus:outline-none focus:border-[#E6BF76]"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs font-bold text-center focus:outline-none focus:border-[#E6BF76]"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.unitPrice}
                              onChange={(e) => handleItemChange(idx, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-2 py-1 rounded-lg bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] text-xs font-mono font-bold text-right focus:outline-none focus:border-[#E6BF76]"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#E6BF76]">
                            ${((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toLocaleString("es-UY")}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              title="Quitar pieza"
                              className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Technical data configuration checkboxes */}
                <div className="bg-[#050B1A] rounded-xl p-3 border border-[#D4A55A]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#E6BF76] uppercase tracking-wider">
                      Información técnica a incluir en el PDF comercial:
                    </span>
                    <span className="text-[10px] text-[#A0AEC0] italic">
                      (Por defecto ocultos para cotizaciones comerciales limpias)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#C5B499]">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7]">
                      <input
                        type="checkbox"
                        checked={showMaterial}
                        onChange={(e) => setShowMaterial(e.target.checked)}
                        className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0"
                      />
                      <span>Mostrar Material</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7]">
                      <input
                        type="checkbox"
                        checked={showColor}
                        onChange={(e) => setShowColor(e.target.checked)}
                        className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0"
                      />
                      <span>Mostrar Color</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7]">
                      <input
                        type="checkbox"
                        checked={showWeight}
                        onChange={(e) => setShowWeight(e.target.checked)}
                        className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0"
                      />
                      <span>Mostrar Peso</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#F4EAD7]">
                      <input
                        type="checkbox"
                        checked={showPrintTime}
                        onChange={(e) => setShowPrintTime(e.target.checked)}
                        className="rounded border-[#D4A55A]/40 bg-[#0B1730] text-[#D4A55A] focus:ring-0"
                      />
                      <span>Mostrar Tiempo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: TOTALES, AJUSTES COMERCIALES & CONDICIONES */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Condiciones Comerciales & Observaciones (7 cols) */}
                <div className="lg:col-span-7 bg-[#0B1730]/70 rounded-2xl border border-[#D4A55A]/25 p-5 space-y-4">
                  <div className="text-xs font-serif font-bold uppercase tracking-wider text-[#E6BF76]">
                    Condiciones Comerciales de JUEM
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A0AEC0] block mb-1">
                      Condiciones generales (aparecerán al pie del PDF, editables):
                    </label>
                    <textarea
                      rows={4}
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      className="w-full p-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] leading-relaxed resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A0AEC0] block mb-1">
                      Observaciones adicionales para el cliente (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Acabado post-procesado liso, incluye insertos roscados M3"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                    />
                  </div>
                </div>

                {/* Resumen Financiero y Totales (5 cols) */}
                <div className="lg:col-span-5 bg-[#0B1730] rounded-2xl border border-[#D4A55A]/35 p-5 space-y-4 shadow-lg">
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
        <div className="px-6 py-4 bg-[#0B1730] border-t border-[#D4A55A]/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#A0AEC0]">
            Cotización oficial <strong className="text-[#E6BF76]">{quoteNumber || nextQuoteNumber}</strong> • Total: <strong className="text-[#F4EAD7] font-mono">${totalAmount.toLocaleString("es-UY")} UYU</strong>
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
    </div>
  );
};
