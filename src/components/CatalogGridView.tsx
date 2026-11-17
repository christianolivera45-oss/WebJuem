import { lazy, Suspense, useMemo, useCallback, useEffect, useRef } from "react";
import { Sliders, Grid, List, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Product, ShopState, getProductAvailableStock } from "../types";
import ProductCard from "./ProductCard";
import { calculateRelevance, SUBCATEGORIES_MAP, SUBCATEGORY_KEYWORDS } from "../utils/searchHelpers";

const StorefrontFiltersPanel = lazy(() => import("./StorefrontFiltersPanel"));

interface CatalogGridViewProps {
  store: ShopState;
  displayProducts: Product[];
  selectedCategory: string;
  selectedSubcategory: string;
  showAllProductsFlat: boolean;
  searchQuery: string;
  onlyInStock: boolean;
  setOnlyInStock: (v: boolean) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  showFiltersPanel: boolean;
  setShowFiltersPanel: (v: boolean) => void;
  mobileLayoutMode: "grid" | "list";
  setMobileLayoutMode: (m: "grid" | "list") => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  userItemsPerPage: number | "auto";
  setUserItemsPerPage: (v: number | "auto") => void;
  windowWidth: number;
  loading: boolean;
  navigateToProductRoute: (category: string, subcategory: string, showFlat?: boolean) => void;
  getCategoryDisplayNameWithDb: (cat: string) => string;
  onOpenProduct: (p: Product) => void;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
  setSearchQuery: (q: string) => void;
  scrollToCatalogTop: () => void;
}

