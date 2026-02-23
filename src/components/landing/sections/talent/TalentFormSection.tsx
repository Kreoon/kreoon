import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Video, Wand2, Megaphone, Code, GraduationCap,
  ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
  Instagram, Music2, ShieldCheck, Clock, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KreoonGlassCard } from '@/components/ui/kreoon/KreoonGlassCard';
import { useUTMTracking, useTrackEvent } from '@/hooks/useUTMTracking';
import {
  TALENT_CATEGORY_LABELS,
  SPECIFIC_ROLE_LABELS,
  CATEGORY_ROLES,
  type TalentCategory,
  type SpecificRole,
} from '@/types/crm.types';
import { FADE_IN_UP, useScrollAnimation, withDelay } from '@/lib/animations';

// ─── Constants ────────────────────────────────────────────
const MAX_CATEGORIES = 2;
const MAX_ROLES = 4;

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
  { value: 'beginner', label: 'Principiante', description: 'Menos de 1 año' },
  { value: 'intermediate', label: 'Intermedio', description: '1-3 años' },
  { value: 'advanced', label: 'Avanzado', description: '3-5 años' },
  { value: 'expert', label: 'Experto', description: '+5 años' },
];

const TOTAL_STEPS = 2;

// ─── Form schema (contact fields only — categories/roles managed via state) ──
const formSchema = z.object({
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  city: z.string().optional(),
  portfolio_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Component ────────────────────────────────────────────
interface TalentFormSectionProps {
  id?: string;
  onSuccess?: () => void;
}

export default function TalentFormSection({ id, onSuccess }: TalentFormSectionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Multi-select state
  const [selectedCategories, setSelectedCategories] = useState<TalentCategory[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<SpecificRole[]>([]);

  const { getTrackingParams, clearUTMParams } = useUTMTracking();
  const { trackEvent } = useTrackEvent();
  const scrollAnim = useScrollAnimation();

  const form = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      experience_level: undefined,
      full_name: '',
      email: '',
      phone: '',
      city: '',
      portfolio_url: '',
      instagram: '',
      tiktok: '',
    },
  });

  const { watch, trigger } = form;

  useEffect(() => {
    trackEvent('form_step_view', { step: currentStep, page: 'talento_landing' });
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // When categories change, remove roles that no longer belong to any selected category
  useEffect(() => {
    const validRoles = new Set(selectedCategories.flatMap((cat) => CATEGORY_ROLES[cat] || []));
    setSelectedRoles((prev) => prev.filter((r) => validRoles.has(r)));
  }, [selectedCategories]);

  // Compute available roles as union of all selected categories (deduplicated, preserving order)
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

  // ─── Toggle handlers ────────────────────────────────────
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

  // ─── Step navigation ────────────────────────────────────
  const handleNextStep = async () => {
    if (currentStep === 1) {
      const experienceValid = await trigger('experience_level');
      if (selectedCategories.length === 0 || !experienceValid) return;
      trackEvent('form_step_complete', { step: currentStep });
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // ─── Submit ─────────────────────────────────────────────
  const handleSubmit = async (data: FormData) => {
    if (selectedRoles.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trackingParams = getTrackingParams();

      // Derive subtype: if mixed creator+editor categories → 'both'
      const subtypes = new Set(selectedCategories.map((c) => CATEGORY_TO_SUBTYPE[c]));
      const derivedSubtype = subtypes.size > 1 ? 'both' : (subtypes.values().next().value || 'creator');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-lead`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: data.full_name,
            email: data.email,
            phone: data.phone || undefined,
            city: data.city || undefined,
            portfolio_url: data.portfolio_url || undefined,
            // Primary values (backward compat)
            talent_category: selectedCategories[0],
            specific_role: selectedRoles[0],
            talent_subtype: derivedSubtype,
            experience_level: data.experience_level,
            // Full multi-select arrays
            talent_categories: selectedCategories,
            specific_roles: selectedRoles,
            lead_type: 'talent',
            registration_intent: 'talent',
            social_profiles: {
              instagram: data.instagram || null,
              tiktok: data.tiktok || null,
            },
            ...trackingParams,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        trackEvent('lead_captured', {
          lead_id: result.lead_id,
          score: result.score,
          categories: selectedCategories,
          roles: selectedRoles,
        });

        clearUTMParams();
        setSubmitSuccess(true);
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Error al registrar');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError((error as Error).message);
      trackEvent('form_error', { error: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success screen ─────────────────────────────────────
  if (submitSuccess) {
    return (
      <section id={id} className="bg-kreoon-bg-primary py-20 md:py-28">
        <div className="mx-auto max-w-md px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>

            <h2 className="text-3xl font-bold text-kreoon-text-primary mb-4">
              ¡Bienvenido a Kreoon!
            </h2>
            <p className="text-kreoon-text-secondary mb-8">
              Te enviamos un mensaje a tu email con los próximos pasos para activar
              tu cuenta.
            </p>

            <div className="space-y-4">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                <a href="/register">Crear mi cuenta ahora</a>
              </Button>
              <p className="text-kreoon-text-muted text-sm">
                O revisa tu email para más información
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // ─── Form section ───────────────────────────────────────
  return (
    <section id={id} className="relative bg-kreoon-bg-primary py-20 md:py-28">
      {/* Glow behind form */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 lg:px-8">
        {/* Section header */}
        <motion.div variants={FADE_IN_UP} {...scrollAnim} className="text-center mb-10">
          <p className="text-sm font-medium text-kreoon-purple-400 uppercase tracking-wider mb-3">
            Registro gratuito
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl mb-4">
            Únete ahora y empieza a monetizar
          </h2>

          {/* Social proof */}
          <div className="inline-flex items-center gap-2 rounded-full border border-kreoon-border bg-kreoon-bg-card/50 px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-kreoon-text-secondary">
              127 creadores se unieron esta semana
            </span>
          </div>
        </motion.div>

        {/* Form card */}
        <motion.div variants={withDelay(FADE_IN_UP, 0.15)} {...scrollAnim}>
          <KreoonGlassCard intensity="strong" className="p-6 md:p-8">
            {/* Progress bar — 2 steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2].map((step) => (
                  <div
                    key={step}
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      currentStep >= step
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {currentStep > step ? <Check className="w-4 h-4" /> : step}
                  </div>
                ))}
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Form steps */}
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <AnimatePresence mode="wait">
                {/* ── Step 1: Categories + Experience ── */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-kreoon-text-primary mb-1">
                        ¿En qué áreas te especializas?
                      </h3>
                      <p className="text-sm text-kreoon-text-secondary">
                        Selecciona hasta {MAX_CATEGORIES} nichos
                        <span className="ml-2 text-kreoon-purple-400 font-medium">
                          ({selectedCategories.length}/{MAX_CATEGORIES})
                        </span>
                      </p>
                    </div>

                    {/* Categories — multi-select */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                            className={`relative p-4 rounded-xl text-center border-2 transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-500/10'
                                : isDisabled
                                  ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 hover:border-white/20 cursor-pointer'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className={`w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-medium text-sm text-kreoon-text-primary">{TALENT_CATEGORY_LABELS[cat.key]}</p>
                            <p className="text-xs text-kreoon-text-muted mt-0.5">{cat.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Experience */}
                    {selectedCategories.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                        <label className="block text-sm text-kreoon-text-secondary mb-3">Nivel de experiencia</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {EXPERIENCE_OPTIONS.map((option) => {
                            const isSelected = watch('experience_level') === option.value;
                            return (
                              <label
                                key={option.value}
                                className={`p-3 rounded-lg cursor-pointer text-center border transition-all ${
                                  isSelected ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                              >
                                <input type="radio" value={option.value} {...form.register('experience_level')} className="sr-only" />
                                <p className="font-medium text-sm text-kreoon-text-primary">{option.label}</p>
                                <p className="text-xs text-kreoon-text-muted">{option.description}</p>
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    <Button
                      type="button"
                      onClick={handleNextStep}
                      disabled={selectedCategories.length === 0 || !watch('experience_level')}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                      Continuar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}

                {/* ── Step 2: Roles + Contact info ── */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-kreoon-text-primary mb-1">
                        ¿Qué haces específicamente?
                      </h3>
                      <p className="text-sm text-kreoon-text-secondary">
                        Selecciona hasta {MAX_ROLES} roles
                        <span className="ml-2 text-kreoon-purple-400 font-medium">
                          ({selectedRoles.length}/{MAX_ROLES})
                        </span>
                      </p>
                    </div>

                    {/* Roles grouped by category */}
                    <div className="space-y-4">
                      {selectedCategories.map((cat) => {
                        const catRoles = (CATEGORY_ROLES[cat] || []);
                        if (catRoles.length === 0) return null;

                        return (
                          <div key={cat}>
                            <p className="text-xs font-medium text-kreoon-text-muted uppercase tracking-wider mb-2">
                              {TALENT_CATEGORY_LABELS[cat]}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {catRoles.map((role: SpecificRole) => {
                                const isSelected = selectedRoles.includes(role);
                                const isDisabled = !isSelected && selectedRoles.length >= MAX_ROLES;

                                return (
                                  <button
                                    type="button"
                                    key={role}
                                    onClick={() => toggleRole(role)}
                                    disabled={isDisabled}
                                    className={`p-3 rounded-lg text-sm text-left border transition-all ${
                                      isSelected
                                        ? 'border-purple-500 bg-purple-500/20 text-white'
                                        : isDisabled
                                          ? 'border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed'
                                          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 cursor-pointer'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                                      {SPECIFIC_ROLE_LABELS[role]}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Contact info — shown after at least 1 role selected */}
                    {selectedRoles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="h-px bg-kreoon-border" />

                        <p className="text-sm text-kreoon-text-secondary">Datos de contacto</p>

                        <div className="grid gap-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-kreoon-text-secondary mb-2">Nombre completo *</label>
                              <Input {...form.register('full_name')} placeholder="Tu nombre" className="bg-white/5 border-white/10" />
                              {form.formState.errors.full_name && (
                                <p className="text-red-400 text-xs mt-1">{form.formState.errors.full_name.message}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm text-kreoon-text-secondary mb-2">Email *</label>
                              <Input {...form.register('email')} type="email" placeholder="tu@email.com" className="bg-white/5 border-white/10" />
                              {form.formState.errors.email && (
                                <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-kreoon-text-secondary mb-2">WhatsApp (opcional)</label>
                              <Input {...form.register('phone')} placeholder="+57 300 123 4567" className="bg-white/5 border-white/10" />
                            </div>
                            <div>
                              <label className="block text-sm text-kreoon-text-secondary mb-2">Ciudad (opcional)</label>
                              <Input {...form.register('city')} placeholder="Medellín" className="bg-white/5 border-white/10" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-kreoon-text-secondary mb-2">Portfolio / Website (opcional)</label>
                            <Input {...form.register('portfolio_url')} placeholder="https://tuportfolio.com" className="bg-white/5 border-white/10" />
                            {form.formState.errors.portfolio_url && (
                              <p className="text-red-400 text-xs mt-1">{form.formState.errors.portfolio_url.message}</p>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-kreoon-text-secondary mb-2 flex items-center gap-2">
                                <Instagram className="w-4 h-4" /> Instagram (opcional)
                              </label>
                              <Input {...form.register('instagram')} placeholder="@tuusuario" className="bg-white/5 border-white/10" />
                            </div>
                            <div>
                              <label className="block text-sm text-kreoon-text-secondary mb-2 flex items-center gap-2">
                                <Music2 className="w-4 h-4" /> TikTok (opcional)
                              </label>
                              <Input {...form.register('tiktok')} placeholder="@tuusuario" className="bg-white/5 border-white/10" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {submitError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {submitError}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button type="button" onClick={handlePrevStep} variant="outline" className="flex-1 border-white/20">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || selectedRoles.length === 0}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                        ) : (
                          <>Unirme a Kreoon <Sparkles className="w-4 h-4 ml-2" /></>
                        )}
                      </Button>
                    </div>

                    <p className="text-center text-kreoon-text-muted text-xs">
                      Al registrarte aceptas nuestros{' '}
                      <a href="/terminos" className="underline">Términos</a> y{' '}
                      <a href="/privacidad" className="underline">Política de Privacidad</a>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </KreoonGlassCard>
        </motion.div>

        {/* Trust elements */}
        <motion.div
          variants={withDelay(FADE_IN_UP, 0.25)}
          {...scrollAnim}
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-kreoon-text-muted"
        >
          <span className="inline-flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-400" /> 100% gratuito
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-kreoon-purple-400" /> Datos protegidos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-400" /> 2 min para completar
          </span>
        </motion.div>
      </div>
    </section>
  );
}
