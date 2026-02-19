import { useState } from 'react';
import { Star, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorReview } from '../types/marketplace';

interface ReviewsSectionProps {
  reviews: CreatorReview[];
  ratingAvg: number;
  ratingCount: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 7) return `hace ${days} día${days !== 1 ? 's' : ''}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} semana${weeks !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`;
  return `hace más de 1 año`;
}

export function ReviewsSection({ reviews, ratingAvg, ratingCount }: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="pb-8 border-b border-white/10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Reseñas</h2>
        <div className="flex items-center gap-1.5">
          <Star className="h-5 w-5 text-purple-400 fill-purple-400" />
          <span className="text-white font-semibold">{ratingAvg.toFixed(1)}</span>
          <span className="text-gray-500 text-sm">({ratingCount})</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Este creador aún no tiene reseñas</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {visible.map(review => (
              <div
                key={review.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3"
              >
                {/* Stars + date */}
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < review.rating
                            ? 'text-purple-400 fill-purple-400'
                            : 'text-gray-600',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-gray-500 text-xs">{timeAgo(review.date)}</span>
                </div>

                {/* Text */}
                <p className="text-foreground/80 text-sm leading-relaxed italic">
                  "{review.text}"
                </p>

                {/* Brand */}
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-white text-sm font-medium">{review.brand_name}</span>
                  <span className="text-gray-500 text-sm">— {review.campaign_type}</span>
                </div>
              </div>
            ))}
          </div>

          {reviews.length > 3 && !showAll && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowAll(true)}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
              >
                Ver todas las reseñas ({reviews.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
