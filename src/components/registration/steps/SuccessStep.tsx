import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, Building2, Users, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // If no session (email confirmation required), show different message
  const needsConfirmation = !hasSession;

  // Auto-redirect after 5 seconds if session exists
  useEffect(() => {
    if (!needsConfirmation) {
      const timer = setTimeout(() => navigate(config.route, { replace: true }), 5000);
      return () => clearTimeout(timer);
    }
  }, [needsConfirmation, navigate, config.route]);

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
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30"
      >
        <Check className="h-10 w-10 text-purple-400" />
      </motion.div>

      <h2 className={cn('font-bold text-white mb-2', mode === 'compact' ? 'text-xl' : 'text-2xl')}>
        {needsConfirmation ? 'Confirma tu correo' : config.title}
      </h2>
      <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
        {needsConfirmation
          ? 'Te enviamos un email de verificación. Confirma tu correo y luego inicia sesión para completar tu registro.'
          : config.subtitle
        }
      </p>

      {needsConfirmation ? (
        <button
          onClick={() => navigate('/auth', { replace: true })}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 text-sm transition-colors"
        >
          Ir a iniciar sesión
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => navigate(config.route, { replace: true })}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 text-sm transition-colors"
        >
          {config.cta}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
