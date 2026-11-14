import { SiteSettings } from "../types";

interface ThemeStylesProps {
  settings: SiteSettings;
}

function parseHexColor(hex?: string): [number, number, number] | null {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function getRelativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getAccessiblePromoColors(settings?: SiteSettings): { promoBg: string; promoText: string } {
  const isNavidad =
    settings?.activeTheme === "navidad" ||
    (settings?.primaryColor?.toLowerCase() === "#e11d48" && settings?.accentColor?.toLowerCase() === "#10b981");

  const promoBg = isNavidad ? "#FAF9F5" : (settings?.promotionBannerBgColor || "#060b1a");
  let promoText = isNavidad ? "#285744" : (settings?.promotionBannerTextColor || "#E6BF76");

  const bgRgb = parseHexColor(promoBg);
  const fgRgb = parseHexColor(promoText);
  if (bgRgb && fgRgb) {
    const lBg = getRelativeLuminance(bgRgb);
    const lFg = getRelativeLuminance(fgRgb);
    const ratio = (Math.max(lBg, lFg) + 0.05) / (Math.min(lBg, lFg) + 0.05);
    if (ratio < 4.5) {
      promoText = lBg > 0.35 ? "#1E1D1B" : "#F4EAD7";
    }
  }

  return { promoBg, promoText };
}

export default function ThemeStyles({ settings }: ThemeStylesProps) {
  const isNavidad = settings?.activeTheme === "navidad" || 
    (settings?.primaryColor?.toLowerCase() === "#e11d48" && settings?.accentColor?.toLowerCase() === "#10b981");

  const primaryCol = isNavidad ? "#D4AF70" : (settings.primaryColor || "#3b82f6");
  const accentCol = isNavidad ? "#285744" : (settings.accentColor || "#10b981");
  const { promoBg, promoText } = getAccessiblePromoColors(settings);

  return (
    <style>{`
      :root {
        --color-primary: ${primaryCol};
        --color-accent: ${accentCol};
        --color-promo-bg: ${promoBg};
        --color-promo-text: ${promoText};
      }
      
      .theme-promo-banner {
        background-color: var(--color-promo-bg);
        color: var(--color-promo-text);
      }

      .theme-promo-banner .marquee-train-container,
      .theme-promo-banner .marquee-train-content {
        background-color: var(--color-promo-bg);
        color: var(--color-promo-text);
      }
      
      .theme-btn-primary {
        background-color: var(--color-primary);
        color: #ffffff;
        transition: all 0.2s ease-in-out;
      }
      .theme-btn-primary:hover {
        opacity: 0.9;
      }
      
      .theme-btn-accent {
        background-color: var(--color-accent);
        color: #ffffff;
        transition: all 0.2s ease-in-out;
      }
      .theme-btn-accent:hover {
        opacity: 0.9;
      }
      
      .theme-text-primary {
        color: var(--color-primary);
      }
      .theme-text-accent {
        color: var(--color-accent);
      }
      
      .theme-border-primary {
        border-color: var(--color-primary);
      }
      .theme-border-accent {
        border-color: var(--color-accent);
      }

      .theme-ring-primary:focus {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
    `}</style>
  );
}
