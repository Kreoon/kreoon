import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Star, Users, DollarSign, Clock, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CaseStudy } from '@/components/marketplace/types/marketplace';

export default function CaseStudyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('campaign_case_studies')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setCaseStudy(data);
      } catch (err) {
        console.error('[CaseStudyDetail] Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!caseStudy) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Trophy className="h-12 w-12 text-gray-600 mb-3" />
        <h2 className="text-white font-semibold text-lg">Caso de exito no encontrado</h2>
        <button
          onClick={() => navigate('/casos-de-exito')}
          className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
        >
          Ver todos los casos
        </button>
      </div>
    );
  }

  const metrics = caseStudy.metrics || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Back */}
        <button
          onClick={() => navigate('/casos-de-exito')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos los casos
        </button>

        {/* Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-xs font-medium mb-3">
            <Trophy className="h-3.5 w-3.5" />
            Caso de Exito
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{caseStudy.title}</h1>
        </div>

        {/* Metrics dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {metrics.total_deliveries != null && (
            <div className="bg-card/80 border border-white/5 rounded-xl p-4 text-center">
              <Users className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{metrics.total_deliveries}</div>
              <div className="text-xs text-gray-500">Entregas</div>
            </div>
          )}
          {metrics.avg_rating > 0 && (
            <div className="bg-card/80 border border-white/5 rounded-xl p-4 text-center">
              <Star className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{metrics.avg_rating}</div>
              <div className="text-xs text-gray-500">Rating promedio</div>
            </div>
          )}
          {metrics.budget != null && (
            <div className="bg-card/80 border border-white/5 rounded-xl p-4 text-center">
              <DollarSign className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">${Number(metrics.budget).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Presupuesto</div>
            </div>
          )}
          {metrics.duration_days != null && (
            <div className="bg-card/80 border border-white/5 rounded-xl p-4 text-center">
              <Clock className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{metrics.duration_days}</div>
              <div className="text-xs text-gray-500">Dias</div>
            </div>
          )}
        </div>

        {/* Summary */}
        {caseStudy.summary_html && (
          <div className="prose prose-invert prose-sm max-w-none mb-8">
            <div dangerouslySetInnerHTML={{ __html: caseStudy.summary_html }} />
          </div>
        )}

        {/* Creator highlights */}
        {caseStudy.creator_highlights && caseStudy.creator_highlights.length > 0 && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-3">Creadores destacados</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {caseStudy.creator_highlights.map((c, i) => (
                <div key={i} className="bg-card/60 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-400 font-bold">{c.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-white text-sm font-medium">{c.name}</span>
                    {c.role && <p className="text-gray-500 text-xs">{c.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {caseStudy.gallery_urls && caseStudy.gallery_urls.length > 0 && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-3">Galeria</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {caseStudy.gallery_urls.map((url, i) => (
                <img key={i} src={url} alt={`Gallery ${i + 1}`} className="rounded-xl w-full h-48 object-cover" />
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Quieres resultados similares?</h3>
          <p className="text-gray-400 text-sm mb-4">
            Crea tu campana express y conecta con creadores en minutos.
          </p>
          <button
            onClick={() => navigate('/marketplace/campaigns/create?quick=true')}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <Zap className="h-4 w-4" />
            Crear Campana Similar
          </button>
        </div>
      </div>
    </div>
  );
}
