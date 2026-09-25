import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  Plus,
  Check,
  Package,
  Layers,
  Grid,
  List,
  Tag,
  Boxes,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { Product, ProductVariant } from "../types";

export interface SelectedProductPayload {
  name: string;
  sku?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  material?: string;
  quantity?: number;
  variant?: ProductVariant | null;
}

export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function matchProductSearch(product: Product, rawQuery: string): boolean {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return true;

  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return true;

  const normName = normalizeSearchText(product.name || "");
  const normCode = normalizeSearchText(product.codigo || "");
  const normCat = normalizeSearchText(product.category || "");
  const normDesc = normalizeSearchText(product.description || "");

  const variantTokens = (product.variants || [])
    .map(
      (v) =>
        `${normalizeSearchText(v.sku || "")} ${normalizeSearchText(v.color || "")} ${normalizeSearchText(v.size || "")}`
    )
    .join(" ");

  const combinedSearchTarget = `${normName} ${normCode} ${normCat} ${normDesc} ${variantTokens}`;
  const collapsedTarget = combinedSearchTarget.replace(/[\s\-_]+/g, "");

  return queryTokens.every((token) => {
    // Check singular if ends in 's'
    const cleanToken = token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;

    // Direct token or cleanToken in target
    if (combinedSearchTarget.includes(token) || combinedSearchTarget.includes(cleanToken)) {
      return true;
    }

    // Collapsed target match (e.g. "J-085", "085", "J085")
    const collapsedToken = token.replace(/[\s\-_]+/g, "");
    if (collapsedToken.length >= 2 && collapsedTarget.includes(collapsedToken)) {
      return true;
    }

    // Word boundary substring match in name words
    return normName.split(/\s+/).some((w) => {
      const cleanW = w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w;
      return cleanW.includes(cleanToken) || cleanToken.includes(cleanW);
    });
  });
}

interface ProductSearchProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (payload: SelectedProductPayload) => void;
  existingItems?: Array<{ pieceName: string; internalCode?: string; quantity: number }>;
  title?: string;
  initialProducts?: Product[];
  initialQuery?: string;
}

