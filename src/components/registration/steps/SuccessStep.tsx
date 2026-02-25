import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, Building2, Users, Link2, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RegistrationIntent, WizardMode } from '../types';

interface SuccessStepProps {
  intent: RegistrationIntent | null;
  mode: WizardMode;
  hasSession: boolean;
}

const INTENT_CONFIG: Record<string, {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  cta: string;
  route: string;
  color: string;
}> = {
  talent: {
    icon: Sparkles,
    title: '¡Bienvenido al marketplace!',
    subtitle: 'Tu perfil de talento está listo. Complétalo para que las marcas te encuentren.',
    cta: 'Ir a mi perfil',
    route: '/settings?section=profile&tab=public',
    color: 'text-purple-400',
  },
  brand: {
    icon: Building2,
    title: '¡Marca registrada!',
    subtitle: 'Ya puedes explorar el marketplace y encontrar el talento ideal.',
    cta: 'Explorar talento',
    route: '/marketplace',
    color: 'text-emerald-400',
  },
  organization: {
    icon: Users,
    title: '¡Organización creada!',
    subtitle: 'Tu prueba de 30 días ha comenzado. Invita a tu equipo para empezar.',
    cta: 'Ir al dashboard',
    route: '/dashboard',
    color: 'text-amber-400',
  },
  join: {
    icon: Link2,
    title: '¡Te has unido!',
    subtitle: 'Ya eres parte de la organización. Explora tu nuevo espacio de trabajo.',
    cta: 'Ir al dashboard',
    route: '/creator-dashboard',
    color: 'text-blue-400',
  },
};

export function SuccessStep({ intent, mode, hasSession }: SuccessStepProps) {
  const navigate = useNavigate();
  const config = INTENT_CONFIG[intent || 'talent'];
  const Icon = config.icon;
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If no session (email confirmation required), show different message
  const needsConfirmation = !hasSession;

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-redirect after 5 seconds if session exists
  useEffect(() => {
    if (!needsConfirmation) {
      const timer = setTimeout(() => navigate(config.route, { replace: true }), 5000);
      return () => clearTimeout(timer);
    }
  }, [needsConfirmation, navigate, config.route]);

  const handleResendEmail = async () => {
    // Get email from pending registration data
    const pendingReg = localStorage.getItem('kreoon_pending_registration') || localStorage.getItem('pendingOrgRegistration');
    if (!pendingReg) {
      toast.error('No se encontró información de registro');
      return;
    }

    let email: string | null = null;
    try {
      const parsed = JSON.parse(pendingReg);
      email = parsed.email;
    } catch {
      toast.error('Error al obtener el email');
      return;
    }

    if (!email) {
      toast.error('No se encontró el email de registro');
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin + '/',
        },
      });

      if (error) throw error;

      toast.success('Email reenviado', {
        description: 'Revisa tu bandeja de entrada y la carpeta de spam.',
      });
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      toast.error('Error al reenviar', {
        description: err.message || 'Intenta de nuevo más tarde',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full text-center py-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
        className={cn(
          "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border",
          needsConfirmation
            ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30"
            : "bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/30"
        )}
      >
        {needsConfirmation ? (
          <Mail className="h-10 w-10 text-blue-400" />
        ) : (
          <Check className="h-10 w-10 text-purple-400" />
        )}
      </motion.div>

      <h2 className={cn('font-bold text-white mb-2', mode === 'compact' ? 'text-xl' : 'text-2xl')}>
        {needsConfirmation ? 'Revisa tu correo' : config.title}
      </h2>
      <p className="text-sm text-gray-400 mb-4 max-w-sm mx-auto">
        {needsConfirmation
          ? 'Te enviamos un email de verificación. Confirma tu correo para completar el registro.'
          : config.subtitle
        }
      </p>

      {needsConfirmation && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto">
          <div className="flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-200">¿No ves el email?</p>
              <ul className="text-xs text-amber-300/80 space-y-1">
                <li>• Revisa tu carpeta de <strong>spam</strong> o correo no deseado</li>
                <li>• El email viene de <strong>noreply@mail.app.supabase.io</strong></li>
                <li>• Puede tardar hasta 5 minutos en llegar</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 items-center">
        {needsConfirmation ? (
          <>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 text-sm transition-colors"
            >
              Ya confirmé, ir a iniciar sesión
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleResendEmail}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn("h-4 w-4", resending && "animate-spin")} />
              {resendCooldown > 0
                ? `Reenviar en ${resendCooldown}s`
                : resending
                  ? 'Reenviando...'
                  : 'Reenviar email'
              }
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate(config.route, { replace: true })}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 text-sm transition-colors"
          >
            {config.cta}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
