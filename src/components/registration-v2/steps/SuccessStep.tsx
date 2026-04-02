import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, Loader2, RefreshCw, ArrowRight, Sparkles, Key } from 'lucide-react';
import { motion } from 'framer-motion';
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
    if (userType === 'freelancer' && !orgSlug) {
      return '/unlock-access';
    }
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

  const showEmailConfirmation = requiresEmailConfirmation && !hasSession;

  return (
    <div className="relative min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* === FONDO OSCURO === */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a]" />

      {/* Glow púrpura superior */}
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Partículas decorativas sutiles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-1/4 w-1 h-1 bg-purple-400/30 rounded-full"
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 right-1/4 w-1.5 h-1.5 bg-purple-500/20 rounded-full"
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-1/3 w-1 h-1 bg-purple-300/25 rounded-full"
          animate={{ y: [0, -15, 0], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* === CONTENIDO PRINCIPAL === */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Glass Card principal */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(15, 15, 30, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="flex flex-col items-center text-center space-y-6">

            {/* Badge superior */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: 'rgb(167, 139, 250)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Registro completado
            </motion.div>

            {/* Icono principal con glow */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
              }}
              className="relative"
            >
              {/* Glow ring externo */}
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                  transform: 'scale(1.5)',
                  filter: 'blur(20px)',
                }}
              />

              {/* Contenedor del icono */}
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
                }}
              >
                {showEmailConfirmation ? (
                  <Mail className="w-10 h-10 text-purple-400" />
                ) : (
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                )}
              </div>
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            >
              {getSuccessMessage()}
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-white/60 text-base leading-relaxed"
            >
              {getNextStepMessage()}
            </motion.p>

            {/* Contenido según estado */}
            {showEmailConfirmation ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full space-y-4"
              >
                {/* Email badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Mail className="w-4 h-4 text-white/50" />
                  <span className="text-sm text-white/80 font-medium">{email}</span>
                </div>

                {/* Botón de reenvío */}
                <button
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0 || isResending}
                  className={cn(
                    "w-full py-3 px-6 rounded-full font-medium transition-all duration-200",
                    resendCooldown > 0 || isResending
                      ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                      : "bg-transparent text-white/80 border border-white/20 hover:bg-white/5 hover:border-white/30"
                  )}
                >
                  {isResending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </span>
                  ) : resendCooldown > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Reenviar en {resendCooldown}s
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Reenviar correo
                    </span>
                  )}
                </button>

                {/* Texto de ayuda */}
                <p className="text-xs text-white/40">
                  ¿No encuentras el correo? Revisa tu carpeta de spam.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full space-y-4"
              >
                {/* Countdown badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                  <span className="text-sm text-white/80">
                    Redirigiendo en {countdown}...
                  </span>
                </div>

                {/* Botón principal - Ir ahora */}
                <button
                  onClick={() => navigate(redirectPath)}
                  className="w-full py-3.5 px-6 rounded-full font-medium text-white transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(139, 92, 246) 100%)',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 30px rgba(139, 92, 246, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Cards informativas según tipo de usuario */}
        {userType === 'organization' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 rounded-sm"
            style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-sm bg-purple-500/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">
                  ¡30 días de prueba activados!
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Explora todas las funciones sin límites.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {userType === 'freelancer' && !orgSlug && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 rounded-sm"
            style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-sm bg-purple-500/10">
                <Key className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">
                  Sistema de Llaves
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Obtén 3 llaves invitando creadores para desbloquear la plataforma.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {userType === 'freelancer' && orgSlug && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 rounded-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-sm bg-white/5">
                <ArrowRight className="w-5 h-5 text-white/60" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white/80">
                  Próximo paso
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Completa tu perfil para aparecer en el marketplace.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
