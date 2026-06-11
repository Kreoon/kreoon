import { CheckCircle2 } from 'lucide-react';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { cn } from '@/lib/utils';
import { useMyWeeklyMissions } from '@/hooks/academy/useAcademyGamification';

interface MissionsCardProps {
  spaceId: string;
  /** Ignorado — Misiones es brand Kreoon. */
  accentColor?: string;
}

const KREOON_PURPLE = '#7c3aed';

export function MissionsCard({ spaceId }: MissionsCardProps) {
  const accentColor = KREOON_PURPLE;
  const { data: missions = [], isLoading } = useMyWeeklyMissions(spaceId);

  if (isLoading) return null;

  if (missions.length === 0) {
    return (
      <BigCard gradient="purple" className="p-5">
        <div className="flex items-start gap-3">
          <div className="text-4xl" aria-hidden="true">🎯</div>
          <div className="flex-1">
            <h2 className="font-extrabold text-base text-zinc-100 mb-1">
              Misiones semanales
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Cada lunes recibes 3 misiones nuevas. Mantente activo esta semana para empezar.
            </p>
          </div>
        </div>
      </BigCard>
    );
  }

  const completed = missions.filter((m) => m.completed).length;
  const total = missions.length;
  const allDone = completed === total;

  return (
    <BigCard gradient={allDone ? 'emerald' : 'purple'} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="text-3xl" aria-hidden="true">{allDone ? '🏆' : '🎯'}</div>
          <div>
            <h2 className="font-extrabold text-base text-zinc-100 leading-tight">
              Misiones semanales
            </h2>
            <div className="text-xs text-zinc-400 mt-0.5">
              {allDone ? '¡Todas completas, leyenda!' : `${completed} de ${total} completas`}
            </div>
          </div>
        </div>
        <div
          className="px-3 py-1.5 rounded-full text-sm font-bold"
          style={{
            backgroundColor: allDone ? 'rgba(16,185,129,0.2)' : `${accentColor}20`,
            color: allDone ? '#10b981' : accentColor,
          }}
        >
          {completed}/{total}
        </div>
      </div>

      <ul className="space-y-3">
        {missions.map((m) => {
          const pct = Math.round((m.progress / m.goal) * 100);
          return (
            <li
              key={m.id}
              className={cn(
                'rounded-2xl border-2 p-3 transition-all',
                m.completed
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-white/5 bg-black/20 hover:border-white/15'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'text-3xl flex-shrink-0 transition-transform',
                    m.completed && 'motion-safe:animate-bounce'
                  )}
                  aria-hidden="true"
                >
                  {m.completed ? '✅' : m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={cn(
                        'text-sm font-semibold leading-snug',
                        m.completed ? 'text-emerald-300 line-through' : 'text-zinc-100'
                      )}
                    >
                      {m.title}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 whitespace-nowrap tabular-nums">
                      {m.progress}/{m.goal}
                    </span>
                  </div>
                  <div
                    className="h-2.5 bg-white/5 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progreso: ${pct}%`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: m.completed
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : `linear-gradient(90deg, #7c3aed, ${accentColor})`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span
                      className="px-2 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: `${accentColor}25`,
                        color: accentColor,
                      }}
                    >
                      ⭐ +{m.xp_reward} XP
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: 'rgba(6,182,212,0.15)',
                        color: '#06b6d4',
                      }}
                    >
                      ⚡ +{m.energy_reward}
                    </span>
                    {m.completed && (
                      <span className="ml-auto flex items-center gap-1 text-emerald-300 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Hecho
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </BigCard>
  );
}
