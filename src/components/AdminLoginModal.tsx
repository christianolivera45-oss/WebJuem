import { useState, FormEvent } from "react";
import { Settings, Eye, EyeOff } from "lucide-react";

interface AdminLoginModalProps {
  onClose: () => void;
  onLoginSuccess: (token: string) => void;
}

export default function AdminLoginModal({ onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const trimmedUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();
    if (!trimmedUser || !cleanPass) {
      setLoginError("Por favor ingresa tu usuario y contraseña.");
      return;
    }
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password: cleanPass })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("apex_admin_token", data.token);
        localStorage.setItem("apex_admin_login_time", Date.now().toString());
        setUsernameInput("");
        setPasswordInput("");
        setShowLoginPassword(false);
        onLoginSuccess(data.token);
      } else {
        setLoginError(data.message || "Credenciales incorrectas.");
      }
    } catch {
      setLoginError("Error de conexión al servidor de autenticación.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-center relative shadow-2xl">
        <h3 className="text-xl font-bold mb-1 tracking-tight text-white flex items-center justify-center gap-2">
          <Settings className="h-5 w-5 text-blue-500" />
          <span>Gestión de Tienda</span>
        </h3>
        <p className="text-zinc-400 text-xs mb-6">
          Inicia sesión de administrador con tus credenciales seguras de sincronización.
        </p>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="text-left space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
              Nombre de Usuario
            </label>
            <input
              required
              type="text"
              placeholder="Usuario administrador"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-zinc-700"
            />
          </div>

          <div className="text-left space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
              Contraseña Segura
            </label>
            <div className="relative">
              <input
                required
                type={showLoginPassword ? "text" : "password"}
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-zinc-700"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                title={showLoginPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {loginError && <p className="text-xs text-red-400 text-center font-semibold">❌ {loginError}</p>}

          <button
            type="submit"
            className="w-full py-2.5 px-4 theme-btn-primary rounded-xl text-xs font-bold tracking-wider uppercase mt-2 shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Sincronizar Panel</span>
          </button>
        </form>

        <button
          onClick={() => {
            setLoginError("");
            onClose();
          }}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline"
        >
          Cerrar y volver a Tienda
        </button>
      </div>
    </div>
  );
}
