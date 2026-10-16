import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, 
  History, 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Box, 
  Calendar, 
  Download, 
  Printer, 
  Filter, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText, 
  RefreshCw, 
  Plus, 
  X, 
  ShoppingBag, 
  Receipt, 
  Store, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { 
  ShopState, 
  Product, 
  ProductVariant, 
  InventoryMovement, 
  InventoryMovementType, 
  ArticleTraceabilitySummary, 
  ArticleTraceabilityResponse 
} from "../types";

interface DashboardTraceabilityProps {
  store: ShopState;
  authToken: string | null;
  onNavigateToOrder?: (orderId: string) => void;
  onNavigateToBill?: (billId: string) => void;
  initialProductId?: string | null;
  initialSku?: string | null;
}

export const DashboardTraceability: React.FC<DashboardTraceabilityProps> = ({
  store,
  authToken,
  onNavigateToOrder,
  onNavigateToBill,
  initialProductId,
  initialSku
}) => {
  // Search & Selected Article State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("all");
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  const [traceData, setTraceData] = useState<ArticleTraceabilityResponse | null>(null);

  // Filters State
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [signFilter, setSignFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [tableSearch, setTableSearch] = useState<string>("");

  // Point in time stock calculation
  const [asOfDate, setAsOfDate] = useState<string>("");
  const [isCalculatingPointInTime, setIsCalculatingPointInTime] = useState<boolean>(false);
  const [pointInTimeResult, setPointInTimeResult] = useState<{
    date: string;
    stockPinamar: number;
    stockMontevideo: number;
    stockTotal: number;
  } | null>(null);

  // Manual Movement Modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<InventoryMovementType>("ajuste_positivo");
  const [movementBranch, setMovementBranch] = useState<"Pinamar" | "Montevideo">("Pinamar");
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementReason, setMovementReason] = useState("");
  const [movementObs, setMovementObs] = useState("");
  const [movementUser, setMovementUser] = useState("Administrador");
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementModalError, setMovementModalError] = useState<string | null>(null);

  // Operation Details Modal (quick preview order / bill / transfer)
  const [previewOperation, setPreviewOperation] = useState<{
    type: string;
    id: string;
    data?: any;
  } | null>(null);

  // UI feedback states
  const [copiedSku, setCopiedSku] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Initial product load or search (only when explicit initialProductId or initialSku is provided)
  useEffect(() => {
    if (initialProductId) {
      const match = (store.products || []).find(p => String(p.id) === String(initialProductId));
      if (match) {
        handleSelectProduct(match);
        return;
      }
    }
    if (initialSku) {
      const match = (store.products || []).find(p => 
        (p.codigo && p.codigo.trim().toUpperCase() === initialSku.trim().toUpperCase()) ||
        p.variants?.some(v => v.sku && v.sku.trim().toUpperCase() === initialSku.trim().toUpperCase())
      );
      if (match) {
        handleSelectProduct(match);
        return;
      }
    }
    // Clean entry by default: never preload data without explicit intent
    setSelectedProduct(null);
    setTraceData(null);
  }, [initialProductId, initialSku]);

  const handleClearSelectedProduct = () => {
    setSelectedProduct(null);
    setTraceData(null);
    setSelectedVariantId("all");
    setSearchQuery("");
    setSearchResults([]);
    setPointInTimeResult(null);
    setAsOfDate("");
    setCurrentPage(1);
  };

  // 2. Live Article Search (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/inventory/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setSearchResults(data.items);
        } else {
          // Fallback to local filtering
          const q = searchQuery.toLowerCase().trim();
          const localMatches = (store.products || []).filter(p => {
            const inName = p.name?.toLowerCase().includes(q);
            const inCode = p.codigo?.toLowerCase().includes(q);
            const inVariants = p.variants?.some(v => 
              v.sku?.toLowerCase().includes(q) || 
              v.color?.toLowerCase().includes(q) || 
              v.size?.toLowerCase().includes(q)
            );
            return inName || inCode || inVariants;
          });
          setSearchResults(localMatches);
        }
      } catch (err) {
        console.error("Error searching articles:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, authToken, store.products]);

  // 3. Load Traceability Data for selected product
  const loadTraceability = async (prodId: string, varId?: string) => {
    setIsLoadingTrace(true);
    try {
      let url = `/api/inventory/traceability?productId=${encodeURIComponent(prodId)}`;
      if (varId && varId !== "all") {
        url += `&variantId=${encodeURIComponent(varId)}`;
      }
      if (branchFilter !== "all") url += `&branch=${encodeURIComponent(branchFilter)}`;
      if (typeFilter !== "all") url += `&movementType=${encodeURIComponent(typeFilter)}`;
      if (statusFilter !== "all") url += `&status=${encodeURIComponent(statusFilter)}`;
      if (signFilter !== "all") url += `&quantitySign=${encodeURIComponent(signFilter)}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTraceData(data);
      } else {
        showToast(data.message || "Error al recuperar trazabilidad", "error");
      }
    } catch (err: any) {
      console.error("Error fetching traceability:", err);
      showToast("Error de conexión al cargar la trazabilidad.", "error");
    } finally {
      setIsLoadingTrace(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      loadTraceability(String(selectedProduct.id), selectedVariantId);
    }
  }, [selectedProduct, selectedVariantId, branchFilter, typeFilter, statusFilter, signFilter, startDate, endDate]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariantId("all");
    setSearchQuery("");
    setSearchResults([]);
    setPointInTimeResult(null);
    setAsOfDate("");
    setCurrentPage(1);
  };

  // 4. Calculate Point in Time Stock
  const handleCalculatePointInTime = async () => {
    if (!asOfDate || !selectedProduct) return;
    setIsCalculatingPointInTime(true);
    try {
      const targetIso = new Date(asOfDate).toISOString();
      let url = `/api/inventory/traceability?productId=${encodeURIComponent(selectedProduct.id)}&asOfDate=${encodeURIComponent(targetIso)}`;
      if (selectedVariantId && selectedVariantId !== "all") {
        url += `&variantId=${encodeURIComponent(selectedVariantId)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.historicalStockAtDate) {
        setPointInTimeResult(data.historicalStockAtDate);
        showToast(`Stock reconstruido para el ${new Date(asOfDate).toLocaleDateString('es-UY')}`, "success");
      }
    } catch (err) {
      console.error("Error calculating point in time stock:", err);
      showToast("No se pudo calcular el stock histórico a esa fecha.", "error");
    } finally {
      setIsCalculatingPointInTime(false);
    }
  };

  // 5. Submit Manual Movement / Adjustment
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!movementReason.trim()) {
      setMovementModalError("Debe especificar un motivo detallado para el movimiento.");
      return;
    }
    if (movementQty <= 0) {
      setMovementModalError("La cantidad debe ser mayor a 0.");
      return;
    }

    setIsSubmittingMovement(true);
    setMovementModalError(null);

    try {
      const payload = {
        productId: selectedProduct.id,
        variantId: selectedVariantId !== "all" ? selectedVariantId : undefined,
        sku: selectedProduct.codigo || undefined,
        movementType,
        quantity: movementQty,
        branch: movementBranch,
        motivo: movementReason.trim(),
        observaciones: movementObs.trim() || undefined,
        usuario: movementUser.trim() || "Administrador"
      };

      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast("Movimiento de inventario registrado con éxito.", "success");
        setIsMovementModalOpen(false);
        setMovementReason("");
        setMovementObs("");
        setMovementQty(1);
        // Refresh traceability
        loadTraceability(String(selectedProduct.id), selectedVariantId);
      } else {
        setMovementModalError(data.message || "Error al registrar el movimiento.");
      }
    } catch (err: any) {
      setMovementModalError("Error al conectar con el servidor: " + err.message);
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // 6. Manual Audit Reconcile
  const handleTriggerReconcile = async () => {
    setIsLoadingTrace(true);
    try {
      const res = await fetch("/api/inventory/reconcile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Auditoría de inventario conciliada correctamente.", "success");
        if (selectedProduct) {
          loadTraceability(String(selectedProduct.id), selectedVariantId);
        }
      } else {
        showToast(data.message || "Error al conciliar auditoría.", "error");
      }
    } catch (err) {
      showToast("Error de conexión durante la conciliación.", "error");
    } finally {
      setIsLoadingTrace(false);
    }
  };

  // 7. Export to CSV
  const handleExportCSV = () => {
    if (!traceData || !traceData.movements || traceData.movements.length === 0) {
      showToast("No hay movimientos para exportar con los filtros actuales.", "error");
      return;
    }

    const headers = [
      "ID",
      "Fecha y Hora (Montevideo)",
      "Artículo",
      "Variante",
      "SKU",
      "Tipo de Movimiento",
      "Cantidad",
      "Stock Anterior",
      "Stock Posterior",
      "Sucursal Origen",
      "Sucursal Destino",
      "Usuario",
      "Comprobante / Nro",
      "Cliente / Proveedor",
      "Costo Unitario",
      "Precio Unitario",
      "Motivo",
      "Observaciones",
      "Estado"
    ];

    const rows = traceData.movements.map(m => [
      `"${m.id}"`,
      `"${m.createdAtMontevideo || m.createdAt}"`,
      `"${(m.productName || '').replace(/"/g, '""')}"`,
      `"${(m.variantName || '').replace(/"/g, '""')}"`,
      `"${m.sku || ''}"`,
      `"${m.movementTypeLabel || m.movementType}"`,
      m.quantity,
      m.stockAnterior || 0,
      m.stockPosterior || 0,
      `"${m.sucursalOrigen || ''}"`,
      `"${m.sucursalDestino || ''}"`,
      `"${m.usuario || ''}"`,
      `"${m.referenciaNumero || ''}"`,
      `"${(m.entidadAsociada || '').replace(/"/g, '""')}"`,
      m.costoUnitario || 0,
      m.precioUnitario || 0,
      `"${(m.motivo || '').replace(/"/g, '""')}"`,
      `"${(m.observaciones || '').replace(/"/g, '""')}"`,
      `"${m.estado || 'confirmada'}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const skuLabel = selectedProduct?.codigo || selectedProduct?.id || "articulo";
    link.setAttribute("download", `trazabilidad_juem_${skuLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Reporte CSV exportado correctamente.", "success");
  };

  // 8. Print report
  const handlePrint = () => {
    window.print();
  };

  // Filtered movements for table view
  const filteredMovements = useMemo(() => {
    if (!traceData?.movements) return [];
    let list = [...traceData.movements];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(m => 
        (m.referenciaNumero && m.referenciaNumero.toLowerCase().includes(q)) ||
        (m.entidadAsociada && m.entidadAsociada.toLowerCase().includes(q)) ||
        (m.motivo && m.motivo.toLowerCase().includes(q)) ||
        (m.usuario && m.usuario.toLowerCase().includes(q)) ||
        (m.observaciones && m.observaciones.toLowerCase().includes(q))
      );
    }
    return list;
  }, [traceData?.movements, tableSearch]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage) || 1;
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(start, start + itemsPerPage);
  }, [filteredMovements, currentPage]);

  const getMovementBadge = (type: InventoryMovementType) => {
    switch (type) {
      case "compra":
        return {
          label: "Compra de Proveedor",
          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          icon: <Receipt className="w-3.5 h-3.5" />
        };
      case "venta":
        return {
          label: "Venta Confirmada",
          color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
          icon: <ShoppingBag className="w-3.5 h-3.5" />
        };
      case "transferencia_salida":
        return {
          label: "Traslado (Salida)",
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: <ArrowUpRight className="w-3.5 h-3.5" />
        };
      case "transferencia_entrada":
        return {
          label: "Traslado (Entrada)",
          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
          icon: <ArrowDownLeft className="w-3.5 h-3.5" />
        };
      case "stock_inicial":
        return {
          label: "Stock Inicial",
          color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
          icon: <Box className="w-3.5 h-3.5" />
        };
      case "ajuste_positivo":
        return {
          label: "Ajuste Positivo (+)",
          color: "bg-teal-500/15 text-teal-300 border-teal-500/30",
          icon: <TrendingUp className="w-3.5 h-3.5" />
        };
      case "ajuste_negativo":
        return {
          label: "Ajuste Negativo (-)",
          color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
          icon: <TrendingDown className="w-3.5 h-3.5" />
        };
      case "devolucion_cliente":
        return {
          label: "Devolución Cliente",
          color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
          icon: <RefreshCw className="w-3.5 h-3.5" />
        };
      case "devolucion_proveedor":
        return {
          label: "Devolución a Proveedor",
          color: "bg-orange-500/15 text-orange-300 border-orange-500/30",
          icon: <ArrowUpRight className="w-3.5 h-3.5" />
        };
      case "inventario_fisico":
        return {
          label: "Conteo Físico",
          color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          icon: <Scale className="w-3.5 h-3.5" />
        };
      case "anulacion":
        return {
          label: "Anulación / Reversión",
          color: "bg-red-500/20 text-red-300 border-red-500/40",
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: "Movimiento",
          color: "bg-slate-500/15 text-slate-300 border-slate-500/30",
          icon: <Box className="w-3.5 h-3.5" />
        };
    }
  };

  const summary = traceData?.summary;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans pb-16">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl animate-fade-in ${
          notification.type === "success" 
            ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
            : notification.type === "error"
            ? "bg-rose-950/90 text-rose-200 border-rose-500/40"
            : "bg-slate-900/90 text-slate-200 border-slate-700/50"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* HEADER BAR CON BRANDING ÁUREA PRO */}
      <div className="bg-gradient-to-r from-[#070D1A] via-[#0A1224] to-[#070D1A] border border-[#D4AF37]/20 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#E6BF76]/90 mb-1">
              <History className="w-4 h-4 text-[#D4AF37]" />
              <span>Auditoría & Inventario</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Sistema Juem</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3E5AB] tracking-tight drop-shadow-sm">
              Trazabilidad Integral de Artículos
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Consulta la historia completa de cualquier producto: ingresos por compra, ventas confirmadas, traslados entre sucursales, devoluciones y ajustes de inventario auditados en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTriggerReconcile}
              disabled={isLoadingTrace}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] border border-[#D4AF37]/25 text-slate-200 hover:text-[#F3E5AB] transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Conciliar y verificar integridad de registros"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isLoadingTrace ? 'animate-spin' : ''}`} />
              <span>Conciliar Auditoría</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!traceData?.movements?.length}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] border border-[#D4AF37]/25 text-slate-200 hover:text-[#F3E5AB] transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Descargar historial en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={!traceData?.movements?.length}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#B88730] text-[#050B1A] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 font-black cursor-pointer shadow-[0_4px_15px_rgba(212,175,55,0.25)]"
              title="Imprimir informe oficial de trazabilidad"
            >
              <Printer className="w-3.5 h-3.5 text-[#050B1A]" />
              <span>Imprimir Reporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. BUSCADOR GLOBAL DE ARTÍCULOS */}
      <div className="bg-[#070D1A]/95 border border-[#D4AF37]/20 rounded-2xl p-5 shadow-lg relative z-40">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black uppercase tracking-wider text-[#E6BF76] flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Buscador Global de Artículos (SKU, Código, Nombre, Variante o ID)</span>
          </label>
          {selectedProduct && (
            <button
              onClick={handleClearSelectedProduct}
              className="text-[11px] font-bold text-slate-400 hover:text-[#F3E5AB] flex items-center gap-1 cursor-pointer transition"
              title="Volver a la vista limpia"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar selección</span>
            </button>
          )}
        </div>
        
        <div className="relative z-50" ref={searchContainerRef}>
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Escribe el SKU (ej. J084N), nombre del producto, color o ID..."
            className="w-full bg-[#030712] border border-[#D4AF37]/30 focus:border-[#D4AF37] rounded-xl pl-11 pr-10 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown - Con z-index ultra-elevado para que nunca quede por debajo */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A1224] border border-[#D4AF37]/45 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-[100] max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-800">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectProduct(item)}
                  className="p-3 hover:bg-[#1E293B]/80 cursor-pointer transition flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.imageUrl || item.image_url || "/placeholder.png"}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 truncate">{item.name}</span>
                        {item.codigo && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F3E5AB] text-[10px] font-mono font-bold shrink-0">
                            {item.codigo}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        ID: {item.id} • Categoría: {item.category || item.categoria_id || "General"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#E6BF76]">
                      Stock: {(item.stockPinamar || item.stock_pinamar || 0) + (item.stockMontevideo || item.stock_montevideo || 0)} u
                    </span>
                    <div className="text-[10px] text-slate-400">
                      Pinamar: {item.stockPinamar || item.stock_pinamar || 0} • Mvd: {item.stockMontevideo || item.stock_montevideo || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick select pills */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Populares:</span>
          {(store.products || []).slice(0, 5).map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectProduct(p)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition shrink-0 cursor-pointer ${
                selectedProduct?.id === p.id 
                  ? "bg-[#D4AF37]/25 text-[#F3E5AB] border-[#D4AF37]/50" 
                  : "bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              {p.codigo ? `[${p.codigo}] ` : ""}{p.name.length > 25 ? p.name.substring(0, 25) + "..." : p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. FICHA DEL ARTÍCULO SELECCIONADO */}
      {selectedProduct && (
        <div className="bg-[#070D1A]/95 border border-[#D4AF37]/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#D4AF37]/15">
            <div className="flex items-start sm:items-center gap-4">
              <img
                src={selectedProduct.imageUrl || "/placeholder.png"}
                alt={selectedProduct.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-900 border-2 border-[#D4AF37]/30 shadow-md shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-[#F3E5AB]">
                    {selectedProduct.name}
                  </h2>
                  {selectedProduct.codigo && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedProduct.codigo || "");
                        setCopiedSku(true);
                        setTimeout(() => setCopiedSku(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#F3E5AB] text-xs font-mono font-bold hover:bg-[#D4AF37]/30 transition cursor-pointer"
                      title="Copiar SKU"
                    >
                      <span>SKU: {selectedProduct.codigo}</span>
                      {copiedSku ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#D4AF37]" />}
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold">
                    ID #{selectedProduct.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
                  <span>Categoría: <strong className="text-slate-200">{selectedProduct.category || selectedProduct.categoria_id || "General"}</strong></span>
                  <span>•</span>
                  <span>Costo Compra: <strong className="text-emerald-400">${Number(selectedProduct.precioCompra || 0).toLocaleString('es-UY')}</strong></span>
                  <span>•</span>
                  <span>Precio Venta Web: <strong className="text-[#E6BF76]">${Number(selectedProduct.price || 0).toLocaleString('es-UY')}</strong></span>
                </div>
              </div>
            </div>

            {/* Selector de Variante y Acción de Movimiento Manual */}
            <div className="flex items-center gap-3 flex-wrap">
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="flex items-center gap-2 bg-[#030712] border border-[#D4AF37]/30 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Variante:</span>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="bg-transparent text-[#F3E5AB] font-bold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="all" className="bg-[#070D1A] text-slate-100">Todas las variantes</option>
                    {selectedProduct.variants.map((v) => (
                      <option key={v.id || v.sku} value={v.id || v.sku} className="bg-[#070D1A] text-slate-100">
                        {v.size} / {v.color} {v.sku ? `(${v.sku})` : ""} - Stock: {(v.stockPinamar || 0) + (v.stockMontevideo || 0)}u
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleClearSelectedProduct}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Volver al buscador para inspeccionar otro artículo"
              >
                <Search className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Buscar otro artículo</span>
              </button>

              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] hover:bg-[#E6BF76] text-[#050B1A] transition shadow-md flex items-center gap-1.5 cursor-pointer font-black active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Registrar Ajuste / Movimiento</span>
              </button>
            </div>
          </div>

          {/* 3. RESUMEN DE INDICADORES (TARJETAS KPI) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6">
            
            {/* Stock Pinamar */}
            <div className="bg-[#030712]/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-[#D4AF37]/30 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Stock Pinamar
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                {summary ? summary.stockPinamar : (selectedProduct.stockPinamar || 0)} <span className="text-xs font-normal text-slate-500">u</span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-1 block">Almacén Canelones</span>
            </div>

            {/* Stock Montevideo */}
            <div className="bg-[#030712]/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-[#D4AF37]/30 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Stock Montevideo
              </span>
              <div className="text-xl sm:text-2xl font-black text-cyan-400">
                {summary ? summary.stockMontevideo : (selectedProduct.stockMontevideo || 0)} <span className="text-xs font-normal text-slate-500">u</span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-1 block">Almacén Montevideo</span>
            </div>

            {/* Stock Total Juem */}
            <div className="bg-[#030712]/80 border border-[#D4AF37]/35 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/10 rounded-full blur-xl pointer-events-none" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#E6BF76] block mb-1">
                Stock Total Juem
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#F3E5AB]">
                {summary ? summary.stockTotal : (selectedProduct.stock || 0)} <span className="text-xs font-normal text-slate-500">u</span>
              </div>
              <span className="text-[9px] text-[#D4A55A]/80 font-medium mt-1 block">Existencias Reales</span>
            </div>

            {/* Ingresos por Compras */}
            <div className="bg-[#030712]/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-emerald-500/30 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                Ingreso Compras
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">
                +{summary ? summary.totalCompras : 0} <span className="text-xs font-normal text-slate-500">u</span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-1 block">Según boletas de compra</span>
            </div>

            {/* Total Vendido */}
            <div className="bg-[#030712]/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-blue-500/30 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block mb-1">
                Total Vendido
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-300">
                -{summary ? summary.totalVentas : 0} <span className="text-xs font-normal text-slate-500">u</span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-1 block">Ventas aprobadas</span>
            </div>

            {/* Valoración Stock */}
            <div className="bg-[#030712]/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-[#D4AF37]/30 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#E6BF76] block mb-1">
                Valoración Stock
              </span>
              <div className="text-lg sm:text-xl font-black text-[#F3E5AB] truncate">
                ${summary ? Math.round(summary.valorStockActual).toLocaleString('es-UY') : 0}
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-1 block">
                Costo: ${selectedProduct.precioCompra || 0}/u
              </span>
            </div>

          </div>

          {/* Segunda Fila de Indicadores: Transferencias, Devoluciones y Ajustes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-3.5">
            <div className="bg-[#030712]/50 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Traslados Enviados:</span>
              <span className="font-bold text-amber-300">
                {summary ? summary.totalTransferenciasSalida : 0} u
              </span>
            </div>

            <div className="bg-[#030712]/50 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Traslados Recibidos:</span>
              <span className="font-bold text-indigo-300">
                {summary ? summary.totalTransferenciasEntrada : 0} u
              </span>
            </div>

            <div className="bg-[#030712]/50 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Devoluciones Totales:</span>
              <span className="font-bold text-cyan-300">
                {summary ? summary.totalDevoluciones : 0} u
              </span>
            </div>

            <div className="bg-[#030712]/50 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Ajustes Netos (+ / -):</span>
              <span className={`font-bold ${((summary?.totalAjustesPositivos || 0) - (summary?.totalAjustesNegativos || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary ? `${(summary.totalAjustesPositivos || 0) - (summary.totalAjustesNegativos || 0)} u` : '0 u'}
              </span>
            </div>
          </div>

          {/* 4. CONSULTA DE STOCK A UNA FECHA DETERMINADA */}
          <div className="mt-6 bg-[#030712]/90 border border-indigo-500/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-300">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-200 tracking-wider">
                  Consultar Stock Reconstruido a una Fecha Pasada
                </h4>
                <p className="text-[11px] text-slate-400">
                  Calcula matemáticamente qué existencias tenía este artículo en cualquier momento anterior.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-[#0A1224] border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={handleCalculatePointInTime}
                disabled={!asOfDate || isCalculatingPointInTime}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isCalculatingPointInTime ? "Calculando..." : "Calcular"}
              </button>
            </div>
          </div>

          {/* Resultado de la reconstrucción histórica */}
          {pointInTimeResult && (
            <div className="mt-3 p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Existencias al <strong>{new Date(pointInTimeResult.date).toLocaleDateString('es-UY')}:</strong>
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono font-bold">
                <span className="text-amber-300">Pinamar: {pointInTimeResult.stockPinamar} u</span>
                <span className="text-cyan-300">Montevideo: {pointInTimeResult.stockMontevideo} u</span>
                <span className="text-[#F3E5AB] bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/40">
                  Total Juem: {pointInTimeResult.stockTotal} u
                </span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. TABLA DE HISTORIAL CRONOLÓGICO Y FILTROS O ESTADO LIMPIO */}
      {selectedProduct ? (
        <div className="bg-[#070D1A]/95 border border-[#D4AF37]/20 rounded-3xl p-6 shadow-xl space-y-5">
        
        {/* Barra de Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-black uppercase text-[#F3E5AB] tracking-wider">
              Historial Cronológico de Movimientos ({filteredMovements.length})
            </h3>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            {/* Filtro Sucursal */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-[#030712] border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">Todas las Sucursales</option>
              <option value="Pinamar">Solo Pinamar</option>
              <option value="Montevideo">Solo Montevideo</option>
            </select>

            {/* Filtro Tipo Movimiento */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#030712] border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">Todos los Movimientos</option>
              <option value="compra">Compras (Boletas)</option>
              <option value="venta">Ventas</option>
              <option value="transferencia_salida">Traslados (Salidas)</option>
              <option value="transferencia_entrada">Traslados (Entradas)</option>
              <option value="ajuste_positivo">Ajustes Positivos (+)</option>
              <option value="ajuste_negativo">Ajustes Negativos (-)</option>
              <option value="devolucion_cliente">Devolución Cliente</option>
              <option value="stock_inicial">Stock Inicial</option>
              <option value="anulacion">Anulaciones</option>
            </select>

            {/* Filtro Signo */}
            <select
              value={signFilter}
              onChange={(e) => setSignFilter(e.target.value)}
              className="bg-[#030712] border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">Todos los Signos</option>
              <option value="positive">Solo Ingresos (+)</option>
              <option value="negative">Solo Salidas (-)</option>
            </select>

            {/* Buscador interno de tabla */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar comprobante, cliente o usuario..."
                className="bg-[#030712] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Tabla Responsiva de Movimientos */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#030712] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-black">Fecha y Hora</th>
                <th className="py-3 px-4 font-black">Operación</th>
                <th className="py-3 px-4 font-black text-center">Cantidad</th>
                <th className="py-3 px-4 font-black text-center">Saldo</th>
                <th className="py-3 px-4 font-black">Origen / Destino</th>
                <th className="py-3 px-4 font-black">Responsable</th>
                <th className="py-3 px-4 font-black">Comprobante</th>
                <th className="py-3 px-4 font-black">Entidad Asociada</th>
                <th className="py-3 px-4 font-black">Motivo / Observaciones</th>
                <th className="py-3 px-4 font-black text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoadingTrace ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
                      <span className="text-xs font-bold">Cargando trazabilidad completa...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="w-8 h-8 text-slate-700 stroke-[1.5]" />
                      <span className="text-xs font-bold">No se encontraron movimientos registrados con estos filtros.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((mov) => {
                  const badge = getMovementBadge(mov.movementType);
                  const isPositive = mov.quantity > 0;
                  const isNegative = mov.quantity < 0;

                  return (
                    <tr key={mov.id} className="hover:bg-[#0F172A]/50 transition group">
                      
                      {/* Fecha y Hora (Montevideo) */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{mov.createdAtMontevideo || new Date(mov.createdAt).toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </td>

                      {/* Tipo de Movimiento Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Cantidad con signo */}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md ${
                          isPositive 
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                            : isNegative
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-slate-700 text-slate-300"
                        }`}>
                          {isPositive ? `+${mov.quantity}` : mov.quantity} u
                        </span>
                      </td>

                      {/* Saldo de Stock */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {mov.stockAnterior !== undefined && mov.stockPosterior !== undefined ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-400">{mov.stockAnterior}</span>
                            <span className="text-slate-600">➜</span>
                            <span className="font-bold text-[#F3E5AB]">{mov.stockPosterior}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Origen / Destino */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {mov.sucursalOrigen && mov.sucursalDestino && mov.sucursalOrigen !== mov.sucursalDestino ? (
                          <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                            <span className="text-amber-400 font-bold">{mov.sucursalOrigen}</span>
                            <span className="text-slate-500">➜</span>
                            <span className="text-cyan-400 font-bold">{mov.sucursalDestino}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-200">
                            {mov.sucursalOrigen || mov.sucursalDestino || "Central Juem"}
                          </span>
                        )}
                      </td>

                      {/* Responsable */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1 truncate max-w-[120px]" title={mov.usuario}>
                          <User className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{mov.usuario || "Sistema"}</span>
                        </div>
                      </td>

                      {/* Comprobante / Enlace a operación original */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {mov.referenciaNumero ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[11px] text-[#F3E5AB]">
                              {mov.referenciaNumero}
                            </span>
                            {mov.referenciaTipo === "order" && onNavigateToOrder && mov.referenciaId && (
                              <button
                                onClick={() => onNavigateToOrder(mov.referenciaId!)}
                                className="p-1 hover:bg-[#D4AF37]/20 rounded text-[#D4AF37] transition"
                                title="Ver Pedido Original"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {mov.referenciaTipo === "bill" && onNavigateToBill && mov.referenciaId && (
                              <button
                                onClick={() => onNavigateToBill(mov.referenciaId!)}
                                className="p-1 hover:bg-[#D4AF37]/20 rounded text-[#D4AF37] transition"
                                title="Ver Boleta Original"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Entidad Asociada (Cliente o Proveedor) */}
                      <td className="py-3.5 px-4 text-slate-300 text-[11px] max-w-[140px] truncate" title={mov.entidadAsociada || ""}>
                        {mov.entidadAsociada || <span className="text-slate-600">—</span>}
                      </td>

                      {/* Motivo y Observaciones */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-[200px]">
                        <p className="font-semibold text-slate-200 truncate" title={mov.motivo || ""}>
                          {mov.motivo || "Operación regular"}
                        </p>
                        {mov.observaciones && (
                          <p className="text-[10px] text-slate-500 truncate" title={mov.observaciones}>
                            {mov.observaciones}
                          </p>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          mov.estado === "confirmada"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : mov.estado === "pendiente"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}>
                          {mov.estado}
                        </span>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredMovements.length} movimientos)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-[#030712] text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                Anterior
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-[#030712] text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        </div>
      ) : (
        /* Estado inicial limpio cuando no hay ningún dato precargado */
        <div className="bg-[#070D1A]/95 border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-xl text-center relative overflow-hidden animate-fade-in">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-xl mx-auto relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#0A1224] border border-[#D4AF37]/40 flex items-center justify-center text-[#E6BF76] mb-4 shadow-[0_4px_25px_rgba(212,175,55,0.25)]">
              <Search className="w-8 h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#F3E5AB] tracking-tight">
              Sin artículo seleccionado
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed max-w-md">
              Ingresa el SKU, código o nombre en el buscador superior para consultar su trazabilidad integral, compras, ventas web y traslados auditados en tiempo real.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 w-full text-left">
              <div className="bg-[#030712]/80 border border-slate-800/80 rounded-2xl p-4 hover:border-[#D4AF37]/30 transition">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1.5">
                  <Receipt className="w-4 h-4" />
                  <span>Boletas de Compra</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Entradas de stock directas registradas desde facturas de proveedores.
                </p>
              </div>

              <div className="bg-[#030712]/80 border border-slate-800/80 rounded-2xl p-4 hover:border-[#D4AF37]/30 transition">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ventas Web</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Descuento automático de stock vinculado a la orden confirmada.
                </p>
              </div>

              <div className="bg-[#030712]/80 border border-slate-800/80 rounded-2xl p-4 hover:border-[#D4AF37]/30 transition">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1.5">
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Traslados y Ajustes</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Seguimiento entre Pinamar y Montevideo con motivo documentado.
                </p>
              </div>
            </div>

            {/* Sugerencias de artículos rápidos si existen productos en el catálogo */}
            {(store.products || []).length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-800/80 w-full">
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-3">
                  O selecciona rápidamente uno de estos productos del inventario:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {(store.products || []).slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#030712] border border-[#D4AF37]/25 text-slate-300 hover:text-[#F3E5AB] hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/10 transition flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {p.codigo && (
                        <span className="text-[10px] font-mono text-[#E6BF76] font-bold">
                          [{p.codigo}]
                        </span>
                      )}
                      <span>{p.name.length > 20 ? p.name.slice(0, 20) + "..." : p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL REGISTRAR MOVIMIENTO MANUAL */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0A1224] border border-[#D4AF37]/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden text-slate-100">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#E6BF76]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#F3E5AB]">
                    Registrar Movimiento / Ajuste de Inventario
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {selectedProduct?.name} {selectedProduct?.codigo ? `[${selectedProduct.codigo}]` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {movementModalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{movementModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMovement} className="mt-4 space-y-4 text-xs">
              
              {/* Tipo de movimiento */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                  Tipo de Operación
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="w-full bg-[#030712] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="ajuste_positivo">Ajuste Positivo (+) — Hallazgo / Sobrante</option>
                  <option value="ajuste_negativo">Ajuste Negativo (-) — Merma / Daño / Rotura</option>
                  <option value="devolucion_cliente">Devolución de Cliente (+)</option>
                  <option value="devolucion_proveedor">Devolución a Proveedor (-)</option>
                  <option value="inventario_fisico">Corrección por Conteo Físico</option>
                  <option value="otro">Otro Movimiento Documentado</option>
                </select>
              </div>

              {/* Sucursal y Cantidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Sucursal
                  </label>
                  <select
                    value={movementBranch}
                    onChange={(e) => setMovementBranch(e.target.value as any)}
                    className="w-full bg-[#030712] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="Pinamar">Pinamar</option>
                    <option value="Montevideo">Montevideo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Cantidad de Unidades
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={movementQty}
                    onChange={(e) => setMovementQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#030712] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Motivo Obligatorio */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                  Motivo de la Operación <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Conteo físico de fin de mes, artículo con defecto, devolución cliente..."
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              {/* Observaciones adicionales */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                  Observaciones Detalladas (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el estado del producto, autorización, número de ticket interno..."
                  value={movementObs}
                  onChange={(e) => setMovementObs(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-slate-200 focus:outline-none resize-none"
                />
              </div>

              {/* Usuario Responsable */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                  Usuario Responsable
                </label>
                <input
                  type="text"
                  value={movementUser}
                  onChange={(e) => setMovementUser(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovement}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#D4AF37] hover:bg-[#E6BF76] text-[#050B1A] transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingMovement ? "Guardando..." : "Confirmar Movimiento"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ESTILOS DE IMPRESIÓN OFICIAL */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside, nav, header, button, select, input {
            display: none !important;
          }
          .animate-fade-in {
            animation: none !important;
          }
        }
      `}</style>

    </div>
  );
};
export default DashboardTraceability;
