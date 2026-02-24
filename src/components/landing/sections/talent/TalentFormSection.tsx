import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Video, Wand2, Megaphone, Code, GraduationCap,
  ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
  Instagram, Music2, ShieldCheck, Clock, DollarSign, X,
  User, Mail, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KreoonGlassCard } from '@/components/ui/kreoon/KreoonGlassCard';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import {
  TALENT_CATEGORY_LABELS,
  SPECIFIC_ROLE_LABELS,
  CATEGORY_ROLES,
  type TalentCategory,
  type SpecificRole,
} from '@/types/crm.types';

// ─── Constants ────────────────────────────────────────────
const MAX_CATEGORIES = 2;
const MAX_ROLES = 4;
const TOTAL_STEPS = 2;

const CATEGORY_TO_SUBTYPE: Record<TalentCategory, 'creator' | 'editor'> = {
  content_creation: 'creator',
  post_production: 'editor',
  strategy_marketing: 'creator',
  technology: 'editor',
  education: 'creator',
  client: 'creator',
};

const CATEGORIES: {
  key: TalentCategory;
  icon: React.ElementType;
  color: string;
  description: string;
}[] = [
  { key: 'content_creation', icon: Video, color: 'from-pink-500 to-rose-500', description: 'UGC, fotos, videos, streaming' },
  { key: 'post_production', icon: Wand2, color: 'from-purple-500 to-violet-500', description: 'Edición, motion, animación' },
  { key: 'strategy_marketing', icon: Megaphone, color: 'from-blue-500 to-cyan-500', description: 'Social media, growth, ads' },
  { key: 'technology', icon: Code, color: 'from-green-500 to-emerald-500', description: 'Desarrollo web, apps, IA' },
  { key: 'education', icon: GraduationCap, color: 'from-yellow-500 to-orange-500', description: 'Cursos, talleres, mentorías' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Principiante', description: '< 1 año' },
  { value: 'intermediate', label: 'Intermedio', description: '1-3 años' },
  { value: 'advanced', label: 'Avanzado', description: '3-5 años' },
  { value: 'expert', label: 'Experto', description: '+5 años' },
];

// ─── Schemas ──────────────────────────────────────────────
const step1Schema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
});

