import { Lock, Check, X, TrendingUp, Star, BookOpen, GraduationCap, Award, Clock, Trophy, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';
import type { UnlockEvaluation, UnlockRequirement, UnlockRuleType } from '@/types/academy';

const RULE_ICON: Record<UnlockRuleType, typeof Lock> = {
  min_level: TrendingUp,
  min_xp: Star,
  course_completed: GraduationCap,
  module_completed: BookOpen,
  lesson_completed: BookOpen,
  quiz_passed: Award,
  badge_earned: Trophy,
  drip_days: Clock,
  platform_role: Shield,
};

/** Texto legible del requisito; resuelve el rol de plataforma a su etiqueta LATAM. */
export function requirementLabel(req: UnlockRequirement): string {
  if (req.rule_type === 'platform_role' && req.text_value) {
    return `Ser ${getRoleLabel(req.text_value)}`;
  }
  return req.label ?? 'Requisito';
}

// ── Chip de candado reutilizable ────────────────────────────────────────────
export function LockBadge({ className, label = 'Bloqueado' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
        'bg-zinc-800/90 border border-white/15 text-zinc-300 backdrop-blur-md',
        className
      )}
    >
      <Lock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ── Panel "qué te falta" ────────────────────────────────────────────────────
interface Props {
  evaluation: UnlockEvaluation;
  /** Compacto = sin marco grande, para incrustar en filas. */
  compact?: boolean;
  className?: string;
  accentColor?: string;
}

export function UnlockRequirements({ evaluation, compact, className, accentColor = '#7c3aed' }: Props) {
  if (evaluation.unlocked || evaluation.requirements.length === 0) return null;

  const isAny = evaluation.logic === 'any';

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.03]',
        compact ? 'p-3' : 'p-5',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}25` }}
        >
          <Lock className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div>
          <p className={cn('font-bold text-white', compact ? 'text-sm' : 'text-base')}>
            Contenido bloqueado
          </p>
          <p className="text-[11px] text-zinc-400">
            {isAny ? 'Cumple al menos uno de estos requisitos:' : 'Necesitas cumplir todo esto:'}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {evaluation.requirements.map((req, i) => {
          const Icon = RULE_ICON[req.rule_type] ?? Lock;
          return (
            <li
              key={i}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
                req.met ? 'bg-emerald-500/10 text-emerald-200' : 'bg-white/5 text-zinc-300'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0',
                  req.met ? 'bg-emerald-500/30' : 'bg-zinc-700/60'
                )}
              >
                {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-zinc-400" />}
              </span>
              <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />
              <span className="flex-1 min-w-0">
                <span className={cn('font-semibold', req.met && 'line-through opacity-70')}>
                  {requirementLabel(req)}
                </span>
                {req.detail && !req.met && (
                  <span className="text-[11px] text-zinc-500 ml-1.5">· {req.detail}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
