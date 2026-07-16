import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ShoppingCart, MessageSquare, ShieldCheck, Truck, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Share2, Maximize2, Cpu, Wrench, Clock, Calendar, Home, Ruler, Palette, Sun, MapPin, Package, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, SiteSettings, is3DProduct } from "../types";
import ProductCard from "./ProductCard";

export const PRINT_MATERIALS = [
  { id: "PLA", name: "PLA", priceMultiplier: 1.0, description: "Biodegradable, excelente acabado estético y variedad de colores." },
  { id: "PETG", name: "PETG", priceMultiplier: 1.15, description: "Mayor resistencia física, química y térmica." },
  { id: "ABS", name: "ABS", priceMultiplier: 1.20, description: "Gran resistencia mecánica y resistencia al impacto." },
  { id: "TPU", name: "TPU / Flex", priceMultiplier: 1.30, description: "Material flexible y elástico como la goma." }
];

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, size?: string, color?: string, quantity?: number) => void;
  settings: SiteSettings;
  allProducts?: Product[];
  dbCategories?: any[];
  onViewProduct?: (product: Product) => void;
  isCartOpen?: boolean;
}

export default function ProductDetails({
  product,
  onClose,
  onAddToCart,
  settings,
  allProducts = [],
  dbCategories = [],
  onViewProduct = () => {},
  isCartOpen = false
}: ProductDetailsProps) {
  const isThemeDark = settings.themeMode === "dark";

  const optimizeImageUrlForDetail = (url: string, width: number = 800, customQual?: number) => {
    if (!url) return "";
    if (url.includes("unsplash.com")) {
      let optimized = url.replace("auto=format", "fm=webp");
      // Remove any existing width or quality params to prevent duplication
      optimized = optimized.replace(/[&?]w=\d+/g, "").replace(/[&?]q=\d+/g, "");
      const quality = customQual !== undefined ? customQual : 70;
      return optimized + (optimized.includes("?") ? "&" : "?") + `w=${width}&q=${quality}`;
    }
    return url;
  };

  const is3D = is3DProduct(product);
  const solvedDetailsCategory = dbCategories.find(c => String(c.id) === String(product.categoria_id)) || { nombre: product.category || "", id: product.categoria_id || "todos" };
  const solvedCategoryName = (solvedDetailsCategory?.nombre || product.category || "").toLowerCase();
  const isClothingCategory = solvedCategoryName === "ropa" || 
    solvedCategoryName.includes("vest") || 
    solvedCategoryName.includes("calza") || 
    solvedCategoryName.includes("prend") || 
    solvedCategoryName.includes("buzo") || 
    solvedCategoryName.includes("abrigo") || 
    solvedCategoryName.includes("jean") || 
    solvedCategoryName.includes("remera") || 
    solvedCategoryName.includes("panta") ||
    solvedCategoryName.includes("clothing") ||
    solvedCategoryName.includes("pijama") ||
    solvedCategoryName.includes("poncho") ||
    solvedCategoryName.includes("manta") ||
    solvedCategoryName.includes("kigurumi") ||
    solvedCategoryName.includes("niño") ||
    solvedCategoryName.includes("niña") ||
    solvedCategoryName.includes("infantil") ||
    solvedCategoryName.includes("indumentaria");

  const nameLower = (product.name || "").toLowerCase();
  const isClothingName = nameLower.includes("buzo") ||
    nameLower.includes("poncho") ||
    nameLower.includes("pijama") ||
    nameLower.includes("remera") ||
    nameLower.includes("pantalon") ||
    nameLower.includes("pantalón") ||
    nameLower.includes("campera") ||
    nameLower.includes("abrigo") ||
    nameLower.includes("calza") ||
    nameLower.includes("vestido") ||
    nameLower.includes("jean") ||
    nameLower.includes("hoodie") ||
    nameLower.includes("short") ||
    nameLower.includes("manta") ||
    nameLower.includes("saco");

  const isClothing = !is3D && (isClothingCategory || isClothingName);
  
  const isShoe = !is3D && (
    nameLower.includes("zapato") ||
    nameLower.includes("zapatilla") ||
    nameLower.includes("champio") ||
    nameLower.includes("champión") ||
    nameLower.includes("bota") ||
    nameLower.includes("pantufla") ||
    nameLower.includes("sandalia") ||
    nameLower.includes("calzado") ||
    solvedCategoryName.includes("zapato") ||
    solvedCategoryName.includes("zapatilla") ||
    solvedCategoryName.includes("calzado")
  );

  const isSizeChartEligible = isClothing || isShoe;
  const isElectronics = !is3D && product.category.toLowerCase() === "artículos electrónicos";

  // Dynamic variants logic
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;

  // Filter related products
  let relatedProducts = allProducts
    ? allProducts.filter((p) => p.id !== product.id && p.active !== false && p.paused !== true && (
        String(p.categoria_id) === String(product.categoria_id) || 
        p.category?.toLowerCase() === product.category?.toLowerCase()
      ))
    : [];

  if (relatedProducts.length < 4 && allProducts) {
    const ids = new Set(relatedProducts.map(p => p.id));
    const extra = allProducts.filter(
      (p) => p.id !== product.id && p.active !== false && p.paused !== true && !ids.has(p.id)
    );
    relatedProducts = [...relatedProducts, ...extra].slice(0, 4);
  }

  const sizes = is3D
    ? (product.sizes && product.sizes.length > 0 ? product.sizes : ["PLA", "PETG", "ABS", "TPU"])
    : (product.sizes && product.sizes.length > 0 
      ? product.sizes 
      : (hasVariants ? Array.from(new Set(variants.map(v => v.size))) : (isClothing ? ["S", "M", "L", "XL"] : [])));

  const colors = product.colors && product.colors.length > 0
    ? product.colors
    : (is3D 
      ? ["Negro mate", "Blanco tiza", "Gris plata", "Rojo fuego", "Azul cobalto", "Verde bosque", "Naranja", "Amarillo sol"]
      : (hasVariants ? Array.from(new Set(variants.map(v => v.color))) : (isClothing 
        ? ["Negro", "Gris", "Blanco"] 
        : isElectronics 
        ? ["Negro mate", "Plata espacial", "Azul cobalto"] 
        : ["Estándar"])));

  // Helper to check if a specific size is in stock (considering selectedColor if active)
  const isSizeInStock = (sz: string): boolean => {
    if (is3D) return true;
    if (!hasVariants) return true;
    
    if (selectedColor) {
      // Check if this specific combination has stock > 0
      const v = variants.find(v => v.size === sz && v.color === selectedColor);
      return v ? v.stock > 0 : false;
    } else {
      // No color selected: check if this size has ANY variant with stock > 0
      return variants.some(v => v.size === sz && v.stock > 0);
    }
  };

  // Helper to check if a specific color is in stock (considering selectedSize if active)
  const isColorInStock = (col: string): boolean => {
    if (is3D) return true;
    if (!hasVariants) return true;
    
    if (selectedSize) {
      // Check if this specific combination has stock > 0
      const v = variants.find(v => v.size === selectedSize && v.color === col);
      return v ? v.stock > 0 : false;
    } else {
      // No size selected: check if this color has ANY variant with stock > 0
      return variants.some(v => v.color === col && v.stock > 0);
    }
  };

  // Pre-initialize selectors (only auto-select if there is exactly 1 option, otherwise start unselected)
  const [selectedSize, setSelectedSize] = useState(() => {
    if (is3D) return sizes.includes("PLA") ? "PLA" : (sizes[0] || "");
    return sizes.length === 1 ? sizes[0] : "";
  });

  const [selectedColor, setSelectedColor] = useState(() => {
    return colors.length === 1 ? colors[0] : "";
  });

  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const optionsRef = useRef<HTMLDivElement>(null);

  // Clear error message when options or product change
  useEffect(() => {
    setErrorMessage("");
  }, [selectedSize, selectedColor, product.id]);

  // --- SIZE GUIDE / CHART INTEGRATION STATE & PERSISTENCE ---
  const [showSizeChart, setShowSizeChart] = useState(false);
  
  const [userHeight, setUserHeight] = useState(() => {
    try {
      return localStorage.getItem("juem_user_height") || "";
    } catch {
      return "";
    }
  });

  const [userWeight, setUserWeight] = useState(() => {
    try {
      return localStorage.getItem("juem_user_weight") || "";
    } catch {
      return "";
    }
  });

  const [userShoeSize, setUserShoeSize] = useState(() => {
    try {
      return localStorage.getItem("juem_user_shoe_size") || "";
    } catch {
      return "";
    }
  });

  // Save changes to localStorage for future views
  useEffect(() => {
    try {
      localStorage.setItem("juem_user_height", userHeight);
    } catch {}
  }, [userHeight]);

  useEffect(() => {
    try {
      localStorage.setItem("juem_user_weight", userWeight);
    } catch {}
  }, [userWeight]);

  useEffect(() => {
    try {
      localStorage.setItem("juem_user_shoe_size", userShoeSize);
    } catch {}
  }, [userShoeSize]);

  // Robustly parse sizeChartData to prevent JSON string vs object errors
  const parsedSizeChartData = useMemo(() => {
    if (!product.sizeChartData) return null;
    if (typeof product.sizeChartData === "object") return product.sizeChartData;
    try {
      if (typeof product.sizeChartData === "string") {
        return JSON.parse(product.sizeChartData);
      }
    } catch (e) {
      console.error("Error parsing sizeChartData", e);
    }
    return null;
  }, [product.sizeChartData]);

  // Detect if the product is for kids / babies / infant
  const isKidsProduct = useMemo(() => {
    const nameLower = (product.name || "").toLowerCase();
    const catLower = (product.category || "").toLowerCase();
    return nameLower.includes("infantil") || 
           nameLower.includes("niño") || 
           nameLower.includes("niña") || 
           nameLower.includes("kids") || 
           nameLower.includes("bebe") || 
           nameLower.includes("bebé") ||
           catLower.includes("infantil") ||
           catLower.includes("niño") ||
           catLower.includes("niña") ||
           catLower.includes("kids");
  }, [product.name, product.category]);
  
  const defaultChartTab = useMemo(() => {
    const list: string[] = [];
    const hasCustomChart = !!(parsedSizeChartData && parsedSizeChartData.columns && parsedSizeChartData.rows && parsedSizeChartData.rows.length > 0);
    if (hasCustomChart) {
      list.push("articulo");
    }
    if (product.sizeChartShowSuperior !== false) {
      list.push("superior");
    }
    if (product.sizeChartShowInferior !== false) {
      list.push("inferior");
    }
    if (product.sizeChartShowCalzado !== false) {
      list.push("calzado");
    }
    if (product.sizeChartShowRecommender !== false) {
      list.push("recommender");
    }

    const name = (product.name || "").toLowerCase();
    const cat = (product.category || "").toLowerCase();

    if (list.length === 0) {
      // Intelligent fallback list to prevent showing an empty modal
      if (cat.includes("calzado") || cat.includes("zapato") || cat.includes("zapatilla") || name.includes("calzado") || name.includes("zapati") || (name.includes("buzo") === false && (name.includes("zapatos") || name.includes("champio") || name.includes("bota") || name.includes("pantu")))) {
        list.push("calzado");
      } else if (cat.includes("pantalon") || cat.includes("inferior") || cat.includes("shorts") || name.includes("pantalon") || name.includes("jean") || name.includes("jogger") || name.includes("short") || name.includes("calza")) {
        list.push("inferior");
      } else {
        list.push("superior");
        list.push("recommender");
      }
    }
    
    let preferred = "superior";
    if (cat.includes("calzado") || cat.includes("zapato") || cat.includes("zapatilla") || name.includes("calzado") || name.includes("zapati") || name.includes("buzo") === false && (name.includes("zapatos") || name.includes("champio") || name.includes("bota") || name.includes("pantu"))) {
      preferred = "calzado";
    } else if (cat.includes("pantalon") || cat.includes("inferior") || cat.includes("shorts") || name.includes("pantalon") || name.includes("jean") || name.includes("jogger") || name.includes("short") || name.includes("calza")) {
      preferred = "inferior";
    } else if (hasCustomChart) {
      preferred = "articulo";
    }

    if (list.includes(preferred)) {
      return preferred;
    }
    return list[0];
  }, [product.name, product.category, parsedSizeChartData, product.sizeChartShowSuperior, product.sizeChartShowInferior, product.sizeChartShowCalzado, product.sizeChartShowRecommender]);

  const [activeChartTab, setActiveChartTab] = useState(defaultChartTab);

  // Auto-update default active tab when product changes
  useEffect(() => {
    setActiveChartTab(defaultChartTab);
  }, [product.id, defaultChartTab]);

  const recommendedSize = useMemo(() => {
    const h = parseFloat(userHeight);
    const w = parseFloat(userWeight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    
    if (isKidsProduct) {
      // Kids' sizing recommendation logic based on child height (primary factor for kids clothing)
      if (h < 90) return "Talle 2 (1-2 años)";
      if (h < 100) return "Talle 4 (2-3 años)";
      if (h < 112) return "Talle 6 (4-6 años)";
      if (h < 122) return "Talle 8 (6-8 años)";
      if (h < 132) return "Talle 10 (8-10 años)";
      if (h < 142) return "Talle 12 (10-12 años)";
      if (h < 152) return "Talle 14 (12-14 años)";
      return "Talle 16 (14-16 años)";
    } else {
      // Adult sizing recommendation logic
      if (w < 55) {
        if (h < 165) return "S";
        return "M";
      } else if (w >= 55 && w < 68) {
        if (h < 172) return "M";
        return "L";
      } else if (w >= 68 && w < 82) {
        if (h < 180) return "L";
        return "XL";
      } else if (w >= 82 && w < 95) {
        if (h < 188) return "XL";
        return "XXL";
      } else {
        return "XXL/3XL";
      }
    }
  }, [userHeight, userWeight, isKidsProduct]);

  // Try to match the recommended size with available size options to allow quick selection
  const recommenderMatchResult = useMemo(() => {
    if (!recommendedSize) return null;
    // Extract size label like "6" or "M" to search in product sizes
    let cleanRec = recommendedSize.toUpperCase().trim();
    if (cleanRec.startsWith("TALLE ")) {
      cleanRec = cleanRec.replace("TALLE ", "").split(" ")[0].trim(); // gets "6" from "Talle 6 (4-6 años)"
    }
    
    const sizeOptions = sizes || [];
    // Try exact match
    const exactMatch = sizeOptions.find(s => s.trim().toUpperCase() === cleanRec);
    if (exactMatch) {
      return { size: exactMatch, available: true };
    }
    
    // Try substring matching
    const partialMatch = sizeOptions.find(s => s.trim().toUpperCase().includes(cleanRec) || cleanRec.includes(s.trim().toUpperCase()));
    if (partialMatch) {
      return { size: partialMatch, available: true };
    }
    
    return { size: recommendedSize, available: false };
  }, [recommendedSize, sizes]);

  // Dynamic stock calculations based on Cartesian variant mapping
  let currentStock = product.stock;
  let currentStockPinamar = product.stockPinamar !== undefined ? product.stockPinamar : product.stock;
  let currentStockMontevideo = product.stockMontevideo !== undefined ? product.stockMontevideo : 0;
  let dynamicPrice = product.price;
  let matchedVariant: any = null;

  if (hasVariants) {
    if (selectedSize && selectedColor) {
      // Both size and color selected: exact match only
      const exactMatch = variants.find(v => v.size === selectedSize && v.color === selectedColor);
      if (exactMatch) {
        currentStock = exactMatch.stock;
        currentStockPinamar = exactMatch.stockPinamar !== undefined ? exactMatch.stockPinamar : exactMatch.stock;
        currentStockMontevideo = exactMatch.stockMontevideo !== undefined ? exactMatch.stockMontevideo : 0;
        dynamicPrice = typeof exactMatch.price === "number" && exactMatch.price > 0
          ? exactMatch.price
          : product.price + (exactMatch.priceDelta || 0);
        matchedVariant = exactMatch;
      } else {
        currentStock = 0;
        currentStockPinamar = 0;
        currentStockMontevideo = 0;
        dynamicPrice = product.price;
        matchedVariant = null;
      }
    } else if (selectedSize) {
      // Only size selected: sum stock of all colors of this size
      const matchingVars = variants.filter(v => v.size === selectedSize);
      if (matchingVars.length > 0) {
        currentStock = matchingVars.reduce((sum, v) => sum + v.stock, 0);
        currentStockPinamar = matchingVars.reduce((sum, v) => sum + (v.stockPinamar !== undefined ? v.stockPinamar : v.stock), 0);
        currentStockMontevideo = matchingVars.reduce((sum, v) => sum + (v.stockMontevideo !== undefined ? v.stockMontevideo : 0), 0);
        // Use price of first matching variant as representative dynamic price
        const representative = matchingVars[0];
        dynamicPrice = typeof representative.price === "number" && representative.price > 0
          ? representative.price
          : product.price + (representative.priceDelta || 0);
        matchedVariant = representative;
      } else {
        currentStock = 0;
        currentStockPinamar = 0;
        currentStockMontevideo = 0;
        dynamicPrice = product.price;
        matchedVariant = null;
      }
    } else if (selectedColor) {
      // Only color selected: sum stock of all sizes of this color
      const matchingVars = variants.filter(v => v.color === selectedColor);
      if (matchingVars.length > 0) {
        currentStock = matchingVars.reduce((sum, v) => sum + v.stock, 0);
        currentStockPinamar = matchingVars.reduce((sum, v) => sum + (v.stockPinamar !== undefined ? v.stockPinamar : v.stock), 0);
        currentStockMontevideo = matchingVars.reduce((sum, v) => sum + (v.stockMontevideo !== undefined ? v.stockMontevideo : 0), 0);
        const representative = matchingVars[0];
        dynamicPrice = typeof representative.price === "number" && representative.price > 0
          ? representative.price
          : product.price + (representative.priceDelta || 0);
        matchedVariant = representative;
      } else {
        currentStock = 0;
        currentStockPinamar = 0;
        currentStockMontevideo = 0;
        dynamicPrice = product.price;
        matchedVariant = null;
      }
    } else {
      // Neither size nor color selected yet: sum all variants stock
      currentStock = variants.reduce((sum, v) => sum + v.stock, 0);
      currentStockPinamar = variants.reduce((sum, v) => sum + (v.stockPinamar !== undefined ? v.stockPinamar : v.stock), 0);
      currentStockMontevideo = variants.reduce((sum, v) => sum + (v.stockMontevideo !== undefined ? v.stockMontevideo : 0), 0);
      dynamicPrice = product.price;
      matchedVariant = null;
    }
  }

  const activeSku = useMemo(() => {
    const baseCode = product.codigo || "";
    if (!variants || variants.length === 0) return baseCode;
    
    // Exact size and color matches
    if (selectedSize && selectedColor) {
      const match = variants.find(v => v.size === selectedSize && v.color === selectedColor);
      if (match?.sku) return match.sku;
      if (match) {
        const sizePart = match.size === 'Único' || !match.size ? '' : `-${match.size}`;
        const colorPart = match.color === 'General' || !match.color ? '' : `-${match.color}`;
        return `${baseCode}${sizePart}${colorPart}`.toUpperCase();
      }
    }
    
    // Only color matched
    if (selectedColor) {
      let match = selectedSize ? variants.find(v => v.size === selectedSize && v.color === selectedColor) : null;
      if (!match) {
        match = variants.find(v => v.color === selectedColor);
      }
      if (match?.sku) return match.sku;
      if (match) {
        const sizePart = match.size === 'Único' || !match.size ? '' : `-${match.size}`;
        const colorPart = match.color === 'General' || !match.color ? '' : `-${match.color}`;
        return `${baseCode}${sizePart}${colorPart}`.toUpperCase();
      }
    }
    
    // Only size matched
    if (selectedSize) {
      const match = variants.find(v => v.size === selectedSize);
      if (match?.sku) return match.sku;
      if (match) {
        const sizePart = match.size === 'Único' || !match.size ? '' : `-${match.size}`;
        const colorPart = match.color === 'General' || !match.color ? '' : `-${match.color}`;
        return `${baseCode}${sizePart}${colorPart}`.toUpperCase();
      }
    }
    
    // Fallback: If there's an exact SKU in the first variant that matches color/size or general
    if (variants[0]?.sku) {
      return variants[0].sku;
    }
    
    return baseCode;
  }, [product.codigo, variants, selectedSize, selectedColor]);

  const getDelayInDays = (prod: any): number => {
    const val = prod.hoursPerUnit;
    if (val === undefined || val === null) return 1;
    if (val === 8) return 1;
    if (val === 24) return 2;
    if (val === 48) return 3;
    return val;
  };

  const getEstimatedDeliveryString = (days: number) => {
    if (days === 0) return "Inmediata (en stock)";
    const date = new Date();
    date.setDate(date.getDate() + days + 1); // +1 day for processing/packaging
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const formatted = date.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Dynamic Image carousels
  const allImages = useMemo(() => {
    const base = [product.imageUrl, ...(product.imagenes || [])].filter(Boolean);
    const variantImgs = (variants || []).map(v => v.imageUrl).filter(Boolean) as string[];
    // Add variant images that are not in the base list
    variantImgs.forEach(img => {
      if (!base.includes(img)) {
        base.push(img);
      }
    });
    return base;
  }, [product.imageUrl, product.imagenes, variants]);

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageBgMode, setImageBgMode] = useState<"default" | "light" | "gold" | "contrast">("default");
  const [imageExposureMode, setImageExposureMode] = useState<"normal" | "boosted">("normal");

  // Touch Swiping state for Mobiles
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);

  const handleSwipeStart = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStartX === null) return;
    const swipeEndX = e.changedTouches[0].clientX;
    const diffX = swipeStartX - swipeEndX;
    const threshold = 40; // minimum pixels to count as a swipe

    if (diffX > threshold) {
      handleNextImg();
    } else if (diffX < -threshold) {
      handlePrevImg();
    }
    setSwipeStartX(null);
  };

  // Keep track of the last color that triggered an automatic image transition
  const autoSwitchedColorRef = useRef("");

  // Scroll to the top of the page when the product loaded changes, and reset the active image index and state
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveImgIndex(0);
    setSelectedSize(is3D ? (sizes.includes("PLA") ? "PLA" : (sizes[0] || "")) : (sizes.length === 1 ? sizes[0] : ""));
    setSelectedColor(colors.length === 1 ? colors[0] : "");
    setQuantity(1);
    autoSwitchedColorRef.current = ""; // Reset matched color on product change
  }, [product.id, is3D, sizes.length, colors.length]);

  // Lock body scrolling while ProductDetails overlay is mounted to prevent double scrollbar issues
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Automatically update activeImgIndex when selectedColor changes
  useEffect(() => {
    if (selectedColor && selectedColor !== autoSwitchedColorRef.current) {
      autoSwitchedColorRef.current = selectedColor;
      const lowerColor = selectedColor.toLowerCase().trim();
      // Strategy 1: Check if any variant has a specific variant imageUrl
      const matchedV = (variants || []).find(v => v.color && v.color.toLowerCase().trim() === lowerColor && v.imageUrl);
      if (matchedV && matchedV.imageUrl) {
        const idx = allImages.indexOf(matchedV.imageUrl);
        if (idx !== -1) {
          setActiveImgIndex(idx);
          return;
        }
      }

      // Strategy 2: Check standard image URLs for a substring containing the color name
      const matchesUrl = allImages.findIndex(img => {
        try {
          const decoded = decodeURIComponent(img).toLowerCase();
          return decoded.includes(lowerColor);
        } catch {
          return img.toLowerCase().includes(lowerColor);
        }
      });
      if (matchesUrl !== -1) {
        setActiveImgIndex(matchesUrl);
      }
    }
  }, [selectedColor, product.id, variants, allImages]);

  const handlePrevImg = () => {
    setActiveImgIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setActiveImgIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      const msg = is3D ? "Por favor selecciona un material." : "Por favor selecciona un talle.";
      setErrorMessage(msg);
      optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      const msg = "Por favor selecciona un color.";
      setErrorMessage(msg);
      optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const colorToPass = colors.length > 0 ? selectedColor : undefined;
    
    // Safety check quantity boundaries
    const maxQtyAllowed = is3D ? 99 : currentStock;
    const finalQty = Math.min(quantity, maxQtyAllowed);
    if (finalQty <= 0) {
      setErrorMessage("Lo sentimos, la cantidad seleccionada no es válida.");
      return;
    }

    onAddToCart(product, selectedSize || undefined, colorToPass, finalQty);
    
    setAddedMessage(true);
    setTimeout(() => {
      setAddedMessage(false);
    }, 2000);
  };

  const whatsAppConsultUrl = useMemo(() => {
    let specText = "";
    if (product.consultOnly) {
      specText = `👉 Consulta: Tiempo de entrega y disponibilidad\n${selectedSize ? `👉 Talle: ${selectedSize}\n` : ""}${selectedColor ? `👉 Color: ${selectedColor}\n` : ""}`;
    } else if (is3D) {
      const immediateQty = Math.min(quantity, Math.max(0, currentStock));
      const onDemandQty = Math.max(0, quantity - currentStock);
      const delayDays = getDelayInDays(product);
      const totalDelayDays = onDemandQty * delayDays;
      specText = `👉 Material seleccionado: ${selectedSize}
👉 Color deseado: ${selectedColor}
👉 Cantidad: ${quantity} un.
   - Entrega inmediata: ${immediateQty} un.
   - A fabricar bajo demanda: ${onDemandQty} un.
${onDemandQty > 0 ? `👉 Tiempo estimado de fabricación: ${totalDelayDays} ${totalDelayDays === 1 ? "día" : "días"}\n` : ""}`;
    } else {
      specText = `${selectedSize ? `👉 Talle seleccionado: ${selectedSize}\n` : ""}${selectedColor ? `👉 Color deseado: ${selectedColor}\n` : ""}`;
    }

    const text = product.consultOnly 
      ? `Hola ${settings.siteTitle || "Ventas Juem"}! Me gustaría consultar por la entrega y disponibilidad de este artículo:
*${product.name}*
${specText}Precio publicado: $${Math.round(dynamicPrice)}
¿Podrían asesorarme? ¡Muchas gracias!`
      : `Hola ${settings.siteTitle || "Ventas Juem"}! Me interesa obtener más información sobre este artículo:
*${product.name}*
${specText}Precio actual: $${Math.round(dynamicPrice * quantity)}
Me gustaría coordinar stock, fabricación y envío.`;

    const cleanPhone = (settings?.whatsappNumber || "5491123456789").replace(/[^0-9]/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }, [product, settings, selectedSize, selectedColor, quantity, dynamicPrice, is3D, currentStock]);

  const handleImmediateWhatsAppQuery = () => {
    window.open(whatsAppConsultUrl, "_blank", "referrer");
  };

  const isDiscounted = product.originalPrice && product.originalPrice > dynamicPrice;

  const solvedCategory = dbCategories.find(c => String(c.id) === String(product.categoria_id)) || { nombre: product.category, id: product.categoria_id || "todos" };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Inicio",
        "item": typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/` : "https://ventas-juem.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": solvedCategory.nombre || "Categoría",
        "item": typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/${solvedCategory.id || "todos"}` : "https://ventas-juem.com/todos"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/producto/${product.id}` : "https://ventas-juem.com/"
      }
    ]
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 animate-fade-in">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important; /* IE and Edge */
          scrollbar-width: none !important; /* Firefox */
        }
      `}</style>

      {/* Schema.org BreadcrumbList structured data */}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>

      {/* Dynamic SEO Breadcrumbs */}
      <nav aria-label="Breadcrumb" className={`flex items-center space-x-1 px-1 sm:space-x-2 text-[10px] sm:text-xs font-semibold mb-3 sm:mb-5 tracking-wide ${isThemeDark ? "text-zinc-400" : "text-zinc-650"}`}>
        <button 
          onClick={onClose}
          className="flex items-center gap-1 hover:text-indigo-500 hover:underline transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Inicio</span>
        </button>
        
        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
        
        <span className="capitalize">{solvedCategory.nombre || "Categoría"}</span>
        
        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
        
        <span className={isThemeDark ? "text-zinc-100 font-bold truncate max-w-[140px] sm:max-w-none" : "text-zinc-850 font-bold truncate max-w-[140px] sm:max-w-none"}>
          {product.name}
        </span>
      </nav>



      <div
        className={`relative w-full rounded-[32px] overflow-hidden flex flex-col md:grid md:grid-cols-[58%_42%] shadow-2xl transition-all duration-300 ${
          isThemeDark ? "bg-[#09090b] text-white" : "bg-white text-zinc-900"
        }`}
      >
        {/* Close Button: Luxurious, circular, shown mostly on small screens */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 rounded-full p-2 bg-black/40 text-zinc-400 hover:text-white hover:bg-black/60 border border-zinc-800/45 transition duration-200 cursor-pointer sm:hidden animate-fade-in"
          title="Volver"
        >
          <X className="h-4 w-4" />
        </button>
 
        {/* Left Column: Image Area without separating borders for unified visual integration */}
        <div className={`flex flex-col p-4 sm:p-5 md:p-6 justify-start items-center relative gap-3.5 sm:gap-4 overflow-hidden w-full shrink-0 ${
          isThemeDark ? "bg-[#09090b]" : "bg-white"
        }`}>
          
          {/* Main card for product details */}
          <div 
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
            className={`relative w-full h-[280px] sm:h-[360px] md:h-[460px] rounded-[24px] flex items-center justify-center p-4 sm:p-5 select-none overflow-hidden transition-all duration-500 ${
              imageBgMode === "light"
                ? "bg-[#efeff2]"
                : imageBgMode === "contrast"
                ? "bg-white shadow-inner border border-slate-200/60"
                : imageBgMode === "gold"
                ? (isThemeDark ? "bg-gradient-to-br from-[#121c2c] via-[#050b1a] to-[#04060c] border border-[#D4A55A]/25" : "bg-gradient-to-br from-amber-50/60 via-slate-50 to-[#fcfaf4] border border-amber-200/50")
                : (isThemeDark ? "bg-[#0c0c0e]/30 border border-zinc-800/40" : "bg-[#fcfbfc] border border-slate-100")
            }`}
          >
            
            {/* Ambient centered lighting glow for Studio Glow effect */}
            {imageBgMode === "gold" && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,165,90,0.14)_0%,transparent_75%)] pointer-events-none select-none animate-pulse duration-[6000ms]" />
            )}

            {/* Floating interactive helper controls in top-left */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 select-none">
              {/* Backdrop Switcher menu */}
              <div className="relative group/opt">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const modes: ("default" | "light" | "gold" | "contrast")[] = ["default", "light", "gold", "contrast"];
                    const currIdx = modes.indexOf(imageBgMode);
                    const nextMode = modes[(currIdx + 1) % modes.length];
                    setImageBgMode(nextMode);
                  }}
                  className="p-1.5 sm:p-2 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-[#E6BF76] hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-1 shadow-lg border border-white/10"
                  title="Cambiar fondo del producto"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider pr-0.5">Fondo</span>
                </button>
                <div className="absolute left-0 mt-1.5 hidden group-hover/opt:flex flex-col bg-zinc-950/95 backdrop-blur-lg border border-zinc-800 rounded-xl p-1 shadow-2xl min-w-[125px] gap-0.5 z-[20]">
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageBgMode("default"); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition ${
                      imageBgMode === "default" ? "text-[#E6BF76] bg-white/10" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                    Original
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageBgMode("light"); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition ${
                      imageBgMode === "light" ? "text-[#E6BF76] bg-white/10" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                    Fondo Gris
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageBgMode("contrast"); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition ${
                      imageBgMode === "contrast" ? "text-[#E6BF76] bg-white/10" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    Fondo Blanco
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageBgMode("gold"); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition ${
                      imageBgMode === "gold" ? "text-[#E6BF76] bg-white/10" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Estudio Glow
                  </button>
                </div>
              </div>

              {/* Exposure boost toggle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageExposureMode(prev => prev === "normal" ? "boosted" : "normal");
                }}
                className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-1 shadow-lg border ${
                  imageExposureMode === "boosted"
                    ? "bg-amber-500 text-[#050B1A] border-amber-400 font-bold"
                    : "bg-black/65 text-zinc-300 border-white/10 hover:text-[#E6BF76]"
                }`}
                title="Aumentar brillo para revelar texturas"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider pr-0.5">Iluminar</span>
              </button>
            </div>

            <div 
              onClick={() => setIsLightboxOpen(true)}
              className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-zoom-in group/main-img"
              title="Haz clic para ampliar la imagen"
            >
              <AnimatePresence>
                <motion.img
                  key={activeImgIndex}
                  src={optimizeImageUrlForDetail(allImages[activeImgIndex], 800, 75)}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  style={{
                    filter: imageExposureMode === "boosted"
                      ? "brightness(1.18) contrast(1.08) saturate(1.03)"
                      : "none"
                  }}
                  className="absolute max-h-full max-w-full object-contain select-none transition-transform duration-300 group-hover/main-img:scale-[1.025]"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  fetchPriority="high"
                />
              </AnimatePresence>

              {/* Floating expand indicator */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-full p-2 text-white/90 opacity-0 group-hover/main-img:opacity-100 transition-all duration-300 z-10 shadow-lg hover:scale-105 hover:bg-black/80">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
            


            {/* Navigation arrows for gallery images floating gracefully inside the card borders */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevImg(); }}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/75 text-white border border-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer z-10 shadow-md"
                >
                  <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextImg(); }}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/75 text-white border border-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer z-10 shadow-md"
                >
                  <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                </button>
              </>
            )}

            {/* Dots indicator inside the image area */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 select-none bg-black/30 backdrop-blur-xs px-3.5 py-1.5 rounded-full">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setActiveImgIndex(idx); }}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      activeImgIndex === idx ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail selector strips - crisp borders and scale transitions */}
          {allImages.length > 1 && (
            <div className="hidden sm:flex flex-wrap gap-2.5 sm:gap-3 py-1 select-none w-full justify-center max-w-full overflow-x-auto no-scrollbar shrink-0">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-2xl overflow-hidden border-2 transition-all duration-300 shrink-0 cursor-pointer ${
                    activeImgIndex === idx 
                      ? "border-[#D4A55A] scale-[1.04] shadow-md shadow-[#D4A55A]/15 bg-[#0B1730]" 
                      : isThemeDark
                      ? "border-zinc-800 bg-[#0c0c0e]/40 hover:border-zinc-700 opacity-80"
                      : "border-slate-205 bg-white hover:border-slate-350 opacity-85"
                  }`}
                >
                  <img src={optimizeImageUrlForDetail(imgUrl, 150, 65)} alt={`${product.name} - Miniatura ${idx + 1}`} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Form Section: Apple/Zara premium styling */}
        <div className={`p-6 sm:p-8 md:p-10 flex flex-col justify-between gap-8 ${
          isThemeDark ? "bg-[#09090b] text-white" : "bg-white text-zinc-900"
        }`}>
          <div className="space-y-4">
            <div>
              {/* Title */}
              <h2 className={`text-2xl sm:text-3xl font-extrabold font-sans tracking-tight mb-1.5 leading-tight ${
                isThemeDark ? "text-white" : "text-zinc-900"
              }`}>
                {product.name}
              </h2>

              {/* Unique Code / SKU */}
              {activeSku && (
                <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                    CÓDIGO ÚNICO:
                  </span>
                  <span className="px-2.5 py-0.5 bg-indigo-500/5 dark:bg-[#121214] border border-indigo-500/25 dark:border-zinc-800 rounded font-mono text-[11px] font-black text-[#5346ff] dark:text-[#a599ff] tracking-wider select-all shadow-sm">
                    {activeSku}
                  </span>
                </div>
              )}

              {/* Row with Price, Quantity Selector and "Comprar" Button */}
              <div className="flex items-center justify-between md:justify-start gap-4 mb-6 pb-3 border-b border-zinc-900/10 dark:border-zinc-800/30">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#E6BF76] tracking-tight">
                      ${Math.round(dynamicPrice)}
                    </span>
                  </div>
                  {/* Subtle Stock Label */}
                  {(() => {
                    const threshold = typeof settings?.lowStockThreshold === 'number' ? settings.lowStockThreshold : 5;
                    const isLowStock = currentStock > 0 && currentStock <= threshold;
                    
                    const labelText = product.consultOnly 
                      ? "Artículo a pedido"
                      : is3D 
                        ? (currentStock > 0 
                            ? (isLowStock 
                                ? "¡Pocas unidades! (Fabricación bajo demanda también disponible)" 
                                : null
                              )
                            : "Fabricación bajo demanda / A pedido"
                          )
                        : (currentStock > 0 
                            ? (isLowStock 
                                ? "¡Pocas unidades disponibles!" 
                                : null
                              )
                            : "Agotado"
                          );

                    if (!labelText) return null;

                    return (
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-semibold mt-0.5 ${
                          product.consultOnly
                            ? "text-emerald-500 font-bold font-mono uppercase tracking-wider"
                            : is3D 
                              ? (currentStock > 0 ? (isLowStock ? "text-amber-500 font-bold" : "text-emerald-500 font-bold") : "text-amber-500/80 font-bold")
                              : (currentStock > 0 ? (isLowStock ? "text-amber-500 font-bold" : (isThemeDark ? "text-zinc-400" : "text-zinc-500")) : "text-red-500 font-bold")
                        }`}>
                          {labelText}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {product.consultOnly ? (
                  <a
                    href={whatsAppConsultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-bold text-xs bg-[#25D366] hover:bg-[#20ba59] text-white active:scale-95 tracking-wide shadow-md cursor-pointer transition select-none shrink-0"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.998h.003c4.368 0 7.927-3.558 7.93-7.926a7.86 7.86 0 0 0-2.33-5.596ZM7.994 14.52a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                    </svg>
                    <span>Consultar por WhatsApp</span>
                  </a>
                ) : (currentStock > 0 || is3D) ? (
                  <div className="flex items-center gap-2">
                    {/* Quantity Selector immediately to the right of the price */}
                    <div className={`flex items-center rounded-lg border p-0.5 select-none ${
                      isThemeDark ? "border-zinc-800 bg-zinc-900/60 text-white" : "border-gray-251 bg-gray-50 text-zinc-800"
                    }`}>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition cursor-pointer font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs select-none">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(is3D ? Math.min(99, quantity + 1) : Math.min(currentStock, quantity + 1))}
                        disabled={is3D ? quantity >= 99 : quantity >= currentStock}
                        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition cursor-pointer font-bold text-sm"
                      >
                        +
                      </button>
                    </div>

                    {/* Buy Button - hidden on mobile, visible from md up */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="hidden md:flex items-center justify-center gap-1.5 py-2 px-3.5 sm:px-4 rounded-lg font-bold text-xs bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] hover:bg-opacity-90 active:scale-95 tracking-wide shadow-md cursor-pointer transition select-none shrink-0"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Comprar (${Math.round(dynamicPrice * quantity)})</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 font-bold bg-red-500/10 px-3 py-2 rounded-lg flex items-center gap-1 border border-red-500/20 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Sin Stock disponible</span>
                  </div>
                )}
              </div>



              {/* Description Details Block */}
              <h4 className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-2 ${
                isThemeDark ? "text-zinc-500" : "text-zinc-400"
              }`}>
                DETALLES
              </h4>
              <div 
                className={`text-[13px] sm:text-sm pr-3 leading-relaxed font-sans font-light max-h-[165px] overflow-y-auto custom-description-scrollbar ${
                  isThemeDark ? "text-zinc-400" : "text-zinc-650"
                }`}
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "anywhere"
                }}
              >
                <p className="whitespace-pre-line leading-relaxed">
                  {product.description || "Sin descripción de catálogo disponible."}
                </p>
              </div>
            </div>

            {/* Subtle spacer instead of a separator line */}
            <div className="h-3" />

            <div ref={optionsRef} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sizes selector matching design ovals */}
              {sizes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className={`text-[10px] font-bold tracking-[0.15em] uppercase ${
                    isThemeDark ? "text-zinc-400" : "text-zinc-500"
                  }`}>
                    {is3D ? "MATERIAL SELECCIONADO: " : "TALLE SELECCIONADO: "}
                    {selectedSize ? (
                      <span className="text-[#E6BF76] font-extrabold">{selectedSize}</span>
                    ) : (
                      <span className="text-red-500 font-bold dark:text-red-400 animate-pulse text-[9px]">
                        {is3D ? "(Por favor selecciona un material)" : "(Por favor selecciona un talle)"}
                      </span>
                    )}
                  </h4>
                  {(product.sizeChartEnabled === undefined ? isSizeChartEligible : product.sizeChartEnabled) && (
                    <button
                      type="button"
                      onClick={() => setShowSizeChart(true)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#E6BF76] hover:text-[#D4A55A] transition-colors uppercase tracking-[0.05em] cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Guía de talles</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((sz) => {
                    const inStock = isSizeInStock(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!inStock}
                        onClick={() => {
                          setSelectedSize(selectedSize === sz ? "" : sz);
                        }}
                        className={`text-xs px-4 py-1.5 rounded-full border transition-all duration-200 font-bold tracking-wide select-none ${
                          selectedSize === sz
                            ? "bg-[#D4A55A] border-transparent text-[#050B1A] shadow-sm shadow-[#D4A55A]/20 scale-[1.02] cursor-pointer"
                            : !inStock
                            ? "opacity-25 cursor-not-allowed bg-zinc-900/10 dark:bg-zinc-950/20 text-zinc-500 line-through decoration-zinc-650 border-zinc-800"
                            : isThemeDark
                            ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-[#D4A55A]/50 hover:text-white cursor-pointer hover:scale-105"
                            : "border-gray-200 bg-white text-zinc-650 hover:border-[#D4A55A]/50 hover:text-zinc-900 cursor-pointer hover:scale-105"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
                {is3D && selectedSize && (() => {
                  const mInfo = PRINT_MATERIALS.find(m => m.id === selectedSize);
                  return mInfo ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic mt-1 font-light leading-snug">
                      {mInfo.description}
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {/* Colors selector matching design ovals */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <h4 className={`text-[10px] font-bold tracking-[0.15em] uppercase ${
                  isThemeDark ? "text-zinc-400" : "text-zinc-500"
                }`}>
                  COLOR SELECCIONADO:{" "}
                  {selectedColor ? (
                    <span className="text-[#E6BF76] font-extrabold">{selectedColor}</span>
                  ) : (
                    <span className="text-red-500 font-bold dark:text-red-400 animate-pulse text-[9px]">(Por favor selecciona un color)</span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {colors.map((col) => {
                    const isAc = selectedColor === col;
                    const inStock = isColorInStock(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        disabled={!inStock}
                        onClick={() => {
                          setSelectedColor(selectedColor === col ? "" : col);
                          setQuantity(1); // reset quantity safely
                        }}
                        className={`text-xs px-4 py-1.5 rounded-full border transition-all duration-200 font-bold tracking-wide select-none ${
                          isAc
                            ? "bg-[#D4A55A] border-transparent text-[#050B1A] shadow-sm shadow-[#D4A55A]/20 scale-[1.02] cursor-pointer"
                            : !inStock
                            ? "opacity-25 cursor-not-allowed bg-zinc-900/10 dark:bg-zinc-950/20 text-zinc-500 line-through decoration-zinc-650 border-zinc-800"
                            : isThemeDark
                            ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-[#D4A55A]/50 hover:text-white cursor-pointer hover:scale-105"
                            : "border-gray-200 bg-white text-zinc-650 hover:border-[#D4A55A]/50 hover:text-zinc-900 cursor-pointer hover:scale-105"
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          </div>



          {/* Premium call actions: Horizontal 3-column button grid */}
          <div className="space-y-3 pt-4 mt-4">
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                type="button"
                onClick={handleImmediateWhatsAppQuery}
                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider bg-[#25D366] hover:bg-[#20ba56] text-white duration-200 shadow-xs select-none cursor-pointer transition-all shrink-0"
                title="Consultar por WhatsApp"
              >
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.998h.003c4.368 0 7.927-3.558 7.93-7.926a7.86 7.86 0 0 0-2.33-5.596ZM7.994 14.52a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
                <span className="text-[9px] sm:text-[11px]">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider border transition-all duration-200 select-none cursor-pointer ${
                  isThemeDark 
                    ? "border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900/40 bg-zinc-950/20" 
                    : "border-slate-200 text-zinc-650 hover:bg-slate-50 bg-white"
                }`}
                title="Volver al Catálogo"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                <span className="text-[9px] sm:text-[11px]">Volver</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/producto/${product.id}`;
                  const shareData = {
                    title: product.name,
                    text: `${product.name} - ${product.category}: ${settings.siteTitle || "Ventas Juem"}`,
                    url: url
                  };

                  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    try {
                      await navigator.share(shareData);
                    } catch (e: any) {
                      // fallback if canceled or locked
                      if (e.name !== "AbortError") {
                        navigator.clipboard.writeText(url);
                        setCopiedShare(true);
                        setTimeout(() => setCopiedShare(false), 2500);
                      }
                    }
                  } else {
                    navigator.clipboard.writeText(url);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2500);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider border transition-all duration-200 select-none cursor-pointer ${
                  isThemeDark 
                    ? "border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900/20" 
                    : "border-slate-100 text-zinc-500 hover:bg-slate-50/50"
                }`}
                title="Compartir o copiar enlace"
              >
                <Share2 className="h-4 w-4 text-sky-500 animate-pulse" />
                <span className="text-[9px] sm:text-[11px] truncate">
                  {copiedShare ? "¡Copiado!" : "Compartir"}
                </span>
              </button>
            </div>

            {addedMessage && (
              <p className="text-xs text-green-500 dark:text-green-400 font-bold text-center animate-pulse">
                ¡Producto añadido al carrito con éxito!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN DE PRODUCTOS RELACIONADOS */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 sm:mt-24 border-t border-slate-200/50 dark:border-zinc-800/60 pt-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg sm:text-xl font-extrabold tracking-tight ${
              isThemeDark ? "text-white" : "text-zinc-900"
            }`}>
              Productos Relacionados
            </h3>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#E6BF76]">
              Te puede interesar
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                settings={settings}
                onAddToCart={(prod, sz, col) => onAddToCart(prod, sz, col, 1)}
                onViewProduct={onViewProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Immersive Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-6 text-white"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Upper control strip */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-[110]">
              <span className="text-white/60 font-mono text-xs font-semibold bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full select-none">
                {activeImgIndex + 1} / {allImages.length}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="pointer-events-auto p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg border border-white/10"
                title="Cerrar vista ampliada"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main content viewport */}
            <div 
              className="relative w-full max-w-5xl h-[70vh] sm:h-[80vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} // Prevent clicking the image from closing the lightbox
            >
              <AnimatePresence>
                <motion.img
                  key={activeImgIndex}
                  src={optimizeImageUrlForDetail(allImages[activeImgIndex], 1200, 80)}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="absolute max-h-full max-w-full object-contain rounded-xl select-none"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {/* Prev/Next inside lightbox */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handlePrevImg(); }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer z-50 shadow-md border border-white/5"
                  >
                    <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleNextImg(); }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer z-50 shadow-md border border-white/5"
                  >
                    <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom thumbnail selector inside fullscreen overlay */}
            {allImages.length > 1 && (
              <div 
                className="mt-6 flex flex-wrap gap-2.5 justify-center max-w-full overflow-x-auto no-scrollbar py-2 shrink-0 relative z-[110]"
                onClick={(e) => e.stopPropagation()}
              >
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 shrink-0 cursor-pointer ${
                      activeImgIndex === idx 
                        ? "border-[#D4A55A] scale-[1.05] shadow-lg bg-[#0B1730]" 
                        : "border-white/10 bg-black/40 hover:border-white/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={optimizeImageUrlForDetail(imgUrl, 120, 60)} alt={`${product.name} - Galería Completa ${idx + 1}`} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- REUSABLE INTERACTIVE SIZE GUIDE MODAL (TABLA DE TALLES) --- */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showSizeChart && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop with fade transition */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSizeChart(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
              />

              {/* Modal Card with spring zoom entrance */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
                className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border bg-[#0B1730] border-[#D4A55A]/20 text-[#F4EAD7] z-10"
              >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b flex items-start justify-between border-[#D4A55A]/15 bg-[#050B1A]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#F4EAD7]">
                      Guía y Tabla de Talles
                    </h3>
                    {isKidsProduct && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        ✨ Kids / Infantil
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Medidas corporales y referencias oficiales para tu compra en Ventas Juem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSizeChart(false)}
                  className="p-1.5 rounded-full transition-colors cursor-pointer hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b overflow-x-auto no-scrollbar scroll-smooth shrink-0 px-4 sm:px-6 border-[#D4A55A]/15 bg-[#050B1A]">
                {(() => {
                  const hasCustom = !!(parsedSizeChartData && parsedSizeChartData.columns && parsedSizeChartData.rows && parsedSizeChartData.rows.length > 0);
                  const list = [];
                  if (hasCustom) {
                    list.push({ id: "articulo", label: "📏 Medidas del Artículo" });
                  }
                  if (product.sizeChartShowSuperior !== false) {
                    list.push({ id: "superior", label: "👕 Superiores" });
                  }
                  if (product.sizeChartShowInferior !== false) {
                    list.push({ id: "inferior", label: "👖 Inferiores" });
                  }
                  if (product.sizeChartShowCalzado !== false) {
                    list.push({ id: "calzado", label: "👟 Calzado" });
                  }
                  if (product.sizeChartShowRecommender !== false) {
                    list.push({ id: "recommender", label: "📏 Calculador Virtual" });
                  }

                  if (list.length === 0) {
                    // Intelligent fallback list to prevent showing an empty modal
                    const name = (product.name || "").toLowerCase();
                    const cat = (product.category || "").toLowerCase();
                    if (cat.includes("calzado") || cat.includes("zapato") || cat.includes("zapatilla") || name.includes("calzado") || name.includes("zapati") || (name.includes("buzo") === false && (name.includes("zapatos") || name.includes("champio") || name.includes("bota") || name.includes("pantu")))) {
                      list.push({ id: "calzado", label: "👟 Calzado" });
                    } else if (cat.includes("pantalon") || cat.includes("inferior") || cat.includes("shorts") || name.includes("pantalon") || name.includes("jean") || name.includes("jogger") || name.includes("short") || name.includes("calza")) {
                      list.push({ id: "inferior", label: "👖 Inferiores" });
                    } else {
                      list.push({ id: "superior", label: "👕 Superiores" });
                      list.push({ id: "recommender", label: "📏 Calculador Virtual" });
                    }
                  }

                  return list.map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setActiveChartTab(tb.id)}
                      className={`py-3.5 px-4 font-semibold text-xs sm:text-sm tracking-wide border-b-2 transition-all shrink-0 cursor-pointer ${
                        activeChartTab === tb.id
                          ? "border-[#D4A55A] text-[#D4A55A]"
                          : "border-transparent text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {tb.label}
                    </button>
                  ));
                })()}
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto max-h-[50vh] space-y-4">
                
                {/* 0. CUSTOM PRODUCT CHART TAB */}
                {activeChartTab === "articulo" && parsedSizeChartData && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <p className={`text-xs leading-relaxed ${isThemeDark ? "text-zinc-300" : "text-zinc-650"}`}>
                      Estas son las medidas reales de este artículo para ayudarte a elegir tu talle de manera óptima:
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-zinc-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={isThemeDark ? "bg-[#14121a] text-zinc-300" : "bg-slate-50 text-zinc-600"}>
                            {(parsedSizeChartData.columns || []).map((col: string) => (
                              <th key={col} className="p-3 font-semibold border-b border-slate-150 dark:border-zinc-800 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D4A55A]/10">
                          {(parsedSizeChartData.rows || []).map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#D4A55A]/5 even:bg-[#050B1A]/40">
                              {(parsedSizeChartData.columns || []).map((col: string) => {
                                const isFirstCol = col === "Talle" || (parsedSizeChartData?.columns?.[0] === col);
                                return (
                                  <td key={col} className={`p-3 ${isFirstCol ? "font-bold text-[#E6BF76] bg-[#050B1A]/20" : ""}`}>
                                    {row[col] || "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 1. SUPERIOR CHART TAB */}
                {activeChartTab === "superior" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <p className={`text-xs leading-relaxed ${isThemeDark ? "text-zinc-300" : "text-zinc-650"}`}>
                      Ideal para Remeras, Buzos, Hoodies y Camperas. Se recomienda medir una prenda propia estirada sobre una cama para comparar de forma precisa.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-zinc-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={isThemeDark ? "bg-[#14121a] text-zinc-300" : "bg-slate-50 text-zinc-600"}>
                            <th className="p-3 font-semibold">Talle</th>
                            <th className="p-3 font-semibold">Sisa (Ancho - cm)</th>
                            <th className="p-3 font-semibold">Largo total (cm)</th>
                            <th className="p-3 font-semibold font-mono">Pecho / Axila</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isThemeDark ? "divide-zinc-800" : "divide-slate-100"}`}>
                          {[
                            { t: "XS", w: "48 - 50", h: "64 - 66", d: "Suelto" },
                            { t: "S", w: "50 - 52", h: "66 - 68", d: "Suelto" },
                            { t: "M", w: "53 - 55", h: "69 - 71", d: "Estándar" },
                            { t: "L", w: "56 - 58", h: "72 - 74", d: "Estándar" },
                            { t: "XL", w: "59 - 61", h: "75 - 77", d: "Suelto" },
                            { t: "XXL", w: "62 - 64", h: "78 - 80", d: "Clásico" }
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-[#D4A55A]/5 even:bg-[#050B1A]/40">
                              <td className="p-3 font-bold text-[#E6BF76]">{row.t}</td>
                              <td className="p-3 font-semibold">{row.w} cm</td>
                              <td className="p-3">{row.h} cm</td>
                              <td className="p-3 text-[10px] font-mono font-medium text-zinc-400">{row.d}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 rounded-xl border text-[11px] leading-relaxed bg-[#D4A55A]/5 border-[#D4A55A]/20 text-[#E6BF76]">
                      <strong>📏 ¿Cómo medir tus superiores?</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li><strong>Ancho (Sisa):</strong> Mide horizontalmente de costura a costura, justo debajo de cada axila.</li>
                        <li><strong>Largo:</strong> Mide verticalmente en la espalda, desde el borde superior del cuello hasta el bajo de la prenda.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 2. INFERIOR CHART TAB */}
                {activeChartTab === "inferior" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <p className={`text-xs leading-relaxed ${isThemeDark ? "text-zinc-300" : "text-zinc-650"}`}>
                      Perfecto para Joggings, Pantalones deportivos, Calzas, Shorts y Bermudas. Utiliza la tabla de correspondencia de talle numérico para Uruguay.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-zinc-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={isThemeDark ? "bg-[#14121a] text-zinc-300" : "bg-slate-50 text-zinc-600"}>
                            <th className="p-3 font-semibold">Talle</th>
                            <th className="p-3 font-semibold">Equiv. Numérica</th>
                            <th className="p-3 font-semibold">Cintura (cm)</th>
                            <th className="p-3 font-semibold">Largo total (cm)</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isThemeDark ? "divide-zinc-800" : "divide-slate-100"}`}>
                          {[
                            { t: "S", w: "36 - 38", c: "70 - 78", h: "98 - 100" },
                            { t: "M", w: "40 - 42", c: "78 - 86", h: "101 - 103" },
                            { t: "L", w: "44 - 46", c: "86 - 94", h: "104 - 105" },
                            { t: "XL", w: "48 - 50", c: "94 - 102", h: "106 - 108" },
                            { t: "XXL", w: "52 - 54", c: "102 - 110", h: "109 - 111" }
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-[#D4A55A]/5 even:bg-[#050B1A]/40">
                              <td className="p-3 font-bold text-[#E6BF76]">{row.t}</td>
                              <td className="p-3 font-semibold">{row.w}</td>
                              <td className="p-3">{row.c} cm</td>
                              <td className="p-3">{row.h} cm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 rounded-xl border text-[11px] leading-relaxed bg-[#D4A55A]/5 border-[#D4A55A]/20 text-[#E6BF76]">
                      <strong>👖 ¿Cómo medir pantalones u inferiores?</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li><strong>Cintura:</strong> Mide el contorno de tu cintura natural o de forma directa el extremo del elástico sin estirar excesivamente.</li>
                        <li><strong>Largo:</strong> Desde la pretina hasta el dobladillo inferior a lo largo del lateral de la pierna.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 3. CALZADO CHART TAB */}
                {activeChartTab === "calzado" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <p className={`text-xs leading-relaxed ${isThemeDark ? "text-zinc-300" : "text-zinc-650"}`}>
                      Sincronización oficial de talles de calzado. <strong>Atención:</strong> En Uruguay solemos guiarnos por el talle europeo (EU) o la medida en centímetros de plantilla.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-zinc-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={isThemeDark ? "bg-[#14121a] text-zinc-300" : "bg-slate-50 text-zinc-600"}>
                            <th className="p-3 font-semibold">Talle UY</th>
                            <th className="p-3 font-semibold">Talle EU</th>
                            <th className="p-3 font-semibold">Talle US (M)</th>
                            <th className="p-3 font-semibold">Largo Plantilla</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isThemeDark ? "divide-zinc-800" : "divide-slate-100"}`}>
                          {[
                            { uy: "35", eu: "36", us: "4.5", cm: "22.5 cm" },
                            { uy: "36", eu: "37", us: "5.5", cm: "23.5 cm" },
                            { uy: "37", eu: "38", us: "6.0", cm: "24.0 cm" },
                            { uy: "38", eu: "39", us: "7.0", cm: "24.5 cm" },
                            { uy: "39", eu: "40", us: "8.0", cm: "25.5 cm" },
                            { uy: "40", eu: "41", us: "8.5", cm: "26.0 cm" },
                            { uy: "41", eu: "42", us: "9.5", cm: "27.0 cm" },
                            { uy: "42", eu: "43", us: "10.0", cm: "27.5 cm" },
                            { uy: "43", eu: "44", us: "11.0", cm: "28.5 cm" }
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-[#D4A55A]/5 even:bg-[#050B1A]/40">
                              <td className="p-3 font-bold text-[#E6BF76]">{row.uy} UY</td>
                              <td className="p-3 font-semibold">{row.eu} EU</td>
                              <td className="p-3 text-zinc-500">{row.us} US</td>
                              <td className="p-3 font-semibold text-emerald-400">{row.cm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 rounded-xl border text-[11px] leading-relaxed bg-[#D4A55A]/5 border-[#D4A55A]/20 text-[#E6BF76]">
                      <strong>👟 Guía infalible para medir tus pies:</strong>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5">
                        <li>Coloca un papel blanco pegado a la pared en el piso.</li>
                        <li>Colócate de pie con el talón tocando la pared de fondo.</li>
                        <li>Haz una línea en el extremo del dedo más largo.</li>
                        <li>Mide la distancia con una regla y súmale 0.5 cm para mayor comodidad. ¡Ese es tu largo de plantilla perfecto!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* 4. INTERACTIVE RECOMMENDER TAB */}
                {activeChartTab === "recommender" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <p className={`text-xs leading-relaxed ${isThemeDark ? "text-zinc-300" : "text-zinc-650"}`}>
                      {isKidsProduct 
                        ? "Ingresa la estatura del niño o bebé. Nuestro motor estimará el talle recomendado para este producto infantil."
                        : "Ingresa tu estatura y peso aproximado. Nuestro motor inteligente estimará el talle que mejor se ajusta a tu contextura física para prendas superiores de corte clásico."
                      }
                    </p>

                    <div className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-5 items-stretch ${
                      isThemeDark ? "bg-[#14121a]/60 border-zinc-800" : "bg-slate-50 border-slate-100"
                    }`}>
                      <div className="flex-1 space-y-3.5">
                        <div>
                          <label className={`block text-[11px] font-bold tracking-wide uppercase mb-1.5 ${
                            isThemeDark ? "text-zinc-400" : "text-zinc-500"
                          }`}>
                            {isKidsProduct ? "Estatura del Niño (cm)" : "Estatura (cm)"}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={isKidsProduct ? "50" : "100"}
                              max={isKidsProduct ? "170" : "240"}
                              placeholder={isKidsProduct ? "Ej: 110" : "Ej: 175"}
                              value={userHeight}
                              onChange={(e) => setUserHeight(e.target.value)}
                              className={`w-full px-4 py-2 border rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#D4A55A] ${
                                isThemeDark 
                                  ? "bg-zinc-900 border-zinc-700 text-white" 
                                  : "bg-white border-slate-200 text-zinc-900"
                              }`}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">cm</span>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold tracking-wide uppercase mb-1.5 ${
                            isThemeDark ? "text-zinc-400" : "text-zinc-500"
                          }`}>
                            {isKidsProduct ? "Peso del Niño (kg)" : "Peso estimado (kg)"}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={isKidsProduct ? "5" : "30"}
                              max={isKidsProduct ? "80" : "180"}
                              placeholder={isKidsProduct ? "Ej: 18" : "Ej: 74"}
                              value={userWeight}
                              onChange={(e) => setUserWeight(e.target.value)}
                              className={`w-full px-4 py-2 border rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#D4A55A] ${
                                isThemeDark 
                                  ? "bg-zinc-900 border-zinc-700 text-white" 
                                  : "bg-white border-slate-200 text-zinc-900"
                              }`}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">kg</span>
                          </div>
                        </div>
                      </div>

                      {/* Calibrator results block */}
                      <div className={`flex-grow md:max-w-[240px] rounded-2xl p-4 flex flex-col items-center justify-center border text-center transition-all ${
                        recommendedSize 
                          ? "bg-[#D4A55A]/10 border-[#D4A55A]/35 text-[#E6BF76]"
                          : "bg-[#050B1A]/40 border-white/5 text-zinc-400"
                      }`}>
                        {recommendedSize ? (
                          <div className="space-y-2 w-full">
                            <p className="text-[10px] font-bold tracking-wider uppercase opacity-75">Talle Recomendado:</p>
                            <h4 className="text-3xl sm:text-4xl font-extrabold text-[#D4A55A] font-sans tracking-tight">
                              {recommendedSize}
                            </h4>
                            
                            {/* Fast Selection Feature */}
                            {recommenderMatchResult && (
                              <div className="pt-2">
                                {recommenderMatchResult.available ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSize(recommenderMatchResult.size);
                                      setShowSizeChart(false);
                                    }}
                                    className="w-full py-2 px-3 rounded-xl text-[11px] font-extrabold bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                                  >
                                    <span>✅ Aplicar Talle {recommenderMatchResult.size}</span>
                                  </button>
                                ) : (
                                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-300">
                                    ⚠️ El talle {recommenderMatchResult.size} no coincide exactamente con las opciones en stock de esta prenda.
                                  </div>
                                )}
                              </div>
                            )}

                            <p className="text-[9px] italic opacity-80 leading-relaxed pt-1 block">
                              Ref. orientadora guardada en tu navegador.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs font-bold leading-normal max-w-[180px] mx-auto">
                              Introduce {isKidsProduct ? "las medidas del niño" : "tu estatura y peso"} para ver el talle recomendado en tiempo real.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shoe size helper tool */}
                    <div className={`p-5 rounded-2xl border ${
                      isThemeDark ? "bg-[#14121a]/30 border-zinc-800" : "bg-slate-50 border-slate-100"
                    }`}>
                      <label className={`block text-[11px] font-bold tracking-wide uppercase mb-2 ${
                        isThemeDark ? "text-zinc-400" : "text-zinc-500"
                      }`}>
                        👟 Asistente Exprés de Zapatillas / Calzado
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="number"
                          placeholder="Tu talle habitual en Uruguay (Ej: 41)"
                          min="30"
                          max="50"
                          value={userShoeSize}
                          onChange={(e) => setUserShoeSize(e.target.value)}
                          className={`flex-1 px-4 py-2 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#D4A55A] ${
                            isThemeDark 
                              ? "bg-zinc-900 border-zinc-700 text-white" 
                              : "bg-white border-slate-200 text-zinc-900"
                          }`}
                        />
                      </div>
                      
                      {userShoeSize && (() => {
                        const numericShoeVal = parseInt(userShoeSize);
                        if (numericShoeVal > 25 && numericShoeVal < 50) {
                          const calculatedCms = Math.round((numericShoeVal * 0.67 - 1) * 10) / 10;
                          
                          // Check if the shoe size is available in current product's sizes
                          const shoeMatch = sizes.find(s => {
                            const cleanSz = s.trim().toUpperCase().replace("UY", "").trim();
                            return cleanSz === String(numericShoeVal);
                          });

                          return (
                            <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-left animate-fade-in">
                              <p className="text-[11px] font-semibold flex items-center gap-1.5">
                                <span>✨ El largo estimado de plantilla para talle <strong>{numericShoeVal} UY</strong> es de <strong>{calculatedCms} cm</strong>.</span>
                              </p>
                              {shoeMatch ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSize(shoeMatch);
                                    setShowSizeChart(false);
                                  }}
                                  className="mt-2.5 py-1.5 px-3 rounded-lg text-[10px] font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer transition-colors"
                                >
                                  ✅ Seleccionar talle {shoeMatch} para este calzado
                                </button>
                              ) : (
                                <p className="text-[9px] text-zinc-400 mt-1">
                                  El talle {numericShoeVal} no coincide con las opciones de stock de este producto.
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Actions footer inside size chart */}
              <div className="p-4 sm:p-5 border-t flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 border-[#D4A55A]/15 bg-[#050B1A]">
                <p className="text-[10px] leading-snug max-w-sm text-center sm:text-left text-[#F4EAD7]/75">
                  📌 Envíos a Montevideo, Ciudad de la Costa, Salinas, Pinamar, Maldonado y todo el país. Retiros disponibles en la Costa.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSizeChart(false)}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#D4A55A] text-[#050B1A] hover:bg-[#E6BF76] hover:scale-[1.02] transition-all cursor-pointer select-none"
                >
                  Entendido, Volver
                </button>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Sticky Bottom Quick Buy Ribbon for Mobile */}
      {!showSizeChart && !isCartOpen && (
        <div className="md:hidden fixed bottom-[48px] left-0 right-0 bg-[#0B1730]/95 backdrop-blur-md border-t border-[#D4A55A]/15 px-4 py-3 z-[60] flex flex-col gap-2 shadow-2xl select-none">
          {errorMessage && (
            <div className="bg-red-500/15 border border-red-500/35 text-red-400 px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src={optimizeImageUrlForDetail(allImages[0], 120, 65)}
                alt={product.name}
                className="w-10 h-10 rounded-lg object-contain bg-[#050B1A]/40 border border-[#D4A55A]/10 p-0.5 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-[#F4EAD7] truncate">{product.name}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-semibold text-[#E6BF76]">
                    ${Math.round(dynamicPrice)}
                  </span>
                  {(selectedSize || selectedColor) && (
                    <span className="text-[9px] text-[#D4A55A]/80 font-medium font-sans truncate">
                      ({[selectedSize, selectedColor].filter(Boolean).join(" / ")})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {product.consultOnly ? (
              <a
                href={whatsAppConsultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-4 rounded-full text-[10px] font-sans font-extrabold uppercase tracking-widest shrink-0 cursor-pointer border bg-[#25D366] hover:bg-[#20ba59] border-transparent text-white active:scale-95 shadow-md shadow-[#25D366]/10"
              >
                Consultar
              </a>
            ) : (
              <button
                onClick={handleAddToCart}
                className={`py-2 px-4 rounded-full text-[10px] font-sans font-extrabold uppercase tracking-widest shrink-0 cursor-pointer border ${
                  (currentStock > 0 || is3D)
                    ? "bg-[#D4A55A] hover:bg-[#E6BF76] border-transparent text-[#050B1A]"
                    : "bg-transparent border-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                {(currentStock > 0 || is3D) ? "Comprar" : "Sin Stock"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
