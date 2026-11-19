import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Link as LinkIcon,
  Trash2,
  GripHorizontal,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  FolderOpen,
  Search,
  Sparkles,
  Loader2,
  Plus,
  Star,
  Copy
} from "lucide-react";
import { ProductVariant, getVariantGalleryImages } from "../types";

export interface VariantGalleryManagerProps {
  variant: ProductVariant;
  variantIndex: number;
  allVariants: ProductVariant[];
  isThemeDark?: boolean;
  onUpdateImages: (updatedImages: string[]) => void;
  onCopyToSameColorSizes?: (colorName: string, images: string[]) => void;
  onOpenCloudinarySelector?: () => void;
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}

export default function VariantGalleryManager({
  variant,
  variantIndex,
  allVariants,
  onUpdateImages,
  onCopyToSameColorSizes,
  onOpenCloudinarySelector,
  showToast
}: VariantGalleryManagerProps) {
  const images = getVariantGalleryImages(variant);
  const [urlInput, setUrlInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [showStockPanel, setShowStockPanel] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockResults, setStockResults] = useState<string[]>([]);
  const [searchingStock, setSearchingStock] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sameColorSiblingCount = allVariants.filter(
    (v, idx) =>
      idx !== variantIndex &&
      (v.color || "").trim().toLowerCase() === (variant.color || "").trim().toLowerCase()
  ).length;

  const notify = (text: string, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 4000);
    if (showToast) {
      showToast(text, isError ? "error" : "success");
    }
  };

  const optimizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error("Error al procesar la imagen."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList) => {
    setUploadProgress(true);
    const newUrls: string[] = [];
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        errorCount++;
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("image", file);
        const uploadRes = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("apex_admin_token") || ""}`
          },
          body: formData
        });
        const responseText = await uploadRes.text();
        let parsedData: any = null;
        if (!responseText.trim().startsWith("<!doctype") && !responseText.trim().startsWith("<html")) {
          try {
            parsedData = JSON.parse(responseText);
          } catch {
            parsedData = null;
          }
        }
        if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
          newUrls.push(parsedData.url);
          continue;
        }
        const optimizedBase64 = await optimizeAndCompressImage(file);
        newUrls.push(optimizedBase64);
      } catch {
        try {
          const optimizedBase64 = await optimizeAndCompressImage(file);
          newUrls.push(optimizedBase64);
        } catch {
          errorCount++;
        }
      }
    }

    if (newUrls.length > 0) {
      const merged = Array.from(new Set([...images, ...newUrls]));
      onUpdateImages(merged);
      notify(`${newUrls.length === 1 ? "Imagen agregada" : `${newUrls.length} imágenes agregadas`} a la variante ${variant.color}.`);
    }
    if (errorCount > 0) {
      notify("Algunos archivos no eran imágenes válidas.", true);
    }
    setUploadProgress(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addUrlImages = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const candidates = trimmed.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
    const validUrls = candidates.filter(
      (u) => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/api/") || u.startsWith("data:image")
    );
    if (validUrls.length === 0) {
      notify("Ingresá una URL de imagen válida (http://, https:// o /api/...).", true);
      return;
    }
    const merged = Array.from(new Set([...images, ...validUrls]));
    onUpdateImages(merged);
    setUrlInput("");
    notify(`${validUrls.length === 1 ? "URL añadida" : `${validUrls.length} URLs añadidas`} a ${variant.color}.`);
  };

  const searchStockImages = async () => {
    const query = stockSearchQuery.trim();
    if (!query) return;
    setSearchingStock(true);
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        setStockResults(data.images);
      } else {
        notify("No se pudieron obtener imágenes de stock.", true);
      }
    } catch {
      notify("Error al buscar imágenes de stock.", true);
    } finally {
      setSearchingStock(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onUpdateImages(updated);
    notify(`Imagen eliminada de ${variant.color}.`);
  };

  const setAsPrimary = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    const chosen = images[index];
    const reordered = [chosen, ...images.filter((_, idx) => idx !== index)];
    onUpdateImages(reordered);
    notify(`Imagen principal actualizada para ${variant.color}.`);
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const copy = [...images];
    const temp = copy[targetIdx];
    copy[targetIdx] = copy[index];
    copy[index] = temp;
    onUpdateImages(copy);
  };

  const handleDropItem = (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    const copy = [...images];
    const [moved] = copy.splice(draggedIndex, 1);
    copy.splice(targetIdx, 0, moved);
    onUpdateImages(copy);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#D4A55A]/30 bg-[#070E22] p-4 sm:p-5 shadow-xl">
      {/* Header identificando claramente la variante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-full border-2 border-white/25 shadow-md shrink-0"
            style={{ backgroundColor: variant.colorCode || "#6b7280" }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="text-xs font-black text-[#F4EAD7] uppercase tracking-wider">
                Galería independiente: {variant.color || "Sin color"}
              </h5>
              <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-300">
                Talle: {variant.size || "Único"}
              </span>
              {variant.sku && (
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-400">
                  {variant.sku}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Estas fotos se mostrarán únicamente cuando el cliente elija esta variante. La imagen #1 es la <strong className="text-[#D4A55A]">Principal</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sameColorSiblingCount > 0 && onCopyToSameColorSizes && (
            <button
              type="button"
              onClick={() => onCopyToSameColorSizes(variant.color, images)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Copia esta galería únicamente a otros talles del mismo color"
            >
              <Copy className="w-3 h-3" />
              <span>Aplicar a otros talles ({sameColorSiblingCount}) de {variant.color}</span>
            </button>
          )}
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[#E6BF76]">
            {images.length} {images.length === 1 ? "imagen" : "imágenes"}
          </span>
        </div>
      </div>

      {/* Dropzone múltiple */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOverZone(true);
        }}
        onDragLeave={() => setIsDraggingOverZone(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOverZone(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
          isDraggingOverZone
            ? "border-[#D4A55A] bg-[#D4A55A]/10"
            : "border-zinc-700/80 bg-[#050B1A]/70 hover:border-[#D4A55A]/60 hover:bg-[#050B1A]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />
        <UploadCloud className={`h-6 w-6 ${isDraggingOverZone ? "text-[#D4A55A]" : "text-zinc-400"}`} />
        <p className="text-xs font-bold text-zinc-200">
          Subir una o varias imágenes para <span className="text-[#E6BF76]">{variant.color}</span>
        </p>
        <p className="text-[10px] text-zinc-400">Arrastrá archivos aquí o hacé clic para seleccionar desde tu equipo</p>
        {uploadProgress && (
          <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <Loader2 className="h-4 w-4 animate-spin text-[#D4A55A]" />
              <span>Subiendo imágenes para {variant.color}...</span>
            </div>
          </div>
        )}
      </div>

      {/* URL + Cloudinary + Stock AI */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <LinkIcon className="h-3.5 w-3.5 text-zinc-500" />
          </span>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrlImages();
              }
            }}
            placeholder={`Pegar URL(s) para ${variant.color} (separadas por coma)...`}
            className="w-full pl-8 pr-3 py-2 bg-[#050B1A] border border-zinc-800 rounded-xl text-xs text-white font-mono outline-none focus:border-[#D4A55A]"
          />
        </div>
        <button
          type="button"
          onClick={addUrlImages}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
        >
          Añadir URL
        </button>
        {onOpenCloudinarySelector && (
          <button
            type="button"
            onClick={onOpenCloudinarySelector}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Cloudinary</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowStockPanel((prev) => !prev)}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-zinc-700"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>{showStockPanel ? "Cerrar Stock" : "Buscar"}</span>
        </button>
      </div>

      {showStockPanel && (
        <div className="p-3 rounded-xl bg-[#050B1A]/90 border border-zinc-800 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchStockImages();
                  }
                }}
                placeholder={`Ej: producto color ${variant.color}...`}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-[#D4A55A]"
              />
            </div>
            <button
              type="button"
              onClick={searchStockImages}
              disabled={searchingStock}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              {searchingStock ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {stockResults.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {stockResults.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!images.includes(url)) {
                      onUpdateImages([...images, url]);
                      notify(`Imagen añadida a ${variant.color}.`);
                    }
                  }}
                  className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-[#D4A55A] group cursor-pointer"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {statusMsg && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-semibold text-center ${
            statusMsg.isError
              ? "bg-red-500/15 text-red-400 border border-red-500/25"
              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Grilla de vista previa y reordenamiento de la variante */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 bg-[#050B1A]/75 p-3 rounded-xl border border-zinc-800/80">
          {images.map((imgUrl, idx) => {
            const isPrimary = idx === 0;
            return (
              <div
                key={`${imgUrl}-${idx}`}
                draggable
                onDragStart={() => setDraggedIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropItem(idx);
                }}
                onDragEnd={() => setDraggedIndex(null)}
                className={`relative group aspect-square rounded-xl overflow-hidden border bg-zinc-950 select-none transition-all ${
                  draggedIndex === idx
                    ? "opacity-40 scale-95 border-dashed border-[#D4A55A]"
                    : isPrimary
                    ? "border-[#D4A55A] ring-2 ring-[#D4A55A]/25 shadow-md"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripHorizontal className="h-3 w-3 text-white" />
                </div>

                <img
                  src={imgUrl}
                  alt={`${variant.color} #${idx + 1}`}
                  className="w-full h-full object-contain p-1 pointer-events-none"
                  referrerPolicy="no-referrer"
                />

                {isPrimary ? (
                  <span className="absolute bottom-1.5 left-1.5 bg-[#D4A55A] text-[#050B1A] text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Principal
                  </span>
                ) : (
                  <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-zinc-200 text-[9px] font-mono px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                )}

                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5 p-1.5">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(idx)}
                      className="w-full py-1 px-1.5 bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] rounded-lg text-[9px] font-black cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Star className="h-2.5 w-2.5" />
                      <span>Principal</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="w-full py-1 px-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    <span>Eliminar</span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveImage(idx, "left")}
                      className={`p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white ${
                        idx === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title="Mover antes"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveImage(idx, "right")}
                      className={`p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white ${
                        idx === images.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title="Mover después"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-5 border border-dashed border-zinc-700/70 bg-[#050B1A]/50 rounded-xl">
          <ImageIcon className="h-6 w-6 text-zinc-500 mx-auto mb-1" />
          <p className="text-xs font-bold text-zinc-300">
            La variante <span className="text-[#E6BF76]">{variant.color}</span> no tiene fotos asignadas aún.
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            No heredará imágenes de otros colores. Subí fotos arriba o agregá URLs exclusivas para esta variante.
          </p>
        </div>
      )}
    </div>
  );
}
