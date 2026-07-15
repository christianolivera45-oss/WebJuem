import React, { useState, useMemo, useRef } from "react";
import { ShopState, Bill, BillItem } from "../types";
import { normalizeText } from "../utils/shopLogic.tsx";
import { 
  Search, 
  Calendar, 
  Trash2, 
  Plus, 
  X, 
  Store, 
  Filter, 
  Building2, 
  FileText, 
  Receipt,
  DollarSign, 
  PlusCircle, 
  FileCheck, 
  Info,
  ChevronDown,
  Camera,
  Loader2,
  Sparkles
} from "lucide-react";

interface DashboardBillsProps {
  store: ShopState;
  onAddBill: (newBill: Bill) => void;
  onDeleteBill: (id: string) => Promise<void>;
}

export const DashboardBills: React.FC<DashboardBillsProps> = ({ 
  store, 
  onAddBill, 
  onDeleteBill 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  
  // Date range filters
  const [dateFilterType, setDateFilterType] = useState<"all" | "this-month" | "last-month" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // New bill modal / form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerRut, setProviderRut] = useState("");
  const [documentType, setDocumentType] = useState("Boleta Contado");
  const [documentNumber, setDocumentNumber] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yr = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, "0");
    const dy = String(today.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${dy}`;
  });
  const [currency, setCurrency] = useState("UYU");
  const [paymentMethod, setPaymentMethod] = useState("Contado");
  const [depositoOrigen, setDepositoOrigen] = useState<"Pinamar" | "Montevideo">("Pinamar");
  const [notes, setNotes] = useState("");
  
  // Detail mode toggle
  const [entryMode, setEntryMode] = useState<"totals" | "detailed">("totals");
  
  // Manual totals (for 'totals' mode)
  const [manualSubtotal, setManualSubtotal] = useState<number>(0);
  const [manualIvaAmount, setManualIvaAmount] = useState<number>(0);
  const [manualTotal, setManualTotal] = useState<number>(0);

  // Detailed items (for 'detailed' mode)
  const [items, setItems] = useState<BillItem[]>(() => {
    const initialId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    return [{ id: initialId, description: "", quantity: 1, unitPrice: 0, totalPrice: 0, ivaRate: "22%" }];
  });

  // View details modal
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI scanning states and handlers
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMessage(null);
    setScanSuccessMessage(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/bills/analyze", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const analyzed = data.data;
        
        if (analyzed.providerName) setProviderName(analyzed.providerName);
        if (analyzed.providerRut) setProviderRut(analyzed.providerRut);
        if (analyzed.documentType) setDocumentType(analyzed.documentType);
        if (analyzed.documentNumber) setDocumentNumber(analyzed.documentNumber);
        if (analyzed.date) setDate(analyzed.date);
        if (analyzed.currency) setCurrency(analyzed.currency);
        if (analyzed.paymentMethod) setPaymentMethod(analyzed.paymentMethod);
        if (analyzed.notes) setNotes(analyzed.notes);

        if (analyzed.items && analyzed.items.length > 0) {
          setEntryMode("detailed");
          setItems(analyzed.items.map((it: any) => {
            const scanId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
            return {
              id: scanId,
              description: it.description || "",
              quantity: Math.max(1, Number(it.quantity) || 1),
              unitPrice: Math.max(0, Number(it.unitPrice) || 0),
              totalPrice: (Math.max(1, Number(it.quantity) || 1)) * (Math.max(0, Number(it.unitPrice) || 0)),
              ivaRate: it.ivaRate || "22%"
            };
          }));
        } else {
          setEntryMode("totals");
          setManualSubtotal(Number(analyzed.subtotal) || 0);
          setManualIvaAmount(Number(analyzed.ivaAmount) || 0);
          setManualTotal(Number(analyzed.total) || 0);
        }

        setScanSuccessMessage("¡Boleta analizada con éxito! Los datos han sido completados automáticamente.");
      } else {
        setErrorMessage(data.message || "No se pudo analizar la boleta. Inténtelo de nuevo o ingrese los datos manualmente.");
      }
    } catch (err: any) {
      setErrorMessage("Error al conectar con el servidor para analizar la boleta.");
    } finally {
      setIsScanning(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const billsList = useMemo(() => store.bills || [], [store.bills]);

  // Provider presets (for auto-complete)
  const providerPresets = ["Kaluga", "Casa Jorge", "Buelito", "Kaku", "Consumo Final", "Mercado Libre", "Otros"];

  // Helper to handle adding/removing/updating item rows
  const handleAddItemRow = () => {
    const newId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    setItems(prev => [
      { id: newId, description: "", quantity: 1, unitPrice: 0, totalPrice: 0, ivaRate: "22%" },
      ...prev
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemRow = (index: number, field: keyof BillItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index] };
      
      if (field === "description") {
        item.description = value;
      } else if (field === "quantity") {
        item.quantity = Math.max(1, Number(value) || 1);
      } else if (field === "unitPrice") {
        item.unitPrice = Math.max(0, Number(value) || 0);
      } else if (field === "ivaRate") {
        item.ivaRate = value;
      }

      // Re-calculate row total
      item.totalPrice = item.quantity * item.unitPrice;
      copy[index] = item;
      return copy;
    });
  };

  // Compute values dynamically for "detailed" mode
  const computedValues = useMemo(() => {
    if (entryMode === "totals") {
      return {
        subtotal: manualSubtotal,
        ivaAmount: manualIvaAmount,
        total: manualTotal
      };
    }

    let subtotal = 0;
    let ivaAmount = 0;

    items.forEach(it => {
      const lineTotal = it.quantity * it.unitPrice;
      let rate = 0.22; // default 22%
      if (it.ivaRate === "10%") rate = 0.10;
      else if (it.ivaRate === "No Gravado" || it.ivaRate === "0%") rate = 0.0;

      // In Uruguay, usually the prices entered from bills are already IVA-inclusive or exclusive.
      // Let's assume entered unitPrice is IVA-inclusive (like typical tickets).
      // So lineTotal = base + base * rate -> base = lineTotal / (1 + rate).
      const lineSubtotal = lineTotal / (1 + rate);
      const lineIva = lineTotal - lineSubtotal;

      subtotal += lineSubtotal;
      ivaAmount += lineIva;
    });

    const total = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      ivaAmount: parseFloat(ivaAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }, [entryMode, manualSubtotal, manualIvaAmount, manualTotal, items]);

  // Handle manual totals updates to keep math in sync (e.g. subtotal + iva = total)
  const handleManualTotalsChange = (field: "subtotal" | "iva" | "total", val: number) => {
    if (field === "subtotal") {
      setManualSubtotal(val);
      // Guess total
      setManualTotal(parseFloat((val + manualIvaAmount).toFixed(2)));
    } else if (field === "iva") {
      setManualIvaAmount(val);
      setManualTotal(parseFloat((manualSubtotal + val).toFixed(2)));
    } else if (field === "total") {
      setManualTotal(val);
      // Assume basic 22% IVA included to pre-fill subtotal and IVA
      const sub = val / 1.22;
      const iva = val - sub;
      setManualSubtotal(parseFloat(sub.toFixed(2)));
      setManualIvaAmount(parseFloat(iva.toFixed(2)));
    }
  };

  // Submit bill registration
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim()) {
      setErrorMessage("Por favor ingrese el nombre del proveedor.");
      return;
    }
    if (!date) {
      setErrorMessage("Por favor seleccione la fecha de la boleta.");
      return;
    }

    const { subtotal, ivaAmount, total } = computedValues;
    if (total <= 0) {
      setErrorMessage("El total de la boleta debe ser mayor a 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const postData = {
      providerName,
      providerRut,
      documentType,
      documentNumber,
      date,
      currency,
      subtotal,
      ivaAmount,
      total,
      paymentMethod,
      depositoOrigen,
      notes,
      items: entryMode === "detailed" ? items.map(it => ({
        description: it.description || "Artículo sin descripción",
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        ivaRate: it.ivaRate
      })) : []
    };

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
        },
        body: JSON.stringify(postData)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Trigger parent state update
        onAddBill(data.bill);
        
        // Reset state
        setIsModalOpen(false);
        setProviderName("");
        setProviderRut("");
        setDocumentNumber("");
        setNotes("");
        setManualSubtotal(0);
        setManualIvaAmount(0);
        setManualTotal(0);
        const resetId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        setItems([{ id: resetId, description: "", quantity: 1, unitPrice: 0, totalPrice: 0, ivaRate: "22%" }]);
        setEntryMode("totals");
      } else {
        setErrorMessage(data.message || "Error al registrar la boleta.");
      }
    } catch (err: any) {
      setErrorMessage("Error de conexión al servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete bill action
  const handleDeleteAction = async (id: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar esta boleta? Esta operación no se puede deshacer.")) {
      await onDeleteBill(id);
      if (selectedBill?.id === id) {
        setSelectedBill(null);
      }
    }
  };

  // Filter bills list
  const filteredBills = useMemo(() => {
    return billsList.filter(bill => {
      // 1. Search term match
      let matchSearch = true;
      if (searchTerm.trim() !== "") {
        const normQ = normalizeText(searchTerm);
        const collapsedQ = normQ.replace(/\s+/g, "");

        const providerNameNorm = normalizeText(bill.providerName);
        const providerRutNorm = normalizeText(bill.providerRut || "");
        const documentNumberNorm = normalizeText(bill.documentNumber || "");
        const notesNorm = normalizeText(bill.notes || "");

        matchSearch = 
          providerNameNorm.includes(normQ) ||
          (collapsedQ.length >= 2 && providerNameNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
          providerRutNorm.includes(normQ) ||
          (collapsedQ.length >= 2 && providerRutNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
          documentNumberNorm.includes(normQ) ||
          (collapsedQ.length >= 2 && documentNumberNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
          notesNorm.includes(normQ) ||
          (bill.items || []).some(it => {
            const itDescNorm = normalizeText(it.description || "");
            return itDescNorm.includes(normQ) || (collapsedQ.length >= 2 && itDescNorm.replace(/\s+/g, "").includes(collapsedQ));
          });
      }

      if (!matchSearch) return false;

      // 2. Branch filter
      if (branchFilter !== "all" && bill.depositoOrigen !== branchFilter) return false;

      // 3. Document type filter
      if (typeFilter !== "all" && bill.documentType !== typeFilter) return false;

      // 4. Currency filter
      if (currencyFilter !== "all" && bill.currency !== currencyFilter) return false;

      // 5. Date filter
      if (dateFilterType === "this-month") {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const billDate = new Date(bill.date + "T12:00:00");
        if (billDate < firstDay) return false;
      } else if (dateFilterType === "last-month") {
        const today = new Date();
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const billDate = new Date(bill.date + "T12:00:00");
        if (billDate < firstDayLastMonth || billDate > lastDayLastMonth) return false;
      } else if (dateFilterType === "custom") {
        const billDate = new Date(bill.date + "T12:00:00");
        if (startDate) {
          const start = new Date(startDate + "T00:00:00");
          if (billDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + "T23:59:59");
          if (billDate > end) return false;
        }
      }

      return true;
    });
  }, [billsList, searchTerm, branchFilter, typeFilter, currencyFilter, dateFilterType, startDate, endDate]);

  // Compute quick total expense in UYU
  const totalsInUYU = useMemo(() => {
    return filteredBills.reduce((acc, bill) => {
      // Simplistic conversion: assume USD = 40 UYU if currency is USD
      const multiplier = bill.currency === "USD" ? 40 : 1;
      return acc + (bill.total * multiplier);
    }, 0);
  }, [filteredBills]);

  return (
    <div id="dashboard-bills-root" className="space-y-6">
      
      {/* HEADER WITH STATS AND ACTIONS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-zinc-100">Registro e Ingreso de Boletas de Proveedores</h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Lleva el control de todas las compras y gastos realizados a distribuidores o proveedores directos.
            Estos movimientos impactan el <strong>Resumen General de Finanzas</strong>.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Total Filtrado:</span>
            <span className="text-sm font-black font-mono text-indigo-400">
              $ {totalsInUYU.toLocaleString("es-UY", { minimumFractionDigits: 2 })} UYU
            </span>
          </div>

          <button
            onClick={() => {
              setScanSuccessMessage(null);
              setErrorMessage(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Plus className="h-4 w-4" />
            <span>Ingresar Nueva Boleta</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por Proveedor, RUT, nro. comprobante o artículos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
            
            {/* Branch Filter */}
            <div className="relative">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 appearance-none pr-8"
              >
                <option value="all">📍 Sucursal: Todas</option>
                <option value="Pinamar">Pinamar</option>
                <option value="Montevideo">Montevideo</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 h-3 w-3 text-zinc-500 pointer-events-none" />
            </div>

            {/* Document Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 appearance-none pr-8"
              >
                <option value="all">📄 Tipo: Todos</option>
                <option value="Boleta Contado">Boleta Contado</option>
                <option value="Factura">Factura</option>
                <option value="e-Ticket">e-Ticket</option>
                <option value="e-Factura">e-Factura</option>
                <option value="Otro">Otro Tipo</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 h-3 w-3 text-zinc-500 pointer-events-none" />
            </div>

            {/* Currency Filter */}
            <div className="relative">
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 appearance-none pr-8"
              >
                <option value="all">💵 Moneda: Todas</option>
                <option value="UYU">UYU ($)</option>
                <option value="USD">USD (US$)</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 h-3 w-3 text-zinc-500 pointer-events-none" />
            </div>

            {/* Date Quick Filter */}
            <div className="relative">
              <select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 appearance-none pr-8"
              >
                <option value="all">📅 Fecha: Histórico</option>
                <option value="this-month">Este Mes</option>
                <option value="last-month">Mes Anterior</option>
                <option value="custom">Rango Personalizado</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 h-3 w-3 text-zinc-500 pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Custom date range panel (shown if custom date is active) */}
        {dateFilterType === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-400">
            <span className="font-semibold">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            />
            <span className="font-semibold">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 hover:underline"
            >
              Limpiar Rango
            </button>
          </div>
        )}
      </div>

      {/* BILLS TABLE LIST */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-lg">
        {filteredBills.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3">
            <FileText className="h-10 w-10 text-zinc-700" />
            <h4 className="font-bold text-zinc-400">No se encontraron boletas</h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              Intente cambiar los filtros o el término de búsqueda, o registre una nueva boleta en el botón superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold tracking-wider">
                  <th className="p-3.5">Proveedor</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Comprobante</th>
                  <th className="p-3.5">Sucursal</th>
                  <th className="p-3.5">Forma Pago</th>
                  <th className="p-3.5 text-right">Subtotal</th>
                  <th className="p-3.5 text-right">IVA</th>
                  <th className="p-3.5 text-right">Total</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredBills.map(bill => (
                  <tr 
                    key={bill.id} 
                    className="hover:bg-zinc-900/50 transition-colors group"
                  >
                    <td className="p-3.5 font-semibold text-zinc-200">
                      <div>{bill.providerName}</div>
                      {bill.providerRut && (
                        <div className="text-[10px] font-mono text-zinc-500">RUT: {bill.providerRut}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-zinc-300 whitespace-nowrap">
                      {bill.date.split("-").reverse().join("/")}
                    </td>
                    <td className="p-3.5 text-zinc-400 whitespace-nowrap">
                      <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-300 font-mono">
                        {bill.documentType}
                      </span>
                      {bill.documentNumber && (
                        <span className="ml-1.5 text-[11px] text-zinc-400 font-mono font-bold">
                          Nro: {bill.documentNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-zinc-300 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        bill.depositoOrigen === "Montevideo" 
                          ? "bg-sky-500/10 text-sky-400" 
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        📍 {bill.depositoOrigen || "Pinamar"}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-400">
                      {bill.paymentMethod || "Contado"}
                    </td>
                    <td className="p-3.5 text-right text-zinc-400 font-mono">
                      {bill.currency === "USD" ? "US$" : "$"} {bill.subtotal.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right text-zinc-500 font-mono">
                      {bill.currency === "USD" ? "US$" : "$"} {bill.ivaAmount.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-black text-indigo-400 font-mono text-sm whitespace-nowrap">
                      {bill.currency === "USD" ? "US$" : "$"} {bill.total.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="text-xs text-zinc-400 hover:text-indigo-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          Ver Detalle
                        </button>
                        <button
                          onClick={() => handleDeleteAction(bill.id)}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer opacity-40 group-hover:opacity-100"
                          title="Eliminar Boleta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-zinc-200">Ingresar Boleta / Comprobante de Compra</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSubmitBill} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {scanSuccessMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>{scanSuccessMessage}</span>
                </div>
              )}

              {/* AI BILL SCANNER */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-200">¿Tienes una foto de la boleta?</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Sube una foto o tómala con la cámara de tu celular. El asistente inteligente de Gemini completará todos los datos automáticamente.
                  </p>
                </div>
                
                <div className="shrink-0 w-full md:w-auto">
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleScanClick}
                    className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white disabled:text-zinc-500 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-950/20"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Analizando boleta...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5" />
                        <span>Escanear Boleta con IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION 1: HEADER GENERALS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Provider Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Nombre del Proveedor *</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="providers-datalist"
                      placeholder="Ej: Kaluga, Casa Jorge"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                    />
                    <datalist id="providers-datalist">
                      {providerPresets.map(p => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* RUT */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">RUT de Proveedor (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: 218809240012"
                    value={providerRut}
                    onChange={(e) => setProviderRut(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Comprobante Type */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tipo Comprobante</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Boleta Contado">Boleta Contado</option>
                    <option value="Factura">Factura</option>
                    <option value="e-Ticket">e-Ticket</option>
                    <option value="e-Factura">e-Factura</option>
                    <option value="Otro">Otro / Recibo</option>
                  </select>
                </div>

                {/* Comprobante Number */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Serie y Número Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej: A-41812 o 263798"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Fecha de Compra / Emisión *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="UYU">Pesos Uruguayos (UYU - $)</option>
                    <option value="USD">Dólares Americanos (USD - US$)</option>
                  </select>
                </div>

                {/* Branch / Depósito Destino */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Sucursal / Depósito Destino</label>
                  <select
                    value={depositoOrigen}
                    onChange={(e) => setDepositoOrigen(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pinamar">Pinamar</option>
                    <option value="Montevideo">Montevideo</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Forma de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                {/* Notes/Adenda */}
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Adenda / Notas</label>
                  <input
                    type="text"
                    placeholder="Ej: Cambio de talles de gorros"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

              </div>

              {/* MODE SELECTOR */}
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-400" />
                  ¿Cómo quieres registrar esta compra?
                </span>
                
                <div className="flex bg-zinc-950 p-1 rounded-md border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEntryMode("totals")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-sm cursor-pointer transition-all ${
                      entryMode === "totals" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Solo Totales
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("detailed")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-sm cursor-pointer transition-all ${
                      entryMode === "detailed" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Detalle de Artículos
                  </button>
                </div>
              </div>

              {/* DETAILED ITEMS MODE FORM */}
              {entryMode === "detailed" ? (
                <div className="space-y-4">
                  {/* INFORMATIVE USER MANUAL / CALLOUT BANNER */}
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-2 animate-fade-in shadow-inner">
                    <div className="flex items-center gap-2 text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                      <span>💡 Guía rápida para registrar artículos:</span>
                    </div>
                    <ul className="text-[11px] text-zinc-300 space-y-1 pl-1 list-disc list-inside leading-relaxed">
                      <li>Para agregar otro artículo, haz click en el botón brillante <strong className="text-amber-400">➕ Agregar Artículo a la Boleta</strong>.</li>
                      <li>El nuevo casillero vacío <strong className="text-emerald-400 font-bold">SIEMPRE se agregará arriba del todo (al inicio)</strong> para que no tengas que desplazarte hacia abajo.</li>
                      <li>Escribe la descripción, la cantidad y el precio unitario final con IVA incluido. ¡Los cálculos se hacen automáticamente!</li>
                    </ul>
                  </div>

                  {/* CONTROLS HEADER WITH PROMINENT BUTTON */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-300">
                        Lista de Artículos de la Boleta ({items.length})
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-zinc-950 font-black text-xs uppercase px-5 py-2.5 rounded-lg transition-all shadow-md shadow-amber-500/10 cursor-pointer border border-amber-400/20"
                    >
                      <PlusCircle className="h-4 w-4 text-zinc-950 stroke-[3]" />
                      <span>Agregar Artículo a la Boleta</span>
                    </button>
                  </div>

                  {/* SCROLLABLE ITEMS LIST */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {items.map((it, idx) => (
                      <div 
                        key={it.id || idx}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl border items-end relative transition-all duration-300 ${
                          idx === 0 
                            ? "bg-zinc-900/90 border-emerald-500/60 ring-2 ring-emerald-500/10 shadow-lg shadow-emerald-950/20" 
                            : "bg-zinc-900 border-zinc-850 hover:border-zinc-800"
                        }`}
                      >
                        {/* Description */}
                        <div className="md:col-span-5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Detalle / Artículo *</label>
                            {idx === 0 && (
                              <span className="text-[8px] bg-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">
                                ✍️ NUEVA FILA (Escribe aquí)
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Ej: Abrigo buzo conjunto niño"
                            value={it.description}
                            onChange={(e) => handleUpdateItemRow(idx, "description", e.target.value)}
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItemRow(idx, "quantity", e.target.value)}
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center font-bold font-mono"
                          />
                        </div>

                        {/* Unit Price (with IVA) */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">P. Unit. IVA incl. *</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            value={it.unitPrice || ""}
                            onChange={(e) => handleUpdateItemRow(idx, "unitPrice", e.target.value)}
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-right font-bold font-mono"
                          />
                        </div>

                        {/* IVA rate */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Tasa IVA</label>
                          <select
                            value={it.ivaRate}
                            onChange={(e) => handleUpdateItemRow(idx, "ivaRate", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="22%">Básica (22%)</option>
                            <option value="10%">Mínima (10%)</option>
                            <option value="No Gravado">Exento / No Gravado</option>
                          </select>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex justify-center pb-0.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={items.length === 1}
                            className={`p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ${
                              items.length === 1 ? "opacity-30 pointer-events-none" : "cursor-pointer"
                            }`}
                            title="Eliminar este artículo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                
                /* SOLO TOTALES ENTRY MODE */
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-3">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 block mb-2">
                    Ingresar Totales Directamente (Consolidado de Boleta)
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Manual Total */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">Total de la Boleta (IVA Incluido) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">{currency === "USD" ? "US$" : "$"}</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={manualTotal || ""}
                          onChange={(e) => handleManualTotalsChange("total", Number(e.target.value))}
                          required
                          className="w-full bg-zinc-950 border border-indigo-600 text-zinc-100 font-bold font-mono text-xs rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <span className="text-[9px] text-zinc-500 block">
                        Al ingresar el total, estimaremos el IVA (22%) automáticamente. Puedes corregirlos al lado.
                      </span>
                    </div>

                    {/* Manual Subtotal */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Subtotal (Sin Impuestos)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">{currency === "USD" ? "US$" : "$"}</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={manualSubtotal || ""}
                          onChange={(e) => handleManualTotalsChange("subtotal", Number(e.target.value))}
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Manual IVA Amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Importe de IVA total</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">{currency === "USD" ? "US$" : "$"}</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={manualIvaAmount || ""}
                          onChange={(e) => handleManualTotalsChange("iva", Number(e.target.value))}
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* MATH SUMMARY BOX */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                  <span>Resumen de Cálculos (Calculado automáticamente sobre {entryMode === "detailed" ? "artículos" : "totales manuales"})</span>
                </div>

                <div className="flex items-center gap-6 self-end font-mono">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Subtotal</div>
                    <div className="text-xs font-bold text-zinc-300">
                      {currency === "USD" ? "US$" : "$"} {computedValues.subtotal.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">IVA total</div>
                    <div className="text-xs font-bold text-zinc-300">
                      {currency === "USD" ? "US$" : "$"} {computedValues.ivaAmount.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="text-right border-l border-zinc-800 pl-6">
                    <div className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold">Total Facturado</div>
                    <div className="text-base font-black text-indigo-400">
                      {currency === "USD" ? "US$" : "$"} {computedValues.total.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="border-t border-zinc-850 pt-4 flex items-center justify-end gap-3 bg-zinc-950">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? "Registrando..." : "Confirmar e Ingresar"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* VIEW DETAILED BILL MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-black text-zinc-200 uppercase tracking-widest font-mono">Detalle del Comprobante</span>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt container (styled like a real ticket) */}
            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
              
              <div className="border border-dashed border-zinc-800 p-5 rounded-lg bg-zinc-900/20 space-y-4">
                
                {/* Provider Logo / Text */}
                <div className="text-center space-y-1 pb-4 border-b border-zinc-800 border-dashed">
                  <h3 className="text-base font-black uppercase text-zinc-100 tracking-widest font-mono">
                    {selectedBill.providerName}
                  </h3>
                  {selectedBill.providerRut && (
                    <div className="text-[10px] font-mono text-zinc-500">RUT Proveedor: {selectedBill.providerRut}</div>
                  )}
                  <div className="text-[11px] text-zinc-400">
                    Uruguay • Almacén: <strong className="text-indigo-400">{selectedBill.depositoOrigen || "Pinamar"}</strong>
                  </div>
                </div>

                {/* Comprobante details */}
                <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400 font-mono pb-4 border-b border-dashed border-zinc-800">
                  <div>
                    <span className="text-zinc-500 uppercase block text-[9px] font-bold">Documento</span>
                    <span className="text-zinc-200 font-bold">{selectedBill.documentType}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase block text-[9px] font-bold">Comprobante Nro</span>
                    <span className="text-zinc-200 font-bold">{selectedBill.documentNumber || "S/N"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase block text-[9px] font-bold">Fecha de Emisión</span>
                    <span className="text-zinc-200">{selectedBill.date.split("-").reverse().join("/")}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase block text-[9px] font-bold">Forma de Pago</span>
                    <span className="text-zinc-200">{selectedBill.paymentMethod || "Contado"}</span>
                  </div>
                </div>

                {/* Items List inside ticket */}
                <div className="space-y-2 pb-4 border-b border-dashed border-zinc-800">
                  <span className="text-[9px] font-bold uppercase text-zinc-500 block tracking-wider">Artículos detallados:</span>
                  
                  {(!selectedBill.items || selectedBill.items.length === 0) ? (
                    <div className="text-zinc-400 text-xs italic font-mono p-2 bg-zinc-900/40 rounded border border-zinc-850">
                      * Registro simplificado sin artículos individuales *
                      <div className="text-[10px] text-zinc-500 mt-1">Consolidado por un importe total de {selectedBill.currency === "USD" ? "US$" : "$"} {selectedBill.total.toLocaleString("es-UY")}</div>
                    </div>
                  ) : (
                    <div className="space-y-3 font-mono text-[11px]">
                      {selectedBill.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="max-w-[70%] text-zinc-300">
                            <div>{it.description}</div>
                            <div className="text-[9px] text-zinc-500">
                              {it.quantity} x {selectedBill.currency === "USD" ? "US$" : "$"} {it.unitPrice.toLocaleString("es-UY", { minimumFractionDigits: 2 })} (IVA: {it.ivaRate || "22%"})
                            </div>
                          </div>
                          <div className="text-right text-zinc-200 font-bold">
                            {selectedBill.currency === "USD" ? "US$" : "$"} {it.totalPrice.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ticket Totals breakdown */}
                <div className="space-y-1.5 font-mono text-[11px] text-zinc-400 text-right">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">SUBTOTAL</span>
                    <span className="text-zinc-300">{selectedBill.currency === "USD" ? "US$" : "$"} {selectedBill.subtotal.toLocaleString("es-UY", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">IMPUESTO IVA</span>
                    <span className="text-zinc-300">{selectedBill.currency === "USD" ? "US$" : "$"} {selectedBill.ivaAmount.toLocaleString("es-UY", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-zinc-800 pt-2 text-sm text-indigo-400 font-black">
                    <span className="font-extrabold uppercase text-xs">TOTAL A PAGAR</span>
                    <span>{selectedBill.currency === "USD" ? "US$" : "$"} {selectedBill.total.toLocaleString("es-UY", { minimumFractionDigits: 2 })} {selectedBill.currency}</span>
                  </div>
                </div>

                {/* Adenda */}
                {selectedBill.notes && (
                  <div className="bg-zinc-900/50 p-2.5 rounded border border-dashed border-zinc-800 text-[10px] font-mono text-zinc-400">
                    <span className="font-bold uppercase text-zinc-500 block text-[8px] tracking-widest mb-0.5">ADENDA / NOTAS</span>
                    {selectedBill.notes}
                  </div>
                )}

              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => handleDeleteAction(selectedBill.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar Registro</span>
                </button>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
