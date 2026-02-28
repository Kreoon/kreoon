import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Building2,
  Video, Clock, Shield, Zap, X,
} from 'lucide-react';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import PhoneMockupCarousel from '@/components/landing/PhoneMockupCarousel';
import { WizardContainer } from '@/components/registration-v2';

const BENEFITS = [
  { icon: Video, title: 'Red de creadores', description: 'Talento verificado y categorizado' },
  { icon: Clock, title: 'Contenido en días', description: 'No semanas ni meses' },
  { icon: Shield, title: 'Calidad garantizada', description: 'Sistema de revisión y ajustes' },
  { icon: Zap, title: 'Sin complicaciones', description: 'Gestión centralizada y pagos simples' },
];

export default function MarcasLanding() {
  const [showWizard, setShowWizard] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useUTMTracking();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.track({
      event_name: 'landing_view',
      event_category: 'engagement',
      properties: { page: 'marcas_landing' },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
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
          <p className="text-white/60 max-w-2xl mx-auto text-lg mb-8">
            Accede a una red de creadores verificados y obtén contenido de
            calidad en días, no semanas
          </p>

          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-lg transition-all hover:scale-[1.02]"
          >
            Crear cuenta gratis <ArrowRight className="w-5 h-5" />
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
        <div className="max-w-5xl mx-auto mb-16">
          <PhoneMockupCarousel
            title="Contenido creado por nuestra red"
            subtitle="Talento verificado disponible para tu marca"
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
              <h2 className="text-2xl font-bold mb-2">Crea tu cuenta de marca</h2>
              <p className="text-white/60">
                Accede a creadores verificados y empieza a recibir contenido
              </p>
            </div>

            <WizardContainer flow="general" />
          </motion.div>
        </div>

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
