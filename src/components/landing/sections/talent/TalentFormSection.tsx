import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Check, Loader2, Sparkles, Key,
  ShieldCheck, Clock, DollarSign, X,
  User, Mail, Lock, MapPin, Eye, EyeOff,
  Video, Wand2, Megaphone, Code, GraduationCap, Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KreoonGlassCard } from '@/components/ui/kreoon/KreoonGlassCard';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COUNTRIES } from '@/components/marketplace/types/marketplace';
import { cn } from '@/lib/utils';

// ─── Talent Areas ──────────────────────────────────────────
const TALENT_AREAS = [
  { id: 'content_creation', label: 'Creador de contenido', icon: Video, description: 'UGC, fotos, videos' },
  { id: 'post_production', label: 'Productor/Editor', icon: Wand2, description: 'Edición, motion' },
  { id: 'strategy_marketing', label: 'Marketing', icon: Megaphone, description: 'Social media, ads' },
  { id: 'technology', label: 'Tecnología', icon: Code, description: 'Web, apps, IA' },
  { id: 'education', label: 'Educación', icon: GraduationCap, description: 'Cursos, mentorías' },
] as const;

type TalentArea = typeof TALENT_AREAS[number]['id'];

// ─── Schema ────────────────────────────────────────────────
const registrationSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
  country: z.string().min(1, 'Selecciona tu país'),
  area: z.string().min(1, 'Selecciona tu área'),
  acceptTerms: z.boolean(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).refine(data => data.acceptTerms, {
  message: 'Debes aceptar los términos',
  path: ['acceptTerms'],
});

type RegistrationData = z.infer<typeof registrationSchema>;

// ─── Component ────────────────────────────────────────────
interface TalentFormSectionProps {
  id?: string;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function TalentFormSection({ id, open = true, onClose, onSuccess }: TalentFormSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getTrackingParams, clearUTMParams } = useUTMTracking();
  const analytics = useAnalyticsContext();

  const isModal = onClose != null;
  const referralCode = searchParams.get('ref') || localStorage.getItem('kreoon_referral_code');

