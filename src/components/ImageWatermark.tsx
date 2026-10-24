import React from "react";

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

      {/* Discreet & subtle corner hallmark only - completely free and clean in the center */}
      <div 
        className={`absolute inset-0 pointer-events-none select-none z-[7] ${className}`}
        aria-hidden="true"
      >
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/25 backdrop-blur-[1px] border border-white/5 text-[7px] sm:text-[8.5px] font-semibold text-white/30 tracking-widest uppercase drop-shadow select-none pointer-events-none">
          <span className="text-[#D4A55A]/45 font-bold">©</span> {text}
        </div>
      </div>
    </>
  );
}
