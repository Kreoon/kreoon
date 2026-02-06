import { ResearchHeader } from './ResearchHeader';
import { ResearchSidebar } from './ResearchSidebar';
import { ResearchMobileTabs } from './ResearchMobileTabs';
import { ResearchKiroButton } from './ResearchKiroButton';
import { ResearchSection, EmptySection } from './ResearchSection';
import { useActiveSection } from './hooks/useActiveSection';
import { SECTIONS } from './utils/sectionConfig';
import { parseJson } from './utils/researchDataHelpers';

import { LandingExecutiveSummary } from './sections/LandingExecutiveSummary';
import { LandingMarketOverview } from './sections/LandingMarketOverview';
import { LandingJTBDAnalysis } from './sections/LandingJTBDAnalysis';
import { LandingAvatarSegmentation } from './sections/LandingAvatarSegmentation';
import { LandingCompetitionAnalysis } from './sections/LandingCompetitionAnalysis';
import { LandingDifferentiation } from './sections/LandingDifferentiation';
import { LandingSalesAngles } from './sections/LandingSalesAngles';
import { LandingPUVTransformation } from './sections/LandingPUVTransformation';
import { LandingStrategicPlaybook } from './sections/LandingStrategicPlaybook';
import { LandingLeadMagnets } from './sections/LandingLeadMagnets';
import { LandingContentCalendar } from './sections/LandingContentCalendar';
import { LandingLaunchStrategy } from './sections/LandingLaunchStrategy';

interface ResearchLandingLayoutProps {
  product: any;
}

export function ResearchLandingLayout({ product }: ResearchLandingLayoutProps) {
  const { activeSectionId, scrollToSection } = useActiveSection();

  // Parse market_research which may be a JSON string
  const marketResearch = parseJson(product.market_research);
  const marketOverview = marketResearch?.market_overview || marketResearch;
  const jtbdData = marketResearch?.jtbd || null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <ResearchHeader
        productName={product.name}
        generatedAt={product.research_generated_at}
        product={product}
      />

      <div className="flex">
        <ResearchSidebar
          activeSectionId={activeSectionId}
          onSectionClick={scrollToSection}
        />

        <div className="flex-1 min-w-0">
          <ResearchMobileTabs
            activeSectionId={activeSectionId}
            onSectionClick={scrollToSection}
          />

          <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
            {/* 1. Executive Summary */}
            <ResearchSection id={SECTIONS[0].id} title={SECTIONS[0].label} icon={SECTIONS[0].icon} subtitle="Vision general y recomendaciones clave">
              <LandingExecutiveSummary contentStrategy={product.content_strategy} />
            </ResearchSection>

            {/* 2. Market Overview */}
            <ResearchSection id={SECTIONS[1].id} title={SECTIONS[1].label} icon={SECTIONS[1].icon} subtitle="Tamano, tendencias y oportunidades del mercado">
              <LandingMarketOverview marketResearch={marketOverview} />
            </ResearchSection>

            {/* 3. JTBD Analysis */}
            <ResearchSection id={SECTIONS[2].id} title={SECTIONS[2].label} icon={SECTIONS[2].icon} subtitle="Jobs funcionales, emocionales y sociales del cliente">
              <LandingJTBDAnalysis jtbdData={jtbdData} marketResearch={marketResearch} />
            </ResearchSection>

            {/* 4. Avatar Segmentation */}
            <ResearchSection id={SECTIONS[3].id} title={SECTIONS[3].label} icon={SECTIONS[3].icon} subtitle="Perfiles detallados de cliente ideal">
              <LandingAvatarSegmentation avatarProfiles={product.avatar_profiles} />
            </ResearchSection>

            {/* 5. Competition Analysis */}
            <ResearchSection id={SECTIONS[4].id} title={SECTIONS[4].label} icon={SECTIONS[4].icon} subtitle="Fortalezas, debilidades y oportunidades vs competencia">
              <LandingCompetitionAnalysis competitorAnalysis={product.competitor_analysis} />
            </ResearchSection>

            {/* 6. Differentiation */}
            <ResearchSection id={SECTIONS[5].id} title={SECTIONS[5].label} icon={SECTIONS[5].icon} subtitle="Mapa de posicionamiento y oportunidades">
              <LandingDifferentiation differentiation={product.competitor_analysis?.differentiation} />
            </ResearchSection>

            {/* 7. Sales Angles */}
            <ResearchSection id={SECTIONS[6].id} title={SECTIONS[6].label} icon={SECTIONS[6].icon} subtitle="Hooks y angulos de persuasion por avatar">
              <LandingSalesAngles salesAnglesData={product.sales_angles_data} />
            </ResearchSection>

            {/* 8. PUV & Transformation */}
            <ResearchSection id={SECTIONS[7].id} title={SECTIONS[7].label} icon={SECTIONS[7].icon} subtitle="Propuesta unica de valor y tabla de transformacion">
              <LandingPUVTransformation salesAnglesData={product.sales_angles_data} />
            </ResearchSection>

            {/* 9. Strategic Playbook (ESFERA) */}
            <ResearchSection id={SECTIONS[8].id} title={SECTIONS[8].label} icon={SECTIONS[8].icon} subtitle="Estrategia por fases del metodo ESFERA">
              <LandingStrategicPlaybook contentStrategy={product.content_strategy} />
            </ResearchSection>

            {/* 10. Lead Magnets & Creatives */}
            <ResearchSection id={SECTIONS[9].id} title={SECTIONS[9].label} icon={SECTIONS[9].icon} subtitle="Lead magnets y creativos de video">
              <LandingLeadMagnets salesAnglesData={product.sales_angles_data} />
            </ResearchSection>

            {/* 11. Content Calendar */}
            <ResearchSection id={SECTIONS[10].id} title={SECTIONS[10].label} icon={SECTIONS[10].icon} subtitle="Parrilla de contenido para 4 semanas">
              <LandingContentCalendar contentCalendar={product.content_calendar} />
            </ResearchSection>

            {/* 12. Launch Strategy */}
            <ResearchSection id={SECTIONS[11].id} title={SECTIONS[11].label} icon={SECTIONS[11].icon} subtitle="Plan de pre-lanzamiento, lanzamiento y post-venta">
              <LandingLaunchStrategy launchStrategy={product.launch_strategy} />
            </ResearchSection>

            {/* Footer */}
            <div className="text-center py-8 text-white/20 text-xs">
              Generado con Kreoon &middot; Powered by Perplexity AI
            </div>
          </main>
        </div>
      </div>

      <ResearchKiroButton activeSectionId={activeSectionId} />
    </div>
  );
}
