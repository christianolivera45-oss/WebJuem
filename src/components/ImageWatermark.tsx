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

      {/* Invisible overlay shield catching touch callouts and drag events (anti-download protection) */}
      <div 
        className="absolute inset-0 z-[6] select-none pointer-events-none" 
        aria-hidden="true"
      />
    </>
  );
}
