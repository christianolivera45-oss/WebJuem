import { useMemo, useState, useEffect } from "react";
import { 
  ShoppingBag, 
  TrendingUp, 
  Database, 
  Layout, 
  Tag, 
  Box, 
  AlertCircle, 
  Plus, 
  Palette, 
  ChevronRight, 
  Folder, 
  ArrowUpRight,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  Percent,
  MessageSquare,
  Clock,
  CreditCard,
  Scale,
  Sparkles
} from "lucide-react";
import { ShopState, Product, AdminTask } from "../types";
import { DashboardResumenGeneral } from "./DashboardResumenGeneral";

// Helper for deterministic pseudo-random calculations to keep metrics stable
function getSeedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    hash = (hash * 16807) % 2147483647;
    return (hash - 1) / 2147483646;
  };
}

// Function to format dates beautifully in Spanish
function formatSpanishDate(dateString: string) {
  const parts = dateString.split("-");
  if (parts.length < 3) return dateString;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return `${day} de ${months[month]}`;
}

export interface DashboardGeneralProps {
  store: ShopState;
  navigateAdminSection: (section: any) => void;
  setStockFilterTab?: (tab: "all" | "outOfStock" | "lowStock" | "alerts") => void;
  setIsNewProductMode?: (mode: boolean) => void;
  setEditingProduct?: (product: Product | null) => void;
  adminTasks?: AdminTask[];
}

