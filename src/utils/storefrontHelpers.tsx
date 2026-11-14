import React from "react";
import {
  Grid,
  Shirt,
  Smartphone,
  Sparkles,
  Home,
  Watch,
  Percent,
  Laptop,
  Palette,
  Tag,
  Box,
  Coffee,
  Gamepad2,
  Wrench,
  Gift,
  Crown,
  Heart,
  Footprints,
  BookOpen,
  Scissors,
  Gem,
  Flame,
  Lightbulb,
  Smile,
  Printer,
  Music,
  Dumbbell,
  Glasses,
  Baby,
  Wine,
  Tv,
  HardDrive,
  Headphones,
  Sofa,
  Cpu
} from "lucide-react";
import { Product, SiteSettings, Category, Subcategory } from "../types";

export const normalizeText = (text: string): string => {
  if (!text) return "";
  let norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  norm = norm
    .split(" ")
    .map((word) => (word === "negor" ? "negro" : word))
    .join(" ");

  return norm;
};

export const generateSlug = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const calculateRelevance = (
  product: Product,
  query: string,
  dbCategories?: Category[],
  dbSubcategories?: Subcategory[]
): number => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const normalizedName = normalizeText(product.name);
  const normalizedDesc = normalizeText(product.description || "");

  const mainCat = (dbCategories || []).find((c) => c.id === product.categoria_id);
  const mainCatName = mainCat ? normalizeText(mainCat.nombre) : "";
  const fallbackCatName = product.category ? normalizeText(product.category) : "";

  const subCat = (dbSubcategories || []).find((s) => s.id === product.subcategoria_id);
  const subCatName = subCat ? normalizeText(subCat.nombre) : "";

  const topColors = product.colors || [];
  const variantColors = (product.variants || []).map((v) => v.color).filter(Boolean);
  const allColors = Array.from(new Set([...topColors, ...variantColors]));
  const colorsStr = allColors.map(normalizeText).join(" ");

  const topSizes = product.sizes || [];
  const variantSizes = (product.variants || []).map((v) => v.size).filter(Boolean);
  const allSizes = Array.from(new Set([...topSizes, ...variantSizes]));
  const sizesStr = allSizes.map(normalizeText).join(" ");

  const queryTokens = normalizedQuery.split(" ").filter((t) => t.length > 0);
  if (queryTokens.length === 0) return 0;

  let score = 0;

  const collapsedName = normalizedName.replace(/\s+/g, "");
  const collapsedQuery = normalizedQuery.replace(/\s+/g, "");

  if (normalizedName === normalizedQuery) {
    score += 500;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 250;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 150;
  } else if (collapsedQuery.length >= 2) {
    if (collapsedName === collapsedQuery) {
      score += 450;
    } else if (collapsedName.startsWith(collapsedQuery)) {
      score += 200;
    } else if (collapsedName.includes(collapsedQuery)) {
      score += 120;
    }
  }

  queryTokens.forEach((token) => {
    const cleanToken = token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;

    const matchedNameWords = normalizedName.split(" ").some((word) => {
      const cleanWord = word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
      return cleanWord.includes(cleanToken) || cleanToken.includes(cleanWord);
    });

    if (matchedNameWords) {
      score += 80;
    } else if (normalizedName.includes(token)) {
      score += 40;
    }
  });

  if (mainCatName && (mainCatName.includes(normalizedQuery) || normalizedQuery.includes(mainCatName))) {
    score += 100;
  } else if (fallbackCatName && (fallbackCatName.includes(normalizedQuery) || normalizedQuery.includes(fallbackCatName))) {
    score += 60;
  }
  if (subCatName && (subCatName.includes(normalizedQuery) || normalizedQuery.includes(subCatName))) {
    score += 80;
  }

  queryTokens.forEach((token) => {
    if (mainCatName && mainCatName.includes(token)) score += 20;
    if (fallbackCatName && fallbackCatName.includes(token)) score += 10;
    if (subCatName && subCatName.includes(token)) score += 15;
  });

  if (normalizedDesc.includes(normalizedQuery)) {
    score += 50;
  }
  queryTokens.forEach((token) => {
    if (normalizedDesc.includes(token)) {
      score += 10;
    }
  });

  queryTokens.forEach((token) => {
    if (colorsStr.includes(token)) score += 15;
    if (sizesStr.includes(token)) score += 15;
  });

  return score;
};

