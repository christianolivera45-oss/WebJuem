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
import {
  Product,
  SiteSettings,
  CartItem,
  Category,
  Subcategory,
  Coupon
} from "../types";

/**
 * Resolves the individual price of a cart item based on standard base price or variant overrides.
 */
export function getItemPrice(item: CartItem): number {
  if (!item || !item.product) return 0;
  
  const p = item.product;
  if (p.variants && p.variants.length > 0 && item.selectedSize) {
    const exactMatch = item.selectedColor 
      ? p.variants.find(v => v.size === item.selectedSize && v.color === item.selectedColor)
      : null;
    const sizeMatch = p.variants.find(v => v.size === item.selectedSize);
    const match = exactMatch || sizeMatch;
    
    if (match) {
      if (typeof match.price === "number" && match.price > 0) {
        return match.price;
      }
      if (typeof match.priceDelta === "number" && match.priceDelta !== 0) {
        return p.price + match.priceDelta;
      }
    }
  }
  return p.price;
}

/**
 * Calculates the grand subtotal of all items in the cart.
 */
export function calculateSubtotal(cartItems: CartItem[]): number {
  if (!cartItems || cartItems.length === 0) return 0;
  return cartItems.reduce((acc, item) => {
    const unitPrice = getItemPrice(item);
    const qty = Math.max(1, item.quantity || 1);
    return acc + (unitPrice * qty);
  }, 0);
}

/**
 * Validates a coupon code server or client side against active and expiration rules.
 */
export function validateCoupon(
  couponCode: string, 
  coupons?: Coupon[], 
  referenceDate: Date = new Date()
): { success: boolean; discountPercent: number; message: string } {
  if (!couponCode || !couponCode.trim()) {
    return { success: false, discountPercent: 0, message: "Código de cupón vacío." };
  }
  
  if (!coupons || coupons.length === 0) {
    return { success: false, discountPercent: 0, message: "No hay cupones promocionales configurados en el sistema." };
  }
  
  const cleanPromo = couponCode.trim().toUpperCase();
  const matchedCoupon = coupons.find(
    (c) => c.code.toUpperCase() === cleanPromo && c.active !== false
  );

  if (!matchedCoupon) {
    return { success: false, discountPercent: 0, message: "El código ingresado no existe o no es válido actualmente." };
  }

  if (matchedCoupon.expiration_date) {
    const expDate = new Date(matchedCoupon.expiration_date);
    if (expDate <= referenceDate) {
      return { success: false, discountPercent: 0, message: "Este cupón ha expirado." };
    }
  }

  return { 
    success: true, 
    discountPercent: Number(matchedCoupon.discount_percent || 0), 
    message: `¡Cupón verificado! Descuento de ${matchedCoupon.discount_percent}%` 
  };
}

/**
 * Calculates discount amount matching shop round-to-nearest integer convention.
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  if (subtotal <= 0 || discountPercent <= 0) return 0;
  return Math.round((subtotal * discountPercent) / 100);
}

/**
 * Calculations of final total including subtotal, discounts, and shipping cost.
 */
export function calculateTotal(subtotal: number, discountAmount: number, shippingCost: number): number {
  const result = subtotal - (discountAmount || 0) + (shippingCost || 0);
  return Math.max(0, result);
}

/**
 * Sanitizes fields to defend against XSS code injections.
 */
