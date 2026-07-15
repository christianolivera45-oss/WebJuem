import React, { useState, useMemo } from "react";
import { ShopState, Order, Bill } from "../types";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  MapPin, 
  Filter, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight, 
  Store, 
  Briefcase, 
  Percent, 
  Scale,
  RefreshCw,
  Search,
  ShoppingCart,
  Receipt
} from "lucide-react";

interface DashboardResumenGeneralProps {
  store: ShopState;
}

export const DashboardResumenGeneral: React.FC<DashboardResumenGeneralProps> = ({ store }) => {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<"all" | "this-month" | "last-month" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerType, setLedgerType] = useState<"all" | "income" | "expense">("all");

  const orders: Order[] = useMemo(() => store.orders || [], [store.orders]);
  const bills: Bill[] = useMemo(() => store.bills || [], [store.bills]);

  // Unified filter helper for both orders and bills
  const filteredData = useMemo(() => {
    // 1. Filter Approved Sales (Only approved status counts as actual income)
    const approvedOrders = orders.filter(o => o.status === "pago_aprobado").filter(o => {
      // Branch filter
      if (branchFilter !== "all" && (o.depositoOrigen || "Pinamar") !== branchFilter) return false;

      // Date filter
      const oDate = new Date(o.createdAt);
      if (dateFilterType === "this-month") {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        if (oDate < firstDay) return false;
      } else if (dateFilterType === "last-month") {
        const today = new Date();
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        if (oDate < firstDayLastMonth || oDate > lastDayLastMonth) return false;
      } else if (dateFilterType === "custom") {
        if (startDate) {
          const start = new Date(startDate + "T00:00:00");
          if (oDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + "T23:59:59");
          if (oDate > end) return false;
        }
      }
      return true;
    });

    // 2. Filter Bills
    const filteredBills = bills.filter(b => {
      // Branch filter
      if (branchFilter !== "all" && (b.depositoOrigen || "Pinamar") !== branchFilter) return false;

      // Date filter
      const bDate = new Date(b.date + "T12:00:00");
      if (dateFilterType === "this-month") {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        if (bDate < firstDay) return false;
      } else if (dateFilterType === "last-month") {
        const today = new Date();
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        if (bDate < firstDayLastMonth || bDate > lastDayLastMonth) return false;
      } else if (dateFilterType === "custom") {
        if (startDate) {
          const start = new Date(startDate + "T00:00:00");
          if (bDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + "T23:59:59");
          if (bDate > end) return false;
        }
      }
      return true;
    });

    return { approvedOrders, filteredBills };
  }, [orders, bills, branchFilter, dateFilterType, startDate, endDate]);

  // Financial calculations
  // Note: All values are summarized in UYU. USD totals are multiplied by 40 UYU for conversion consistency.
  const financials = useMemo(() => {
    const { approvedOrders, filteredBills } = filteredData;

    let incomeUYU = 0;
    let incomeUSD = 0;

    let expenseUYU = 0;
    let expenseUSD = 0;

    approvedOrders.forEach(o => {
      // Net product price sold = subtotal - discountAmount
      const netVal = o.subtotal - o.discountAmount;
      
      // PaymentMethod check or currency - Orders on this web are typically in UYU. Let's assume UYU.
      incomeUYU += netVal;
    });

    filteredBills.forEach(b => {
      if (b.currency === "USD") {
        expenseUSD += b.total;
        expenseUYU += (b.total * 40); // Standard approx UYU exchange
      } else {
        expenseUYU += b.total;
      }
    });

    const netProfitUYU = incomeUYU - expenseUYU;
    
    // Calculate margin percent: Net Profit / Revenues
    const profitMargin = incomeUYU > 0 ? (netProfitUYU / incomeUYU) * 100 : 0;

    return {
      incomeUYU,
      expenseUYU,
      expenseUSD,
      netProfitUYU,
      profitMargin
    };
  }, [filteredData]);

  // Create chronological unified ledger list for the timeline
  const chronologicalLedger = useMemo(() => {
    const { approvedOrders, filteredBills } = filteredData;

    const list: Array<{
      id: string;
      date: string;
      rawDate: string;
      type: "income" | "expense";
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
      amountUYU: number;
      branch: string;
      paymentMethod: string;
      reference?: string;
    }> = [];

    // Add Income
    approvedOrders.forEach(o => {
      const netAmount = o.subtotal - o.discountAmount;
      list.push({
        id: o.id,
        date: o.createdAt.split("T")[0],
        rawDate: o.createdAt,
        type: "income",
        title: `Venta Web / Canal: ${o.canal || "Web"}`,
        subtitle: `Cliente: ${o.customerName}`,
        amount: netAmount,
        currency: "UYU",
        amountUYU: netAmount,
        branch: o.depositoOrigen || "Pinamar",
        paymentMethod: o.paymentMethod || "Web",
        reference: o.id.substring(0, 8)
      });
    });

    // Add Expenses (Bills)
    filteredBills.forEach(b => {
      list.push({
        id: b.id,
        date: b.date,
        rawDate: b.date + "T12:00:00",
        type: "expense",
        title: `Compra Proveedor: ${b.providerName}`,
        subtitle: `${b.documentType} ${b.documentNumber ? `Nro: ${b.documentNumber}` : ""}`,
        amount: b.total,
        currency: b.currency,
        amountUYU: b.currency === "USD" ? (b.total * 40) : b.total,
        branch: b.depositoOrigen || "Pinamar",
        paymentMethod: b.paymentMethod || "Contado",
        reference: b.documentNumber || "S/N"
      });
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    // Apply search filter and ledger type filter
    return list.filter(item => {
      if (ledgerType !== "all" && item.type !== ledgerType) return false;

      if (ledgerSearch.trim() !== "") {
        const query = ledgerSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query) ||
          item.branch.toLowerCase().includes(query) ||
          (item.reference || "").toLowerCase().includes(query)
        );
      }
      return true;
    });

  }, [filteredData, ledgerSearch, ledgerType]);

  // Branch breakdowns
  const branchBreakdown = useMemo(() => {
    const pinamarOrders = orders.filter(o => o.status === "pago_aprobado" && (o.depositoOrigen || "Pinamar") === "Pinamar");
    const montevideoOrders = orders.filter(o => o.status === "pago_aprobado" && o.depositoOrigen === "Montevideo");

    const pinamarBills = bills.filter(b => (b.depositoOrigen || "Pinamar") === "Pinamar");
    const montevideoBills = bills.filter(b => b.depositoOrigen === "Montevideo");

    const pinamarIncome = pinamarOrders.reduce((acc, o) => acc + (o.subtotal - o.discountAmount), 0);
    const montevideoIncome = montevideoOrders.reduce((acc, o) => acc + (o.subtotal - o.discountAmount), 0);

    const pinamarExpense = pinamarBills.reduce((acc, b) => acc + (b.currency === "USD" ? b.total * 40 : b.total), 0);
    const montevideoExpense = montevideoBills.reduce((acc, b) => acc + (b.currency === "USD" ? b.total * 40 : b.total), 0);

    return {
      pinamar: {
        income: pinamarIncome,
        expense: pinamarExpense,
        balance: pinamarIncome - pinamarExpense
      },
      montevideo: {
        income: montevideoIncome,
        expense: montevideoExpense,
        balance: montevideoIncome - montevideoExpense
      }
    };
  }, [orders, bills]);

  return (
    <div id="dashboard-general-finances-root" className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">Resumen General Financiero</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Consolidado general de ingresos (ventas aprobadas) y gastos (boletas ingresadas de proveedores).
          </p>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Select */}
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer"
            >
              <option value="all">📍 Sucursal: Todas</option>
              <option value="Pinamar">Pinamar</option>
              <option value="Montevideo">Montevideo</option>
            </select>
          </div>

          {/* Date Select */}
          <div className="relative">
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer"
            >
              <option value="all">📅 Período: Histórico</option>
              <option value="this-month">Este Mes</option>
              <option value="last-month">Mes Anterior</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date Range Inputs if Custom is selected */}
      {dateFilterType === "custom" && (
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3 text-xs text-zinc-300">
          <span>Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none"
          />
          <span>Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none"
          />
        </div>
      )}

      {/* MAIN FINANCIAL SCOREBOARD (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* REVENUES (INCOME) */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ingresos Facturados</div>
            <div className="text-xl font-black text-emerald-400 font-mono">
              $ {financials.incomeUYU.toLocaleString("es-UY", { minimumFractionDigits: 2 })} <span className="text-xs text-zinc-500 font-normal">UYU</span>
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Ventas web y presenciales aprobadas
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* EXPENSES */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Egresos por Boletas</div>
            <div className="text-xl font-black text-rose-400 font-mono">
              $ {financials.expenseUYU.toLocaleString("es-UY", { minimumFractionDigits: 2 })} <span className="text-xs text-zinc-500 font-normal">UYU</span>
            </div>
            {financials.expenseUSD > 0 && (
              <div className="text-[10px] text-zinc-500 font-mono font-semibold">
                (US$ {financials.expenseUSD.toLocaleString("es-UY")} USD incluidos)
              </div>
            )}
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400"></span>
              Compras a proveedores registradas
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* NET PROFIT (BALANCE) */}
        <div className={`bg-zinc-950 p-5 rounded-2xl border shadow-md flex items-center justify-between ${
          financials.netProfitUYU >= 0 ? "border-zinc-850" : "border-rose-500/30"
        }`}>
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Balance de Caja Neto</div>
            <div className={`text-xl font-black font-mono ${
              financials.netProfitUYU >= 0 ? "text-indigo-400" : "text-rose-400"
            }`}>
              $ {financials.netProfitUYU.toLocaleString("es-UY", { minimumFractionDigits: 2 })} <span className="text-xs text-zinc-500 font-normal">UYU</span>
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                financials.netProfitUYU >= 0 ? "bg-indigo-400" : "bg-rose-400"
              }`}></span>
              Margen de Utilidad Consolidado
            </div>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            financials.netProfitUYU >= 0 ? "bg-indigo-500/10 text-indigo-400" : "bg-rose-500/10 text-rose-400"
          }`}>
            <Scale className="h-5 w-5" />
          </div>
        </div>

        {/* PROFIT MARGIN % */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Rentabilidad Comercial</div>
            <div className={`text-xl font-black font-mono ${
              financials.profitMargin >= 30 ? "text-emerald-400" : (financials.profitMargin > 0 ? "text-indigo-400" : "text-rose-400")
            }`}>
              {financials.profitMargin.toFixed(1)} %
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
              Relación Ingresos vs Gastos
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-indigo-400">
            <Percent className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* SUCURSALES SPREAD (BENTO GRID - PINAMAR vs MONTEVIDEO BALANCE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pinamar Stats */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-900">
            <Store className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-zinc-200">Rendimiento Sucursal Pinamar</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/55">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Ingresos</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                $ {branchBreakdown.pinamar.income.toLocaleString("es-UY")}
              </span>
            </div>
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/55">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Egresos</span>
              <span className="text-xs font-bold text-rose-400 font-mono">
                $ {branchBreakdown.pinamar.expense.toLocaleString("es-UY")}
              </span>
            </div>
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/55">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Saldo</span>
              <span className={`text-xs font-black font-mono ${
                branchBreakdown.pinamar.balance >= 0 ? "text-indigo-400" : "text-rose-400"
              }`}>
                $ {branchBreakdown.pinamar.balance.toLocaleString("es-UY")}
              </span>
            </div>
          </div>

          {/* Simple dynamic bar chart */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Utilidad / Relación de caja</span>
              <span>{branchBreakdown.pinamar.income > 0 ? ((branchBreakdown.pinamar.balance / branchBreakdown.pinamar.income) * 100).toFixed(0) : 0}% neto</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, branchBreakdown.pinamar.income > 0 
                    ? (branchBreakdown.pinamar.balance / branchBreakdown.pinamar.income) * 100 
                    : 0))}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Montevideo Stats */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-900">
            <Store className="h-4 w-4 text-sky-400" />
            <h3 className="font-bold text-sm text-zinc-200">Rendimiento Sucursal Montevideo</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/55">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Ingresos</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                $ {branchBreakdown.montevideo.income.toLocaleString("es-UY")}
              </span>
            </div>
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/55">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Egresos</span>
              <span className="text-xs font-bold text-rose-400 font-mono">
                $ {branchBreakdown.montevideo.expense.toLocaleString("es-UY")}
              </span>
            </div>
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/55">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Saldo</span>
              <span className={`text-xs font-black font-mono ${
                branchBreakdown.montevideo.balance >= 0 ? "text-indigo-400" : "text-rose-400"
              }`}>
                $ {branchBreakdown.montevideo.balance.toLocaleString("es-UY")}
              </span>
            </div>
          </div>

          {/* Simple dynamic bar chart */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Utilidad / Relación de caja</span>
              <span>{branchBreakdown.montevideo.income > 0 ? ((branchBreakdown.montevideo.balance / branchBreakdown.montevideo.income) * 100).toFixed(0) : 0}% neto</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-sky-500 h-full rounded-full" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, branchBreakdown.montevideo.income > 0 
                    ? (branchBreakdown.montevideo.balance / branchBreakdown.montevideo.income) * 100 
                    : 0))}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* TIMELINE LEDGER (COMBINED BOOKKEEPING RECORDS) */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-lg">
        
        {/* Ledger Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-zinc-400" />
            <h3 className="font-bold text-sm text-zinc-200">Libro Diario General Coincidente</h3>
          </div>

          {/* Ledger filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar en libro diario..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-500 text-[11px] rounded px-3 py-1.5 pl-8 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Type selector */}
            <div className="flex bg-zinc-950 rounded border border-zinc-800 p-0.5">
              <button
                onClick={() => setLedgerType("all")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm ${
                  ledgerType === "all" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setLedgerType("income")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm ${
                  ledgerType === "income" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Ventas
              </button>
              <button
                onClick={() => setLedgerType("expense")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm ${
                  ledgerType === "expense" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Gastos
              </button>
            </div>
          </div>
        </div>

        {/* Ledger list */}
        {chronologicalLedger.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <FileText className="h-8 w-8 text-zinc-700 mx-auto" />
            <h4 className="font-bold text-zinc-400 text-xs">Sin registros financieros</h4>
            <p className="text-[10px] text-zinc-500">No hay movimientos que coincidan con la búsqueda o filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 text-zinc-500 border-b border-zinc-850 font-semibold tracking-wider text-[10px]">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Detalle del Movimiento</th>
                  <th className="p-3">Origen / Sucursal</th>
                  <th className="p-3">Forma de Pago</th>
                  <th className="p-3">ID / Ref</th>
                  <th className="p-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {chronologicalLedger.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-3 text-zinc-400 whitespace-nowrap font-mono">
                      {item.date.split("-").reverse().join("/")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {item.type === "income" ? (
                          <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded-md bg-rose-500/10 text-rose-400">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div>
                          <div className="font-semibold text-zinc-200">{item.title}</div>
                          <div className="text-[10px] text-zinc-500">{item.subtitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        item.branch === "Montevideo" 
                          ? "bg-sky-500/10 text-sky-400" 
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        📍 {item.branch}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400">
                      {item.paymentMethod}
                    </td>
                    <td className="p-3 text-zinc-500 font-mono text-[10px]">
                      {item.reference}
                    </td>
                    <td className="p-3 text-right font-mono text-sm whitespace-nowrap">
                      <span className={`font-black ${
                        item.type === "income" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {item.type === "income" ? "+" : "-"} {item.currency === "USD" ? "US$" : "$"} {item.amount.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
