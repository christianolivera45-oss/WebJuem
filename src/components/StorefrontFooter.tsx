import { lazy, Suspense } from "react";
import { Globe, MapPin, Accessibility } from "lucide-react";
import { ShopState } from "../types";

const GoogleReviewsCompact = lazy(() => import("./GoogleReviewsCompact"));

interface StorefrontFooterProps {
  store: ShopState;
  onOpenDeliveryMap: () => void;
}

export default function StorefrontFooter({ store, onOpenDeliveryMap }: StorefrontFooterProps) {
  return (
    <>
      {store.settings.themeMode === "dark" && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#D4A55A]/40 to-transparent" />
      )}

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-10">
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
            store.settings.themeMode === "dark" ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm" : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                <Globe className="h-4 w-4" />
              </span>
              <h2
                className={`font-bold text-xs uppercase tracking-wider font-sans ${
                  store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                }`}
              >
                Nuestras Redes
              </h2>
            </div>

            <p className="text-xs leading-relaxed opacity-85 mb-4">
              Sigue nuestras publicaciones, novedades del talle y promociones imperdibles agregadas diariamente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-auto">
            <a
              href={store.settings.instagramUrl || "https://instagram.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-110 text-white border-none shadow-sm transition-transform duration-100 active:scale-95 cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.071 3.253.147 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.148 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
              <span>Instagram</span>
            </a>
            <a
              href={store.settings.facebookUrl || "https://facebook.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-[#145DBF] hover:bg-[#0F4C9E] text-white border-none shadow-sm transition-transform duration-100 active:scale-95 cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </a>
          </div>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
            store.settings.themeMode === "dark" ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm" : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                <MapPin className="h-4 w-4" />
              </span>
              <h2
                className={`font-bold text-xs uppercase tracking-wider font-sans ${
                  store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                }`}
              >
                🗺️ Zonas de Envío
              </h2>
            </div>
            <p className="text-xs leading-relaxed opacity-85">
              Explora de forma interactiva nuestras 10 Zonas de Envío con cobertura directa de cadetería propia en Montevideo, Canelones y
              Ciudad de la Costa. Costos fijos y transparentes.
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={onOpenDeliveryMap}
              className="w-full relative shrink-0 bg-[#D4A55A] hover:bg-[#C59B4E] text-[#050B18] font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Ver Mapa de Envíos</span>
            </button>
          </div>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
            store.settings.themeMode === "dark" ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm" : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                <MapPin className="h-4 w-4" />
              </span>
              <h2
                className={`font-bold text-xs uppercase tracking-wider font-sans ${
                  store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                }`}
              >
                📍 Sucursal Montevideo
              </h2>
            </div>
            <div className="text-xs space-y-2 mb-3 opacity-85">
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#E6BF76]">Dirección:</strong>{" "}
                {store.settings.pickupAddress || "Coruña 3038 Bis, Montevideo"}
              </p>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#E6BF76]">Horario:</strong>{" "}
                {store.settings.pickupHours || "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs."}
              </p>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#E6BF76]">Teléfono:</strong> 098058775
              </p>
            </div>
          </div>
          <div className="w-full h-[140px] rounded-xl overflow-hidden border border-[#D4A55A]/15 relative">
            <iframe
              title="Mapa de ubicación - Sucursal Montevideo"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3273.500741407378!2d-56.15203782349302!3d-34.868770171545755!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959f808dc42ec093%3A0x20632d6daf9aa5fc!2sCoru%C3%B1a%203038%2C%2012000%20Montevideo%2C%20Departamento%20de%20Montevideo!5e0!3m2!1ses-419!2suy!4v1782910027474!5m2!1ses-419!2suy"
              className="absolute inset-0 w-full h-full"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>

        <div
          id="footer-map"
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
            store.settings.themeMode === "dark" ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm" : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                <MapPin className="h-4 w-4" />
              </span>
              <h2
                className={`font-bold text-xs uppercase tracking-wider font-sans ${
                  store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                }`}
              >
                📍 Sucursal Pinamar
              </h2>
            </div>
            <div className="text-xs space-y-2 mb-3 opacity-85">
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#E6BF76]">Dirección:</strong>{" "}
                {store.settings.pickupAddressPinamar || "C. 54, 15100 Pinamar, Departamento de Canelones"}
              </p>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#E6BF76]">Horario:</strong>{" "}
                {store.settings.pickupHoursPinamar ||
                  "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs."}
              </p>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#E6BF76]">Teléfono:</strong> 098058775
              </p>
            </div>
          </div>
          <div className="w-full h-[140px] rounded-xl overflow-hidden border border-[#D4A55A]/15 relative">
            <iframe
              title="Mapa de ubicación - Sucursal Pinamar"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3277.703532468259!2d-55.8671867242527!3d-34.76306027289764!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a021e5c567911d%3A0x601fcf5d591c0db4!2sJuem!5e0!3m2!1ses-419!2suy!4v1782909992678!5m2!1ses-419!2suy"
              className="absolute inset-0 w-full h-full"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </div>

      {store.settings.googleReviewsEnabled !== false && (
        <Suspense fallback={null}>
          <GoogleReviewsCompact themeMode={store.settings.themeMode} googlePlaceId={store.settings.googlePlaceId} />
        </Suspense>
      )}

      <div
        className={`max-w-7xl mx-auto px-6 mt-10 sm:mt-12 pt-6 sm:pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-[11px] ${
          store.settings.themeMode === "dark" ? "border-zinc-800/60" : "border-slate-200"
        }`}
      >
        <div className="space-y-1">
          <p className="font-medium">
            &copy; 2026 {store.settings.siteTitle || "Ventas Juem"}.{" "}
            {store.settings.footerCopyright || "Desarrollado con tecnología de punta responsive. Reservados todos los derechos."}
          </p>
          <p className="opacity-60 flex items-center justify-center md:justify-start gap-1">
            <MapPin className="h-3 w-3 text-[#D4A55A]" /> Montevideo, Uruguay • Conexión Segura vía WhatsApp Web API
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-a11y-panel"))}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
              store.settings.themeMode === "dark"
                ? "bg-[#0B1730] hover:bg-[#D4A55A]/15 border-[#D4A55A]/20 text-[#E6BF76]"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
            }`}
            aria-label="Ajustes de accesibilidad"
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span>Ajustes de Accesibilidad</span>
          </button>
        </div>
      </div>
    </>
  );
}
