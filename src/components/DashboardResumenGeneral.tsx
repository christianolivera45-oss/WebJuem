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
  Receipt,
  Truck,
  Handshake,
  ChevronDown,
  ChevronUp
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
  const [showMontevideoOrders, setShowMontevideoOrders] = useState<boolean>(false);

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

    // Commercial Agreement for Montevideo: 40% Net Product Profit + 100% Shipping
    let montevideoFacturadoTotal = 0;
    let montevideoTotalCostoArticulos = 0;
    let montevideoTotalComisionML = 0;
    let montevideoTotalEnvios = 0;

    montevideoOrders.forEach(o => {
      const netProduct = (o.subtotal || 0) - (o.discountAmount || 0);
      montevideoFacturadoTotal += netProduct;
      montevideoTotalEnvios += Number(o.shippingCost || 0);

      (o.items || []).forEach(item => {
        const p = store.products?.find(prod => String(prod.id) === String(item.productId));
        const itemCost = item.costPrice || p?.precioCompra || 0;
        montevideoTotalCostoArticulos += (Number(item.quantity) || 1) * itemCost;

        const isML = (o.canal && o.canal.toLowerCase() === "mercado libre");
        if (isML) {
          const comm = item.comisionML !== undefined ? item.comisionML : (p?.comisionML || 0);
          montevideoTotalComisionML += (Number(item.quantity) || 1) * comm;
        }
      });
    });

    const montevideoGananciaNeta = Math.max(0, montevideoFacturadoTotal - montevideoTotalCostoArticulos - montevideoTotalComisionML);
    const montevideoComisionVentas = 0.4 * montevideoGananciaNeta;
    const montevideoTotalALiquidar = montevideoComisionVentas + montevideoTotalEnvios;
    const montevideoRetornoJuem = montevideoTotalCostoArticulos + (0.6 * montevideoGananciaNeta);

    const agreement = {
      ordersCount: montevideoOrders.length,
      facturadoTotal: montevideoFacturadoTotal,
      totalCostoArticulos: montevideoTotalCostoArticulos,
      totalComisionML: montevideoTotalComisionML,
      gananciaNeta: montevideoGananciaNeta,
      comisionVentas: montevideoComisionVentas,
      totalEnvios: montevideoTotalEnvios,
      totalALiquidar: montevideoTotalALiquidar,
      retornoJuem: montevideoRetornoJuem,
      ordersList: montevideoOrders
    };

    return {
      pinamar: {
        income: pinamarIncome,
        expense: pinamarExpense,
        balance: pinamarIncome - pinamarExpense
      },
      montevideo: {
        income: montevideoIncome,
        expense: montevideoExpense,
        balance: montevideoIncome - montevideoExpense,
        agreement
      }
    };
  }, [orders, bills, store.products]);

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
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-zinc-200">Rendimiento Sucursal Pinamar</h3>
              </div>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Casa Central
              </span>
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

          <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-850/60 text-[10.5px] text-zinc-400">
            <span className="font-bold text-zinc-300 block mb-0.5">Casa Central (Pinamar)</span>
            Gestiona la fabricación 3D, reposición de inventario y retiene el costo de mercadería + el 60% de ganancia de ventas de Montevideo.
          </div>
        </div>

        {/* Montevideo Stats */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-sky-400" />
              <h3 className="font-bold text-sm text-zinc-200">Rendimiento e Histórico Sucursal Montevideo</h3>
            </div>
            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
              Franquicia Oficial
            </span>
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
          <div className="space-y-1.5 pt-1">
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

          {/* LIQUIDACIÓN A SUCURSAL MONTEVIDEO (ACUERDO COMERCIAL) */}
          <div className="bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-zinc-950 border-2 border-sky-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 mt-2">
            
            {/* Header of settlement */}
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                  <Handshake className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white uppercase tracking-wide">
                      Liquidación a Sucursal Montevideo (Acuerdo Comercial)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-500/30 font-bold">
                      {branchBreakdown.montevideo.agreement.ordersCount} ventas aprobadas
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Regla acordada: Montevideo recibe el <strong className="text-sky-300">40% de la Ganancia Neta</strong> de artículos + el <strong className="text-sky-300">100% de los Envíos</strong> cobrados.
                  </p>
                </div>
              </div>
            </div>

            {/* Total Highlight Box */}
            <div className="bg-zinc-900/90 p-4 rounded-xl border border-sky-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10.5px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Total a Dar / Entregar a Montevideo:
                </span>
                <span className="text-[10px] text-zinc-500">
                  Comisión por ventas + reembolso íntegro de fletes
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-sky-300 font-mono">
                $ {branchBreakdown.montevideo.agreement.totalALiquidar.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-zinc-400 font-normal">UYU</span>
              </div>
            </div>

            {/* 4 Pillars Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Facturación Neta Artículos</span>
                <span className="text-sm font-mono font-bold text-zinc-200 mt-0.5 block">
                  $ {branchBreakdown.montevideo.agreement.facturadoTotal.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500">Total vendido en Montevideo</span>
              </div>

              <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-sky-400 block">40% Ganancia Neta (Comisión)</span>
                <span className="text-sm font-mono font-black text-sky-300 mt-0.5 block">
                  $ {branchBreakdown.montevideo.agreement.comisionVentas.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500">
                  De ganancia neta total: ${branchBreakdown.montevideo.agreement.gananciaNeta.toLocaleString("es-UY", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block">100% Envíos (Fletes)</span>
                <span className="text-sm font-mono font-black text-indigo-300 mt-0.5 block">
                  $ {branchBreakdown.montevideo.agreement.totalEnvios.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500">Envíos cobrados por la sucursal</span>
              </div>

              <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Retorno Casa Central JUEM</span>
                <span className="text-sm font-mono font-bold text-emerald-300 mt-0.5 block">
                  $ {branchBreakdown.montevideo.agreement.retornoJuem.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Costo mercadería (${branchBreakdown.montevideo.agreement.totalCostoArticulos.toLocaleString("es-UY")}) + 60% ganancia
                </span>
              </div>
            </div>

            {/* Expandable sales table for Montevideo */}
            <div className="pt-2 border-t border-sky-500/20">
              <button
                type="button"
                onClick={() => setShowMontevideoOrders(!showMontevideoOrders)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-xs text-sky-300 font-bold transition border border-zinc-800 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-sky-400" />
                  <span>{showMontevideoOrders ? "Ocultar desglose de ventas" : `Ver detalle de las ${branchBreakdown.montevideo.agreement.ordersCount} ventas de Montevideo`}</span>
                </span>
                {showMontevideoOrders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showMontevideoOrders && (
                <div className="mt-3 overflow-x-auto border border-zinc-800 rounded-xl max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 uppercase text-[9.5px] border-b border-zinc-800 sticky top-0">
                      <tr>
                        <th className="p-2.5">ID / Fecha</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5 text-right">Artículos</th>
                        <th className="p-2.5 text-right">Costo</th>
                        <th className="p-2.5 text-right text-emerald-400">G. Neta</th>
                        <th className="p-2.5 text-right text-sky-400">40% Com.</th>
                        <th className="p-2.5 text-right text-indigo-400">100% Envío</th>
                        <th className="p-2.5 text-right text-sky-300 font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 text-zinc-300">
                      {branchBreakdown.montevideo.agreement.ordersList.map(o => {
                        const netProduct = (o.subtotal || 0) - (o.discountAmount || 0);
                        const shipping = Number(o.shippingCost || 0);
                        let cost = 0;
                        let comisionML = 0;
                        (o.items || []).forEach(it => {
                          const p = store.products?.find(x => String(x.id) === String(it.productId));
                          cost += (Number(it.quantity) || 1) * (it.costPrice || p?.precioCompra || 0);
                          if (o.canal && o.canal.toLowerCase() === "mercado libre") {
                            comisionML += (Number(it.quantity) || 1) * (it.comisionML !== undefined ? it.comisionML : (p?.comisionML || 0));
                          }
                        });
                        const ganancia = Math.max(0, netProduct - cost - comisionML);
                        const com40 = 0.4 * ganancia;
                        const totalLiq = com40 + shipping;

                        return (
                          <tr key={o.id} className="hover:bg-zinc-900/50">
                            <td className="p-2.5 font-mono font-bold text-zinc-300">
                              #{o.id.substring(0, 6).toUpperCase()}
                              <div className="text-[9px] text-zinc-500 font-sans">{o.createdAt ? o.createdAt.split("T")[0] : ""}</div>
                            </td>
                            <td className="p-2.5 text-zinc-200">
                              {o.customerName}
                            </td>
                            <td className="p-2.5 text-right font-mono text-zinc-300">${netProduct.toLocaleString("es-UY")}</td>
                            <td className="p-2.5 text-right font-mono text-zinc-400">${cost.toLocaleString("es-UY")}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-400 font-bold">${ganancia.toLocaleString("es-UY")}</td>
                            <td className="p-2.5 text-right font-mono text-sky-400 font-bold">${com40.toLocaleString("es-UY")}</td>
                            <td className="p-2.5 text-right font-mono text-indigo-400 font-bold">${shipping.toLocaleString("es-UY")}</td>
                            <td className="p-2.5 text-right font-mono text-sky-300 font-black bg-sky-500/5">${totalLiq.toLocaleString("es-UY")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
