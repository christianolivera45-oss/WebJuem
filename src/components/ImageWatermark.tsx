import React from "react";
import { Shield } from "lucide-react";

interface ImageWatermarkProps {
  text?: string;
  className?: string;
  variant?: "card" | "detail" | "lightbox";
  showShield?: boolean;
}

export default function ImageWatermark({
  text = "JUEM MVD",
  className = "",
  variant = "card",
  showShield = true
}: ImageWatermarkProps) {
  return (
    <>
      {/* Invisible overlay shield catching touch callouts and drag events */}
      <div 
        className="absolute inset-0 z-[6] select-none pointer-events-none" 
        aria-hidden="true"
      />

      {/* Elegant Brand Watermark */}
      <div 
        className={`absolute inset-0 pointer-events-none select-none z-[7] flex items-center justify-center overflow-hidden ${className}`}
        aria-hidden="true"
      >
        {/* Subtle Diagonal Central Watermark */}
        <div className={`transform -rotate-12 flex items-center gap-1.5 font-bold tracking-[0.24em] sm:tracking-[0.28em] uppercase select-none border border-[#D4A55A]/15 backdrop-blur-[0.5px] shadow-sm transition-opacity duration-300 ${
          variant === "lightbox"
            ? "text-sm sm:text-lg px-4 sm:px-6 py-1.5 sm:py-2 rounded-2xl bg-black/25 text-[#E6BF76]/35"
            : variant === "detail"
            ? "text-[11px] sm:text-xs px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-black/20 text-[#E6BF76]/30"
            : "text-[8.5px] sm:text-[9.5px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-black/15 text-[#E6BF76]/25"
        }`}>
          {showShield && (
            <Shield className={`shrink-0 text-[#D4A55A]/40 ${
              variant === "lightbox" ? "w-4 h-4" : "w-3 h-3 sm:w-3.5 sm:h-3.5"
            }`} />
          )}
          <span className="drop-shadow-sm font-sans">{text}</span>
        </div>

        {/* Discreet corner hallmark */}
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex items-center gap-1 text-[7.5px] sm:text-[9px] font-bold text-white/30 tracking-widest uppercase drop-shadow select-none">
          <span className="text-[#D4A55A]/50">©</span> {text}
        </div>
      </div>
    </>
  );
}
