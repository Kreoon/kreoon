import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Video, Wand2, Megaphone, Code, GraduationCap,
  ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
  Instagram, Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUTMTracking, useTrackEvent } from '@/hooks/useUTMTracking';
import {
  TALENT_CATEGORY_LABELS,
  SPECIFIC_ROLE_LABELS,
  CATEGORY_ROLES,
  type TalentCategory,
  type SpecificRole,
} from '@/types/crm.types';

// ─── Validation schemas per step ──────────────────────────
const step1Schema = z.object({
  talent_subtype: z.enum(['creator', 'editor', 'both']),
});

const step2Schema = z.object({
  talent_category: z.string().min(1, 'Selecciona una categoría'),
  specific_role: z.string().min(1, 'Selecciona tu rol principal'),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
});

const step3Schema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  city: z.string().optional(),
  portfolio_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
});

type FormData = z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema>;

// ─── Category config with icons ───────────────────────────
const CATEGORY_CONFIG: Record<
  TalentCategory,
  { icon: React.ElementType; color: string; description: string }
> = {
  content_creation: {
    icon: Video,
    color: 'from-pink-500 to-rose-500',
    description: 'Crear contenido original para redes',
  },
  post_production: {
    icon: Wand2,
    color: 'from-purple-500 to-violet-500',
    description: 'Editar y pulir contenido visual',
  },
  strategy_marketing: {
    icon: Megaphone,
    color: 'from-blue-500 to-cyan-500',
    description: 'Estrategias digitales y growth',
  },
  technology: {
    icon: Code,
    color: 'from-green-500 to-emerald-500',
    description: 'Desarrollo web, apps e IA',
  },
  education: {
    icon: GraduationCap,
    color: 'from-yellow-500 to-orange-500',
    description: 'Enseñar y facilitar aprendizaje',
  },
  client: {
    icon: Megaphone,
    color: 'from-slate-500 to-slate-600',
    description: 'Gestión de marcas',
  },
};

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Principiante', description: 'Menos de 1 año' },
  { value: 'intermediate', label: 'Intermedio', description: '1-3 años' },
  { value: 'advanced', label: 'Avanzado', description: '3-5 años' },
  { value: 'expert', label: 'Experto', description: '+5 años' },
];