export const STOREFRONT_DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "JUEM",
  siteSubtitle: "Soportes, Juguetes de Navidad y Tecnología en Uruguay",
  bannerTitle: "Novedades y Ofertas en JUEM",
  bannerSubtitle: "Soportes, juguetes de Navidad, tecnología y más con envíos a todo Uruguay",
  bannerImageUrl: "https://res.cloudinary.com/dwqzjqjwz/image/upload/v1790958982/ventas_juem_cloudinary/vk1hhf4ukjakjowpeta5.webp",
  bannerOpacity: 95,
  bannerHeight: "compact",
  bannerLightLeft: 85,
  bannerLightCenter: 90,
  bannerLightRight: 95,
  featuredSliderSpeed: 2500,
  googleAnalyticsId: "",
  googleTagManagerId: "",
  metaPixelId: "",
  seoDescription: "Tienda online multirrubro en Uruguay. Encontrá soportes para pared y escritorio, juguetes de Navidad, tecnología y más con envíos rápidos a todo el país.",
  seoKeywords: "JUEM, tienda multirrubro Uruguay, soportes celulares pared escritorio, juguetes navidad montevideo, tecnologia accesorios uruguay, buzos manta, envios express",
  facebookUrl: "https://facebook.com",
  instagramUrl: "https://instagram.com",
  whatsappNumber: "59891234567",
  activeTheme: "aurea",
  primaryColor: "#D4A55A",
  accentColor: "#E6BF76",
  themeMode: "dark",
  promotionBannerText: "🚚 ¡Envío GRATIS en compras mayores de $1500!",
  promotionBannerText2: "🎁 ¡Envío GRATIS en compras mayores de $1500 en Montevideo!",
  promotionBannerBgColor: "#060b1a",
  promotionBannerTextColor: "#E6BF76",
  promotionBannerTransition: "slide",
  heroSliderTransition: "slide",
  showPromotionBanner: true,
  enableImageWatermark: true,
  watermarkText: "JUEM MVD",
  lowStockThreshold: 5,
  mercadopagoActive: true,
  mercadopagoMessage: "",
  mercadopagoPublicKey: "",
  mercadopagoAccessToken: "",
  mercadopagoSurchargePercent: 0,
  exchangeRate: 40,
  transferActive: true,
  transferDetails: "",
  cashActive: true,
  cashMessage: "",
  heroSlides: [],
  logoType: "image",
  logoText: "JUEM",
  logoImageUrl: "https://res.cloudinary.com/dwqzjqjwz/image/upload/v1781632379/ventas_juem_cloudinary/vsjhahrwh1thtwiwzbia.png",
  footerCol1Title: "",
  footerCol1Text: "",
  footerCol2Title: "",
  footerCol2Text: "",
  footerCol3Title: "",
  footerCol3Text: "",
  footerCopyright: "Desarrollado con tecnología de punta responsive. Reservados todos los derechos.",
  pickupActive: true,
  pickupMontevideoActive: true,
  pickupPinamarActive: true,
  pickupAddress: "Av. Italia 3824, Parque Batlle, Montevideo, Uruguay",
  pickupHours: "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs.",
  pickupAddressPinamar: "C. 54, 15100 Pinamar, Departamento de Canelones, Uruguay",
  pickupHoursPinamar: "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs.",
  pickupSuccessMessage: "",
  deliveryActive: true,
  deliveryMethods: [],
  invoiceOptionActive: true,
  freeShippingActive: true,
  freeShippingMinAmount: 2000,
  freeShippingRegions: "Pinamar, Salinas, Marindia, Neptunia",
  googleReviewsEnabled: true,
  googleReviewsSource: "custom",
  googleReviewsRating: 4.9,
  googleReviewsTotal: 184,
  googleReviewsCustomList: []
};

