import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  TalentHeroSection,
  TalentPainPointsSection,
  TalentBenefitsSection,
  TalentFormSection,
} from '@/components/landing/sections/talent';
import { TestimonialsSection } from '@/components/landing/sections';
import type { Testimonial } from '@/components/landing/sections';
import PhoneMockupCarousel from '@/components/landing/PhoneMockupCarousel';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { PublicLayout } from '@/components/layout/PublicLayout';

// No fake testimonials — section will be hidden until we have real ones
const TALENT_TESTIMONIALS: Testimonial[] = [];

export default function TalentoLanding() {
  const [formOpen, setFormOpen] = useState(false);
  const interestRef = useRef<HTMLDivElement>(null);

  // Initialize UTM tracking on mount
  useUTMTracking();

  const openForm = () => setFormOpen(true);
  const closeForm = () => setFormOpen(false);

  const scrollToInterest = () => {
    interestRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PublicLayout showFooter={true} transparentHeader={false}>
    <div className="min-h-screen overflow-x-hidden bg-kreoon-bg-primary text-kreoon-text-primary">
      {/* A — ATTENTION */}
      <TalentHeroSection
        onScrollToForm={openForm}
        onScrollToInterest={scrollToInterest}
      />

      {/* Portfolio showcase — right after hero */}
      <div className="mx-auto max-w-5xl">
        <PhoneMockupCarousel maxVideos={10} />
      </div>

      {/* I — INTEREST */}
      <div ref={interestRef}>
        <TalentPainPointsSection />
      </div>

      {/* D — DESIRE */}
      <TalentBenefitsSection />

      {/* Social Proof — Testimonials (hidden until we have real ones) */}
      <TestimonialsSection testimonials={TALENT_TESTIMONIALS} />

      {/* Bottom CTA — opens the registration popup */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-kreoon-purple-500/30 bg-kreoon-purple-500/10 shadow-kreoon-glow-sm">
              <Sparkles className="h-7 w-7 text-kreoon-purple-400" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl mb-4">
              ¿Listo para empezar?
            </h2>
            <p className="text-kreoon-text-secondary text-lg mb-8 max-w-xl mx-auto">
              Regístrate gratis, accede a campañas pagadas y herramientas de IA.
              Tu talento merece ser visto.
            </p>
            <button
              onClick={openForm}
              className="inline-flex items-center gap-2 rounded-sm bg-kreoon-gradient px-8 py-4 font-semibold text-white shadow-kreoon-glow-sm transition-all hover:shadow-kreoon-glow hover:scale-[1.02] text-lg"
            >
              Quiero unirme <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Registration modal */}
      <AnimatePresence>
        {formOpen && (
          <TalentFormSection open={formOpen} onClose={closeForm} />
        )}
      </AnimatePresence>
    </div>
    </PublicLayout>
  );
}
