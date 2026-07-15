import React, { useState, useEffect, useMemo } from "react";
import { AdminTask } from "../types";
import { normalizeText } from "../utils/shopLogic.tsx";
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  Calendar,
  Tag,
  Search,
  Building2,
  Truck,
  HelpCircle,
  Clock,
  Send,
  Lightbulb,
  Bell,
  Check,
  Edit2,
  X,
  RefreshCw
} from "lucide-react";

interface DashboardTasksProps {
  onRefreshStore?: () => Promise<void>;
  onRefreshTasks?: () => void | Promise<void>;
}

export const DashboardTasks: React.FC<DashboardTasksProps> = ({ onRefreshStore, onRefreshTasks }) => {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"task" | "idea" | "reminder">("task");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [category, setCategory] = useState("otros");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "task" | "idea" | "reminder">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("pending");

  // Fetch admin tasks from backend
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("apex_admin_token");
      if (!token) {
        setError("Inicie sesión como administrador para ver las tareas.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin-tasks", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error("Error parsing admin-tasks JSON:", jsonErr);
        }
      }

      if (response.ok && data && data.success) {
        setTasks(data.tasks || []);
      } else {
        setError(data?.message || `Error al cargar las notas de gestión (Código ${response.status}).`);
      }
    } catch (err: any) {
      setError("Error de comunicación con el servidor. Por favor, intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Save new or updated task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const token = localStorage.getItem("apex_admin_token");
    if (!token) {
      alert("Inicie sesión como administrador.");
      return;
    }

    setIsSubmitting(true);
    const url = editingId ? `/api/admin-tasks/${editingId}` : "/api/admin-tasks";
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status: "pending", // Reset or preserve
          category,
          dueDate: dueDate || null
        })
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error("Error parsing response JSON:", jsonErr);
        }
      }

      if (response.ok && data && data.success) {
        // Reset form
        setTitle("");
        setDescription("");
        setType("task");
        setPriority("medium");
        setCategory("otros");
        setDueDate("");
        setEditingId(null);
        
        // Refresh local task list
        await fetchTasks();
        if (onRefreshStore) await onRefreshStore();
        if (onRefreshTasks) await onRefreshTasks();
      } else {
        alert(data?.message || `Error al guardar el recordatorio (Código ${response.status}).`);
      }
    } catch (err) {
      alert("Error de comunicación con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle completed status
  const handleToggleStatus = async (task: AdminTask) => {
    const newStatus = task.status === "pending" ? "completed" : "pending";
    const token = localStorage.getItem("apex_admin_token");
    if (!token) return;

    try {
      const response = await fetch(`/api/admin-tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          status: newStatus,
          category: task.category,
          dueDate: task.dueDate || null
        })
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {}
      }

      if (response.ok && data && data.success) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        if (onRefreshStore) await onRefreshStore();
        if (onRefreshTasks) await onRefreshTasks();
      }
    } catch (err) {
      console.error("Error toggling task status:", err);
    }
  };

  // Delete task
  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este recordatorio?")) return;
    const token = localStorage.getItem("apex_admin_token");
    if (!token) return;

    try {
      const response = await fetch(`/api/admin-tasks/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {}
      }

      if (response.ok && data && data.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
        if (onRefreshStore) await onRefreshStore();
        if (onRefreshTasks) await onRefreshTasks();
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // Set form to edit mode
  const startEdit = (task: AdminTask) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setType(task.type);
    setPriority(task.priority);
    setCategory(task.category || "otros");
    setDueDate(task.dueDate || "");
    
    // Scroll form into view in mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setType("task");
    setPriority("medium");
    setCategory("otros");
    setDueDate("");
  };

  // Helper to prefill template drafts
  const handleApplyTemplate = (tpl: { title: string; desc: string; type: "task" | "idea" | "reminder"; priority: "high" | "medium" | "low"; cat: string }) => {
    setTitle(tpl.title);
    setDescription(tpl.desc);
    setType(tpl.type);
    setPriority(tpl.priority);
    setCategory(tpl.cat);
  };

  // Prefill templates
  const templates = [
    {
      title: "Coordinación con encargado de Montevideo",
      desc: "Hablar con el encargado de Montevideo sobre la viabilidad de enviar paquetes directamente a las agencias en Tres Cruces (XXX), costos asociados y si definimos zonas de envíos gratis.",
      type: "task" as const,
      priority: "high" as const,
      cat: "sucursal_mvd"
    },
    {
      title: "Estudiar Zonas de Envíos Gratis",
      desc: "Analizar zonas cercanas a los depósitos para habilitar envíos sin costo como estrategia de marketing para aumentar el ticket promedio.",
      type: "idea" as const,
      priority: "medium" as const,
      cat: "logistica"
    },
    {
      title: "Revisar tarifas de DAC y agencias",
      desc: "Solicitar lista de precios actualizada a las agencias de transporte para optimizar los costos de envío al interior del país.",
      type: "task" as const,
      priority: "medium" as const,
      cat: "logistica"
    }
  ];

  // Map category code to human readable name
  const getCategoryName = (catCode?: string) => {
    switch (catCode) {
      case "sucursal_mvd": return "Sucursal MVD";
      case "sucursal_pinamar": return "Sucursal Pinamar";
      case "logistica": return "Logística y Envíos";
      case "marketing": return "Ventas y Marketing";
      case "sistemas": return "Web y Sistemas";
      default: return "Otros";
    }
  };

  // Get Category icon
  const getCategoryIcon = (catCode?: string) => {
    switch (catCode) {
      case "sucursal_mvd":
      case "sucursal_pinamar":
        return <Building2 className="h-3 w-3" />;
      case "logistica":
        return <Truck className="h-3 w-3" />;
      default:
        return <Tag className="h-3 w-3" />;
    }
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Generate WhatsApp contact text for tasks/ideas to send to partners
  const getShareWhatsAppLink = (task: AdminTask) => {
    const text = `🌸 *JUEM Tienda - Recordatorio de Gestión* 🌸\n\n` +
      `📌 *Asunto:* ${task.title}\n` +
      (task.description ? `📝 *Detalles:* ${task.description}\n` : "") +
      `⚠️ *Prioridad:* ${task.priority === "high" ? "🔴 Alta" : task.priority === "medium" ? "🟡 Media" : "🟢 Baja"}\n` +
      `📂 *Área:* ${getCategoryName(task.category)}\n\n` +
      `_Enviado desde el Asistente de Gestión de JUEM._`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Filters logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search
      let searchMatch = true;
      if (searchQuery.trim() !== "") {
        const normQ = normalizeText(searchQuery);
        const collapsedQ = normQ.replace(/\s+/g, "");

        const titleNorm = normalizeText(task.title || "");
        const descNorm = normalizeText(task.description || "");

        searchMatch = 
          titleNorm.includes(normQ) ||
          (collapsedQ.length >= 2 && titleNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
          descNorm.includes(normQ) ||
          (collapsedQ.length >= 2 && descNorm.replace(/\s+/g, "").includes(collapsedQ));
      }

      // Type
      const typeMatch = filterType === "all" || task.type === filterType;

      // Category
      const catMatch = filterCategory === "all" || task.category === filterCategory;

      // Priority
      const prioMatch = filterPriority === "all" || task.priority === filterPriority;

      // Status
      const statusMatch = filterStatus === "all" || task.status === filterStatus;

      return searchMatch && typeMatch && catMatch && prioMatch && statusMatch;
    });
  }, [tasks, searchQuery, filterType, filterCategory, filterPriority, filterStatus]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const high = tasks.filter(t => t.status === "pending" && t.priority === "high").length;
    const ideas = tasks.filter(t => t.type === "idea").length;
    return { total, pending, completed, high, ideas };
  }, [tasks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT 1 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Notas</span>
            <p className="text-2xl font-black text-white">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center text-zinc-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* STAT 2 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Pendientes</span>
            <p className="text-2xl font-black text-amber-400">{metrics.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Circle className="h-5 w-5" />
          </div>
        </div>

        {/* STAT 3 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Completadas</span>
            <p className="text-2xl font-black text-emerald-400">{metrics.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* STAT 4 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Prioridad Alta</span>
            <p className="text-2xl font-black text-rose-400">{metrics.high}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: FORM */}
        <div className="xl:col-span-1 space-y-5">
          {/* CREATE/EDIT FORM CARD */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>{editingId ? "Editar Anotación" : "Anotar Nueva Idea / Tarea"}</span>
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Título / Qué hacer</label>
                <input
                  type="text"
                  required
                  value={title}
                  placeholder="Ej: Consultar envío gratis Tres Cruces"
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-650 outline-none shadow-inner"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Detalles / Anotaciones adicionales</label>
                <textarea
                  rows={4}
                  value={description}
                  placeholder="Ingresa notas, números de teléfono, ideas que quieras recordar, o puntos a tratar..."
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-650 outline-none shadow-inner resize-none leading-relaxed"
                />
              </div>

              {/* Type, Priority, Category fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="task">📋 Tarea</option>
                    <option value="idea">💡 Idea / Proyecto</option>
                    <option value="reminder">⏰ Recordatorio</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="high">🔴 Alta</option>
                    <option value="medium">🟡 Media</option>
                    <option value="low">🟢 Baja</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Categoría / Área</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="sucursal_mvd">🏢 Sucursal MVD</option>
                    <option value="sucursal_pinamar">🏢 Sucursal Pinamar</option>
                    <option value="logistica">📦 Logística y Envíos</option>
                    <option value="marketing">📈 Ventas y Marketing</option>
                    <option value="sistemas">💻 Web y Sistemas</option>
                    <option value="otros">⚙️ Otros / General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Fecha Límite</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{editingId ? "Guardar Cambios" : "Agregar Recordatorio"}</span>
              </button>
            </form>
          </div>

          {/* TEMPLATE SUGGESTIONS CARD */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl shadow-lg space-y-3.5">
            <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span>Plantillas Rápidas de Gestión</span>
            </h5>
            <p className="text-[11px] text-zinc-450 leading-relaxed">
              Haz clic en cualquier sugerencia a continuación para rellenar el formulario de inmediato con ideas predefinidas de logística:
            </p>
            <div className="space-y-2.5 pt-1">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full p-2.5 bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl text-left text-xs font-bold transition-all text-zinc-300 hover:text-white flex flex-col gap-1 cursor-pointer"
                >
                  <span className="text-zinc-200 font-extrabold flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${tpl.priority === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
                    {tpl.title}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium line-clamp-2 leading-relaxed">
                    {tpl.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIST & BOARDS */}
        <div className="xl:col-span-2 space-y-4">
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar tareas, ideas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-500 outline-none shadow-inner"
                />
              </div>

              {/* Filter Area/Category */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 outline-none cursor-pointer"
                >
                  <option value="all">📁 Todas las Áreas</option>
                  <option value="sucursal_mvd">🏢 Sucursal MVD</option>
                  <option value="sucursal_pinamar">🏢 Sucursal Pinamar</option>
                  <option value="logistica">📦 Logística y Envíos</option>
                  <option value="marketing">📈 Ventas y Marketing</option>
                  <option value="sistemas">💻 Web y Sistemas</option>
                  <option value="otros">⚙️ Otros</option>
                </select>
              </div>

              {/* Filter Priority */}
              <div>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 outline-none cursor-pointer"
                >
                  <option value="all">⚠️ Todas las Prioridades</option>
                  <option value="high">🔴 Alta</option>
                  <option value="medium">🟡 Media</option>
                  <option value="low">🟢 Baja</option>
                </select>
              </div>
            </div>

            {/* Sub-tabs for quick filter by status & type */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/30">
              {/* Type Tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1 border border-zinc-850 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterType === "all" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Todo
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("task")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${filterType === "task" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <Clock className="h-3 w-3" />
                  <span>Tareas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("idea")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${filterType === "idea" ? "bg-amber-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <Lightbulb className="h-3 w-3" />
                  <span>Ideas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("reminder")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${filterType === "reminder" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <Bell className="h-3 w-3" />
                  <span>Alertas</span>
                </button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1 border border-zinc-850 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterStatus("pending")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterStatus === "pending" ? "bg-zinc-800 text-amber-400 font-extrabold" : "text-zinc-500"}`}
                >
                  Pendientes
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("completed")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterStatus === "completed" ? "bg-zinc-800 text-emerald-400 font-extrabold" : "text-zinc-500"}`}
                >
                  Completadas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterStatus === "all" ? "bg-zinc-800 text-white font-extrabold" : "text-zinc-500"}`}
                >
                  Historial
                </button>
              </div>
            </div>
          </div>

          {/* LIST CARD CONTAINER */}
          <div className="space-y-3.5">
            {loading ? (
              <div className="text-center py-12 bg-zinc-900/20 border border-zinc-800/40 rounded-2xl">
                <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-bold">Cargando tus notas y tareas de gestión...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center bg-rose-900/10 border border-rose-800/30 text-rose-400 rounded-2xl text-xs font-bold space-y-2">
                <AlertCircle className="h-6 w-6 mx-auto" />
                <p>{error}</p>
                <button
                  onClick={fetchTasks}
                  className="px-4 py-1.5 bg-rose-950/50 border border-rose-800/40 text-[10px] font-bold rounded-lg hover:bg-rose-950 text-white transition-all cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/20 border border-zinc-800/40 rounded-2xl p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/30 border border-zinc-700/20 flex items-center justify-center text-zinc-500 mx-auto">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-zinc-300 uppercase tracking-wider">No se encontraron recordatorios</p>
                  <p className="text-[11px] text-zinc-550 max-w-xs mx-auto leading-relaxed">
                    Usa el formulario de la izquierda o carga una de las plantillas rápidas para anotar tus pendientes o ideas de envío.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredTasks.map((task) => {
                  const isPending = task.status === "pending";
                  const isHigh = task.priority === "high";
                  const isMed = task.priority === "medium";

                  return (
                    <div
                      key={task.id}
                      className={`group relative overflow-hidden bg-zinc-900/40 hover:bg-zinc-900/60 border rounded-2xl p-4.5 transition-all flex items-start gap-4 shadow-sm ${
                        !isPending ? "border-zinc-850/60 opacity-60" : "border-zinc-800/80 hover:border-zinc-700/80"
                      }`}
                    >
                      {/* Priority left line bar indicator */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-[4px] ${
                          isHigh ? "bg-rose-500" : isMed ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />

                      {/* Complete status checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(task)}
                        className={`mt-1 flex-shrink-0 transition-transform active:scale-90 cursor-pointer ${
                          !isPending ? "text-emerald-500" : "text-zinc-650 hover:text-zinc-400"
                        }`}
                        title={isPending ? "Marcar como completado" : "Reabrir tarea"}
                      >
                        {!isPending ? (
                          <CheckCircle className="h-4.5 w-4.5 fill-emerald-500/10" />
                        ) : (
                          <Circle className="h-4.5 w-4.5" />
                        )}
                      </button>

                      {/* Content block */}
                      <div className="flex-grow space-y-2">
                        {/* Title & Icons */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Type badge */}
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                task.type === "idea"
                                  ? "bg-amber-950/40 border-amber-800/40 text-amber-400"
                                  : task.type === "reminder"
                                  ? "bg-rose-950/40 border-rose-800/40 text-rose-400"
                                  : "bg-indigo-950/40 border-indigo-800/40 text-indigo-400"
                              }`}
                            >
                              {task.type === "idea" ? (
                                <Lightbulb className="h-2.5 w-2.5" />
                              ) : task.type === "reminder" ? (
                                <Bell className="h-2.5 w-2.5" />
                              ) : (
                                <Clock className="h-2.5 w-2.5" />
                              )}
                              <span>{task.type === "idea" ? "Idea" : task.type === "reminder" ? "Recordatorio" : "Tarea"}</span>
                            </span>

                            {/* Category badge */}
                            <span className="text-[9px] font-black text-zinc-400 border border-zinc-800 bg-zinc-950/50 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider">
                              {getCategoryIcon(task.category)}
                              <span>{getCategoryName(task.category)}</span>
                            </span>

                            {/* Priority badge */}
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                isHigh
                                  ? "text-rose-400"
                                  : isMed
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {isHigh ? "⚡ Urgente" : isMed ? "Media" : "Baja"}
                            </span>
                          </div>

                          <h4
                            className={`text-xs font-black leading-tight tracking-tight text-white transition-all ${
                              !isPending ? "line-through text-zinc-500 decoration-zinc-700 decoration-1.5" : ""
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p
                            className={`text-[11px] leading-relaxed font-medium whitespace-pre-wrap ${
                              !isPending ? "text-zinc-650" : "text-zinc-400"
                            }`}
                          >
                            {task.description}
                          </p>
                        )}

                        {/* Dates & Actions footer row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-zinc-850/60 text-[10px] text-zinc-500 font-bold">
                          {/* Left: dates */}
                          <div className="flex items-center gap-3">
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-rose-400/90 bg-rose-950/20 px-2 py-0.5 border border-rose-900/20 rounded-md">
                                <Calendar className="h-3 w-3" />
                                <span>Vence: {formatDate(task.dueDate)}</span>
                              </span>
                            )}
                            <span>Registrado: {formatDate(task.createdAt ? task.createdAt.split("T")[0] : undefined)}</span>
                          </div>

                          {/* Right: action buttons */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Share to WhatsApp */}
                            <a
                              href={getShareWhatsAppLink(task)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Compartir nota por WhatsApp"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </a>

                            {/* Edit */}
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => startEdit(task)}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Editar recordatorio"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDelete(task.id)}
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Eliminar recordatorio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
