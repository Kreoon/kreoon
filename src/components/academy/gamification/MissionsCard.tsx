import { Card } from '@/components/ui/card';
import { CheckCircle2, Target, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyWeeklyMissions } from '@/hooks/academy/useAcademyGamification';

interface MissionsCardProps {
  spaceId: string;
  accentColor?: string;
}

export function MissionsCard({ spaceId, accentColor = '#8B5CF6' }: MissionsCardProps) {
  const { data: missions = [], isLoading } = useMyWeeklyMissions(spaceId);

  if (isLoading) {
    return null;
  }

  if (missions.length === 0) {
    return (
      <Card className="p-4 bg-kreoon-bg-card border-white/10">
        <h2 className="text-sm uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-2">
          <Target className="h-3.5 w-3.5" aria-hidden="true" /> Misiones semanales
        </h2>
        <p className="text-xs text-zinc-400 italic">
          Las misiones se generan cada lunes. Mantente activo esta semana para recibirlas.
        </p>
      </Card>
    );
  }

  const completed = missions.filter((m) => m.completed).length;
  const total = missions.length;

  return (
    <Card className="p-4 bg-kreoon-bg-card border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Target className="h-3.5 w-3.5" aria-hidden="true" /> Misiones de la semana
        </h2>
        <span className="text-xs text-zinc-400 font-mono">
          {completed}/{total}
        </span>
      </div>

      <ul className="space-y-2.5">
        {missions.map((m) => {
          const pct = Math.round((m.progress / m.goal) * 100);
          return (
            <li
              key={m.id}
              className={cn(
                'rounded-lg border p-2.5 transition-colors',
                m.completed
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/5 bg-black/20'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0" aria-hidden="true">
                  {m.completed ? '✅' : m.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        m.completed ? 'text-emerald-300 line-through' : 'text-zinc-200'
                      )}
                    >
                      {m.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap">
                      {m.progress}/{m.goal}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progreso de misión: ${pct}%`}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: m.completed ? '#10b981' : accentColor,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-0.5">
                      <Trophy className="h-2.5 w-2.5" aria-hidden="true" />
                      +{m.xp_reward} XP
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                      +{m.energy_reward} Energy
                    </span>
                    {m.completed && (
                      <span className="ml-auto flex items-center gap-0.5 text-emerald-300">
                        <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                        Reclamado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
