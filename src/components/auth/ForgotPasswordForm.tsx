import * as React from "react";
import { Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KreoonButton, KreoonInput } from "@/components/ui/kreoon";

const COOLDOWN_SECONDS = 60;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export interface ForgotPasswordFormProps {
  /** Callback al pulsar "Volver al login" */
  onBack: () => void;
  /** Callback opcional tras enviar correctamente (antes de mostrar éxito) */
  onSuccess?: () => void;
}

/**
 * Formulario para solicitar recuperación de contraseña.
 * Vista inicial: email + enviar. Vista éxito: mensaje + reenviar con cooldown.
 */
export function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  const cooldownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0 && cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, [cooldown]);

  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
            cooldownRef.current = null;
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const sendResetEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Ingresa tu correo electrónico");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("El correo no tiene un formato válido");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo: `${window.location.origin}/reset-password` },
      );

      if (resetError) {
        setError(resetError.message);
        toast({
          title: "Error al enviar",
          description: resetError.message,
          variant: "destructive",
        });
        return;
      }

      setSent(true);
      startCooldown();
      onSuccess?.();
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo enviar el correo. Intenta de nuevo.";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendResetEmail();
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    sendResetEmail();
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-kreoon-purple-500/20 text-kreoon-purple-400"
        >
          <Mail className="h-8 w-8" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-bold text-kreoon-text-primary">
            ¡Revisa tu correo!
          </h2>
          <p className="text-kreoon-text-primary">
            Enviamos las instrucciones a <strong>{email}</strong>
          </p>
          <p className="text-sm text-kreoon-text-secondary">
            Si no lo ves, revisa tu carpeta de spam
          </p>
        </motion.div>
        <div className="space-y-3">
          <KreoonButton
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onBack}
          >
            Volver al login
          </KreoonButton>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : "¿No recibiste el correo? Reenviar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kreoon-purple-500/20 text-kreoon-purple-400">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-kreoon-text-primary">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-sm text-kreoon-text-secondary">
            No te preocupes, te enviaremos instrucciones para recuperarla
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <KreoonInput
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="tu@ejemplo.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(null);
        }}
        disabled={loading}
      />

      <KreoonButton
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        disabled={loading}
        className="w-full"
      >
        Enviar instrucciones
      </KreoonButton>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300 transition-colors"
      >
        Volver al login
      </button>
    </form>
  );
}

ForgotPasswordForm.displayName = "ForgotPasswordForm";
