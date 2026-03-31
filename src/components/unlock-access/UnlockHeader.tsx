import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Key, Clock } from 'lucide-react';
import { getTimeRemaining, formatTimeUnit, isUrgent, CONFIG } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

interface UnlockHeaderProps {
  userName: string;
  avatar?: string;
  keysCollected: number;
}

const CountdownUnit = memo(function CountdownUnit({
  value,
  label,
  urgent
}: {
  value: string;
  label: string;
  urgent: boolean;
}) {
  return (
    <div className="text-center">
      <motion.div
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          'text-lg sm:text-xl font-mono font-bold',
          urgent ? 'text-red-400' : 'text-white'
        )}
      >
        {value}
      </motion.div>
      <div className="text-[10px] text-white/40 uppercase">{label}</div>
    </div>
  );
});

export const UnlockHeader = memo(function UnlockHeader({
  userName,
  avatar,
  keysCollected
}: UnlockHeaderProps) {
  const [time, setTime] = useState(getTimeRemaining);
  const urgent = isUrgent();
  const isComplete = keysCollected >= 3;

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeRemaining()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-sm',
        'bg-white/[0.03] border border-white/10'
      )}
    >
      {/* User info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={cn(
          'relative w-12 h-12 rounded-full overflow-hidden',
          'border-2',
          isComplete ? 'border-amber-400' : 'border-white/20'
        )}>
          {avatar ? (
            <img src={avatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-lg font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {isComplete && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-background"
            >
              <span className="text-[10px]">✓</span>
            </motion.div>
          )}
        </div>

        {/* Greeting */}
        <div>
          <p className="text-white font-medium">
            Hey, <span className="text-purple-300">{userName}</span>
          </p>
          <p className="text-xs text-white/50">
            {isComplete ? 'Ya tienes acceso completo' : 'Consigue tus 3 llaves'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4 w-full sm:w-auto">
        {/* Keys indicator */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-sm',
          isComplete
            ? 'bg-amber-500/20 border border-amber-500/30'
            : 'bg-white/5 border border-white/10'
        )}>
          <Key className={cn(
            'w-4 h-4',
            isComplete ? 'text-amber-400' : 'text-white/50'
          )} />
          <span className={cn(
            'font-bold',
            isComplete ? 'text-amber-300' : 'text-white'
          )}>
            {keysCollected}/3
          </span>
        </div>

        {/* Visual progress */}
        <div className="hidden sm:flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'w-8 h-2 rounded-full transition-colors',
                i < keysCollected
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                  : 'bg-white/10'
              )}
            />
          ))}
        </div>
      </div>

      {/* Countdown */}
      {!time.isExpired && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-sm',
          urgent
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-white/5 border border-white/10'
        )}>
          <Clock className={cn(
            'w-4 h-4',
            urgent ? 'text-red-400 animate-pulse' : 'text-white/40'
          )} />
          <div className="flex items-center gap-2">
            <CountdownUnit value={formatTimeUnit(time.days)} label="días" urgent={urgent} />
            <span className="text-white/30">:</span>
            <CountdownUnit value={formatTimeUnit(time.hours)} label="hrs" urgent={urgent} />
            <span className="text-white/30">:</span>
            <CountdownUnit value={formatTimeUnit(time.minutes)} label="min" urgent={urgent} />
          </div>
        </div>
      )}
    </motion.div>
  );
});
