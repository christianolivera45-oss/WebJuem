import { X, Grid, ChevronRight, Settings, LogOut, Accessibility } from "lucide-react";
import { ShopState } from "../types";
import { getCategoryIcon } from "../utils/storefrontHelpers";

interface MobileMenuDrawerProps {
  store: ShopState;
  selectedCategory: string;
  selectedSubcategory: string;
  authToken: string | null;
  activeTab: "storefront" | "admin" | "checkout";
  onClose: () => void;
  onGoHome: () => void;
  onNavigateProductRoute: (category: string, subcategory: string, showFlat?: boolean) => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export default function MobileMenuDrawer({
  store,
  selectedCategory,
  selectedSubcategory,
  authToken,
  activeTab,
  onClose,
  onGoHome,
  onNavigateProductRoute,
  onOpenAdmin,
  onLogout,
  onOpenLogin
}: MobileMenuDrawerProps) {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 opacity-60 backdrop-blur-xs md:hidden animate-fade-in"
      />

      <div className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm h-full flex flex-col p-6 shadow-2xl border-r border-[#D4A55A]/15 md:hidden overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#050B1A] text-[#F4EAD7] animate-fade-in">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#D4A55A]/15">
          <button
            type="button"
            onClick={() => {
              onGoHome();
              onClose();
            }}
            className="flex items-center gap-2 cursor-pointer select-none border-none bg-transparent text-left outline-none p-0 animate-none"
          >
            {store.settings.logoType === "image" && Boolean(store.settings.logoImageUrl?.trim()) ? (
              <img
                src={store.settings.logoImageUrl || undefined}
                alt={store.settings.siteTitle}
                className="w-8 h-8 rounded-xl object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-[#D4A55A] rounded-xl flex items-center justify-center text-[#050B1A] font-bold text-lg shadow-sm">
                {store.settings.logoText || "J"}
              </div>
            )}
            <span className="font-bold text-base tracking-tight font-serif text-[#F4EAD7]">
              {store.settings.siteTitle}
            </span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition cursor-pointer hover:bg-[#0B1730] text-[#E6BF76] hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]/80 mb-3">
              Explorar Categorías
            </h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  onNavigateProductRoute("todos", "all", true);
                  onClose();
                }}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === "todos"
                    ? "bg-[#D4A55A] text-[#050B1A]"
                    : "bg-[#0B1730]/65 text-[#F4EAD7] hover:bg-[#0B1730] border border-[#D4A55A]/10 hover:border-[#D4A55A]/40 hover:text-[#E6BF76]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  <span>Ver todo el catálogo</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </button>

              {(store.dbCategories || [])
                .filter((c) => c.active !== false)
                .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                .map((catObj) => {
                  const isCatActive = selectedCategory === catObj.nombre;
                  const dbSubs = (store.dbSubcategories || []).filter(
                    (sub) => sub.categoria_id === catObj.id && sub.active !== false
                  );

                  return (
                    <div key={catObj.id} className="space-y-1">
                      <button
                        onClick={() => {
                          onNavigateProductRoute(catObj.id, "all");
                          onClose();
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCatActive
                            ? "bg-[#D4A55A]/20 text-[#E6BF76] border border-[#D4A55A]/45"
                            : "hover:bg-[#0B1730] text-[#F4EAD7]/80 hover:text-[#E6BF76] border border-transparent hover:border-[#D4A55A]/25"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="[&_svg]:h-4 [&_svg]:w-4 opacity-70">
                            {getCategoryIcon(catObj.icono || catObj.nombre)}
                          </span>
                          <span>{catObj.nombre}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </button>

                      {dbSubs.length > 0 && (
                        <div className="pl-6 border-l border-[#D4A55A]/20 ml-5 py-0.5 space-y-1">
                          {dbSubs.map((sub) => {
                            const isSubActive = isCatActive && selectedSubcategory === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  onNavigateProductRoute(catObj.id, sub.id);
                                  onClose();
                                }}
                                className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                  isSubActive ? "text-[#E6BF76] font-bold" : "text-zinc-400 hover:text-[#E6BF76]"
                                }`}
                              >
                                • {sub.nombre}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">
              Herramientas de Cuenta
            </h3>
            <div className="flex flex-col gap-1.5">
              {authToken ? (
                <>
                  <button
                    onClick={() => {
                      onOpenAdmin();
                      onClose();
                    }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === "admin"
                        ? "bg-indigo-600/20 text-indigo-400"
                        : store.settings.themeMode === "dark"
                        ? "bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Settings className="h-4 w-4 text-indigo-400" />
                    <span>Panel de Control Admin</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors cursor-pointer animate-fade-in"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]/80 mb-3">
              Accesibilidad
            </h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-a11y-panel"));
                  onClose();
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-[#E6BF76] bg-[#D4A55A]/10 hover:bg-[#D4A55A]/20 transition cursor-pointer border border-[#D4A55A]/20"
              >
                <Accessibility className="h-4 w-4 text-[#E6BF76]" />
                <span>Ajustes de Accesibilidad (Alt + A)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center text-[10px] space-y-1.5">
          {!authToken && (
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="text-zinc-500 dark:text-zinc-500 hover:underline text-[10px] font-semibold tracking-wide cursor-pointer transition select-none"
            >
              🔐 Acceso Administrativo
            </button>
          )}
          <p className="opacity-60">&copy; 2026 {store.settings.siteTitle}</p>
          <p className="opacity-40 text-[9px] mt-0.5">Tienda Virtual Optimizada</p>
        </div>
      </div>
    </>
  );
}
