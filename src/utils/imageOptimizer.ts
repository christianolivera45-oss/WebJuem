/**
 * High-Performance Image Optimization Utilities for Juem Mvd
 * Handles Cloudinary dynamic transformations (AVIF + WebP fallback),
 * internal /api/inline-media sharp resizing + AVIF/WebP delivery,
 * Unsplash optimization, and responsive srcSet generation.
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
 * - For Cloudinary: injects w_<width>,c_<crop>,q_<quality>,f_<avif|webp>
 * - For /api/inline-media/: appends ?w=<width>&fmt=<avif|webp>
 * - For Unsplash: injects w=<width>&q=<quality>&fm=webp
 */
export function optimizeImageUrl(
  url: string | undefined | null,
  width: number = 310,
  quality: "auto" | "auto:eco" | "auto:good" | "auto:low" | number | string = "auto:eco",
  crop: "limit" | "fill" | "fit" | "scale" | "thumb" = "limit",
  format: "auto" | "webp" | "avif" = "auto"
): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return DEFAULT_FALLBACK_IMAGE;
  }

  const trimmed = url.trim();

  // Internal Inline-Media Dynamic Sharp Resizing & Modern Encoding
  if (trimmed.startsWith("/api/inline-media/")) {
    const basePath = trimmed.split("?")[0];
    const fmt = format === "avif" ? "avif" : "webp";
    return `${basePath}?w=${width}&fmt=${fmt}`;
  }

  // Cloudinary Dynamic Transformations
  if (trimmed.includes("cloudinary.com")) {
    const uploadIdx = trimmed.indexOf("/upload/");
    if (uploadIdx === -1) return trimmed;

    const prefix = trimmed.substring(0, uploadIdx + "/upload/".length);
    const rest = trimmed.substring(uploadIdx + "/upload/".length);
    const segments = rest.split("/");

    // Check if the first segment is already a transformation string
    const firstSegment = segments[0] || "";
    const isExistingTransform =
      /^(w_|h_|c_|q_|f_|e_|b_|dpr_|ar_|fl_|co_|r_)/.test(firstSegment) &&
      !firstSegment.startsWith("v") &&
      segments.length > 1;

    const cleanRest = isExistingTransform ? segments.slice(1).join("/") : rest;

    if (format === "avif") {
      // Explicit AVIF saves 35-52% vs Cloudinary f_auto WebP fallback on product and hero assets
      const avifQuality =
        typeof quality === "number"
          ? String(quality)
          : quality === "auto:low"
          ? "45"
          : quality === "auto:eco"
          ? "58"
          : "64";

      const transformSegments = [
        `w_${width}`,
        `c_${crop}`,
        `q_${avifQuality}`,
        "f_avif"
      ].join(",");

      const cleanPublicPath = cleanRest.replace(/\.(png|jpg|jpeg|webp|avif)$/i, "");
      return `${prefix}${transformSegments}/${cleanPublicPath}`;
    }

    const webpQuality =
      typeof quality === "number"
        ? String(quality)
        : quality === "auto:low"
        ? "50"
        : quality === "auto:eco"
        ? "62"
        : "auto:good";

    const transformSegments = [
      `w_${width}`,
      `c_${crop}`,
      `q_${webpQuality}`,
      "f_webp",
      "fl_lossy"
    ].join(",");

    let finalUrl = `${prefix}${transformSegments}/${cleanRest}`;
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

function supportsDynamicSrcSet(url: string): boolean {
  return (
    url.includes("cloudinary.com") ||
    url.includes("unsplash.com") ||
    url.startsWith("/api/inline-media/")
  );
}

/**
 * Generates an HTML5 responsive srcset string for adaptable WebP/fallback image loading.
 */
export function buildImageSrcSet(
  url: string | undefined | null,
  widths: number[] = [160, 200, 260, 310, 400],
  quality: "auto" | "auto:eco" | "auto:good" | "auto:low" | number | string = "auto:eco"
): string {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || !supportsDynamicSrcSet(url)) {
    return "";
  }

  return widths
    .map((w) => `${optimizeImageUrl(url, w, quality, "limit", "webp")} ${w}w`)
    .join(", ");
}

/**
 * Generates an AVIF <source srcSet> string for <picture> elements.
 * Supports Cloudinary and internal /api/inline-media/ assets (~35-52% smaller than WebP).
 */
export function buildAvifSrcSet(
  url: string | undefined | null,
  widths: number[] = [160, 200, 260, 310, 400],
  quality: "auto" | "auto:eco" | "auto:good" | "auto:low" | number | string = "auto:eco"
): string {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return "";
  if (!url.includes("cloudinary.com") && !url.startsWith("/api/inline-media/")) {
    return "";
  }

  return widths
    .map((w) => `${optimizeImageUrl(url, w, quality, "limit", "avif")} ${w}w`)
    .join(", ");
}

/**
 * Preset sizes attribute strings for responsive layouts
 */
export const IMAGE_SIZES = {
  // Catalog Card: 2 cols on mobile with container padding, 3 cols on tablet, max 305px on desktop
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
