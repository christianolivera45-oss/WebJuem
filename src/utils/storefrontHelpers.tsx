import { lazy, Suspense } from "react";
import {
  Grid,
  Shirt,
  Smartphone,
  Sparkles,
  Home,
  Laptop,
  Gift,
  Smile,
  Box
} from "lucide-react";
import { Product, SiteSettings } from "../types";

const ExtraCategoryIcon = lazy(() => import("../components/ExtraCategoryIcons"));

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
  if (cat === "laptop" || cat === "pc") return <Laptop className="h-5 w-5" />;
  if (cat === "gift" || cat === "regalos" || cat === "regalo") return <Gift className="h-5 w-5" />;
  if (cat === "smile" || cat === "juguetes" || cat === "ninos") return <Smile className="h-5 w-5" />;
  if (cat === "box" || cat === "paquete") return <Box className="h-5 w-5" />;

  if (cat.includes("ropa") || cat.includes("vest") || cat.includes("moda") || cat.includes("prend") || cat.includes("remera") || cat.includes("abrigo") || cat.includes("buzo") || cat.includes("jean") || cat.includes("panta") || cat.includes("shirt")) {
    return <Shirt className="h-5 w-5" />;
  }
  if (cat.includes("electron") || cat.includes("tecno") || cat.includes("celular") || cat.includes("notebook") || cat.includes("comput") || cat.includes("smart") || cat.includes("tablet") || cat.includes("audio") || cat.includes("parlante") || cat.includes("chip") || cat.includes("laptop") || cat.includes("phone")) {
    return <Laptop className="h-5 w-5" />;
  }
  if (cat.includes("hogar") || cat.includes("casa") || cat.includes("mueble") || cat.includes("decor") || cat.includes("jardin") || cat.includes("sofa")) {
    return <Home className="h-5 w-5" />;
  }
  if (cat.includes("regal") || cat.includes("gift") || cat.includes("juguet") || cat.includes("peluch") || cat.includes("smile") || cat.includes("nino")) {
    return <Gift className="h-5 w-5" />;
  }

  return (
    <Suspense fallback={<Box className="h-5 w-5" />}>
      <ExtraCategoryIcon name={categoryOrIcon} />
    </Suspense>
  );
};

export const getCategoryDisplayName = (cat: string) => {
  if (cat === "Artículos electrónicos") return "Electrónica";
  return cat;
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
