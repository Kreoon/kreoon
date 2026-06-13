import { Link } from 'react-router-dom';
import { Play, Trophy } from 'lucide-react';
import { BigCard } from './BigCard';

interface ContinueLearningBigCardProps {
  spaceSlug: string;
  courseTitle: string;
  courseSlug: string;
  coverImageUrl?: string | null;
  progress: number;
  nextLessonTitle?: string | null;
  accentColor?: string;
}

const KREOON_PURPLE = '#7c3aed';

/**
 * Banner XL para retomar el curso en progreso.
 * Brand voice 100% Kreoon: cover sin colorear, CTA y barra en purple Kreoon.
 */
export function ContinueLearningBigCard({
  spaceSlug,
  courseTitle,
  courseSlug,
  coverImageUrl,
  progress,
  nextLessonTitle,
}: ContinueLearningBigCardProps) {
  const pct = Math.round(progress);
  const remaining = 100 - pct;
  const motivation =
    pct >= 90
      ? `🏁 A un paso del final`
      : pct >= 50
        ? `📈 Llevas un buen ritmo`
        : pct >= 20
          ? `✨ Avanzando paso a paso`
          : `🌱 Recién empezando`;

  return (
    <BigCard accentColor={KREOON_PURPLE} glow gradient="purple" className="overflow-hidden">
      <div className="flex flex-col md:flex-row gap-0 md:gap-6">
        {/* Cover */}
        <div
          className="relative md:w-64 md:flex-shrink-0 aspect-video md:aspect-auto md:min-h-[180px] overflow-hidden"
          style={
            !coverImageUrl
              ? {
                  background: `linear-gradient(135deg, ${KREOON_PURPLE}30, #0a0a0f)`,
                }
              : undefined
          }
        >
          {coverImageUrl ? (
            <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-7xl" aria-hidden="true">
              📚
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40 md:to-black/0 pointer-events-none" />

          {/* Trofeo flotante si va >80% */}
          {pct >= 80 && (
            <div className="absolute top-3 right-3 motion-safe:animate-bounce">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shadow-xl border-2"
                style={{
                  backgroundColor: KREOON_PURPLE,
                  borderColor: `${KREOON_PURPLE}80`,
                }}
              >
                <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>

        {/* Cuerpo */}
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-center gap-3">
          <div
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: KREOON_PURPLE }}
          >
            Continúa donde lo dejaste
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-white">
            {courseTitle}
          </h2>
          {nextLessonTitle && (
            <p className="text-sm text-zinc-400">
              Próxima lección: <span className="text-zinc-200 font-medium">{nextLessonTitle}</span>
            </p>
          )}

          {/* Progreso visual */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-zinc-300">{motivation}</span>
              <span style={{ color: KREOON_PURPLE }}>{pct}%</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 motion-safe:animate-in motion-safe:slide-in-from-left"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${KREOON_PURPLE}, #a855f7)`,
                  boxShadow: `0 0 12px ${KREOON_PURPLE}80`,
                }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-zinc-500">
              Te falta {remaining}% para completar el curso
            </div>
          </div>

          {/* CTA */}
          <Link
            to={`/academia/${spaceSlug}/${courseSlug}/learn`}
            className="mt-3 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-base text-white shadow-lg motion-safe:hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{
              background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
              boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
            }}
          >
            <Play className="h-5 w-5 fill-white" aria-hidden="true" />
            Retomar lección
          </Link>
        </div>
      </div>
    </BigCard>
  );
}
