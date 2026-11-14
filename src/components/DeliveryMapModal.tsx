import { useEffect } from "react";
import { X } from "lucide-react";
import { InteractiveMap } from "./InteractiveMap";

interface DeliveryMapModalProps {
  onClose: () => void;
}

export default function DeliveryMapModal({ onClose }: DeliveryMapModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-2 sm:p-4 overflow-y-auto cursor-pointer animate-fade-in"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-4 right-4 z-[60] bg-black/70 backdrop-blur-md hover:bg-black/90 text-white/90 hover:text-white p-2.5 rounded-full border border-white/20 shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
        title="Cerrar Mapa"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="w-full max-w-5xl my-4 sm:my-8 relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <InteractiveMap onClose={onClose} showTitle={true} />
      </div>
    </div>
  );
}
