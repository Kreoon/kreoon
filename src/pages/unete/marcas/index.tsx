import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Building2,
  Video, Clock, Shield, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import PhoneMockupCarousel from '@/components/landing/PhoneMockupCarousel';

// ─── Validation ───────────────────────────────────────────
const formSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  company: z.string().min(2, 'Nombre de empresa requerido'),
  position: z.string().optional(),
  phone: z.string().optional(),
  content_needs: z.array(z.string()).min(1, 'Selecciona al menos una opción'),
  monthly_budget: z.string().optional(),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Data ─────────────────────────────────────────────────
const CONTENT_NEEDS = [
  { id: 'ugc', label: 'UGC / Contenido orgánico', description: 'Para ads y redes' },
  { id: 'product_photos', label: 'Fotos de producto', description: 'Lifestyle y catálogo' },
  { id: 'video_ads', label: 'Video ads', description: 'Para TikTok, Meta, YouTube' },
  { id: 'influencer', label: 'Campañas con influencers', description: 'Colaboraciones pagadas' },
  { id: 'strategy', label: 'Estrategia de contenido', description: 'Planificación y gestión' },
  { id: 'other', label: 'Otro', description: 'Cuéntanos más' },
];

const BUDGET_OPTIONS = [
  { value: 'exploring', label: 'Explorando opciones' },
  { value: 'under_500', label: 'Menos de $500/mes' },
  { value: '500_1500', label: '$500 - $1,500/mes' },
  { value: '1500_5000', label: '$1,500 - $5,000/mes' },
  { value: 'over_5000', label: 'Más de $5,000/mes' },
];

const BENEFITS = [
  { icon: Video, title: '500+ creadores', description: 'Talento verificado y categorizado' },
  { icon: Clock, title: 'Contenido en días', description: 'No semanas ni meses' },
  { icon: Shield, title: 'Calidad garantizada', description: 'Sistema de revisión y ajustes' },
  { icon: Zap, title: 'Sin complicaciones', description: 'Gestión centralizada y pagos simples' },
];

// ─── Component ────────────────────────────────────────────
export default function MarcasLanding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { getTrackingParams, clearUTMParams } = useUTMTracking();
  const analytics = useAnalyticsContext();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      company: '',
      position: '',
      phone: '',
      content_needs: [],
      monthly_budget: '',
      message: '',
    },
  });

  useEffect(() => {
    analytics.track({ event_name: 'landing_view', event_category: 'engagement', properties: { page: 'marcas_landing' } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            lead_type: 'brand',
            registration_intent: 'brand',
            message: data.message || undefined,
            interests: data.content_needs,
            ...trackingParams,
            custom_fields: {
              company: data.company,
              position: data.position,
              content_needs: data.content_needs,
              monthly_budget: data.monthly_budget,
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        analytics.trackLeadCaptured({
          lead_id: result.lead_id,
          lead_type: 'brand',
        });

        clearUTMParams();
        setSubmitSuccess(true);
      } else {
        throw new Error(result.error || 'Error al registrar');
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmitError((error as Error).message);
      analytics.track({ event_name: 'form_error', event_category: 'engagement', properties: { error: (error as Error).message } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentNeeds = form.watch('content_needs');

  // ─── Success screen ─────────────────────────────────────
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
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-blue-400" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">¡Gracias por tu interés!</h1>
          <p className="text-white/60 mb-8">
            Nuestro equipo te contactará en las próximas 24 horas para conocer
            más sobre tus necesidades de contenido.
          </p>

          <div className="space-y-4">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <a href="/">Volver al inicio</a>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
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
            <Building2 className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold text-blue-400">
              Kreoon para Marcas
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Contenido que vende,
            <span className="block text-blue-400">sin agencia de por medio</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Accede a una red de creadores verificados y obtén contenido de
            calidad en días, no semanas
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-4"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-medium mb-1">{benefit.title}</h3>
                <p className="text-sm text-white/50">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Video carousel */}
        <div className="max-w-5xl mx-auto">
          <PhoneMockupCarousel
            title="Contenido creado por nuestra red"
            subtitle="Talento verificado disponible para tu marca"
            maxVideos={10}
          />
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 text-center">
              Cuéntanos sobre tu proyecto
            </h2>

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Basic info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Tu nombre *
                  </label>
                  <Input
                    {...form.register('full_name')}
                    placeholder="María García"
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
                    Email corporativo *
                  </label>
                  <Input
                    {...form.register('email')}
                    type="email"
                    placeholder="maria@empresa.com"
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
                    Empresa *
                  </label>
                  <Input
                    {...form.register('company')}
                    placeholder="Nombre de tu empresa"
                    className="bg-white/5 border-white/10"
                  />
                  {form.formState.errors.company && (
                    <p className="text-red-400 text-xs mt-1">
                      {form.formState.errors.company.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Cargo (opcional)
                  </label>
                  <Input
                    {...form.register('position')}
                    placeholder="Marketing Manager"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

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

              {/* Content needs */}
              <div>
                <label className="block text-sm text-white/70 mb-3">
                  ¿Qué tipo de contenido necesitas? *
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {CONTENT_NEEDS.map((need) => {
                    const isSelected = contentNeeds.includes(need.id);
                    return (
                      <label
                        key={need.id}
                        className={`p-3 rounded-lg cursor-pointer border transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={need.id}
                          {...form.register('content_needs')}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-white/30'
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{need.label}</p>
                            <p className="text-xs text-white/50">
                              {need.description}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {form.formState.errors.content_needs && (
                  <p className="text-red-400 text-xs mt-2">
                    {form.formState.errors.content_needs.message}
                  </p>
                )}
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm text-white/70 mb-3">
                  Presupuesto mensual aproximado
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_OPTIONS.map((option) => {
                    const isSelected =
                      form.watch('monthly_budget') === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`px-4 py-2 rounded-lg cursor-pointer text-sm border transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          value={option.value}
                          {...form.register('monthly_budget')}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional message */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  ¿Algo más que debamos saber? (opcional)
                </label>
                <Textarea
                  {...form.register('message')}
                  placeholder="Cuéntanos más sobre tu proyecto o necesidades específicas..."
                  className="bg-white/5 border-white/10 min-h-[100px]"
                />
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 py-6 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />{' '}
                    Enviando...
                  </>
                ) : (
                  <>
                    Solicitar información{' '}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-white/40 text-xs">
                Te contactaremos en menos de 24 horas
              </p>
            </form>
          </div>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-white/40 text-sm mb-4">
            Marcas que ya confían en Kreoon
          </p>
          <div className="flex items-center justify-center gap-8 opacity-50">
            <div className="w-24 h-8 bg-white/10 rounded" />
            <div className="w-24 h-8 bg-white/10 rounded" />
            <div className="w-24 h-8 bg-white/10 rounded" />
            <div className="w-24 h-8 bg-white/10 rounded" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