export const getCategoryIcon = (categoryOrIcon: string) => {
  const cat = (categoryOrIcon || "").toLowerCase();

  if (cat === "todos" || cat === "grid") return <Grid className="h-5 w-5 animate-pulse" />;
  if (cat === "shirt" || cat === "ropa") return <Shirt className="h-5 w-5" />;
  if (cat === "smartphone" || cat === "celular" || cat === "celulares") return <Smartphone className="h-5 w-5" />;
  if (cat === "sparkles" || cat === "destacado" || cat === "destacados") return <Sparkles className="h-5 w-5" />;
  if (cat === "home" || cat === "hogar") return <Home className="h-5 w-5" />;
  if (cat === "watch" || cat === "relojes") return <Watch className="h-5 w-5" />;
  if (cat === "percent" || cat === "descuentos") return <Percent className="h-5 w-5" />;
  if (cat === "laptop" || cat === "pc") return <Laptop className="h-5 w-5" />;
  if (cat === "palette" || cat === "diseno") return <Palette className="h-5 w-5" />;
  if (cat === "tag" || cat === "promos" || cat === "etiqueta") return <Tag className="h-5 w-5" />;
  if (cat === "box" || cat === "paquete") return <Box className="h-5 w-5" />;
  if (cat === "coffee" || cat === "mate") return <Coffee className="h-5 w-5" />;
  if (cat === "gamepad2" || cat === "gaming") return <Gamepad2 className="h-5 w-5" />;
  if (cat === "wrench" || cat === "herramientas") return <Wrench className="h-5 w-5" />;
  if (cat === "gift" || cat === "regalos" || cat === "regalo") return <Gift className="h-5 w-5" />;
  if (cat === "crown" || cat === "premium") return <Crown className="h-5 w-5" />;
  if (cat === "heart" || cat === "favoritos") return <Heart className="h-5 w-5" />;
  if (cat === "footprints" || cat === "calzado" || cat === "zapatillas" || cat === "zapatos") return <Footprints className="h-5 w-5" />;
  if (cat === "bookopen" || cat === "libreria" || cat === "libros" || cat === "agenda") return <BookOpen className="h-5 w-5" />;
  if (cat === "scissors" || cat === "manualidades" || cat === "costura") return <Scissors className="h-5 w-5" />;
  if (cat === "gem" || cat === "joyas" || cat === "joyeria" || cat === "accesorios") return <Gem className="h-5 w-5" />;
  if (cat === "flame" || cat === "hot" || cat === "tendencia") return <Flame className="h-5 w-5" />;
  if (cat === "lightbulb" || cat === "iluminacion" || cat === "lamparas") return <Lightbulb className="h-5 w-5" />;
  if (cat === "smile" || cat === "juguetes" || cat === "ninos") return <Smile className="h-5 w-5" />;
  if (cat === "printer" || cat === "impresora" || cat === "impresiones") return <Printer className="h-5 w-5" />;
  if (cat === "music" || cat === "musica") return <Music className="h-5 w-5" />;
  if (cat === "dumbbell" || cat === "deportes" || cat === "deporte" || cat === "fitness") return <Dumbbell className="h-5 w-5" />;
  if (cat === "glasses" || cat === "lentes" || cat === "gafas") return <Glasses className="h-5 w-5" />;
  if (cat === "baby" || cat === "bebe" || cat === "bebes") return <Baby className="h-5 w-5" />;
  if (cat === "wine" || cat === "bazar" || cat === "copas" || cat === "vajilla") return <Wine className="h-5 w-5" />;
  if (cat === "tv" || cat === "televisores" || cat === "pantallas") return <Tv className="h-5 w-5" />;
  if (cat === "harddrive" || cat === "discos" || cat === "almacenamiento") return <HardDrive className="h-5 w-5" />;
  if (cat === "headphones" || cat === "auriculares") return <Headphones className="h-5 w-5" />;
  if (cat === "sofa" || cat === "muebles" || cat === "deco" || cat === "decoracion") return <Sofa className="h-5 w-5" />;
  if (cat === "cpu" || cat === "computacion" || cat === "hardware") return <Cpu className="h-5 w-5" />;

  if (cat.includes("impresio") || cat.includes("3d") || cat.includes("filamento") || cat.includes("pla") || cat.includes("llaver")) {
    return <Printer className="h-5 w-5" />;
  }
  if (cat.includes("ropa") || cat.includes("vest") || cat.includes("moda") || cat.includes("prend") || cat.includes("remera") || cat.includes("abrigo") || cat.includes("buzo") || cat.includes("jean") || cat.includes("panta") || cat.includes("shirt")) {
    return <Shirt className="h-5 w-5" />;
  }
  if (cat.includes("calza") || cat.includes("zapat") || cat.includes("bota") || cat.includes("sandalia") || cat.includes("foot")) {
    return <Footprints className="h-5 w-5" />;
  }
  if (cat.includes("electron") || cat.includes("tecno") || cat.includes("celular") || cat.includes("notebook") || cat.includes("comput") || cat.includes("smart") || cat.includes("tablet") || cat.includes("audio") || cat.includes("parlante") || cat.includes("chip") || cat.includes("laptop") || cat.includes("phone")) {
    return <Laptop className="h-5 w-5" />;
  }
  if (cat.includes("hogar") || cat.includes("casa") || cat.includes("mueble") || cat.includes("decor") || cat.includes("jardin") || cat.includes("sofa")) {
    return <Home className="h-5 w-5" />;
  }
  if (cat.includes("bazar") || cat.includes("cocina") || cat.includes("mate") || cat.includes("cafe") || cat.includes("taza") || cat.includes("termo") || cat.includes("vaso") || cat.includes("copa") || cat.includes("vajilla") || cat.includes("wine")) {
    return <Coffee className="h-5 w-5" />;
  }
  if (cat.includes("accesor") || cat.includes("joya") || cat.includes("reloj") || cat.includes("bols") || cat.includes("mochila") || cat.includes("cartera") || cat.includes("watch") || cat.includes("gem")) {
    return <Watch className="h-5 w-5" />;
  }
  if (cat.includes("game") || cat.includes("juego") || cat.includes("consola") || cat.includes("playstation") || cat.includes("xbox") || cat.includes("nintendo")) {
    return <Gamepad2 className="h-5 w-5" />;
  }
  if (cat.includes("regal") || cat.includes("gift") || cat.includes("juguet") || cat.includes("peluch") || cat.includes("smile") || cat.includes("nino")) {
    return <Gift className="h-5 w-5" />;
  }
  if (cat.includes("oferta") || cat.includes("promoc") || cat.includes("descu") || cat.includes("liquid") || cat.includes("sale") || cat.includes("porcent")) {
    return <Percent className="h-5 w-5" />;
  }

  return <Box className="h-5 w-5" />;
};