export function sanitizeField(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Form / checkout field validation checker (Email, names, phones).
 */
export function validateFormFields(
  name: string, 
  email: string, 
  phone: string
): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const cleanName = (name || "").trim();
  if (!cleanName) {
    errors.push("El nombre es requerido.");
  } else if (cleanName.length < 3) {
    errors.push("El nombre completo debe tener al menos 3 caracteres.");
  }

  const cleanEmail = (email || "").trim();
  if (!cleanEmail) {
    errors.push("El correo electrónico es requerido.");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      errors.push("El formato del correo electrónico ingresado no es válido.");
    }
  }

  const cleanPhone = (phone || "").trim();
  if (cleanPhone) {
    const cleanDigits = cleanPhone.replace(/\D/g, "");
    if (cleanDigits.length < 6) {
      errors.push("El número de teléfono debe tener al menos 6 dígitos válidos.");
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Stock availability check and allocation deduction simulator.
 */
export function simulateStockAllocation(
  requestedQty: number,
  availableStock: number
): { success: boolean; allocatedQty: number; remainingStock: number; message: string } {
  if (requestedQty <= 0) {
    return { success: false, allocatedQty: 0, remainingStock: availableStock, message: "La cantidad solicitada debe ser de al menos 1 unidad." };
  }

  if (availableStock <= 0) {
    return { success: false, allocatedQty: 0, remainingStock: 0, message: "Sin stock disponible." };
  }

  if (requestedQty > availableStock) {
    return { 
      success: false, 
      allocatedQty: availableStock, 
      remainingStock: 0, 
      message: `Solo hay ${availableStock} unidades disponibles en stock.` 
    };
  }

  return {
    success: true,
    allocatedQty: requestedQty,
    remainingStock: availableStock - requestedQty,
    message: "Reserva de stock procesada con éxito."
  };
}

// --- EXTRACTED FROM APP.TSX ---

export const normalizeText = (text: string): string => {
  if (!text) return "";
  let norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, " ")     // replace non-alphanumeric with space
    .replace(/\s+/g, " ")            // collapse multi-spaces
    .trim();

  // Handle common typo or equivalence: 'negor' to 'negro'
  norm = norm.split(" ").map(word => {
    if (word === "negor") return "negro";
    return word;
  }).join(" ");

  return norm;
};

export const generateSlug = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")    // remove special characters
    .trim()
    .replace(/\s+/g, "-")            // space to dash
    .replace(/-+/g, "-");            // collapse multiple dashes
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
  
  // Resolve product category name
  const mainCat = (dbCategories || []).find(c => c.id === product.categoria_id);
  const mainCatName = mainCat ? normalizeText(mainCat.nombre) : "";
  const fallbackCatName = product.category ? normalizeText(product.category) : "";
  
  // Resolve subcategory name
  const subCat = (dbSubcategories || []).find(s => s.id === product.subcategoria_id);
  const subCatName = subCat ? normalizeText(subCat.nombre) : "";

  // Normalize colors and sizes to act as tags, including from variants to handle dynamic product options
  const topColors = product.colors || [];
  const variantColors = (product.variants || []).map(v => v.color).filter(Boolean);
  const allColors = Array.from(new Set([...topColors, ...variantColors]));
  const colorsStr = allColors.map(normalizeText).join(" ");

  const topSizes = product.sizes || [];
  const variantSizes = (product.variants || []).map(v => v.size).filter(Boolean);
  const allSizes = Array.from(new Set([...topSizes, ...variantSizes]));
  const sizesStr = allSizes.map(normalizeText).join(" ");

  const queryTokens = normalizedQuery.split(" ").filter(t => t.length > 0);
  if (queryTokens.length === 0) return 0;

  let score = 0;

  // Collapsed space-free comparison for code-like product names (e.g., "J-010" or "J 010" matching "J010")
  const collapsedName = normalizedName.replace(/\s+/g, "");
  const collapsedQuery = normalizedQuery.replace(/\s+/g, "");

  // 1. Exact Name match or name starts with query
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

  // 2. Word tokens match in Name
  queryTokens.forEach(token => {
    const cleanToken = token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;
    
    const matchedNameWords = normalizedName.split(" ").some(word => {
      const cleanWord = word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
      return cleanWord.includes(cleanToken) || cleanToken.includes(cleanWord);
    });

    if (matchedNameWords) {
      score += 80;
    } else if (normalizedName.includes(token)) {
      score += 40;
    }
  });

  // 3. Category & Subcategory match
  if (mainCatName && (mainCatName.includes(normalizedQuery) || normalizedQuery.includes(mainCatName))) {
    score += 100;
  } else if (fallbackCatName && (fallbackCatName.includes(normalizedQuery) || normalizedQuery.includes(fallbackCatName))) {
    score += 60;
  }
  if (subCatName && (subCatName.includes(normalizedQuery) || normalizedQuery.includes(subCatName))) {
    score += 80;
  }

  queryTokens.forEach(token => {
    if (mainCatName && mainCatName.includes(token)) score += 20;
    if (fallbackCatName && fallbackCatName.includes(token)) score += 10;
    if (subCatName && subCatName.includes(token)) score += 15;
  });

  // 4. Description match
  if (normalizedDesc.includes(normalizedQuery)) {
    score += 50;
  }
  queryTokens.forEach(token => {
    if (normalizedDesc.includes(token)) {
      score += 10;
    }
  });

  // 5. Colors and Sizes matches (as tags)
  queryTokens.forEach(token => {
    if (colorsStr.includes(token)) score += 15;
    if (sizesStr.includes(token)) score += 15;
  });

  return score;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Juem Mvd",
  siteSubtitle: "Ropa de Temporada, Abrigos Premium y Accesorios",
  bannerTitle: "Colección Exclusiva de Primavera",
  bannerSubtitle: "Descubre las últimas tendencias con descuentos de hasta el 40%.",
  bannerImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
  bannerOpacity: 80,
  featuredSliderSpeed: 2500,
  googleAnalyticsId: "",
  googleTagManagerId: "",
  metaPixelId: "",
  seoDescription: "Descubrí en Juem Mvd la mejor indumentaria de temporada, abrigos térmicos, accesorios de invierno y proyectos 3D con envíos a todo el país.",
  seoKeywords: "Juem, Juem Mvd, tienda Juem, ropa de invierno, abrigos termicos, buzos manta, gorros, guantes neopreno, accesorios 3D Uruguay, envios express, montevideo, canelones, pinamar",
  facebookUrl: "https://facebook.com",
  instagramUrl: "https://instagram.com",
  whatsappNumber: "5491123456789",
  primaryColor: "#2563eb",
  accentColor: "#10b981",
  themeMode: "dark",
  promotionBannerText: "🚚 ¡15% de DESCUENTO en toda la tienda! Código: BUELO15",
  promotionBannerText2: "🎁 ¡Envío GRATIS en compras mayores de $2000 para Pinamar, Salinas, Marindia, Neptunia! Elige tu de agencia favorita y nosotros lo cubrimos.",
  promotionBannerBgColor: "#4f46e5",
  promotionBannerTextColor: "#ffffff",
  promotionBannerTransition: "slide",
  heroSliderTransition: "slide",
  showPromotionBanner: true,
  lowStockThreshold: 5,
  mercadopagoActive: true,
  mercadopagoMessage: "Paga de manera 100% segura con cuotas sin recargo utilizando tus tarjetas favoritas: OCA, VISA, MasterCard, Lider y Diners, o en redes de cobranza Abitab y Redpagos. Te enviaremos el link de pago seguro al iniciar el chat de WhatsApp.",
  mercadopagoPublicKey: "",
  mercadopagoAccessToken: "",
  mercadopagoSurchargePercent: 0,
  exchangeRate: 40,
  transferActive: true,
  transferDetails: "Numero de cuenta \nMercado Pago : 1004278620163\nRed pagos y abitab\nJoana Baptista : 4.051.645-7",
  cashActive: true,
  cashMessage: "Abona en efectivo al recibir tu pedido (válido para Montevideo y zonas metropolitanas coordinadas). Pagas cómodamente en mano a nuestro repartidor al momento de la entrega.",
  heroSlides: [
    {
      id: "slide-1",
      title: "Colección Exclusiva de Primavera",
      subtitle: "Descubre las últimas tendencias con descuentos de hasta el 40%.",
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "slide-2",
      title: "¡Especial Día del Niño! 🎉",
      subtitle: "Sorprendé a los más chicos con regalos únicos, juguetes divertidos y tecnología gamer.",
      imageUrl: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1600&q=80",
      buttonLink: "category:Personalizados",
      buttonText: "Ver Regalos"
    },
    {
      id: "slide-3",
      title: "Accesorios & Complementos",
      subtitle: "Lentes, mochilas, relojes y detalles que transforman cualquier outfit.",
      imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80"
    }
  ],
  logoType: "text",
  logoText: "J",
  logoImageUrl: "",
  footerCol1Title: "🚀 Compra Personalizada",
  footerCol1Text: "Realiza tus pedidos seleccionando tus talles y colores favoritos. El carrito envía una lista formateada directo a nuestro WhatsApp de atención oficial para coordinar pago y entrega express.",
  footerCol2Title: "📍 Sucursal Montevideo",
  footerCol2Text: "Dirección: Coruña 3038, 12000 Montevideo. Teléfono: 095 085 181. Todos los productos que visualizas pasan por un control estricto de selección y empaque.",
  footerCol3Title: "📞 Soporte Directo",
  footerCol3Text: "¿Habiendo dudas con talles o stock rápido? Pícale al botón de consulta express en la ficha de cada producto y un asesor te responderá inmediatamente en WhatsApp.",
  footerCopyright: "Desarrollado con tecnología de punta responsive. Reservados todos los derechos.",
  pickupActive: true,
  pickupMontevideoActive: true,
  pickupPinamarActive: true,
  pickupAddress: "Av. Italia 3824, Parque Batlle, Montevideo, Uruguay",
  pickupHours: "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs.",
  pickupAddressPinamar: "C. 54, 15100 Pinamar, Departamento de Canelones, Uruguay",
  pickupHoursPinamar: "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs.",
  pickupSuccessMessage: "Listo para retirar el mismo día hábil",
  deliveryActive: true,
  deliveryMethods: [
    {
      id: "express_mvd",
      title: "Envío Express en 3 horas dentro de Montevideo (ver zonas)",
      subtext: "*antes de 16h de L a V",
      iconType: "motorcycle"
    },
    {
      id: "mvd_normal",
      title: "Envío dentro de Montevideo (24 a 48 horas)",
      subtext: null,
      iconType: "truck_orange"
    },
    {
      id: "ues",
      title: "Envío a todo el país por UES",
      subtext: null,
      iconType: "ues"
    },
    {
      id: "dac",
      title: "Envío a todo el país por DAC (Agencia Central)",
      subtext: null,
      iconType: "dac"
    },
    {
      id: "depunta",
      title: "Envío a Maldonado por De Punta",
      subtext: null,
      iconType: "depunta"
    }
  ],
  invoiceOptionActive: true,
  freeShippingActive: true,
  freeShippingMinAmount: 2000,
  freeShippingRegions: "Pinamar, Salinas, Marindia, Neptunia",
  defaultFirstName: "Christian",
  defaultLastName: "Olivera",
  defaultPhone: "095085181",
  googleReviewsEnabled: true,
  googleReviewsSource: "custom",
  googleReviewsRating: 4.9,
  googleReviewsTotal: 184,
  googleReviewsCustomList: [],
  googleClientId: "",
  googleClientSecret: "",
  emailSenderEnabled: true,
  emailSenderProvider: "resend",
  resendApiKey: "",
  mailgunApiKey: "",
  mailgunDomain: "sandbox432ebc5c64c84856bb985204939f0411.mailgun.org",
  mailgunRegion: "us",
  emailSenderSmtpHost: "",
  emailSenderSmtpPort: 465,
  emailSenderSmtpUser: "",
  emailSenderSmtpPass: "",
  emailSenderFromAddress: "Administración Juem <administracion@notificaciones.juem.com.uy>",
  emailTemplateOrderCreatedSubject: "¡Gracias por tu compra! Tu pedido #{{orderId}} ha sido recibido",
  emailTemplateOrderStatusChangedSubject: "Actualización de tu pedido #{{orderId}} - {{statusText}}",
  emailTemplateOrderCreatedBody: "Muchas gracias por realizar tu compra con nosotros. Tu pago ha sido aprobado correctamente y tu pedido ya está siendo preparado para entrega. Aquí tienes los detalles completos de tu compra:",
  emailTemplateOrderStatusChangedBody: "Te notificamos que el estado de tu pedido #{{orderId}} ha sido actualizado por nuestro equipo de logística."
};

