import React, { useMemo } from "react";
import {
  Product,
  getVariantGalleryImages,
  getDefaultCardRotationImages
} from "../types";
import {
  Images,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Lock,
  Layers,
  Check,
  Plus,
  AlertTriangle
} from "lucide-react";

interface CardRotationImagesSelectorProps {
  product: Partial<Product>;
  onChange: (nextImages: string[]) => void;
}

export default function CardRotationImagesSelector({
  product,
  onChange
}: CardRotationImagesSelectorProps) {
  const generalImages = useMemo(() => {
    const list: string[] = [];
    const addUnique = (raw?: string) => {
      const u = typeof raw === "string" ? raw.trim() : "";
      if (u && !list.includes(u)) list.push(u);
    };
    addUnique(product.imageUrl);
    if (Array.isArray(product.imagenes)) {
      product.imagenes.forEach((u) => addUnique(u));
    }
    return list;
  }, [product.imageUrl, product.imagenes]);

  const variantGroups = useMemo(() => {
    const vars = Array.isArray(product.variants) ? product.variants : [];
    return vars
      .map((v, idx) => ({
        index: idx,
        label: [v.color || "General", v.size || "Único"].filter(Boolean).join(" · "),
        colorCode: v.colorCode || "#6b7280",
        images: getVariantGalleryImages(v)
      }))
      .filter((g) => g.images.length > 0);
  }, [product.variants]);

  const variantPrimaryImages = useMemo(() => {
    const list: string[] = [];
    for (const g of variantGroups) {
      const first = g.images[0];
      if (first && !list.includes(first)) list.push(first);
    }
    return list;
  }, [variantGroups]);

  const autoImages = useMemo(
    () => getDefaultCardRotationImages(product as Product),
    [product]
  );

  const selectedImages = useMemo(() => {
    if (!Array.isArray(product.cardRotationImages)) return [];
    const cleaned: string[] = [];
    for (const raw of product.cardRotationImages) {
      const u = typeof raw === "string" ? raw.trim() : "";
      if (u && !cleaned.includes(u)) cleaned.push(u);
    }
    return cleaned;
  }, [product.cardRotationImages]);

  const isCustom = selectedImages.length > 0;
  const isFixedSingle = isCustom && selectedImages.length === 1;

  // Map image URL -> human-readable origin label
  const originMap = useMemo(() => {
    const map = new Map<string, string[]>();
    generalImages.forEach((url, idx) => {
      const arr = map.get(url) || [];
      arr.push(idx === 0 ? "Portada general" : `Galería #${idx + 1}`);
      map.set(url, arr);
    });
    variantGroups.forEach((g) => {
      g.images.forEach((url) => {
        const arr = map.get(url) || [];
        if (!arr.includes(g.label)) arr.push(g.label);
        map.set(url, arr);
      });
    });
    return map;
  }, [generalImages, variantGroups]);

  const totalPoolCount = useMemo(() => {
    const all = new Set<string>(generalImages);
    variantGroups.forEach((g) => g.images.forEach((u) => all.add(u)));
    return all.size;
  }, [generalImages, variantGroups]);

  const toggleImage = (url: string) => {
    const clean = url.trim();
    if (!clean) return;
    if (selectedImages.includes(clean)) {
      const next = selectedImages.filter((u) => u !== clean);
      onChange(next);
    } else {
      onChange([...selectedImages, clean]);
    }
  };

  const moveSelected = (index: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedImages.length) return;
    const copy = [...selectedImages];
    const tmp = copy[targetIdx];
    copy[targetIdx] = copy[index];
    copy[index] = tmp;
    onChange(copy);
  };

  const removeSelected = (url: string) => {
    onChange(selectedImages.filter((u) => u !== url));
  };

  const handleOnlyPrimaryFixed = () => {
    const primary = generalImages[0] || autoImages[0];
    if (primary) {
      onChange([primary]);
    }
  };

  const handleCombinePrimaryAndVariants = () => {
    const combined: string[] = [];
    const primary = generalImages[0];
    if (primary) combined.push(primary);
    for (const vImg of variantPrimaryImages) {
      if (!combined.includes(vImg)) combined.push(vImg);
    }
    if (combined.length > 0) onChange(combined);
  };

  const handleVariantsOnly = () => {
    if (variantPrimaryImages.length > 0) {
      onChange(variantPrimaryImages);
    }
  };

  const handleCopyFromAuto = () => {
    if (autoImages.length > 0) {
      onChange([...autoImages]);
    }
  };

  const handleResetAuto = () => {
    onChange([]);
  };

  if (totalPoolCount === 0 && selectedImages.length === 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#050B1A]/75 border border-[#D4A55A]/30 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h5 className="text-xs font-black text-[#D4A55A] uppercase tracking-wider flex items-center gap-2">
            <Images className="h-4 w-4 shrink-0" />
            <span>Control de Rotación en Tarjeta del Catálogo</span>
          </h5>
          <p className="text-[10.5px] text-zinc-400 mt-0.5 leading-relaxed">
            Elegí exactamente qué imágenes cambian en la tarjeta del catálogo y en qué orden. Podés combinar fotos de la galería general y de las variantes, o dejar una sola imagen fija sin rotación.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-center">
          {!isCustom ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-800/90 text-zinc-300 border border-zinc-700">
              Automático ({autoImages.length} {autoImages.length === 1 ? "img" : "imgs"})
            </span>
          ) : isFixedSingle ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Imagen fija (sin rotación)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#D4A55A]/20 text-[#E6BF76] border border-[#D4A55A]/45">
              Personalizada ({selectedImages.length} imgs)
            </span>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(generalImages[0] || autoImages[0]) && (
          <button
            type="button"
            onClick={handleOnlyPrimaryFixed}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-[#D4A55A]/50 transition-all cursor-pointer flex items-center gap-1"
            title="Mostrar solo 1 imagen en la tarjeta del catálogo sin rotación"
          >
            <Lock className="h-3 w-3 text-[#D4A55A]" />
            <span>Solo portada (fija)</span>
          </button>
        )}

        {variantPrimaryImages.length > 0 && generalImages[0] && (
          <button
            type="button"
            onClick={handleCombinePrimaryAndVariants}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-[#D4A55A]/50 transition-all cursor-pointer flex items-center gap-1"
          >
            <Layers className="h-3 w-3 text-[#D4A55A]" />
            <span>Combinar portada + 1ª de variantes</span>
          </button>
        )}

        {variantPrimaryImages.length > 0 && (
          <button
            type="button"
            onClick={handleVariantsOnly}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-[#D4A55A]/50 transition-all cursor-pointer flex items-center gap-1"
          >
            <Layers className="h-3 w-3 text-amber-400" />
            <span>Solo 1ª de cada variante</span>
          </button>
        )}

        {!isCustom && autoImages.length > 0 && (
          <button
            type="button"
            onClick={handleCopyFromAuto}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-[#D4A55A]/50 transition-all cursor-pointer"
          >
            Editar lista automática
          </button>
        )}

        {isCustom && (
          <button
            type="button"
            onClick={handleResetAuto}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-red-950/40 text-zinc-300 hover:text-red-300 border border-zinc-700 hover:border-red-500/40 transition-all cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restablecer automático</span>
          </button>
        )}
      </div>

      {/* Active Ordered Sequence Preview */}
      {isCustom ? (
        <div className="p-3 rounded-xl bg-[#030712]/80 border border-[#D4A55A]/25 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-[#E6BF76] uppercase tracking-wider">
              {selectedImages.length === 1
                ? "Imagen fija activa en catálogo (no rotará)"
                : `Secuencia de rotación activa (${selectedImages.length} imágenes)`}
            </span>
            <span className="text-[9.5px] text-zinc-400">
              Usá las flechas para cambiar el orden
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {selectedImages.map((url, idx) => {
              const origins = originMap.get(url) || [];
              const isOrphaned = origins.length === 0;
              return (
                <div
                  key={`${url}-${idx}`}
                  className={`relative w-24 rounded-xl overflow-hidden border bg-[#0B1730] flex flex-col ${
                    idx === 0
                      ? "border-[#D4A55A] ring-1 ring-[#D4A55A]/30"
                      : "border-zinc-700"
                  }`}
                >
                  <div className="relative aspect-square bg-black/40">
                    <img
                      src={url}
                      alt={`Rotación #${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded ${
                        idx === 0
                          ? "bg-[#D4A55A] text-[#050B1A]"
                          : "bg-black/75 text-white"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSelected(url)}
                      className="absolute top-1 right-1 p-0.5 rounded bg-black/75 hover:bg-red-600 text-white transition-colors cursor-pointer"
                      title="Quitar de rotación"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="p-1.5 space-y-1 bg-[#050B1A]/90">
                    <div
                      className="text-[9px] text-zinc-300 truncate font-medium flex items-center gap-1"
                      title={isOrphaned ? "Imagen ya no está en galerías actuales" : origins.join(" / ")}
                    >
                      {isOrphaned && <AlertTriangle className="h-2.5 w-2.5 text-amber-400 shrink-0" />}
                      <span className="truncate">
                        {isOrphaned ? "Solo en rotación" : origins[0]}
                      </span>
                    </div>
                    {selectedImages.length > 1 && (
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSelected(idx, "left")}
                          className={`flex-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center ${
                            idx === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                          }`}
                          title="Mover antes"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedImages.length - 1}
                          onClick={() => moveSelected(idx, "right")}
                          className={`flex-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center ${
                            idx === selectedImages.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                          }`}
                          title="Mover después"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Vista previa automática actual ({autoImages.length}{" "}
              {autoImages.length === 1 ? "imagen" : "imágenes"})
            </span>
            <span className="text-[9.5px] text-zinc-500">
              Hacé clic en cualquier imagen de abajo para armar tu selección
            </span>
          </div>
          {autoImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {autoImages.map((url, idx) => (
                <div
                  key={`auto-${url}-${idx}`}
                  className="relative w-14 h-14 rounded-lg overflow-hidden border border-zinc-800 bg-[#0B1730] opacity-85"
                >
                  <img
                    src={url}
                    alt={`Auto #${idx + 1}`}
                    className="w-full h-full object-contain p-0.5"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0.5 left-0.5 text-[8px] font-mono px-1 rounded bg-black/75 text-zinc-300">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unified Picker Pool: General Gallery + Each Variant Gallery */}
      <div className="space-y-3">
        {generalImages.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider">
              Galería General del Artículo ({generalImages.length})
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {generalImages.map((url, idx) => {
                const selectedIdx = selectedImages.indexOf(url);
                const isSelected = selectedIdx !== -1;
                return (
                  <button
                    key={`gen-${url}-${idx}`}
                    type="button"
                    onClick={() => toggleImage(url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer group ${
                      isSelected
                        ? "border-[#D4A55A] ring-2 ring-[#D4A55A]/30 bg-[#0B1730]"
                        : "border-zinc-800 hover:border-[#D4A55A]/60 bg-[#030712]"
                    }`}
                    title={
                      isSelected
                        ? `Quitar de tarjeta (actualmente #${selectedIdx + 1})`
                        : "Agregar a rotación de tarjeta"
                    }
                  >
                    <img
                      src={url}
                      alt={`General #${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1 rounded bg-black/75 text-zinc-300">
                        Portada
                      </span>
                    )}
                    {isSelected ? (
                      <span className="absolute top-1 right-1 bg-[#D4A55A] text-[#050B1A] text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
                        <Check className="h-2.5 w-2.5" />
                        <span>#{selectedIdx + 1}</span>
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 bg-black/70 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded">
                        <Plus className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {variantGroups.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
            <div className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider">
              Galerías de Variantes ({variantGroups.length})
            </div>
            <div className="space-y-2.5">
              {variantGroups.map((group) => (
                <div
                  key={`vg-${group.index}-${group.label}`}
                  className="p-2.5 rounded-xl bg-[#030712]/60 border border-zinc-800/90 space-y-2"
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#F4EAD7]">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                      style={{ backgroundColor: group.colorCode }}
                    />
                    <span>{group.label}</span>
                    <span className="text-zinc-500 font-normal">
                      ({group.images.length}{" "}
                      {group.images.length === 1 ? "imagen" : "imágenes"})
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {group.images.map((url, imgIdx) => {
                      const selectedIdx = selectedImages.indexOf(url);
                      const isSelected = selectedIdx !== -1;
                      return (
                        <button
                          key={`var-${group.index}-${url}-${imgIdx}`}
                          type="button"
                          onClick={() => toggleImage(url)}
                          className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer group ${
                            isSelected
                              ? "border-[#D4A55A] ring-2 ring-[#D4A55A]/30 bg-[#0B1730]"
                              : "border-zinc-800 hover:border-[#D4A55A]/60 bg-[#050B1A]"
                          }`}
                          title={
                            isSelected
                              ? `Quitar de tarjeta (actualmente #${selectedIdx + 1})`
                              : `Combinar imagen de ${group.label} en rotación`
                          }
                        >
                          <img
                            src={url}
                            alt={`${group.label} #${imgIdx + 1}`}
                            className="w-full h-full object-contain p-1"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected ? (
                            <span className="absolute top-1 right-1 bg-[#D4A55A] text-[#050B1A] text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
                              <Check className="h-2.5 w-2.5" />
                              <span>#{selectedIdx + 1}</span>
                            </span>
                          ) : (
                            <span className="absolute top-1 right-1 bg-black/70 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded">
                              <Plus className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
