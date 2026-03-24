import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { UserType } from '../types';

interface SuccessStepProps {
  email: string;
  userType: UserType;
  requiresEmailConfirmation: boolean;
  orgSlug?: string;
}

export function SuccessStep({
  email,
  userType,
  requiresEmailConfirmation,
  orgSlug,
}: SuccessStepProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasSession, setHasSession] = useState(false);

  // Verificar si hay sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    checkSession();
  }, []);

  // Determinar destino según tipo de usuario
  const getRedirectPath = () => {
    // Freelancers sin organización van a unlock-access para el sistema de llaves
    if (userType === 'freelancer' && !orgSlug) {
      return '/unlock-access';
    }
    // El resto va a completar perfil
    return '/settings?section=profile';
  };

  const redirectPath = getRedirectPath();

  // Auto-redirect si hay sesión
  useEffect(() => {
    if (!hasSession) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasSession, navigate, redirectPath]);

  // Cooldown de reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const emailRedirectTo = orgSlug
        ? `${window.location.origin}/register/${orgSlug}?confirmed=true`
        : `${window.location.origin}/`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw error;

      setResendCooldown(60);
    } catch (err) {
      console.error('Error resending email:', err);
    } finally {
      setIsResending(false);
    }
  };

  const getSuccessMessage = () => {
    switch (userType) {
      case 'freelancer':
        return '¡Tu perfil de creador está listo!';
      case 'brand':
      case 'client':
        return '¡Tu cuenta de marca está lista!';
      case 'organization':
        return '¡Tu organización ha sido creada!';
      default:
        return '¡Tu cuenta está lista!';
    }
  };

  const getNextStepMessage = () => {
    if (requiresEmailConfirmation && !hasSession) {
      return 'Revisa tu correo para confirmar tu cuenta y comenzar.';
    }
    return 'Serás redirigido para completar tu perfil.';
  };

  return (
    <div className="text-center space-y-6">
      {/* Success icon */}
      <div className="relative mx-auto w-20 h-20">
        {requiresEmailConfirmation && !hasSession ? (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <Mail className="h-10 w-10 text-primary" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
        )}

        {/* Animated ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping opacity-30" />
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">
          {getSuccessMessage()}
        </h1>
        <p className="text-white/60">
          {getNextStepMessage()}
        </p>
      </div>

      {/* Email confirmation section */}
      {requiresEmailConfirmation && !hasSession ? (
        <div className="space-y-4">
          {/* Email badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Mail className="h-4 w-4 text-white/60" />
            <span className="text-sm text-white/80">{email}</span>
          </div>

          {/* Resend button */}
          <div>
            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || isResending}
              className={cn(
                "inline-flex items-center gap-2 text-sm transition-colors",
                resendCooldown > 0 || isResending
                  ? "text-white/40 cursor-not-allowed"
                  : "text-primary hover:text-primary/80"
              )}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Reenviar en {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Reenviar correo
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-white/40">
            ¿No encuentras el correo? Revisa tu carpeta de spam.
          </p>
        </div>
      ) : (
        // Auto-redirect countdown
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
            <span className="text-sm text-white/80">
              Redirigiendo en {countdown}...
            </span>
          </div>

          <div>
            <button
              onClick={() => navigate(redirectPath)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Ir ahora →
            </button>
          </div>
        </div>
      )}

      {/* Additional info for specific types */}
      {userType === 'organization' && (
        <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-white/80">
            <strong className="text-white">¡Tu prueba de 30 días ha comenzado!</strong>
            <br />
            Explora todas las funciones sin límites.
          </p>
        </div>
      )}

      {userType === 'freelancer' && !orgSlug && (
        <div className="mt-8 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-sm text-white/80">
            <strong className="text-white">Sistema de Llaves</strong>
            <br />
            <span className="text-white/60">
              Obtén 3 llaves invitando creadores para desbloquear la plataforma.
            </span>
          </p>
        </div>
      )}

      {userType === 'freelancer' && orgSlug && (
        <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-white/60">
            <strong className="text-white/80">Próximo paso:</strong>
            <br />
            Completa tu perfil para aparecer en el marketplace.
          </p>
        </div>
      )}
    </div>
  );
}