export default function CatalogGridView({
  store,
  displayProducts,
  selectedCategory,
  selectedSubcategory,
  showAllProductsFlat,
  searchQuery,
  onlyInStock,
  setOnlyInStock,
  sortBy,
  setSortBy,
  showFiltersPanel,
  setShowFiltersPanel,
  mobileLayoutMode,
  setMobileLayoutMode,
  currentPage,
  setCurrentPage,
  userItemsPerPage,
  setUserItemsPerPage,
  windowWidth,
  loading,
  navigateToProductRoute,
  getCategoryDisplayNameWithDb,
  onOpenProduct,
  onAddToCart,
  setSearchQuery,
  scrollToCatalogTop
}: CatalogGridViewProps) {
  const getAdaptiveItemsPerPage = useCallback((width: number) => {
    if (width < 640) return 12;
    if (width < 768) return 12;
    if (width < 1024) return 12;
    if (width < 1280) return 16;
    return 20;
  }, []);

  const filteredProducts = useMemo(() => {
    return displayProducts.filter((p) => {
      if (p.paused || p.active === false) return false;

      let matchesSearch = true;
      if (searchQuery.trim().length > 0) {
        matchesSearch = calculateRelevance(p, searchQuery, store.dbCategories, store.dbSubcategories) > 0;
      }

      let matchesCategory = true;
      if (selectedCategory !== "todos") {
        const safeSelectedCat = (selectedCategory || "").toLowerCase();
        const catObj = (store.dbCategories || []).find(
          (c) => (c.nombre || "").toLowerCase() === safeSelectedCat || (c.id || "").toLowerCase() === safeSelectedCat
        );
        const catId = catObj ? catObj.id : "";

        const isMainCatMatch =
          (p.categoria_id && catId && p.categoria_id === catId) || (p.category && p.category.toLowerCase() === safeSelectedCat);
        const isAdditionalCatMatch = !!(p.categorias_adicionales && catId && p.categorias_adicionales.includes(catId));
        const hasCatMatch = isMainCatMatch || isAdditionalCatMatch;

        if (!hasCatMatch) {
          matchesCategory = false;
        } else if (selectedSubcategory && selectedSubcategory !== "all") {
          const isMainSubMatch = p.subcategoria_id && p.subcategoria_id === selectedSubcategory;
          const isAdditionalSubMatch = !!(p.subcategorias_adicionales && p.subcategorias_adicionales.includes(selectedSubcategory));

          if (isMainSubMatch || isAdditionalSubMatch) {
            matchesCategory = true;
          } else if (p.subcategoria_id && p.subcategoria_id !== "all") {
            matchesCategory = false;
          } else {
            const keywords = SUBCATEGORY_KEYWORDS[selectedSubcategory] || [];
            if (keywords.length > 0) {
              const textToSearch = ((p.name || "") + " " + (p.description || "")).toLowerCase();
              matchesCategory = keywords.some((kw) => textToSearch.includes(kw));
            } else {
              const subcatObj = (store.dbSubcategories || []).find((s) => s.id === selectedSubcategory);
              const subName = subcatObj ? (subcatObj.nombre || "").toLowerCase() : (selectedSubcategory || "").toLowerCase();
              const textToSearch = ((p.name || "") + " " + (p.description || "")).toLowerCase();
              matchesCategory = textToSearch.includes(subName);
            }
          }
        }
      }

      if (onlyInStock) {
        const realStock = getProductAvailableStock(p);
        if (realStock <= 0) return false;
      }

      return matchesSearch && matchesCategory;
    });
  }, [displayProducts, searchQuery, store.dbCategories, store.dbSubcategories, selectedCategory, selectedSubcategory, onlyInStock]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (searchQuery.trim().length > 0 && sortBy === "featured") {
        const scoreA = calculateRelevance(a, searchQuery, store.dbCategories, store.dbSubcategories);
        const scoreB = calculateRelevance(b, searchQuery, store.dbCategories, store.dbSubcategories);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
      }
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "featured") {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
      }
      return 0;
    });
  }, [filteredProducts, searchQuery, sortBy, store.dbCategories, store.dbSubcategories]);

  const itemsPerPage = useMemo(() => {
    if (userItemsPerPage !== "auto") return userItemsPerPage;
    return getAdaptiveItemsPerPage(windowWidth);
  }, [windowWidth, userItemsPerPage, getAdaptiveItemsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage, totalPages]);

  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    scrollToCatalogTop();
  }, [currentPage, selectedCategory, selectedSubcategory, scrollToCatalogTop]);

  const activeCategoryObject = (store.dbCategories || []).find(
    (c) => c.nombre === selectedCategory || c.id === selectedCategory
  );
  const currentSubs = activeCategoryObject
    ? (store.dbSubcategories || []).filter(
        (s) => s.categoria_id === activeCategoryObject.id && s.active !== false
      )
    : [];
  const activeSubcategoryObject =
    selectedSubcategory && selectedSubcategory !== "all"
      ? (store.dbSubcategories || []).find(
          (s) =>
            (!activeCategoryObject || s.categoria_id === activeCategoryObject.id) &&
            (s.id.toLowerCase() === selectedSubcategory.toLowerCase() ||
              s.nombre.toLowerCase() === selectedSubcategory.toLowerCase())
        )
      : undefined;
  const subDisplayName = activeSubcategoryObject
    ? activeSubcategoryObject.nombre
    : SUBCATEGORIES_MAP[activeCategoryObject?.id || selectedCategory.toLowerCase()]?.find(
        (s) => s.id === selectedSubcategory
      )?.name || selectedSubcategory;

  return (
    <>
      {activeCategoryObject && currentSubs.length > 0 && (
        <nav
          aria-label={`Subcategorías de ${activeCategoryObject.nombre}`}
          className="flex items-center gap-2 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-zinc-200/50 dark:border-zinc-800/55 pb-4 mb-6 select-none -mx-6 px-6 lg:mx-0 lg:px-0"
        >
          <span className="text-[10px] uppercase font-extrabold text-zinc-500 mr-2 tracking-wider shrink-0">
            Subcategorías:
          </span>
          <a
            href={`/${activeCategoryObject.id}`}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                navigateToProductRoute(activeCategoryObject.id, "all");
              }
            }}
            className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 duration-150 ${
              !selectedSubcategory || selectedSubcategory === "all"
                ? "bg-[#E6BF76]/25 border-[#E6BF76]/60 text-[#E6BF76] font-black"
                : "bg-[#0B1730]/40 text-[#F4EAD7]/75 border-zinc-800 hover:border-[#D4A55A]/30 hover:text-[#E6BF76]"
            }`}
          >
            Ver Todo
          </a>
          {currentSubs.map((subObj) => {
            const isSubActive = selectedSubcategory === subObj.id;
            return (
              <a
                key={subObj.id}
                href={`/${activeCategoryObject.id}/${subObj.id}`}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    navigateToProductRoute(activeCategoryObject.id, subObj.id);
                  }
                }}
                className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 duration-150 ${
                  isSubActive
                    ? "bg-[#E6BF76]/25 border-[#E6BF76]/60 text-[#E6BF76] font-black"
                    : "bg-[#0B1730]/40 text-[#F4EAD7]/75 border-zinc-800 hover:border-[#D4A55A]/30 hover:text-[#E6BF76]"
                }`}
              >
                {subObj.nombre}
              </a>
            );
          })}
        </nav>
      )}

      {(selectedCategory !== "todos" || showAllProductsFlat) && showFiltersPanel && (
        <Suspense fallback={null}>
          <StorefrontFiltersPanel
            store={store}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onlyInStock={onlyInStock}
            setOnlyInStock={setOnlyInStock}
            onCloseFilters={() => setShowFiltersPanel(false)}
            onNavigateProductRoute={navigateToProductRoute}
            sortedProductsCount={sortedProducts.length}
          />
        </Suspense>
      )}

      {(selectedCategory !== "todos" || showAllProductsFlat) && !showFiltersPanel && (onlyInStock || sortBy !== "featured") && (
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200/50 dark:border-zinc-805/50 mb-6 px-1">
          <span className="text-[11px] text-[#E6BF76] font-semibold">✨ Filtro rápido activo para ordenar tu catálogo</span>
          <button
            onClick={() => {
              setOnlyInStock(false);
              setSortBy("featured");
            }}
            className="px-3 py-1 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
          >
            Limpiar Orden ×
          </button>
        </div>
      )}

      <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-1.5 h-6 theme-btn-accent rounded-full" />
            {selectedCategory !== "todos" ? (
              <h1 className="text-xl font-bold tracking-tight">
                {searchQuery ? (
                  "Resultados de Búsqueda"
                ) : (
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span>{getCategoryDisplayNameWithDb(selectedCategory)}</span>
                    {selectedSubcategory && selectedSubcategory !== "all" && (
                      <>
                        <span className="text-zinc-400 dark:text-zinc-600 font-normal">›</span>
                        <span className="text-[#E6BF76] font-semibold text-lg">{subDisplayName}</span>
                      </>
                    )}
                  </span>
                )}
              </h1>
            ) : (
              <h2 className="text-xl font-bold tracking-tight">
                {searchQuery ? "Resultados de Búsqueda" : "Catálogo de Productos"}
              </h2>
            )}
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">({sortedProducts.length} productos)</span>
          </div>
          {!searchQuery && selectedCategory !== "todos" && (
            <p className="text-xs text-zinc-400 pl-3.5">
              {selectedSubcategory && selectedSubcategory !== "all"
                ? `Selección de ${subDisplayName} en ${getCategoryDisplayNameWithDb(selectedCategory)} con envíos express en Montevideo y todo Uruguay.`
                : `Explorá todo el catálogo disponible de ${getCategoryDisplayNameWithDb(selectedCategory)} en JUEM Uruguay.`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
              showFiltersPanel
                ? "bg-[#D4A55A] text-[#050B1A] border-[#D4A55A]"
                : store.settings.themeMode === "dark"
                ? "bg-[#0B1730]/60 border-[#D4A55A]/20 text-zinc-300 hover:text-[#E6BF76]"
                : "bg-slate-50 border-slate-200 text-zinc-700 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#D4A55A]" />
            <span>Filtros y Orden</span>
          </button>

          <div className="lg:hidden flex items-center bg-[#0B1730]/60 border border-[#D4A55A]/20 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setMobileLayoutMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                mobileLayoutMode === "grid" ? "bg-[#D4A55A] text-[#050B1A]" : "text-zinc-400 hover:text-[#E6BF76]"
              }`}
              title="Vista de Cuadrícula"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileLayoutMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                mobileLayoutMode === "list" ? "bg-[#D4A55A] text-[#050B1A]" : "text-zinc-400 hover:text-[#E6BF76]"
              }`}
              title="Vista de Lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {sortedProducts.length === 0 ? (
        loading ? (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-h-[500px]">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className={`rounded-2xl overflow-hidden animate-pulse border ${
                  store.settings.themeMode === "dark" ? "bg-[#0B1730]/60 border-[#D4A55A]/10" : "bg-slate-100 border-slate-200"
                }`}
              >
                <div className="aspect-[3/4] w-full bg-slate-200/20 dark:bg-zinc-800/40" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-slate-200/30 dark:bg-zinc-800/60 rounded w-3/4" />
                  <div className="h-4 bg-slate-200/20 dark:bg-zinc-800/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`p-16 text-center rounded-2xl border border-dashed ${
              store.settings.themeMode === "dark" ? "border-zinc-800 text-zinc-500" : "border-slate-200 text-slate-400"
            }`}
          >
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-60" />
            <p className="text-base font-semibold">No se encontraron productos coincidentes</p>
            <p className="text-xs mt-1">Prueba a restablecer filtros o cambiar tu término de búsqueda e intenta nuevamente.</p>
            <button
              onClick={() => {
                navigateToProductRoute("todos", "all", true);
                setSearchQuery("");
                setOnlyInStock(false);
                setSortBy("featured");
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs theme-btn-primary inline-block font-semibold pointer-events-auto cursor-pointer"
            >
              Ver todo el catálogo
            </button>
          </div>
        )
      ) : (
        <>
          <div id="catalog-grid-top" className="scroll-mt-24" />
          <div
            className={`grid gap-3 sm:gap-6 min-h-[500px] ${
              mobileLayoutMode === "list"
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}
          >
            {paginatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                layoutMode={mobileLayoutMode}
                settings={store.settings}
                onAddToCart={(prod, sz, col) => onAddToCart(prod, sz, col)}
                onViewProduct={(prod) => onOpenProduct(prod)}
              />
            ))}
          </div>

          {sortedProducts.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                <span>
                  Mostrando{" "}
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {sortedProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  al{" "}
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {Math.min(currentPage * itemsPerPage, sortedProducts.length)}
                  </span>{" "}
                  de <span className="font-bold text-[#D4A55A]">{sortedProducts.length}</span> productos
                </span>

                <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400">Por página:</span>
                  <select
                    value={userItemsPerPage}
                    onChange={(e) => {
                      const val = e.target.value === "auto" ? "auto" : Number(e.target.value);
                      setUserItemsPerPage(val);
                      setCurrentPage(1);
                      scrollToCatalogTop();
                    }}
                    className={`text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer transition border ${
                      store.settings.themeMode === "dark"
                        ? "bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700"
                        : "bg-white border-slate-200 text-zinc-800 hover:border-slate-300"
                    }`}
                    title="Artículos por página"
                  >
                    <option value="auto">Auto Adaptativo ({getAdaptiveItemsPerPage(windowWidth)})</option>
                    <option value={8}>8 por página</option>
                    <option value={12}>12 por página</option>
                    <option value={16}>16 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={24}>24 por página</option>
                    <option value={999}>Todos ({sortedProducts.length})</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        scrollToCatalogTop();
                      }
                    }}
                    disabled={currentPage === 1}
                    className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                      store.settings.themeMode === "dark"
                        ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                        : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                    }`}
                    title="Página Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNum = index + 1;
                      if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              scrollToCatalogTop();
                            }}
                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center ${
                              currentPage === pageNum
                                ? "bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-zinc-950 shadow-sm outline-none"
                                : store.settings.themeMode === "dark"
                                ? "bg-zinc-900 border border-zinc-805 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }

                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return (
                          <span key={pageNum} className="px-1 text-xs text-zinc-400 font-bold">
                            ...
                          </span>
                        );
                      }

                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        scrollToCatalogTop();
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                      store.settings.themeMode === "dark"
                        ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                        : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                    }`}
                    title="Siguiente Página"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
