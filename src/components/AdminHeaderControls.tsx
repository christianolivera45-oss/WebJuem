import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";

interface AdminHeaderControlsProps {
  onBackToStore: () => void;
  onLogout: () => void;
}

export default function AdminHeaderControls({ onBackToStore, onLogout }: AdminHeaderControlsProps) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
        <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline text-emerald-300">
          Base de Datos Sincronizada
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider md:hidden text-emerald-300">Sincronizado</span>
      </div>

      <div
        className="flex items-center gap-1.5 px-2 py-0.5 bg-[#D4AF37]/12 text-[#F3E5AB] rounded-full border border-[#D4AF37]/30 shadow-[0_0_12px_rgba(212,175,55,0.12)] transition-all duration-300"
        title="Su sesión se renueva automáticamente con el movimiento o clics."
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#E6BF76]" />
        <span className="text-[9px] font-bold uppercase tracking-wider hidden md:inline text-[#F3E5AB]">Sesión Protegida</span>
      </div>

      <button
        onClick={onBackToStore}
        className="flex items-center gap-1.5 text-[11px] py-1 px-2.5 font-bold rounded-xl bg-gradient-to-r from-[#D4AF37]/20 via-[#D4A55A]/15 to-transparent hover:from-[#D4AF37]/30 hover:to-[#B89628]/25 text-[#F3E5AB] border border-[#D4AF37]/35 transition-all shadow-[0_2px_12px_rgba(212,175,55,0.15)] cursor-pointer"
      >
        <ArrowLeft className="h-3 w-3 text-[#E6BF76]" />
        <span>Ver Tienda</span>
      </button>

      <div className="flex items-center gap-2 pl-2 border-l border-[#D4AF37]/25">
        <div className="hidden md:block text-right">
          <p className="text-[11px] font-bold leading-none text-[#F3E5AB]">Juem</p>
          <p className="text-[8.5px] text-[#D4A55A]/80 font-medium">Administrador</p>
        </div>
        <button
          onClick={onLogout}
          className="p-1 text-rose-400 hover:bg-rose-500/15 rounded-lg border border-rose-500/20 transition cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