  const form = useForm<RegistrationData>({
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: 'CO',
      area: '',
      acceptTerms: false,
    },
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isModal || !open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isModal, open]);

  // ESC to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isModal || !open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, open, handleKeyDown]);

  useEffect(() => {
    analytics.track({ event_name: 'talent_registration_view', event_category: 'engagement', properties: { page: 'talento_landing' } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Submit: Create user + capture lead ──────────────────
  const handleSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);

    try {
      // 1. Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.full_name,
            account_type: 'talent',
            country: data.country,
            talent_area: data.area,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // Check if email confirmation is required
      const hasSession = !!authData.session;
      setNeedsConfirmation(!hasSession);

      // 2. If we have a session, create creator profile
      if (hasSession) {
        const userId = authData.user.id;

        // Update profile
        await supabase
          .from('profiles')
          .update({
            country: data.country,
            active_role: 'creator',
          })
          .eq('id', userId);

        // Create creator_profile
        await (supabase as any)
          .from('creator_profiles')
          .insert({
            user_id: userId,
            display_name: data.full_name,
            location_country: data.country,
            marketplace_roles: [],
            platforms: [],
            categories: data.area ? [data.area] : [],
            content_types: [],
            languages: ['es'],
            social_links: {},
            is_active: true,
            profile_customization: {},
          });

        // Apply referral code if present
        if (referralCode) {
          try {
            await supabase.functions.invoke('referral-service/apply-code', {
              body: { code: referralCode },
              headers: { Authorization: `Bearer ${authData.session.access_token}` },
            });
            localStorage.removeItem('kreoon_referral_code');
          } catch { /* non-critical */ }
        }
      } else {
        // Save pending registration data for after email confirmation
        localStorage.setItem('kreoon_pending_registration', JSON.stringify({
          email: data.email,
          intent: 'talent',
          locationCountry: data.country,
          categories: data.area ? [data.area] : [],
          referralCode,
        }));
      }

      // 3. Capture lead for CRM (fire and forget)
      const trackingParams = getTrackingParams();
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          country: data.country,
          lead_type: 'talent',
          registration_intent: 'talent',
          talent_category: data.area,
          referral_code: referralCode,
          ...trackingParams,
        }),
      }).catch(() => { /* ignore CRM errors */ });

      analytics.track({
        event_name: 'signup_completed',
        event_category: 'conversion',
        properties: { method: 'email', intent: 'talent' },
      });

      clearUTMParams();
      setSubmitSuccess(true);

      if (hasSession) {
        toast.success('¡Bienvenido a KREOON!', {
          description: 'Tu cuenta ha sido creada. Completa tu perfil para recibir propuestas.',
        });
      } else {
        toast.success('Revisa tu correo', {
          description: 'Te enviamos un email de verificación.',
        });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Registration error:', error);
      const msg = error.message?.includes('already registered')
        ? 'Este correo ya está registrado'
        : error.message || 'Ocurrió un error al registrar';
      toast.error(msg);
      analytics.track({ event_name: 'signup_error', event_category: 'engagement', properties: { error: msg } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if modal mode and not open
  if (isModal && !open) return null;

  // ─── Success screen ─────────────────────────────────────
  if (submitSuccess) {
    const successContent = (
      <div className="mx-auto max-w-md text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-green-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-kreoon-text-primary mb-3">
            {needsConfirmation ? 'Revisa tu correo' : '¡Cuenta creada!'}
          </h2>
          <p className="text-sm text-kreoon-text-secondary mb-4">
            {needsConfirmation
              ? 'Te enviamos un email de verificación. Confirma tu correo para activar tu cuenta.'
              : 'Tu cuenta está lista. Ahora necesitas obtener 3 llaves para desbloquear la plataforma.'}
          </p>

          {/* Keys explanation (only for confirmed users) */}
          {!needsConfirmation && (
            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-purple-400" />
                <span className="font-semibold text-white text-sm">Sistema de Llaves</span>
              </div>
              <ul className="text-xs text-kreoon-text-secondary space-y-1">
                <li>1. Comparte tu link de referido con otros creadores</li>
                <li>2. Ellos completan su perfil (foto + portafolio)</li>
                <li>3. Con 3 llaves desbloqueas acceso completo</li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {needsConfirmation ? (
              <>
                <Button
                  onClick={() => navigate('/auth', { replace: true })}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Ya confirmé, iniciar sesión
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-xs text-kreoon-text-muted">
                  Revisa también tu carpeta de spam. El email viene de noreply@mail.app.supabase.io
                </p>
              </>
            ) : (
              <Button
                onClick={() => navigate('/welcome-talent', { replace: true })}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {isModal && (
              <Button variant="outline" className="w-full border-white/20" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );

    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-2xl border border-kreoon-border bg-kreoon-bg-primary p-6 sm:p-8"
          >
            <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            {successContent}
          </motion.div>
        </div>
      );
    }

    return (
      <section id={id} className="bg-kreoon-bg-primary py-20 md:py-28">
        <div className="mx-auto max-w-md px-4">{successContent}</div>
      </section>
    );
  }

  // ─── Form content ─────────────────────────────────────────
  const formContent = (
    <>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className={`font-bold tracking-tight text-kreoon-text-primary ${isModal ? 'text-xl sm:text-2xl' : 'text-2xl md:text-3xl'}`}>
          Únete a KREOON gratis
        </h2>
        <p className="text-sm text-kreoon-text-secondary mt-2">
          Crea tu cuenta en 30 segundos y configura tu perfil después
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Full name */}
        <div>
          <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
            <User className="w-3.5 h-3.5" /> Nombre completo
          </label>
          <Input
            {...form.register('full_name')}
            placeholder="Tu nombre completo"
            className="bg-white/5 border-white/10 h-11"
            autoFocus
          />
          {form.formState.errors.full_name && (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
            <Mail className="w-3.5 h-3.5" /> Email
          </label>
          <Input
            {...form.register('email')}
            type="email"
            placeholder="tu@email.com"
            className="bg-white/5 border-white/10 h-11"
          />
          {form.formState.errors.email && (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
            <Lock className="w-3.5 h-3.5" /> Contraseña
          </label>
          <div className="relative">
            <Input
              {...form.register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              className="bg-white/5 border-white/10 h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
            <Lock className="w-3.5 h-3.5" /> Confirmar contraseña
          </label>
          <Input
            {...form.register('confirmPassword')}
            type={showPassword ? 'text' : 'password'}
            placeholder="Repite la contraseña"
            className="bg-white/5 border-white/10 h-11"
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
            <MapPin className="w-3.5 h-3.5" /> País
          </label>
          <select
            {...form.register('country')}
            className="w-full h-11 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} className="bg-gray-900 text-white">
                {c.flag} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Talent Area */}
        <div>
          <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-2">
            <Briefcase className="w-3.5 h-3.5" /> ¿En qué área te especializas?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TALENT_AREAS.map(area => {
              const Icon = area.icon;
              const isSelected = form.watch('area') === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => form.setValue('area', area.id, { shouldValidate: true })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all',
                    isSelected
                      ? 'border-purple-500/60 bg-purple-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-kreoon-text-secondary hover:border-white/20'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isSelected ? 'text-purple-400' : 'text-kreoon-text-muted')} />
                  <span className="text-xs font-medium leading-tight">{area.label}</span>
                </button>
              );
            })}
          </div>
          {form.formState.errors.area && (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.area.message}</p>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 cursor-pointer pt-2">
          <input
            type="checkbox"
            {...form.register('acceptTerms')}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30"
          />
          <span className="text-xs text-kreoon-text-muted leading-relaxed">
            Acepto los{' '}
            <a href="/terminos" target="_blank" className="text-purple-400 hover:underline">Términos</a>
            {' '}y{' '}
            <a href="/privacidad" target="_blank" className="text-purple-400 hover:underline">Política de Privacidad</a>
          </span>
        </label>
        {form.formState.errors.acceptTerms && (
          <p className="text-red-400 text-xs">{form.formState.errors.acceptTerms.message}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-base font-semibold"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando cuenta...</>
          ) : (
            <>Crear mi cuenta <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>

        <div className="flex items-center justify-center gap-4 text-xs text-kreoon-text-muted pt-1">
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-400" /> Gratis
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-kreoon-purple-400" /> Datos protegidos
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-400" /> 30 seg
          </span>
        </div>

        <p className="text-center text-kreoon-text-muted text-xs">
          ¿Ya tienes cuenta?{' '}
          <a href="/auth" className="text-purple-400 hover:underline">Inicia sesión</a>
        </p>
      </form>
    </>
  );

  // ─── Modal mode ────────────────────────────────────────
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-kreoon-border bg-kreoon-bg-primary p-5 sm:p-6 shadow-kreoon-glow-sm"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {formContent}
        </motion.div>
      </div>
    );
  }

  // ─── Inline section mode ───────────────────────────────
  return (
    <section id={id} className="relative bg-kreoon-bg-primary py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
      <div className="relative mx-auto max-w-md px-4 lg:px-8">
        <KreoonGlassCard intensity="strong" className="p-6 md:p-8">
          {formContent}
        </KreoonGlassCard>
      </div>
    </section>
  );
}