// ─── Main Component ───────────────────────────────────────
export default function TalentoLanding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TalentCategory | null>(null);

  const { getTrackingParams, clearUTMParams } = useUTMTracking();
  const { trackEvent } = useTrackEvent();

  const form = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      talent_subtype: undefined,
      talent_category: '',
      specific_role: '',
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
  const talentSubtype = watch('talent_subtype');
  const talentCategory = watch('talent_category');

  // Sync selected category when form value changes
  useEffect(() => {
    if (talentCategory) {
      setSelectedCategory(talentCategory as TalentCategory);
      // Reset specific_role when category changes
      form.setValue('specific_role', '');
    }
  }, [talentCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track step views
  useEffect(() => {
    trackEvent('form_step_view', { step: currentStep, page: 'talento_landing' });
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNextStep = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger('talent_subtype');
    } else if (currentStep === 2) {
      isValid = await trigger(['talent_category', 'specific_role', 'experience_level']);
    }

    if (isValid) {
      trackEvent('form_step_complete', { step: currentStep });
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (data: FormData) => {
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
            city: data.city || undefined,
            portfolio_url: data.portfolio_url || undefined,
            talent_category: data.talent_category,
            specific_role: data.specific_role,
            talent_subtype: data.talent_subtype,
            experience_level: data.experience_level,
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
          category: data.talent_category,
          role: data.specific_role,
        });

        clearUTMParams();
        setSubmitSuccess(true);
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

  // ─── Success screen ───────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-green-400" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">¡Bienvenido a Kreoon!</h1>
          <p className="text-white/60 mb-8">
            Te enviamos un mensaje a tu email con los próximos pasos para activar
            tu cuenta.
          </p>

          <div className="space-y-4">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <a href="/register">Crear mi cuenta ahora</a>
            </Button>
            <p className="text-white/40 text-sm">
              O revisa tu email para más información
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-purple-500/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <a
            href="/unete"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </a>

          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold text-purple-400">
              Kreoon para Talento
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Monetiza tu creatividad
          </h1>
          <p className="text-white/60 max-w-lg mx-auto">
            Únete a la comunidad de creadores que colaboran con las mejores marcas
            de LATAM
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
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
              animate={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Form steps */}
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="max-w-2xl mx-auto"
        >
          <AnimatePresence mode="wait">
            {/* ── Step 1: Talent type ── */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">
                    ¿Qué tipo de talento eres?
                  </h2>
                  <p className="text-white/60">Selecciona lo que mejor te describe</p>
                </div>

                <div className="grid gap-4">
                  {(
                    [
                      {
                        value: 'creator',
                        label: 'Creador de Contenido',
                        description:
                          'Creo contenido original (UGC, videos, fotos)',
                        icon: Video,
                      },
                      {
                        value: 'editor',
                        label: 'Editor / Post-Producción',
                        description:
                          'Edito, animo o mejoro contenido de otros',
                        icon: Wand2,
                      },
                      {
                        value: 'both',
                        label: 'Ambos',
                        description: 'Creo y también edito contenido',
                        icon: Sparkles,
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        talentSubtype === option.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...form.register('talent_subtype')}
                        className="sr-only"
                      />
                      <div
                        className={`p-3 rounded-lg ${
                          talentSubtype === option.value
                            ? 'bg-purple-500'
                            : 'bg-white/10'
                        }`}
                      >
                        <option.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-white/50">
                          {option.description}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          talentSubtype === option.value
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-white/30'
                        }`}
                      >
                        {talentSubtype === option.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!talentSubtype}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* ── Step 2: Category & role ── */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Tu especialidad</h2>
                  <p className="text-white/60">
                    Cuéntanos más sobre lo que haces
                  </p>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm text-white/70 mb-3">
                    Área principal
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(Object.keys(CATEGORY_CONFIG) as TalentCategory[])
                      .filter((cat) => cat !== 'client')
                      .map((category) => {
                        const config = CATEGORY_CONFIG[category];
                        const Icon = config.icon;
                        const isSelected = talentCategory === category;

                        return (
                          <label
                            key={category}
                            className={`p-4 rounded-xl cursor-pointer text-center border-2 transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <input
                              type="radio"
                              value={category}
                              {...form.register('talent_category')}
                              className="sr-only"
                            />
                            <div
                              className={`w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-medium text-sm">
                              {TALENT_CATEGORY_LABELS[category]}
                            </p>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Roles filtered by category */}
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-sm text-white/70 mb-3">
                      Rol específico
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {(CATEGORY_ROLES[selectedCategory] || []).map(
                        (role: SpecificRole) => {
                          const isSelected = watch('specific_role') === role;
                          return (
                            <label
                              key={role}
                              className={`p-3 rounded-lg cursor-pointer text-sm border transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500/20 text-white'
                                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                              }`}
                            >
                              <input
                                type="radio"
                                value={role}
                                {...form.register('specific_role')}
                                className="sr-only"
                              />
                              {SPECIFIC_ROLE_LABELS[role]}
                            </label>
                          );
                        }
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Experience level */}
                <div>
                  <label className="block text-sm text-white/70 mb-3">
                    Nivel de experiencia
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {EXPERIENCE_OPTIONS.map((option) => {
                      const isSelected =
                        watch('experience_level') === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`p-3 rounded-lg cursor-pointer text-center border transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            value={option.value}
                            {...form.register('experience_level')}
                            className="sr-only"
                          />
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-white/50">
                            {option.description}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handlePrevStep}
                    variant="outline"
                    className="flex-1 border-white/20"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={
                      !talentCategory ||
                      !watch('specific_role') ||
                      !watch('experience_level')
                    }
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Contact info ── */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Último paso</h2>
                  <p className="text-white/60">
                    Cuéntanos cómo contactarte
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">
                        Nombre completo *
                      </label>
                      <Input
                        {...form.register('full_name')}
                        placeholder="Tu nombre"
                        className="bg-white/5 border-white/10"
                      />
                      {form.formState.errors.full_name && (
                        <p className="text-red-400 text-xs mt-1">
                          {form.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-2">
                        Email *
                      </label>
                      <Input
                        {...form.register('email')}
                        type="email"
                        placeholder="tu@email.com"
                        className="bg-white/5 border-white/10"
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-400 text-xs mt-1">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">
                        WhatsApp (opcional)
                      </label>
                      <Input
                        {...form.register('phone')}
                        placeholder="+57 300 123 4567"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-2">
                        Ciudad (opcional)
                      </label>
                      <Input
                        {...form.register('city')}
                        placeholder="Medellín"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Portfolio / Website (opcional)
                    </label>
                    <Input
                      {...form.register('portfolio_url')}
                      placeholder="https://tuportfolio.com"
                      className="bg-white/5 border-white/10"
                    />
                    {form.formState.errors.portfolio_url && (
                      <p className="text-red-400 text-xs mt-1">
                        {form.formState.errors.portfolio_url.message}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2 flex items-center gap-2">
                        <Instagram className="w-4 h-4" /> Instagram (opcional)
                      </label>
                      <Input
                        {...form.register('instagram')}
                        placeholder="@tuusuario"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-2 flex items-center gap-2">
                        <Music2 className="w-4 h-4" /> TikTok (opcional)
                      </label>
                      <Input
                        {...form.register('tiktok')}
                        placeholder="@tuusuario"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handlePrevStep}
                    variant="outline"
                    className="flex-1 border-white/20"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                        Enviando...
                      </>
                    ) : (
                      <>
                        Unirme a Kreoon{' '}
                        <Sparkles className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-center text-white/40 text-xs">
                  Al registrarte aceptas nuestros{' '}
                  <a href="/terminos" className="underline">
                    Términos
                  </a>{' '}
                  y{' '}
                  <a href="/privacidad" className="underline">
                    Política de Privacidad
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
