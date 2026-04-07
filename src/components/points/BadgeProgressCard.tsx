import { Award, TrendingUp, Clock, Target, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GlobalBadge,
  BADGE_RARITY_COLORS,
  BADGE_RARITY_LABELS,
  BADGE_CATEGORY_LABELS
} from '@/hooks/useGlobalBadges';
import * as LucideIcons from 'lucide-react';

interface BadgeProgressCardProps {
  badge: GlobalBadge;
  currentProgress: number;
  maxProgress: number;
  isCompleted?: boolean;
  unlockedAt?: string | null;
  showDetails?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

function BadgeIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
    iconName.split('-').map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join('')
  ] || Award;

  return <IconComponent className={className} />;
}

export function BadgeProgressCard({
  badge,
  currentProgress,
  maxProgress,
  isCompleted = false,
  unlockedAt,
  showDetails = true,
  onViewDetails,
  className
}: BadgeProgressCardProps) {
  const percentage = maxProgress > 0 ? Math.round((currentProgress / maxProgress) * 100) : 0;
  const isAlmostComplete = percentage >= 75 && !isCompleted;
  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
        isCompleted && 'border-green-500/50 bg-green-500/5',
        isAlmostComplete && !isCompleted && 'border-amber-500/50 bg-amber-500/5',
        className
      )}
    >
      {/* Barra de progreso superior */}
      {!isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-500',
              isAlmostComplete ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icono del badge */}
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
              'transition-transform duration-300 hover:scale-110',
              isCompleted
                ? cn('bg-gradient-to-br', BADGE_RARITY_COLORS[badge.rarity])
                : 'bg-muted'
            )}
          >
            <BadgeIcon
              iconName={badge.icon}
              className={cn('w-7 h-7', isCompleted ? 'text-white' : 'text-muted-foreground')}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold truncate">{badge.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {badge.description}
                </p>
              </div>

              <Badge
                variant="outline"
                className={cn('flex-shrink-0 text-xs', BADGE_RARITY_COLORS[badge.rarity])}
              >
                {BADGE_RARITY_LABELS[badge.rarity]}
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                {BADGE_CATEGORY_LABELS[badge.category]}
              </span>

              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{badge.ranking_points} pts
              </span>

              {isCompleted && formattedDate && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formattedDate}
                </span>
              )}
            </div>

            {/* Progreso */}
            {!isCompleted && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Progreso: {currentProgress}/{maxProgress}
                  </span>
                  <span className={cn(
                    'font-medium',
                    isAlmostComplete ? 'text-amber-600' : 'text-primary'
                  )}>
                    {percentage}%
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={cn('h-2', isAlmostComplete && '[&>div]:bg-amber-500')}
                />
                {isAlmostComplete && (
                  <p className="text-xs text-amber-600 font-medium animate-pulse">
                    Casi lo logras!
                  </p>
                )}
              </div>
            )}

            {/* Estado completado */}
            {isCompleted && (
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="default" className="bg-green-500">
                  Desbloqueada
                </Badge>

                {showDetails && onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onViewDetails}
                    className="text-xs"
                  >
                    Ver detalles
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BadgeProgressCard;
