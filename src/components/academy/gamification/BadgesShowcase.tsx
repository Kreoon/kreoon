import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMyBadges, useAllBadges, type Badge } from '@/hooks/academy/useAcademyGamification';

interface BadgesShowcaseProps {
  spaceId: string;
  accentColor?: string;
  compact?: boolean;
}

const RARITY_BORDER: Record<string, string> = {
  common: 'border-zinc-700',
  rare: 'border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.2)]',
  epic: 'border-purple-500/50 shadow-[0_0_14px_rgba(168,85,247,0.3)]',
  legendary: 'border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.4)]',
};

export function BadgesShowcase({ spaceId, accentColor = '#8B5CF6', compact = false }: BadgesShowcaseProps) {
  const { data: earned = [] } = useMyBadges(spaceId);
  const { data: catalog = [] } = useAllBadges();
  const [selected, setSelected] = useState<Badge | null>(null);

  const earnedIds = new Set(earned.map((e) => e.badge_id));

  if (compact) {
    // Solo muestra los earned
    if (earned.length === 0) {
      return (
        <div className="text-xs text-zinc-500 italic">Aún sin insignias. ¡Sigue activo!</div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {earned.slice(0, 8).map((mb) => (
          <button
            key={mb.id}
            onClick={() => setSelected(mb.badge ?? null)}
            aria-label={`Insignia ${mb.badge?.name ?? ''}: ${mb.badge?.description ?? ''}`}
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center text-lg border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
              RARITY_BORDER[mb.badge?.rarity ?? 'common']
            )}
            style={{ backgroundColor: `${mb.badge?.color ?? accentColor}20` }}
          >
            <span aria-hidden="true">{mb.badge?.emoji}</span>
          </button>
        ))}
        {earned.length > 8 && (
          <span className="self-center text-xs text-zinc-400">+{earned.length - 8}</span>
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
    <Card className="p-5 bg-white/5 border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          Insignias
        </h3>
        <span className="text-xs text-zinc-500">
          {earned.length} / {catalog.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {catalog.map((b) => {
          const isEarned = earnedIds.has(b.id);
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              aria-label={
                isEarned
                  ? `Insignia ${b.name}: ${b.description}`
                  : `Insignia bloqueada ${b.name}`
              }
              className={cn(
                'aspect-square rounded-xl flex items-center justify-center text-2xl border-2 transition-all',
                isEarned ? RARITY_BORDER[b.rarity] : 'border-white/5 grayscale opacity-30',
                'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50'
              )}
              style={isEarned ? { backgroundColor: `${b.color}20` } : { backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <span aria-hidden="true">
                {isEarned ? b.emoji : <Lock className="h-4 w-4 text-zinc-500" />}
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
    </Card>
  );
}

/**
 * Dialog accesible (Radix UI): incluye role="dialog", aria-modal, focus trap,
 * cierre con Escape y click-outside por defecto del componente base.
 */
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
            'max-w-sm border-2 bg-kreoon-bg-secondary text-center',
            RARITY_BORDER[badge.rarity]
          )}
          style={{ backgroundColor: earned ? `${badge.color}15` : undefined }}
        >
          <DialogHeader>
            <div className="text-6xl text-center mb-2" aria-hidden="true">
              {earned ? badge.emoji : '🔒'}
            </div>
            <DialogTitle className="text-xl font-bold text-center">{badge.name}</DialogTitle>
            <div className="text-center">
              <span
                className={cn(
                  'inline-block text-[10px] uppercase px-2 py-0.5 rounded-full',
                  badge.rarity === 'legendary' && 'bg-amber-500/20 text-amber-300',
                  badge.rarity === 'epic' && 'bg-purple-500/20 text-purple-300',
                  badge.rarity === 'rare' && 'bg-cyan-500/20 text-cyan-300',
                  badge.rarity === 'common' && 'bg-zinc-500/20 text-zinc-300'
                )}
              >
                {badge.rarity}
              </span>
            </div>
            <DialogDescription className="text-sm text-zinc-300 mt-2">
              {badge.description}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 text-xs text-zinc-400">
            Recompensa: <span style={{ color: badge.color }}>+{badge.xp_reward} XP</span>
          </div>
          {!earned && (
            <p className="text-[10px] text-zinc-500 italic">Aún no la has desbloqueado</p>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
