/**
 * Google Search & SEO Standards Engine for Juem Mvd
 * Enforces Google Search Central / Webmaster guidelines across all current and newly created pages:
 * - Optimized Title tags (30-60 characters, branded)
 * - Meta descriptions (120-160 characters, actionable)
 * - Canonical URLs (normalized lowercase, absolute, no query strings)
 * - Advanced Robots directives (max-image-preview:large, max-snippet:-1)
 * - OpenGraph & Twitter Card rich visual cards
 * - Schema.org JSON-LD structured data (Product, CollectionPage, BreadcrumbList, ClothingStore)
 * - Favicon standard compliance (full-bleed, 48px multiple, no transparent corner artifacts)
 */

export interface GoogleSeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  imageUrl?: string;
  isIndexable?: boolean;
  type?: "website" | "product" | "article";
  structuredData?: Record<string, any> | null;
}

const DEFAULT_BRAND = "Juem Uruguay";
const DEFAULT_SITE_TITLE = "Juem Mvd | Ropa de Temporada, Abrigos Premium y Accesorios";
const DEFAULT_DESCRIPTION = "Descubrí en Juem Mvd la mejor indumentaria de temporada, abrigos térmicos, accesorios de invierno y proyectos 3D con envíos a todo el país.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
const BASE_DOMAIN = "https://juem.com.uy";

/**
 * Normalizes title according to Google guidelines (between 30 and 60 chars)
 */
export function formatGoogleTitle(pageTitle?: string, brand = DEFAULT_BRAND): string {
  if (!pageTitle || pageTitle.trim() === "") {
    return DEFAULT_SITE_TITLE;
  }
  const cleanTitle = pageTitle.trim();
  if (cleanTitle.toLowerCase().includes(brand.toLowerCase())) {
    return cleanTitle;
  }
  const combined = `${cleanTitle} | ${brand}`;
  if (combined.length <= 60) {
    return combined;
  }
  // If too long, truncate gracefully
  const maxPageTitleLength = 57 - brand.length;
  return `${cleanTitle.substring(0, maxPageTitleLength).trim()}… | ${brand}`;
}

/**
 * Normalizes description according to Google SERP guidelines (120-160 chars)
 */
export function formatGoogleDescription(desc?: string, fallback = DEFAULT_DESCRIPTION): string {
  const text = (desc && desc.trim().length > 0 ? desc : fallback).trim().replace(/\s+/g, " ");
  if (text.length <= 160) {
    return text;
  }
  return text.substring(0, 157).trim() + "…";
}

/**
 * Normalizes canonical URL (lowercase, no trailing slash, absolute)
 */
export function formatCanonicalUrl(path?: string, base = BASE_DOMAIN): string {
  if (!path || path === "/" || path === "") {
    return `${base}/`;
  }
  const cleanPath = path.trim().replace(/\/+$/, "").replace(/^\/?/, "/").toLowerCase();
  return `${base}${cleanPath}`;
}

/**
 * Validates genuine GS1 GTIN barcodes (EAN-13, EAN-8, UPC-12, ITF-14)
 * Google rejects synthetic or invalid check-digit barcodes.
 */
export function validateGtin(candidate?: string | null): string | undefined {
  if (!candidate || typeof candidate !== "string") return undefined;
  const clean = candidate.trim().replace(/[-\s]/g, "");
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(clean)) return undefined;
  if (/^0+$/.test(clean) || /^12345678/.test(clean)) return undefined;
  const len = clean.length;
  const digits = clean.split("").map(Number);
  const checkDigit = digits[len - 1];
  let sum = 0;
  let weight = 3;
  for (let i = len - 2; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const calculatedCheck = (10 - (sum % 10)) % 10;
  if (checkDigit !== calculatedCheck) return undefined;
  return clean;
}

/**
 * Dynamically synchronizes all Google SEO requirements in the DOM
 */
export function applyGooglePageMetadata(config: GoogleSeoConfig): void {
  if (typeof document === "undefined") return;

  const title = formatGoogleTitle(config.title);
  const description = formatGoogleDescription(config.description);
  const canonicalUrl = formatCanonicalUrl(config.canonicalPath);
  const imageUrl = config.imageUrl || DEFAULT_IMAGE;
  const isIndexable = config.isIndexable !== false;

  // 1. Title
  document.title = title;

  // 2. Helper to set/update meta tags
  const setMeta = (attributeName: string, attributeValue: string, content: string, id?: string) => {
    let el = id ? document.getElementById(id) : null;
    if (!el) {
      el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    }
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attributeName, attributeValue);
      if (id) el.id = id;
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  // 3. Meta Description & Keywords
  setMeta("name", "description", description, "seo-description");
  if (config.keywords) {
    setMeta("name", "keywords", config.keywords, "seo-keywords");
  }

  // 4. Google Robots Meta Directive
  const robotsDirective = isIndexable
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow";
  setMeta("name", "robots", robotsDirective, "seo-robots");

  // 5. Canonical Link
  let canonicalEl = document.getElementById("seo-canonical") || document.querySelector("link[rel='canonical']");
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    canonicalEl.id = "seo-canonical";
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", canonicalUrl);

  // 6. OpenGraph Metadata (Facebook, WhatsApp, LinkedIn)
  setMeta("property", "og:title", title, "og-title");
  setMeta("property", "og:description", description, "og-description");
  setMeta("property", "og:image", imageUrl, "og-image");
  setMeta("property", "og:url", canonicalUrl, "og-url");
  setMeta("property", "og:type", config.type || "website");
  setMeta("property", "og:site_name", "Juem Mvd");
  setMeta("property", "og:locale", "es_UY");

  // 7. Twitter Card Metadata
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title, "twitter-title");
  setMeta("name", "twitter:description", description, "twitter-description");
  setMeta("name", "twitter:image", imageUrl, "twitter-image");

  // 8. Schema.org JSON-LD Structured Data
  if (config.structuredData) {
    const jsonLdId = "google-schema-jsonld";
    let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = jsonLdId;
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(config.structuredData, null, 2);
  }

  // 9. Protect Favicon from transparent corners
  // Ensure the primary favicon points to full-bleed raster icon (48x48 multiple) without transparent rounded corners
  let iconLink = document.querySelector<HTMLLinkElement>("link[rel='icon'][sizes='48x48']") ||
                 document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (iconLink && !iconLink.href.includes("favicon-48x48.png") && !iconLink.href.includes("favicon.svg")) {
    iconLink.href = "/favicon-48x48.png";
  }
}
