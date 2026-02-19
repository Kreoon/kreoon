import { Trophy, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCaseStudies } from '@/hooks/useMarketplaceCampaigns';
import { CaseStudyCard } from '@/components/marketplace/case-studies/CaseStudyCard';

export default function CaseStudies() {
  const navigate = useNavigate();
  const { caseStudies, loading } = useCaseStudies();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Trophy className="h-4 w-4" />
            Casos de Exito
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Resultados reales de marcas reales
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Descubre como otras marcas han logrado resultados excepcionales con creadores de KREOON.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mb-10">
          <button
            onClick={() => navigate('/marketplace/campaigns/create?quick=true')}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Crea tu campana
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        ) : caseStudies.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {caseStudies.map(cs => (
              <CaseStudyCard key={cs.id} caseStudy={cs} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-semibold">Proximamente</h3>
            <p className="text-gray-500 text-sm mt-1">
              Los casos de exito se generan automaticamente cuando las campanas se completan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
