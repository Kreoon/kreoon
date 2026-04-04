import { memo } from 'react';
import { Star, Quote, CheckCircle, Building, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { BlockProps } from '../types/profile-builder';
import { usePublicReviews, useReviewStats, type CreatorReview } from '@/hooks/useCreatorReviews';
import { getBlockStyleObject } from './blockStyles';

interface VerifiedReviewsConfig {
  layout: 'grid' | 'carousel' | 'featured';
  maxItems: number;
  showStats: boolean;
  showCompany: boolean;
  showDate: boolean;
}


function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses,
            star <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  showCompany,
  showDate,
  featured,
}: {
  review: CreatorReview;
  showCompany: boolean;
  showDate: boolean;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative p-5 rounded-xl border bg-card',
        featured && 'border-primary/30 bg-primary/5',
        'hover:border-primary/50 transition-colors',
      )}
    >
      {/* Verificado badge */}
      {review.is_verified && (
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="gap-1 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle className="h-3 w-3" />
            Verificado
          </Badge>
        </div>
      )}

      {/* Quote icon */}
      <Quote className="h-6 w-6 text-primary/30 mb-3" />

      {/* Content */}
      {review.title && (
        <h4 className="font-semibold text-foreground mb-2">{review.title}</h4>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        "{review.content}"
      </p>

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={review.rating} />
      </div>

      {/* Author */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.reviewer_avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {review.reviewer_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{review.reviewer_name}</p>
          {showCompany && review.reviewer_company && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building className="h-3 w-3" />
              <span className="truncate">{review.reviewer_company}</span>
            </div>
          )}
          {showDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(review.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Creator response */}
      {review.creator_response && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Respuesta del creador:</p>
          <p className="text-sm italic text-muted-foreground">"{review.creator_response}"</p>
        </div>
      )}

      {/* Featured badge */}
      {review.is_featured && (
        <div className="absolute -top-2 left-4">
          <Badge className="bg-amber-500 text-white border-0 text-[10px]">
            Destacada
          </Badge>
        </div>
      )}
    </div>
  );
}

function StatsBar({ stats }: { stats: { total_reviews: number; average_rating: number } }) {
  return (
    <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted/50 mb-6">
      <div className="text-center">
        <p className="text-3xl font-bold text-foreground">{stats.average_rating?.toFixed(1) || '0'}</p>
        <div className="flex justify-center mt-1">
          <StarRating rating={Math.round(stats.average_rating || 0)} size="md" />
        </div>
      </div>
      <div className="w-px h-12 bg-border" />
      <div className="text-center">
        <p className="text-3xl font-bold text-foreground">{stats.total_reviews || 0}</p>
        <p className="text-xs text-muted-foreground">resenas verificadas</p>
      </div>
    </div>
  );
}

function VerifiedReviewsBlockComponent({ block, isEditing }: BlockProps) {
  const config = block.config as VerifiedReviewsConfig;
  const styles = block.styles;

  // En modo edicion, usar datos de ejemplo
  // En produccion, obtener el creatorId del contexto
  const creatorId = (block.content as any)?.creatorId;

  const { data: reviews = [], isLoading: reviewsLoading } = usePublicReviews(creatorId);
  const { data: stats } = useReviewStats(creatorId);

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  // Usa getBlockStyleObject para obtener estilos base
  const blockStyle = getBlockStyleObject(styles);

  // Datos de ejemplo para modo edicion
  const sampleReviews: CreatorReview[] = [
    {
      id: '1',
      creator_id: '',
      reviewer_name: 'Maria Garcia',
      reviewer_company: 'TechCorp',
      rating: 5,
      title: 'Excelente colaboracion!',
      content: 'Trabajar con este creador fue una experiencia increible. El contenido supero todas nuestras expectativas y la comunicacion fue impecable.',
      is_verified: true,
      status: 'approved',
      is_featured: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      creator_id: '',
      reviewer_name: 'Carlos Rodriguez',
      reviewer_company: 'StartupXYZ',
      rating: 5,
      content: 'Muy profesional, entrego todo a tiempo y con excelente calidad. Lo recomiendo al 100%.',
      is_verified: true,
      status: 'approved',
      is_featured: false,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      creator_id: '',
      reviewer_name: 'Ana Martinez',
      rating: 4,
      content: 'Buen trabajo en general. El contenido fue de calidad y cumplimos los objetivos de la campana.',
      is_verified: true,
      status: 'approved',
      is_featured: false,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const displayReviews = isEditing ? sampleReviews : reviews;
  const displayStats = isEditing
    ? { total_reviews: 3, average_rating: 4.7 }
    : stats;

  const visibleReviews = displayReviews.slice(0, config.maxItems || 6);

  if (!isEditing && reviewsLoading) {
    return (
      <div className={cn(paddingClasses[styles.padding || 'md'])} style={blockStyle}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isEditing && displayReviews.length === 0) {
    return (
      <div className={cn(paddingClasses[styles.padding || 'md'])} style={blockStyle}>
        <div className="text-center py-8">
          <Quote className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aun no hay resenas verificadas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(paddingClasses[styles.padding || 'md'])} style={blockStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Resenas Verificadas
        </h2>
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          {displayStats?.total_reviews || 0} verificadas
        </Badge>
      </div>

      {/* Stats bar */}
      {config.showStats && displayStats && displayStats.total_reviews > 0 && (
        <StatsBar stats={displayStats} />
      )}

      {/* Reviews grid */}
      <div
        className={cn(
          'grid gap-4',
          config.layout === 'featured'
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2',
        )}
      >
        {visibleReviews.map((review, index) => (
          <ReviewCard
            key={review.id}
            review={review}
            showCompany={config.showCompany}
            showDate={config.showDate}
            featured={config.layout === 'featured' && index === 0}
          />
        ))}
      </div>

      {/* Ver mas */}
      {displayReviews.length > (config.maxItems || 6) && (
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            +{displayReviews.length - (config.maxItems || 6)} resenas mas
          </p>
        </div>
      )}
    </div>
  );
}

export const VerifiedReviewsBlock = memo(VerifiedReviewsBlockComponent);
