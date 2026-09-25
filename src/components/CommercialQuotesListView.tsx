import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  Copy,
  ShoppingCart,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  XCircle
} from "lucide-react";
import {
  CommercialQuote3D,
  CommercialQuoteStatus,
  CompanyQuoteSettings
} from "../types";
import { downloadQuotePdf, DEFAULT_COMPANY_SETTINGS } from "../utils/generateQuotePdf";

interface CommercialQuotesListViewProps {
  onOpenModal: (quote?: CommercialQuote3D | null) => void;
  onOpenCompanySettings: () => void;
  companySettings?: CompanyQuoteSettings;
  authToken?: string;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  refreshTrigger?: number;
}

export const CommercialQuotesListView: React.FC<CommercialQuotesListViewProps> = ({
  onOpenModal,
  onOpenCompanySettings,
  companySettings = DEFAULT_COMPANY_SETTINGS,
  authToken,
  showToast,
  refreshTrigger = 0
}) => {
  const [quotes, setQuotes] = useState<CommercialQuote3D[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter && statusFilter !== "todos") params.append("status", statusFilter);

      const res = await fetch(`/api/3d/commercial-quotes?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.quotes)) {
        setQuotes(data.quotes);
      }
    } catch (err: any) {
      console.error("Error fetching commercial quotes:", err);
      showToast("Error al cargar cotizaciones", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [search, statusFilter, refreshTrigger]);

  // Quick status change
  const handleStatusChange = async (id: string, newStatus: CommercialQuoteStatus) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/3d/commercial-quotes/${id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Estado cambiado a ${newStatus}`, "success");
        setQuotes((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
        );
      } else {
        showToast(data.message || "Error al actualizar estado", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error de conexión", "error");
    }
  };

  // Duplicate quote
  const handleDuplicate = async (id: string) => {
    try {
      setActionLoadingId(id);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/3d/commercial-quotes/${id}/duplicate`, {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (data.success && data.quote) {
        showToast(data.message || "Cotización duplicada con éxito", "success");
        fetchQuotes();
      } else {
        showToast(data.message || "Error al duplicar", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al duplicar", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Convert to order
  const handleConvertToOrder = async (id: string, quoteNumber: string) => {
    const confirmConvert = window.confirm(
      `¿Deseas convertir la cotización ${quoteNumber} en un pedido oficial dentro del sistema?\n\nSe mantendrán todos los productos, cantidades, precios y datos del cliente.`
    );
    if (!confirmConvert) return;

    try {
      setActionLoadingId(id);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/3d/commercial-quotes/${id}/convert-to-order`, {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "¡Cotización convertida en pedido con éxito!", "success");
        fetchQuotes();
      } else {
        showToast(data.message || "Error al convertir en pedido", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al procesar la conversión", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (quoteSummary: CommercialQuote3D) => {
    try {
      setActionLoadingId(quoteSummary.id);
      // Fetch full quote with items
      const res = await fetch(`/api/3d/commercial-quotes/${quoteSummary.id}`);
      const data = await res.json();
      if (data.success && data.quote) {
        downloadQuotePdf(data.quote, companySettings);
        showToast(`Descargando PDF ${data.quote.quoteNumber}...`, "info");
      } else {
        // Fallback with summary
        downloadQuotePdf(quoteSummary, companySettings);
      }
    } catch (err: any) {
      console.error("Error downloading PDF:", err);
      showToast("Error al descargar PDF", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open full view/edit
  const handleOpenEdit = async (quoteSummary: CommercialQuote3D) => {
    try {
      setActionLoadingId(quoteSummary.id);
      const res = await fetch(`/api/3d/commercial-quotes/${quoteSummary.id}`);
      const data = await res.json();
      if (data.success && data.quote) {
        onOpenModal(data.quote);
      } else {
        onOpenModal(quoteSummary);
      }
    } catch (err) {
      onOpenModal(quoteSummary);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete quote
  const handleDelete = async (id: string, quoteNumber: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente la cotización ${quoteNumber}?`)) return;

    try {
      setActionLoadingId(id);
      const headers: Record<string, string> = {};
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/3d/commercial-quotes/${id}`, {
        method: "DELETE",
        headers
      });
      const data = await res.json();
      if (data.success) {
        showToast("Cotización eliminada con éxito", "success");
        setQuotes((prev) => prev.filter((q) => q.id !== id));
      } else {
        showToast(data.message || "Error al eliminar", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error de conexión", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats
  const totalCotizado = quotes.reduce((acc, q) => acc + (Number(q.totalAmount) || 0), 0);
  const aprobadasCount = quotes.filter((q) => q.status === "aprobada" || q.status === "convertida").length;

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIOR CON ACCIONES & AJUSTES */}
      <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-5 shadow-lg flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-[#A0AEC0]" />
            <input
              type="text"
              placeholder="Buscar por N°, cliente, tel, Pieza / Descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "todos", label: "Todas" },
              { id: "borrador", label: "Borrador" },
              { id: "enviada", label: "Enviadas" },
              { id: "aprobada", label: "Aprobadas" },
              { id: "rechazada", label: "Rechazadas" },
              { id: "convertida", label: "Pedidos" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-[#D4A55A] text-[#050B1A] shadow"
                    : "bg-[#050B1A] text-[#C5B499] border border-[#D4A55A]/20 hover:text-[#F4EAD7]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCompanySettings}
            className="px-3.5 py-2.5 rounded-xl bg-[#050B1A] hover:bg-[#D4A55A]/15 text-[#E6BF76] border border-[#D4A55A]/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            title="Configurar Logo, Teléfono y Datos de JUEM en el PDF"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Datos de JUEM</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal(null)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A55A] via-[#E6BF76] to-[#D4A55A] text-[#050B1A] font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_15px_rgba(212,165,90,0.3)] hover:brightness-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Cotización PDF</span>
          </button>
        </div>

      </div>

      {/* METRICS SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0B1730] p-4 rounded-2xl border border-[#D4A55A]/25 shadow">
          <span className="text-[10px] uppercase font-bold text-[#A0AEC0] block">Cotizaciones Totales</span>
          <span className="text-xl font-serif font-bold text-[#F4EAD7]">{quotes.length}</span>
        </div>
        <div className="bg-[#0B1730] p-4 rounded-2xl border border-emerald-500/25 shadow">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Aprobadas / Pedidos</span>
          <span className="text-xl font-serif font-bold text-emerald-400">{aprobadasCount}</span>
        </div>
        <div className="bg-[#0B1730] p-4 rounded-2xl border border-[#D4A55A]/25 shadow">
          <span className="text-[10px] uppercase font-bold text-[#A0AEC0] block">Monto Cotizado Activo</span>
          <span className="text-xl font-serif font-bold text-[#E6BF76]">${totalCotizado.toLocaleString("es-UY")} UYU</span>
        </div>
        <div className="bg-[#0B1730] p-4 rounded-2xl border border-[#D4A55A]/25 shadow">
          <span className="text-[10px] uppercase font-bold text-[#A0AEC0] block">Tasa de Aprobación</span>
          <span className="text-xl font-serif font-bold text-[#F4EAD7]">
            {quotes.length > 0 ? Math.round((aprobadasCount / quotes.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE COTIZACIONES */}
      <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050B1A] border-b border-[#D4A55A]/25 text-[11px] font-serif font-bold text-[#E6BF76] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">N° Cotización</th>
                <th className="py-3.5 px-4">Fecha / Vencimiento</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-3 text-center">Piezas</th>
                <th className="py-3.5 px-4 text-right">Total ($ UYU)</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A55A]/10 text-[#F4EAD7]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A0AEC0]">
                    Cargando cotizaciones comerciales...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A0AEC0]">
                    No se encontraron cotizaciones con los filtros actuales.
                    <br />
                    <button
                      type="button"
                      onClick={() => onOpenModal(null)}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#D4A55A]/20 hover:bg-[#D4A55A] hover:text-[#050B1A] text-[#E6BF76] text-xs font-bold transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Crear primera cotización</span>
                    </button>
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  const isActionBusy = actionLoadingId === q.id;
                  const dateStr = q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-UY") : "-";
                  const validUntilStr = q.validUntil ? new Date(q.validUntil).toLocaleDateString("es-UY") : "-";

                  return (
                    <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* N° COTIZACIÓN */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#D4A55A]" />
                          <span className="font-mono font-bold text-sm text-[#E6BF76]">
                            {q.quoteNumber}
                          </span>
                        </div>
                      </td>

                      {/* FECHA */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-[#F4EAD7]">{dateStr}</div>
                        <div className="text-[10px] text-[#A0AEC0]">Vence: {validUntilStr}</div>
                      </td>

                      {/* CLIENTE */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-xs text-[#F4EAD7]">
                          {q.customerName}
                        </div>
                        {(q.customerPhone || q.customerEmail) && (
                          <div className="text-[10px] text-[#A0AEC0]">
                            {q.customerPhone || q.customerEmail}
                          </div>
                        )}
                      </td>

                      {/* PIEZAS */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-[#050B1A] border border-[#D4A55A]/30 text-xs font-mono font-bold text-[#E6BF76]">
                          {q.itemCount || 1} {q.itemCount === 1 ? "ítem" : "ítems"}
                        </span>
                      </td>

                      {/* TOTAL */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-[#E6BF76]">
                        ${Number(q.totalAmount || 0).toLocaleString("es-UY")}
                      </td>

                      {/* ESTADO CON DROPDOWN */}
                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={q.status}
                          disabled={isActionBusy}
                          onChange={(e) => handleStatusChange(q.id, e.target.value as CommercialQuoteStatus)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border focus:outline-none cursor-pointer ${
                            q.status === "aprobada"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : q.status === "convertida"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : q.status === "enviada"
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                              : q.status === "rechazada"
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                              : q.status === "vencida"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-slate-500/20 text-slate-300 border-slate-500/40"
                          }`}
                        >
                          <option value="borrador" className="bg-[#050B1A] text-slate-200">Borrador</option>
                          <option value="enviada" className="bg-[#050B1A] text-sky-200">Enviada</option>
                          <option value="aprobada" className="bg-[#050B1A] text-emerald-200">Aprobada</option>
                          <option value="rechazada" className="bg-[#050B1A] text-rose-200">Rechazada</option>
                          <option value="vencida" className="bg-[#050B1A] text-amber-200">Vencida</option>
                          <option value="convertida" className="bg-[#050B1A] text-purple-200">Convertida en Pedido</option>
                        </select>
                      </td>

                      {/* ACCIONES */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Descargar PDF */}
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleDownloadPdf(q)}
                            title="Descargar PDF comercial"
                            className="p-1.5 rounded-lg bg-[#050B1A] text-[#E6BF76] hover:bg-[#D4A55A] hover:text-[#050B1A] transition-colors cursor-pointer border border-[#D4A55A]/30"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {/* Ver / Editar */}
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleOpenEdit(q)}
                            title="Ver / Editar cotización"
                            className="p-1.5 rounded-lg bg-[#050B1A] text-[#F4EAD7] hover:bg-[#D4A55A]/20 transition-colors cursor-pointer border border-[#D4A55A]/30"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Duplicar cotización */}
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleDuplicate(q.id)}
                            title="Duplicar cotización (genera nuevo número correlativo)"
                            className="p-1.5 rounded-lg bg-[#050B1A] text-sky-400 hover:bg-sky-500/20 transition-colors cursor-pointer border border-sky-500/30"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Convertir en pedido */}
                          {q.status !== "convertida" && (
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleConvertToOrder(q.id, q.quoteNumber)}
                              title="Convertir en Pedido oficial en el sistema"
                              className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer border border-emerald-500/40"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Eliminar */}
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleDelete(q.id, q.quoteNumber)}
                            title="Eliminar cotización"
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
