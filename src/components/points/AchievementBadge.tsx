import React from 'react';
import { 
  Sword, Shield, Castle, Crown, Zap, Send, Clock, Flame, 
  Coins, Gem, Trophy, Medal, Star, ChevronUp, Swords, Cross
} from 'lucide-react';
import { Achievement, RARITY_COLORS, RARITY_LABELS, RARITY_BORDERS } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  sword: Sword,
  shield: Shield,
  castle: Castle,
  crown: Crown,
  zap: Zap,
  send: Send,
  clock: Clock,
  flame: Flame,
  coins: Coins,
  gem: Gem,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  'chevron-up': ChevronUp,
  swords: Swords,
  cross: Cross,
};

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  isUnlocked,
  unlockedAt,
  size = 'md',
  showTooltip = true,
}) => {
  const IconComponent = ICON_MAP[achievement.icon] || Shield;
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };
  
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const badge = (
    <div
      className={cn(
        'relative rounded-xl border-2 flex items-center justify-center transition-all duration-300',
        sizeClasses[size],
        isUnlocked ? [
          'bg-gradient-to-br',
          RARITY_COLORS[achievement.rarity],
          RARITY_BORDERS[achievement.rarity],
          'shadow-lg hover:scale-110 cursor-pointer'
        ] : [
          'bg-muted/30 border-muted-foreground/20',
          'grayscale opacity-50'
        ]
      )}
    >
      {/* Glow effect for legendary */}
      {isUnlocked && achievement.rarity === 'legendary' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30 blur-md -z-10" />
      )}
      
      <IconComponent 
        size={iconSizes[size]} 
        className={cn(
          'drop-shadow-md',
          isUnlocked ? 'text-white' : 'text-muted-foreground/50'
        )} 
      />
      
      {/* Lock overlay for locked achievements */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        </div>
      )}
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs bg-card border-primary/20 p-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {achievement.name}
              </span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                achievement.rarity === 'legendary' && 'bg-amber-500/20 text-amber-400',
                achievement.rarity === 'rare' && 'bg-blue-500/20 text-blue-400',
                achievement.rarity === 'uncommon' && 'bg-emerald-500/20 text-emerald-400',
                achievement.rarity === 'common' && 'bg-stone-500/20 text-stone-400',
              )}>
                {RARITY_LABELS[achievement.rarity]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {achievement.description}
            </p>
            {isUnlocked && unlockedAt && (
              <p className="text-xs text-primary">
                Desbloqueado: {format(new Date(unlockedAt), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
