import React, { useMemo, useState, useEffect } from "react";
import { Product, SiteSettings, getProductAvailableStock, isGenericSize, isGenericColor } from "../types";
import { ShoppingCart, Eye, Tag, Phone } from "lucide-react";
import ImageWatermark from "./ImageWatermark";
import { optimizeImageUrl, buildImageSrcSet, buildAvifSrcSet, IMAGE_SIZES } from "../utils/imageOptimizer";

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
  onViewProduct: (product: Product) => void;
  settings: SiteSettings;
  layoutMode?: "grid" | "list";
}

export default function ProductCard({
  product,
  onAddToCart,
  onViewProduct,
  settings,
  layoutMode = "grid"
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isNavidad = settings?.activeTheme === "navidad" ||
    (settings?.primaryColor?.toLowerCase() === "#d4af70" && settings?.accentColor?.toLowerCase() === "#285744") ||
    (settings?.primaryColor?.toLowerCase() === "#e11d48");

  const waUrl = useMemo(() => {
    const cleanPhone = (settings?.whatsappNumber || "").replace(/[^0-9]/g, "");
    const text = `¡Hola! Me gustaría consultar por la entrega y disponibilidad de este artículo:
*${product.name}*
Precio: $${Math.round(product.price)}

¡Muchas gracias!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }, [product, settings?.whatsappNumber]);

  const isDiscounted = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = isDiscounted
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const lowStockThreshold = typeof settings?.lowStockThreshold === 'number' ? settings.lowStockThreshold : 5;
  const availableStock = useMemo(() => getProductAvailableStock(product), [product]);

  // Find the cheapest option (either a specific variant or the base product price)
  const cheapestOption = useMemo(() => {
    let price = product.price;
    let imageUrl = product.imageUrl;

    if (product.variants && product.variants.length > 0) {
      const resolvedVariants = product.variants.map((v) => {
        const vPrice = typeof v.price === "number" && v.price > 0
          ? v.price
          : product.price + (v.priceDelta || 0);
        return {
          price: vPrice,
          imageUrl: v.imageUrl || product.imageUrl,
          isGeneric: isGenericColor(v.color) && isGenericSize(v.size)
        };
      });

      const allOptions = [
        { price: product.price, imageUrl: product.imageUrl, isGeneric: false },
        ...resolvedVariants,
      ];

      let minOption = allOptions[0];
      for (let i = 1; i < allOptions.length; i++) {
        if (allOptions[i].price < minOption.price) {
          minOption = allOptions[i];
        }
      }
      price = minOption.price;
      // Only use variant image if variant is cheaper AND has a genuine image; otherwise preserve primary product.imageUrl
      if (minOption.price < product.price && minOption.imageUrl && !minOption.isGeneric) {
        imageUrl = minOption.imageUrl;
      } else {
        imageUrl = product.imageUrl;
      }
    }

    return { price, imageUrl };
  }, [product]);

  const variantsStr = useMemo(() => {
    return (product.variants || []).map(v => `${v.id}-${v.imageUrl}`).join("|");
  }, [product.variants]);

  const imagenesStr = useMemo(() => {
    return (product.imagenes || []).join("|");
  }, [product.imagenes]);

  // List of all unique image URLs for rotation:
  // Shows product.imageUrl and any added gallery photos in product.imagenes.
  // Distinct color variant photos are only included if the product has genuine multiple variants.
  const allImages = useMemo(() => {
    const list: string[] = [];
    
    // Always start with primary image
    if (product.imageUrl && typeof product.imageUrl === "string" && product.imageUrl.trim()) {
      list.push(product.imageUrl.trim());
    }

    // Include explicitly added additional photos from the gallery
    if (Array.isArray(product.imagenes)) {
      product.imagenes.forEach(img => {
        if (img && typeof img === "string" && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }

    // Only include variant images if the product has multiple genuine variants with distinct colors
    const hasMultipleVariants = (product.variants || []).length > 1;
    if (hasMultipleVariants) {
      const distinctVariantImages = (product.variants || [])
        .filter(v => v.imageUrl && !isGenericColor(v.color) && !isGenericSize(v.size))
        .map(v => (v.imageUrl || "").trim())
        .filter(Boolean);

      distinctVariantImages.forEach(img => {
        if (!list.includes(img)) {
          list.push(img);
        }
      });
    }
    
    return list;
  }, [product.imageUrl, imagenesStr, variantsStr]);

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [imageIndex, setImageIndex] = useState<number>(0);

  const validImages = useMemo(() => {
    const filtered = allImages.filter(img => !failedImages.has(img));
    return filtered.length > 0 ? filtered : ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"];
  }, [allImages, failedImages]);

  // When product changes, reset index and failures
  useEffect(() => {
    setImageIndex(0);
    setFailedImages(new Set());
  }, [product.id, product.imageUrl]);

  // Interval timer for automatic image rotation (constantly active, faster on hover)
  const validImagesStr = useMemo(() => validImages.join("|"), [validImages]);

  useEffect(() => {
    const imagesCount = validImages.length;
    if (imagesCount <= 1) {
      setImageIndex(0);
      return;
    }

    // Rotate faster (2.2s) when hovered, otherwise at a normal automatic speed (5.0s)
    const speed = isHovered ? 2200 : 5000;

    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % imagesCount);
    }, speed);

    return () => clearInterval(interval);
  }, [validImagesStr, isHovered]);

  const activeIndex = imageIndex >= validImages.length ? 0 : imageIndex;
  const currentImage = validImages[activeIndex];

  const handleImageError = () => {
    const failedImg = currentImage;
    setFailedImages(prev => {
      const next = new Set(prev);
      next.add(failedImg);
      return next;
    });
  };

  const getPriceDisplay = () => {
    return `$${Math.round(cheapestOption.price)}`;
  };

  const hasVariants = Boolean(
    (product.variants && product.variants.length > 0) ||
    (product.sizes && product.sizes.length > 0) ||
    (product.colors && product.colors.length > 0)
  );

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      className={`group relative flex ${
        layoutMode === "list" 
          ? "flex-row h-[132px] sm:flex-col sm:h-full" 
          : "flex-col h-full"
      } rounded-2xl overflow-hidden ${
        isNavidad
          ? "bg-[#FFFFFF] border border-[#E9D5A6]/45 hover:border-[#D4AF70] shadow-[0_4px_20px_rgba(40,87,68,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(212,175,112,0.18)]"
          : "bg-[#0B1730] border border-[#D4A55A]/15 hover:border-[#D4A55A]/40 hover:shadow-2xl hover:shadow-[#D4A55A]/5"
      } transition-all duration-300`}
    >
      {/* Aspect Ratio container for Portrait Product Image - Larger visual presence */}
      <div 
        onClick={() => onViewProduct(product)}
        className={`relative ${
          layoutMode === "list" 
            ? "w-[110px] shrink-0 border-r border-[#D4A55A]/15 sm:w-auto sm:shrink sm:border-r-0 aspect-[3/4]" 
            : "aspect-[3/4]"
        } overflow-hidden ${
          isNavidad
            ? "bg-gradient-to-b from-[#FAF9F5] via-[#FFFFFF] to-[#FAF9F5]"
            : "bg-gradient-to-br from-[#050B1A]/80 via-[#0B1730]/40 to-[#050B1A]/75"
        } cursor-pointer flex items-center justify-center p-1 sm:p-1.5`}
      >
        <div
          key={currentImage || "default"}
          className="absolute inset-0 w-full h-full transition-opacity duration-200 ease-out"
        >
          <picture className="w-full h-full block">
            {buildAvifSrcSet(currentImage, [160, 200, 260, 310, 400]) && (
              <source
                type="image/avif"
                srcSet={buildAvifSrcSet(currentImage, [160, 200, 260, 310, 400])}
                sizes={layoutMode === "list" ? IMAGE_SIZES.list : IMAGE_SIZES.catalog}
              />
            )}
            <img
              src={optimizeImageUrl(currentImage, 310, "auto:eco")}
              srcSet={buildImageSrcSet(currentImage, [160, 200, 260, 310, 400])}
              sizes={layoutMode === "list" ? IMAGE_SIZES.list : IMAGE_SIZES.catalog}
              alt={product.name}
              width="305"
              height="305"
              decoding="async"
              className="w-full h-full object-contain p-1 sm:p-1.5 transition-transform duration-700 ease-out group-hover:scale-106"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={handleImageError}
            />
          </picture>
        </div>

        {/* Anti-download Watermark & Shield */}
        {settings?.enableImageWatermark !== false && (
          <ImageWatermark 
            text={settings?.watermarkText || "JUEM MVD"} 
            variant="card" 
          />
        )}

        {/* Promo Badge */}
        {isDiscounted && (
          <div className={`absolute top-2 left-2 ${isNavidad ? "bg-[#9E4148]" : "bg-red-500"} text-white font-sans text-[7.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10 flex items-center gap-0.5 sm:gap-1`}>
            <Tag className="h-2 w-2 sm:h-3 sm:w-3" />
            <span>-{discountPercent}%</span>
          </div>
        )}

        {/* Stock warning */}
        {availableStock <= lowStockThreshold && availableStock > 0 && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-[#050B1A] font-sans text-[8px] sm:text-[9.5px] font-black px-1.5 py-0.5 rounded-full tracking-wider shadow-lg z-30 uppercase pointer-events-none border border-black/10">
            {availableStock === 1 ? "¡Última!" : "¡Últimas!"}
          </div>
        )}

        {availableStock === 0 && (
          <div className="absolute inset-0 bg-[#050B1A]/80 flex items-center justify-center z-10">
            <span className={`${isNavidad ? "bg-[#FFFFFF] text-[#9E4148] border-[#9E4148]/30" : "bg-[#0B1730] text-[#E6BF76] border-[#D4A55A]/30"} font-sans font-bold text-[8px] sm:text-xs uppercase tracking-wider sm:tracking-widest px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border`}>
              Agotado
            </span>
          </div>
        )}

        {/* Quick action buttons on hover over image */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-20">
          <button
            onClick={() => onViewProduct(product)}
            className="flex items-center justify-center bg-[#F4EAD7] text-[#050B1A] hover:bg-white rounded-full h-8 w-8 sm:h-9 sm:w-9 hover:scale-110 active:scale-95 transition duration-200"
            title="Ver Detalles"
          >
            <Eye className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div 
        onClick={() => onViewProduct(product)}
        className={`flex flex-col flex-1 p-3 sm:p-4 ${isNavidad ? "bg-[#FFFFFF]" : "bg-[#0B1730]"} min-w-0 cursor-pointer ${layoutMode === "list" ? "justify-between" : ""}`}
      >
        <div>
          {/* Product Title */}
          <div 
            className="relative mt-0.5 sm:mt-1 flex flex-col justify-start w-full min-w-0"
          >
            <h3 
              onClick={(e) => {
                e.stopPropagation();
                onViewProduct(product);
              }}
              className={`text-[11px] sm:text-sm font-semibold tracking-wide leading-snug transition-colors cursor-pointer select-none block w-full line-clamp-2 ${isNavidad ? "text-[#1E1D1B] group-hover:text-[#285744]" : "text-[#F4EAD7] group-hover:text-[#E6BF76]"}`}
              title={product.name}
            >
              {product.name}
            </h3>
          </div>

          {/* Pricing info directly below - no description block to assure uniform card columns */}
          {layoutMode !== "list" && (
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 sm:mt-2">
              <span className={`text-xs sm:text-base font-bold ${isNavidad ? "text-[#285744]" : "text-[#E6BF76]"}`}>
                {getPriceDisplay()}
              </span>
              {isDiscounted && (
                <span className={`text-[9px] sm:text-xs line-through ${isNavidad ? "text-[#55534F]" : "text-slate-400"}`}>
                  ${Math.round(product.originalPrice!)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Highlighted Buy Button / Details Strip at base */}
        {layoutMode === "list" ? (
          <div className={`flex items-center justify-between gap-1.5 mt-auto pt-1.5 border-t ${isNavidad ? "border-[#E9D5A6]/40" : "border-[#D4A55A]/10"}`}>
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className={`text-xs sm:text-base font-black ${isNavidad ? "text-[#285744]" : "text-[#E6BF76]"}`}>
                  {getPriceDisplay()}
                </span>
                {isDiscounted && (
                  <span className={`text-[8.5px] sm:text-xs line-through whitespace-nowrap ${isNavidad ? "text-[#55534F]" : "text-slate-400"}`}>
                    ${Math.round(product.originalPrice!)}
                  </span>
                )}
              </div>
            </div>

             {product.consultOnly ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="py-1 px-2.5 sm:py-2 sm:px-4 rounded-full text-[8.5px] sm:text-[10px] font-sans font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer border shrink-0 bg-[#25D366] hover:bg-[#20ba59] border-transparent text-white hover:scale-105 active:scale-95 shadow-md shadow-[#25D366]/10"
              >
                <Phone className="h-2.5 w-2.5" />
                <span>Consultar</span>
              </a>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.stock > 0 && !hasVariants) {
                    onAddToCart(product);
                  } else {
                    onViewProduct(product);
                  }
                }}
                className={`py-1 px-2.5 sm:py-2 sm:px-4 rounded-full text-[8.5px] sm:text-[10px] font-sans font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer border shrink-0 ${
                  product.stock > 0
                    ? isNavidad
                      ? "bg-[#D4AF70] hover:bg-[#E9D5A6] border-transparent text-[#1E1D1B] hover:scale-105 active:scale-95 shadow-md shadow-[#D4AF70]/20 font-bold"
                      : "bg-[#D4A55A] hover:bg-[#E6BF76] border-transparent text-[#050B1A] hover:scale-105 active:scale-95 shadow-md shadow-[#D4A55A]/10 font-bold"
                    : isNavidad
                      ? "bg-transparent border-[#E9D5A6] text-[#55534F] cursor-pointer"
                      : "bg-transparent border-slate-700 text-[#D4A55A]/80 cursor-pointer"
                }`}
              >
                <ShoppingCart className="h-2.5 w-2.5" />
                <span>{product.stock > 0 ? (hasVariants ? "Ver opciones" : "Comprar") : "Detalles"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 sm:mt-4 pt-1 sm:pt-1.5">
            {product.consultOnly ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full py-1.5 sm:py-2.5 px-2.5 sm:px-3 rounded-full text-[8.5px] sm:text-[10px] font-sans font-bold uppercase tracking-wider sm:tracking-widest transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border bg-[#25D366] hover:bg-[#20ba59] border-transparent text-white hover:scale-[1.02] active:scale-98 shadow-md shadow-[#25D366]/10 overflow-hidden"
              >
                <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="whitespace-nowrap truncate">Consultar entrega</span>
              </a>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.stock > 0 && !hasVariants) {
                    onAddToCart(product);
                  } else {
                    onViewProduct(product);
                  }
                }}
                className={`w-full py-1.5 sm:py-2.5 px-2.5 sm:px-3 rounded-full text-[8.5px] sm:text-[10px] font-sans font-bold uppercase tracking-wider sm:tracking-widest transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border ${
                  product.stock > 0
                    ? isNavidad
                      ? "bg-[#D4AF70] hover:bg-[#E9D5A6] border-transparent text-[#1E1D1B] hover:scale-[1.02] active:scale-98 shadow-md shadow-[#D4AF70]/20 font-bold"
                      : "bg-[#D4A55A] hover:bg-[#E6BF76] border-transparent text-[#050B1A] hover:scale-[1.02] active:scale-98 shadow-md shadow-[#D4A55A]/10"
                    : isNavidad
                      ? "bg-transparent border-[#E9D5A6] text-[#55534F] cursor-not-allowed"
                      : "bg-transparent border-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>{product.stock > 0 ? (hasVariants ? "Ver opciones" : "Comprar") : "Sin Stock"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
