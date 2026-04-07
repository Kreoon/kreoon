import { useState, useEffect, useCallback } from 'react';
import { Award, Sparkles, Star, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GlobalBadge,
  BADGE_RARITY_COLORS,
  BADGE_RARITY_LABELS,
  BADGE_CATEGORY_LABELS
} from '@/hooks/useGlobalBadges';
import confetti from 'canvas-confetti';
import * as LucideIcons from 'lucide-react';

interface BadgeUnlockAnimationProps {
  badge: GlobalBadge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

function BadgeIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
    iconName.split('-').map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join('')
  ] || Award;

  return <IconComponent className={className} />;
}

const RARITY_CONFETTI_COLORS: Record<string, string[]> = {
  common: ['#78716C', '#A8A29E'],
  uncommon: ['#10B981', '#34D399'],
  rare: ['#3B82F6', '#60A5FA'],
  epic: ['#8B5CF6', '#A78BFA'],
  legendary: ['#F59E0B', '#FCD34D', '#EF4444'],
  mythic: ['#EC4899', '#F472B6', '#FB7185']
};

const RARITY_PARTICLE_COUNT: Record<string, number> = {
  common: 50,
  uncommon: 75,
  rare: 100,
  epic: 150,
  legendary: 200,
  mythic: 300
};

export function BadgeUnlockAnimation({
  badge,
  open,
  onOpenChange,
  onComplete
}: BadgeUnlockAnimationProps) {
  const [phase, setPhase] = useState<'reveal' | 'details' | 'done'>('reveal');
  const [showBadge, setShowBadge] = useState(false);

  const triggerConfetti = useCallback(() => {
    if (!badge) return;

    const colors = RARITY_CONFETTI_COLORS[badge.rarity] || RARITY_CONFETTI_COLORS.common;
    const count = RARITY_PARTICLE_COUNT[badge.rarity] || 50;

    // Explosión central
    confetti({
      particleCount: count,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 200
    });

    // Para rarezas altas, efectos adicionales
    if (['epic', 'legendary', 'mythic'].includes(badge.rarity)) {
      setTimeout(() => {
        confetti({
          particleCount: 30,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors
        });
        confetti({
          particleCount: 30,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors
        });
      }, 300);
    }

    // Para mítico, explosiones continuas
    if (badge.rarity === 'mythic') {
      const interval = setInterval(() => {
        confetti({
          particleCount: 20,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() * 0.5 },
          colors,
          startVelocity: 30
        });
      }, 200);

      setTimeout(() => clearInterval(interval), 2000);
    }
  }, [badge]);

  useEffect(() => {
    if (open && badge) {
      setPhase('reveal');
      setShowBadge(false);

      // Secuencia de animación
      const timer1 = setTimeout(() => {
        setShowBadge(true);
        triggerConfetti();
      }, 500);

      const timer2 = setTimeout(() => {
        setPhase('details');
      }, 1500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [open, badge, triggerConfetti]);

  const handleClose = () => {
    setPhase('done');
    onOpenChange(false);
    onComplete?.();
  };

  if (!badge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-sm overflow-hidden border-2',
          badge.rarity === 'legendary' && 'border-amber-500',
          badge.rarity === 'mythic' && 'border-rose-500',
          badge.rarity === 'epic' && 'border-purple-500'
        )}
      >
        {/* Fondo con gradiente */}
        <div
          className={cn(
            'absolute inset-0 -z-10 opacity-20',
            `bg-gradient-to-br ${BADGE_RARITY_COLORS[badge.rarity]}`
          )}
        />

        {/* Partículas de fondo */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                'absolute w-4 h-4 text-primary/30 animate-pulse',
                'opacity-0 transition-opacity duration-500',
                showBadge && 'opacity-100'
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Botón de cerrar */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="flex flex-col items-center py-8">
          {/* Título */}
          <div
            className={cn(
              'text-center mb-6 transition-all duration-500',
              showBadge ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            )}
          >
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              Nueva Insignia
            </p>
            <h2 className="text-2xl font-bold mt-1 flex items-center gap-2 justify-center">
              <Star className="w-5 h-5 text-amber-500" />
              Desbloqueada!
              <Star className="w-5 h-5 text-amber-500" />
            </h2>
          </div>

          {/* Badge central */}
          <div
            className={cn(
              'relative transition-all duration-700',
              showBadge
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-50'
            )}
          >
            {/* Anillo exterior */}
            <div
              className={cn(
                'absolute -inset-4 rounded-full animate-ping opacity-20',
                `bg-gradient-to-br ${BADGE_RARITY_COLORS[badge.rarity]}`
              )}
            />

            {/* Badge principal */}
            <div
              className={cn(
                'w-28 h-28 rounded-full flex items-center justify-center',
                'shadow-2xl animate-bounce-slow',
                `bg-gradient-to-br ${BADGE_RARITY_COLORS[badge.rarity]}`
              )}
            >
              <BadgeIcon iconName={badge.icon} className="w-14 h-14 text-white" />
            </div>
          </div>

          {/* Detalles */}
          <div
            className={cn(
              'text-center mt-8 space-y-3 transition-all duration-500 delay-300',
              phase === 'details' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <h3 className="text-xl font-bold">{badge.name}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {badge.description}
            </p>

            <div className="flex items-center justify-center gap-3">
              <Badge
                variant="outline"
                className={cn('text-xs', BADGE_RARITY_COLORS[badge.rarity])}
              >
                {BADGE_RARITY_LABELS[badge.rarity]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {BADGE_CATEGORY_LABELS[badge.category]}
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-600 text-xs">
                +{badge.ranking_points} pts
              </Badge>
            </div>
          </div>

          {/* Botón de continuar */}
          <Button
            className={cn(
              'mt-8 transition-all duration-500 delay-500',
              phase === 'details' ? 'opacity-100' : 'opacity-0'
            )}
            onClick={handleClose}
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BadgeUnlockAnimation;