export const getCategoryDisplayName = (cat: string) => {
  if (cat === "Artículos electrónicos") return "Electrónica";
  return cat;
};

export const SUBCATEGORIES_MAP: Record<string, { id: string; name: string }[]> = {
  "Ropa": [
    { id: "all", name: "Ver todo Ropa" },
    { id: "hombre", name: "Hombre" },
    { id: "mujer", name: "Mujer" },
    { id: "invierno", name: "Invierno" }
  ],
  "Artículos electrónicos": [
    { id: "all", name: "Ver todo Electrónica" },
    { id: "celulares", name: "Celulares" },
    { id: "audio", name: "Audio" },
    { id: "pc", name: "PC y accesorios" }
  ],
  "Accesorios": [
    { id: "all", name: "Ver todo Accesorios" },
    { id: "mochilas", name: "Mochilas" },
    { id: "relojes", name: "Relojes" },
    { id: "fundas", name: "Fundas" }
  ],
  "Hogar": [
    { id: "all", name: "Ver todo Hogar" },
    { id: "decoracion", name: "Decoración" },
    { id: "cocina", name: "Cocina" },
    { id: "organizacion", name: "Organización" }
  ]
};

export const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  hombre: ["hombre", "men", "masculino", "camisa hombre", "pantalón hombre", "chaqueta hombre"],
  mujer: ["mujer", "women", "femenino", "vestido", "blusa", "falda", "cartera mujer"],
  invierno: ["invierno", "winter", "abrigo", "jacket", "chaqueta", "bomber", "buzo", "sudadera", "capucha", "suéter", "sueter", "saco", "lana", "guantes", "bufanda"],
  celulares: ["celular", "teléfono", "telefono", "phone", "iphone", "samsung", "cargador", "funda celular", "xiaomi", "motorola"],
  audio: ["audio", "parlante", "audífono", "audifono", "auricular", "headphones", "bluetooth", "sonido", "sonar", "micrófono", "microfono"],
  pc: ["teclado", "mouse", "monitor", "pantalla", "computadora", "pc", "gamer", "usb", "cable", "organizador cables", "disco duro", "memoria", "portatil", "laptop"],
  mochilas: ["mochila", "bolso", "cartera", "morral", "maletín", "viaje", "organizador"],
  relojes: ["reloj", "smartwatch", "reloj inteligente", "cronógrafo", "cronografo", "pulsera watch"],
  fundas: ["funda", "estuche", "case", "protector", "cubierta"],
  decoracion: ["vela", "cuadro", "lámpara", "lampara", "adorno", "plant", "espejo", "alfombra", "deco", "decoración", "decoracion"],
  cocina: ["cocina", "taza", "plato", "vaso", "cubiertos", "artículos cocina", "cafetera", "tetera", "organizador cocina", "ollas", "sarten"],
  organizacion: ["estante", "caja", "reloj pared", "perchero", "organiz", "cajón", "cajon", "almacenamiento", "percheros"]
};