export const ICON_LABELS: Record<string, string> = {
  Shirt: "👕 Ropa / Remeras",
  Smartphone: "📱 Celulares",
  Laptop: "💻 Computadoras / Laptops",
  Printer: "🖨️ Impresiones 3D",
  Coffee: "☕ Mate / Bazar",
  Gamepad2: "🎮 Gaming / Consolas",
  Wrench: "🔧 Herramientas",
  Glasses: "👓 Lentes / Gafas",
  Watch: "⌚ Relojes / Smartwatch",
  Tv: "📺 Tecnología / Pantallas",
  Home: "🏠 Hogar / Decoración",
  Sofa: "🛋️ Muebles / Living",
  Gem: "💎 Joyería / Accesorios",
  Gift: "🎁 Regalos",
  Smile: "🧸 Peluches / Juguetes",
  Dumbbell: "🏋️ Deportes / Fit",
  Music: "🎵 Música / Parlantes",
  Sparkles: "✨ Destacados / Novedades",
  Percent: "🏷️ Ofertas / Liquidaciones",
  Palette: "🎨 Diseño / Personalizado",
  BookOpen: "📖 Librería / Libros",
  Compass: "🧭 Aventura",
  Flame: "🔥 Tendencias",
  Heart: "❤️ Favoritos",
  Box: "📦 Otros"
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

  // 1. Impresiones / 3D keyword check
  if (
    cat.includes("impresio") ||
    cat.includes("3d") ||
    cat.includes("filamento") ||
    cat.includes("pla") ||
    cat.includes("llaver")
  ) {
    return <Printer className="h-5 w-5" />;
  }

  // 2. Ropa / Moda / Vestimenta keyword check
  if (
    cat.includes("ropa") ||
    cat.includes("vest") ||
    cat.includes("moda") ||
    cat.includes("prend") ||
    cat.includes("remera") ||
    cat.includes("abrigo") ||
    cat.includes("buzo") ||
    cat.includes("jean") ||
    cat.includes("panta") ||
    cat.includes("shirt")
  ) {
    return <Shirt className="h-5 w-5" />;
  }

  // 3. Calzado / Zapatillas
  if (
    cat.includes("calza") ||
    cat.includes("zapat") ||
    cat.includes("bota") ||
    cat.includes("sandalia") ||
    cat.includes("foot")
  ) {
    return <Footprints className="h-5 w-5" />;
  }

  // 4. Electrónica / Tecnología / Artículos electrónicos keyword check
  if (
    cat.includes("electron") ||
    cat.includes("tecno") ||
    cat.includes("celular") ||
    cat.includes("notebook") ||
    cat.includes("comput") ||
    cat.includes("smart") ||
    cat.includes("tablet") ||
    cat.includes("audio") ||
    cat.includes("parlante") ||
    cat.includes("chip") ||
    cat.includes("laptop") ||
    cat.includes("phone")
  ) {
    return <Laptop className="h-5 w-5" />;
  }

  // 5. Hogar / Decoración / Casa / Sofa keyword check
  if (
    cat.includes("hogar") ||
    cat.includes("casa") ||
    cat.includes("mueble") ||
    cat.includes("decor") ||
    cat.includes("jardin") ||
    cat.includes("sofa")
  ) {
    return <Home className="h-5 w-5" />;
  }

  // 6. Bazar / Mate / Cocina / Copas / Vasos
  if (
    cat.includes("bazar") ||
    cat.includes("cocina") ||
    cat.includes("mate") ||
    cat.includes("cafe") ||
    cat.includes("taza") ||
    cat.includes("termo") ||
    cat.includes("vaso") ||
    cat.includes("copa") ||
    cat.includes("vajilla") ||
    cat.includes("wine")
  ) {
    return <Coffee className="h-5 w-5" />;
  }

  // 7. Accesorios / Relojes / Bolsos keyword check
  if (
    cat.includes("accesor") ||
    cat.includes("joya") ||
    cat.includes("reloj") ||
    cat.includes("bols") ||
    cat.includes("mochila") ||
    cat.includes("cartera") ||
    cat.includes("watch") ||
    cat.includes("gem")
  ) {
    return <Watch className="h-5 w-5" />;
  }

  // 8. Gaming
  if (
    cat.includes("game") ||
    cat.includes("juego") ||
    cat.includes("consola") ||
    cat.includes("playstation") ||
    cat.includes("xbox") ||
    cat.includes("nintendo")
  ) {
    return <Gamepad2 className="h-5 w-5" />;
  }

  // 9. Regalos / Juguetes
  if (
    cat.includes("regal") ||
    cat.includes("gift") ||
    cat.includes("juguet") ||
    cat.includes("peluch") ||
    cat.includes("smile") ||
    cat.includes("nino")
  ) {
    return <Gift className="h-5 w-5" />;
  }

  // 10. Ofertas / Descuentos / Liquidación / Sale keyword check
  if (
    cat.includes("oferta") ||
    cat.includes("promoc") ||
    cat.includes("descu") ||
    cat.includes("liquid") ||
    cat.includes("sale") ||
    cat.includes("porcent")
  ) {
    return <Percent className="h-5 w-5" />;
  }

  // Otros / Caja / Estrellas / Predeterminado
  return <Box className="h-5 w-5" />;
};

