import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, ArrowRight } from "lucide-react";
import { SiteSettings, HeroSlide } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface HeroSliderProps {
  settings: SiteSettings;
  onExploreCatalog: (slideLink?: string) => void;
}

export default function HeroSlider({ settings, onExploreCatalog }: HeroSliderProps) {
  const defaultSlides: HeroSlide[] = [
    {
      id: "slide-1",
      title: settings.bannerTitle || "Colección Exclusiva de Primavera",
      subtitle: settings.bannerSubtitle || "Descubre las últimas tendencias con descuentos de hasta el 40%.",
      imageUrl: settings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "slide-2",
      title: "Tendencias de Temporada",
      subtitle: "Colecciones cuidadosamente seleccionadas para expresar tu estilo único.",
      imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "slide-3",
      title: "Accesorios & Complementos",
      subtitle: "Lentes, mochilas, relojes y detalles que transforman cualquier outfit.",
      imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80"
    }
  ];

  const slides = settings.heroSlides && settings.heroSlides.length > 0 
    ? settings.heroSlides 
    : defaultSlides;

  const optimizeImageUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("unsplash.com")) {
      let optimized = url.replace("auto=format", "fm=webp");
      // On mobile devices we load a much smaller/lighter banner image
      const isMobile = window.innerWidth < 768;
      const targetSizeAndQuality = isMobile ? "&w=750&q=70" : "&w=1400&q=75";
      
      // strip existing width and quality parameters
      optimized = optimized.replace(/[&?]w=\d+/g, "").replace(/[&?]q=\d+/g, "");
      return optimized + (optimized.includes("?") ? "&" : "?") + targetSizeAndQuality;
    }
    return url;
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left

  // Touch gesture support states for mobile swiping
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [currentIndex, isPlaying, slides.length]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setIsPlaying(false);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsPlaying(true);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleWhatsAppContact = (slideTitle: string) => {
    const text = `Hola! Vi el banner "${slideTitle}" en la tienda ${settings.siteTitle} y me gustaría recibir más información sobre el catálogo y ofertas actuales.`;
    const cleanPhone = settings.whatsappNumber.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Variance configuration for motion slider transition based on SiteSettings
  const transitionType = settings.heroSliderTransition || "slide";

  const getVariants = () => {
    switch (transitionType) {
      case "fade":
        return {
          enter: { opacity: 0, scale: 1 },
          center: { zIndex: 1, opacity: 1, scale: 1 },
          exit: { zIndex: 0, opacity: 0, scale: 1 }
        };
      case "zoom":
        return {
          enter: { opacity: 0, scale: 1.06 },
          center: { zIndex: 1, opacity: 1, scale: 1 },
          exit: { zIndex: 0, opacity: 0, scale: 0.95 }
        };
      case "slide-up":
        return {
          enter: (dir: number) => ({
            y: dir > 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          }),
          center: {
            zIndex: 1,
            y: 0,
            opacity: 1,
            scale: 1
          },
          exit: (dir: number) => ({
            zIndex: 0,
            y: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          })
        };
      case "slide":
      default:
        return {
          enter: (dir: number) => ({
            x: dir > 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          }),
          center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
          },
          exit: (dir: number) => ({
            zIndex: 0,
            x: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          })
        };
    }
  };

  const getTransition = () => {
    switch (transitionType) {
      case "fade":
        return {
          opacity: { duration: 0.5, ease: "easeInOut" }
        };
      case "zoom":
        return {
          scale: { duration: 0.6, ease: [0.25, 1, 0.5, 1] },
          opacity: { duration: 0.5, ease: "easeInOut" }
        };
      case "slide-up":
        return {
          y: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.6 },
          opacity: { duration: 0.45, ease: "easeInOut" }
        };
      case "slide":
      default:
        return {
          x: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.6 },
          opacity: { duration: 0.45, ease: "easeInOut" }
        };
    }
  };

  const slideVariants = getVariants();
  const slideTransition = getTransition();

  // Zone light percentages configured in admin settings (0% = dark shade, 100% = full light / no shadow)
  const lightLeft = settings.bannerLightLeft !== undefined ? settings.bannerLightLeft : 75;
  const lightCenter = settings.bannerLightCenter !== undefined ? settings.bannerLightCenter : 88;
  const lightRight = settings.bannerLightRight !== undefined ? settings.bannerLightRight : 95;

  // Convert light to dark overlay opacity (100% light = 0 dark overlay, 0% light = 0.95 dark overlay)
  const darkLeft = Math.max(0, Math.min(0.95, ((100 - lightLeft) / 100) * 0.95));
  const darkCenter = Math.max(0, Math.min(0.95, ((100 - lightCenter) / 100) * 0.95));
  const darkRight = Math.max(0, Math.min(0.95, ((100 - lightRight) / 100) * 0.95));

  // Overall banner image opacity (0.1 to 1.0)
  const imageOpacity = (settings.bannerOpacity !== undefined ? Math.max(settings.bannerOpacity, 10) : 95) / 100;

  return (
    <div 
      className="relative h-[280px] sm:h-[380px] md:h-[480px] lg:h-[560px] w-full overflow-hidden bg-[#050B1A] text-white select-none group transform-gpu"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides Viewport */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 w-full h-full transform-gpu"
            style={{ willChange: "transform, opacity" }}
          >
            {/* Background Image - Boosted with visual filters to guarantee brightness and vibrancy */}
            <img
              src={optimizeImageUrl(slides[currentIndex].imageUrl)}
              alt={slides[currentIndex].title}
              className="w-full h-full object-cover object-center transition-opacity duration-500 filter brightness-105 contrast-[1.03] saturate-[1.05]"
              style={{ opacity: imageOpacity }}
              referrerPolicy="no-referrer"
              loading="eager"
              fetchPriority="high"
            />
            
            {/* Customizable 3-Zone Light Overlays (Left, Center, Right) */}
            {/* Desktop View: Horizontal gradient matching Left, Center, Right light controls */}
            <div 
              className="absolute inset-0 md:block hidden animate-fade-in pointer-events-none transition-all duration-300"
              style={{
                background: `linear-gradient(to right, rgba(5, 11, 26, ${darkLeft.toFixed(3)}) 0%, rgba(5, 11, 26, ${darkCenter.toFixed(3)}) 50%, rgba(5, 11, 26, ${darkRight.toFixed(3)}) 100%)`
              }}
            />

            {/* Mobile View: Vertical gradient matching Left/Bottom, Center, Right/Top light controls */}
            <div 
              className="absolute inset-0 md:hidden block animate-fade-in pointer-events-none transition-all duration-300"
              style={{
                background: `linear-gradient(to top, rgba(5, 11, 26, ${darkLeft.toFixed(3)}) 0%, rgba(5, 11, 26, ${darkCenter.toFixed(3)}) 55%, rgba(5, 11, 26, ${darkRight.toFixed(3)}) 100%)`
              }}
            />

            {/* Slide Content */}
            <div className="absolute inset-0 flex items-center justify-center md:justify-start">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 w-full text-center md:text-left relative z-10">
                <div className="max-w-2xl transform-gpu">
                  <motion.h1 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-extrabold text-[#F4EAD7] tracking-tight leading-[1.1] drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] mb-3 md:mb-5 transform-gpu"
                    style={{ willChange: "opacity, transform" }}
                  >
                    {slides[currentIndex].title}
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-[12px] sm:text-sm md:text-base text-zinc-350 font-sans tracking-wide leading-relaxed max-w-xl font-light line-clamp-2 md:line-clamp-none transform-gpu drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]"
                    style={{ color: "#D8D2C4", willChange: "opacity, transform" }}
                  >
                    {slides[currentIndex].subtitle}
                  </motion.p>

                  {(!slides[currentIndex].hideButton || !slides[currentIndex].hideWhatsAppButton) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-5 sm:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 transform-gpu"
                      style={{ willChange: "opacity, transform" }}
                    >
                      {!slides[currentIndex].hideButton && (
                        <button
                          onClick={() => onExploreCatalog(slides[currentIndex].buttonLink)}
                          className="group/btn relative overflow-hidden py-3 px-6 sm:py-3.5 sm:px-8 rounded-2xl font-sans font-black text-[11px] sm:text-xs uppercase tracking-widest bg-gradient-to-r from-[#F3D287] via-[#D4A55A] to-[#B88730] text-[#050B1A] ring-1 ring-white/50 ring-inset hover:scale-[1.035] active:scale-[0.98] shadow-[0_8px_25px_-5px_rgba(212,165,90,0.5),0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_35px_-4px_rgba(212,165,90,0.7),0_6px_16px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-300 flex items-center gap-3"
                        >
                          {/* Shimmer light effect passing on hover */}
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                          
                          <span className="relative z-10 drop-shadow-sm">
                            {slides[currentIndex].buttonText || "Explorar Colección"}
                          </span>

                          <span className="relative z-10 w-6 h-6 rounded-full bg-black/15 flex items-center justify-center shrink-0 transition-all duration-300 group-hover/btn:bg-black/25 group-hover/btn:translate-x-1 shadow-inner">
                            <ArrowRight className="w-3.5 h-3.5 text-[#050B1A] transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                          </span>
                        </button>
                      )}

                      {!slides[currentIndex].hideWhatsAppButton && (
                        <button
                          onClick={() => handleWhatsAppContact(slides[currentIndex].title)}
                          className="group/wapp py-3 px-5 sm:py-3.5 sm:px-7 rounded-2xl font-sans font-bold text-[11px] sm:text-xs uppercase tracking-widest border border-white/15 bg-[#050B1A]/60 backdrop-blur-md text-[#F4EAD7] hover:border-[#D4A55A]/70 hover:text-[#F3D287] hover:bg-white/10 hover:scale-[1.02] cursor-pointer active:scale-95 transition-all duration-300 flex items-center gap-2.5 shadow-lg shadow-black/20"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-400 group-hover/wapp:scale-110 transition-transform duration-300 shrink-0" />
                          <span>Consultar</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Navigation Left/Right Arrows - visible on hover desktop, stylized like luxury jewelry store interface */}
      <button
        onClick={handlePrev}
        aria-label="Anterior"
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-xl bg-[#050B1A]/70 hover:bg-[#D4A55A] border border-zinc-800 hover:border-[#D4A55A] md:flex hidden items-center justify-center text-[#F4EAD7] hover:text-[#050B1A] transition-all duration-300 opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95 shadow-xl"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={handleNext}
        aria-label="Siguiente"
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-xl bg-[#050B1A]/70 hover:bg-[#D4A55A] border border-zinc-800 hover:border-[#D4A55A] md:flex hidden items-center justify-center text-[#F4EAD7] hover:text-[#050B1A] transition-all duration-300 opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95 shadow-xl"
      >
        <ChevronRight className="h-5 w-5" />
      </button>


    </div>
  );
}