function resolveComponentStock(
  comp: any,
  compProd: Product,
  variantColor?: string,
  variantSize?: string
): { compPin: number; compMvd: number } {
  let compPin = 0;
  let compMvd = 0;

  if (comp.variantId) {
    let matchVar = compProd.variants?.find((v) => String(v.id) === String(comp.variantId));
    if (!matchVar && comp.comboColor) {
      const searchColor = comp.comboColor.toLowerCase().trim();
      matchVar = compProd.variants?.find((v: any) => {
        const vColor = (v.color || "").toLowerCase().trim();
        return (
          vColor === searchColor ||
          vColor.includes(searchColor) ||
          searchColor.includes(vColor) ||
          searchColor.substring(0, 3) === vColor.substring(0, 3)
        );
      });
    }
    if (!matchVar && (variantColor || variantSize)) {
      const targetColor = (variantColor || "").toLowerCase().trim();
      const targetSize = (variantSize || "").toLowerCase().trim();
      if (targetColor || targetSize) {
        matchVar = compProd.variants?.find((v: any) => {
          const vColor = (v.color || "").toLowerCase().trim();
          const vSize = (v.size || "").toLowerCase().trim();
          const colorMatches = !targetColor || vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor);
          const sizeMatches = !targetSize || vSize === targetSize || vSize.includes(targetSize) || targetSize.includes(vSize);
          return colorMatches && sizeMatches;
        });
      }
    }
    if (matchVar) {
      compPin = matchVar.stockPinamar !== undefined ? matchVar.stockPinamar : matchVar.stock || 0;
      compMvd = matchVar.stockMontevideo !== undefined ? matchVar.stockMontevideo : 0;
      return { compPin, compMvd };
    }
  }

  if (compProd.variants && compProd.variants.length > 0) {
    compPin = compProd.variants.reduce((sum, v) => sum + (v.stockPinamar !== undefined ? v.stockPinamar : v.stock || 0), 0);
    compMvd = compProd.variants.reduce((sum, v) => sum + (v.stockMontevideo !== undefined ? v.stockMontevideo : 0), 0);
  } else {
    compPin = compProd.stockPinamar !== undefined ? compProd.stockPinamar : compProd.stock || 0;
    compMvd = compProd.stockMontevideo !== undefined ? compProd.stockMontevideo : 0;
  }

  return { compPin, compMvd };
}

