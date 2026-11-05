import { SiteSettings } from "../types";

interface ThemeStylesProps {
  settings: SiteSettings;
}

export default function ThemeStyles({ settings }: ThemeStylesProps) {
  const isNavidad = settings?.activeTheme === "navidad" || 
    (settings?.primaryColor?.toLowerCase() === "#e11d48" && settings?.accentColor?.toLowerCase() === "#10b981");

  const primaryCol = isNavidad ? "#D4AF70" : (settings.primaryColor || "#3b82f6");
  const accentCol = isNavidad ? "#285744" : (settings.accentColor || "#10b981");
  const promoBg = isNavidad ? "#FAF9F5" : (settings.promotionBannerBgColor || "#4f46e5");
  const promoText = isNavidad ? "#285744" : (settings.promotionBannerTextColor || "#ffffff");

  return (
    <style>{`
      :root {
        --color-primary: ${primaryCol};
        --color-accent: ${accentCol};
        --color-promo-bg: ${promoBg};
        --color-promo-text: ${promoText};
      }
      
      .theme-promo-banner {
        background: var(--color-promo-bg);
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
