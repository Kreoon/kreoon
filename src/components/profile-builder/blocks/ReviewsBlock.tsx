import { memo, useState } from 'react';
import { Star, BadgeCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePublicReviews, useReviewStats, type CreatorReview } from '@/hooks/useCreatorReviews';
import type { BlockProps } from '../types/profile-builder';

interface ReviewsConfig {
  layout: 'carousel' | 'grid';
  columns: '1' | '2' | '3' | '4';
  maxItems: number;
  showStats: boolean;
}

interface ReviewsContent {
  title?: string;
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

const COLUMNS_CLASSES: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 md:grid-cols-2',
  '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

function getColumnsClass(columns: string | undefined): string {
  if (!columns) return COLUMNS_CLASSES['3'];
  return COLUMNS_CLASSES[columns] || COLUMNS_CLASSES['3'];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40',
          )}
        />
      ))}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// Tarjeta de reseña individual
function ReviewCard({ review }: { review: CreatorReview }) {
  return (
    <div className="bg-card/50 rounded-lg border border-border/50 p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <StarRating rating={review.rating} />
        {review.is_verified && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verificada
          </span>
        )}
      </div>

      {review.title && (
        <h4 className="font-medium text-foreground text-sm">{review.title}</h4>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        "{review.content}"
      </p>

      {review.creator_response && (
        <div className="bg-primary/5 rounded-md p-3 border-l-2 border-primary">
          <p className="text-xs text-muted-foreground italic">
            <span className="font-medium text-foreground">Respuesta:</span> {review.creator_response}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/30">
        {review.reviewer_avatar_url ? (
          <img
            src={review.reviewer_avatar_url}
            alt={review.reviewer_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">
              {review.reviewer_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {review.reviewer_name}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {review.reviewer_company && (
              <span className="truncate">{review.reviewer_company}</span>
            )}
            {review.reviewer_company && review.collaboration_date && (
              <span>•</span>
            )}
            {review.collaboration_date && (
              <span>{formatDate(review.collaboration_date)}</span>
            )}
          </div>
        </div>
        {review.is_featured && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
            Destacada
          </span>
        )}
      </div>
    </div>
  );
}

// Placeholder cuando no hay reseñas
function EmptyReviewsPlaceholder({ isEditing }: { isEditing: boolean }) {
  return (
    <div className="text-center py-12 px-6 bg-card/30 rounded-xl border border-dashed border-border/50">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="h-8 w-8 text-primary/60" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">Sin resenas aun</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Las resenas son dejadas por clientes y agencias verificadas que han trabajado contigo.
        No se pueden crear manualmente.
      </p>
      {isEditing && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Solicita resenas a tus clientes desde la seccion de Resenas en tu dashboard.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/settings?tab=reviews" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
              Ir a Configuracion de Resenas
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

// Estadisticas de resenas
function ReviewStatsBar({ stats }: { stats: { total_reviews: number; average_rating: number; verified_reviews: number } }) {
  return (
    <div className="flex items-center justify-center gap-6 mb-6 py-3 px-4 bg-card/30 rounded-lg border border-border/30">
      <div className="text-center">
        <div className="flex items-center gap-1 justify-center">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="text-xl font-bold text-foreground">{stats.average_rating.toFixed(1)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Promedio</p>
      </div>
      <div className="h-8 w-px bg-border/50" />
      <div className="text-center">
        <span className="text-xl font-bold text-foreground">{stats.total_reviews}</span>
        <p className="text-xs text-muted-foreground">Resenas</p>
      </div>
      <div className="h-8 w-px bg-border/50" />
      <div className="text-center">
        <div className="flex items-center gap-1 justify-center">
          <BadgeCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xl font-bold text-foreground">{stats.verified_reviews}</span>
        </div>
        <p className="text-xs text-muted-foreground">Verificadas</p>
      </div>
    </div>
  );
}

function ReviewsBlockComponent({ block, isEditing, isSelected, onUpdate, creatorProfileId }: BlockProps) {
  const config = {
    layout: 'carousel',
    columns: '3',
    maxItems: 6,
    showStats: true,
    ...block.config,
  } as ReviewsConfig;
  const content = block.content as ReviewsContent;
  const styles = block.styles;
  const columnsNum = parseInt(config.columns, 10) || 3;
  const [activeIndex, setActiveIndex] = useState(0);

  // Obtener resenas verificadas de la BD (con manejo de errores)
  const { data: reviews = [], isLoading, error: reviewsError } = usePublicReviews(creatorProfileId);
  const { data: stats, error: statsError } = useReviewStats(creatorProfileId);

  // Si hay error (tabla no existe), mostrar placeholder
  const hasError = !!reviewsError || !!statsError;

  // Limitar resenas segun config
  const displayedReviews = reviews.slice(0, config.maxItems);

  const handleContentUpdate = (updates: Partial<ReviewsContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  // Si esta cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}>
        <div className="h-8 w-48 bg-muted/50 rounded animate-pulse mb-6" />
        <div className={cn('grid gap-4', getColumnsClass(config.columns))}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card/30 rounded-lg border border-border/30 p-5 animate-pulse">
              <div className="h-4 w-24 bg-muted/50 rounded mb-3" />
              <div className="h-16 bg-muted/30 rounded mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted/50" />
                <div className="flex-1">
                  <div className="h-3 w-24 bg-muted/50 rounded mb-1" />
                  <div className="h-2 w-16 bg-muted/30 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Si hay error de BD (tabla no existe), mostrar placeholder sin crashear
  if (hasError && !isLoading) {
    return (
      <div className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}>
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          {content.title || 'Lo que dicen de mi'}
        </h2>
        <EmptyReviewsPlaceholder isEditing={isEditing} />
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}
      style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}
    >
      {/* Titulo - Solo el titulo es editable */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Lo que dicen de mi"
          className="text-xl md:text-2xl font-bold text-foreground bg-transparent border-none w-full mb-4 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        />
      ) : (
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          {content.title || 'Lo que dicen de mi'}
        </h2>
      )}

      {/* Aviso en modo edicion */}
      {isEditing && isSelected && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            <strong>Resenas verificadas:</strong> Este bloque muestra resenas reales de clientes y agencias
            que han trabajado contigo. No se pueden crear ni editar manualmente para garantizar autenticidad.
          </p>
        </div>
      )}

      {/* Estadisticas */}
      {config.showStats && stats && stats.total_reviews > 0 && (
        <ReviewStatsBar stats={stats} />
      )}

      {/* Sin resenas */}
      {displayedReviews.length === 0 ? (
        <EmptyReviewsPlaceholder isEditing={isEditing} />
      ) : (
        <>
          {/* Grid layout */}
          {(config.layout === 'grid' || isEditing) && (
            <div className={cn('grid gap-4', getColumnsClass(config.columns))}>
              {displayedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}

          {/* Carousel layout (solo en preview) */}
          {config.layout === 'carousel' && !isEditing && displayedReviews.length > 0 && (
            (() => {
              const visibleCount = Math.min(columnsNum, displayedReviews.length);
              const totalPages = Math.max(1, displayedReviews.length - visibleCount + 1);
              const widthPercent = 100 / visibleCount;

              return (
                <div className="relative group/carousel">
                  {activeIndex > 0 && (
                    <button
                      onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  )}
                  {activeIndex < totalPages - 1 && (
                    <button
                      onClick={() => setActiveIndex((i) => Math.min(totalPages - 1, i + 1))}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}

                  <div className="overflow-hidden">
                    <div
                      className="flex transition-transform duration-300 gap-4"
                      style={{ transform: `translateX(-${activeIndex * (widthPercent + (4 * 100 / (visibleCount * 100)))}%)` }}
                    >
                      {displayedReviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex-shrink-0"
                          style={{ width: `calc(${widthPercent}% - ${(visibleCount - 1) * 16 / visibleCount}px)` }}
                        >
                          <ReviewCard review={review} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-1.5 mt-4">
                      {Array.from({ length: totalPages }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveIndex(index)}
                          className={cn(
                            'w-2 h-2 rounded-full transition-colors',
                            index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30',
                          )}
                          aria-label={`Ir a pagina ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </>
      )}
    </div>
  );
}

export const ReviewsBlock = memo(ReviewsBlockComponent);