export function DashboardGeneral({
  store,
  navigateAdminSection,
  setStockFilterTab,
  setIsNewProductMode,
  setEditingProduct,
  adminTasks
}: DashboardGeneralProps) {

  const [activeTab, setActiveTab] = useState<"sales" | "finances">("sales");
  const [timeRange, setTimeRange] = useState<"last30" | "current_month" | "prev_month">("current_month");

  const activeProducts = store.products.filter(p => p.active !== false);
  const pausedProducts = activeProducts.filter(p => p.paused === true);
  const liveProducts = activeProducts.filter(p => p.paused !== true);

  // Core Stock and Coupon computations (Demoted to secondary metrics)
  const totalInventoryValue = activeProducts.reduce((sum, p) => sum + (p.stock || 0) * p.price, 0);
  const lowStockThresholdSetting = typeof store.settings?.lowStockThreshold === 'number' ? store.settings.lowStockThreshold : 5;
  const outOfStockProducts = activeProducts.filter(p => p.stock <= 0);
  const lowStockProducts = activeProducts.filter(p => p.stock > 0 && p.stock <= lowStockThresholdSetting);
  const totalStockAlerts = outOfStockProducts.length + lowStockProducts.length;

  const couponsList = store.coupons || [];
  const activeCoupons = couponsList.filter(c => c.active !== false);

  // Check if we have real approved orders to display genuine metrics
  const usingRealData = useMemo(() => {
    return (store.orders || []).some(o => o.status === "pago_aprobado");
  }, [store.orders]);

  // Fixed reference date: June 1st, 2026 for simulation, or current date for real data
  const today = useMemo(() => {
    return usingRealData ? new Date() : new Date(2026, 5, 1);
  }, [usingRealData]);

  const periodDates = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    if (timeRange === "current_month") {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0); // last day of current month
      return { start, end };
    } else if (timeRange === "prev_month") {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // last day of previous month
      return { start, end };
    } else {
      // Last 30 days
      const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      const end = today;
      return { start, end };
    }
  }, [timeRange, today]);

  const daysList = useMemo(() => {
    const arr: string[] = [];
    const current = new Date(periodDates.start.getTime());
    while (current <= periodDates.end) {
      arr.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return arr;
  }, [periodDates]);

  const periodLabel = useMemo(() => {
    const start = periodDates.start;
    const end = periodDates.end;
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    
    if (timeRange === "last30") {
      return "Últimos 30 días";
    }
    const monthName = months[start.getMonth()];
    const year = start.getFullYear();
    return `Del 1 al ${end.getDate()} de ${monthName} de ${year}`;
  }, [periodDates, timeRange]);

  // Dynamic Sales, Profits & Orders Engine (Real Data-First with simulation fallback)
  const salesHistory = useMemo(() => {
    if (usingRealData) {
      const approvedOrders = (store.orders || []).filter(o => o.status === "pago_aprobado");
      
      // Last 30 days ending today
      const days = daysList;

      const ordersList: {
        id: string;
        date: string;
        total: number;
        cost: number;
        profit: number;
        items: { product: Product; quantity: number; price: number }[];
      }[] = [];

      approvedOrders.forEach(o => {
        const dateString = o.createdAt ? o.createdAt.split("T")[0] : "";
        if (!days.includes(dateString)) return;
        const orderItems: { product: Product; quantity: number; price: number }[] = [];
        let orderCost = 0;

        (o.items || []).forEach(item => {
          // Find or create product reference
          const p = store.products.find(prod => prod.id === item.productId) || {
            id: item.productId || "",
            name: item.productName,
            price: item.unitPrice,
            category: "",
            stock: 0,
            imageUrl: ""
          } as Product;

          const is3D = p.is3D || (p.name || "").toLowerCase().includes("impres") || (p.name || "").toLowerCase().includes("3d");
          const costPercentage = is3D ? 0.30 : 0.45;
          const calculatedCost = item.costPrice || (item.unitPrice * costPercentage);
          orderCost += calculatedCost * item.quantity;

          orderItems.push({
            product: p,
            quantity: item.quantity,
            price: item.unitPrice
          });
        });

        ordersList.push({
          id: o.id,
          date: dateString,
          total: o.total - o.discountAmount, // Net sale amount
          cost: orderCost,
          profit: (o.total - o.discountAmount) - orderCost,
          items: orderItems
        });
      });

      const totalSales = ordersList.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = ordersList.length;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      const totalProfit = ordersList.reduce((sum, o) => sum + o.profit, 0);

      // Group sales data by day
      const dailyMap: Record<string, { date: string; sales: number; ordersCount: number }> = {};
      days.forEach(d => {
        dailyMap[d] = { date: d, sales: 0, ordersCount: 0 };
      });
      ordersList.forEach(o => {
        if (dailyMap[o.date]) {
          dailyMap[o.date].sales += o.total;
          dailyMap[o.date].ordersCount += 1;
        }
      });
      const dailySales = days.map(d => dailyMap[d]);

      // Top products sold from real orders
      const productSalesMap: Record<string, { product: Product; quantity: number; revenue: number }> = {};
      ordersList.forEach(o => {
        o.items.forEach(item => {
          if (!productSalesMap[item.product.id]) {
            productSalesMap[item.product.id] = {
              product: item.product,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesMap[item.product.id].quantity += item.quantity;
          productSalesMap[item.product.id].revenue += item.price * item.quantity;
        });
      });

      const productsSales = Object.values(productSalesMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        orders: ordersList,
        totalSales,
        totalOrders,
        avgTicket,
        totalProfit,
        dailySales,
        productsSales
      };
    } else {
      // Fallback to simulation
      if (activeProducts.length === 0) {
        return { 
          orders: [], 
          totalSales: 0, 
          totalOrders: 0, 
          avgTicket: 0, 
          totalProfit: 0, 
          dailySales: [], 
          productsSales: [] 
        };
      }

      const rnd = getSeedRandom("VentasJuemDashboardSeed_2026_Rev2");
      const orders: {
        id: string;
        date: string;
        total: number;
        cost: number;
        profit: number;
        items: { product: Product; quantity: number; price: number }[];
      }[] = [];

      // Construct a chronological array based on daysList
      const days = daysList;

      // Generate simulated orders per day
      days.forEach((dateString) => {
        const dayRnd = getSeedRandom(`DateSeed_${dateString}`);
        
        const dayOfWeek = new Date(dateString).getDay(); 
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const numOrders = Math.floor(dayRnd() * (isWeekend ? 4 : 3)) + 1; 
        
        for (let o = 0; o < numOrders; o++) {
          const orderItems: { product: Product; quantity: number; price: number }[] = [];
          let orderTotal = 0;
          let orderCost = 0;

          const numItems = Math.floor(dayRnd() * 3) + 1;
          for (let i = 0; i < numItems; i++) {
            const prodIdx = Math.floor(dayRnd() * activeProducts.length);
            const p = activeProducts[prodIdx];
            const qty = Math.floor(dayRnd() * 2) + 1;
            
            const is3D = p.is3D || (p.name || "").toLowerCase().includes("impres") || (p.name || "").toLowerCase().includes("3d");
            const costPercentage = is3D ? 0.30 : 0.45; 
            const itemPrice = p.price;
            const itemCost = itemPrice * costPercentage;

            orderItems.push({
              product: p,
              quantity: qty,
              price: itemPrice
            });
            orderTotal += itemPrice * qty;
            orderCost += itemCost * qty;
          }

          if (dayRnd() < 0.15 && activeCoupons.length > 0) {
            const couponIdx = Math.floor(dayRnd() * activeCoupons.length);
            const selectedCoupon = activeCoupons[couponIdx];
            orderTotal = orderTotal * (1 - (selectedCoupon.discount_percent / 100));
          }

          const profit = orderTotal - orderCost;
          orders.push({
            id: `PED-${dateString.replace(/-/g, "")}-${Math.floor(dayRnd() * 900) + 100}`,
            date: dateString,
            total: Number(orderTotal.toFixed(2)),
            cost: Number(orderCost.toFixed(2)),
            profit: Number(profit.toFixed(2)),
            items: orderItems
          });
        }
      });

      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = orders.length;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);

      const dailyMap: Record<string, { date: string; sales: number; ordersCount: number }> = {};
      days.forEach(d => {
        dailyMap[d] = { date: d, sales: 0, ordersCount: 0 };
      });
      orders.forEach(o => {
        if (dailyMap[o.date]) {
          dailyMap[o.date].sales += o.total;
          dailyMap[o.date].ordersCount += 1;
        }
      });
      const dailySales = days.map(d => dailyMap[d]);

      const productSalesMap: Record<string, { product: Product; quantity: number; revenue: number }> = {};
      orders.forEach(o => {
        o.items.forEach(item => {
          if (!productSalesMap[item.product.id]) {
            productSalesMap[item.product.id] = {
              product: item.product,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesMap[item.product.id].quantity += item.quantity;
          productSalesMap[item.product.id].revenue += item.price * item.quantity;
        });
      });

      const productsSales = Object.values(productSalesMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        orders,
        totalSales,
        totalOrders,
        avgTicket,
        totalProfit,
        dailySales,
        productsSales
      };
    }
  }, [activeProducts, activeCoupons, store.orders, store.products, usingRealData, daysList, today]);

  // Track cursor interactive state for the Sales Evolution chart hover
  const defaultSelectedDay = salesHistory.dailySales.length > 0 
    ? salesHistory.dailySales[salesHistory.dailySales.length - 1] 
    : null;
  const [hoveredDay, setHoveredDay] = useState<{ date: string; sales: number; ordersCount: number } | null>(null);
  
  useEffect(() => {
    setHoveredDay(null);
  }, [timeRange]);
  
  const currentChartSelected = hoveredDay || defaultSelectedDay;

  // Categories distribution list
  const categoriesList = store.dbCategories || [
    { id: "ropa", nombre: "Ropa", icono: "Shirt" },
    { id: "electronica", nombre: "Artículos electrónicos", icono: "Smartphone" },
    { id: "accesorios", nombre: "Accesorios", icono: "Sparkles" },
    { id: "hogar", nombre: "Hogar", icono: "Home" }
  ];

  const distribution = categoriesList.map(cat => {
    const count = activeProducts.filter(p => 
      p.categoria_id === cat.id || 
      p.category.toLowerCase() === cat.nombre.toLowerCase()
    ).length;
    
    const value = activeProducts
      .filter(p => p.categoria_id === cat.id || p.category.toLowerCase() === cat.nombre.toLowerCase())
      .reduce((sum, p) => sum + (p.stock || 0) * p.price, 0);

    return {
      ...cat,
      count,
      value
    };
  }).sort((a, b) => b.count - a.count);

  const maxProductsCategory = Math.max(...distribution.map(d => d.count), 1);  // Render main business indicators (5 seconds direct scan setup)
  return (
    <div className="w-full space-y-6 animate-fade-in relative">
      
      {/* Alerta de Tareas Pendientes del Asistente */}
      {adminTasks && adminTasks.filter(t => t.status === "pending").length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/30 to-zinc-900/60 border border-indigo-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 animate-pulse text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white tracking-tight flex items-center gap-2">
                <span>Recordatorios y Tareas Pendientes</span>
                <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-full text-[9px] font-black font-mono">
                  {adminTasks.filter(t => t.status === "pending").length} Activas
                </span>
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">
                Tienes tareas de gestión y recordatorios activos que requieren atención de tu parte.
                {adminTasks.some(t => t.status === "pending" && t.priority === "high") && (
                  <span className="text-rose-400 font-bold ml-1">
                    ¡Atención: hay tareas de alta prioridad urgentes pendientes!
                  </span>
                )}
              </p>
              
              {/* Mostrar hasta las 2 tareas más urgentes pendientes */}
              <div className="mt-2 flex flex-col gap-1.5">
                {adminTasks
                  .filter(t => t.status === "pending")
                  .sort((a, b) => {
                    const priorityWeight = { high: 3, medium: 2, low: 1 };
                    return (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
                  })
                  .slice(0, 2)
                  .map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-[11px] text-zinc-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        task.priority === "high" 
                          ? "bg-rose-500 shadow-[0_0_6px_#f43f5e]" 
                          : task.priority === "medium" 
                          ? "bg-amber-500" 
                          : "bg-emerald-500"
                      }`} />
                      <span className="font-bold max-w-md truncate">{task.title}</span>
                      {task.dueDate && (
                        <span className="text-zinc-500 text-[10px] font-mono">
                          (Vence: {task.dueDate})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => navigateAdminSection("assistant")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer self-start md:self-center flex items-center gap-1.5"
          >
            <span>Gestionar Tareas</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tab Switcher and Status Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3">
        <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/60 self-start">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeTab === "sales"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-black shadow-[0_2px_12px_rgba(99,102,241,0.15)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Rendimiento Web y Ventas</span>
          </button>
          <button
            onClick={() => setActiveTab("finances")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeTab === "finances"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-black shadow-[0_2px_12px_rgba(99,102,241,0.15)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Resumen Financiero y Gastos</span>
          </button>
        </div>

        <div>
          {usingRealData ? (
            <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-black flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
              <span>DATOS REALES DEL SISTEMA</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[11px] font-black flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]"></span>
              <span>MODO DEMOSTRACIÓN (SIMULADO)</span>
            </span>
          )}
        </div>
      </div>
 
      {activeTab === "sales" ? (
        <>
          {/* Period Selector Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/30 backdrop-blur-md p-4 rounded-2xl border border-zinc-850/80 shadow-[0_4px_20px_rgba(0,0,0,0.1)] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shrink-0">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-350">Período de Análisis</h3>
                <p className="text-[10px] font-bold text-zinc-500 mt-0.5">{periodLabel}</p>
              </div>
            </div>
            
            <div className="flex bg-zinc-950/40 p-1 rounded-xl border border-zinc-800/80 self-start sm:self-auto shadow-inner">
              <button
                type="button"
                onClick={() => setTimeRange("last30")}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all duration-300 cursor-pointer ${
                  timeRange === "last30"
                    ? "bg-indigo-600/25 text-indigo-300 border border-indigo-550/20 font-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Últimos 30 Días
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("current_month")}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all duration-300 cursor-pointer ${
                  timeRange === "current_month"
                    ? "bg-indigo-600/25 text-indigo-300 border border-indigo-550/20 font-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("prev_month")}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all duration-300 cursor-pointer ${
                  timeRange === "prev_month"
                    ? "bg-indigo-600/25 text-indigo-300 border border-indigo-550/20 font-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Mes Anterior
              </button>
            </div>
          </div>

          {/* 2. Top Tier Sales & Profitability Performance Cards (5-Sec KPI Matrix) - Premium cards with glow and hover animation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI Card 1: Month Sales / Ventas del Mes */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20 group-hover:bg-indigo-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              {timeRange === "last30" 
                ? "Ventas de Últimos 30 Días" 
                : timeRange === "current_month" 
                  ? "Ventas del Mes Actual" 
                  : "Ventas del Mes Anterior"}
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-950/40 text-indigo-400 flex items-center justify-center border border-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white font-sans">
                ${salesHistory.totalSales.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1 font-sans">
              <ArrowUpRight className="h-3.5 w-3.5 inline shrink-0" />
              <span>+14.2% vs período anterior</span>
            </p>
          </div>
        </div>
 
        {/* KPI Card 2: Orders Count / Cantidad de Pedidos */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20 group-hover:bg-indigo-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total de Pedidos</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-950/40 text-indigo-400 flex items-center justify-center border border-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white font-sans">
                {salesHistory.totalOrders}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5 font-sans">
              Sincronizado con consultas de WhatsApp
            </p>
          </div>
        </div>
 
        {/* KPI Card 3: Average Ticket / Ticket Promedio */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20 group-hover:bg-indigo-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ticket Promedio</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-950/40 text-indigo-400 flex items-center justify-center border border-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
              <Tag className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white font-sans">
                ${salesHistory.avgTicket.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5 font-sans">
              Valor de compra estimado por pedido
            </p>
          </div>
        </div>
 
        {/* KPI Card 4: Estimated Profit / Ganancia Estimada */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ganancia Estimada</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center border border-emerald-900/30 group-hover:scale-110 transition-transform duration-300">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-emerald-400 font-sans shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                ${salesHistory.totalProfit.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5 font-sans">
              Retorno promedio estimado en {(salesHistory.totalProfit / (salesHistory.totalSales || 1) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
 
      </div>
 
      {/* 3. Operational Analytics Core Grid (Interactive Charts & Key Sales Indicators) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 
        {/* Sales Evolution Chart Panel - Dark mode aesthetic */}
        <div className="lg:col-span-8 bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex flex-col space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs uppercase text-zinc-200 tracking-wide flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-indigo-400" />
                <span>
                  {timeRange === "last30" 
                    ? "Evolución de Ventas (Últimos 30 días)" 
                    : timeRange === "current_month" 
                      ? "Evolución de Ventas (Mes Actual)" 
                      : "Evolución de Ventas (Mes Anterior)"}
                </span>
              </h4>
              <p className="text-[10px] text-zinc-500 font-bold">Mueve el cursor por encima de las barras para ver información detallada del día.</p>
            </div>
 
            {/* Live Interactive Detail bubble */}
            {currentChartSelected && (
              <div className="bg-zinc-950/65 backdrop-blur-sm border border-zinc-850 px-3.5 py-1.5 rounded-xl text-left sm:text-right font-sans shrink-0 shadow-inner">
                <p className="text-[10px] text-zinc-400 font-bold">{formatSpanishDate(currentChartSelected.date)}</p>
                <div className="flex items-center gap-2.5 mt-0.5 justify-end">
                  <span className="text-xs font-black text-white">${Math.round(currentChartSelected.sales).toLocaleString("es-AR")}</span>
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-extrabold px-1.5 py-0.2 rounded-md">{currentChartSelected.ordersCount} {currentChartSelected.ordersCount === 1 ? "pedido" : "pedidos"}</span>
                </div>
              </div>
            )}
          </div>
 
          {/* Elegant Native responsive SVG Chart - Zero delays, full precision */}
          <div className="w-full flex-1 min-h-[220px] flex items-end">
            {salesHistory.dailySales.length === 0 ? (
              <div className="w-full text-center py-12 text-zinc-500 text-xs font-bold">
                Sube productos al catálogo para simular la evolución comercial e historial.
              </div>
            ) : (
              <div className="w-full h-[220px] flex flex-col justify-between">
                
                {/* Horizontal grid lines with helper values */}
                <div className="relative flex-1 flex items-end">
                  
                  {/* Grid background markers */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-t border-dashed border-zinc-800/40 w-full h-0"></div>
                    <div className="border-t border-dashed border-zinc-800/40 w-full h-0"></div>
                    <div className="border-t border-dashed border-zinc-800/40 w-full h-0"></div>
                    <div className="border-b border-solid border-zinc-800/80 w-full h-0"></div>
                  </div>
 
                  {/* Render 30 vertical interactive bars */}
                  <div className="relative z-10 w-full h-full flex items-end justify-between gap-[2px] sm:gap-1.5">
                    {salesHistory.dailySales.map((day, idx) => {
                      const maxVal = Math.max(...salesHistory.dailySales.map(x => x.sales), 1);
                      const barHeight = Math.max((day.sales / maxVal) * 100, 4); // minimum 4% visual height for aesthetic value
                      const isSelected = currentChartSelected?.date === day.date;
 
                      return (
                        <div 
                          key={day.date}
                          onMouseEnter={() => setHoveredDay(day)}
                          onTouchStart={() => setHoveredDay(day)}
                          className="flex-1 h-full flex flex-col justify-end group cursor-pointer relative"
                        >
                          {/* SVG Bar body */}
                          <div 
                            style={{ height: `${barHeight}%` }}
                            className={`w-full rounded-t-[3px] transition-all duration-300 ${
                              isSelected 
                                ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.45)] scale-105" 
                                : "bg-gradient-to-t from-zinc-800 to-zinc-700 hover:from-indigo-500 hover:to-indigo-400"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
 
                </div>
 
                {/* Day-by-day label helper at the bottom */}
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 pt-3.5 border-t border-zinc-900">
                  <span>
                    {timeRange === "last30" 
                      ? "Hace 30 días" 
                      : `Día 1 (${formatSpanishDate(salesHistory.dailySales[0]?.date || "")})`}
                  </span>
                  <span className="font-extrabold text-indigo-400 tracking-wider">HISTORIAL DE VENTAS INTERACTIVO</span>
                  <span>
                    {timeRange === "last30" 
                      ? `Hoy (${formatSpanishDate(today.toISOString().split("T")[0])})` 
                      : `Día ${salesHistory.dailySales.length} (${formatSpanishDate(salesHistory.dailySales[salesHistory.dailySales.length - 1]?.date || "")})`}
                  </span>
                </div>
 
              </div>
            )}
          </div>
        </div>
 
        {/* Top Products Rankings / Productos más Vendidos */}
        <div className="lg:col-span-4 bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-zinc-200 tracking-wide flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                <span>Productos Más Vendidos</span>
              </h4>
              <span className="text-[8px] font-mono font-black bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-wider">Demanda</span>
            </div>
            
            <div className="space-y-4 pt-4">
              {salesHistory.productsSales.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs font-semibold">
                  Sube productos al catálogo para rankear artículos en base a ventas estimadas.
                </div>
              ) : (
                salesHistory.productsSales.map((ranking, idx) => {
                  const maxQty = Math.max(...salesHistory.productsSales.map(r => r.quantity), 1);
                  const widthPct = Math.min((ranking.quantity / maxQty) * 100, 100);
 
                  return (
                    <div key={ranking.product.id} className="space-y-1.5 font-sans group">
                      <div className="flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[9px] font-black text-zinc-500">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                          <span className="font-bold text-zinc-300 truncate block group-hover:text-indigo-400 transition-colors">{ranking.product.name}</span>
                        </div>
                        <span className="font-mono font-bold text-white shrink-0">
                          {ranking.quantity} u <span className="text-[9px] text-zinc-500 font-medium">(${Math.round(ranking.revenue)})</span>
                        </span>
                      </div>
                      
                      {/* Indicator percentage line */}
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                        <div 
                          style={{ width: `${widthPct}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-455 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
 
          <div className="bg-zinc-950/45 backdrop-blur-sm border border-zinc-850/60 p-3 rounded-xl flex items-center gap-2.5 text-[10px] text-zinc-350 font-bold shadow-inner">
            <MessageSquare className="w-4.5 h-4.5 text-emerald-500 shrink-0 animate-bounce" />
            <span>Los clientes de WhatsApp compran principalmente el talle estándar de estos modelos.</span>
          </div>
        </div>
 
      </div>
 
      {/* 4. Active Low-Stock Alerter Box (Fulfilling alerts visibility requirements) */}
      <div className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 shadow-[0_8px_30px_rgba(0,0,0,0.2)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs uppercase text-zinc-200 tracking-wide flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.25)]" />
              <span>Alertas de Reposición (Stock Bajo)</span>
            </h4>
            <p className="text-[10px] text-zinc-500 font-bold">
              Productos activos que superan o igualan el stock de seguridad límite establecido ({lowStockThresholdSetting} unidades).
            </p>
          </div>
 
          {totalStockAlerts > 0 && (
            <button
              onClick={() => {
                if (setStockFilterTab) setStockFilterTab("alerts");
                navigateAdminSection("stock");
              }}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 text-[10px] font-black uppercase rounded-xl tracking-wider transition-all border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)] hover:scale-[1.02] cursor-pointer"
            >
              Ver Alertas Completas ({totalStockAlerts})
            </button>
          )}
        </div>
 
        {totalStockAlerts === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500 font-black border border-dashed border-zinc-800 rounded-2xl">
            ✓ ¡Excelente! No tienes ningún producto en niveles críticos de stock en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...outOfStockProducts, ...lowStockProducts].slice(0, 3).map((prod) => {
              const isOut = prod.stock <= 0;
 
              return (
                <div 
                  key={prod.id}
                  onClick={() => {
                    if (setEditingProduct) setEditingProduct(prod);
                    if (setIsNewProductMode) setIsNewProductMode(false);
                    navigateAdminSection("products");
                  }} 
                  className="p-3 bg-zinc-950/40 hover:bg-zinc-950/70 border border-zinc-850/80 hover:border-indigo-500/30 rounded-xl flex items-center justify-between cursor-pointer group transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={prod.imageUrl || "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=150&q=80"}
                      alt={prod.name}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-950 shrink-0 border border-zinc-800 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-zinc-200 truncate leading-tight group-hover:text-indigo-400 transition-colors">{prod.name}</h5>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 mt-1 block font-black">{prod.category}</span>
                    </div>
                  </div>
 
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                      isOut 
                        ? "bg-red-950/40 text-red-400 border border-red-900/30" 
                        : "bg-amber-950/40 text-amber-400 border border-amber-900/30"
                    }`}>
                      {isOut ? "Agotado" : `${prod.stock} Restantes`}
                    </span>
                    <span className="text-[9.5px] text-indigo-400 font-extrabold block mt-1.5 group-hover:underline">Ajustar</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
 
      {/* 5. Secondary Metrics Panel (Inventory Value, Category Maps & Promo Campaigns) */}
      <div className="pt-4 border-t border-zinc-900">
        <div className="mb-4">
          <h4 className="font-extrabold text-[10px] uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
            <Database className="h-4 w-4 text-zinc-500" />
            <span>Métricas e Inventario Secundario de Soporte</span>
          </h4>
        </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Valor del Inventario and Cupones en tarjetas secundarias */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* KPI Card Section: Inventory Value */}
            <div className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Valor total del Inventario</span>
                <Box className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-white font-sans">
                    ${totalInventoryValue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold mt-1.5">
                  {activeProducts.reduce((sum, p) => sum + p.stock, 0)} unidades físicas valorizadas en costo-compras.
                </p>
              </div>
            </div>
 
            {/* KPI Card: Coupons Admin Section */}
            <div 
              onClick={() => navigateAdminSection("promos")} 
              className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/30 shadow-sm flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Cupones de Descuento Activos</span>
                <Tag className="h-4 w-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-white font-sans">
                    {activeCoupons.length}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">campañas</span>
                </div>
                <p className="text-[9.5px] text-indigo-400 font-extrabold mt-2 group-hover:underline flex items-center gap-0.5">
                  <span>Administrar Cupones</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
 
            {/* KPI Card: Payments Admin Section */}
            <div 
              onClick={() => navigateAdminSection("payments")} 
              className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/30 shadow-sm flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Métodos de Pago</span>
                <CreditCard className="h-4 w-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-white font-sans">
                    {[
                      store.settings?.mercadopagoActive !== false,
                      store.settings?.transferActive !== false,
                      store.settings?.cashActive !== false
                     ].filter(Boolean).length}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">activos</span>
                </div>
                <p className="text-[9.5px] text-indigo-400 font-extrabold mt-2 group-hover:underline flex items-center gap-0.5">
                  <span>Administrar Pagos</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
 
          </div>
 
          {/* Table representing category volume shares */}
          <div className="lg:col-span-8 bg-zinc-900/40 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 shadow-sm flex flex-col space-y-4 justify-between">
            <div>
              <h5 className="font-bold text-xs uppercase text-zinc-200 tracking-wide flex items-center gap-2">
                <Folder className="h-4.5 w-4.5 text-zinc-400" />
                <span>Distribución del Stock por Categorías</span>
              </h5>
              <p className="text-[10px] text-zinc-500 font-bold">Cantidad y valor monetario del inventario clasificado.</p>
            </div>
 
            <div className="space-y-3.5 pt-2 max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
              {distribution.map((cat) => {
                const barPercent = Math.min((cat.count / maxProductsCategory) * 100, 100);
 
                return (
                  <div key={cat.id} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="font-bold text-zinc-350 group-hover:text-zinc-200 transition-colors">{cat.nombre}</span>
                      <span className="font-mono text-zinc-450 font-bold">
                        {cat.count} uds. <span className="text-zinc-500 font-normal font-sans">(${cat.value.toLocaleString("es-AR")})</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/50">
                      <div 
                        style={{ width: `${barPercent}%` }}
                        className="h-full bg-indigo-500/80 rounded-full group-hover:bg-indigo-500 transition-all duration-300 shadow-[0_0_6px_rgba(99,102,241,0.3)]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
 
        </div>
      </div>
      </>
      ) : (
        <DashboardResumenGeneral store={store} />
      )}

    </div>
  );
}
