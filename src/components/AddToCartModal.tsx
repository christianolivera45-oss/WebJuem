import React from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToCheckout: () => void;
  product: Product | null;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  themeMode?: "light" | "dark";
  allProducts?: Product[];
  onAddCrossSell?: (product: Product, size?: string, color?: string, qty?: number) => void;
}

export default function AddToCartModal({
  isOpen,
  onClose,
  onGoToCheckout,
  product,
  quantity,
  selectedSize,
  selectedColor,
  themeMode,
  allProducts,
  onAddCrossSell
}: AddToCartModalProps) {
  if (!product) return null;

  const isDark = themeMode === "dark";
  const [addedCrossSells, setAddedCrossSells] = React.useState<Record<string, boolean>>({});

  // Memoized cross-selling products selection
  const crossSellProducts = React.useMemo(() => {
    if (!product || !allProducts || allProducts.length === 0) return [];

    // Filter active and non-paused/in-stock products that are NOT the current one
    const eligible = allProducts.filter(
      p => p.id !== product.id && 
           p.active !== false && 
           p.paused !== true && 
           p.stock > 0
    );

    // Try to find products in the same category first (using categoria_id, subcategoria_id, or category)
    let related = eligible.filter(p => {
      if (product.categoria_id && p.categoria_id) {
        return p.categoria_id === product.categoria_id;
      }
      return p.category === product.category;
    });

    // If we have fewer than 2 related products, fill up with featured or any other active ones
    if (related.length < 2) {
      const remaining = eligible.filter(p => !related.some(r => r.id === p.id));
      related = [...related, ...remaining];
    }

    // Return at most 2 items
    return related.slice(0, 2);
  }, [product, allProducts]);

  const handleAddCrossSellClick = (item: Product) => {
    if (onAddCrossSell) {
      // Pick first size and color if available
      const size = item.sizes && item.sizes.length > 0 ? item.sizes[0] : undefined;
      const color = item.colors && item.colors.length > 0 ? item.colors[0] : undefined;
      
      onAddCrossSell(item, size, color, 1);
      
      // Set local added state for checkmark feedback
      setAddedCrossSells(prev => ({ ...prev, [item.id]: true }));
      
      // Reset feedback after 2 seconds
      setTimeout(() => {
        setAddedCrossSells(prev => ({ ...prev, [item.id]: false }));
      }, 2000);
    }
  };

  const activeSku = React.useMemo(() => {
    if (!product) return "";
    let sku = product.codigo || "";
    if (product.variants && product.variants.length > 0 && selectedSize) {
      const exactMatch = selectedColor 
        ? product.variants.find(v => v.size === selectedSize && v.color === selectedColor)
        : null;
      const sizeMatch = product.variants.find(v => v.size === selectedSize);
      const match = exactMatch || sizeMatch;
      if (match && match.sku) {
        sku = match.sku;
      }
    }
    return sku;
  }, [product, selectedSize, selectedColor]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop blur & overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`relative w-full max-w-md rounded-2xl border shadow-xl p-6 overflow-hidden flex flex-col ${
              isDark 
                ? "bg-[#0B1730] border-[#D4A55A]/25 text-[#F4EAD7]" 
                : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            {/* Header: Short & direct */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6.5 h-6.5 rounded-full bg-[#D4A55A]/15 text-[#E6BF76] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className={`text-sm font-extrabold tracking-tight ${isDark ? "text-[#F4EAD7]" : "text-slate-900"}`}>
                Agregado al carrito de compras
              </span>
            </div>

            {/* Compact Product Details block */}
            <div className={`p-3 rounded-xl border mb-5 flex items-center gap-4.5 ${
              isDark 
                ? "bg-[#050B1A]/45 border-[#D4A55A]/15" 
                : "bg-slate-50 border-slate-100"
            }`}>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-14 h-14 rounded-lg object-contain bg-[#050B1A]/40 shrink-0 border border-[#D4A55A]/10 p-0.5"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0 font-sans">
                <h4 className="text-sm font-black truncate text-[#F4EAD7] dark:text-white">
                  {product.name}
                </h4>
                {activeSku && (
                  <p className="text-[10px] font-mono font-bold text-indigo-400 mt-0.5 tracking-wider">
                    Cód: {activeSku}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[11px] opacity-75">
                  <span className="font-medium text-slate-400 dark:text-zinc-400">Cant: {quantity}</span>
                  {(selectedSize || selectedColor) && <span className="opacity-40 text-slate-400">•</span>}
                  {selectedSize && <span className="font-medium text-slate-400 dark:text-zinc-400">Talle: {selectedSize}</span>}
                  {selectedColor && <span className="font-medium text-slate-400 dark:text-zinc-400">Color: {selectedColor}</span>}
                </div>
              </div>
              <span className={`font-mono text-sm font-black shrink-0 ${isDark ? "text-[#E6BF76]" : "text-indigo-600"}`}>
                UYU ${Math.round(product.price * quantity)}
              </span>
            </div>

            {/* Cross-selling Recommendations Section */}
            {crossSellProducts.length > 0 && (
              <div className="mb-6 mt-1 border-t border-dashed border-[#D4A55A]/15 dark:border-zinc-800 pt-4">
                <span className={`text-[10px] uppercase font-black tracking-wider block mb-3 opacity-80 ${isDark ? "text-[#D4A55A]/80" : "text-slate-505"}`}>
                  ¡Completa tu pedido! Te sugerimos:
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  {crossSellProducts.map((item) => {
                    const isAdded = addedCrossSells[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition relative overflow-hidden ${
                          isDark 
                            ? "bg-[#050B1A]/30 border-[#D4A55A]/15 hover:border-[#D4A55A]/35 text-white" 
                            : "bg-slate-100/50 border-slate-200/60 hover:border-slate-200 text-slate-800"
                        }`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-md object-contain bg-[#050B1A]/40 shrink-0 border border-[#D4A55A]/10 p-0.5"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 pr-6">
                          <h5 className="text-[11px] font-bold truncate text-[#F4EAD7]">
                            {item.name}
                          </h5>
                          <span className={`font-mono text-[10px] font-extrabold block mt-0.5 ${isDark ? "text-[#E6BF76]" : "text-indigo-600"}`}>
                            UYU ${Math.round(item.price)}
                          </span>
                        </div>
                        
                        {/* Quick plus add button */}
                        <button
                          type="button"
                          onClick={() => handleAddCrossSellClick(item)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center transition cursor-pointer ${
                            isAdded 
                              ? "bg-emerald-500 text-white" 
                              : isDark 
                                ? "bg-[#0B1730] hover:bg-[#D4A55A]/10 text-[#E6BF76] border border-[#D4A55A]/25" 
                                : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                          title="Agregar al carrito"
                        >
                          {isAdded ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : (
                            <span className="text-sm font-bold leading-none">+</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Split CTA buttons list */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={onClose}
                className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                  isDark 
                    ? "bg-[#0B1730] hover:bg-[#D4A55A]/10 border-[#D4A55A]/20 text-[#F4EAD7]" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                Seguir comprando
              </button>
              <button
                onClick={onGoToCheckout}
                className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-center shadow-lg uppercase tracking-wider ${
                  isDark
                    ? "bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] shadow-[#D4A55A]/10"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10"
                }`}
              >
                Ir a pagar →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
