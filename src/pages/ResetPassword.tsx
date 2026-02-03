import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  KreoonGlassCard,
  KreoonButton,
  KreoonInput,
  KreoonBadge,
} from "@/components/ui/kreoon";

function getRecoveryFlagFromUrl(location: { search: string; hash: string }) {
  const params = new URLSearchParams(location.search);
  const typeFromSearch = params.get("type");
  const hash = location.hash?.startsWith("#")
    ? location.hash.slice(1)
    : location.hash;
  const hashParams = new URLSearchParams(hash);
  const typeFromHash = hashParams.get("type");
  return (typeFromSearch || typeFromHash) === "recovery";
}

function getPasswordStrength(pwd: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pwd) return { score: 0, label: "", color: "bg-kreoon-text-muted" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: "Débil", color: "bg-red-500" };
  if (score <= 3) return { score: 3, label: "Media", color: "bg-amber-500" };
  return { score: 5, label: "Fuerte", color: "bg-emerald-500" };
}

const REDIRECT_COUNTDOWN_SECONDS = 3;

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const isRecovery = useMemo(
    () => getRecoveryFlagFromUrl(location),
    [location],
  );

  const [booting, setBooting] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_COUNTDOWN_SECONDS);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn(
              "[reset-password] exchangeCodeForSession failed:",
              exchangeError,
            );
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!mounted) return;
        setHasSession(!!data.session);
      } catch (e) {
        console.error("[reset-password] boot error:", e);
        if (mounted) setHasSession(false);
      } finally {
        if (mounted) setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    setCountdown(REDIRECT_COUNTDOWN_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          navigate("/", { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [success, navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      setError("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      toast.success("Contraseña actualizada. Ya puedes ingresar.");
      setSuccess(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "No se pudo actualizar la contraseña";
      toast.error(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordMinLength = password.length >= 6;

  if (booting) {
    return (
      <AuthLayout showBranding>
        <div className="flex w-full max-w-md flex-col items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kreoon-bg-card">
            <Lock className="h-6 w-6 animate-pulse text-kreoon-text-muted" />
          </div>
          <p className="mt-4 text-sm text-kreoon-text-secondary">
            Verificando enlace...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLayout showBranding>
        <KreoonGlassCard intensity="medium" className="w-full max-w-md p-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kreoon-bg-card text-kreoon-text-muted">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-kreoon-text-primary">
              Enlace inválido o expirado
            </h2>
            <p className="text-sm text-kreoon-text-secondary">
              Solicita un nuevo enlace de recuperación desde la página de inicio
              de sesión.
            </p>
            <KreoonButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/auth", { replace: true })}
            >
              Ir a iniciar sesión
            </KreoonButton>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300"
            >
              Volver al inicio
            </button>
          </div>
        </KreoonGlassCard>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout showBranding>
        <KreoonGlassCard intensity="medium" className="w-full max-w-md p-6">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="space-y-6 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-kreoon-gradient text-kreoon-text-primary shadow-kreoon-glow">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-kreoon-text-primary">
                Contraseña actualizada
              </h2>
              <p className="mt-2 text-sm text-kreoon-text-secondary">
                Redirigiendo al inicio en {countdown} segundos...
              </p>
            </div>
            <KreoonButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
            >
              Ir al inicio ahora
            </KreoonButton>
          </motion.div>
        </KreoonGlassCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showBranding>
      <KreoonGlassCard intensity="medium" className="w-full max-w-md p-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kreoon-purple-500/20 text-kreoon-purple-400 shadow-kreoon-glow-sm">
              <Lock className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-kreoon-text-primary">
                Crear nueva contraseña
              </h2>
              <p className="mt-1 text-sm text-kreoon-text-secondary">
                {isRecovery
                  ? "Define tu nueva contraseña para ingresar a tu cuenta."
                  : "Abre el enlace de recuperación desde tu correo para continuar."}
              </p>
            </div>
          </div>

          {error && (
            <KreoonBadge variant="error" className="w-full justify-center py-2">
              {error}
            </KreoonBadge>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-kreoon-text-secondary">
                Nueva contraseña
              </label>
              <div className="relative">
                <div
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-kreoon-text-muted pointer-events-none"
                  aria-hidden
                >
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Mínimo 6 caracteres"
                  disabled={submitting}
                  className={cn(
                    "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary pl-10 pr-10 py-2 text-sm text-kreoon-text-primary",
                    "placeholder:text-kreoon-text-muted/70",
                    "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50 focus-visible:border-kreoon-purple-400 focus-visible:shadow-kreoon-glow-sm",
                    "disabled:opacity-50 transition-all duration-200",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted hover:text-kreoon-text-secondary"
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-kreoon-bg-card overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      passwordStrength.color,
                    )}
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                    }}
                  />
                </div>
                {password.length > 0 && (
                  <span className="text-xs text-kreoon-text-muted">
                    {passwordStrength.label}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <KreoonInput
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Repite la contraseña"
                disabled={submitting}
              />
              {confirmPassword.length > 0 && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    passwordsMatch ? "text-emerald-500" : "text-kreoon-text-muted",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      !passwordsMatch && "opacity-40",
                    )}
                  />
                  <span>
                    {passwordsMatch
                      ? "Las contraseñas coinciden"
                      : "Las contraseñas no coinciden"}
                  </span>
                </div>
              )}
            </div>

            <KreoonButton
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={submitting}
              className="w-full"
            >
              Guardar contraseña
            </KreoonButton>

            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="w-full text-center text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300 transition-colors"
            >
              Volver al inicio
            </button>
          </form>
        </div>
      </KreoonGlassCard>
    </AuthLayout>
  );
}