export const ProductSearchProModal: React.FC<ProductSearchProModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  existingItems = [],
  title = "Buscador Pro de Artículos — Catálogo con Imagen",
  initialProducts = [],
  initialQuery = ""
}) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [addedAnimationIds, setAddedAnimationIds] = useState<Record<string, boolean>>({});

  // Sync initialProducts if provided
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Sync initialQuery when modal opens
  useEffect(() => {
    if (isOpen && initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Fetch products on open if needed
  useEffect(() => {
    if (isOpen) {
      if (products.length === 0) {
        setIsLoading(true);
      }
      fetch("/api/store")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
          }
        })
        .catch((err) => console.error("Error fetching catalog products for Pro Search:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Global ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, previewImage, onClose]);

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ["todas", ...Array.from(set)];
  }, [products]);

  // Filtered products list with intelligent matching
  const { filteredProducts, isShowingOtherCategoryFallback } = useMemo(() => {
    const q = searchQuery.trim();

    // 1. All matches across catalog using fuzzy/tokenized matcher
    const allMatches = products.filter((p) => matchProductSearch(p, q));

    if (selectedCategory === "todas" || !selectedCategory) {
      return { filteredProducts: allMatches, isShowingOtherCategoryFallback: false };
    }

    // 2. Filter within category
    const categoryMatches = allMatches.filter((p) => p.category === selectedCategory);

    // If user is searching with text, but this category has 0 matches and other categories DO have matches:
    // Fall back to showing all matches so the user never gets an empty screen by accident!
    if (q && categoryMatches.length === 0 && allMatches.length > 0) {
      return { filteredProducts: allMatches, isShowingOtherCategoryFallback: true };
    }

    return { filteredProducts: categoryMatches, isShowingOtherCategoryFallback: false };
  }, [products, searchQuery, selectedCategory]);

  // Helper to get quantity for a product
  const getQuantity = (productId: string) => quantities[productId] || 1;

  const setQuantity = (productId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, val)
    }));
  };

  // Helper to get selected variant for a product
  const getSelectedVariant = (prod: Product): ProductVariant | null => {
    if (!prod.variants || prod.variants.length === 0) return null;
    const selectedId = selectedVariants[prod.id];
    if (selectedId) {
      const found = prod.variants.find((v) => (v.id || `${v.size}-${v.color}`) === selectedId);
      if (found) return found;
    }
    return prod.variants[0];
  };

  const handleSelectVariant = (productId: string, variantKey: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantKey
    }));
  };

  // Add product to quote
  const handleAdd = (product: Product) => {
    const qty = getQuantity(product.id);
    const variant = getSelectedVariant(product);

    const price = variant && variant.price !== undefined && variant.price > 0
      ? variant.price
      : product.price || product.precioWeb || 0;

    const sku = (variant && variant.sku) ? variant.sku : product.codigo || "";
    const imageUrl = (variant && variant.imageUrl) ? variant.imageUrl : product.imageUrl || "";

    let displayName = product.name;
    if (variant && (variant.color || variant.size)) {
      const parts = [variant.color, variant.size].filter(Boolean);
      if (parts.length > 0) {
        displayName = `${product.name} (${parts.join(" / ")})`;
      }
    }

    onSelectProduct({
      name: displayName,
      sku,
      price,
      imageUrl,
      category: product.category,
      material: "PLA+",
      quantity: qty,
      variant
    });

    // Trigger visual feedback animation
    setAddedAnimationIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedAnimationIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  // Count existing instances in the quote
  const getExistingCount = (product: Product) => {
    return existingItems.filter((it) => {
      const nameMatch = it.pieceName.toLowerCase().includes(product.name.toLowerCase());
      const skuMatch = product.codigo && it.internalCode && it.internalCode.toLowerCase() === product.codigo.toLowerCase();
      return nameMatch || skuMatch;
    }).length;
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#050B1A] border border-[#D4A55A]/50 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[920px] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0B1730] via-[#0D1C3C] to-[#0B1730] border-b border-[#D4A55A]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#D4A55A]/20 border border-[#D4A55A]/50 flex items-center justify-center text-[#E6BF76] shadow-inner">
              <Sparkles className="h-4 w-4 text-[#E6BF76]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#F4EAD7] flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#D4A55A]/20 text-[#E6BF76] border border-[#D4A55A]/40">
                  PRO
                </span>
              </h3>
              <p className="text-[11px] text-[#C5B499]">
                Busca artículos con imagen, SKU, variantes y precios para agregar a la cotización
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#050B1A] p-0.5 rounded-xl border border-[#D4A55A]/30">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#D4A55A] text-[#050B1A] font-bold shadow-sm"
                    : "text-[#A0AEC0] hover:text-[#F4EAD7]"
                }`}
                title="Vista de cuadrícula con imágenes grandes"
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[#D4A55A] text-[#050B1A] font-bold shadow-sm"
                    : "text-[#A0AEC0] hover:text-[#F4EAD7]"
                }`}
                title="Vista de lista compacta"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar buscador (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="p-4 bg-[#081226] border-b border-[#D4A55A]/20 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-3 text-[#E6BF76]" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre de pieza, código, SKU, categoría o color... (ej: Soporte, Marco, Llavero)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-[#050B1A] border border-[#D4A55A]/40 text-[#F4EAD7] placeholder:text-[#A0AEC0]/60 focus:outline-none focus:border-[#E6BF76] focus:ring-1 focus:ring-[#E6BF76]/40 shadow-inner transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-[#A0AEC0] hover:text-[#F4EAD7] cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Status / Total Count */}
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-[#C5B499] px-1">
              <span className="font-semibold">
                Mostrando <strong className="text-[#E6BF76] font-mono">{filteredProducts.length}</strong> de {products.length} artículos
              </span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
            <span className="text-[10.5px] uppercase font-bold text-[#A0AEC0] flex items-center gap-1 mr-1 shrink-0">
              <Filter className="h-3 w-3 text-[#D4A55A]" />
              Categoría:
            </span>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] border-[#E6BF76] shadow-[0_2px_10px_rgba(212,165,90,0.3)]"
                      : "bg-[#050B1A]/80 hover:bg-[#D4A55A]/15 text-[#C5B499] hover:text-[#F4EAD7] border-[#D4A55A]/25"
                  }`}
                >
                  {cat === "todas" ? "🌟 Todas las Categorías" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* PRODUCTS CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Notification if showing fallback across other categories */}
          {isShowingOtherCategoryFallback && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#E6BF76]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#E6BF76]" />
                <span>
                  No hay resultados en la categoría <strong>"{selectedCategory}"</strong>, pero encontramos{" "}
                  <strong>{filteredProducts.length}</strong> artículos en otras categorías:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory("todas")}
                className="px-2.5 py-1 rounded-lg bg-[#E6BF76]/20 hover:bg-[#E6BF76]/30 text-[#F4EAD7] font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
              >
                Ver Todas las Categorías
              </button>
            </div>
          )}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-[#A0AEC0]">
              <div className="h-8 w-8 rounded-full border-2 border-[#D4A55A] border-t-transparent animate-spin" />
              <p className="text-xs font-semibold">Cargando catálogo oficial de productos con imágenes...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-[#0B1730] border border-[#D4A55A]/30 flex items-center justify-center text-[#D4A55A]/50">
                <Package className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-bold text-[#F4EAD7]">
                No se encontraron artículos con "{searchQuery}"
              </h4>
              <p className="text-xs text-[#A0AEC0] max-w-md mx-auto">
                Puedes intentar con otra búsqueda, cambiar de categoría o agregar esta descripción directamente como una nueva pieza personalizada.
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct({
                      name: searchQuery,
                      price: 0,
                      material: "PLA+",
                      quantity: 1
                    });
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-bold text-xs transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar "{searchQuery}" como nueva pieza personalizada</span>
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ========================================================
               GRID VIEW: CARDS CON IMÁGENES GRANDES Y CONTROLES PRO
               ======================================================== */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((prod) => {
                const variant = getSelectedVariant(prod);
                const displayImg = (variant && variant.imageUrl) || prod.imageUrl;
                const displayPrice = (variant && variant.price !== undefined && variant.price > 0)
                  ? variant.price
                  : prod.price || prod.precioWeb || 0;
                const displaySku = (variant && variant.sku) || prod.codigo;
                const totalStock = prod.stock ?? 0;
                const existingCount = getExistingCount(prod);
                const qty = getQuantity(prod.id);
                const isAdded = addedAnimationIds[prod.id];

                return (
                  <div
                    key={prod.id}
                    className="bg-[#0B1730]/80 hover:bg-[#0D1C3C] border border-[#D4A55A]/30 hover:border-[#E6BF76]/60 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 shadow-md group relative"
                  >
                    {/* Badge if already in quotation */}
                    {existingCount > 0 && (
                      <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-[#D4A55A] text-[#050B1A] text-[9.5px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" />
                        <span>En Cotización ({existingCount})</span>
                      </div>
                    )}

                    {/* Stock indicator badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase shadow-sm ${
                          totalStock > 0
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                        }`}
                      >
                        {totalStock > 0 ? `Stock: ${totalStock}` : "Bajo Pedido"}
                      </span>
                    </div>

                    {/* Product Image Box */}
                    <div
                      onClick={() => {
                        if (displayImg) {
                          setPreviewImage({ url: displayImg, title: prod.name });
                        }
                      }}
                      className="w-full h-44 bg-[#050B1A] relative overflow-hidden cursor-pointer flex items-center justify-center border-b border-[#D4A55A]/20 group-hover:brightness-105 transition-all"
                    >
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt={prod.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback if image breaks
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#A0AEC0]/40">
                          <Package className="h-12 w-12 stroke-[1.2]" />
                          <span className="text-[10px] mt-1">Sin imagen</span>
                        </div>
                      )}

                      {/* Click to zoom indicator */}
                      {displayImg && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center gap-1">
                          <span>🔍 Ver</span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Title and Category */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {prod.category && (
                            <span className="text-[9px] font-bold text-[#E6BF76] uppercase tracking-wider">
                              {prod.category}
                            </span>
                          )}
                          {displaySku && (
                            <span className="text-[9px] font-mono font-bold text-[#A0AEC0] bg-[#050B1A] px-1.5 py-0.2 rounded border border-[#D4A55A]/20">
                              SKU: {displaySku}
                            </span>
                          )}
                        </div>

                        <h4
                          className="font-bold text-xs text-[#F4EAD7] line-clamp-2 leading-tight group-hover:text-[#E6BF76] transition-colors"
                          title={prod.name}
                        >
                          {prod.name}
                        </h4>

                        {/* Variants Picker if multiple variants exist */}
                        {prod.variants && prod.variants.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-[#D4A55A]/15">
                            <label className="text-[9px] font-bold text-[#C5B499] block mb-1">
                              Variante / Color:
                            </label>
                            <select
                              value={variant?.id || `${variant?.size}-${variant?.color}`}
                              onChange={(e) => handleSelectVariant(prod.id, e.target.value)}
                              className="w-full px-2 py-1 rounded-lg text-[10.5px] bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] cursor-pointer"
                            >
                              {prod.variants.map((v, vIdx) => {
                                const key = v.id || `${v.size}-${v.color}` || `var-${vIdx}`;
                                const varLabel = [v.color, v.size].filter(Boolean).join(" - ") || `Opción ${vIdx + 1}`;
                                const varPrice = v.price ? ` ($${v.price})` : "";
                                return (
                                  <option key={key} value={key}>
                                    {varLabel} {varPrice}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Pricing, Quantity & Add Button */}
                      <div className="pt-2 border-t border-[#D4A55A]/15 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-[#A0AEC0]">Precio Venta:</span>
                          <span className="font-mono font-black text-sm text-[#E6BF76]">
                            ${Number(displayPrice || 0).toLocaleString("es-UY")}{" "}
                            <span className="text-[9px] font-normal text-[#C5B499]">UYU</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Quantity Selector */}
                          <div className="flex items-center bg-[#050B1A] border border-[#D4A55A]/30 rounded-xl overflow-hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => setQuantity(prod.id, qty - 1)}
                              className="px-2 py-1 text-xs text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-[#D4A55A]/20 cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={qty}
                              onChange={(e) => setQuantity(prod.id, parseInt(e.target.value) || 1)}
                              className="w-9 text-center py-1 text-xs bg-transparent text-[#F4EAD7] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => setQuantity(prod.id, qty + 1)}
                              className="px-2 py-1 text-xs text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-[#D4A55A]/20 cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>

                          {/* Add to Quote Button */}
                          <button
                            type="button"
                            onClick={() => handleAdd(prod)}
                            className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                              isAdded
                                ? "bg-emerald-600 text-white"
                                : "bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] hover:brightness-110 text-[#050B1A]"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                <span>¡Agregado!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>Agregar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================
               LIST VIEW: FILAS DETALLADAS CON THUMBNAILS Y CONTROLES
               ======================================================== */
            <div className="bg-[#0B1730]/60 rounded-2xl border border-[#D4A55A]/25 divide-y divide-[#D4A55A]/15 overflow-hidden">
              {filteredProducts.map((prod) => {
                const variant = getSelectedVariant(prod);
                const displayImg = (variant && variant.imageUrl) || prod.imageUrl;
                const displayPrice = (variant && variant.price !== undefined && variant.price > 0)
                  ? variant.price
                  : prod.price || prod.precioWeb || 0;
                const displaySku = (variant && variant.sku) || prod.codigo;
                const totalStock = prod.stock ?? 0;
                const existingCount = getExistingCount(prod);
                const qty = getQuantity(prod.id);
                const isAdded = addedAnimationIds[prod.id];

                return (
                  <div
                    key={prod.id}
                    className="p-3 sm:p-4 hover:bg-[#0D1C3C]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-colors"
                  >
                    {/* Thumbnail Image */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div
                        onClick={() => {
                          if (displayImg) {
                            setPreviewImage({ url: displayImg, title: prod.name });
                          }
                        }}
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group hover:border-[#E6BF76]"
                      >
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={prod.name}
                            className="h-full w-full object-contain p-1 group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 text-[#A0AEC0]/40" />
                        )}
                      </div>

                      {/* Info & Variants */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-[#F4EAD7] truncate">
                            {prod.name}
                          </h4>
                          {existingCount > 0 && (
                            <span className="px-2 py-0.2 rounded-full bg-[#D4A55A]/25 text-[#E6BF76] text-[9.5px] font-bold border border-[#D4A55A]/40">
                              ✓ En cotización ({existingCount})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
                          {displaySku && (
                            <span className="font-mono text-[#A0AEC0] bg-[#050B1A] px-1.5 py-0.5 rounded border border-[#D4A55A]/20">
                              SKU: {displaySku}
                            </span>
                          )}
                          {prod.category && (
                            <span className="text-[#E6BF76] font-semibold">
                              {prod.category}
                            </span>
                          )}
                          <span
                            className={`font-semibold ${
                              totalStock > 0 ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            • {totalStock > 0 ? `${totalStock} en stock` : "Bajo pedido"}
                          </span>
                        </div>

                        {/* Variants picker if present */}
                        {prod.variants && prod.variants.length > 1 && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-[10px] text-[#A0AEC0]">Variante:</span>
                            <select
                              value={variant?.id || `${variant?.size}-${variant?.color}`}
                              onChange={(e) => handleSelectVariant(prod.id, e.target.value)}
                              className="px-2 py-0.5 rounded-lg text-[10.5px] bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] cursor-pointer"
                            >
                              {prod.variants.map((v, vIdx) => {
                                const key = v.id || `${v.size}-${v.color}` || `var-${vIdx}`;
                                const varLabel = [v.color, v.size].filter(Boolean).join(" - ") || `Opción ${vIdx + 1}`;
                                return (
                                  <option key={key} value={key}>
                                    {varLabel}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D4A55A]/15">
                      <div className="text-right sm:mr-2">
                        <div className="font-mono font-black text-sm sm:text-base text-[#E6BF76]">
                          ${Number(displayPrice || 0).toLocaleString("es-UY")}
                        </div>
                        <span className="text-[9.5px] text-[#A0AEC0] uppercase">UYU c/u</span>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center bg-[#050B1A] border border-[#D4A55A]/30 rounded-xl overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuantity(prod.id, qty - 1)}
                          className="px-2 py-1.5 text-xs text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-[#D4A55A]/20 cursor-pointer font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={qty}
                          onChange={(e) => setQuantity(prod.id, parseInt(e.target.value) || 1)}
                          className="w-10 text-center py-1.5 text-xs bg-transparent text-[#F4EAD7] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(prod.id, qty + 1)}
                          className="px-2 py-1.5 text-xs text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-[#D4A55A]/20 cursor-pointer font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => handleAdd(prod)}
                        className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] hover:brightness-110 text-[#050B1A]"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>¡Agregado!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Agregar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-[#0B1730] border-t border-[#D4A55A]/25 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#C5B499]">
            <Boxes className="h-4 w-4 text-[#D4A55A]" />
            <span>
              Catálogo sincronizado con la tienda JUEM ({products.length} artículos en sistema)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#F4EAD7] text-xs font-bold transition-all border border-[#D4A55A]/30 cursor-pointer active:scale-95"
          >
            Cerrar Buscador
          </button>
        </div>

      </div>

      {/* LIGHTBOX MODAL PARA VER IMAGEN EN TAMAÑO COMPLETO */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[100005] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-[#050B1A] border border-[#D4A55A]/50 rounded-2xl p-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-[#D4A55A] hover:text-[#050B1A] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-sm font-bold text-[#F4EAD7] mb-3 text-center px-8">
              {previewImage.title}
            </h4>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[70vh] w-auto object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
