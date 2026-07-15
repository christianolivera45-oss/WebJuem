import React, { useState } from "react";
import { Lock, Key, CheckCircle2, AlertCircle, Shield, ShieldAlert, Award, Eye, EyeOff } from "lucide-react";

interface SecurityPanelProps {
  authToken: string | null;
  showAdminToast: (msg: string, type?: "success" | "error" | "neutral") => void;
  setAuthToken: (token: string | null) => void;
}

export default function SecurityPanel({ authToken, showAdminToast, setAuthToken }: SecurityPanelProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  // Client-side visual validations
  const isLengthValid = newPassword.length >= 6;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    if (!authToken) {
      setApiError("Sesión de administrador no válida.");
      return;
    }

    if (!currentPassword) {
      setApiError("Debes introducir tu contraseña actual para confirmar cambios.");
      return;
    }

    if (newUsername.trim().length < 3) {
      setApiError("El nombre de usuario nuevo debe tener al menos 3 caracteres.");
      return;
    }

    if (!isLengthValid) {
      setApiError("La nueva contraseña debe tener un mínimo de 6 caracteres.");
      return;
    }

    if (!passwordsMatch) {
      setApiError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/change-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim(),
          newPassword
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setApiSuccess(data.message || "¡Credenciales actualizadas!");
        showAdminToast("Credenciales de seguridad actualizadas con éxito.", "success");
        
        // Update Session Token in localStorage & state to keep current user signed in
        if (data.newToken) {
          localStorage.setItem("apex_admin_token", data.newToken);
          setAuthToken(data.newToken);
        }

        // Clear input form
        setCurrentPassword("");
        setNewUsername("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setApiError(data.message || "No se pudieron actualizar las credenciales.");
        showAdminToast(data.message || "Error al actualizar credenciales.", "error");
      }
    } catch (err) {
      console.error(err);
      setApiError("Error de comunicación de red con el servidor backend.");
      showAdminToast("Error de conexión al guardar credenciales.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-850 shadow-sm space-y-6">
        
        {/* Title area */}
        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Configuración de Credenciales</h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Modifica los detalles de autenticación para salvaguardar tu panel de administración.
            </p>
          </div>
        </div>

        {/* Warning Badge */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-bold select-none text-[11px] uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" />
            <span>Medida Antifraude Activa</span>
          </div>
          <p className="opacity-90">
            Al cambiar el usuario o contraseña, <strong>se cerrarán las sesiones de administrador activas en otros navegadores</strong> para mitigar intrusiones. Tu sesión actual se actualizará con un nuevo hash criptográfico seguro (SHA-256).
          </p>
        </div>

        {/* Form elements */}
        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          
          {/* Current Password - required confirmation prior to edit */}
          <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
              Confirmar Contraseña Actual <span className="text-red-500">* Requerido antes de guardar</span>
            </label>
            <div className="relative">
              <input
                required
                type={showCurrentPass ? "text" : "password"}
                placeholder="Ingresa tu contraseña de acceso para autorizar cambios"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Username */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Nuevo Nombre de Usuario</label>
              <input
                required
                type="text"
                placeholder="ej. Juem"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Empty space or additional layout placeholder */}
            <div className="hidden md:flex flex-col justify-end text-[11px] text-slate-400 dark:text-zinc-500 italic pb-2">
              El usuario predeterminado es "Juem".
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Nueva Contraseña Segura</label>
              <div className="relative">
                <input
                  required
                  type={showNewPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  required
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="Repite la contraseña exactamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Validation Indicators */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/30 rounded-xl space-y-1.5 text-[11px] border border-slate-200 dark:border-zinc-800">
            <p className="font-semibold text-slate-600 dark:text-zinc-400 select-none uppercase tracking-wider text-[9px] mb-1">Requisitos mínimos de contraseña segura:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div className="flex items-center gap-1.5">
                {isLengthValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span className={isLengthValid ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400"}>
                  Mínimo 6 caracteres ({newPassword.length}/6)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasNumber && hasLetter ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span className={hasNumber && hasLetter ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-600 dark:text-amber-400"}>
                  Letras y Números combinados
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                {passwordsMatch && confirmPassword ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span className={passwordsMatch && confirmPassword ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400"}>
                  Las contraseñas ingresadas coinciden {confirmPassword && !passwordsMatch && "(Incorrecto)"}
                </span>
              </div>
            </div>
          </div>

          {/* API Banners */}
          {apiError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-bold">{apiError}</span>
            </div>
          )}

          {apiSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-bold">{apiSuccess}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving || !isLengthValid || !passwordsMatch}
              className={`py-2.5 px-6 rounded-lg font-bold text-xs transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                saving || !isLengthValid || !passwordsMatch
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-emerald-500/10"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>{saving ? "Guardando..." : "Actualizar Acceso"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
