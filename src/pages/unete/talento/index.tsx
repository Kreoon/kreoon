import { useRef } from 'react';
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

// Testimonials filtered to creator/editor roles
const TALENT_TESTIMONIALS: Testimonial[] = [
  {
    id: 'talent-1',
    name: 'Camila Restrepo',
    role: 'Creador',
    company: 'UGC Creator',
    quote: 'Antes pasaba más tiempo buscando clientes que creando. Con Kreoon apliqué a 3 campañas en una semana y cobré con escrow sin problemas.',
    metric: { label: 'Ingresos mensuales', value: '+$2,400 USD' },
  },
  {
    id: 'talent-2',
    name: 'Andrés Mejía',
    role: 'Editor',
    company: 'Motion Designer',
    quote: 'El sistema de reputación me ayudó a conseguir proyectos mejor pagados. Mi rating subió y las marcas empezaron a buscarme a mí.',
    metric: { label: 'Proyectos completados', value: '28' },
  },
  {
    id: 'talent-3',
    name: 'Valentina Ochoa',
    role: 'Creador',
    company: 'Content Strategist',
    quote: 'Las herramientas de IA me ahorran horas en propuestas y scripts. Es como tener un asistente que entiende mi estilo.',
    metric: { label: 'Tiempo ahorrado', value: '10h/semana' },
  },
  {
    id: 'talent-4',
    name: 'Daniel Torres',
    role: 'Editor',
    company: 'Video Editor',
    quote: 'Nunca más tuve que perseguir un pago. Escrow me da la tranquilidad de saber que voy a cobrar por mi trabajo.',
    metric: { label: 'Rating promedio', value: '4.9' },
  },
  {
    id: 'talent-5',
    name: 'Isabella Vargas',
    role: 'Creador',
    company: 'Social Media Creator',
    quote: 'Mi portafolio en Kreoon me genera leads orgánicos. Las marcas me contactan directamente porque ven mis métricas reales.',
    metric: { label: 'Marcas conectadas', value: '12' },
  },
];

export default function TalentoLanding() {
  const formRef = useRef<HTMLDivElement>(null);
  const interestRef = useRef<HTMLDivElement>(null);

  // Initialize UTM tracking on mount
  useUTMTracking();

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToInterest = () => {
    interestRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-kreoon-text-primary">
      {/* A — ATTENTION */}
      <TalentHeroSection
        onScrollToForm={scrollToForm}
        onScrollToInterest={scrollToInterest}
      />

      {/* I — INTEREST */}
      <div ref={interestRef}>
        <TalentPainPointsSection />
      </div>

      {/* D — DESIRE */}
      <TalentBenefitsSection />

      {/* Portfolio showcase */}
      <PhoneMockupCarousel />

      {/* Social Proof — Testimonials */}
      <TestimonialsSection testimonials={TALENT_TESTIMONIALS} />

      {/* A — ACTION */}
      <div ref={formRef}>
        <TalentFormSection id="talent-form" />
      </div>
    </div>
  );
}
