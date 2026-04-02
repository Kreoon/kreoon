import { Star, Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartMatch } from '@/hooks/useMarketplaceCampaigns';

interface SuggestedCreatorsProps {
  campaignId: string;
  limit?: number;
  onInvite?: (creatorId: string) => void;
}

export function SuggestedCreators({ campaignId, limit = 10, onInvite }: SuggestedCreatorsProps) {
  const { results, loading } = useSmartMatch(campaignId);
  const displayed = limit ? results.slice(0, limit) : results;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
        <span className="ml-2 text-gray-400 text-sm">Buscando creadores...</span>
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 text-sm">No se encontraron creadores compatibles por ahora</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-400" />
        Creadores sugeridos ({displayed.length})
      </h3>
      <div className="space-y-2">
        {displayed.map(creator => (
          <div
            key={creator.creator_id}
            className="flex items-center gap-3 p-3 bg-card/60 border border-white/5 rounded-sm hover:border-white/10 transition-all"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-400 font-bold">{creator.display_name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm truncate">{creator.display_name}</span>
                {creator.rating_avg > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-400">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {creator.rating_avg.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {creator.match_reasons.map((reason, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            {/* Match score */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                'text-xs font-bold px-2 py-1 rounded-full',
                creator.match_score >= 70 ? 'bg-green-500/15 text-green-400' :
                creator.match_score >= 40 ? 'bg-amber-500/15 text-amber-400' :
                'bg-white/10 text-gray-400',
              )}>
                {creator.match_score}%
              </span>
              {onInvite && (
                <button
                  onClick={() => onInvite(creator.creator_id)}
                  className="flex items-center gap-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-1.5 rounded-sm transition-colors"
                >
                  <UserPlus className="h-3 w-3" />
                  Invitar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
