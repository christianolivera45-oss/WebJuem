import React, { useState, useRef, useEffect } from "react";
import { Product, ComboComponent, ProductVariant } from "../types";
import { 
  Plus, 
  Trash2, 
  Layers, 
  Search, 
  ChevronDown, 
  Palette, 
  Ruler, 
  Check, 
  X, 
  HelpCircle,
  Tag,
  Sparkles,
  Filter,
  FolderOpen
} from "lucide-react";
import VariantImagePicker from "./VariantImagePicker";

interface ComboComponentsBuilderProps {
  products: Product[];
  components: ComboComponent[];
  onChange: (components: ComboComponent[]) => void;
  currentProductId?: string; // To avoid adding itself as a component
  colors?: string[];
  sizes?: string[];
  onColorsChange?: (colors: string[]) => void;
  onSizesChange?: (sizes: string[]) => void;
  variants?: ProductVariant[];
  onVariantsChange?: (variants: ProductVariant[]) => void;
  baseCodigo?: string;
  galleryImages?: string[];
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}

// Helper to auto-generate combo variants from colors and sizes list
const regenerateComboVariants = (
  colors: string[],
  sizes: string[],
  existingVariants: ProductVariant[],
  baseCodigo?: string
): ProductVariant[] => {
  const finalColors = colors.length > 0 ? colors : ["General"];
  const finalSizes = sizes.length > 0 ? sizes : ["Único"];
  const generated: ProductVariant[] = [];

  let idx = 1;
  for (const col of finalColors) {
    for (const sz of finalSizes) {
      const match = (existingVariants || []).find(
        (v) => v.color === col && v.size === sz
      );
      if (match) {
        generated.push(match);
      } else {
        const base = baseCodigo ? baseCodigo.trim() : `COMBO`;
        const sizePart = !sz || sz === "Único" || sz === "Talla Única" || sz === "Talle Único" ? "" : `-${sz}`;
        const colorPart = !col || col === "General" || col === "Único" ? "" : `-${col}`;
        const sku = `${base}${sizePart}${colorPart}`.toUpperCase().replace(/\s+/g, "");
        
        generated.push({
          id: `v-${col}-${sz}-${Date.now()}-${idx++}`,
          size: sz,
          color: col,
          colorCode: col === "Negro" ? "#000000" : col === "Blanco" ? "#ffffff" : col === "Rojo" ? "#ef4444" : col === "Azul" ? "#3b82f6" : col === "Verde" ? "#22c55e" : col === "Gris" ? "#6b7280" : col === "Beige" ? "#f5f5dc" : col === "Rosa" ? "#f472b6" : "#9ca3af",
          sku,
          stockPinamar: 0,
          stockMontevideo: 0,
          stock: 0,
          priceDelta: 0
        });
      }
    }
  }
  return generated;
};

