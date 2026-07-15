import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  MapPin, 
  X, 
  Compass,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  Search,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  MousePointerClick
} from "lucide-react";

export interface ZoneData {
  id: number;
  name: string;
  price: number;
  color: "blue" | "purple";
  neighborhoods: string[];
  description: string;
}

// Keeping the delivery zone definitions in the module scope to preserve typescript compatibility
export const DELIVERY_ZONES: ZoneData[] = [
  {
    id: 1,
    name: "Zona 1 - Oeste Rural y Costa",
    price: 200,
    color: "blue",
    description: "Paso de la Arena, Santiago Vázquez, Pajas Blancas, Melilla, La Paloma, Tomkinson, Rincón del Cerro, Casabó, Los Bulevares.",
    neighborhoods: [
      "Paso de la Arena", 
      "Santiago Vázquez", 
      "Pajas Blancas", 
      "Melilla",
      "Casabó",
      "Casabó, Pajas Blancas",
      "La Paloma, Tomkinson, Rincón del Cerro",
      "La Paloma",
      "Tomkinson",
      "Rincón del Cerro",
      "Paso de la Arena, Los Bulevares, Santiago Vázquez",
      "Los Bulevares"
    ]
  },
  {
    id: 2,
    name: "Zona 2 - Norte / Noroeste",
    price: 200,
    color: "blue",
    description: "Colón, Lezica, Villa Colón, Sayago, Peñarol, Conciliación, Abayubá, Lavalleja.",
    neighborhoods: [
      "Colón", 
      "Lezica", 
      "Villa Colón", 
      "Sayago", 
      "Peñarol", 
      "Conciliación",
      "Colón Centro y Noroeste",
      "Colón Sureste, Abayubá",
      "Abayubá",
      "Lezica, Melilla",
      "Peñarol, Lavalleja",
      "Lavalleja"
    ]
  },
  {
    id: 3,
    name: "Zona 3 - Norte Centro",
    price: 200,
    color: "blue",
    description: "Manga, Piedras Blancas, Casavalle, Las Acacias, Borro, Marconi, Toledo Chico.",
    neighborhoods: [
      "Manga", 
      "Piedras Blancas", 
      "Casavalle", 
      "Las Acacias", 
      "Borro", 
      "Marconi",
      "Casavalle, Barrio Borro",
      "Barrio Borro",
      "Manga, Toledo Chico",
      "Toledo Chico"
    ]
  },
  {
    id: 4,
    name: "Zona 4 - Periferia Este",
    price: 200,
    color: "blue",
    description: "Carrasco Norte, Punta de Rieles, Villa García, Bañados de Carrasco, Jardines del Hipódromo, Bella Italia, Manga Rural.",
    neighborhoods: [
      "Carrasco Norte", 
      "Punta de Rieles", 
      "Villa García", 
      "Bañados de Carrasco",
      "Jardines del Hipódromo",
      "Punta de Rieles, Bella Italia",
      "Bella Italia",
      "Villa García, Manga Rural",
      "Manga Rural"
    ]
  },
  {
    id: 5,
    name: "Zona 5 - Costa Sureste",
    price: 200,
    color: "blue",
    description: "Pocitos, Punta Carretas, Buceo, Malvín, Punta Gorda, Carrasco, Parque Batlle, Las Canteras, Malvín Norte, Villa Dolores.",
    neighborhoods: [
      "Pocitos", 
      "Punta Carretas", 
      "Buceo", 
      "Malvín", 
      "Punta Gorda", 
      "Carrasco", 
      "Parque Batlle",
      "Las Canteras",
      "Malvín Norte",
      "Parque Batlle, Villa Dolores",
      "Villa Dolores"
    ]
  },
  {
    id: 6,
    name: "Zona 6 - Centro / Sur",
    price: 200,
    color: "blue",
    description: "Centro, Ciudad Vieja, Barrio Sur, Palermo, Cordón, Parque Rodó, Tres Cruces.",
    neighborhoods: [
      "Centro", 
      "Ciudad Vieja", 
      "Barrio Sur", 
      "Palermo", 
      "Cordón", 
      "Parque Rodó", 
      "Tres Cruces"
    ]
  },
  {
    id: 7,
    name: "Zona 7 - Urbano Central",
    price: 200,
    color: "blue",
    description: "Aguada, Reducto, Prado, La Comercial, Goes, Jacinto Vera, Unión, La Blanqueada, La Teja, Cerro, Belvedere, Nuevo París, Capurro, Atahualpa, Aires Puros, Brazo Oriental, Flor de Maroñas, Maroñas, Villa Muñoz, Villa Española.",
    neighborhoods: [
      "Aguada", 
      "Reducto", 
      "Prado", 
      "La Comercial", 
      "Goes", 
      "Jacinto Vera", 
      "Unión", 
      "La Blanqueada",
      "Aires Puros",
      "Atahualpa",
      "Belvedere",
      "Brazo Oriental",
      "Capurro, Bella Vista, Arroyo Seco",
      "Capurro",
      "Bella Vista",
      "Arroyo Seco",
      "Castro Castellanos",
      "Cerrito de la Victoria",
      "Cerrito",
      "Flor de Maroñas",
      "Ituzaingó",
      "La Figurita",
      "La Teja",
      "Larrañaga",
      "Maroñas, Parque Guaraní",
      "Maroñas",
      "Parque Guaraní",
      "Mercado Modelo, Bolívar",
      "Mercado Modelo",
      "Bolívar",
      "Nuevo París",
      "Paso de las Duranas",
      "Prado, Nueva Savona",
      "Nueva Savona",
      "Tres Ombúes, Pueblo Victoria",
      "Tres Ombúes",
      "Pueblo Victoria",
      "Villa Muñoz, Goes, Retiro",
      "Villa Muñoz",
      "Retiro",
      "Villa del Cerro",
      "Cerro",
      "Villa Española"
    ]
  },
  {
    id: 8,
    name: "Zona 8 - Canelones Norte",
    price: 290,
    color: "purple",
    description: "Las Piedras, La Paz, Progreso.",
    neighborhoods: ["Las Piedras", "La Paz", "Progreso"]
  },
  {
    id: 9,
    name: "Zona 9 - Canelones Este",
    price: 290,
    color: "purple",
    description: "Barros Blancos, Pando, Toledo, Suárez.",
    neighborhoods: ["Barros Blancos", "Pando", "Toledo", "Suárez"]
  },
  {
    id: 10,
    name: "Zona 10 - Área Metropolitana Este",
    price: 200,
    color: "blue",
    description: "Ciudad de la Costa, Shangrilá, Lagomar, Solymar, El Pinar, Pinamar, Salinas, Marindia, Neptunia.",
    neighborhoods: ["Ciudad de la Costa", "Shangrilá", "Lagomar", "Solymar", "El Pinar", "Pinamar", "Salinas", "Marindia", "Neptunia"]
  }
];

