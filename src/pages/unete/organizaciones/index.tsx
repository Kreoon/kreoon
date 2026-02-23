import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Users,
  LayoutDashboard, CreditCard, UserCheck, BarChart3,
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
  organization_name: z.string().min(2, 'Nombre de organización requerido'),
  organization_type: z.string().min(1, 'Selecciona un tipo'),
  team_size: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  services: z.array(z.string()).min(1, 'Selecciona al menos un servicio'),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Data ─────────────────────────────────────────────────
const ORG_TYPES = [
  { value: 'agency', label: 'Agencia de Marketing' },
  { value: 'production', label: 'Productora Audiovisual' },
  { value: 'studio', label: 'Estudio Creativo' },
  { value: 'media', label: 'Medio de Comunicación' },
  { value: 'brand_team', label: 'Equipo de Marca (In-house)' },
  { value: 'other', label: 'Otro' },
];

const TEAM_SIZES = [
  { value: '1-5', label: '1-5 personas' },
  { value: '6-15', label: '6-15 personas' },
  { value: '16-50', label: '16-50 personas' },
  { value: '50+', label: 'Más de 50' },
];

const SERVICES = [
  { id: 'manage_creators', label: 'Gestionar creadores/editores', description: 'Asignar proyectos y seguimiento' },
  { id: 'client_campaigns', label: 'Campañas para clientes', description: 'Gestionar contenido de terceros' },
  { id: 'talent_recruiting', label: 'Reclutamiento de talento', description: 'Encontrar nuevos creadores' },
  { id: 'payments', label: 'Centralizar pagos', description: 'Facturación y pagos a creadores' },
  { id: 'analytics', label: 'Reportes y analytics', description: 'Métricas de rendimiento' },
  { id: 'white_label', label: 'White label', description: 'Plataforma con tu marca' },
];

const BENEFITS = [
  { icon: LayoutDashboard, title: 'Dashboard unificado', description: 'Gestiona todos tus proyectos en un solo lugar' },
  { icon: UserCheck, title: 'Gestión de equipos', description: 'Asigna roles y permisos a tu equipo' },
  { icon: CreditCard, title: 'Pagos simplificados', description: 'Una factura, múltiples creadores' },
  { icon: BarChart3, title: 'Analytics avanzados', description: 'Métricas de rendimiento por proyecto' },
];

// ─── Component ────────────────────────────────────────────
export default function OrganizacionesLanding() {
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
      organization_name: '',
      organization_type: '',
      team_size: '',
      phone: '',
      website: '',
      services: [],
      message: '',
    },
  });

  useEffect(() => {
    analytics.track({ event_name: 'landing_view', event_category: 'engagement', properties: { page: 'organizaciones_landing' } });
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
            lead_type: 'organization',
            registration_intent: 'organization',
            message: data.message || undefined,
            ...trackingParams,
            custom_fields: {
              organization_name: data.organization_name,
              organization_type: data.organization_type,
              team_size: data.team_size,
              website: data.website,
              services_interested: data.services,
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        analytics.trackLeadCaptured({
          lead_id: result.lead_id,
          lead_type: 'organization',
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

  const services = form.watch('services');

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
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-green-400" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">¡Solicitud recibida!</h1>
          <p className="text-white/60 mb-8">
            Nuestro equipo de partnerships revisará tu solicitud y te contactará
            para agendar una demo personalizada.
          </p>

          <Button asChild className="w-full bg-green-600 hover:bg-green-700">
            <a href="/">Volver al inicio</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
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
            <Users className="w-6 h-6 text-green-400" />
            <span className="text-xl font-bold text-green-400">
              Kreoon para Organizaciones
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Tu hub de talento creativo
            <span className="block text-green-400">
              con herramientas poderosas
            </span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Gestiona equipos, campañas y pagos desde una sola plataforma
            diseñada para agencias y productoras
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
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-green-400" />
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
            title="Contenido gestionado en Kreoon"
            subtitle="Tu equipo puede crear contenido así"
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
              Solicita acceso para tu organización
            </h2>

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Personal info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Tu nombre *
                  </label>
                  <Input
                    {...form.register('full_name')}
                    placeholder="Juan Pérez"
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
                    placeholder="juan@agencia.com"
                    className="bg-white/5 border-white/10"
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-400 text-xs mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Organization info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Nombre de la organización *
                  </label>
                  <Input
                    {...form.register('organization_name')}
                    placeholder="Mi Agencia Creativa"
                    className="bg-white/5 border-white/10"
                  />
                  {form.formState.errors.organization_name && (
                    <p className="text-red-400 text-xs mt-1">
                      {form.formState.errors.organization_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Tipo de organización *
                  </label>
                  <select
                    {...form.register('organization_type')}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
                  >
                    <option value="" className="bg-card">
                      Seleccionar...
                    </option>
                    {ORG_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                        className="bg-card"
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.organization_type && (
                    <p className="text-red-400 text-xs mt-1">
                      {form.formState.errors.organization_type.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Tamaño del equipo
                  </label>
                  <select
                    {...form.register('team_size')}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
                  >
                    <option value="" className="bg-card">
                      Seleccionar...
                    </option>
                    {TEAM_SIZES.map((size) => (
                      <option
                        key={size.value}
                        value={size.value}
                        className="bg-card"
                      >
                        {size.label}
                      </option>
                    ))}
                  </select>
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
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Website (opcional)
                </label>
                <Input
                  {...form.register('website')}
                  placeholder="https://miagencia.com"
                  className="bg-white/5 border-white/10"
                />
                {form.formState.errors.website && (
                  <p className="text-red-400 text-xs mt-1">
                    {form.formState.errors.website.message}
                  </p>
                )}
              </div>

              {/* Services of interest */}
              <div>
                <label className="block text-sm text-white/70 mb-3">
                  ¿Qué funcionalidades te interesan? *
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {SERVICES.map((service) => {
                    const isSelected = services.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className={`p-3 rounded-lg cursor-pointer border transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={service.id}
                          {...form.register('services')}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-green-500 bg-green-500'
                                : 'border-white/30'
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {service.label}
                            </p>
                            <p className="text-xs text-white/50">
                              {service.description}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {form.formState.errors.services && (
                  <p className="text-red-400 text-xs mt-2">
                    {form.formState.errors.services.message}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Cuéntanos sobre tu organización (opcional)
                </label>
                <Textarea
                  {...form.register('message')}
                  placeholder="¿Qué proyectos manejan? ¿Cuántos creadores trabajan con ustedes actualmente?"
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
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />{' '}
                    Enviando...
                  </>
                ) : (
                  <>
                    Solicitar demo personalizada{' '}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-white/40 text-xs">
                Te contactaremos para agendar una demo según tus necesidades
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
