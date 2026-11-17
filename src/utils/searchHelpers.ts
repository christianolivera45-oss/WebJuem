import { Product, Category, Subcategory } from "../types";

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
