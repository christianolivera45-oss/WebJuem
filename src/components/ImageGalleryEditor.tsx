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
  Plus
} from "lucide-react";

export interface ImageGalleryEditorProps {
  images: string[];
  onChange: (updatedImages: string[]) => void;
  isThemeDark: boolean;
  onOpenCloudinarySelector?: () => void;
}

const PRESET_STOCK_IMAGES = [
  { title: "Moda Casual", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80" },
  { title: "Shopping Bag", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80" },
  { title: "Auriculares", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
  { title: "Smartwatch", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" },
  { title: "Mochila Cuero", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80" },
  { title: "Lentes Premium", url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80" }
];

export default function ImageGalleryEditor({ images, onChange, isThemeDark, onOpenCloudinarySelector }: ImageGalleryEditorProps) {
  const [urlInput, setUrlInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IA Stock Search states
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockResults, setStockResults] = useState<string[]>([]);
  const [searchingStock, setSearchingStock] = useState(false);
  const [showStockPanel, setShowStockPanel] = useState(false);

  const searchStockImages = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = stockSearchQuery.trim();
    if (!query) return;

    setSearchingStock(true);
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        setStockResults(data.images);
      } else {
        showStatus("No se pudieron obtener imágenes de stock.", true);
      }
    } catch (err) {
      console.error("Error searching stock images:", err);
      showStatus("Error al conectar con el motor de búsqueda.", true);
    } finally {
      setSearchingStock(false);
    }
  };

  const addStockImage = (url: string) => {
    if (images.includes(url)) {
      showStatus("Esta imagen ya está en la galería.", true);
      return;
    }
    onChange([...images, url]);
    showStatus("Imagen de stock añadida correctamente.");
  };

  const showStatus = (text: string, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  // Optimize and compress images client-side before building Data URL
  const optimizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 1200; // max width/height to keep size super small
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
            // Compress with high quality 0.82
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error("Error al renderizar el archivo de imagen."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo físico."));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList) => {
    setUploadProgress(true);
    const newUrls: string[] = [];
    let errorCount = 0;
    let cloudinarySuccessCount = 0;
    let fallbackCount = 0;
    let serverFeedback = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        errorCount++;
        continue;
      }
      try {
        // Try to upload to Cloudinary via server endpoint
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
          },
          body: formData,
        });

        const responseText = await uploadRes.text();
        let parsedData: any = null;
        
        if (responseText.trim().startsWith("<!doctype") || responseText.trim().startsWith("<html")) {
          console.warn("Se recibió respuesta HTML en lugar de JSON. Usando fallback de almacenamiento local optimizado.");
          serverFeedback = "Servidor no inicializado o ruta de API temporalmente no disponible.";
        } else {
          try {
            parsedData = JSON.parse(responseText);
          } catch (jsonErr) {
            console.error("Error al parsear JSON:", jsonErr);
          }
        }

        if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
          newUrls.push(parsedData.url);
          cloudinarySuccessCount++;
          continue;
        }

        if (parsedData && parsedData.message) {
          serverFeedback = parsedData.message;
        }

        // Fallback to local optimized base64 representation
        const optimizedBase64 = await optimizeAndCompressImage(file);
        newUrls.push(optimizedBase64);
        fallbackCount++;
      } catch (err) {
        console.error("Cloudinary upload failed, using base64 fallback:", err);
        try {
          const optimizedBase64 = await optimizeAndCompressImage(file);
          newUrls.push(optimizedBase64);
          fallbackCount++;
        } catch (fbErr) {
          console.error(fbErr);
          errorCount++;
        }
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      
      if (cloudinarySuccessCount > 0 && fallbackCount === 0) {
        showStatus(
          files.length === 1 
            ? "¡Imagen subida con éxito a Cloudinary! ✨" 
            : `¡${cloudinarySuccessCount} imágenes subidas con éxito a Cloudinary! ✨`
        );
      } else if (fallbackCount > 0 && cloudinarySuccessCount === 0) {
        showStatus(
          serverFeedback 
            ? `⚠️ Guardado en Base64 local (Cloudinary no configurado).` 
            : `⚠️ Guardado localmente como Base64.`
        );
      } else {
        showStatus(`Subida mixta: ${cloudinarySuccessCount} en Cloudinary, ${fallbackCount} locales.`);
      }
    }

    if (errorCount > 0) {
      showStatus("Algunos archivos no se pudieron procesar.", true);
    }
    setUploadProgress(false);
  };

  const handleDropToZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const addUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    
    // Subdivide potential multiple comma-separated URLs
    const candidates = trimmed.split(/[\s,]+/).map(u => u.trim()).filter(Boolean);
    const validUrls = candidates.filter(u => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:image"));
    
    if (validUrls.length === 0) {
      showStatus("Introduce una URL de imagen válida que comience con http:// o https://", true);
      return;
    }

    onChange([...images, ...validUrls]);
    setUrlInput("");
    showStatus(validUrls.length === 1 ? "Imagen añadida." : `${validUrls.length} imágenes añadidas.`);
  };

  const addPresetImage = (url: string) => {
    if (images.includes(url)) {
      showStatus("Esta imagen ya está en la galería.");
      return;
    }
    onChange([...images, url]);
    showStatus("Imagen preestablecida añadida.");
  };

  const removeImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    showStatus("Imagen eliminada.");
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;

    const copy = [...images];
    const prevVal = copy[targetIdx];
    copy[targetIdx] = copy[index];
    copy[index] = prevVal;
    onChange(copy);
  };

  // HTML5 Drag and drop sorting
  const handleDragStartItem = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDropItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const copy = [...images];
    const [movedItem] = copy.splice(draggedIndex, 1);
    copy.splice(index, 0, movedItem);
    
    onChange(copy);
    setDraggedIndex(null);
  };

  const handleDragEndItem = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4 border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl bg-slate-50/30 dark:bg-zinc-950/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h3 className="text-xs font-extrabold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-indigo-505 dark:text-indigo-400" />
            Control de Imágenes Único
          </h3>
          <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium">
            Sube o arrastra tus imágenes. La primera de la lista será la <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Principal</strong>. Arrástralas para reordenar.
          </p>
          <div className="mt-1.5 p-2 bg-indigo-50/50 dark:bg-zinc-900/45 border border-indigo-500/10 rounded-xl text-[9.5px] text-slate-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            💡 <strong>Guía Visual de Calidad:</strong> Para que tus imágenes se exhiban en su máximo tamaño posible y queden perfectamente encuadradas, te recomendamos usar <strong>formato cuadrado (relación de aspecto 1:1)</strong>, fotos tomadas con <strong>fondo transparente o de un color sólido uniforme</strong>, y dejar un <strong>margen o "aire" de aproximadamente 10%</strong> en los bordes para una visualización premium y pulida sin recortes accidentales.
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-905 text-zinc-600 dark:text-zinc-400 self-start sm:self-center">
          Total: {images.length}
        </span>
      </div>

      {/* DRAG AND DROP ZONE */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverZone(true); }}
        onDragLeave={() => setIsDraggingOverZone(false)}
        onDrop={handleDropToZone}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          isDraggingOverZone 
            ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 scale-[0.99]" 
            : isThemeDark 
              ? "border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700" 
              : "border-slate-200 bg-slate-100/10 hover:bg-slate-50 hover:border-slate-350"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelectChange}
        />
        <UploadCloud className={`h-8 w-8 transition-transform ${isDraggingOverZone ? "scale-110 text-indigo-500" : "text-zinc-400"}`} />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
            Arrastra y suelta imágenes aquí, o haz clic para buscarlas
          </p>
          <p className="text-[10px] text-zinc-400">
            Soporta PNG, JPG, WEBP. Compresión y optimización automática.
          </p>
        </div>
        {uploadProgress && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-white text-xs font-medium">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-400 border-t-transparent"></span>
              Procesando y optimizando imágenes...
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN DE BÚSQUEDA DE IMÁGENES DE STOCK CON IA */}
      <div className="bg-slate-50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
            <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span>¿Te faltan fotos? Buscar imágenes reales en internet con IA</span>
          </div>
          <button
            type="button"
            onClick={() => setShowStockPanel(!showStockPanel)}
            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
          >
            {showStockPanel ? "Ocultar Buscador" : "Mostrar Buscador"}
          </button>
        </div>

        {showStockPanel && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                </span>
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
                  placeholder="Ej: lentes aviador dorados, zapatillas running rojas, etc..."
                  className="w-full pl-8.5 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850/80 rounded-xl text-xs outline-none text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500/55"
                />
              </div>
              <button
                type="button"
                onClick={() => searchStockImages()}
                disabled={searchingStock}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                {searchingStock ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <span>Buscar</span>
                )}
              </button>
            </div>

            {stockResults.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] text-zinc-400 font-medium">Haz clic en una foto para añadirla a la galería:</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {stockResults.map((url, index) => (
                    <button
                      key={url + "-" + index}
                      type="button"
                      onClick={() => addStockImage(url)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 hover:border-indigo-500 hover:scale-105 hover:shadow transition-all group cursor-pointer"
                    >
                      <img
                        src={url}
                        alt="Resultado de stock"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Plus className="h-4 w-4 text-white font-bold" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              !searchingStock && (
                <p className="text-[10px] text-zinc-450 italic">
                  Ingresa palabras clave del producto para encontrar imágenes de stock profesionales de Unsplash integradas automáticamente por IA.
                </p>
              )
            )}
          </div>
        )}
      </div>

      {/* URL INPUT OR PRESET PANEL */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
              <LinkIcon className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
            </span>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Ej: https://images.unsplash.com/... (soporta múltiples separadas por coma)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrlImage();
                }
              }}
              className="w-full pl-8.5 pr-3 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-indigo-500/55"
            />
          </div>
          <button
            type="button"
            onClick={addUrlImage}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            Añadir URL
          </button>
          {onOpenCloudinarySelector && (
            <button
              type="button"
              onClick={onOpenCloudinarySelector}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Cloudinary</span>
            </button>
          )}
        </div>

        {/* MOCK TEMPLATES PANEL */}
        <div className="flex flex-wrap gap-1.5 items-center justify-start py-0.5">
          <span className="text-[10px] text-zinc-400 font-medium">Fotos de prueba rápidas:</span>
          {PRESET_STOCK_IMAGES.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => addPresetImage(preset.url)}
              className="text-[9px] font-sans px-2 py-0.5 rounded bg-slate-200/50 dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-zinc-350 hover:text-indigo-600 dark:hover:text-indigo-450 border border-transparent hover:border-indigo-400/30 transition-all cursor-pointer"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* FEEDBACK LABELS */}
      {statusMsg && (
        <div className={`p-2 rounded-lg text-center text-xs font-medium animate-pulse ${
          statusMsg.isError 
            ? "bg-red-500/10 text-red-500 border border-red-500/20" 
            : "bg-indigo-500/10 text-indigo-505 dark:text-indigo-305 border border-indigo-500/20"
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* GALERÍA / LIST OF LOADED IMAGES (GRID) */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-700 dark:text-zinc-300 font-black uppercase tracking-wider">Galería del Producto</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100/20 dark:bg-zinc-950/60 p-3 rounded-xl border border-slate-150 dark:border-zinc-900/80">
            {images.map((imgUrl, i) => {
              const isPrincipal = i === 0;
              return (
                <div
                  key={imgUrl + "-" + i}
                  draggable="true"
                  onDragStart={(e) => handleDragStartItem(e, i)}
                  onDragOver={(e) => handleDragOverItem(e, i)}
                  onDrop={(e) => handleDropItem(e, i)}
                  onDragEnd={handleDragEndItem}
                  className={`relative group aspect-square rounded-xl overflow-hidden border bg-white dark:bg-zinc-900 select-none transition-all ${
                    draggedIndex === i 
                      ? "opacity-40 scale-95 border-dashed border-indigo-500" 
                      : isPrincipal 
                        ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-md"
                        : "border-slate-200 dark:border-zinc-800/85 hover:border-slate-350 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Grip drag handle icon on top center */}
                  <div className="absolute top-1 left-1 z-10 p-1 bg-black/50 backdrop-blur-md rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripHorizontal className="h-3 w-3 text-white" />
                  </div>

                  <img
                    src={imgUrl}
                    className="w-full h-full object-cover pointer-events-none"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594122230689-45899d9e6f69?w=300";
                    }}
                  />

                  {/* Badges / Labels */}
                  {isPrincipal ? (
                    <span className="absolute bottom-1.5 left-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Principal
                    </span>
                  ) : (
                    <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-zinc-300 text-[9px] font-mono px-1 rounded">
                      #{i + 1}
                    </span>
                  )}

                  {/* Actions Cover hover overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="p-1 px-1.5 bg-red-650 hover:bg-red-700 active:scale-95 text-white rounded-lg text-[10px] font-bold transition-transform cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>

                    {/* Left/Right controls for mobile/accessibility */}
                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveImage(i, "left")}
                        className={`p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-all ${i === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
                        title="Mover a la izquierda"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={i === images.length - 1}
                        onClick={() => moveImage(i, "right")}
                        className={`p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-all ${i === images.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
                        title="Mover a la derecha"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center p-6 border border-dashed border-slate-205 dark:border-zinc-850 bg-slate-50/5 dark:bg-zinc-900/5 rounded-xl">
          <ImageIcon className="h-7 w-7 text-zinc-350 dark:text-zinc-700 mx-auto mb-1" />
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Sin imágenes cargadas aún</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-650 mt-0.5">Agrega como mínimo una imagen para presentar el producto.</p>
        </div>
      )}
    </div>
  );
}
