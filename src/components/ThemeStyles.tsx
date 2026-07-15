import { SiteSettings } from "../types";

interface ThemeStylesProps {
  settings: SiteSettings;
}

export default function ThemeStyles({ settings }: ThemeStylesProps) {
  return (
    <style>{`
      :root {
        --color-primary: ${settings.primaryColor || "#3b82f6"};
        --color-accent: ${settings.accentColor || "#10b981"};
        --color-promo-bg: ${settings.promotionBannerBgColor || "#4f46e5"};
        --color-promo-text: ${settings.promotionBannerTextColor || "#ffffff"};
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
