import { useRef, useState, useEffect, ReactNode } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Product, SiteSettings } from "../types";
import ProductCard from "./ProductCard";

interface ProductSliderProps {
  products: Product[];
  settings: SiteSettings;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
  onViewProduct: (product: Product) => void;
  emptyIcon: ReactNode;
  emptyText: string;
  emptySubtext: string;
}

export default function ProductSlider({
  products,
  settings,
  onAddToCart,
  onViewProduct,
  emptyIcon,
  emptyText,
  emptySubtext
}: ProductSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const autoplaySpeed = settings.featuredSliderSpeed !== undefined ? settings.featuredSliderSpeed : 2500;

  // Render all products provided
  const displayedProducts = products;

  const rafIdRef = useRef<number | null>(null);

  const checkScrollState = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const scrollLeft = el.scrollLeft;
      const clientWidth = el.clientWidth;
      const scrollWidth = el.scrollWidth;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      checkScrollState();
      el.addEventListener("scroll", checkScrollState, { passive: true });
      window.addEventListener("resize", checkScrollState, { passive: true });
    }
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (el) {
        el.removeEventListener("scroll", checkScrollState);
      }
      window.removeEventListener("resize", checkScrollState);
    };
  }, [displayedProducts]);

  // Autoplay auto-scrolling effect using requestAnimationFrame and constant card step
  useEffect(() => {
    if (displayedProducts.length <= 1 || isPaused || autoplaySpeed <= 0) return;

    const interval = setInterval(() => {
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= maxScroll - 5) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Standard catalog card width (305px) + gap (16px) = 321px
          const scrollAmount = 321;
          el.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      });
    }, autoplaySpeed);

    return () => clearInterval(interval);
  }, [displayedProducts, isPaused, autoplaySpeed]);

  const scroll = (direction: "left" | "right") => {
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (el) {
        const scrollAmount = Math.max(300, Math.floor(el.clientWidth * 0.75));
        el.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth"
        });
      }
    });
  };

  if (displayedProducts.length === 0) {
    return (
      <div className={`p-12 text-center rounded-2xl border border-dashed ${
        settings.themeMode === "dark" 
          ? "border-zinc-850 bg-zinc-900/10 text-zinc-550" 
          : "border-slate-150 bg-slate-50/50 text-slate-400"
      }`}>
        <div className="mx-auto mb-2 opacity-50 flex justify-center">
          {emptyIcon}
        </div>
        <p className="text-xs font-semibold">{emptyText}</p>
        <p className="text-[10px] opacity-70 mt-1">{emptySubtext}</p>
      </div>
    );
  }

  return (
    <div 
      className="relative group/slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Left Arrow Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={`absolute left-2 top-[35%] -translate-y-1/2 z-30 hidden sm:flex items-center justify-center w-10 h-10 rounded-full shadow-lg border backdrop-blur-sm transition-all duration-300 pointer-events-auto cursor-pointer ${
            settings.themeMode === "dark"
              ? "bg-zinc-900/95 border-zinc-800 text-white hover:bg-zinc-800"
              : "bg-white/95 border-slate-200 text-slate-800 hover:bg-slate-50"
          } hover:scale-110 active:scale-95`}
          title="Ver anteriores"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Right Arrow Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={`absolute right-2 top-[35%] -translate-y-1/2 z-30 hidden sm:flex items-center justify-center w-10 h-10 rounded-full shadow-lg border backdrop-blur-sm transition-all duration-300 pointer-events-auto cursor-pointer ${
            settings.themeMode === "dark"
              ? "bg-zinc-900/95 border-zinc-800 text-white hover:bg-zinc-800"
              : "bg-white/95 border-slate-200 text-slate-800 hover:bg-slate-50"
          } hover:scale-110 active:scale-95`}
          title="Ver más"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Desktop/Tablet: Scrollable Products Container */}
      <div 
        ref={containerRef}
        className="hidden sm:flex overflow-x-auto scrollbar-none gap-6 pb-4 pt-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {displayedProducts.map((p) => (
          <div 
            key={p.id} 
            className="flex-shrink-0 w-[220px] md:w-[285px] snap-start z-10"
          >
            <ProductCard
              product={p}
              layoutMode="grid"
              settings={settings}
              onAddToCart={onAddToCart}
              onViewProduct={onViewProduct}
            />
          </div>
        ))}
      </div>

      {/* Mobile Grid layout (sections in 2 columns on cellphone, as requested by user) */}
      <div className="grid sm:hidden grid-cols-2 gap-3 pb-1">
        {displayedProducts.slice(0, 6).map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            layoutMode="grid"
            settings={settings}
            onAddToCart={onAddToCart}
            onViewProduct={onViewProduct}
          />
        ))}
      </div>
    </div>
  );
}
