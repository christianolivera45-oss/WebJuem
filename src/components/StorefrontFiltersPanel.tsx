import { Sliders } from "lucide-react";
import { ShopState } from "../types";

interface StorefrontFiltersPanelProps {
  store: ShopState;
  selectedCategory: string;
  selectedSubcategory: string;
  sortBy: string;
  setSortBy: (s: string) => void;
  onlyInStock: boolean;
  setOnlyInStock: (v: boolean) => void;
  onCloseFilters: () => void;
  onNavigateProductRoute: (category: string, subcategory: string, showFlat?: boolean) => void;
  sortedProductsCount: number;
}

export default function StorefrontFiltersPanel({
  store,
  selectedCategory,
  selectedSubcategory,
  sortBy,
  setSortBy,
  onlyInStock,
  setOnlyInStock,
  onCloseFilters,
  onNavigateProductRoute,
  sortedProductsCount
}: StorefrontFiltersPanelProps) {
  const sortOptions = [
    { id: "featured", label: "Destacados ⭐" },
    { id: "price-asc", label: "Menor Precio 📈" },
    { id: "price-desc", label: "Mayor Precio 📉" },
    { id: "newest", label: "Más Recientes 📅" }
  ];

  const activeCategoryObject = (store.dbCategories || []).find(
    (c) => c.nombre === selectedCategory || c.id === selectedCategory
  );
  const currentSubs = activeCategoryObject
    ? (store.dbSubcategories || []).filter(
        (s) => s.categoria_id === activeCategoryObject.id && s.active !== false
      )
    : [];

  return (
    <>
      <div className="hidden md:block overflow-hidden pb-6 border-b border-zinc-200/50 dark:border-zinc-800/50 mb-6 animate-fade-in">
        <div
          className={`p-5 rounded-2xl border ${
            store.settings.themeMode === "dark"
              ? "bg-zinc-950/40 border-zinc-900"
              : "bg-slate-50/50 border-slate-200"
          } grid grid-cols-1 sm:grid-cols-2 gap-6`}
        >
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
              Ordenar por
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-205 text-center ${
                    sortBy === option.id
                      ? "theme-btn-primary text-white scale-[1.01]"
                      : store.settings.themeMode === "dark"
                      ? "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-zinc-800"
                      : "bg-slate-100 text-zinc-600 hover:bg-slate-200/60 hover:text-zinc-900 border border-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 font-semibold">
              Disponibilidad
            </h2>
            <div className="block">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-550 h-4 w-4 pointer-events-auto cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Mostrar solo productos con Stock disponible
                </span>
              </label>
            </div>
          </div>
        </div>

        {(onlyInStock || sortBy !== "featured") && (
          <div className="flex items-center justify-between gap-3 mt-4 px-2">
            <span className="text-[11px] text-indigo-400 font-semibold">
              ✨ Filtro rápido activo para ordenar tu catálogo
            </span>
            <button
              onClick={() => {
                setOnlyInStock(false);
                setSortBy("featured");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
            >
              Limpiar Selección ×
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center pointer-events-none">
        <div
          onClick={onCloseFilters}
          className="absolute inset-0 bg-black/75 backdrop-blur-xs pointer-events-auto animate-fade-in"
        />

        <div
          className={`relative w-full rounded-t-[2rem] border-t shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto overflow-hidden z-10 animate-fade-in ${
            store.settings.themeMode === "dark"
              ? "bg-[#090F21] border-[#D4A55A]/25 text-white"
              : "bg-white border-slate-200 text-zinc-950"
          }`}
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-850 rounded-full mx-auto my-3 shrink-0" />

          <div className="flex items-center justify-between px-6 pb-4 border-b border-zinc-150 dark:border-zinc-900 shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#D4A55A]" />
              <span className="text-sm font-bold uppercase tracking-wider">Filtros & Orden</span>
            </div>
            <button
              onClick={onCloseFilters}
              className="p-1 px-2.5 rounded-lg text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5 space-y-6 pb-28">
            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A] mb-3">
                Ordenar por
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSortBy(option.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 text-center ${
                      sortBy === option.id
                        ? "bg-[#D4A55A]/15 text-[#E6BF76] border border-[#D4A55A]/60 font-black shadow-sm"
                        : store.settings.themeMode === "dark"
                        ? "bg-zinc-900/40 text-zinc-400 border border-zinc-905 hover:text-white"
                        : "bg-slate-50 text-zinc-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]">
                Disponibilidad
              </h2>
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold">Solo con Stock disponible</span>
                  <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                    Ocultar productos agotados
                  </span>
                </div>
                <button
                  onClick={() => setOnlyInStock(!onlyInStock)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${
                    onlyInStock ? "bg-indigo-600 dark:bg-[#D4A55A]" : "bg-zinc-300 dark:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      onlyInStock ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A] mb-3">
                Categorías
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    onNavigateProductRoute("todos", "all", true);
                  }}
                  className={`py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    selectedCategory === "todos"
                      ? "bg-[#D4A55A] text-[#050B1A] border-[#D4A55A]"
                      : store.settings.themeMode === "dark"
                      ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                      : "bg-slate-50 border-slate-200 text-zinc-700"
                  }`}
                >
                  Todos
                </button>
                {(store.dbCategories || [])
                  .filter((c) => c.active !== false)
                  .map((cat) => {
                    const isCatActive = selectedCategory === cat.nombre || selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onNavigateProductRoute(cat.id, "all");
                        }}
                        className={`py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isCatActive
                            ? "bg-[#D4A55A] text-[#050B1A] border-[#D4A55A]"
                            : store.settings.themeMode === "dark"
                            ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                            : "bg-slate-50 border-slate-200 text-zinc-700"
                        }`}
                      >
                        {cat.nombre}
                      </button>
                    );
                  })}
              </div>
            </div>

            {activeCategoryObject && currentSubs.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-zinc-150 dark:border-zinc-900">
                <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]">
                  Subcategorías de {activeCategoryObject.nombre}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onNavigateProductRoute(activeCategoryObject.id, "all");
                    }}
                    className={`py-1.5 px-3 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                      !selectedSubcategory || selectedSubcategory === "all"
                        ? "bg-[#E6BF76]/20 border-[#E6BF76]/60 text-[#E6BF76]"
                        : store.settings.themeMode === "dark"
                        ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                        : "bg-slate-50 border-slate-200 text-zinc-700"
                    }`}
                  >
                    Ver Todo
                  </button>
                  {currentSubs.map((subObj) => {
                    const isSubActive = selectedSubcategory === subObj.id;
                    return (
                      <button
                        key={subObj.id}
                        onClick={() => {
                          onNavigateProductRoute(activeCategoryObject.id, subObj.id);
                        }}
                        className={`py-1.5 px-3 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          isSubActive
                            ? "bg-[#E6BF76]/20 border-[#E6BF76]/60 text-[#E6BF76]"
                            : store.settings.themeMode === "dark"
                            ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                            : "bg-slate-50 border-slate-200 text-zinc-700"
                        }`}
                      >
                        {subObj.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div
            className={`absolute bottom-0 left-0 right-0 p-4 border-t flex gap-3 z-20 ${
              store.settings.themeMode === "dark"
                ? "bg-[#090F21]/95 border-zinc-900/80 text-white backdrop-blur-md"
                : "bg-white/95 border-slate-200 text-zinc-950 backdrop-blur-md"
            }`}
          >
            {(onlyInStock || sortBy !== "featured" || selectedCategory !== "todos" || selectedSubcategory !== "all") && (
              <button
                onClick={() => {
                  setOnlyInStock(false);
                  setSortBy("featured");
                  onNavigateProductRoute("todos", "all", true);
                }}
                className="px-4 py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={onCloseFilters}
              className="flex-1 py-3 text-center rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] hover:brightness-110 active:brightness-95 text-zinc-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              Ver {sortedProductsCount} productos
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