const step2Schema = z.object({
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  city: z.string().optional(),
  portfolio_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

// ─── Component ────────────────────────────────────────────
interface TalentFormSectionProps {
  id?: string;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function TalentFormSection({ id, open = true, onClose, onSuccess }: TalentFormSectionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Multi-select state (step 2)
  const [selectedCategories, setSelectedCategories] = useState<TalentCategory[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<SpecificRole[]>([]);

  const { getTrackingParams, clearUTMParams } = useUTMTracking();
  const analytics = useAnalyticsContext();

  const isModal = onClose != null;

  const step1Form = useForm<Step1Data>({
    mode: 'onChange',
    defaultValues: { full_name: '', email: '', phone: '' },
  });

  const step2Form = useForm<Step2Data>({
    mode: 'onChange',
    defaultValues: { experience_level: undefined, city: '', portfolio_url: '', instagram: '', tiktok: '' },
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
    analytics.track({ event_name: 'form_step_view', event_category: 'engagement', properties: { step: currentStep, page: 'talento_landing' } });
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // When categories change, prune orphan roles
  useEffect(() => {
    const validRoles = new Set(selectedCategories.flatMap((cat) => CATEGORY_ROLES[cat] || []));
    setSelectedRoles((prev) => prev.filter((r) => validRoles.has(r)));
  }, [selectedCategories]);

  const availableRoles = useMemo(() => {
    const seen = new Set<SpecificRole>();
    const roles: { role: SpecificRole; category: TalentCategory }[] = [];
    for (const cat of selectedCategories) {
      for (const role of CATEGORY_ROLES[cat] || []) {
        if (!seen.has(role)) {
          seen.add(role);
          roles.push({ role, category: cat });
        }
      }
    }
    return roles;
  }, [selectedCategories]);

  const toggleCategory = (cat: TalentCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= MAX_CATEGORIES) return prev;
      return [...prev, cat];
    });
  };

  const toggleRole = (role: SpecificRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) return prev.filter((r) => r !== role);
      if (prev.length >= MAX_ROLES) return prev;
      return [...prev, role];
    });
  };

  // ─── Step 1: Submit basic data → create lead immediately ──
  const handleStep1Submit = async (data: Step1Data) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trackingParams = getTrackingParams();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-lead`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: data.full_name,
            email: data.email,
            phone: data.phone || undefined,
            lead_type: 'talent',
            registration_intent: 'talent',
            ...trackingParams,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        analytics.trackLeadCaptured({
          lead_id: result.lead_id,
          score: result.score,
          lead_type: 'talent',
        });
        analytics.track({ event_name: 'form_step_complete', event_category: 'engagement', properties: { step: 1 } });

        setLeadId(result.lead_id);
        clearUTMParams();
        setCurrentStep(2);
      } else {
        throw new Error(result.error || 'Error al registrar');
      }
    } catch (error) {
      console.error('Error submitting step 1:', error);
      setSubmitError((error as Error).message);
      analytics.track({ event_name: 'form_error', event_category: 'engagement', properties: { error: (error as Error).message, step: 1 } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Step 2: Enrich lead with profile data ────────────────
  const handleStep2Submit = async (data: Step2Data) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const subtypes = new Set(selectedCategories.map((c) => CATEGORY_TO_SUBTYPE[c]));
      const derivedSubtype = subtypes.size > 1 ? 'both' : (subtypes.values().next().value || 'creator');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-lead`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Re-send identity so the edge function can upsert
            full_name: step1Form.getValues('full_name'),
            email: step1Form.getValues('email'),
            phone: step1Form.getValues('phone') || undefined,
            city: data.city || undefined,
            portfolio_url: data.portfolio_url || undefined,
            talent_category: selectedCategories[0] || undefined,
            specific_role: selectedRoles[0] || undefined,
            talent_subtype: derivedSubtype,
            experience_level: data.experience_level || undefined,
            talent_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            specific_roles: selectedRoles.length > 0 ? selectedRoles : undefined,
            lead_type: 'talent',
            registration_intent: 'talent',
            social_profiles: {
              instagram: data.instagram || null,
              tiktok: data.tiktok || null,
            },
            lead_id: leadId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        analytics.track({ event_name: 'form_step_complete', event_category: 'engagement', properties: { step: 2 } });
        setSubmitSuccess(true);
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Error submitting step 2:', error);
      // Still show success — the lead is already saved from step 1
      setSubmitSuccess(true);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipStep2 = () => {
    analytics.track({ event_name: 'form_step_skipped', event_category: 'engagement', properties: { step: 2 } });
    setSubmitSuccess(true);
    onSuccess?.();
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
            ¡Bienvenido a Kreoon!
          </h2>
          <p className="text-kreoon-text-secondary mb-6">
            Te enviamos un email con los próximos pasos para activar tu cuenta.
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <a href="/register">Crear mi cuenta ahora</a>
            </Button>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-kreoon-border bg-kreoon-bg-primary p-6 sm:p-8"
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
          {currentStep === 1 ? 'Únete a Kreoon gratis' : 'Cuéntanos más sobre ti'}
        </h2>
        <p className="text-sm text-kreoon-text-secondary mt-2">
          {currentStep === 1
            ? 'Acceso anticipado Early Bird — sin costo, sin compromisos'
            : 'Esto nos ayuda a conectarte con las mejores oportunidades (opcional)'}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex gap-2">
          {[1, 2].map((step) => (
            <div key={step} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${currentStep >= step ? 'bg-purple-500' : 'bg-white/10'}`} />
              <p className={`text-[11px] mt-1.5 ${currentStep >= step ? 'text-purple-400' : 'text-white/30'}`}>
                {step === 1 ? 'Datos básicos' : 'Tu perfil'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {/* ── Step 1: Basic contact ── */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
                  <User className="w-3.5 h-3.5" /> Nombre completo
                </label>
                <Input
                  {...step1Form.register('full_name', { required: 'Nombre requerido', minLength: { value: 2, message: 'Muy corto' } })}
                  placeholder="Tu nombre completo"
                  className="bg-white/5 border-white/10 h-11"
                  autoFocus
                />
                {step1Form.formState.errors.full_name && (
                  <p className="text-red-400 text-xs mt-1">{step1Form.formState.errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp
                </label>
                <Input
                  {...step1Form.register('phone')}
                  placeholder="+57 300 123 4567"
                  className="bg-white/5 border-white/10 h-11"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-kreoon-text-secondary mb-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <Input
                  {...step1Form.register('email', { required: 'Email requerido', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email inválido' } })}
                  type="email"
                  placeholder="tu@email.com"
                  className="bg-white/5 border-white/10 h-11"
                />
                {step1Form.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{step1Form.formState.errors.email.message}</p>
                )}
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {submitError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !step1Form.formState.isValid}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-base font-semibold"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</>
                ) : (
                  <>Quiero unirme <ArrowRight className="w-4 h-4 ml-2" /></>
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

              <p className="text-center text-kreoon-text-muted text-[11px]">
                Al registrarte aceptas nuestros{' '}
                <a href="/terminos" className="underline">Términos</a> y{' '}
                <a href="/privacidad" className="underline">Política de Privacidad</a>
              </p>
            </form>
          </motion.div>
        )}

        {/* ── Step 2: Profile enrichment ── */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-5">
              {/* Categories */}
              <div>
                <p className="text-sm text-kreoon-text-secondary mb-2">
                  ¿En qué áreas te especializas?
                  <span className="ml-1 text-kreoon-purple-400 text-xs">
                    (hasta {MAX_CATEGORIES})
                  </span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategories.includes(cat.key);
                    const isDisabled = !isSelected && selectedCategories.length >= MAX_CATEGORIES;

                    return (
                      <button
                        type="button"
                        key={cat.key}
                        onClick={() => toggleCategory(cat.key)}
                        disabled={isDisabled}
                        className={`relative p-3 rounded-xl text-center border transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/10'
                            : isDisabled
                              ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                              : 'border-white/10 bg-white/5 hover:border-white/20 cursor-pointer'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <div className={`w-9 h-9 mx-auto mb-1.5 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="font-medium text-xs text-kreoon-text-primary leading-tight">{TALENT_CATEGORY_LABELS[cat.key]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Roles */}
              {selectedCategories.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                  <p className="text-sm text-kreoon-text-secondary mb-2">
                    Roles específicos
                    <span className="ml-1 text-kreoon-purple-400 text-xs">
                      (hasta {MAX_ROLES})
                    </span>
                  </p>
                  {selectedCategories.map((cat) => {
                    const catRoles = CATEGORY_ROLES[cat] || [];
                    if (catRoles.length === 0) return null;
                    return (
                      <div key={cat} className="mb-2">
                        <p className="text-[11px] font-medium text-kreoon-text-muted uppercase tracking-wider mb-1.5">
                          {TALENT_CATEGORY_LABELS[cat]}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {catRoles.map((role: SpecificRole) => {
                            const isSelected = selectedRoles.includes(role);
                            const isDisabled = !isSelected && selectedRoles.length >= MAX_ROLES;
                            return (
                              <button
                                type="button"
                                key={role}
                                onClick={() => toggleRole(role)}
                                disabled={isDisabled}
                                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-500/20 text-white'
                                    : isDisabled
                                      ? 'border-white/5 text-white/30 cursor-not-allowed'
                                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 cursor-pointer'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 inline mr-1 text-purple-400" />}
                                {SPECIFIC_ROLE_LABELS[role]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Experience */}
              {selectedCategories.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                  <p className="text-sm text-kreoon-text-secondary mb-2">Experiencia</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPERIENCE_OPTIONS.map((option) => {
                      const isSelected = step2Form.watch('experience_level') === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`p-2 rounded-lg cursor-pointer text-center border transition-all ${
                            isSelected ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <input type="radio" value={option.value} {...step2Form.register('experience_level')} className="sr-only" />
                          <p className="font-medium text-xs text-kreoon-text-primary">{option.label}</p>
                          <p className="text-[10px] text-kreoon-text-muted">{option.description}</p>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Social + extras */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-kreoon-text-secondary mb-1.5">
                    <Instagram className="w-3 h-3" /> Instagram
                  </label>
                  <Input {...step2Form.register('instagram')} placeholder="@usuario" className="bg-white/5 border-white/10 h-9 text-sm" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-kreoon-text-secondary mb-1.5">
                    <Music2 className="w-3 h-3" /> TikTok
                  </label>
                  <Input {...step2Form.register('tiktok')} placeholder="@usuario" className="bg-white/5 border-white/10 h-9 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-kreoon-text-secondary mb-1.5 block">Ciudad</label>
                  <Input {...step2Form.register('city')} placeholder="Tu ciudad" className="bg-white/5 border-white/10 h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-kreoon-text-secondary mb-1.5 block">Portafolio</label>
                  <Input {...step2Form.register('portfolio_url')} placeholder="https://..." className="bg-white/5 border-white/10 h-9 text-sm" />
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipStep2}
                  className="flex-1 border-white/20 text-sm"
                >
                  Omitir
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-sm font-semibold"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                  ) : (
                    <>Completar perfil <Sparkles className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ─── Modal mode ────────────────────────────────────────
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-kreoon-border bg-kreoon-bg-primary p-5 sm:p-6 shadow-kreoon-glow-sm"
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
      <div className="relative mx-auto max-w-lg px-4 lg:px-8">
        <KreoonGlassCard intensity="strong" className="p-6 md:p-8">
          {formContent}
        </KreoonGlassCard>
      </div>
    </section>
  );
}
