import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Key, Clock } from 'lucide-react';
import { HERO_LEVELS, GAME_CONFIG, type HeroLevel } from '@/lib/unlock-access/game-constants';
import { getTimeRemaining, formatTimeUnit, getUrgencyLevel } from '@/lib/unlock-access/utils';
import { cn } from '@/lib/utils';

interface HeroStatsBarProps {
  userName: string;
  avatar?: string;
  keysCollected: number;
}

const CountdownDisplay = memo(function CountdownDisplay() {
  const [time, setTime] = useState(getTimeRemaining);
  const urgency = getUrgencyLevel();

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeRemaining()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (time.isExpired) return null;

  return (
    <motion.div
      animate={urgency === 'critical' ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-sm text-xs sm:text-sm',
        urgency === 'critical' && 'bg-red-500/20 border border-red-500/30',
        urgency === 'high' && 'bg-orange-500/10 border border-orange-500/20',
        urgency === 'normal' && 'bg-white/5 border border-white/10'
      )}
    >
      <Clock className={cn(
        'w-4 h-4',
        urgency === 'critical' && 'text-red-400 animate-pulse',
        urgency === 'high' && 'text-orange-400',
        urgency === 'normal' && 'text-white/50'
      )} />
      <span className={cn(
        'font-mono font-medium',
        urgency === 'critical' && 'text-red-300',
        urgency === 'high' && 'text-orange-300',
        urgency === 'normal' && 'text-white/70'
      )}>
        {formatTimeUnit(time.days)}d {formatTimeUnit(time.hours)}h {formatTimeUnit(time.minutes)}m
      </span>
    </motion.div>
  );
});

export function HeroStatsBar({ userName, avatar, keysCollected }: HeroStatsBarProps) {
  const level = HERO_LEVELS[Math.min(keysCollected, 3) as HeroLevel];
  const isFounder = keysCollected >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 p-4 rounded-sm',
        'bg-gradient-to-r from-white/[0.03] via-white/[0.05] to-white/[0.03]',
        'border border-white/10'
      )}
    >
      {/* Hero Info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={cn(
          'relative w-12 h-12 rounded-sm overflow-hidden',
          'border-2',
          level.borderColor,
          isFounder && 'ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-background'
        )}>
          {avatar ? (
            <img src={avatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">{level.icon}</span>
            </div>
          )}
          {isFounder && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center"
            >
              <span className="text-xs">👑</span>
            </motion.div>
          )}
        </div>

        {/* Name and Level */}
        <div>
          <h2 className="font-bold text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
            {userName}
          </h2>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isFounder ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white/60'
            )}>
              {level.icon} {level.name}
            </span>
          </div>
        </div>
      </div>

      {/* Keys Progress */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-sm',
          isFounder ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-purple-500/10 border border-purple-500/20'
        )}>
          <Key className={cn('w-4 h-4', isFounder ? 'text-yellow-400' : 'text-purple-400')} />
          <span className={cn(
            'font-bold text-sm',
            isFounder ? 'text-yellow-300' : 'text-purple-300'
          )}>
            {keysCollected}/3
          </span>
        </div>
      </div>

      {/* Countdown */}
      <CountdownDisplay />
    </motion.div>
  );
}
