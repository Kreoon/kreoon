import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Users,
  LayoutDashboard, CreditCard, UserCheck, BarChart3, X,
} from 'lucide-react';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import PhoneMockupCarousel from '@/components/landing/PhoneMockupCarousel';
import { WizardContainer } from '@/components/registration-v2';

const BENEFITS = [
  { icon: LayoutDashboard, title: 'Dashboard unificado', description: 'Gestiona todos tus proyectos en un solo lugar' },
  { icon: UserCheck, title: 'Gestión de equipos', description: 'Asigna roles y permisos a tu equipo' },
  { icon: CreditCard, title: 'Pagos simplificados', description: 'Una factura, múltiples creadores' },
  { icon: BarChart3, title: 'Analytics avanzados', description: 'Métricas de rendimiento por proyecto' },
];

const FEATURES = [
  'Gestión de creadores y editores',
  'Campañas para clientes externos',
  'Reclutamiento de talento',
  'Pagos centralizados',
  'Reportes y analytics',
  'White label disponible',
];

export default function OrganizacionesLanding() {
  const [showWizard, setShowWizard] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useUTMTracking();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.track({
      event_name: 'landing_view',
      event_category: 'engagement',
      properties: { page: 'organizaciones_landing' },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
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
          <p className="text-white/60 max-w-2xl mx-auto text-lg mb-8">
            Gestiona equipos, campañas y pagos desde una sola plataforma
            diseñada para agencias y productoras
          </p>

          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold text-lg transition-all hover:scale-[1.02]"
          >
            Crear mi organización <ArrowRight className="w-5 h-5" />
          </button>
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

        {/* Features list */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-white/80">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Video carousel */}
        <div className="max-w-5xl mx-auto mb-16">
          <PhoneMockupCarousel
            title="Contenido gestionado en Kreoon"
            subtitle="Tu equipo puede crear contenido así"
            maxVideos={10}
          />
        </div>

        {/* Registration Form */}
        <div ref={formRef} className="max-w-lg mx-auto scroll-mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Crea tu organización</h2>
              <p className="text-white/60">
                Prueba gratis por 30 días sin compromiso
              </p>
            </div>

            <WizardContainer flow="general" />
          </motion.div>
        </div>

        {/* Trial info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 max-w-md mx-auto"
        >
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-sm text-white/80">
              <strong className="text-green-400">Prueba de 30 días incluida</strong>
              <br />
              <span className="text-white/60">
                Sin tarjeta de crédito. Cancela cuando quieras.
              </span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Modal wizard (for mobile CTA) */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowWizard(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowWizard(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <WizardContainer
                flow="general"
                compact
                onBack={() => setShowWizard(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
