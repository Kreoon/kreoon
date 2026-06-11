import { useState } from 'react';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { cn } from '@/lib/utils';
import { useMyBadges, useAllBadges, type Badge } from '@/hooks/academy/useAcademyGamification';

interface BadgesShowcaseProps {
  spaceId: string;
  accentColor?: string;
  compact?: boolean;
}

const RARITY_STYLES: Record<
  string,
  { border: string; shine: string; glowColor: string; label: string; pill: string }
> = {
  common: {
    border: 'border-zinc-600',
    shine: '',
    glowColor: '#52525b',
    label: 'Común',
    pill: 'bg-zinc-500/20 text-zinc-300',
  },
  rare: {
    border: 'border-cyan-400/70',
    shine: 'shadow-[0_0_20px_rgba(34,211,238,0.45)]',
    glowColor: '#22d3ee',
    label: 'Rara',
    pill: 'bg-cyan-500/20 text-cyan-300',
  },
  epic: {
    border: 'border-purple-400/80',
    shine: 'shadow-[0_0_24px_rgba(168,85,247,0.55)]',
    glowColor: '#a855f7',
    label: 'Épica',
    pill: 'bg-purple-500/20 text-purple-300',
  },
  legendary: {
    border: 'border-amber-300/90',
    shine: 'shadow-[0_0_28px_rgba(251,191,36,0.7)]',
    glowColor: '#fbbf24',
    label: 'Legendaria',
    pill: 'bg-amber-500/20 text-amber-300',
  },
};

export function BadgesShowcase({ spaceId, accentColor = '#8B5CF6', compact = false }: BadgesShowcaseProps) {
  const { data: earned = [] } = useMyBadges(spaceId);
  const { data: catalog = [] } = useAllBadges();
  const [selected, setSelected] = useState<Badge | null>(null);

  const earnedIds = new Set(earned.map((e) => e.badge_id));

  if (compact) {
    if (earned.length === 0) {
      return (
        <div className="flex items-center gap-3 py-2">
          <div className="text-3xl opacity-50" aria-hidden="true">🔒</div>
          <div className="text-sm text-zinc-400">
            Aún sin insignias. ¡Sigue activo!
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {earned.slice(0, 8).map((mb) => {
          const rarity = mb.badge?.rarity ?? 'common';
          const s = RARITY_STYLES[rarity];
          return (
            <button
              key={mb.id}
              onClick={() => setSelected(mb.badge ?? null)}
              aria-label={`Insignia ${mb.badge?.name ?? ''}: ${mb.badge?.description ?? ''}`}
              className={cn(
                'h-14 w-14 rounded-2xl flex items-center justify-center text-2xl border-2',
                'motion-safe:hover:scale-110 motion-safe:hover:-translate-y-0.5 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                s.border,
                s.shine
              )}
              style={{
                background: `radial-gradient(circle at 30% 30%, ${mb.badge?.color ?? accentColor}40, ${mb.badge?.color ?? accentColor}10)`,
              }}
            >
              <span aria-hidden="true">{mb.badge?.emoji}</span>
            </button>
          );
        })}
        {earned.length > 8 && (
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-sm font-bold text-zinc-400 border-2 border-dashed border-white/15 bg-white/5">
            +{earned.length - 8}
          </div>
        )}
        <BadgeDetailDialog
          badge={selected}
          earned={selected ? earnedIds.has(selected.id) : false}
          onClose={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <BigCard className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="text-3xl" aria-hidden="true">🏅</div>
          <h3 className="font-extrabold text-lg text-zinc-100">Mis insignias</h3>
        </div>
        <div
          className="px-3 py-1.5 rounded-full text-sm font-bold"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {earned.length} / {catalog.length}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {catalog.map((b) => {
          const isEarned = earnedIds.has(b.id);
          const s = RARITY_STYLES[b.rarity];
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              aria-label={
                isEarned ? `Insignia ${b.name}: ${b.description}` : `Insignia bloqueada ${b.name}`
              }
              className={cn(
                'aspect-square rounded-2xl flex items-center justify-center text-3xl md:text-4xl border-2',
                'motion-safe:hover:scale-110 motion-safe:hover:-translate-y-1 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                isEarned ? cn(s.border, s.shine) : 'border-white/5 grayscale opacity-40'
              )}
              style={
                isEarned
                  ? {
                      background: `radial-gradient(circle at 30% 30%, ${b.color}40, ${b.color}10)`,
                    }
                  : { backgroundColor: 'rgba(255,255,255,0.02)' }
              }
            >
              <span aria-hidden="true">
                {isEarned ? b.emoji : <Lock className="h-5 w-5 text-zinc-500" />}
              </span>
            </button>
          );
        })}
      </div>

      <BadgeDetailDialog
        badge={selected}
        earned={selected ? earnedIds.has(selected.id) : false}
        onClose={() => setSelected(null)}
      />
    </BigCard>
  );
}

function BadgeDetailDialog({
  badge,
  earned,
  onClose,
}: {
  badge: Badge | null;
  earned: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!badge} onOpenChange={(open) => !open && onClose()}>
      {badge && (
        <DialogContent
          className={cn(
            'max-w-sm border-2 bg-kreoon-bg-secondary text-center rounded-3xl',
            RARITY_STYLES[badge.rarity].border,
            earned && RARITY_STYLES[badge.rarity].shine
          )}
          style={{ backgroundColor: earned ? `${badge.color}15` : undefined }}
        >
          <DialogHeader>
            <div
              className="h-24 w-24 mx-auto rounded-3xl flex items-center justify-center text-6xl mb-3 border-4"
              style={{
                borderColor: earned ? badge.color : '#3f3f46',
                background: earned
                  ? `radial-gradient(circle at 30% 30%, ${badge.color}50, ${badge.color}10)`
                  : 'transparent',
              }}
              aria-hidden="true"
            >
              {earned ? badge.emoji : '🔒'}
            </div>
            <DialogTitle className="text-2xl font-extrabold text-center text-white">
              {badge.name}
            </DialogTitle>
            <div className="text-center mt-1">
              <span
                className={cn(
                  'inline-block text-[11px] font-bold uppercase px-3 py-1 rounded-full',
                  RARITY_STYLES[badge.rarity].pill
                )}
              >
                {RARITY_STYLES[badge.rarity].label}
              </span>
            </div>
            <DialogDescription className="text-sm text-zinc-300 mt-3 leading-relaxed">
              {badge.description}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mx-auto" style={{ backgroundColor: `${badge.color}20`, color: badge.color }}>
            ⭐ +{badge.xp_reward} XP
          </div>
          {!earned && (
            <p className="text-xs text-zinc-500 italic mt-2">Aún no la has desbloqueado</p>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
