import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clapperboard, Calendar, Target, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemporadaActual } from '@/lib/studio-system';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Meta {
  nombre: string;
  actual: number;
  objetivo: number;
}

interface SeasonBannerProps {
  showProgress?: boolean;
  showMetas?: boolean;
  metasTemporada?: Meta[];
  variant?: 'full' | 'compact' | 'mini';
  className?: string;
  onVerMetas?: () => void;
}

export function SeasonBanner({
  showProgress = true,
  showMetas = true,
  metasTemporada,
  variant = 'full',
  className,
  onVerMetas,
}: SeasonBannerProps) {
  const temporada = getTemporadaActual();

  const { diasRestantes, diasTotales, progreso, urgencia } = useMemo(() => {
    const ahora = new Date();
    const diasRestantes = Math.max(0, differenceInDays(temporada.fechaFin, ahora));
    const diasTotales = differenceInDays(temporada.fechaFin, temporada.fechaInicio);
    const diasTranscurridos = diasTotales - diasRestantes;
    const progreso = Math.min((diasTranscurridos / diasTotales) * 100, 100);

    let urgencia: 'normal' | 'warning' | 'danger' | 'critical' = 'normal';
    if (diasRestantes < 7) urgencia = 'critical';
    else if (diasRestantes < 15) urgencia = 'danger';
    else if (diasRestantes < 30) urgencia = 'warning';

    return { diasRestantes, diasTotales, progreso, urgencia };
  }, [temporada]);

  const urgenciaColors = {
    normal: { border: 'border-purple-500/30', glow: 'rgba(139, 92, 246, 0.2)', text: 'text-purple-400' },
    warning: { border: 'border-amber-500/30', glow: 'rgba(245, 158, 11, 0.2)', text: 'text-amber-400' },
    danger: { border: 'border-orange-500/30', glow: 'rgba(249, 115, 22, 0.2)', text: 'text-orange-400' },
    critical: { border: 'border-red-500/30', glow: 'rgba(239, 68, 68, 0.2)', text: 'text-red-400' },
  };

  const colors = urgenciaColors[urgencia];

  // Mini variant - just a badge
  if (variant === 'mini') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                'bg-purple-500/10 border border-purple-500/20',
                'cursor-default',
                className
              )}
              whileHover={{ scale: 1.05 }}
            >
              <Clapperboard className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-purple-400">
                T{temporada.numero}
              </span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900/95 border-white/10">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-white">
                {temporada.nombre} - {temporada.año}
              </span>
              <span className="text-xs text-zinc-400">
                {format(temporada.fechaInicio, "d MMM", { locale: es })} - {format(temporada.fechaFin, "d MMM", { locale: es })}
              </span>
              <span className={cn('text-xs', colors.text)}>
                {diasRestantes} días restantes
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <motion.div
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-sm',
          'bg-gradient-to-r from-purple-500/10 to-transparent',
          'border',
          colors.border,
          className
        )}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">
            {temporada.nombre}
          </span>
        </div>

        {showProgress && (
          <div className="flex-1 max-w-[200px]">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progreso}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <motion.div
          className={cn('flex items-center gap-1.5', colors.text)}
          animate={urgencia === 'critical' ? { scale: [1, 1.05, 1] } : undefined}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {diasRestantes} días
          </span>
        </motion.div>
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      className={cn(
        'relative rounded-sm overflow-hidden',
        'bg-gradient-to-br from-purple-900/20 via-zinc-900/80 to-zinc-900/90',
        'border',
        colors.border,
        className
      )}
      style={{ boxShadow: `0 0 30px ${colors.glow}` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, #7c3aed 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, #a855f7 0%, transparent 50%)`,
        }}
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-sm bg-purple-500/20 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Clapperboard className="w-6 h-6 text-purple-400" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {temporada.nombre} - {temporada.año}
              </h3>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(temporada.fechaInicio, "d MMM", { locale: es })} - {format(temporada.fechaFin, "d MMM", { locale: es })}
                </span>
              </div>
            </div>
          </div>

          <motion.div
            className={cn(
              'flex flex-col items-end px-4 py-2 rounded-sm',
              'bg-zinc-800/50 border border-zinc-700/50'
            )}
            animate={urgencia === 'critical' ? { scale: [1, 1.02, 1] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className={cn('text-2xl font-bold', colors.text)}>
              {diasRestantes}
            </span>
            <span className="text-xs text-zinc-400">días restantes</span>
          </motion.div>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>Progreso de temporada</span>
              <span>{Math.round(progreso)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full relative"
                style={{
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progreso}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              >
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white"
                  style={{ boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* Metas */}
        {showMetas && metasTemporada && metasTemporada.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Metas de Temporada</span>
              </div>
              {onVerMetas && (
                <button
                  onClick={onVerMetas}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Ver todas
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metasTemporada.slice(0, 4).map((meta, index) => {
                const metaProgress = Math.min((meta.actual / meta.objetivo) * 100, 100);
                const isComplete = meta.actual >= meta.objetivo;

                return (
                  <motion.div
                    key={index}
                    className={cn(
                      'p-3 rounded-sm',
                      'bg-zinc-800/40 border border-zinc-700/30',
                      isComplete && 'border-emerald-500/30 bg-emerald-500/5'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <p className="text-xs text-zinc-400 truncate mb-2">
                      {meta.nombre}
                    </p>
                    <div className="h-1 bg-zinc-700 rounded-full overflow-hidden mb-2">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          isComplete ? 'bg-emerald-500' : 'bg-purple-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${metaProgress}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                      />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className={cn(
                        'text-sm font-bold',
                        isComplete ? 'text-emerald-400' : 'text-white'
                      )}>
                        {meta.actual.toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-500">
                        / {meta.objetivo.toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