interface InteractiveMapProps {
  onSelectZone?: (zone: ZoneData) => void;
  onSelectNeighborhood?: (neighborhood: string, zone: ZoneData) => void;
  selectedZoneId?: number;
  onClose?: () => void;
  showTitle?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  onSelectZone,
  onSelectNeighborhood,
  selectedZoneId: externalSelectedZoneId,
  onClose,
  showTitle = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Selected & searched zone state
  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<number | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeZoneId = externalSelectedZoneId || internalSelectedZoneId;

  // Search neighborhood or zone logic with smart ranking and sorting
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    // Normalize query
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    // Split query into words to support multi-word search (e.g. "la teja")
    const queryWords = query.split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) return [];

    const results: { neighborhood: string; zone: ZoneData; score: number }[] = [];
    const seen = new Set<string>();

    DELIVERY_ZONES.forEach(zone => {
      zone.neighborhoods.forEach(n => {
        const normalizedN = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        let matches = false;
        let score = 0;

        // 1. Exact match (case insensitive, diacritics removed)
        if (normalizedN === query) {
          matches = true;
          score = 100;
        } 
        // 2. Starts with the full query
        else if (normalizedN.startsWith(query)) {
          matches = true;
          score = 80;
        } 
        else {
          // Check if all query words are present in the neighborhood name
          const nWords = normalizedN.split(/[\s,.-]+/).filter(Boolean);
          const allWordsPresent = queryWords.every(qw => 
            nWords.some(nw => nw.startsWith(qw) || nw.includes(qw))
          );

          if (allWordsPresent) {
            matches = true;
            // Higher score if the query words match the start of words in the neighborhood
            const matchesWordStart = queryWords.every(qw =>
              nWords.some(nw => nw.startsWith(qw))
            );
            
            if (matchesWordStart) {
              score = 60;
            } else {
              score = 40;
            }

            // If the query is very short (<= 2 chars), let's be strict:
            // It MUST either start with the query, or have a word that starts with the query.
            if (query.length <= 2) {
              const startsWithWord = nWords.some(nw => nw.startsWith(query));
              if (!startsWithWord && !normalizedN.startsWith(query)) {
                matches = false;
              }
            }
          }
        }

        if (matches) {
          const uniqueKey = `${n.toLowerCase()}-${zone.id}`;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            results.push({ neighborhood: n, zone, score });
          }
        }
      });
    });

    // Sort results by score descending, then by neighborhood name length ascending, then alphabetically
    return results
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (a.neighborhood.length !== b.neighborhood.length) {
          return a.neighborhood.length - b.neighborhood.length;
        }
        return a.neighborhood.localeCompare(b.neighborhood);
      })
      .map(r => ({ neighborhood: r.neighborhood, zone: r.zone }))
      .slice(0, 8); // Limit to top 8 best matches to prevent overwhelming
  }, [searchQuery]);

  // Adjust pan boundaries dynamically to ensure the image NEVER leaves the container boundaries
  const constrainPan = (x: number, y: number, scale: number): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    // The maximum offset is half of the scaled overflow area
    const limitX = Math.max(0, (w * scale - w) / 2);
    const limitY = Math.max(0, (h * scale - h) / 2);

    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y))
    };
  };

  // Bind non-passive Wheel listener to the map frame for super smooth trackpad/mouse scrolling zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.2;
      const direction = e.deltaY < 0 ? 1 : -1;
      
      setZoomScale(prev => {
        const next = Math.max(1, Math.min(6, prev + direction * zoomFactor));
        if (next === 1) {
          setPanOffset({ x: 0, y: 0 });
        } else {
          // Keep current pan offset within newly scaled limits
          setPanOffset(prevPan => constrainPan(prevPan.x, prevPan.y, next));
        }
        return next;
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    
    const constrained = constrainPan(rawX, rawY, zoomScale);
    setPanOffset(constrained);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoomScale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rawX = touch.clientX - dragStart.x;
    const rawY = touch.clientY - dragStart.y;
    
    const constrained = constrainPan(rawX, rawY, zoomScale);
    setPanOffset(constrained);
  };

  const handleZoomIn = () => {
    setZoomScale(prev => {
      const next = Math.min(6, prev + 0.5);
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      } else {
        setPanOffset(prevPan => constrainPan(prevPan.x, prevPan.y, next));
      }
      return next;
    });
  };

  const handleReset = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomScale(val);
    if (val === 1) {
      setPanOffset({ x: 0, y: 0 });
    } else {
      setPanOffset(prevPan => constrainPan(prevPan.x, prevPan.y, val));
    }
  };

  const handleDoubleClick = () => {
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2.5);
    }
  };

  const handleZoneSelect = (zone: ZoneData) => {
    setInternalSelectedZoneId(zone.id);
    setSelectedNeighborhood(null);
    if (onSelectZone) {
      onSelectZone(zone);
    }
  };

  const handleNeighborhoodSelect = (neighborhood: string, zone: ZoneData) => {
    setInternalSelectedZoneId(zone.id);
    setSelectedNeighborhood(neighborhood);
    setSearchQuery(""); // Clear search to show the lists
    if (onSelectNeighborhood) {
      onSelectNeighborhood(neighborhood, zone);
    } else if (onSelectZone) {
      onSelectZone(zone);
    }
  };

  const selectedZone = DELIVERY_ZONES.find(z => z.id === activeZoneId);

  return (
    <div id="interactive-delivery-map" className="relative bg-gradient-to-br from-[#050b18] via-[#091225] to-[#040812] rounded-2xl border border-[#D4A55A]/25 p-3 md:p-6 text-white max-w-6xl mx-auto shadow-2xl overflow-hidden font-sans">
      
      {/* Decorative Grid Lines to match dark cartography */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,165,90,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(212,165,90,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Compass Decorator */}
      <div className="absolute top-6 right-6 opacity-10 pointer-events-none hidden md:block">
        <Compass className="h-16 w-16 text-[#D4A55A] animate-[spin_80s_linear_infinite]" />
      </div>

      {/* Close button absolutely positioned at top right of card */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer z-30 bg-black/40 backdrop-blur-xs"
          title="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-2.5 mb-3 sm:pb-5 sm:mb-5 pr-8 sm:pr-12">
        <div>
          {showTitle && (
            <h3 className="text-base sm:text-xl md:text-2xl font-serif font-semibold text-[#F4EAD7] flex items-center gap-1.5 sm:gap-2">
              <MapPin className="h-4 sm:h-5 w-4 sm:w-5 text-[#D4A55A]" />
              Zonas y Mapa de Envío Juem
            </h3>
          )}
          <p className="text-[10px] sm:text-xs text-[#F4EAD7]/70 mt-0.5 sm:mt-1 font-sans">
            Explora las tarifas oficiales en el mapa de alta definición de Montevideo y Canelones.
          </p>
        </div>
      </div>

      {/* Split Layout: Map on the Left/Top, Directory on the Right/Bottom */}
      <div className="relative flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 items-start">
        
        {/* Left Column: Zoomable Map (7 Cols) */}
        <div className="md:col-span-7 flex flex-col items-center bg-black/40 border border-white/5 rounded-xl p-3 md:p-4 w-full max-w-full">
          
          {/* Quick Informational Notice / Zoom level indicator */}
          <div className="w-full flex items-center justify-between mb-2.5 text-[9.5px] md:text-[11px] text-white/60 select-none">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[#F4EAD7]/90 font-medium font-sans">Zoom: {Math.round(zoomScale * 100)}%</span>
            </div>
            {zoomScale > 1 ? (
              <span className="text-[#D4A55A] font-sans flex items-center gap-1">
                <Hand className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-pulse" /> Arrastra para mover
              </span>
            ) : (
              <span className="text-white/40 font-sans flex items-center gap-1">
                <MousePointerClick className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Doble toque para zoom
              </span>
            )}
          </div>

          {/* The Map Frame with Drag-and-Pan enabled when zoomed */}
          <div 
            ref={containerRef}
            className="relative w-full max-w-full rounded-lg bg-[#050b18]/90 border border-[#D4A55A]/20 overflow-hidden select-none"
            style={{ 
              aspectRatio: "1 / 1", 
              touchAction: zoomScale > 1 ? "none" : "pan-y" 
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            onDoubleClick={handleDoubleClick}
          >
            <img 
              src="https://res.cloudinary.com/dwqzjqjwz/image/upload/q_100,f_auto,e_sharpen:80/v1783609495/mapa_2_juem_de_envios_teumz8.png" 
              alt="Mapa de Envíos Juem"
              className="w-full h-full object-contain select-none origin-center pointer-events-none"
              referrerPolicy="no-referrer"
              preserveAspectRatio="xMidYMid meet"
              style={{
                transform: zoomScale > 1 ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})` : "none",
                cursor: zoomScale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                transition: isDragging ? "none" : "transform 0.15s ease-out",
                imageRendering: "auto",
                WebkitImageRendering: "optimize-contrast",
                willChange: zoomScale > 1 ? "transform" : "auto",
              }}
            />
          </div>

          {/* Control Center */}
          <div className="w-full mt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white/[0.03] border border-white/5 rounded-xl p-2.5 sm:p-3">
            {/* Zoom Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <button
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5 transition-all cursor-pointer"
                title="Alejar"
              >
                <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Slider */}
              <input 
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={zoomScale}
                onChange={handleSliderChange}
                className="w-20 sm:w-24 md:w-32 accent-[#D4A55A] cursor-pointer h-1 bg-white/15 rounded-lg appearance-none"
              />

              <button
                onClick={handleZoomIn}
                disabled={zoomScale >= 6}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5 transition-all cursor-pointer"
                title="Acercar"
              >
                <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {zoomScale > 1 && (
                <button
                  onClick={handleReset}
                  className="ml-1 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-[#D4A55A]/15 border border-[#D4A55A]/35 hover:bg-[#D4A55A]/25 text-[9px] text-[#F4EAD7] transition-all cursor-pointer"
                  title="Restablecer"
                >
                  <RotateCcw className="h-2.5 w-2.5 text-[#D4A55A]" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="text-[9px] sm:text-[10px] text-white/50 text-center sm:text-right font-sans">
              Usa zoom <span className="text-[#D4A55A] font-medium">+ o -</span> o arrastra para explorar.
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Zone Directory (5 Cols) */}
        <div className="md:col-span-5 flex flex-col gap-4 w-full relative">
          
          {/* Barrio Search Box */}
          <div className="relative z-50 bg-[#091225] border border-white/10 rounded-xl p-3.5 sm:p-4 shadow-md w-full">
            <h4 className="text-[10px] sm:text-xs font-semibold text-[#D4A55A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ¿No sabes qué zona te corresponde?
            </h4>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Busca tu barrio (ej. Sayago, Pocitos...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-8 text-xs sm:text-sm text-[#F4EAD7] placeholder-white/30 focus:outline-none focus:border-[#D4A55A]/50 transition-all font-sans"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-white/40 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute left-0 right-0 mt-2 bg-[#091225] border border-[#D4A55A]/40 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-white/5">
                {searchResults.length > 0 ? (
                  searchResults.map((res, index) => (
                    <button
                      key={index}
                      onClick={() => handleNeighborhoodSelect(res.neighborhood, res.zone)}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] sm:text-xs hover:bg-[#D4A55A]/10 text-[#F4EAD7] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>
                        <strong className="text-[#D4A55A]">{res.neighborhood}</strong>
                        <span className="text-white/55 text-[10px] sm:text-[11px]"> ({res.zone.name})</span>
                      </span>
                      <span className="bg-[#D4A55A]/10 text-[#D4A55A] px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">
                        ${res.zone.price}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3.5 py-3 text-[11px] sm:text-xs text-white/50 text-center font-sans">
                    No se encontraron barrios que coincidan.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active / Highlighted Zone Details */}
          {selectedZone && (
            <div className="bg-[#D4A55A]/5 border border-[#D4A55A]/30 rounded-xl p-3.5 sm:p-4 relative z-10 overflow-hidden animate-fadeIn w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A55A]/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="inline-block px-1.5 py-0.5 rounded text-[8.5px] sm:text-[10px] uppercase font-bold tracking-wider bg-[#D4A55A]/20 text-[#D4A55A] border border-[#D4A55A]/35">
                  Zona Seleccionada
                </span>
                <button 
                  onClick={() => {
                    setInternalSelectedZoneId(null);
                    setSelectedNeighborhood(null);
                  }}
                  className="text-white/40 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <h4 className="text-[#F4EAD7] font-serif font-semibold text-sm sm:text-base mb-2.5">
                {selectedZone.name}
              </h4>

              <div className="flex items-center gap-4 bg-black/35 rounded-lg p-2.5 sm:p-3 border border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-[#D4A55A]/10">
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#D4A55A]" />
                  </div>
                  <div>
                    <div className="text-[8px] sm:text-[9px] text-white/45 uppercase font-sans">Costo de Envío</div>
                    <div className="text-xs sm:text-sm font-bold text-[#F4EAD7] font-sans">${selectedZone.price} UYU</div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[8.5px] sm:text-[10px] text-white/40 uppercase tracking-wider mb-1 font-sans">Barrios de cobertura:</div>
                <div className="flex flex-wrap gap-1 font-sans">
                  {selectedZone.neighborhoods.map((n, i) => {
                    const isSelected = n === selectedNeighborhood;
                    return (
                      <span 
                        key={i} 
                        onClick={() => handleNeighborhoodSelect(n, selectedZone)}
                        className={`text-[9px] sm:text-[10px] transition-all cursor-pointer border px-2 py-0.5 rounded ${
                          isSelected 
                            ? "bg-[#D4A55A] text-black font-semibold border-[#D4A55A] shadow-md" 
                            : "bg-white/5 hover:bg-[#D4A55A]/10 hover:text-[#D4A55A] border-white/5 text-white/80"
                        }`}
                      >
                        {n}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* All Delivery Zones Directory (Scrollable list of 10 zones) */}
          <div className="flex flex-col gap-1.5 w-full relative z-10">
            <h4 className="text-[10px] sm:text-xs font-semibold text-[#F4EAD7]/50 uppercase tracking-wider pl-1 font-sans">
              Listado Completo de Zonas
            </h4>
            
            <div className="flex flex-col gap-2 max-h-[230px] md:max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {DELIVERY_ZONES.map((zone) => {
                const isCurrent = zone.id === activeZoneId;
                return (
                  <div
                    key={zone.id}
                    onClick={() => handleZoneSelect(zone)}
                    className={`group text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isCurrent 
                        ? "bg-[#D4A55A]/10 border-[#D4A55A]/50 shadow-lg shadow-black/30" 
                        : "bg-white/[0.02] border-white/5 hover:border-[#D4A55A]/25 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[11px] sm:text-xs font-semibold transition-all ${
                        isCurrent ? "text-[#D4A55A]" : "text-[#F4EAD7] group-hover:text-[#D4A55A]"
                      }`}>
                        {zone.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] sm:text-[10px] font-bold font-sans transition-all ${
                        zone.color === "purple" 
                          ? "bg-purple-950/40 text-purple-300 border border-purple-500/20" 
                          : "bg-blue-950/40 text-blue-300 border border-blue-500/20"
                      }`}>
                        ${zone.price}
                      </span>
                    </div>

                    <p className="text-[9.5px] sm:text-[11px] text-white/55 group-hover:text-white/70 line-clamp-1 font-sans">
                      {zone.neighborhoods.join(", ")}
                    </p>

                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/[0.03]">
                      <span className="text-[9px] sm:text-[10px] text-white/35 group-hover:text-white/55 font-sans">
                        Ver barrios de cobertura
                      </span>
                      <ChevronRight className="h-3 w-3 text-white/20 group-hover:text-[#D4A55A] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Footer Info Notice */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[10px] sm:text-xs text-white/40 font-sans">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#D4A55A] shrink-0" />
          <span>¿Tu zona no figura en la lista? Consúltanos directamente por WhatsApp.</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-[#D4A55A]">
          Juem Delivery © 2026
        </div>
      </div>

    </div>
  );
};
