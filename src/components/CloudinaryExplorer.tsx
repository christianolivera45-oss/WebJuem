import React, { useState, useEffect, useCallback } from "react";
import { 
  Folder, 
  FolderPlus, 
  FolderOpen, 
  FileImage, 
  Trash2, 
  Copy, 
  ArrowLeft, 
  Upload, 
  Search, 
  Grid, 
  List as ListIcon, 
  Info, 
  ExternalLink, 
  Check, 
  Loader2,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
  Download
} from "lucide-react";

interface CloudinaryFile {
  public_id: string;
  name: string;
  url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
}

interface CloudinaryExplorerProps {
  onSelectFile?: (url: string) => void;
  selectMode?: boolean;
  onClose?: () => void;
}

export default function CloudinaryExplorer({ 
  onSelectFile, 
  selectMode = false, 
  onClose 
}: CloudinaryExplorerProps) {
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<CloudinaryFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<CloudinaryFile | null>(null);
  const [sourceView, setSourceView] = useState<"all" | "folders">("all");
  
  // Folder creation state
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [creatingFolder, setCreatingFolder] = useState<boolean>(false);
  
  // File upload state
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAssets = useCallback(async (folderPath: string, search: string = "", currentSource: "all" | "folders" = sourceView) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("apex_admin_token") || "";
      const url = `/api/cloudinary/explore?folder=${encodeURIComponent(folderPath)}&search=${encodeURIComponent(search)}&view=${currentSource}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error(`Error en el servidor: ${res.statusText}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
        setCurrentFolder(data.currentFolder || folderPath);
      } else {
        throw new Error(data.message || "Error desconocido al explorar Cloudinary.");
      }
    } catch (err: any) {
      console.error("Error fetching Cloudinary assets:", err);
      setError(err.message || "No se pudo conectar con el servidor para explorar los archivos.");
    } finally {
      setLoading(false);
    }
  }, [sourceView]);

  useEffect(() => {
    fetchAssets(currentFolder, "", sourceView);
  }, [currentFolder, sourceView, fetchAssets]);

  const handleRefresh = () => {
    fetchAssets(currentFolder, searchQuery, sourceView);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssets(currentFolder, searchQuery, sourceView);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchAssets(currentFolder, "");
  };

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newFolderName.trim();
    if (!trimmedName) return;

    // Build the full path
    const folderPath = currentFolder ? `${currentFolder}/${trimmedName}` : trimmedName;
    setCreatingFolder(true);
    try {
      const token = localStorage.getItem("apex_admin_token") || "";
      const res = await fetch("/api/cloudinary/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ folder: folderPath })
      });

      const data = await res.json();
      if (data.success) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        // Refresh
        fetchAssets(currentFolder);
      } else {
        alert(`No se pudo crear la carpeta: ${data.message}`);
      }
    } catch (err: any) {
      console.error("Error creating folder:", err);
      alert(`Error al crear carpeta: ${err.message}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderName = folderPath.split("/").pop() || folderPath;
    if (!confirm(`¿Estás seguro de que quieres eliminar la carpeta "${folderName}"?\nSolo se puede eliminar si está completamente vacía.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("apex_admin_token") || "";
      const res = await fetch("/api/cloudinary/folders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ folder: folderPath })
      });

      const data = await res.json();
      if (data.success) {
        fetchAssets(currentFolder);
      } else {
        alert(`No se pudo eliminar la carpeta: ${data.message}`);
      }
    } catch (err: any) {
      console.error("Error deleting folder:", err);
      alert(`Error al eliminar la carpeta: ${err.message}`);
    }
  };

  // Delete file
  const handleDeleteFile = async (file: CloudinaryFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el archivo "${file.name}" de Cloudinary?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("apex_admin_token") || "";
      const res = await fetch("/api/cloudinary/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ public_id: file.public_id })
      });

      const data = await res.json();
      if (data.success) {
        if (selectedFile?.public_id === file.public_id) {
          setSelectedFile(null);
        }
        setFiles(prev => prev.filter(f => f.public_id !== file.public_id));
      } else {
        alert(`Error al eliminar el archivo: ${data.message}`);
      }
    } catch (err: any) {
      console.error("Error deleting file:", err);
      alert(`Error al eliminar archivo de Cloudinary: ${err.message}`);
    }
  };

  // Upload multiple files
  const handleMultipleFilesUpload = async (fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    
    if (validFiles.length === 0) {
      alert("Por favor, selecciona únicamente archivos de imagen.");
      return;
    }

    setUploading(true);
    const token = localStorage.getItem("apex_admin_token") || "";
    let uploadedCount = 0;
    const totalCount = validFiles.length;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(`Subiendo archivo ${i + 1} de ${totalCount}: ${file.name}...`);
      
      try {
        const formData = new FormData();
        formData.append("image", file);
        
        // Pass the current folder path in query parameters
        const uploadRes = await fetch(`/api/cloudinary/upload?folder=${encodeURIComponent(currentFolder)}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });

        const data = await uploadRes.json();
        if (data.success && data.url) {
          uploadedCount++;
        } else {
          console.error(`Fallo al subir ${file.name}:`, data.message || "Error desconocido");
        }
      } catch (err) {
        console.error(`Error al subir ${file.name}:`, err);
      }
    }

    setUploading(false);
    setUploadProgress(null);
    fetchAssets(currentFolder);

    if (uploadedCount < totalCount) {
      alert(`Se subieron con éxito ${uploadedCount} de ${totalCount} imágenes.`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFilesUpload(e.target.files);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFilesUpload(e.dataTransfer.files);
    }
  };

  // Navigation utilities
  const handleFolderClick = (folderPath: string) => {
    setCurrentFolder(folderPath);
    setSelectedFile(null);
  };

  const handleNavigateUp = () => {
    if (currentFolder === "") return;
    const parts = currentFolder.split("/");
    parts.pop();
    const parent = parts.join("/");
    setCurrentFolder(parent); // Si parent es vacío, irá a la raíz ""
    setSelectedFile(null);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (currentFolder === "") return;
    const parts = currentFolder.split("/");
    const targetPath = parts.slice(0, index + 1).join("/");
    setCurrentFolder(targetPath);
    setSelectedFile(null);
  };

  // Clipboard utility
  const copyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Extract folder tree parts
  const breadcrumbParts = currentFolder === "" ? [] : currentFolder.split("/");

  return (
    <div className="bg-slate-50 dark:bg-[#080d19] rounded-2xl border border-slate-200 dark:border-zinc-850/80 overflow-hidden flex flex-col h-[780px] shadow-2xl text-slate-800 dark:text-zinc-200 transition-all duration-300">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#0c1221] border-b border-slate-200 dark:border-zinc-850/80 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-xl shadow-md shadow-amber-500/10">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wide text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Gestor de Archivos Cloudinary</span>
              </h3>
              {selectMode && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                  Selección Activa
                </span>
              )}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Administración profesional de imágenes, recursos multimedia y optimización web.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Source View Selector (Flat / Folders) */}
      <div className="bg-white dark:bg-[#0c1221] px-6 py-3 border-b border-slate-200 dark:border-zinc-850/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1.5 bg-slate-100 dark:bg-[#121c2c] p-1 rounded-xl border border-slate-200/50 dark:border-zinc-800/40">
          <button
            onClick={() => {
              setSourceView("all");
              setSelectedFile(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              sourceView === "all"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/50 dark:hover:bg-zinc-800/30"
            }`}
          >
            <span>✨ Biblioteca de Medios</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${sourceView === "all" ? "bg-slate-950/20 text-slate-950 font-black" : "bg-slate-200 dark:bg-zinc-800 text-slate-500"}`}>
              {sourceView === "all" && !loading ? files.length : "87"}
            </span>
          </button>
          <button
            onClick={() => {
              setSourceView("folders");
              setSelectedFile(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              sourceView === "folders"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/50 dark:hover:bg-zinc-800/30"
            }`}
          >
            <Folder className="h-3.5 w-3.5 shrink-0" />
            <span>Explorar Carpetas</span>
          </button>
        </div>
        
        {sourceView === "all" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              ✓ Sincronización en Tiempo Real
            </span>
          </div>
        ) : (
          <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            Vista por Estructura de Directorios
          </span>
        )}
      </div>

      {/* Toolbar / Search & Path */}
      <div className="bg-slate-100/40 dark:bg-[#0c1221]/30 border-b border-slate-200 dark:border-zinc-850 px-6 py-3.5 flex flex-wrap gap-4 items-center justify-between">
        {/* Navigation actions */}
        <div className="flex items-center gap-2">
          {sourceView === "folders" && (
            <button
              onClick={handleNavigateUp}
              disabled={currentFolder === ""}
              className="p-2 bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer shadow-sm"
              title="Subir de nivel"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            className="p-2 bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
            title="Sincronizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* New Folder trigger (Only in folders mode) */}
          {sourceView === "folders" && (
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-slate-950 hover:bg-amber-600 transition-all cursor-pointer rounded-lg text-xs font-bold shadow-sm shadow-amber-500/10"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Crear Carpeta</span>
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="Buscar por ID público o nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-zinc-100 font-medium transition-all"
          />
          <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-200 text-xs font-extrabold font-mono"
            >
              ✕
            </button>
          )}
        </form>

        {/* View selection */}
        <div className="flex bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-amber-500 text-slate-950 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <Grid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-amber-500 text-slate-950 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <ListIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Path Breadcrumbs - Only in folders mode */}
      {sourceView === "folders" && (
        <div className="bg-slate-100/30 dark:bg-[#0c1221]/20 px-6 py-2.5 border-b border-slate-200 dark:border-zinc-850/80 flex items-center gap-1.5 text-xs overflow-x-auto select-none">
          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Ruta actual:</span>
          <button
            onClick={() => {
              setCurrentFolder("");
              setSelectedFile(null);
            }}
            className={`hover:underline shrink-0 font-mono font-bold transition-colors ${
              currentFolder === "" 
                ? "text-amber-500 font-extrabold" 
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-100"
            }`}
          >
            ☁️ Cloudinary (Raíz)
          </button>
          {breadcrumbParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:underline shrink-0 font-mono font-bold transition-colors ${
                  index === breadcrumbParts.length - 1 
                    ? "text-amber-500 font-extrabold" 
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-100"
                }`}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Workspace (Dropzone Wrapper) */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-grow flex overflow-hidden relative"
      >
        {/* Main files grid */}
        <div className="flex-grow overflow-y-auto p-6 relative">
          
          {loading && (
            <div className="absolute inset-0 bg-slate-50/75 dark:bg-[#080d19]/75 backdrop-blur-xs flex flex-col items-center justify-center z-10">
              <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Accediendo a Cloudinary...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold mb-4 text-center">
              {error}
              <button 
                onClick={handleRefresh}
                className="mt-2 block mx-auto px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Drag & drop overlay */}
          {isDragOver && (
            <div className="absolute inset-4 border-2 border-dashed border-amber-500 rounded-2xl bg-amber-500/5 backdrop-blur-xs flex flex-col items-center justify-center z-30 pointer-events-none transition-all">
              <Upload className="h-12 w-12 text-amber-500 animate-bounce mb-3" />
              <p className="font-bold text-sm text-amber-500">Suelta tu imagen para subirla aquí</p>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Se cargará directamente en la carpeta actual</p>
            </div>
          )}

          {/* Active upload progress */}
          {uploading && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-between text-xs font-semibold mb-4 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{uploadProgress}</span>
              </div>
            </div>
          )}

          {/* Empty state when loading succeeds and there's nothing */}
          {!loading && folders.length === 0 && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Folder className="h-16 w-16 text-zinc-400/30 mb-4" />
              <h4 className="font-bold text-slate-900 dark:text-zinc-200">Carpeta Vacía</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Esta carpeta de Cloudinary no contiene subcarpetas ni archivos aún. Arrastra una imagen aquí para subirla.
              </p>
              
              <div className="mt-6">
                <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer inline-flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Subir Primer Archivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Folders Section */}
          {!loading && folders.length > 0 && (
            <div className="mb-8">
              <h4 className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                <span>Directorios ({folders.length})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {folders.map((fPath) => {
                  const name = fPath.split("/").pop() || fPath;
                  return (
                    <div
                      key={fPath}
                      onDoubleClick={() => handleFolderClick(fPath)}
                      onClick={() => handleFolderClick(fPath)}
                      className="group p-3.5 bg-white dark:bg-[#0c1221] border border-slate-200/80 dark:border-zinc-850/60 hover:border-amber-500/40 rounded-xl flex items-center gap-3.5 cursor-pointer hover:bg-slate-100/40 dark:hover:bg-[#121c2c]/30 hover:shadow-md transition-all duration-300 select-none relative"
                    >
                      <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-all duration-300">
                        <Folder className="h-5 w-5 text-amber-500 fill-amber-500/10 shrink-0" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate" title={name}>
                          {name}
                        </p>
                      </div>
                      
                      {/* Delete folder button (only if not root config folder) */}
                      {fPath !== "ventas_juem_cloudinary" && (
                        <button
                          onClick={(e) => handleDeleteFolder(fPath, e)}
                          className="opacity-0 group-hover:opacity-100 absolute right-2.5 top-3.5 text-zinc-450 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                          title="Eliminar Carpeta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files Section */}
          {!loading && files.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                <span>Archivos Almacenados ({files.length})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </h4>

              {viewMode === "grid" ? (
                /* Grid View */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {files.map((file) => {
                    const isSel = selectedFile?.public_id === file.public_id;
                    return (
                      <div
                        key={file.public_id}
                        onClick={() => setSelectedFile(file)}
                        onDoubleClick={() => {
                          if (selectMode && onSelectFile) {
                            onSelectFile(file.url);
                          } else {
                            setSelectedFile(file);
                          }
                        }}
                        className={`group border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 relative ${
                          isSel 
                            ? "bg-amber-500/[0.03] border-amber-500 shadow-lg shadow-amber-500/5 -translate-y-0.5" 
                            : "bg-white dark:bg-[#0c1221] border-slate-200 dark:border-zinc-850/80 hover:border-amber-500/30 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-black/10 hover:-translate-y-0.5"
                        }`}
                      >
                        {/* File preview */}
                        <div className="aspect-square bg-slate-100 dark:bg-zinc-950/60 relative flex items-center justify-center overflow-hidden border-b border-slate-155 dark:border-zinc-850/40">
                          <img
                            src={file.url}
                            alt={file.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-500"
                          />
                          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 text-[8px] font-black uppercase text-zinc-100 font-mono tracking-wider">
                            {file.format}
                          </div>
                          
                          {/* Selected marker inside grid */}
                          {isSel && (
                            <div className="absolute top-2.5 right-2.5 p-1 bg-amber-500 text-slate-950 rounded-full shadow-md">
                              <Check className="h-3 w-3 stroke-[3.5]" />
                            </div>
                          )}
                        </div>

                        {/* Info details */}
                        <div className="p-3">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-amber-500 transition-colors" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-1.5 font-mono">
                            <span className="font-semibold">{file.width} × {file.height} px</span>
                            <span className="font-semibold bg-slate-100 dark:bg-zinc-850 px-1 py-0.2 rounded">{formatBytes(file.bytes, 1)}</span>
                          </div>
                        </div>

                        {/* Hover quick delete */}
                        <button
                          onClick={(e) => handleDeleteFile(file, e)}
                          className="opacity-0 group-hover:opacity-100 absolute bottom-12 right-2.5 p-1.5 bg-black/70 hover:bg-red-600/90 rounded-lg text-zinc-300 hover:text-white transition-all shadow-sm"
                          title="Eliminar Archivo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Upload card slot inside grid */}
                  <label className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-amber-500/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer min-h-[170px] hover:bg-slate-100/30 dark:hover:bg-zinc-900/10 transition-all gap-2 text-center p-4">
                    <Upload className="h-6 w-6 text-zinc-400" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Subir Imagen</span>
                    <span className="text-[9px] text-zinc-500">Arrastra o haz click</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                /* List View */
                <div className="bg-white dark:bg-[#0c1221] border border-slate-200 dark:border-zinc-850/85 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-zinc-850/40 text-xs">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-450 dark:text-zinc-500 font-extrabold uppercase text-[9px] tracking-widest select-none font-mono border-b border-slate-100 dark:border-zinc-850/30">
                    <div className="col-span-5 pl-3">Nombre del Recurso</div>
                    <div className="col-span-2">Dimensión</div>
                    <div className="col-span-1">Formato</div>
                    <div className="col-span-2">Tamaño</div>
                    <div className="col-span-2 text-right pr-4">Acciones</div>
                  </div>
                  {files.map((file) => {
                    const isSel = selectedFile?.public_id === file.public_id;
                    return (
                      <div
                        key={file.public_id}
                        onClick={() => setSelectedFile(file)}
                        className={`grid grid-cols-12 gap-2 p-3 items-center cursor-pointer transition-all duration-200 ${
                          isSel 
                            ? "bg-amber-500/10 text-amber-500 font-bold border-l-2 border-amber-500 pl-2.5" 
                            : "hover:bg-slate-100/40 dark:hover:bg-zinc-900/10"
                        }`}
                      >
                        <div className="col-span-5 flex items-center gap-3 min-w-0 pl-3">
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 object-cover rounded-lg bg-zinc-950 shrink-0 border border-slate-200/40 dark:border-zinc-800" 
                          />
                          <p className="truncate font-bold text-slate-800 dark:text-zinc-200 group-hover:text-amber-500 transition-colors" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                        <div className="col-span-2 text-zinc-450 dark:text-zinc-500 font-mono text-[10px] font-medium">{file.width} × {file.height} px</div>
                        <div className="col-span-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 text-[9px] font-black uppercase text-slate-600 dark:text-zinc-300 font-mono tracking-wider">
                            {file.format}
                          </span>
                        </div>
                        <div className="col-span-2 text-zinc-450 dark:text-zinc-500 font-mono text-[10px] font-medium">{formatBytes(file.bytes)}</div>
                        <div className="col-span-2 flex items-center justify-end gap-1.5 pr-2">
                          <button
                            onClick={(e) => copyToClipboard(file.url, file.public_id, e)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-amber-500 transition-all"
                            title="Copiar Enlace"
                          >
                            {copiedId === file.public_id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={(e) => handleDeleteFile(file, e)}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected File Detail Side Panel (PPC Side Drawer look) */}
        {selectedFile && (
          <div className="w-80 border-l border-slate-200 dark:border-zinc-850 bg-white dark:bg-[#0c1221] overflow-y-auto flex flex-col h-full animate-fade-in shrink-0 select-none">
            <div className="p-4.5 border-b border-slate-200 dark:border-zinc-850/80 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/15">
              <h4 className="font-extrabold text-xs uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>Propiedades</span>
              </h4>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-zinc-450 hover:text-slate-900 dark:hover:text-zinc-100 text-xs font-bold font-mono p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-grow flex flex-col justify-between">
              <div>
                {/* Thumbnail large */}
                <div className="aspect-video bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850/80 rounded-2xl overflow-hidden flex items-center justify-center mb-5 shadow-sm group relative">
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain p-1 group-hover:scale-[1.02] transition-all duration-300"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white font-bold uppercase">
                    {selectedFile.format}
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-zinc-450 font-extrabold uppercase font-mono tracking-wider block mb-1">Nombre del Archivo</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 break-all bg-slate-100/50 dark:bg-zinc-900/30 px-2 py-1.5 rounded-lg block">{selectedFile.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-440 font-extrabold uppercase font-mono tracking-wider block mb-1">Public ID de Cloudinary</span>
                    <span className="text-[10px] font-mono text-zinc-500 break-all select-all bg-slate-100/50 dark:bg-zinc-900/30 px-2 py-1.5 rounded-lg block">{selectedFile.public_id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <span className="text-[9px] text-zinc-440 font-extrabold uppercase font-mono tracking-wider block mb-0.5">Resolución</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">{selectedFile.width} × {selectedFile.height} px</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-440 font-extrabold uppercase font-mono tracking-wider block mb-0.5">Peso</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">{formatBytes(selectedFile.bytes)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <span className="text-[9px] text-zinc-440 font-extrabold uppercase font-mono tracking-wider block mb-0.5">Formato</span>
                      <span className="text-xs font-black uppercase font-mono text-amber-500">{selectedFile.format}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-440 font-extrabold uppercase font-mono tracking-wider block mb-0.5">Subido el</span>
                      <span className="text-[10px] text-zinc-500 font-mono font-medium">{new Date(selectedFile.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary selector actions */}
              <div className="pt-5 border-t border-slate-200/80 dark:border-zinc-800/80 space-y-2 mt-6">
                {selectMode && onSelectFile ? (
                  <button
                    onClick={() => onSelectFile(selectedFile.url)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Confirmar Selección</span>
                  </button>
                ) : (
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Ver Imagen Original</span>
                  </a>
                )}

                <button
                  onClick={(e) => copyToClipboard(selectedFile.url, "detail", e)}
                  className="w-full py-2 bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {copiedId === "detail" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-extrabold">Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Enlace de Imagen</span>
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => handleDeleteFile(selectedFile, e)}
                  className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar Permanentemente</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Folder Modal Dialog */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fade-in">
          <div className="bg-white dark:bg-[#0c1221] border border-slate-250 dark:border-zinc-850 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-slate-800 dark:text-zinc-200">
            <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-amber-500" />
              <span>Crear Nueva Carpeta</span>
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ingresa el nombre del subdirectorio. Se creará dentro de: <strong className="font-mono text-amber-500 break-all">{currentFolder}</strong>
            </p>

            <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. ofertas_invierno, banner-secundarios"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ""))} // alphanumeric & common dashes
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500/40 font-mono text-slate-800 dark:text-zinc-100"
              />
              
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNewFolderName("");
                    setShowNewFolderModal(false);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#121c2c] border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-bold rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-all"
                >
                  {creatingFolder ? "Creando..." : "Crear Carpeta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
