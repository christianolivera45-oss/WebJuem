import React, { useState, useEffect } from "react";
import { X, Building2, Save, CheckCircle2, Globe, Phone, Mail, MapPin, Calendar, FileText } from "lucide-react";
import { CompanyQuoteSettings } from "../types";
import { DEFAULT_COMPANY_SETTINGS } from "../utils/generateQuotePdf";

interface CompanyQuoteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (settings: CompanyQuoteSettings) => void;
  authToken?: string;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const CompanyQuoteSettingsModal: React.FC<CompanyQuoteSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  authToken,
  showToast
}) => {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [companyName, setCompanyName] = useState<string>("JUEM");
  const [tradeName, setTradeName] = useState<string>("JUEM 3D Studio & Fabricación Digital");
  const [phone, setPhone] = useState<string>("+598 99 234 567");
  const [whatsapp, setWhatsapp] = useState<string>("+598 99 234 567");
  const [email, setEmail] = useState<string>("contacto@juem.com.uy");
  const [website, setWebsite] = useState<string>("juem.com.uy");
  const [address, setAddress] = useState<string>("Montevideo / Canelones, Uruguay");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [defaultValidityDays, setDefaultValidityDays] = useState<number>(15);
  const [defaultConditions, setDefaultConditions] = useState<string>(DEFAULT_COMPANY_SETTINGS.defaultConditions);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/3d/commercial-quotes-settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            const s = data.settings;
            setCompanyName(s.companyName || "JUEM");
            setTradeName(s.tradeName || "JUEM 3D Studio & Fabricación Digital");
            setPhone(s.phone || "+598 99 234 567");
            setWhatsapp(s.whatsapp || "+598 99 234 567");
            setEmail(s.email || "contacto@juem.com.uy");
            setWebsite(s.website || "juem.com.uy");
            setAddress(s.address || "Montevideo / Canelones, Uruguay");
            setLogoUrl(s.logoUrl || "");
            setDefaultValidityDays(Number(s.defaultValidityDays) || 15);
            setDefaultConditions(s.defaultConditions || DEFAULT_COMPANY_SETTINGS.defaultConditions);
          }
        })
        .catch((err) => console.error("Could not fetch company settings:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = authToken || localStorage.getItem("apex_admin_token") || localStorage.getItem("admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload: CompanyQuoteSettings = {
        companyName,
        tradeName,
        phone,
        whatsapp,
        email,
        website,
        address,
        logoUrl,
        defaultValidityDays,
        defaultConditions
      };

      const res = await fetch("/api/3d/commercial-quotes-settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("¡Configuración de JUEM actualizada con éxito!", "success");
        onSaved(payload);
        onClose();
      } else {
        showToast(data.message || "Error al guardar", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error de conexión", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#050B1A] border border-[#D4A55A]/40 rounded-3xl w-full max-w-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#0B1730] border-b border-[#D4A55A]/25 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4A55A]/15 border border-[#D4A55A]/30 text-[#E6BF76]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-[#F4EAD7] tracking-wide">
                Datos de JUEM para Cotizaciones PDF
              </h3>
              <p className="text-xs text-[#A0AEC0]">
                Configura los datos comerciales, web y condiciones que encabezan los presupuestos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#A0AEC0] hover:text-[#F4EAD7] hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#A0AEC0]">Cargando configuración...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                    Nombre Principal
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                    placeholder="JUEM"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                    Razón Comercial / Subtítulo
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                    placeholder="Estudio de Impresión 3D & Fabricación Digital"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                    Sitio Web Oficial
                  </label>
                  <div className="relative">
                    <Globe className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      placeholder="juem.com.uy"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                    Email de Contacto
                  </label>
                  <div className="relative">
                    <Mail className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      placeholder="contacto@juem.com.uy"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => {
                        setWhatsapp(e.target.value);
                        setPhone(e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                      placeholder="+598 99 234 567"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                    Días de Validez por Defecto
                  </label>
                  <div className="relative">
                    <Calendar className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={defaultValidityDays}
                      onChange={(e) => setDefaultValidityDays(parseInt(e.target.value) || 15)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                  Ubicación / Dirección del Taller
                </label>
                <div className="relative">
                  <MapPin className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#A0AEC0]" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                    placeholder="Montevideo / Canelones, Uruguay"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B499] block mb-1">
                  Condiciones Comerciales Predeterminadas en el PDF
                </label>
                <textarea
                  rows={5}
                  value={defaultConditions}
                  onChange={(e) => setDefaultConditions(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] leading-relaxed resize-none font-sans"
                />
              </div>

              <div className="pt-4 border-t border-[#D4A55A]/20 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#C5B499] text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4A55A] via-[#E6BF76] to-[#D4A55A] text-[#050B1A] font-serif font-bold text-xs uppercase tracking-wider transition-all shadow hover:brightness-105 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </>
          )}
        </form>

      </div>
    </div>
  );
};
