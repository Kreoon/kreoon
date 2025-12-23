import React, { useEffect, useState } from 'react';
import { Achievement, RARITY_COLORS, RARITY_LABELS } from '@/hooks/useAchievements';
import { 
  Sword, Shield, Castle, Crown, Zap, Send, Clock, Flame, 
  Coins, Gem, Trophy, Medal, Star, ChevronUp, Swords, Cross, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMedievalSounds } from '@/hooks/useMedievalSounds';

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

interface AchievementUnlockToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementUnlockToast: React.FC<AchievementUnlockToastProps> = ({
  achievement,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const IconComponent = ICON_MAP[achievement.icon] || Shield;

  useEffect(() => {
    // Play achievement sound
    const sounds = getMedievalSounds();
    if (achievement.rarity === 'legendary') {
      sounds.playSound('levelUp');
    } else {
      sounds.playSound('achievement');
    }

    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [achievement, onClose]);

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500',
        isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
      )}
    >
      <div className={cn(
        'relative overflow-hidden rounded-xl border-2 p-4 shadow-2xl min-w-[320px] max-w-[400px]',
        'bg-gradient-to-br from-card via-card to-card/90',
        achievement.rarity === 'legendary' && 'border-amber-500/70 animate-pulse',
        achievement.rarity === 'rare' && 'border-blue-500/70',
        achievement.rarity === 'uncommon' && 'border-emerald-500/70',
        achievement.rarity === 'common' && 'border-stone-500/70',
      )}>
        {/* Sparkle effects for legendary */}
        {achievement.rarity === 'legendary' && (
          <>
            <Sparkles className="absolute top-2 right-2 w-4 h-4 text-amber-400 animate-pulse" />
            <Sparkles className="absolute bottom-2 left-2 w-3 h-3 text-amber-400 animate-pulse delay-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-orange-500/10 animate-shimmer" />
          </>
        )}

        <div className="flex items-center gap-4">
          {/* Badge Icon */}
          <div className={cn(
            'relative flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br shadow-lg animate-bounce-subtle',
            RARITY_COLORS[achievement.rarity]
          )}>
            <IconComponent className="w-8 h-8 text-white drop-shadow-md" />
            {achievement.rarity === 'legendary' && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent animate-shimmer" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">
                ¡Insignia Desbloqueada!
              </span>
            </div>
            <h3 className="font-medieval font-bold text-lg text-foreground truncate">
              {achievement.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            <span className={cn(
              'inline-block mt-1 text-xs px-2 py-0.5 rounded-full',
              achievement.rarity === 'legendary' && 'bg-amber-500/20 text-amber-400',
              achievement.rarity === 'rare' && 'bg-blue-500/20 text-blue-400',
              achievement.rarity === 'uncommon' && 'bg-emerald-500/20 text-emerald-400',
              achievement.rarity === 'common' && 'bg-stone-500/20 text-stone-400',
            )}>
              {RARITY_LABELS[achievement.rarity]}
            </span>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all ease-linear',
              achievement.rarity === 'legendary' && 'bg-gradient-to-r from-amber-500 to-orange-500',
              achievement.rarity === 'rare' && 'bg-blue-500',
              achievement.rarity === 'uncommon' && 'bg-emerald-500',
              achievement.rarity === 'common' && 'bg-stone-500',
            )}
            style={{
              width: isVisible && !isExiting ? '0%' : '100%',
              transition: 'width 5s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
};
