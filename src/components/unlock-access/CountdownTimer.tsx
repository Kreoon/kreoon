import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { getTimeRemaining, formatTimeUnit, getUrgencyLevel, type TimeRemaining } from '@/lib/unlock-access/utils';
import { cn } from '@/lib/utils';

const TimeBlock = memo(function TimeBlock({
  value,
  label,
  urgency
}: {
  value: number;
  label: string;
  urgency: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.1, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'w-14 h-14 sm:w-16 sm:h-16 rounded-sm flex items-center justify-center text-2xl sm:text-3xl font-bold',
          urgency
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-white/5 text-white border border-white/10'
        )}
      >
        {formatTimeUnit(value)}
      </motion.div>
      <span className="text-[10px] sm:text-xs text-white/50 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
});

const Separator = memo(function Separator() {
  return <span className="text-2xl text-white/30 font-bold self-start mt-3">:</span>;
});

export function CountdownTimer() {
  const [time, setTime] = useState<TimeRemaining>(getTimeRemaining);
  const urgencyLevel = getUrgencyLevel();
  const isCritical = urgencyLevel === 'critical';

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (time.isExpired) {
    return (
      <div className="text-center py-4 px-6 rounded-sm bg-red-500/10 border border-red-500/30">
        <p className="text-red-400 font-semibold">El periodo Early Bird ha terminado</p>
      </div>
    );
  }

  return (
    <motion.div
      animate={isCritical ? { x: [0, -2, 2, -2, 2, 0] } : {}}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0, repeatDelay: 3 }}
      className={cn(
        'rounded-sm p-4 sm:p-6',
        isCritical
          ? 'bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/30'
          : 'bg-white/[0.03] border border-white/10'
      )}
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        {isCritical ? (
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-purple-400" />
        )}
        <span className={cn(
          'text-sm font-medium',
          isCritical ? 'text-red-400' : 'text-white/70'
        )}>
          Tiempo para asegurar tu lugar
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <TimeBlock value={time.days} label="Dias" urgency={isCritical} />
        <Separator />
        <TimeBlock value={time.hours} label="Horas" urgency={isCritical} />
        <Separator />
        <TimeBlock value={time.minutes} label="Min" urgency={isCritical} />
        <Separator />
        <TimeBlock value={time.seconds} label="Seg" urgency={isCritical} />
      </div>

      <p className={cn(
        'text-center text-xs sm:text-sm mt-4',
        isCritical ? 'text-red-300' : 'text-white/50'
      )}>
        {isCritical
          ? 'ULTIMOS DIAS! Despues perderas estos beneficios para siempre'
          : 'El 30 de Abril la plataforma abre al publico'
        }
      </p>
    </motion.div>
  );
}
