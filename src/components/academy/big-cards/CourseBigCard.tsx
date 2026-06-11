import { Link } from 'react-router-dom';
import { Play, Users, Clock, Sparkles } from 'lucide-react';
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
  level?: 'beginner' | 'intermediate' | 'advanced' | null;
  emoji?: string | null;
}

interface CourseBigCardProps {
  course: CourseLike;
  spaceSlug: string;
  accentColor?: string;
  progress?: number;
  variant?: 'default' | 'wide';
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: '🌱 Principiante',
  intermediate: '🚀 Intermedio',
  advanced: '🏆 Avanzado',
};

/**
 * CourseBigCard Duolingo-style: thumbnail 16:9 prominente, badges visibles,
 * progreso visual con barra gruesa, CTA grande con emoji.
 */
export function CourseBigCard({
  course,
  spaceSlug,
  accentColor = '#8B5CF6',
  progress,
  variant = 'default',
}: CourseBigCardProps) {
  const priceLabel = course.is_free
    ? '✨ Gratis'
    : course.price_usd
      ? `US$${course.price_usd}`
      : '✨ Gratis';
  const emoji = course.emoji ?? '🎬';
  const hasProgress = typeof progress === 'number' && progress > 0;

  return (
    <Link
      to={`/academia/${spaceSlug}/${course.slug}`}
      className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-3xl"
      aria-label={`Curso ${course.title}`}
    >
      <BigCard accentColor={accentColor} glow className="h-full flex flex-col">
        {/* Cover 16:9 */}
        <div
          className="relative aspect-video w-full overflow-hidden"
          style={
            !course.cover_image_url
              ? {
                  background: `linear-gradient(135deg, ${accentColor}50 0%, ${accentColor}10 50%, transparent 100%)`,
                }
              : undefined
          }
        >
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt=""
              className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl motion-safe:group-hover:scale-110 transition-transform duration-500" aria-hidden="true">
                {emoji}
              </span>
            </div>
          )}

          {/* Overlay gradient para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Badge precio esquina superior derecha */}
          <div
            className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: course.is_free ? 'rgba(16,185,129,0.95)' : `${accentColor}f0`,
              color: 'white',
            }}
          >
            {priceLabel}
          </div>

          {/* Badge nivel esquina superior izquierda */}
          {course.level && LEVEL_LABEL[course.level] && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-sm text-white border border-white/20">
              {LEVEL_LABEL[course.level]}
            </div>
          )}

          {/* Play button overlay al hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 motion-safe:group-hover:opacity-100 transition-opacity duration-300">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="h-7 w-7 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className={cn('p-5 flex-1 flex flex-col gap-3', variant === 'wide' && 'md:p-6')}>
          <h3 className="font-extrabold text-lg md:text-xl leading-tight text-zinc-50 line-clamp-2 group-hover:text-white transition-colors">
            {course.title}
          </h3>

          {course.description && (
            <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          )}

          {/* Progress bar si está inscrito */}
          {hasProgress && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                <span className="text-zinc-300">📚 Tu progreso</span>
                <span style={{ color: accentColor }}>{Math.round(progress!)}%</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 motion-safe:animate-in motion-safe:slide-in-from-left"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer meta */}
          <div className="mt-auto flex items-center gap-3 text-xs text-zinc-400 pt-2">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {course.enrolled_count ?? 0}
            </span>
            {course.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {course.duration_minutes}min
              </span>
            )}
            <span
              className="ml-auto flex items-center gap-1 font-bold text-sm group-hover:gap-2 transition-all"
              style={{ color: accentColor }}
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