// Mapeo amigable de categorías internas para mostrar en UI
export const getCategoryDisplayName = (cat: string) => {
  if (cat === "Artículos electrónicos") return "Electrónica";
  return cat;
};

// Temas y Paletas de Colores Predeterminadas para el eCommerce
export const THEME_PRESETS = [
  {
    name: "Colores Juem 🎨",
    primaryColor: "#D4A55A",
    accentColor: "#E6BF76",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Apex Clásico",
    primaryColor: "#2563eb",
    accentColor: "#10b981",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Moda Veraniega Warm",
    primaryColor: "#ea580c",
    accentColor: "#e11d48",
    themeMode: "light" as "dark" | "light"
  },
  {
    name: "Lujo & Carbono (Gold)",
    primaryColor: "#ca8a04",
    accentColor: "#e11d48",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Nórdico Suave",
    primaryColor: "#64748b",
    accentColor: "#0284c7",
    themeMode: "light" as "dark" | "light"
  },
  {
    name: "Neón Cyberpunk",
    primaryColor: "#d946ef",
    accentColor: "#06b6d4",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Esmeralda Eco",
    primaryColor: "#059669",
    accentColor: "#10b981",
    themeMode: "light" as "dark" | "light"
  },
  {
    name: "Misterio Forestal",
    primaryColor: "#15803d",
    accentColor: "#f59e0b",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Rosa de París",
    primaryColor: "#ec4899",
    accentColor: "#ae2d68",
    themeMode: "light" as "dark" | "light"
  }
];

