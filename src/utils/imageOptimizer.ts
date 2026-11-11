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
  width: number = 400,
  quality: "auto" | number = "auto",
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

    const transformSegments = [
      `w_${width}`,
      `c_${crop}`,
      `q_${quality === "auto" ? "auto:good" : quality}`,
      "f_auto",
      "fl_lossy" // Forces lossy modern encoding (AVIF/WebP) even on PNG sources for maximum byte savings
    ].join(",");

    // Check if the first segment is already a transformation string
    const firstSegment = segments[0] || "";
    const isExistingTransform = 
      /^(w_|h_|c_|q_|f_|e_|b_|dpr_|ar_|fl_|co_|r_)/.test(firstSegment) &&
      !firstSegment.startsWith("v") &&
      segments.length > 1;

    if (isExistingTransform) {
      // Replace existing transformation segment with our optimized one
      return `${prefix}${transformSegments}/${segments.slice(1).join("/")}`;
    }

    // Insert new transformation segment before version/public_id
    return `${prefix}${transformSegments}/${rest}`;
  }

  // Unsplash Optimization
  if (trimmed.includes("unsplash.com")) {
    let clean = trimmed
      .replace("auto=format", "fm=webp")
      .replace(/[&?]w=\d+/g, "")
      .replace(/[&?]q=\d+/g, "");
    const q = quality === "auto" ? 70 : quality;
    const separator = clean.includes("?") ? "&" : "?";
    return `${clean}${separator}w=${width}&q=${q}`;
  }

  return trimmed;
}

/**
 * Generates an HTML5 responsive srcset string for adaptable image loading
 */
export function buildImageSrcSet(
  url: string | undefined | null,
  widths: number[] = [180, 320, 480, 640]
): string {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  
  // Don't build srcset for data URIs or blobs
  if (url.startsWith("data:") || url.startsWith("blob:")) return "";

  return widths
    .map((w) => `${optimizeImageUrl(url, w)} ${w}w`)
    .join(", ");
}

/**
 * Preset sizes attribute strings for responsive layouts
 * Eliminates PageSpeed Insights "Properly size images" warnings
 */
export const IMAGE_SIZES = {
  // Catalog Card: 2 cols on mobile with container padding (calc(50vw - 20px)), 3 cols on tablet, max ~305px on desktop
  catalog: "(max-width: 640px) calc(50vw - 20px), (max-width: 1024px) 33vw, 305px",
  // Catalog List Mode: fixed small thumbnail on mobile
  list: "(max-width: 640px) 110px, (max-width: 1024px) 25vw, 250px",
  // Detail Modal Main Image: ~90vw on mobile, ~600px on desktop
  detail: "(max-width: 768px) 92vw, (max-width: 1200px) 50vw, 650px",
  // Small Thumbnails (cart, gallery thumbs, quotes): fixed 60-120px
  thumbnail: "100px",
  // Hero Banner: container max 1280px with padding
  hero: "(max-width: 768px) 100vw, (max-width: 1280px) 96vw, 1240px"
};
