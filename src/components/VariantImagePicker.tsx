import React, { useState } from "react";
import { Upload, X, Check, Image as ImageIcon } from "lucide-react";

interface VariantImagePickerProps {
  galleryImages: string[];
  selectedUrl: string;
  onChange: (url: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function VariantImagePicker({
  galleryImages,
  selectedUrl,
  onChange,
  showToast
}: VariantImagePickerProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("image", file);
      
      setUploading(true);
      try {
        const token = localStorage.getItem("apex_admin_token") || "";
        const uploadRes = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData,
        });
        
        const resText = await uploadRes.text();
        let parsedData: any = null;
        
        if (resText.trim().startsWith("<!doctype") || resText.trim().startsWith("<html")) {
          alert("El servidor no pudo subir la imagen. Por favor, verifica que Cloudinary esté configurado en tus Ajustes o reinicia el servidor.");
          return;
        }
        
        try {
          parsedData = JSON.parse(resText);
        } catch (pErr) {
          console.error("Error al parsear respuesta JSON:", pErr);
        }

        if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
          onChange(parsedData.url);
          showToast("¡Imagen cargada para esta variante! 🛍️", "success");
        } else {
          showToast((parsedData && parsedData.message) || "Error al subir a Cloudinary.", "error");
        }
      } catch (err: any) {
        console.error("Error uploading variant image:", err);
        showToast(`Error al subir la imagen: ${err.message}`, "error");
      } finally {
        setUploading(false);
      }
    }
  };

  const isSelected = (url: string) => selectedUrl === url;

  return (
    <div className="flex flex-col gap-1.5 min-w-[210px] bg-slate-50/50 dark:bg-zinc-900/30 p-2 rounded-lg border border-slate-200/50 dark:border-zinc-800/40">
      {/* TÍTULO / GALLERY SELECTOR */}
      {galleryImages.length > 0 ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
              Seleccionar de la galería
            </span>
            {selectedUrl && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[9px] text-rose-500 hover:text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <X className="h-2.5 w-2.5" />
                <span>Quitar</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {galleryImages.map((img, idx) => {
              const active = isSelected(img);
              return (
                <button
                  key={idx}
                  type="button"
                  title={idx === 0 ? "Foto Principal" : `Foto Adicional ${idx}`}
                  onClick={() => onChange(active ? "" : img)}
                  className={`relative w-9 h-9 rounded-md border-2 overflow-hidden transition-all shrink-0 hover:scale-105 cursor-pointer ${
                    active
                      ? "border-indigo-600 dark:border-indigo-400 shadow ring-1 ring-indigo-500/20"
                      : "border-slate-200 dark:border-zinc-800/80 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Galería ${idx}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {active && (
                    <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                      <div className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full p-0.5 scale-75 shadow-sm">
                        <Check className="h-2.5 w-2.5 stroke-[4]" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-[9px] text-zinc-400 italic">No hay fotos en la galería todavía.</div>
      )}

      {/* MANUAL INPUT / CUSTOM FILE UPLOAD */}
      <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50 dark:border-zinc-800/40">
        <span className="text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
          O ingresar URL / Subir una diferente
        </span>
        
        <div className="flex items-center gap-1.5">
          {selectedUrl && !galleryImages.includes(selectedUrl) && (
            <div className="w-8 h-8 rounded border border-indigo-500/65 overflow-hidden shrink-0 shadow-sm">
              <img
                src={selectedUrl}
                alt="Imagen personalizada"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Pegar URL de foto..."
              value={selectedUrl || ""}
              onChange={(e) => onChange(e.target.value.trim())}
              className="w-full pl-2 pr-5 py-0.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded text-[10px] outline-none font-mono text-slate-950 dark:text-zinc-50 focus:border-indigo-500"
            />
            {selectedUrl && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-1 inset-y-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <label className="flex items-center justify-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-indigo-700 dark:text-indigo-300 rounded border border-dashed border-indigo-200 dark:border-zinc-700 text-[9px] font-bold cursor-pointer transition-all">
            {uploading ? (
              <span className="animate-pulse">Subiendo...</span>
            ) : (
              <>
                <Upload className="h-2.5 w-2.5" />
                <span>Subir foto exclusiva</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