// Subcategorías predefinidas para no llenar la tienda de categorías vacías
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

// Palabras clave para mapear dinámicamente los productos existentes y nuevos a subcategorías de manera invisible
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

export function getProductSizeChartData(p: Partial<Product>) {
  const sizes = p.sizes || [];
  const defaultCols = ["Talle", "Sisa / Ancho (cm)", "Largo Total (cm)"];
  
  let data = p.sizeChartData;
  if (!data) {
    data = {
      columns: defaultCols,
      rows: []
    };
  }
  
  // Clean column header list to ensure 'Talle' is first
  if (!data.columns || data.columns.length === 0) {
    data.columns = defaultCols;
  }
  if (data.columns[0] !== "Talle") {
    data.columns = ["Talle", ...data.columns.filter(c => c !== "Talle")];
  }
  
  // Align rows with active sizes
  const rows = [...(data.rows || [])];
  
  const mergedRows = sizes.map(sz => {
    const existing = rows.find(r => r["Talle"] === sz);
    if (existing) {
      return existing;
    } else {
      const newRow: Record<string, string> = { "Talle": sz };
      data?.columns.forEach(col => {
        if (col !== "Talle") {
          newRow[col] = "";
        }
      });
      return newRow;
    }
  });
  
  return {
    columns: data.columns,
    rows: mergedRows
  };
}
