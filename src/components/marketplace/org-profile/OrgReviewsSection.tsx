import { Star, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { OrgReview } from '../types/marketplace';

interface OrgReviewsSectionProps {
  reviews: OrgReview[];
  accentColor: string;
}

export function OrgReviewsSection({ reviews, accentColor }: OrgReviewsSectionProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-500">Aún no hay reseñas para esta organización</p>
      </div>
    );
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{avgRating.toFixed(1)}</div>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < Math.round(avgRating) ? 'fill-purple-400 text-purple-400' : 'text-gray-700'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{reviews.length} reseñas</p>
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map(review => {
          const initials = review.reviewer_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={review.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={review.reviewer_avatar || ''} />
                  <AvatarFallback className="text-xs" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{review.reviewer_name}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? 'fill-purple-400 text-purple-400' : 'text-gray-700'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.project_type && (
                    <p className="text-xs text-gray-500 mt-0.5">{review.project_type}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">{review.review_text}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(review.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
