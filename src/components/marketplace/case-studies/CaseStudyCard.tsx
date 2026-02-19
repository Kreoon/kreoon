import { ArrowRight, Star, Users, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CaseStudy } from '../types/marketplace';

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  const navigate = useNavigate();
  const metrics = caseStudy.metrics || {};

  return (
    <div
      onClick={() => navigate(`/casos-de-exito/${caseStudy.slug}`)}
      className="bg-card/80 border border-white/5 rounded-xl p-5 hover:border-purple-500/30 transition-all cursor-pointer group"
    >
      {/* Title */}
      <h3 className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors line-clamp-2 mb-3">
        {caseStudy.title}
      </h3>

      {/* Metrics */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        {metrics.total_deliveries != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {metrics.total_deliveries} entregas
          </span>
        )}
        {metrics.avg_rating > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            {metrics.avg_rating}
          </span>
        )}
        {metrics.budget != null && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            ${Number(metrics.budget).toLocaleString()} {metrics.currency || 'USD'}
          </span>
        )}
      </div>

      {/* Creator highlights */}
      {caseStudy.creator_highlights && caseStudy.creator_highlights.length > 0 && (
        <div className="flex -space-x-2 mb-3">
          {caseStudy.creator_highlights.slice(0, 4).map((c, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-white/10 border-2 border-background flex items-center justify-center overflow-hidden"
            >
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400 font-bold">{c.name?.charAt(0) || '?'}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-1 text-purple-400 text-xs font-medium group-hover:gap-2 transition-all">
        Ver caso completo
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
