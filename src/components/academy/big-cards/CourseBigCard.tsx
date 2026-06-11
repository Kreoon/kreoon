import { Link } from 'react-router-dom';
import { Play, Users, Clock, Sparkles, Star } from 'lucide-react';
import { BigCard } from './BigCard';
import { cn } from '@/lib/utils';

interface CourseLike {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_free?: boolean;
  price_usd?: number | null;
  enrolled_count?: number | null;
  duration_minutes?: number | null;
  total_duration_minutes?: number | null;
  level?: 'beginner' | 'intermediate' | 'advanced' | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  emoji?: string | null;
  avg_rating?: number | null;
}

interface CourseBigCardProps {
  course: CourseLike;
  spaceSlug: string;
  /** Solo decorativo del space — internamente forzamos brand Kreoon. */
  accentColor?: string;
  progress?: number;
  variant?: 'default' | 'wide' | 'hero';
}

const KREOON_PURPLE = '#7c3aed';

const LEVEL_LABEL: Record<string, string> = {
  beginner: '🌱 Principiante',
  intermediate: '🚀 Intermedio',
  advanced: '🏆 Avanzado',
};

/**
 * CourseBigCard banner-style: cover prominente con overlay,
 * info estructurada, CTA grande con emoji.
 *
 * - default: grid de tarjetas grandes (aspect 16:10 cover)
 * - wide:    horizontal grande para feed
 * - hero:    banner XL ancho completo
 */
export function CourseBigCard({
  course,
  spaceSlug,
  progress,
  variant = 'default',
}: CourseBigCardProps) {
  const accent = KREOON_PURPLE;
  const priceLabel = course.is_free
    ? '✨ Gratis'
    : course.price_usd
      ? `US$${course.price_usd}`
      : '✨ Gratis';
  const emoji = course.emoji ?? '🎬';
  const hasProgress = typeof progress === 'number' && progress > 0;
  const level = course.level ?? course.difficulty;
  const durationMin = course.total_duration_minutes ?? course.duration_minutes ?? 0;
  const durationLabel =
    durationMin >= 60
      ? `${Math.round(durationMin / 60)}h`
      : durationMin > 0
        ? `${durationMin}m`
        : null;

  const coverAspect =
    variant === 'hero' ? 'aspect-[21/9]' : variant === 'wide' ? 'aspect-[2/1]' : 'aspect-[16/10]';

  return (
    <Link
      to={`/academia/${spaceSlug}/${course.slug}`}
      className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-3xl"
      aria-label={`Curso ${course.title}`}
    >
      <BigCard accentColor={accent} glow className="h-full flex flex-col">
        {/* Cover banner */}
        <div
          className={cn('relative w-full overflow-hidden', coverAspect)}
          style={
            !course.cover_image_url
              ? {
                  background: `linear-gradient(135deg, ${accent}50 0%, ${accent}10 50%, transparent 100%)`,
                }
              : undefined
          }
        >
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt=""
              className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-8xl md:text-9xl motion-safe:group-hover:scale-110 transition-transform duration-500"
                aria-hidden="true"
              >
                {emoji}
              </span>
            </div>
          )}

          {/* Overlay gradient para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Badge precio esquina superior derecha */}
          <div
            className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full text-sm font-extrabold shadow-xl backdrop-blur-md border border-white/20"
            style={{
              backgroundColor: course.is_free ? 'rgba(16,185,129,0.95)' : `${accent}f0`,
              color: 'white',
            }}
          >
            {priceLabel}
          </div>

          {/* Badge nivel esquina superior izquierda */}
          {level && LEVEL_LABEL[level] && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-lg">
              {LEVEL_LABEL[level]}
            </div>
          )}

          {/* Play button overlay al hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 motion-safe:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30 backdrop-blur-md"
              style={{ backgroundColor: `${accent}f0` }}
            >
              <Play className="h-9 w-9 text-white fill-white ml-1.5" />
            </div>
          </div>

          {/* Título overlay sobre cover (siempre visible) */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
            <h3 className="font-extrabold text-xl md:text-2xl leading-tight text-white drop-shadow-2xl line-clamp-2">
              {course.title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6 flex-1 flex flex-col gap-3">
          {course.description && (
            <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          )}

          {/* Progress bar si está inscrito */}
          {hasProgress && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-zinc-200">📚 Tu progreso</span>
                <span style={{ color: accent }}>{Math.round(progress!)}%</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${accent}, #a855f7)`,
                    boxShadow: `0 0 10px ${accent}60`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer meta */}
          <div className="mt-auto flex items-center gap-3 text-xs text-zinc-400 pt-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {course.enrolled_count ?? 0}
            </span>
            {durationLabel && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {durationLabel}
              </span>
            )}
            {course.avg_rating && course.avg_rating > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {course.avg_rating.toFixed(1)}
              </span>
            )}
            <span
              className="ml-auto flex items-center gap-1 font-extrabold text-sm group-hover:gap-2 transition-all"
              style={{ color: accent }}
            >
              {hasProgress ? 'Continuar' : 'Empezar'}
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </BigCard>
    </Link>
  );
}
