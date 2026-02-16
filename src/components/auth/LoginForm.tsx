import * as React from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  KreoonButton,
  KreoonInput,
  KreoonSectionTitle,
  KreoonDivider,
  KreoonGlassCard,
} from "@/components/ui/kreoon";

function mapAuthErrorMessage(message?: string): string {
  if (!message) return "Error";
  if (message === "Invalid login credentials") return "Credenciales inválidas";
  if (message.includes("Email not confirmed")) {
    return "Debes confirmar tu correo. Revisa tu bandeja de entrada (y spam) y vuelve a intentar.";
  }
  return message;
}

export interface LoginFormProps {
  /** Callback tras login exitoso (opcional; el flujo suele redirigir por useAuth) */
  onSuccess?: () => void;
  /** Callback al pulsar "¿Olvidaste tu contraseña?" */
  onForgotPassword: () => void;
  /** Callback al pulsar "Regístrate" para ir al formulario de registro */
  onSwitchToRegister: () => void;
}

/**
 * Formulario de login con estilo Kreoon.
 * Email, contraseña, link olvidé contraseña, botón principal y OAuth (Google).
 */
export function LoginForm({
  onSuccess,
  onForgotPassword,
  onSwitchToRegister,
}: LoginFormProps) {
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Ingresa tu correo electrónico");
      return;
    }
    if (!password) {
      setError("Ingresa tu contraseña");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await signIn(trimmedEmail, password);

      if (signInError) {
        const message = mapAuthErrorMessage(signInError.message);
        setError(message);
        toast({
          title: "Error al iniciar sesión",
          description: message,
          variant: "destructive",
        });
        return;
      }
      onSuccess?.();
    } catch (err) {
      const fallback = "Ocurrió un error inesperado. Por favor intenta de nuevo.";
      setError(fallback);
      toast({
        title: "Error",
        description: fallback,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });

      if (oauthError) {
        setError(oauthError.message);
        toast({
          title: "Error con Google",
          description: oauthError.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      const fallback = "No se pudo conectar con Google.";
      setError(fallback);
      toast({
        title: "Error",
        description: fallback,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KreoonGlassCard intensity="strong" className="p-6 sm:p-8 shadow-kreoon-glow overflow-hidden">
      {/* Subtle inner gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-kreoon-purple-500/[0.03] to-transparent pointer-events-none rounded-xl" aria-hidden />
      <form onSubmit={handleSubmit} className="relative space-y-6">
        <KreoonSectionTitle
          title="Bienvenido de nuevo"
          subtitle="Ingresa a tu cuenta para continuar"
          align="center"
          accent
        />

        {error ? (
          <div
            role="alert"
            className="text-sm text-destructive bg-destructive/10 backdrop-blur-sm border border-destructive/30 rounded-lg px-4 py-2.5"
          >
            {error}
          </div>
        ) : null}

        <KreoonInput
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          icon={<Mail className="h-4 w-4" />}
          className="[&_input]:bg-white/[0.04] [&_input]:backdrop-blur-sm"
        />

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-kreoon-text-secondary"
          >
            Contraseña
          </label>
          <div className="relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted pointer-events-none"
              aria-hidden
            >
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={cn(
                "flex h-10 w-full rounded-xl border bg-white/[0.04] backdrop-blur-sm pl-10 pr-10 py-2 text-sm text-kreoon-text-primary",
                "placeholder:text-kreoon-text-muted/70",
                "border-kreoon-border hover:border-kreoon-purple-400/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50 focus-visible:border-kreoon-purple-400 focus-visible:shadow-kreoon-glow-sm",
                "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ease-out",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted hover:text-kreoon-text-secondary transition-colors"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <KreoonButton
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={loading}
          className="w-full shadow-kreoon-glow hover:shadow-kreoon-glow-lg transition-shadow duration-300"
        >
          Iniciar sesión
        </KreoonButton>

        <div className="relative flex items-center gap-3">
          <KreoonDivider className="flex-1" glow />
          <span className="text-xs text-kreoon-text-muted shrink-0">
            o continúa con
          </span>
          <KreoonDivider className="flex-1" glow />
        </div>

        <KreoonButton
          type="button"
          variant="outline"
          size="lg"
          loading={googleLoading}
          disabled={loading || googleLoading}
          className="w-full gap-2 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08]"
          onClick={handleGoogleSignIn}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </KreoonButton>

        <p className="text-center text-sm text-kreoon-text-secondary">
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-kreoon-purple-400 hover:text-kreoon-purple-300 transition-colors underline underline-offset-2"
          >
            Regístrate
          </button>
        </p>
      </form>
    </KreoonGlassCard>
  );
}

LoginForm.displayName = "LoginForm";
