import { motion } from 'framer-motion';
import { differenceInDays, differenceInHours, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Trophy, Flame, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUPSeasons } from '@/hooks/useUPSeasons';

interface SeasonUrgencyBannerProps {
  className?: string;
  compact?: boolean;
}

export function SeasonUrgencyBanner({ className, compact = false }: SeasonUrgencyBannerProps) {
  const { activeSeason, loading } = useUPSeasons();

  if (loading || !activeSeason) return null;

  const now = new Date();
  const endsAt = activeSeason.ends_at ? parseISO(activeSeason.ends_at) : null;
  
  if (!endsAt) return null;

  const daysLeft = differenceInDays(endsAt, now);
  const hoursLeft = differenceInHours(endsAt, now);

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (daysLeft <= 1) return 'critical';
    if (daysLeft <= 3) return 'high';
    if (daysLeft <= 7) return 'medium';
    return 'low';
  };

  const urgency = getUrgencyLevel();

  const urgencyConfig = {
    critical: {
      bg: 'from-red-500/20 via-red-600/10 to-orange-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      icon: AlertTriangle,
      label: '¡ÚLTIMA OPORTUNIDAD!',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
    },
    high: {
      bg: 'from-orange-500/20 via-amber-500/10 to-yellow-500/20',
      border: 'border-orange-500/50',
      text: 'text-orange-400',
      icon: Flame,
      label: '¡Tiempo limitado!',
      glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]'
    },
    medium: {
      bg: 'from-cyan-500/10 via-blue-500/5 to-purple-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      icon: Zap,
      label: 'Temporada activa',
      glow: ''
    },
    low: {
      bg: 'from-emerald-500/10 via-teal-500/5 to-cyan-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: Trophy,
      label: 'Temporada activa',
      glow: ''
    }
  };

  const config = urgencyConfig[urgency];
  const UrgencyIcon = config.icon;

  const getTimeDisplay = () => {
    if (daysLeft <= 0) {
      if (hoursLeft <= 0) return 'Termina hoy';
      return `${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''} restantes`;
    }
    if (daysLeft === 1) return '1 día restante';
    return `${daysLeft} días restantes`;
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'relative overflow-hidden rounded-lg p-3',
          'bg-gradient-to-r',
          config.bg,
          'border',
          config.border,
          config.glow,
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md bg-background/50', config.text)}>
              <UrgencyIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{activeSeason.name}</p>
              <p className={cn('text-sm font-bold', config.text)}>{getTimeDisplay()}</p>
            </div>
          </div>
          {urgency === 'critical' && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-red-400"
            >
              <Flame className="w-5 h-5" />
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-r',
        config.bg,
        'border',
        config.border,
        config.glow,
        className
      )}
    >
      {/* Tech grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* Animated scan line for critical urgency */}
      {urgency === 'critical' && (
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="relative p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left side - Season info */}
          <div className="flex items-center gap-4">
            <motion.div
              animate={urgency === 'critical' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className={cn(
                'p-3 rounded-xl bg-background/50 backdrop-blur-sm',
                'border',
                config.border
              )}
            >
              <UrgencyIcon className={cn('w-6 h-6', config.text)} />
            </motion.div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-xs font-bold uppercase tracking-wider', config.text)}>
                  {config.label}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{activeSeason.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(activeSeason.starts_at), "d 'de' MMM", { locale: es })}
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(endsAt, "d 'de' MMM", { locale: es })}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Countdown */}
          <div className="flex items-center gap-4">
            <div className={cn(
              'px-4 py-2 rounded-lg',
              'bg-background/50 backdrop-blur-sm',
              'border',
              config.border
            )}>
              <div className="flex items-center gap-2">
                <Clock className={cn('w-5 h-5', config.text)} />
                <div>
                  <p className="text-xs text-muted-foreground">Tiempo restante</p>
                  <p className={cn('text-xl font-bold tabular-nums', config.text)}>
                    {daysLeft <= 0 ? (
                      <span>{hoursLeft}h</span>
                    ) : (
                      <span>{daysLeft}d {hoursLeft % 24}h</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress ring for days */}
            <div className="hidden md:block relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted/20"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className={config.text}
                  initial={{ strokeDasharray: '0 176' }}
                  animate={{ 
                    strokeDasharray: `${Math.max(0, Math.min(100, (daysLeft / 30) * 100)) * 1.76} 176` 
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-lg font-bold', config.text)}>{Math.max(0, daysLeft)}</span>
                <span className="text-[10px] text-muted-foreground">días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Urgency message for critical */}
        {urgency === 'critical' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-4 border-t border-red-500/20"
          >
            <p className="text-sm text-red-300/80 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              ¡Completa tus entregas ahora para maximizar tus UP antes de que termine la temporada!
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
