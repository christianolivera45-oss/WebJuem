/**
 * High-Performance Image Optimization Utilities for Juem Mvd
 * Handles Cloudinary dynamic transformations (w_, c_limit, q_auto, f_auto),
 * Unsplash optimization, responsive srcSet generation, and fallback handling.
 */

export interface OptimizeImageOptions {
  width?: number;
  height?: number;
  quality?: "auto" | "auto:good" | "auto:eco" | "auto:low" | number;
  crop?: "limit" | "fill" | "fit" | "scale" | "thumb";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
}

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80";

/**
 * Optimizes an image URL dynamically:
 * - For Cloudinary: injects w_<width>,c_<crop>,q_<quality>,f_auto transformations
 * - For Unsplash: injects w=<width>&q=<quality>&fm=webp
 * - Preserves other URLs as-is
 */
export function optimizeImageUrl(
  url: string | undefined | null,
  width: number = 310,
  quality: "auto" | "auto:eco" | "auto:good" | "auto:low" | number | string = "auto:eco",
  crop: "limit" | "fill" | "fit" | "scale" | "thumb" = "limit"
): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return DEFAULT_FALLBACK_IMAGE;
  }

  const trimmed = url.trim();

  // Cloudinary Dynamic Transformations
  if (trimmed.includes("cloudinary.com")) {
    const uploadIdx = trimmed.indexOf("/upload/");
    if (uploadIdx === -1) return trimmed;

    const prefix = trimmed.substring(0, uploadIdx + "/upload/".length);
    const rest = trimmed.substring(uploadIdx + "/upload/".length);
    const segments = rest.split("/");

    const qStr = typeof quality === "string" 
      ? (quality.startsWith("auto") ? quality : `auto:${quality}`)
      : String(quality);

    const transformSegments = [
      `w_${width}`,
      `c_${crop}`,
      `q_${qStr}`,
      "f_auto",
      "fl_lossy" // Forces lossy modern encoding (AVIF/WebP) even on PNG sources for maximum byte savings
    ].join(",");

    // Check if the first segment is already a transformation string
    const firstSegment = segments[0] || "";
    const isExistingTransform = 
      /^(w_|h_|c_|q_|f_|e_|b_|dpr_|ar_|fl_|co_|r_)/.test(firstSegment) &&
      !firstSegment.startsWith("v") &&
      segments.length > 1;

    let finalUrl = isExistingTransform
      ? `${prefix}${transformSegments}/${segments.slice(1).join("/")}`
      : `${prefix}${transformSegments}/${rest}`;

    // Force .webp extension on Cloudinary URL to ensure WebP/AVIF delivery over legacy PNG/JPEG
    if (/\.(png|jpg|jpeg)$/i.test(finalUrl)) {
      finalUrl = finalUrl.replace(/\.(png|jpg|jpeg)$/i, ".webp");
    }

    return finalUrl;
  }

  // Unsplash Optimization
  if (trimmed.includes("unsplash.com")) {
    let clean = trimmed
      .replace("auto=format", "fm=webp")
      .replace(/[&?]w=\d+/g, "")
      .replace(/[&?]q=\d+/g, "");
    const q = typeof quality === "number" ? quality : 65;
    const separator = clean.includes("?") ? "&" : "?";
    return `${clean}${separator}w=${width}&q=${q}`;
  }

  return trimmed;
}

/**
 * Generates an HTML5 responsive srcset string for adaptable image loading
 * Granular steps prevent browsers from selecting oversized 480px images for 305px slots
 */
export function buildImageSrcSet(
  url: string | undefined | null,
  widths: number[] = [160, 240, 310, 380, 480]
): string {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  
  // Only build responsive srcset for dynamic image CDNs (Cloudinary, Unsplash)
  if (url.startsWith("data:") || url.startsWith("blob:") || (!url.includes("cloudinary.com") && !url.includes("unsplash.com"))) {
    return "";
  }

  return widths
    .map((w) => `${optimizeImageUrl(url, w, "auto:eco")} ${w}w`)
    .join(", ");
}

/**
 * Preset sizes attribute strings for responsive layouts
 * Eliminates PageSpeed Insights "Properly size images" warnings
 */
export const IMAGE_SIZES = {
  // Catalog Card: 2 cols on mobile with container padding, 3 cols on tablet, exactly max 305px on desktop
  catalog: "(max-width: 480px) calc(50vw - 16px), (max-width: 768px) calc(50vw - 24px), (max-width: 1024px) 30vw, 305px",
  // Catalog List Mode: fixed small thumbnail on mobile
  list: "(max-width: 640px) 110px, (max-width: 1024px) 25vw, 250px",
  // Detail Modal Main Image: ~90vw on mobile, ~600px on desktop
  detail: "(max-width: 768px) 92vw, (max-width: 1200px) 50vw, 650px",
  // Small Thumbnails (cart, gallery thumbs, quotes): fixed 60-120px
  thumbnail: "100px",
  // Hero Banner: container max 1280px with padding
  hero: "(max-width: 768px) 100vw, (max-width: 1280px) 96vw, 1240px"
};
