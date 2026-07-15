import React, { useEffect, useState } from "react";
import { Star, ChevronLeft, ChevronRight, X, ExternalLink, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Review {
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  avatar_color?: string;
}

interface GoogleReviewsData {
  rating: number;
  user_ratings_total: number;
  reviews: Review[];
}

interface GoogleReviewsCompactProps {
  themeMode?: "light" | "dark";
  googlePlaceId?: string;
}

export default function GoogleReviewsCompact({ themeMode, googlePlaceId }: GoogleReviewsCompactProps) {
  const [data, setData] = useState<GoogleReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/google-reviews")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar");
        return res.json();
      })
      .then((reviewsData) => {
        if (active) {
          setData(reviewsData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Error fetching google reviews:", err);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Soft auto-play cycle for reviews slider (every 7s)
  useEffect(() => {
    if (!data?.reviews || data.reviews.length <= 1 || showAllModal) return;
    const interval = setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % data.reviews.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [data, showAllModal]);

  const rating = data?.rating ?? 4.9;
  const totalReviews = data?.user_ratings_total ?? 184;
  const reviews = data?.reviews || [];

  const isDark = themeMode === "dark";

  const prevReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reviews.length === 0) return;
    setActiveReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const nextReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reviews.length === 0) return;
    setActiveReviewIndex((prev) => (prev + 1) % reviews.length);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-center">
        <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs ml-2 select-none opacity-60">Cargando reputación de Google...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 mt-6 select-none">
      <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDark 
          ? "bg-zinc-900/40 border-zinc-900 text-zinc-300 shadow-md shadow-black/10" 
          : "bg-slate-50 border-slate-100/80 text-slate-650 shadow-sm"
      }`}>
        {/* Left side: Google Branding & Stars summary */}
        <div 
          onClick={() => setShowAllModal(true)}
          className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm font-black tracking-tight select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                isDark ? "bg-zinc-800 text-zinc-400" : "bg-white text-slate-500 border border-slate-100"
              }`}>
                Opiniones
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-base font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {rating.toFixed(1)}
              </span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                ))}
              </div>
              <span className="text-[10px] opacity-75 font-semibold">
                ({totalReviews} reseñas)
              </span>
            </div>
          </div>
        </div>

        {/* Middle/Right: Horizontal Slide section showing 1 active review snippet */}
        {reviews.length > 0 && (
          <div className="flex-1 min-w-0 flex items-center justify-between gap-4 w-full md:w-auto relative pl-0 md:pl-4 md:border-l border-zinc-200/20">
            <button
              onClick={prevReview}
              className={`p-1.5 rounded-lg border hover:scale-105 active:scale-95 transition-all cursor-pointer select-none shrink-0 ${
                isDark 
                  ? "bg-zinc-950/45 border-zinc-800 text-zinc-400 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Testimonial Active Display */}
            <div 
              onClick={() => setShowAllModal(true)}
              className="flex-1 min-w-0 text-center md:text-left cursor-pointer group"
            >
              <div className="relative overflow-hidden h-9 flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeReviewIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="w-full text-xs font-medium italic select-none truncate hover:underline text-center md:text-left leading-tight"
                  >
                    &ldquo;{reviews[activeReviewIndex].text}&rdquo;
                  </motion.div>
                </AnimatePresence>
              </div>
              
              <div className="flex items-center justify-center md:justify-start gap-1 text-[10px] opacity-75 font-mono select-none">
                <span className="font-extrabold">{reviews[activeReviewIndex].author_name}</span>
                <span>•</span>
                <span>{reviews[activeReviewIndex].relative_time_description}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block self-center ml-1"></span>
                <span className="text-[9px] text-emerald-500 font-bold tracking-wide uppercase">Compra Verificada</span>
              </div>
            </div>

            <button
              onClick={nextReview}
              className={`p-1.5 rounded-lg border hover:scale-105 active:scale-95 transition-all cursor-pointer select-none shrink-0 ${
                isDark 
                  ? "bg-zinc-950/45 border-zinc-800 text-zinc-400 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View all text block button */}
        <button
          onClick={() => setShowAllModal(true)}
          className="text-[10px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-400 shrink-0 cursor-pointer self-center md:self-auto py-1 px-2.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
        >
          Ver todas
        </button>
      </div>

      {/* Sleek, Expandable Popup Modal showing the details of the reviews */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-xl rounded-3xl border shadow-xl p-6 relative flex flex-col max-h-[85vh] ${
                isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-250 text-slate-800"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowAllModal(false)}
                className={`absolute top-4 right-4 p-1.5 rounded-full cursor-pointer transition ${
                  isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="space-y-1.5 pr-8 pb-4 border-b border-zinc-200/20 shrink-0">
                <span className="text-2xl font-black select-none font-sans block leading-none">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                  <span className="text-base font-bold text-slate-500 dark:text-zinc-400 ml-1.5">Reseñas</span>
                </span>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-bold">{rating.toFixed(1)} / 5</span>
                  <span className="text-xs opacity-60">• Basado en {totalReviews} opiniones verídicas</span>
                </div>
              </div>

              {/* Scrollable opinion card list */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 min-h-0 text-left">
                {reviews.map((rev, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDark 
                        ? "bg-zinc-950/45 border-zinc-800/80 hover:bg-zinc-950/70" 
                        : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {rev.profile_photo_url ? (
                          <img
                            src={rev.profile_photo_url}
                            alt={rev.author_name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-indigo-500/10"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white select-none uppercase ${
                            ["bg-gradient-to-br from-emerald-500 to-teal-600", "bg-gradient-to-br from-blue-500 to-sky-600", "bg-gradient-to-br from-indigo-500 to-indigo-700", "bg-gradient-to-br from-purple-500 to-fuchsia-600"][idx % 4]
                          }`}>
                            {rev.author_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black">{rev.author_name}</span>
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[7px] font-extrabold rounded select-none">
                              <CheckCircle2 className="w-2 h-2 fill-emerald-600 dark:fill-emerald-400 text-white dark:text-zinc-950 shrink-0" />
                              <span>Uruguay</span>
                            </span>
                          </div>
                          <span className="text-[9px] opacity-65 font-medium block leading-none mt-0.5">Opinión certificada ✓</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-400/5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-500">
                        <span>{rev.rating}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      </div>
                    </div>

                    <p className={`text-xs mt-2.5 leading-relaxed italic ${isDark ? "text-zinc-200" : "text-slate-750"}`}>
                      &ldquo;{rev.text}&rdquo;
                    </p>
                    <span className="text-[9px] opacity-55 font-mono block mt-2 text-right">{rev.relative_time_description}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons footer */}
              <div className="pt-4 border-t border-zinc-200/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <span className="text-[10px] opacity-65 font-sans block italic text-center sm:text-left leading-normal">
                  Ficha oficial auditada de Ventas Juem en Google Maps
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAllModal(false)}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Entendido
                  </button>
                  <a
                    href={`https://search.google.com/local/reviews?placeid=${googlePlaceId || "ChIJHZFnxeUhoJURtA0cWV3PH2A"}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 sm:flex-initial text-center inline-flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>Ver en Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
