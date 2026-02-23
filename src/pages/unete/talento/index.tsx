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

// No fake testimonials — section will be hidden until we have real ones
const TALENT_TESTIMONIALS: Testimonial[] = [];

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

      {/* Portfolio showcase — right after hero */}
      <section className="px-4 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <PhoneMockupCarousel maxVideos={10} />
        </div>
      </section>

      {/* I — INTEREST */}
      <div ref={interestRef}>
        <TalentPainPointsSection />
      </div>

      {/* D — DESIRE */}
      <TalentBenefitsSection />

      {/* Social Proof — Testimonials (hidden until we have real ones) */}
      <TestimonialsSection testimonials={TALENT_TESTIMONIALS} />

      {/* A — ACTION */}
      <div ref={formRef}>
        <TalentFormSection id="talent-form" />
      </div>
    </div>
  );
}