export default function ComboComponentsBuilder({
  products,
  components,
  onChange,
  currentProductId,
  colors = [],
  sizes = [],
  onColorsChange,
  onSizesChange,
  variants = [],
  onVariantsChange,
  baseCodigo = "COMBO",
  galleryImages = [],
  showToast,
}: ComboComponentsBuilderProps) {
  // Filter products: must not be the current product itself (using String comparison to avoid type issues)
  const availableProducts = products.filter(
    (p) => String(p.id) !== String(currentProductId)
  );

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedComboColor, setSelectedComboColor] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Pro searcher states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);
  const selectedProductVariants = selectedProduct?.variants || [];

  // Comma separated inputs strings states
  const [rawColorsInput, setRawColorsInput] = useState<string>(colors.join(", "));
  const [rawSizesInput, setRawSizesInput] = useState<string>(sizes.join(", "));

  // Buscador Pro Modal States for Combo Variants Item Binding
  const [activeVariantForModal, setActiveVariantForModal] = useState<ProductVariant | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");
  const [modalSelectedCategory, setModalSelectedCategory] = useState<string>("");
  const [modalQuantities, setModalQuantities] = useState<Record<string, number>>({});

  // Sync input values when external props change
  useEffect(() => {
    setRawColorsInput(colors.join(", "));
  }, [colors]);

  useEffect(() => {
    setRawSizesInput(sizes.join(", "));
  }, [sizes]);

  // Click outside search dropdown handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleColorsBlur = () => {
    const nextColors = rawColorsInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    
    if (onColorsChange) {
      onColorsChange(nextColors);
    }
  };

  const handleSizesBlur = () => {
    const nextSizes = rawSizesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    
    if (onSizesChange) {
      onSizesChange(nextSizes);
    }
  };

  const handleGenerateVariants = () => {
    const nextColors = rawColorsInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    
    const nextSizes = rawSizesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (onColorsChange) {
      onColorsChange(nextColors);
    }
    if (onSizesChange) {
      onSizesChange(nextSizes);
    }

    if (onVariantsChange) {
      const nextVariants = regenerateComboVariants(nextColors, nextSizes, variants, baseCodigo);
      onVariantsChange(nextVariants);
    }

    if (showToast) {
      showToast("¡Variantes del combo creadas exitosamente!", "success");
    }
  };

  const handleAddInlineComponent = (color: string, size: string, prodId: string, varId?: string, qty: number = 1) => {
    const isUniqueSize = !size || size === "Único" || size === "Talla Única" || size === "Talle Único";
    
    // Check if it already exists for this variant with accurate filtering
    const exists = components.some(
      (c) => {
        const isMatchColor = c.comboColor === color;
        const isMatchSize = isUniqueSize
          ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
          : (c.comboSize === size);
        return (
          c.productId === prodId &&
          (varId ? c.variantId === varId : !c.variantId) &&
          isMatchColor &&
          isMatchSize
        );
      }
    );

    if (exists) {
      if (showToast) {
        showToast("Este artículo ya está asignado a esta variante.", "error");
      } else {
        alert("Este artículo ya está asignado a esta variante.");
      }
      return;
    }

    const newComponent: ComboComponent = {
      productId: prodId,
      quantity: qty,
      variantId: varId || undefined,
      comboColor: color || undefined,
      comboSize: isUniqueSize ? undefined : size || undefined,
    };

    onChange([...components, newComponent]);
    if (showToast) {
      showToast("¡Artículo vinculado a la variante con éxito!", "success");
    }
  };

  // Helper to remove or change quantity directly for the active variant
  const handleRemoveSpecificComponent = (productId: string, variantId: string | undefined, comboColor: string | undefined, comboSize: string | undefined) => {
    const isUniqueSize = !comboSize || comboSize === "Único" || comboSize === "Talla Única" || comboSize === "Talle Único";
    const updated = components.filter((c) => {
      const isMatchColor = c.comboColor === comboColor;
      const isMatchSize = isUniqueSize
        ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
        : (c.comboSize === comboSize);
      
      const isSameItem = c.productId === productId && (variantId ? c.variantId === variantId : !c.variantId);
      return !(isSameItem && isMatchColor && isMatchSize);
    });
    onChange(updated);
    if (showToast) {
      showToast("Artículo desvinculado de la variante.", "info");
    }
  };

  const handleUpdateComponentQuantity = (productId: string, variantId: string | undefined, comboColor: string | undefined, comboSize: string | undefined, newQty: number) => {
    const isUniqueSize = !comboSize || comboSize === "Único" || comboSize === "Talla Única" || comboSize === "Talle Único";
    const updated = components.map((c) => {
      const isMatchColor = c.comboColor === comboColor;
      const isMatchSize = isUniqueSize
        ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
        : (c.comboSize === comboSize);
      
      if (
        c.productId === productId &&
        (variantId ? c.variantId === variantId : !c.variantId) &&
        isMatchColor &&
        isMatchSize
      ) {
        return { ...c, quantity: Math.max(1, newQty) };
      }
      return c;
    });
    onChange(updated);
  };

  const handleAddComponent = () => {
    if (!selectedProductId) return;

    // Check if it already exists
    const exists = components.some(
      (c) =>
        c.productId === selectedProductId &&
        (selectedVariantId ? c.variantId === selectedVariantId : !c.variantId) &&
        (selectedComboColor ? c.comboColor === selectedComboColor : !c.comboColor)
    );

    if (exists) {
      alert("Este producto/variante con esta asociación de color ya está en la lista.");
      return;
    }

    const newComponent: ComboComponent = {
      productId: selectedProductId,
      quantity: quantity,
      variantId: selectedVariantId || undefined,
      comboColor: selectedComboColor || undefined,
    };

    onChange([...components, newComponent]);

    // Reset selection state
    setSelectedProductId("");
    setSelectedVariantId("");
    setSelectedComboColor("");
    setQuantity(1);
    setSearchQuery("");
  };

  const handleRemoveComponent = (index: number) => {
    const updated = [...components];
    updated.splice(index, 1);
    onChange(updated);
  };

  // Filter products for the pro searcher
  const filteredSearchProducts = availableProducts.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // Check main product info
    const matchMain = (
      p.name.toLowerCase().includes(query) ||
      (p.codigo || "").toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
    if (matchMain) return true;

    // Check variant SKUs
    const matchVariants = (p.variants || []).some((v) => 
      (v.sku || "").toLowerCase().includes(query) ||
      (v.color || "").toLowerCase().includes(query) ||
      (v.size || "").toLowerCase().includes(query)
    );

    return matchVariants;
  });

  // Unique categories list for Buscador Pro Filter
  const uniqueCategories = Array.from(
    new Set(availableProducts.map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="space-y-5">
      {/* 1. CONFIGURACIÓN GENERAL DE VARIANTES DEL COMBO */}
      {onColorsChange && onSizesChange && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
            <Palette className="h-4 w-4" />
            <span>1. Configurar Talles y Colores del Combo</span>
          </div>

          <p className="text-[10px] text-zinc-500 leading-normal">
            Escribe los colores y talles del combo separados por comas. Luego pulsa el botón <strong>Crear / Generar Variantes</strong> para crearlas y poder asociarles sus productos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Palette className="h-3 w-3 text-zinc-400" />
                <span>Colores del Combo</span>
              </label>
              <input
                type="text"
                value={rawColorsInput}
                onChange={(e) => setRawColorsInput(e.target.value)}
                onBlur={handleColorsBlur}
                placeholder="p.ej. Negro, Azul, Blanco"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 transition-all"
              />
            </div>

            <div>
              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Ruler className="h-3 w-3 text-zinc-400" />
                <span>Talles del Combo</span>
              </label>
              <input
                type="text"
                value={rawSizesInput}
                onChange={(e) => setRawSizesInput(e.target.value)}
                onBlur={handleSizesBlur}
                placeholder="p.ej. Único, S, M, L"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 transition-all"
              />
            </div>
          </div>

          {/* New Explicit Generate/Update Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 dark:border-zinc-900">
            <div className="flex-1 text-[10px] text-zinc-500">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">¿Listo?</span> Pulsa el botón para generar las variantes (combinaciones de color/talle) de este combo en la tabla de abajo.
            </div>
            <button
              type="button"
              onClick={handleGenerateVariants}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-none transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <Sparkles className="h-4 w-4 animate-pulse text-indigo-200" />
              <span>🪄 Crear / Generar Variantes del Combo</span>
            </button>
          </div>

          {variants.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-900 space-y-3">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                ⚙️ Variantes Creadas y sus Artículos Componentes
              </span>
              <p className="text-[9.5px] text-zinc-500 leading-normal">
                Personaliza el código/SKU individual de cada variante, asóciale una foto, y <strong>asígnale directamente los productos simples que lo componen</strong> abajo.
              </p>
              
              <div className="overflow-hidden border border-slate-200 dark:border-zinc-800 rounded-xl text-xs shadow-inner">
                <table className="w-full text-left border-collapse bg-white dark:bg-zinc-950">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider">
                      <th className="p-2.5">Variante</th>
                      <th className="p-2.5">Código / SKU de la Variante</th>
                      <th className="p-2.5">Precio de Venta (Opcional)</th>
                      <th className="p-2.5">Asociar Imagen / Foto de Color</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => {
                      const specificComponents = components.filter((c) => {
                        const isMatchColor = c.comboColor === v.color;
                        const isMatchSize = (!v.size || v.size === "Único" || v.size === "Talla Única" || v.size === "Talle Único")
                          ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
                          : (c.comboSize === v.size);
                        return isMatchColor && isMatchSize;
                      });

                      return (
                        <React.Fragment key={v.id || i}>
                          {/* Main Row: SKU, Price, Image */}
                          <tr className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 text-slate-700 dark:text-zinc-300">
                            <td className="p-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {v.color} / {v.size}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10" 
                                    style={{ backgroundColor: v.colorCode || '#666' }}
                                  />
                                  <span className="text-[9px] text-zinc-400 font-mono">ID: {v.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                placeholder="SKU o Código"
                                value={v.sku || ""}
                                onChange={(e) => {
                                  if (onVariantsChange) {
                                    const nextArr = JSON.parse(JSON.stringify(variants));
                                    nextArr[i].sku = e.target.value.toUpperCase().replace(/\s+/g, "");
                                    onVariantsChange(nextArr);
                                  }
                                }}
                                className="w-full max-w-[200px] px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 transition-all"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <span className="text-zinc-400 font-bold">$</span>
                                <input
                                  type="number"
                                  placeholder="Mismo precio"
                                  value={v.price !== undefined ? v.price : ""}
                                  onChange={(e) => {
                                    if (onVariantsChange) {
                                      const nextArr = JSON.parse(JSON.stringify(variants));
                                      const val = e.target.value;
                                      if (val === "") {
                                        delete nextArr[i].price;
                                      } else {
                                        nextArr[i].price = Math.max(0, Number(val));
                                      }
                                      onVariantsChange(nextArr);
                                    }
                                  }}
                                  className="w-24 px-2 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 transition-all"
                                />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                {v.imageUrl && (
                                  <img
                                    src={v.imageUrl}
                                    alt="Color variant"
                                    className="h-9 w-9 object-cover rounded border border-indigo-200 shadow-sm shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <VariantImagePicker
                                  galleryImages={galleryImages}
                                  selectedUrl={v.imageUrl || ""}
                                  onChange={(url) => {
                                    if (onVariantsChange) {
                                      const nextArr = JSON.parse(JSON.stringify(variants));
                                      nextArr[i].imageUrl = url;
                                      onVariantsChange(nextArr);
                                    }
                                  }}
                                  showToast={showToast || ((msg, type) => console.log(`${type}: ${msg}`))}
                                />
                              </div>
                            </td>
                          </tr>

                          {/* Sub-row: Inline Component Assignment */}
                          <tr className="bg-indigo-50/10 dark:bg-zinc-900/10">
                            <td colSpan={4} className="p-3 border-b border-slate-100 dark:border-zinc-900/60">
                              <div className="bg-indigo-50/20 dark:bg-zinc-900/20 p-3 rounded-xl border border-indigo-100/40 dark:border-zinc-800/40 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                                    <span className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                                      🎒 Artículos de este Color/Talle: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{v.color} / {v.size}</span>
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-zinc-800 font-bold shadow-xs">
                                    {specificComponents.length} artículos vinculados
                                  </span>
                                </div>

                                {/* List of currently assigned items */}
                                {specificComponents.length === 0 ? (
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-zinc-950 p-3 rounded-lg border border-slate-150 dark:border-zinc-850">
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                                      Ningún artículo específico asignado. Este color usará solo los componentes comunes a todo el combo.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveVariantForModal(v);
                                        setModalSearchQuery("");
                                        setModalSelectedCategory("");
                                      }}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-indigo-100" />
                                      <span>Asociar Artículos (Buscador Pro)</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      {specificComponents.map((c, idxComp) => {
                                        const pObj = products.find(p => p.id === c.productId);
                                        const compVariantObj = pObj?.variants?.find(vObj => vObj.id === c.variantId);
                                        return (
                                          <div 
                                            key={idxComp} 
                                            className="inline-flex items-center gap-1.5 pl-2 py-0.5 pr-0.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-850 dark:text-zinc-200 shadow-xs"
                                          >
                                            {pObj?.imageUrl && (
                                              <img
                                                src={pObj.imageUrl}
                                                alt={pObj.name}
                                                className="h-5 w-5 object-cover rounded border border-slate-100 dark:border-zinc-800 shrink-0"
                                                referrerPolicy="no-referrer"
                                              />
                                            )}
                                            <span>{pObj ? pObj.name : "Producto desconocido"}</span>
                                            {compVariantObj && (
                                              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                                {compVariantObj.color} / {compVariantObj.size}
                                              </span>
                                            )}
                                            <span className="text-blue-600 dark:text-blue-400 font-extrabold px-1.5 py-0.5 bg-blue-50 dark:bg-zinc-950 border border-blue-100 dark:border-zinc-800 rounded font-mono">
                                              x{c.quantity}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleRemoveSpecificComponent(c.productId, c.variantId, c.comboColor, c.comboSize);
                                              }}
                                              className="text-rose-500 hover:text-rose-750 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1 rounded-md transition-colors cursor-pointer"
                                              title="Desvincular artículo"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveVariantForModal(v);
                                          setModalSearchQuery("");
                                          setModalSelectedCategory("");
                                        }}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                                      >
                                        <Sparkles className="h-3.5 w-3.5 text-indigo-100 animate-pulse" />
                                        <span>Administrar Artículos (Buscador Pro)</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. FORMULARIO INTERACTIVO PARA AGREGAR COMPONENTES (PRO CON IMÁGENES) */}
      <div className="p-4 rounded-xl border border-blue-100 dark:border-zinc-800 bg-blue-50/20 dark:bg-zinc-900/10 space-y-3.5">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider">
          <Layers className="h-4 w-4" />
          <span>2. Agregar Componente al Combo</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* SEARCHER PRO WITH IMAGES */}
          {!selectedProduct ? (
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                Buscar Producto Simple
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Escribe el nombre, código o categoría para buscar..."
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>

              {/* FLOATING DROPDOWN LIST */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl divide-y divide-slate-100 dark:divide-zinc-850">
                  {filteredSearchProducts.length === 0 ? (
                    <div className="p-4 text-center text-zinc-400 italic text-xs">
                      No se encontraron productos simples...
                    </div>
                  ) : (
                    filteredSearchProducts.map((p) => {
                      const totalStock = (p.stockPinamar || 0) + (p.stockMontevideo || 0);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setSelectedVariantId("");
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-3 transition-colors"
                        >
                          {/* Product Image Thumbnail */}
                          <img
                            src={p.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=80&q=80"}
                            alt={p.name}
                            className="h-10 w-10 object-cover rounded border border-slate-100 dark:border-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                ${Math.round(p.price)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p.codigo && (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded">
                                  {p.codigo}
                                </span>
                              )}
                              {p.isCombo && (
                                <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded uppercase tracking-wider">
                                  Combo
                                </span>
                              )}
                              {p.active === false && (
                                <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded uppercase tracking-wider">
                                  Inactivo
                                </span>
                              )}
                              {p.paused && (
                                <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded uppercase tracking-wider">
                                  Pausado
                                </span>
                              )}
                              <span className="text-[9px] text-zinc-400 truncate">
                                {p.category}
                              </span>
                              <span className="ml-auto text-[9.5px] font-semibold text-zinc-400">
                                Stock: <span className={totalStock > 0 ? "text-emerald-500" : "text-rose-500"}>{totalStock}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            /* SELECTED PRODUCT PRESENTATION CARD */
            <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-blue-100 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row md:items-center gap-4 animate-fade-in">
              <img
                src={selectedProduct.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=80&q=80"}
                alt={selectedProduct.name}
                className="h-12 w-12 object-cover rounded-lg border border-slate-100 dark:border-zinc-850 self-start md:self-center"
                referrerPolicy="no-referrer"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </h4>
                  {selectedProduct.codigo && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded">
                      {selectedProduct.codigo}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-blue-400 rounded-full">
                    {selectedProduct.category}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Costo Compra: <span className="font-mono text-zinc-500 dark:text-zinc-300">${selectedProduct.precioCompra || 0}</span> | 
                  Venta: <span className="font-mono text-blue-500">${selectedProduct.price}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedProductId("");
                  setSelectedVariantId("");
                  setQuantity(1);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-350 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer self-start md:self-auto"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cambiar Producto</span>
              </button>
            </div>
          )}

          {/* DYNAMIC VARIANT, QUANTITY AND DESTINATION COLOR CHOOSERS */}
          {selectedProduct && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-slate-100 dark:border-zinc-900 items-end animate-fade-in">
              {/* Product Variant (Size / Color of Component) */}
              {selectedProductVariants.length > 0 ? (
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Tag className="h-3 w-3 text-zinc-400" />
                    <span>Variante del Componente</span>
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="">-- Seleccionar variante --</option>
                    {selectedProductVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.color} / Talle: {v.size} (Stk: P:{v.stockPinamar || 0} | M:{v.stockMontevideo || 0})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="opacity-60">
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                    Variante del Componente
                  </label>
                  <div className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-900 rounded-lg text-xs text-zinc-500 font-semibold italic select-none">
                    Sin variantes disponibles
                  </div>
                </div>
              )}

              {/* Combo Destination Color Match */}
              {colors.length > 0 ? (
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Palette className="h-3 w-3 text-indigo-400" />
                    <span>¿Para qué Color de Combo?</span>
                  </label>
                  <select
                    value={selectedComboColor}
                    onChange={(e) => setSelectedComboColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-950 rounded-lg text-xs outline-none text-indigo-600 dark:text-indigo-400 font-bold cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">✨ Común a todo el Combo</option>
                    {colors.map((c) => (
                      <option key={c} value={c}>
                        🎨 Solo Combo {c}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="opacity-60">
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Palette className="h-3 w-3 text-zinc-400" />
                    <span>¿Para qué Color de Combo?</span>
                  </label>
                  <div className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-900 rounded-lg text-xs text-zinc-500 font-semibold italic select-none">
                    Define colores del combo arriba
                  </div>
                </div>
              )}

              {/* Quantity Required */}
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                  Cantidad Requerida
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-white rounded-l-lg border-y border-l border-slate-200 dark:border-zinc-800 text-xs font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 text-center py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-white rounded-r-lg border-y border-r border-slate-200 dark:border-zinc-800 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add Button */}
              <button
                type="button"
                onClick={handleAddComponent}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all h-[34px] w-full"
              >
                <Plus className="h-4 w-4" />
                <span>Añadir al Combo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. TABLA DE COMPONENTES AGREGADOS */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
        <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-850 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            Componentes del Combo ({components.length})
          </span>
          {colors.length > 0 && (
            <span className="text-[10px] text-zinc-400">
              💡 Vincula componentes a colores para calcular el stock por color de forma independiente.
            </span>
          )}
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-150 dark:border-zinc-850 text-[10px] uppercase tracking-wider">
              <th className="p-3">Producto Componente</th>
              <th className="p-3">Variante Original</th>
              <th className="p-3 text-center">Color Combo</th>
              <th className="p-3 text-center">Cantidad</th>
              <th className="p-3 text-right">Costo Compra</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {components.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-zinc-400 italic">
                  Aún no has agregado componentes a este combo. Usa el buscador pro de arriba.
                </td>
              </tr>
            ) : (
              components.map((c, idx) => {
                const prod = products.find((p) => p.id === c.productId);
                if (!prod) return null;

                let variantObj = null;
                if (c.variantId) {
                  variantObj = prod.variants?.find((v) => v.id === c.variantId);
                }

                const name = prod.name;
                const variantText = variantObj
                  ? `${variantObj.color} / Talle: ${variantObj.size}`
                  : "Estándar / Sin variantes";

                const costUnit = prod.precioCompra || 0;
                const costTotal = costUnit * c.quantity;

                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={prod.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=60&q=80"}
                          alt={name}
                          className="h-8 w-8 object-cover rounded border border-slate-100 dark:border-zinc-850 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 dark:text-zinc-200 block truncate">
                            {name}
                          </span>
                          {prod.codigo && (
                            <span className="text-[9px] font-mono font-semibold text-zinc-400">
                              SKU: {prod.codigo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-zinc-500 dark:text-zinc-400">
                      {variantText}
                    </td>
                    <td className="p-3 text-center">
                      {c.comboColor ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                          🎨 Combo {c.comboColor}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          ✨ Común a todo
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-extrabold font-mono text-blue-600 dark:text-blue-400 text-xs">
                      {c.quantity}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-slate-700 dark:text-zinc-300">
                      ${Math.round(costTotal)}
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans">
                        (${Math.round(costUnit)} c/u)
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                        title="Eliminar Componente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. BUSCADOR PRO MODAL FOR COMBO VARIANTS */}
      {activeVariantForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fade-in p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-slate-200 dark:border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    🪄 Buscador Pro - Artículos de la Variante
                  </h3>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    Color: {activeVariantForModal.color} / Talle: {activeVariantForModal.size}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVariantForModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-250 dark:hover:bg-zinc-900 text-zinc-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Search & Filters & Products list (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Busca por nombre, SKU, código..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 transition-all"
                    />
                    {modalSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setModalSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div className="relative w-full sm:w-48">
                    <select
                      value={modalSelectedCategory}
                      onChange={(e) => setModalSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-700 dark:text-white font-semibold focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 cursor-pointer appearance-none"
                    >
                      <option value="">📁 Todas Categorías</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Filtered Products List */}
                <div className="flex-1 overflow-y-auto border border-slate-150 dark:border-zinc-850 rounded-xl divide-y divide-slate-100 dark:divide-zinc-900 bg-slate-50/20 dark:bg-zinc-900/10 min-h-[250px] max-h-[50vh]">
                  {availableProducts.filter((p) => {
                    const query = modalSearchQuery.toLowerCase().trim();
                    const categoryMatch = !modalSelectedCategory || p.category === modalSelectedCategory;
                    if (!categoryMatch) return false;
                    if (!query) return true;
                    return (
                      p.name.toLowerCase().includes(query) ||
                      (p.codigo || "").toLowerCase().includes(query) ||
                      p.category.toLowerCase().includes(query) ||
                      (p.variants || []).some(v => (v.sku || "").toLowerCase().includes(query))
                    );
                  }).length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 italic text-xs">
                      No se encontraron artículos simples con los filtros actuales.
                    </div>
                  ) : (
                    availableProducts.filter((p) => {
                      const query = modalSearchQuery.toLowerCase().trim();
                      const categoryMatch = !modalSelectedCategory || p.category === modalSelectedCategory;
                      if (!categoryMatch) return false;
                      if (!query) return true;
                      return (
                        p.name.toLowerCase().includes(query) ||
                        (p.codigo || "").toLowerCase().includes(query) ||
                        p.category.toLowerCase().includes(query) ||
                        (p.variants || []).some(v => (v.sku || "").toLowerCase().includes(query))
                      );
                    }).map((p) => {
                      const totalStock = (p.stockPinamar || 0) + (p.stockMontevideo || 0);
                      const hasVariants = p.variants && p.variants.length > 0;

                      return (
                        <div key={p.id} className="p-3 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <img
                              src={p.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=60&q=80"}
                              alt={p.name}
                              className="h-10 w-10 object-cover rounded border border-slate-150 dark:border-zinc-850 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 dark:text-zinc-200 block truncate">
                                {p.name}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400">
                                <span className="font-mono font-semibold">Cód: {p.codigo || "S/C"}</span>
                                <span>•</span>
                                <span className="font-medium bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[9.5px]">
                                  {p.category || "Estándar"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action panel */}
                          <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
                            {hasVariants ? (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block font-mono">
                                  Variantes del Artículo:
                                </span>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {p.variants?.map((pv) => {
                                    const pvQty = modalQuantities[pv.id] || 1;
                                    return (
                                      <div key={pv.id} className="flex items-center justify-between gap-3 p-1.5 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800">
                                        <div className="text-[10.5px]">
                                          <span className="font-bold text-slate-700 dark:text-zinc-300">
                                            {pv.color} / {pv.size}
                                          </span>
                                          <span className="text-[9px] text-zinc-400 block font-mono">
                                            Stk: Pinamar: {pv.stockPinamar || 0} | Mvd: {pv.stockMontevideo || 0}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {/* Quantity Selector */}
                                          <div className="flex items-center border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded overflow-hidden">
                                            <button
                                              type="button"
                                              onClick={() => setModalQuantities(prev => ({ ...prev, [pv.id]: Math.max(1, pvQty - 1) }))}
                                              className="px-1.5 py-0.5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900 font-bold"
                                            >
                                              -
                                            </button>
                                            <span className="px-1 w-5 text-center font-bold text-[10.5px]">
                                              {pvQty}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setModalQuantities(prev => ({ ...prev, [pv.id]: pvQty + 1 }))}
                                              className="px-1.5 py-0.5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900 font-bold"
                                            >
                                              +
                                            </button>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleAddInlineComponent(activeVariantForModal.color, activeVariantForModal.size, p.id, pv.id, pvQty);
                                            }}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] cursor-pointer transition-colors shadow-xs"
                                          >
                                            Vincular
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between md:justify-end gap-2 bg-slate-50 dark:bg-zinc-900 p-1.5 rounded border border-slate-200 dark:border-zinc-800">
                                <span className="text-[10px] text-zinc-400 mr-2 font-mono">
                                  Stock: {totalStock}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {/* Quantity selector */}
                                  <div className="flex items-center border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setModalQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (modalQuantities[p.id] || 1) - 1) }))}
                                      className="px-1.5 py-0.5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900 font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="px-1 w-5 text-center font-bold text-[10.5px]">
                                      {modalQuantities[p.id] || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setModalQuantities(prev => ({ ...prev, [p.id]: (modalQuantities[p.id] || 1) + 1 }))}
                                      className="px-1.5 py-0.5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900 font-bold"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAddInlineComponent(activeVariantForModal.color, activeVariantForModal.size, p.id, undefined, modalQuantities[p.id] || 1);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] cursor-pointer transition-colors shadow-xs"
                                  >
                                    Vincular Artículo Único
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Currently linked summary for activeVariantForModal (5 cols) */}
              <div className="lg:col-span-5 bg-indigo-50/15 dark:bg-zinc-900/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-zinc-800 flex flex-col gap-3 min-w-0">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                  <Layers className="h-4 w-4" />
                  <span>Artículos de esta Variante ({
                    components.filter((c) => {
                      const isMatchColor = c.comboColor === activeVariantForModal.color;
                      const isMatchSize = (!activeVariantForModal.size || activeVariantForModal.size === "Único" || activeVariantForModal.size === "Talla Única" || activeVariantForModal.size === "Talle Único")
                        ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
                        : (c.comboSize === activeVariantForModal.size);
                      return isMatchColor && isMatchSize;
                    }).length
                  })</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh] pr-1">
                  {components.filter((c) => {
                    const isMatchColor = c.comboColor === activeVariantForModal.color;
                    const isMatchSize = (!activeVariantForModal.size || activeVariantForModal.size === "Único" || activeVariantForModal.size === "Talla Única" || activeVariantForModal.size === "Talle Único")
                      ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
                      : (c.comboSize === activeVariantForModal.size);
                    return isMatchColor && isMatchSize;
                  }).length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 italic text-[11px] bg-white dark:bg-zinc-950/40 rounded-xl border border-slate-150 dark:border-zinc-850">
                      Ningún producto vinculado a esta variante de combo. Utiliza el buscador de la izquierda.
                    </div>
                  ) : (
                    components.filter((c) => {
                      const isMatchColor = c.comboColor === activeVariantForModal.color;
                      const isMatchSize = (!activeVariantForModal.size || activeVariantForModal.size === "Único" || activeVariantForModal.size === "Talla Única" || activeVariantForModal.size === "Talle Único")
                        ? (!c.comboSize || c.comboSize === "Único" || c.comboSize === "Talla Única" || c.comboSize === "Talle Único")
                        : (c.comboSize === activeVariantForModal.size);
                      return isMatchColor && isMatchSize;
                    }).map((c, idxComp) => {
                      const pObj = products.find(p => p.id === c.productId);
                      if (!pObj) return null;
                      const compVariantObj = pObj.variants?.find(vObj => vObj.id === c.variantId);

                      return (
                        <div key={idxComp} className="p-2.5 bg-white dark:bg-zinc-950 rounded-xl border border-slate-150 dark:border-zinc-850 flex items-center justify-between gap-3 text-xs shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={pObj.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=40&q=80"}
                              alt={pObj.name}
                              className="h-8 w-8 object-cover rounded border border-slate-100 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 dark:text-zinc-200 block truncate text-[11px]">
                                {pObj.name}
                              </span>
                              {compVariantObj && (
                                <span className="text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/30 px-1 py-0.2 rounded font-mono font-bold block w-fit mt-0.5">
                                  {compVariantObj.color} / {compVariantObj.size}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Linked Quantity editor */}
                            <div className="flex items-center border border-slate-150 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-900 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateComponentQuantity(c.productId, c.variantId, c.comboColor, c.comboSize, c.quantity - 1)}
                                className="px-1.5 py-0.5 text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-800 font-bold"
                              >
                                -
                              </button>
                              <span className="px-1 w-5 text-center font-bold font-mono">
                                {c.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateComponentQuantity(c.productId, c.variantId, c.comboColor, c.comboSize, c.quantity + 1)}
                                className="px-1.5 py-0.5 text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-800 font-bold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveSpecificComponent(c.productId, c.variantId, c.comboColor, c.comboSize);
                              }}
                              className="text-rose-500 hover:text-rose-750 hover:bg-rose-50 dark:hover:bg-rose-950/25 p-1 rounded-md transition-all cursor-pointer"
                              title="Desvincular artículo"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-850 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveVariantForModal(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Listo / Confirmar Asociación
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