export function getComboDynamicStocks(raw: Product[], comboComponents: any[], productVariants: any[] = []) {
  const matchesVariant = (comp: any, v: any) => {
    const compColor = comp.comboColor;
    const compSize = comp.comboSize;

    if (compColor && v.color && compColor.toLowerCase().trim() !== v.color.toLowerCase().trim()) {
      return false;
    }

    const isCompSizeUnique = !compSize || compSize === "Único" || compSize === "Talla Única" || compSize === "Talle Único";
    const isVarSizeUnique = !v.size || v.size === "Único" || v.size === "Talla Única" || v.size === "Talle Único";

    if (compSize && !isCompSizeUnique) {
      if (isVarSizeUnique || !v.size || compSize.toLowerCase().trim() !== v.size.toLowerCase().trim()) {
        return false;
      }
    }
    return true;
  };

  if (productVariants && productVariants.length > 0) {
    let totalPin = 0;
    let totalMvd = 0;

    const updatedVariants = productVariants.map((v) => {
      let minPin = Infinity;
      let minMvd = Infinity;
      const matchedComps = (comboComponents || []).filter((comp) => matchesVariant(comp, v));

      if (matchedComps.length === 0) {
        minPin = 0;
        minMvd = 0;
      } else {
        for (const comp of matchedComps) {
          const compProd = raw.find((cp) => String(cp.id) === String(comp.productId));
          if (!compProd) {
            minPin = 0;
            minMvd = 0;
            break;
          }
          const { compPin, compMvd } = resolveComponentStock(comp, compProd, v.color, v.size);
          const reqQty = Number(comp.quantity) || 1;
          const pinAvail = Math.floor(compPin / reqQty);
          const mvdAvail = Math.floor(compMvd / reqQty);
          if (pinAvail < minPin) minPin = pinAvail;
          if (mvdAvail < minMvd) minMvd = mvdAvail;
        }
      }

      const pinStock = minPin === Infinity ? 0 : Math.max(0, minPin);
      const mvdStock = minMvd === Infinity ? 0 : Math.max(0, minMvd);

      totalPin += pinStock;
      totalMvd += mvdStock;

      return {
        ...v,
        stockPinamar: pinStock,
        stockMontevideo: mvdStock,
        stock: pinStock + mvdStock,
        stockTotalActual: pinStock + mvdStock
      };
    });

    return {
      stockPinamar: totalPin,
      stockMontevideo: totalMvd,
      stockTotal: totalPin + totalMvd,
      updatedVariants
    };
  }

  let minPin = Infinity;
  let minMvd = Infinity;
  for (const comp of comboComponents || []) {
    const compProd = raw.find((cp) => String(cp.id) === String(comp.productId));
    if (!compProd) {
      minPin = 0;
      minMvd = 0;
      break;
    }
    const { compPin, compMvd } = resolveComponentStock(comp, compProd);
    const reqQty = Number(comp.quantity) || 1;
    const pinAvail = Math.floor(compPin / reqQty);
    const mvdAvail = Math.floor(compMvd / reqQty);
    if (pinAvail < minPin) minPin = pinAvail;
    if (mvdAvail < minMvd) minMvd = mvdAvail;
  }

  const pinStock = minPin === Infinity ? 0 : Math.max(0, minPin);
  const mvdStock = minMvd === Infinity ? 0 : Math.max(0, minMvd);
  return {
    stockPinamar: pinStock,
    stockMontevideo: mvdStock,
    stockTotal: pinStock + mvdStock,
    updatedVariants: []
  };
}

export function recalculateComboStocks(productsList: Product[]): Product[] {
  return productsList.map((prod) => {
    if (!prod.isCombo) return prod;

    const comboComponents = prod.comboComponents || [];
    if (comboComponents.length === 0) {
      return {
        ...prod,
        stockPinamar: 0,
        stockMontevideo: 0,
        stockTotalActual: 0,
        stock: 0,
        variants: (prod.variants || []).map((v) => ({
          ...v,
          stockPinamar: 0,
          stockMontevideo: 0,
          stock: 0,
          stockTotalActual: 0
        }))
      };
    }

    const comboStocks = getComboDynamicStocks(productsList, comboComponents, prod.variants || []);
    return {
      ...prod,
      stockPinamar: comboStocks.stockPinamar,
      stockMontevideo: comboStocks.stockMontevideo,
      stockTotalActual: comboStocks.stockTotal,
      stock: comboStocks.stockTotal,
      variants: comboStocks.updatedVariants.length > 0 ? comboStocks.updatedVariants : prod.variants
    };
  });
}
