import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Save,
  RefreshCw,
  X,
  Flame,
  Zap,
  BarChart3,
  CalendarDays,
  CheckSquare,
  Square,
  AlertCircle,
  DollarSign,
  Package,
  ShoppingBag,
  Box,
  Eye,
  Settings2
} from "lucide-react";
import { AdminGoal, AdminTask, DayFocus, AdminReview, WorkArea, GoalCategory, GoalStatus, GoalPriority, ShopState } from "../types";

interface DashboardPlanningProps {
  store: ShopState;
  authToken?: string;
  onNavigateSection?: (section: string) => void;
  onRefreshTasks?: () => void;
}

export const DashboardPlanning: React.FC<DashboardPlanningProps> = ({
  store,
  authToken,
  onNavigateSection,
  onRefreshTasks
}) => {
  const token = authToken || localStorage.getItem("apex_admin_token") || "";

  // Active view level
  const [activeLevel, setActiveLevel] = useState<"hoy" | "semana" | "mes" | "areas" | "revision">("hoy");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core data from API
  const [overviewData, setOverviewData] = useState<any>(null);
  const [goals, setGoals] = useState<AdminGoal[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [dayFocusList, setDayFocusList] = useState<DayFocus[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Selected date / month filter
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Modals state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AdminGoal | null>(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);

  const [showDayFocusModal, setShowDayFocusModal] = useState(false);
  const [editingDayFocus, setEditingDayFocus] = useState<DayFocus | null>(null);

  // Review state
  const [reviewTab, setReviewTab] = useState<"weekly" | "monthly">("weekly");
  const [reviewWhatWorked, setReviewWhatWorked] = useState("");
  const [reviewWhatDidntWork, setReviewWhatDidntWork] = useState("");
  const [reviewTimeWasters, setReviewTimeWasters] = useState("");
  const [reviewWhatToChange, setReviewWhatToChange] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(false);

  // Work areas filter
  const [areaFilter, setAreaFilter] = useState<"todas" | WorkArea>("todas");

  // Fetch planning overview
  const fetchPlanningData = async (isManualRefresh = false) => {
    if (!token) return;
    if (isManualRefresh) setRefreshing(true);
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/planning/overview?month=${selectedMonth}&date=${todayStr}&weekOffset=${weekOffset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status} al cargar planificación`);
      }
      const data = await res.json();
      if (data.success) {
        setOverviewData(data);
        setGoals(data.goals || []);
        setTasks(data.tasks || []);
        setDayFocusList(data.dayFocus || []);
        setAlerts(data.alerts || []);
      }
    } catch (err: any) {
      console.error("Error loading planning overview:", err);
      setErrorMsg(err.message || "No se pudo conectar con el servicio de planificación.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, [selectedMonth, weekOffset, token]);

  // Load reviews when switching to review tab
  useEffect(() => {
    if (activeLevel === "revision" && token) {
      const pVal = reviewTab === "weekly" ? `2026-W${getWeekNumber(new Date())}` : selectedMonth;
      fetch(`/api/planning/reviews?type=${reviewTab}&periodValue=${pVal}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.reviews && d.reviews.length > 0) {
            const rev = d.reviews[0];
            setReviewWhatWorked(rev.whatWorked || "");
            setReviewWhatDidntWork(rev.whatDidntWork || "");
            setReviewTimeWasters(rev.timeWasters || "");
            setReviewWhatToChange(rev.whatToChange || "");
          } else {
            setReviewWhatWorked("");
            setReviewWhatDidntWork("");
            setReviewTimeWasters("");
            setReviewWhatToChange("");
          }
        })
        .catch(e => console.warn("Error fetching review:", e));
    }
  }, [activeLevel, reviewTab, selectedMonth, token]);

  function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // Handle task status toggle
  const handleToggleTaskStatus = async (task: AdminTask) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch(`/api/admin-tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...task,
          status: nextStatus
        })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
        if (onRefreshTasks) onRefreshTasks();
      }
    } catch (e) {
      console.error("Error toggling task status:", e);
    }
  };

  // Handle task priority toggle (Rule of 3)
  const handleToggleTaskPriority = async (task: AdminTask) => {
    try {
      const res = await fetch(`/api/admin-tasks/${task.id}/toggle-priority`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isPriorityToday: data.isPriorityToday } : t));
        if (onRefreshTasks) onRefreshTasks();
      } else {
        setErrorMsg(data.message || "No se pudo cambiar la prioridad.");
      }
    } catch (e) {
      console.error("Error toggling priority:", e);
      setErrorMsg("Error de conexión al cambiar la prioridad.");
    }
  };

  // Delete task with optimistic UI update and error rollback
  const handleDeleteTask = async (id: string) => {
    if (!id) return;
    const previousTasks = [...tasks];
    // Immediate UI removal so the task disappears instantly
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      const res = await fetch(`/api/admin-tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setTasks(previousTasks);
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || "No se pudo eliminar la tarea en el servidor.");
      } else {
        if (onRefreshTasks) onRefreshTasks();
      }
    } catch (e: any) {
      console.error("Error deleting task:", e);
      setTasks(previousTasks);
      setErrorMsg("Error de conexión al eliminar la tarea.");
    }
  };

  // Delete goal with optimistic UI update and error rollback
  const handleDeleteGoal = async (id: string) => {
    if (!id) return;
    const previousGoals = [...goals];
    // Immediate UI removal so the goal disappears instantly
    setGoals(prev => prev.filter(g => g.id !== id));

    try {
      const res = await fetch(`/api/planning/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setGoals(previousGoals);
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || "No se pudo eliminar el objetivo.");
      }
    } catch (e: any) {
      console.error("Error deleting goal:", e);
      setGoals(previousGoals);
      setErrorMsg("Error de conexión al eliminar el objetivo.");
    }
  };

  // Quick increment/decrement manual goal
  const handleAdjustGoalValue = async (goal: AdminGoal, delta: number) => {
    const newVal = Math.max(0, goal.currentValue + delta);
    const nextStatus = newVal >= goal.targetValue ? "cumplido" : "en_progreso";
    try {
      const res = await fetch(`/api/planning/goals/${goal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...goal,
          currentValue: newVal,
          status: nextStatus
        })
      });
      if (res.ok) {
        setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, currentValue: newVal, status: nextStatus } : g));
      }
    } catch (e) {
      console.error("Error adjusting goal:", e);
    }
  };

  // Save Review
  const handleSaveReview = async () => {
    setSavingReview(true);
    setReviewSuccessMsg(false);
    try {
      const pVal = reviewTab === "weekly" ? `2026-W${getWeekNumber(new Date())}` : selectedMonth;
      const res = await fetch("/api/planning/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: reviewTab,
          periodValue: pVal,
          whatWorked: reviewWhatWorked,
          whatDidntWork: reviewWhatDidntWork,
          timeWasters: reviewTimeWasters,
          whatToChange: reviewWhatToChange,
          metricsSnapshot: overviewData?.metrics
        })
      });
      if (res.ok) {
        setReviewSuccessMsg(true);
        setTimeout(() => setReviewSuccessMsg(false), 3000);
      }
    } catch (e) {
      console.error("Error saving review:", e);
    } finally {
      setSavingReview(false);
    }
  };

  // Filtered lists
  const prioritiesToday = useMemo(() => {
    return tasks.filter(t => t.isPriorityToday && t.status !== "completed" && (!t.dueDate || t.dueDate === todayStr));
  }, [tasks, todayStr]);

  const weekDaysWithDates = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const daysDef = [
      { id: "lunes", label: "Lunes", defaultFocus: "Planificación + ventas", dayOffset: 0 },
      { id: "martes", label: "Martes", defaultFocus: "Diseño 3D", dayOffset: 1 },
      { id: "miercoles", label: "Miércoles", defaultFocus: "Publicaciones", dayOffset: 2 },
      { id: "jueves", label: "Jueves", defaultFocus: "Investigación comercial", dayOffset: 3 },
      { id: "viernes", label: "Viernes", defaultFocus: "Producción + operativa", dayOffset: 4 },
      { id: "sabado", label: "Sábado", defaultFocus: "Contenido + mejoras", dayOffset: 5 },
      { id: "domingo", label: "Domingo", defaultFocus: "Revisión semanal", dayOffset: 6 }
    ];

    return daysDef.map(day => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + day.dayOffset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isToday = dateStr === todayStr;
      const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
      return {
        ...day,
        dateStr,
        displayDate,
        isToday,
        dateObj: d
      };
    });
  }, [weekOffset, todayStr]);

  const tasksForToday = useMemo(() => {
    return tasks.filter(t => !t.dueDate || t.dueDate === todayStr);
  }, [tasks, todayStr]);

  const completedTodayCount = useMemo(() => {
    return tasksForToday.filter(t => t.status === "completed").length;
  }, [tasksForToday]);

  const monthGoals = useMemo(() => {
    return goals.filter(g => g.periodType === "month" && (g.periodValue === selectedMonth || !g.periodValue));
  }, [goals, selectedMonth]);

  const goalsFulfilledCount = useMemo(() => {
    return monthGoals.filter(g => g.status === "cumplido").length;
  }, [monthGoals]);

  const goalsPendingCount = useMemo(() => {
    return monthGoals.filter(g => g.status !== "cumplido" && g.status !== "cancelado").length;
  }, [monthGoals]);

  // Today's focus name
  const todayDayName = useMemo(() => {
    const daysMap = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const now = new Date();
    return daysMap[now.getDay()];
  }, []);

  const todayDayFocus = useMemo(() => {
    return dayFocusList.find(d => d.id === todayDayName);
  }, [dayFocusList, todayDayName]);

  const metrics = overviewData?.metrics || {
    month: { salesCount: 0, facturado: 0, gananciaNeta: 0, itemsSold: 0 },
    prevMonth: { salesCount: 0, facturado: 0, gananciaNeta: 0, itemsSold: 0 },
    week: { salesCount: 0, facturado: 0, gananciaNeta: 0, itemsSold: 0 },
    catalog: { totalProducts: 0, activeProducts: 0, products3D: 0, totalStock: 0, lowStockCount: 0, outOfStockCount: 0 }
  };

  const salesGoal = overviewData?.salesGoal || {
    target: 50000,
    current: metrics.month.facturado,
    percent: 0
  };

  // ========================================================
  // PRODUCTIVIDAD VS RESULTADOS (CÁLCULOS SEMANALES)
  // ========================================================
  const weekDateSet = useMemo(() => new Set(weekDaysWithDates.map(d => d.dateStr)), [weekDaysWithDates]);

  const currentWeekNumber = useMemo(() => {
    return getWeekNumber(new Date(Date.now() + weekOffset * 7 * 86400000));
  }, [weekOffset]);

  const currentWeekPeriodStr = useMemo(() => {
    const year = new Date(Date.now() + weekOffset * 7 * 86400000).getFullYear();
    return `${year}-W${String(currentWeekNumber).padStart(2, "0")}`;
  }, [currentWeekNumber, weekOffset]);

  // Tareas de esta semana (por fecha de vencimiento o semana activa si no tiene fecha)
  const weekTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.dueDate) {
        return weekDateSet.has(t.dueDate);
      }
      return weekOffset === 0;
    });
  }, [tasks, weekDateSet, weekOffset]);

  // Las tareas canceladas no deben contar como tareas completadas
  const weekNonCancelledTasks = useMemo(() => {
    return weekTasks.filter(t => t.status !== "cancelled");
  }, [weekTasks]);

  const weekCompletedTasks = useMemo(() => {
    return weekNonCancelledTasks.filter(t => t.status === "completed");
  }, [weekNonCancelledTasks]);

  // Fórmula: (tareas completadas / tareas totales) × 100
  const weekProductivityPercent = useMemo(() => {
    if (weekNonCancelledTasks.length === 0) return 0;
    return Math.round((weekCompletedTasks.length / weekNonCancelledTasks.length) * 100);
  }, [weekCompletedTasks.length, weekNonCancelledTasks.length]);

  // Meta semanal de ventas/pedidos
  const weeklySalesGoal = useMemo(() => {
    // 1. Meta que coincida con el período de la semana
    const matchingPeriod = goals.find(g => 
      g.periodType === "week" && 
      (g.periodValue === currentWeekPeriodStr || !g.periodValue) &&
      (g.autoMetric === "ventas_semana" || g.category === "ventas" || (g.unit && g.unit.toLowerCase().includes("pedido")) || (g.unit && g.unit.toLowerCase().includes("venta")))
    );
    if (matchingPeriod) return matchingPeriod;

    // 2. Cualquier meta semanal de categoría 'ventas' o métrica 'ventas_semana'
    const anyWeeklySales = goals.find(g => 
      g.periodType === "week" && 
      (g.autoMetric === "ventas_semana" || g.category === "ventas" || (g.unit && g.unit.toLowerCase().includes("pedido")) || (g.unit && g.unit.toLowerCase().includes("venta")))
    );
    if (anyWeeklySales) return anyWeeklySales;

    // 3. Cualquier meta semanal
    return goals.find(g => g.periodType === "week") || null;
  }, [goals, currentWeekPeriodStr]);

  const hasResultsGoal = useMemo(() => {
    return Boolean(weeklySalesGoal && Number(weeklySalesGoal.targetValue) > 0);
  }, [weeklySalesGoal]);

  const metaPedidos = useMemo(() => {
    return hasResultsGoal ? Number(weeklySalesGoal!.targetValue) : 0;
  }, [hasResultsGoal, weeklySalesGoal]);

  const pedidosRealizados = useMemo(() => {
    return metrics.week.salesCount || 0;
  }, [metrics.week.salesCount]);

  // Fórmula: (pedidos realizados / meta de pedidos) × 100
  const weekResultsPercent = useMemo(() => {
    if (!hasResultsGoal || metaPedidos <= 0) return 0;
    return Math.round((pedidosRealizados / metaPedidos) * 100);
  }, [hasResultsGoal, metaPedidos, pedidosRealizados]);

  // Reglas de interpretación de la semana
  const weekInterpretation = useMemo(() => {
    if (!hasResultsGoal) {
      return {
        text: "No hay una meta de resultados configurada para esta semana.",
        type: "neutral" as const
      };
    }
    if (weekProductivityPercent >= 80 && weekResultsPercent < 50) {
      return {
        text: "Alta actividad, pero los resultados comerciales están por debajo de la meta.",
        type: "warning" as const
      };
    }
    if (weekProductivityPercent >= 70 && weekResultsPercent >= 70) {
      return {
        text: "Buen avance: actividad y resultados están alineados.",
        type: "success" as const
      };
    }
    if (weekProductivityPercent < 50 && weekResultsPercent < 50) {
      return {
        text: "El avance de la semana está por debajo de lo planificado.",
        type: "danger" as const
      };
    }
    if (weekProductivityPercent < 50 && weekResultsPercent >= 70) {
      return {
        text: "Los resultados avanzan pese a que todavía hay tareas pendientes.",
        type: "info" as const
      };
    }
    // Casos intermedios objetivos
    if (weekResultsPercent >= 70) {
      return {
        text: "Buen avance: actividad y resultados están alineados.",
        type: "success" as const
      };
    }
    if (weekProductivityPercent >= 50 && weekResultsPercent >= 50) {
      return {
        text: "Buen avance: actividad y resultados están alineados.",
        type: "success" as const
      };
    }
    if (weekResultsPercent < 50) {
      return {
        text: "Alta actividad, pero los resultados comerciales están por debajo de la meta.",
        type: "warning" as const
      };
    }
    return {
      text: "Buen avance: actividad y resultados están alineados.",
      type: "info" as const
    };
  }, [hasResultsGoal, weekProductivityPercent, weekResultsPercent]);

  // Helper colors
  const getAreaColor = (area: WorkArea) => {
    switch (area) {
      case "crecer":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "mantener":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "mejorar":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getPriorityBadge = (priority: GoalPriority) => {
    switch (priority) {
      case "high":
        return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Alta</span>;
      case "medium":
        return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Media</span>;
      case "low":
        return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Baja</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER WITH TITLE, MONTH SELECTOR, REFRESH */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Planificación y Objetivos
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                  JUEM 3D & E-commerce
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Enfoque diario, métricas sincronizadas y metas automáticas integradas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Month selector */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800/90 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          <button
            onClick={() => fetchPlanningData(true)}
            disabled={refreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            title="Recargar datos automáticos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={() => {
              setEditingGoal(null);
              setShowGoalModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span> Objetivo
          </button>

          <button
            onClick={() => {
              setEditingTask(null);
              setShowTaskModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva</span> Tarea
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* INTELLIGENT ALERTS BANNER */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 backdrop-blur-sm transition-all ${
                alert.type === "danger"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : alert.type === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
              }`}
            >
              <div className="mt-0.5">
                {alert.type === "danger" ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : alert.type === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              <div className="flex-1 text-xs">
                <div className="font-semibold text-white">{alert.title}</div>
                <div className="text-slate-300 mt-0.5 leading-relaxed">{alert.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOP SUMMARY CARDS WITH ACCURATE PROGRESS BARS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Sales & Target */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Facturación del Mes</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">
              ${metrics.month.facturado.toLocaleString("es-AR")}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Meta: ${salesGoal.target.toLocaleString("es-AR")}</span>
              <span className="font-bold text-emerald-400">{salesGoal.percent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, salesGoal.percent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sales Orders Count */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Ventas Realizadas</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Resultados
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-2">
              {metrics.month.salesCount}
              <span className="text-xs font-normal text-slate-400">pedidos aprobados</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Ganancia neta:</span>
              <span className="font-bold text-indigo-300">${metrics.month.gananciaNeta.toLocaleString("es-AR")}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.month.itemsSold} artículos entregados
            </div>
          </div>
        </div>

        {/* Tasks Status */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Tareas de Hoy</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                Productividad
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-2">
              {completedTodayCount} / {tasksForToday.length}
              <span className="text-xs font-normal text-slate-400">listas</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Pendientes: {tasksForToday.length - completedTodayCount}</span>
              <span className="font-bold text-sky-400">
                {tasksForToday.length > 0 ? Math.round((completedTodayCount / tasksForToday.length) * 100) : 100}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${tasksForToday.length > 0 ? Math.round((completedTodayCount / tasksForToday.length) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Goals Progress */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Objetivos del Mes</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-2">
              {goalsFulfilledCount} / {monthGoals.length}
              <span className="text-xs font-normal text-slate-400">cumplidos</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Pendientes: {goalsPendingCount}</span>
              <span className="font-bold text-purple-400">
                {monthGoals.length > 0 ? Math.round((goalsFulfilledCount / monthGoals.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{
                  width: `${monthGoals.length > 0 ? Math.round((goalsFulfilledCount / monthGoals.length) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS (HOY, ESTA SEMANA, ESTE MES, ÁREAS, REVISIÓN) */}
      <div className="flex items-center border-b border-slate-800 gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveLevel("hoy")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeLevel === "hoy"
              ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
              : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <Clock className="w-4 h-4" />
          HOY
          {prioritiesToday.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              {prioritiesToday.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveLevel("semana")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeLevel === "semana"
              ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
              : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          ESTA SEMANA
        </button>

        <button
          onClick={() => setActiveLevel("mes")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeLevel === "mes"
              ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
              : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <Target className="w-4 h-4" />
          ESTE MES
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-bold">
            {monthGoals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveLevel("areas")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeLevel === "areas"
              ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
              : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <Layers className="w-4 h-4" />
          ÁREAS DE TRABAJO
        </button>

        <button
          onClick={() => setActiveLevel("revision")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeLevel === "revision"
              ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
              : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          SISTEMA DE REVISIÓN
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. NIVEL HOY (Regla de las 3 Prioridades + Tareas del Día + Foco) */}
      {/* ======================================================== */}
      {activeLevel === "hoy" && (
        <div className="space-y-6">
          {/* DAILY FOCUS BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400">
                  Foco Temático de Hoy ({todayDayFocus?.dayName || "Hoy"})
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {todayDayFocus?.focusTitle || "Planificación y Ventas"}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                if (todayDayFocus) {
                  setEditingDayFocus(todayDayFocus);
                  setShowDayFocusModal(true);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Editar Foco
            </button>
          </div>

          {/* REGLA DE LAS 3 PRIORIDADES DE HOY */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  Regla de las 3 Prioridades
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                    {prioritiesToday.length}/3 Seleccionadas
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Las 3 tareas innegociables que moverán la aguja hoy antes de dispersar la atención.
                </p>
              </div>

              {prioritiesToday.length < 3 && (
                <button
                  onClick={() => {
                    setEditingTask({
                      id: "",
                      title: "",
                      isPriorityToday: true,
                      priority: "high",
                      area: "crecer",
                      status: "pending",
                      dueDate: todayStr
                    });
                    setShowTaskModal(true);
                  }}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir Prioridad
                </button>
              )}
            </div>

            {/* List of 3 Priorities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const task = prioritiesToday[idx];
                if (task) {
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-slate-800/80 border border-indigo-500/30 flex flex-col justify-between relative group hover:border-indigo-500/60 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                          <div>
                            <span className="text-xs font-bold text-amber-400 block mb-0.5">
                              Prioridad #{idx + 1}
                            </span>
                            <h4 className="text-sm font-semibold text-white leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleTaskPriority(task)}
                          className="text-amber-400 hover:text-slate-400 transition-colors"
                          title="Quitar de prioridades de hoy"
                        >
                          <Star className="w-4 h-4 fill-amber-400" />
                        </button>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span className={`px-2 py-0.5 rounded-full border ${getAreaColor(task.area || "crecer")}`}>
                          {task.area ? task.area.toUpperCase() : "CRECER"}
                        </span>
                        {task.dueTime && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3" /> {task.dueTime}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={`empty-${idx}`}
                      onClick={() => {
                        setEditingTask({
                          id: "",
                          title: "",
                          isPriorityToday: true,
                          priority: "high",
                          area: "crecer",
                          status: "pending",
                          dueDate: todayStr
                        });
                        setShowTaskModal(true);
                      }}
                      className="p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px] group transition-all"
                    >
                      <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 mb-1" />
                      <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300">
                        Definir Prioridad #{idx + 1}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* ALL TASKS OF TODAY */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-sky-400" />
                  Todas las Tareas de Hoy ({tasksForToday.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Organizadas por estado y prioridad
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingTask({
                    id: "",
                    title: "",
                    priority: "medium",
                    status: "pending",
                    area: "crecer",
                    dueDate: todayStr
                  });
                  setShowTaskModal(true);
                }}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Tarea
              </button>
            </div>

            {tasksForToday.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No tienes tareas programadas para hoy. ¡Agrega una para comenzar!
              </div>
            ) : (
              <div className="space-y-2">
                {tasksForToday.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      task.status === "completed"
                        ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                        : "bg-slate-800/50 border-slate-700/80 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium truncate ${
                              task.status === "completed" ? "line-through text-slate-400" : "text-white"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.isPriorityToday && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getAreaColor(task.area || "crecer")}`}>
                        {task.area ? task.area.toUpperCase() : "CRECER"}
                      </span>

                      {getPriorityBadge(task.priority)}

                      <button
                        onClick={() => handleToggleTaskPriority(task)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          task.isPriorityToday ? "text-amber-400 hover:text-slate-400" : "text-slate-500 hover:text-amber-400"
                        }`}
                        title={task.isPriorityToday ? "Quitar de 3 prioridades" : "Marcar como prioridad de hoy"}
                      >
                        <Star className={`w-4 h-4 ${task.isPriorityToday ? "fill-amber-400" : ""}`} />
                      </button>

                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setShowTaskModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. NIVEL ESTA SEMANA (Mini calendario semanal + Foco por día) */}
      {/* ======================================================== */}
      {activeLevel === "semana" && (
        <div className="space-y-6">
          {/* Week Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Semana {weekOffset === 0 ? "Actual" : weekOffset > 0 ? "Próxima (Planificación Anticipada)" : "Anterior"}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                  Semana #{currentWeekNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento de productividad operativa, resultados comerciales y prioridades diarias.
              </p>
            </div>
            
            {/* Week Navigation */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition cursor-pointer"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  weekOffset === 0 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-300 hover:bg-slate-700/60"
                }`}
              >
                Semana #{currentWeekNumber} de {new Date(Date.now() + weekOffset * 7 * 86400000).getFullYear()}
                {weekOffset === 0 ? " (Actual)" : ""}
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition cursor-pointer"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SECCIÓN: PRODUCTIVIDAD VS RESULTADOS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase tracking-wider">
                    Balance de la Semana
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Productividad vs Resultados
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Distinción clara entre el trabajo completado (actividad) y el impacto comercial real alcanzado en la semana.
                </p>
              </div>

              {!hasResultsGoal && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGoal({
                      id: "",
                      title: "Meta semanal de pedidos",
                      periodType: "week",
                      periodValue: currentWeekPeriodStr,
                      category: "ventas",
                      area: "crecer",
                      targetValue: 3,
                      currentValue: pedidosRealizados,
                      unit: "pedidos",
                      status: "en_progreso",
                      priority: "high",
                      isAutomatic: true,
                      autoMetric: "ventas_semana"
                    });
                    setShowGoalModal(true);
                  }}
                  className="text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Definir Meta de Pedidos
                </button>
              )}
            </div>

            {/* LAS 2 TARJETAS DIFERENCIADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. TARJETA PRODUCTIVIDAD */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-800/50 border border-sky-500/20 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Trabajo Ejecutado
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white mt-1.5 tracking-wide">
                      PRODUCTIVIDAD
                    </h4>
                    <p className="text-xs text-slate-400">
                      Cuánto trabajo completé
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-sky-400">
                      {weekProductivityPercent}%
                    </span>
                  </div>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-white font-bold text-lg">
                      {weekCompletedTasks.length} / {weekNonCancelledTasks.length}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">tareas</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {weekNonCancelledTasks.length - weekCompletedTasks.length} pendientes
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full mt-2 overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, weekProductivityPercent))}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400/90 pt-2 border-t border-slate-700/40 flex items-center justify-between">
                  <span>Fórmula: (tareas completadas / tareas totales) × 100</span>
                  <span className="text-slate-500 text-[10px]">Canceladas no computan</span>
                </div>
              </div>

              {/* 2. TARJETA RESULTADOS */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-800/50 border border-emerald-500/20 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <TrendingUp className="w-3 h-3" />
                      Impacto Comercial
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white mt-1.5 tracking-wide">
                      RESULTADOS
                    </h4>
                    <p className="text-xs text-slate-400">
                      Qué resultados produjo ese trabajo
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl sm:text-3xl font-black ${hasResultsGoal ? "text-emerald-400" : "text-slate-400"}`}>
                      {hasResultsGoal ? `${weekResultsPercent}%` : "—"}
                    </span>
                  </div>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline justify-between text-sm">
                    {hasResultsGoal ? (
                      <>
                        <span className="text-white font-bold text-lg">
                          {pedidosRealizados} / {metaPedidos}
                          <span className="text-xs font-normal text-slate-400 ml-1.5">pedidos</span>
                        </span>
                        <span className="text-xs text-emerald-400/90 font-medium">
                          {pedidosRealizados >= metaPedidos ? "Meta alcanzada" : `Faltan ${metaPedidos - pedidosRealizados} pedidos`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-white font-bold text-lg">
                          {pedidosRealizados}
                          <span className="text-xs font-normal text-slate-400 ml-1.5">pedidos realizados</span>
                        </span>
                        <span className="text-xs text-amber-400/90 font-medium">
                          Sin meta de pedidos
                        </span>
                      </>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full mt-2 overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${hasResultsGoal ? Math.min(100, Math.max(0, weekResultsPercent)) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400/90 pt-2 border-t border-slate-700/40 flex items-center justify-between">
                  <span>{hasResultsGoal ? "Fórmula: (pedidos realizados / meta de pedidos) × 100" : "Meta semanal no configurada"}</span>
                  <span className="text-slate-500 text-[10px]">Sincronizado con ventas</span>
                </div>
              </div>
            </div>

            {/* 3. INTERPRETACIÓN AUTOMÁTICA SIMPLE */}
            <div className={`p-4 rounded-xl border flex items-start sm:items-center gap-3 transition-colors ${
              weekInterpretation.type === "success" 
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" 
                : weekInterpretation.type === "warning"
                ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                : weekInterpretation.type === "danger"
                ? "bg-rose-950/30 border-rose-500/30 text-rose-200"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300"
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                weekInterpretation.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : weekInterpretation.type === "warning"
                  ? "bg-amber-500/20 text-amber-400"
                  : weekInterpretation.type === "danger"
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-slate-700/50 text-slate-400"
              }`}>
                {weekInterpretation.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                {weekInterpretation.type === "warning" && <AlertTriangle className="w-5 h-5" />}
                {weekInterpretation.type === "danger" && <AlertCircle className="w-5 h-5" />}
                {weekInterpretation.type === "neutral" && <Sparkles className="w-5 h-5" />}
                {weekInterpretation.type === "info" && <TrendingUp className="w-5 h-5" />}
              </div>

              <div className="flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75 block mb-0.5">
                  Interpretación de la Semana
                </span>
                <p className="text-sm font-semibold text-white tracking-wide">
                  "{weekInterpretation.text}"
                </p>
              </div>
            </div>
          </div>

          {/* 7 DÍAS: REGLA DE LAS 3 PRIORIDADES POR DÍA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Regla de las 3 Prioridades por Día
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  Máx. 3 por día
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Planifica por adelantado las 3 prioridades innegociables de cada día y mantén enfocado tu foco temático.
              </p>
            </div>

            {/* 7 Days Columns / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {weekDaysWithDates.map((day) => {
                const isToday = day.isToday;
                const focusItem = dayFocusList.find(d => d.id === day.id);
                const focusTitle = focusItem?.focusTitle || day.defaultFocus;

                // Tasks assigned to this day that are marked as priority
                const dayPriorities = tasks.filter(t => 
                  t.isPriorityToday && 
                  (t.dueDate === day.dateStr || (!t.dueDate && day.isToday))
                );

                // Other tasks scheduled for this day
                const otherDayTasks = tasks.filter(t => 
                  !t.isPriorityToday && 
                  (t.dueDate === day.dateStr || (!t.dueDate && day.isToday))
                );

                return (
                  <div
                    key={day.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isToday
                        ? "bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                        : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Day Header & Date */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/40">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${isToday ? "text-indigo-300" : "text-white"}`}>
                            {day.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {day.displayDate}
                          </span>
                        </div>
                        {isToday && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                            HOY
                          </span>
                        )}
                      </div>

                      {/* Day Focus Title */}
                      <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700/50 relative group">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Foco:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDayFocus(focusItem || { id: day.id, dayName: day.label, focusTitle: day.defaultFocus });
                              setShowDayFocusModal(true);
                            }}
                            className="text-slate-400 hover:text-indigo-300 p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                            title="Editar Foco Temático"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-200 line-clamp-2 leading-tight">
                          {focusTitle}
                        </div>
                      </div>

                      {/* Regla de las 3 Prioridades */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1 tracking-wider">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            3 Prioridades
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black border ${
                            dayPriorities.length === 3 
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {dayPriorities.length}/3
                          </span>
                        </div>

                        {/* 3 Priority Slots */}
                        <div className="space-y-1.5">
                          {[0, 1, 2].map((idx) => {
                            const task = dayPriorities[idx];
                            if (task) {
                              const isDone = task.status === "completed";
                              return (
                                <div
                                  key={task.id}
                                  className={`p-2 rounded-lg border text-left flex items-start justify-between gap-1.5 group transition-all ${
                                    isDone
                                      ? "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
                                      : "bg-slate-900/90 border-indigo-500/40 hover:border-indigo-500 text-white shadow-sm"
                                  }`}
                                >
                                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskStatus(task);
                                      }}
                                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                      title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                                    >
                                      {isDone ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <div 
                                      className="cursor-pointer flex-1 min-w-0"
                                      onClick={() => {
                                        setEditingTask(task);
                                        setShowTaskModal(true);
                                      }}
                                      title="Clic para editar detalles"
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-black text-amber-400 shrink-0">#{idx + 1}</span>
                                        <span className={`text-[11px] font-bold leading-tight truncate block ${isDone ? "line-through text-slate-500" : "text-white group-hover:text-indigo-200"}`}>
                                          {task.title}
                                        </span>
                                      </div>
                                      {task.area && (
                                        <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold inline-block mt-0.5 ${getAreaColor(task.area)}`}>
                                          {task.area.toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskPriority(task);
                                      }}
                                      className="text-amber-400 hover:text-slate-500 shrink-0 p-0.5 transition-colors cursor-pointer"
                                      title="Quitar de las 3 prioridades de este día"
                                    >
                                      <Star className="w-3 h-3 fill-amber-400" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTask(task.id);
                                      }}
                                      className="text-slate-500 hover:text-rose-400 shrink-0 p-0.5 transition-colors cursor-pointer"
                                      title="Eliminar tarea"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <button
                                  key={`empty-${day.id}-${idx}`}
                                  type="button"
                                  onClick={() => {
                                    setEditingTask({
                                      id: "",
                                      title: "",
                                      isPriorityToday: true,
                                      priority: "high",
                                      area: "crecer",
                                      status: "pending",
                                      dueDate: day.dateStr
                                    });
                                    setShowTaskModal(true);
                                  }}
                                  className="w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>Prioridad #{idx + 1}</span>
                                </button>
                              );
                            }
                          })}
                        </div>
                      </div>

                      {/* Other tasks scheduled for this day */}
                      {otherDayTasks.length > 0 && (
                        <div className="pt-2 border-t border-slate-700/40">
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                            Otras tareas ({otherDayTasks.length}):
                          </span>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                            {otherDayTasks.map(t => (
                              <div 
                                key={t.id}
                                className="flex items-center justify-between p-1 rounded bg-slate-900/40 text-[10px] text-slate-300 border border-slate-800 group hover:border-slate-700 transition"
                              >
                                <span 
                                  className="truncate flex-1 min-w-0 pr-1 cursor-pointer hover:text-indigo-300"
                                  onClick={() => {
                                    setEditingTask(t);
                                    setShowTaskModal(true);
                                  }}
                                  title="Editar tarea"
                                >
                                  {t.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {dayPriorities.length < 3 && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskPriority(t)}
                                      className="text-slate-500 hover:text-amber-400 transition shrink-0 p-0.5 cursor-pointer"
                                      title="Promover a una de las 3 Prioridades"
                                    >
                                      <Star className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(t.id)}
                                    className="text-slate-500 hover:text-rose-400 transition shrink-0 p-0.5 cursor-pointer"
                                    title="Eliminar tarea"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Day Card Footer */}
                    <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDayFocus(focusItem || { id: day.id, dayName: day.label, focusTitle: day.defaultFocus });
                          setShowDayFocusModal(true);
                        }}
                        className="text-center text-[10px] py-1 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/50 flex items-center justify-center gap-1 flex-1 cursor-pointer"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        Tema
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask({
                            id: "",
                            title: "",
                            isPriorityToday: false,
                            priority: "medium",
                            area: "crecer",
                            status: "pending",
                            dueDate: day.dateStr
                          });
                          setShowTaskModal(true);
                        }}
                        className="text-center text-[10px] py-1 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-colors border border-indigo-500/30 flex items-center justify-center gap-1 flex-1 cursor-pointer"
                        title="Agregar tarea a este día"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        Tarea
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WEEKLY GOALS & METRICS OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Rendimiento Comercial de Esta Semana
              </h3>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Ventas de la semana</span>
                  <span className="text-lg font-black text-white">{metrics.week.salesCount} pedidos</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Facturado en la semana</span>
                  <span className="text-lg font-black text-emerald-400">${metrics.week.facturado.toLocaleString("es-AR")}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Ganancia neta semana</span>
                  <span className="text-lg font-black text-indigo-400">${metrics.week.gananciaNeta.toLocaleString("es-AR")}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Unidades vendidas</span>
                  <span className="text-lg font-black text-purple-400">{metrics.week.itemsSold} u</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Metas Semanales
                </h3>
                <button
                  onClick={() => {
                    setEditingGoal({
                      id: "",
                      title: "",
                      periodType: "week",
                      periodValue: `2026-W${getWeekNumber(new Date())}`,
                      category: "ventas",
                      area: "crecer",
                      targetValue: 5,
                      currentValue: 0,
                      unit: "ventas",
                      status: "en_progreso",
                      priority: "high",
                      isAutomatic: true,
                      autoMetric: "ventas_semana"
                    });
                    setShowGoalModal(true);
                  }}
                  className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Nueva Meta
                </button>
              </div>

              {goals.filter(g => g.periodType === "week").length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No hay metas asignadas específicamente para esta semana.
                </div>
              ) : (
                <div className="space-y-2">
                  {goals.filter(g => g.periodType === "week").map(g => {
                    const pct = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
                    return (
                      <div key={g.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{g.title}</span>
                          <span className="font-bold text-indigo-400">{g.currentValue} / {g.targetValue} {g.unit} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-400" : "bg-indigo-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. NIVEL ESTE MES (Objetivos Mensuales con Progreso Automático/Manual) */}
      {/* ======================================================== */}
      {activeLevel === "mes" && (
        <div className="space-y-6">
          {/* MONTHLY SUMMARY CARD */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Mes de Planificación: {selectedMonth}
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Objetivos Estratégicos Mensuales
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Los objetivos marcados con <Sparkles className="w-3 h-3 inline text-indigo-400" /> se actualizan en tiempo real directamente con los datos de ventas y stock de JUEM.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingGoal({
                      id: "",
                      title: "",
                      periodType: "month",
                      periodValue: selectedMonth,
                      category: "ventas",
                      area: "crecer",
                      targetValue: 20,
                      currentValue: 0,
                      unit: "ventas",
                      status: "en_progreso",
                      priority: "high",
                      isAutomatic: true,
                      autoMetric: "ventas_mes"
                    });
                    setShowGoalModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Crear Objetivo
                </button>
              </div>
            </div>
          </div>

          {/* OBJECTIVES LIST */}
          <div className="space-y-3">
            {monthGoals.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-500">
                No hay objetivos registrados para el mes de {selectedMonth}. ¡Crea uno para comenzar!
              </div>
            ) : (
              monthGoals.map((goal) => {
                const percent = goal.targetValue > 0
                  ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
                  : (goal.currentValue === 0 ? 100 : 0);
                const isDone = goal.status === "cumplido";

                return (
                  <div
                    key={goal.id}
                    className={`p-4 rounded-2xl border transition-all shadow-md ${
                      isDone
                        ? "bg-emerald-950/15 border-emerald-500/30"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getAreaColor(goal.area || "crecer")}`}>
                            {goal.area ? goal.area.toUpperCase() : "CRECER"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700 capitalize">
                            {goal.category.replace("_", " ")}
                          </span>
                          {getPriorityBadge(goal.priority)}
                          {goal.isAutomatic ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/20 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-400" /> Automático
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-medium border border-slate-700">
                              Manual
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          {goal.title}
                          {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                        </h3>

                        {goal.description && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {goal.description}
                          </p>
                        )}
                      </div>

                      {/* Current Value / Target Value & Controls */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-white">
                            {goal.unit === "$" ? `$${goal.currentValue.toLocaleString("es-AR")}` : goal.currentValue}{" "}
                            <span className="text-xs text-slate-400 font-normal">
                              / {goal.unit === "$" ? `$${goal.targetValue.toLocaleString("es-AR")}` : goal.targetValue} {goal.unit !== "$" ? goal.unit : ""}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-indigo-400">
                            {percent}% completado
                          </div>
                        </div>

                        {/* Quick +/- controls for manual goals */}
                        {!goal.isAutomatic && (
                          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                            <button
                              onClick={() => handleAdjustGoalValue(goal, -1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-bold"
                              title="Restar 1"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleAdjustGoalValue(goal, 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-bold"
                              title="Sumar 1"
                            >
                              +1
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingGoal(goal);
                              setShowGoalModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                            title="Editar objetivo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                            title="Eliminar objetivo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : percent >= 75
                            ? "bg-gradient-to-r from-indigo-500 to-emerald-400"
                            : "bg-gradient-to-r from-indigo-600 to-violet-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. NIVEL ÁREAS DE TRABAJO (Crecer / Mantener / Mejorar) */}
      {/* ======================================================== */}
      {activeLevel === "areas" && (
        <div className="space-y-6">
          {/* Explanatory cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setAreaFilter(areaFilter === "crecer" ? "todas" : "crecer")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                areaFilter === "crecer"
                  ? "bg-emerald-950/30 border-emerald-500/60 ring-2 ring-emerald-500/20"
                  : "bg-slate-900/80 border-slate-800 hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Área 1: CRECER
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {goals.filter(g => g.area === "crecer").length} metas
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Nuevos ingresos y expansión</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ventas activas, nuevos diseños de impresión 3D, publicaciones, redes y Mercado Libre.
              </p>
            </div>

            <div
              onClick={() => setAreaFilter(areaFilter === "mantener" ? "todas" : "mantener")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                areaFilter === "mantener"
                  ? "bg-sky-950/30 border-sky-500/60 ring-2 ring-sky-500/20"
                  : "bg-slate-900/80 border-slate-800 hover:border-sky-500/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Área 2: MANTENER
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                  {goals.filter(g => g.area === "mantener").length} metas
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Operativa y sostenibilidad</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Despacho de pedidos, control de inventario/stock, atención al cliente y pagos al día.
              </p>
            </div>

            <div
              onClick={() => setAreaFilter(areaFilter === "mejorar" ? "todas" : "mejorar")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                areaFilter === "mejorar"
                  ? "bg-purple-950/30 border-purple-500/60 ring-2 ring-purple-500/20"
                  : "bg-slate-900/80 border-slate-800 hover:border-purple-500/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Área 3: MEJORAR
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                  {goals.filter(g => g.area === "mejorar").length} metas
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Optimización y rentabilidad</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Automatización de procesos, reducción de costos, optimización de márgenes y organización.
              </p>
            </div>
          </div>

          {/* Grouped view of tasks & goals according to filter */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white capitalize">
                Objetivos y Tareas del Área: {areaFilter.toUpperCase()}
              </h3>
              {areaFilter !== "todas" && (
                <button
                  onClick={() => setAreaFilter("todas")}
                  className="text-xs text-indigo-400 hover:text-white"
                >
                  Ver todas las áreas
                </button>
              )}
            </div>

            <div className="space-y-3">
              {goals
                .filter(g => areaFilter === "todas" || g.area === areaFilter)
                .map((g) => (
                  <div key={g.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getAreaColor(g.area || "crecer")}`}>
                          {g.area ? g.area.toUpperCase() : "CRECER"}
                        </span>
                        <span className="text-sm font-bold text-white">{g.title}</span>
                      </div>
                      {g.description && <p className="text-xs text-slate-400 mt-0.5">{g.description}</p>}
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-white">
                        {g.currentValue} / {g.targetValue} {g.unit}
                      </span>
                      <span className="block text-[11px] text-indigo-400">
                        {g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. NIVEL SISTEMA DE REVISIÓN (Semanal con preguntas & Mensual con métricas) */}
      {/* ======================================================== */}
      {activeLevel === "revision" && (
        <div className="space-y-6">
          {/* Subtabs: Semanal vs Mensual */}
          <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 w-fit">
            <button
              onClick={() => setReviewTab("weekly")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                reviewTab === "weekly"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Revisión Semanal (Reflexión)
            </button>
            <button
              onClick={() => setReviewTab("monthly")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                reviewTab === "monthly"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Revisión Mensual (Comparativa)
            </button>
          </div>

          {reviewTab === "weekly" ? (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Revisión Semanal de Cierre
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Dedica 10 minutos cada fin de semana para responder estas 4 preguntas clave y evitar repetir errores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 1. ¿Qué funcionó esta semana?
                  </label>
                  <textarea
                    rows={4}
                    value={reviewWhatWorked}
                    onChange={(e) => setReviewWhatWorked(e.target.value)}
                    placeholder="Ej: La publicación del organizador 3D generó 3 consultas. Los envíos de Pinamar salieron a tiempo..."
                    className="w-full bg-slate-800/90 text-white text-xs sm:text-sm p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> 2. ¿Qué no funcionó?
                  </label>
                  <textarea
                    rows={4}
                    value={reviewWhatDidntWork}
                    onChange={(e) => setReviewWhatDidntWork(e.target.value)}
                    placeholder="Ej: Faltó filamento negro para terminar el lote. No respondí a tiempo los mensajes de Mercado Libre..."
                    className="w-full bg-slate-800/90 text-white text-xs sm:text-sm p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 3. ¿En qué perdí tiempo?
                  </label>
                  <textarea
                    rows={4}
                    value={reviewTimeWasters}
                    onChange={(e) => setReviewTimeWasters(e.target.value)}
                    placeholder="Ej: Diseñando un modelo que no tenía demanda comprobada. Resolviendo problemas de configuración..."
                    className="w-full bg-slate-800/90 text-white text-xs sm:text-sm p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> 4. ¿Qué debo cambiar la próxima semana?
                  </label>
                  <textarea
                    rows={4}
                    value={reviewWhatToChange}
                    onChange={(e) => setReviewWhatToChange(e.target.value)}
                    placeholder="Ej: Ajustar precios con comisión de ML. Dejar programadas las 3 prioridades del lunes desde el domingo..."
                    className="w-full bg-slate-800/90 text-white text-xs sm:text-sm p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="text-xs text-emerald-400 font-semibold">
                  {reviewSuccessMsg && "¡Revisión guardada con éxito en la base de datos!"}
                </div>
                <button
                  onClick={handleSaveReview}
                  disabled={savingReview}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingReview ? "Guardando..." : "Guardar Revisión Semanal"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Comparativa de Rendimiento Mensual
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evolución automática frente al mes anterior ({metrics.prevMonth ? "Mes Anterior" : "Histórico"})
                </p>
              </div>

              {/* Comparative Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-semibold">Métrica Clave</th>
                      <th className="pb-3 font-semibold">Mes Anterior</th>
                      <th className="pb-3 font-semibold">Mes Actual ({selectedMonth})</th>
                      <th className="pb-3 font-semibold text-right">Variación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-400" /> Pedidos Aprobados
                      </td>
                      <td className="py-3 text-slate-400">{metrics.prevMonth.salesCount} ventas</td>
                      <td className="py-3 font-bold text-white">{metrics.month.salesCount} ventas</td>
                      <td className="py-3 text-right">
                        {metrics.month.salesCount >= metrics.prevMonth.salesCount ? (
                          <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{metrics.month.salesCount - metrics.prevMonth.salesCount}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold inline-flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            {metrics.month.salesCount - metrics.prevMonth.salesCount}
                          </span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" /> Facturación Neta
                      </td>
                      <td className="py-3 text-slate-400">${metrics.prevMonth.facturado.toLocaleString("es-AR")}</td>
                      <td className="py-3 font-bold text-white">${metrics.month.facturado.toLocaleString("es-AR")}</td>
                      <td className="py-3 text-right">
                        {metrics.month.facturado >= metrics.prevMonth.facturado ? (
                          <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +${(metrics.month.facturado - metrics.prevMonth.facturado).toLocaleString("es-AR")}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold inline-flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            -${Math.abs(metrics.month.facturado - metrics.prevMonth.facturado).toLocaleString("es-AR")}
                          </span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" /> Ganancia Neta Real
                      </td>
                      <td className="py-3 text-slate-400">${metrics.prevMonth.gananciaNeta.toLocaleString("es-AR")}</td>
                      <td className="py-3 font-bold text-white">${metrics.month.gananciaNeta.toLocaleString("es-AR")}</td>
                      <td className="py-3 text-right">
                        {metrics.month.gananciaNeta >= metrics.prevMonth.gananciaNeta ? (
                          <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +${(metrics.month.gananciaNeta - metrics.prevMonth.gananciaNeta).toLocaleString("es-AR")}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold inline-flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            -${Math.abs(metrics.month.gananciaNeta - metrics.prevMonth.gananciaNeta).toLocaleString("es-AR")}
                          </span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-sky-400" /> Artículos Vendidos
                      </td>
                      <td className="py-3 text-slate-400">{metrics.prevMonth.itemsSold} u</td>
                      <td className="py-3 font-bold text-white">{metrics.month.itemsSold} u</td>
                      <td className="py-3 text-right">
                        <span className="text-slate-300 font-medium">
                          {metrics.month.itemsSold - metrics.prevMonth.itemsSold >= 0 ? "+" : ""}
                          {metrics.month.itemsSold - metrics.prevMonth.itemsSold} u
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR OBJETIVO */}
      {/* ======================================================== */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                {editingGoal?.id ? "Editar Objetivo" : "Nuevo Objetivo"}
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                const payload = {
                  title: formData.get("title"),
                  description: formData.get("description"),
                  category: formData.get("category"),
                  area: formData.get("area"),
                  periodType: formData.get("periodType"),
                  periodValue: formData.get("periodValue") || selectedMonth,
                  dueDate: formData.get("dueDate"),
                  targetValue: parseFloat(formData.get("targetValue") as string) || 0,
                  currentValue: parseFloat(formData.get("currentValue") as string) || 0,
                  unit: formData.get("unit"),
                  status: formData.get("status"),
                  priority: formData.get("priority"),
                  isAutomatic: formData.get("isAutomatic") === "true",
                  autoMetric: formData.get("autoMetric") || null
                };

                try {
                  const url = editingGoal?.id
                    ? `/api/planning/goals/${editingGoal.id}`
                    : "/api/planning/goals";
                  const method = editingGoal?.id ? "PUT" : "POST";

                  const res = await fetch(url, {
                    method,
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    setShowGoalModal(false);
                    fetchPlanningData();
                  }
                } catch (err) {
                  console.error("Error saving goal:", err);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título del Objetivo *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingGoal?.title || ""}
                  placeholder="Ej: Facturar $50.000 / Crear 4 productos 3D"
                  className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción / Notas</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingGoal?.description || ""}
                  placeholder="Detalles de la meta o estrategia a aplicar"
                  className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Área Estratégica</label>
                  <select
                    name="area"
                    defaultValue={editingGoal?.area || "crecer"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="crecer">Crecer (Ventas / Marketing / 3D)</option>
                    <option value="mantener">Mantener (Operativa / Pedidos / Stock)</option>
                    <option value="mejorar">Mejorar (Optimización / Procesos)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría</label>
                  <select
                    name="category"
                    defaultValue={editingGoal?.category || "ventas"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="ventas">Ventas</option>
                    <option value="facturacion">Facturación</option>
                    <option value="ganancia">Ganancia</option>
                    <option value="productos_3d">Productos 3D</option>
                    <option value="publicaciones">Publicaciones</option>
                    <option value="mercado_libre">Mercado Libre</option>
                    <option value="redes_sociales">Redes Sociales</option>
                    <option value="investigacion">Investigación</option>
                    <option value="stock">Stock</option>
                    <option value="organizacion">Organización</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Meta Numérica</label>
                  <input
                    name="targetValue"
                    type="number"
                    step="any"
                    required
                    defaultValue={editingGoal?.targetValue || 10}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Valor Actual</label>
                  <input
                    name="currentValue"
                    type="number"
                    step="any"
                    defaultValue={editingGoal?.currentValue || 0}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unidad</label>
                  <input
                    name="unit"
                    defaultValue={editingGoal?.unit || "u"}
                    placeholder="$, ventas, u, prod"
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Período</label>
                  <select
                    name="periodType"
                    defaultValue={editingGoal?.periodType || "month"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="month">Mensual</option>
                    <option value="week">Semanal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha Límite</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editingGoal?.dueDate || ""}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Prioridad</label>
                  <select
                    name="priority"
                    defaultValue={editingGoal?.priority || "medium"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Estado</label>
                  <select
                    name="status"
                    defaultValue={editingGoal?.status || "en_progreso"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="en_progreso">En Progreso</option>
                    <option value="cumplido">Cumplido</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Sincronización Automática con JUEM */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Seguimiento Automático
                  </span>
                  <select
                    name="isAutomatic"
                    defaultValue={editingGoal?.isAutomatic ? "true" : "false"}
                    className="bg-slate-900 text-xs text-indigo-300 px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    <option value="true">Sí (Conectar a JUEM)</option>
                    <option value="false">No (Progreso Manual)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Métrica del Sistema a monitorear:</label>
                  <select
                    name="autoMetric"
                    defaultValue={editingGoal?.autoMetric || "ventas_mes"}
                    className="w-full bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700"
                  >
                    <option value="ventas_mes">Ventas del Mes (Pedidos aprobados)</option>
                    <option value="facturacion_mes">Facturación Neta del Mes ($)</option>
                    <option value="ganancia_mes">Ganancia Neta Real del Mes ($)</option>
                    <option value="productos_vendidos_mes">Unidades Vendidas en el Mes</option>
                    <option value="productos_publicados">Productos Publicados Activos</option>
                    <option value="productos_3d">Catálogo de Productos 3D</option>
                    <option value="stock_total">Stock Total Disponible</option>
                    <option value="stock_quiebre">Quiebres de Stock (Meta 0)</option>
                    <option value="ventas_semana">Ventas de la Semana</option>
                    <option value="facturacion_semana">Facturación de la Semana ($)</option>
                    <option value="ganancia_semana">Ganancia Neta de la Semana ($)</option>
                  </select>
                </div>
              </div>

              <input type="hidden" name="periodValue" value={editingGoal?.periodValue || selectedMonth} />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  Guardar Objetivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR TAREA */}
      {/* ======================================================== */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingTask?.isPriorityToday ? (
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                ) : (
                  <CheckSquare className="w-5 h-5 text-indigo-400" />
                )}
                {editingTask?.id 
                  ? "Editar Tarea" 
                  : (editingTask?.isPriorityToday ? "Definir Prioridad del Día" : "Nueva Tarea")}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                const payload = {
                  title: formData.get("title"),
                  description: formData.get("description"),
                  area: formData.get("area"),
                  priority: formData.get("priority"),
                  status: formData.get("status"),
                  dueDate: formData.get("dueDate"),
                  dueTime: formData.get("dueTime"),
                  isPriorityToday: formData.get("isPriorityToday") === "true"
                };

                try {
                  const url = editingTask?.id
                    ? `/api/admin-tasks/${editingTask.id}`
                    : "/api/admin-tasks";
                  const method = editingTask?.id ? "PUT" : "POST";

                  const res = await fetch(url, {
                    method,
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    setShowTaskModal(false);
                    fetchPlanningData();
                    if (onRefreshTasks) onRefreshTasks();
                  } else {
                    const data = await res.json().catch(() => ({}));
                    setErrorMsg(data.message || "No se pudo guardar la tarea.");
                  }
                } catch (err: any) {
                  console.error("Error saving task:", err);
                  setErrorMsg("Error al conectar con el servidor para guardar la tarea.");
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título de la Tarea / Prioridad *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingTask?.title || ""}
                  placeholder="Ej: Publicar organizador 3D en Mercado Libre"
                  className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción / Notas</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingTask?.description || ""}
                  placeholder="Detalles, enlaces o contactos clave"
                  className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Área</label>
                  <select
                    name="area"
                    defaultValue={editingTask?.area || "crecer"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="crecer">Crecer</option>
                    <option value="mantener">Mantener</option>
                    <option value="mejorar">Mejorar</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nivel de Importancia</label>
                  <select
                    name="priority"
                    defaultValue={editingTask?.priority || "high"}
                    className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="high">Alta (Prioritaria)</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha Asignada</label>
                    <input
                      name="dueDate"
                      id="task-modal-duedate-input"
                      type="date"
                      defaultValue={editingTask?.dueDate || todayStr}
                      className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Hora (opcional)</label>
                    <input
                      name="dueTime"
                      type="time"
                      defaultValue={editingTask?.dueTime || ""}
                      className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700"
                    />
                  </div>
                </div>

                {/* Quick days selector for fast advance planning */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5">
                  {weekDaysWithDates.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("task-modal-duedate-input") as HTMLInputElement;
                        if (input) input.value = d.dateStr;
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 transition shrink-0 cursor-pointer"
                    >
                      {d.label.substring(0, 3)} {d.displayDate}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ¿Destacar en las 3 Prioridades?
                  </span>
                  <span className="text-[11px] text-slate-400">Regla de las 3 Prioridades del día</span>
                </div>
                <select
                  name="isPriorityToday"
                  defaultValue={editingTask?.isPriorityToday ? "true" : "false"}
                  className="bg-slate-900 text-xs text-amber-300 px-2.5 py-1 rounded-lg border border-slate-700 font-bold"
                >
                  <option value="false">No</option>
                  <option value="true">Sí (Prioridad)</option>
                </select>
              </div>

              <input type="hidden" name="status" value={editingTask?.status || "pending"} />

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                {editingTask?.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteTask(editingTask.id);
                      setShowTaskModal(false);
                    }}
                    className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs sm:text-sm rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Eliminar esta tarea definitivamente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Tarea
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Guardar Tarea
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR FOCO DE DÍA */}
      {/* ======================================================== */}
      {showDayFocusModal && editingDayFocus && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Tema del {editingDayFocus.dayName}
              </h3>
              <button onClick={() => setShowDayFocusModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const focusTitle = formData.get("focusTitle") as string;

                try {
                  const res = await fetch(`/api/planning/day-focus/${editingDayFocus.id}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ focusTitle })
                  });
                  if (res.ok) {
                    setShowDayFocusModal(false);
                    fetchPlanningData();
                  }
                } catch (err) {
                  console.error("Error saving day focus:", err);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Enfoque / Bloque Temático
                </label>
                <input
                  name="focusTitle"
                  required
                  defaultValue={editingDayFocus.focusTitle}
                  placeholder="Ej: Diseño 3D / Producción"
                  className="w-full bg-slate-800 text-white text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDayFocusModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
