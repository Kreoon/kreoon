import { motion } from 'framer-motion';
import { Crown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProgresoNivel } from '@/lib/studio-system';
import { LevelBadge } from './LevelBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProgressToNextLevelProps {
  creditosActuales: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    height: 'h-1.5',
    text: 'text-xs',
    padding: 'p-2',
    badgeSize: 'sm' as const,
  },
  md: {
    height: 'h-2',
    text: 'text-sm',
    padding: 'p-3',
    badgeSize: 'sm' as const,
  },
  lg: {
    height: 'h-3',
    text: 'text-base',
    padding: 'p-4',
    badgeSize: 'md' as const,
  },
};

export function ProgressToNextLevel({
  creditosActuales,
  showDetails = true,
  size = 'md',
  className,
}: ProgressToNextLevelProps) {
  const { actual, siguiente, progreso, xpFaltante } = getProgresoNivel(creditosActuales);
  const config = sizeConfig[size];
  const isMaxLevel = !siguiente;

  // Max level reached - special display
  if (isMaxLevel) {
    return (
      <motion.div
        className={cn(
          'relative rounded-sm overflow-hidden',
          config.padding,
          'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10',
          'border border-amber-500/30',
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.1), transparent)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center justify-center gap-3">
          <Crown className="w-6 h-6 text-amber-400" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-amber-400">
              Nivel Máximo Alcanzado
            </span>
            <span className="text-sm text-amber-400/70">
              {actual.nombre} - Leyenda del Estudio
            </span>
          </div>
          <Sparkles className="w-6 h-6 text-amber-400" />
        </div>
      </motion.div>
    );
  }

  // Compact version for sm size
  if (size === 'sm' && !showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('w-full', className)}>
              <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${actual.color}, ${siguiente.color})`,
                    boxShadow: `0 0 10px ${actual.color}50`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progreso}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900/95 backdrop-blur-sm border-white/10">
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                Nivel {actual.nivel} → {siguiente.nivel}
              </span>
              <span className="text-xs text-zinc-400">
                Faltan {xpFaltante.toLocaleString()} CR para {siguiente.nombre}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      className={cn(
        'rounded-sm',
        config.padding,
        'bg-gradient-to-br from-zinc-900/80 to-zinc-900/40',
        'border border-white/5',
        'backdrop-blur-sm',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with badges */}
      {showDetails && (
        <div className="flex items-center justify-between mb-3">
          {/* Current level */}
          <div className="flex items-center gap-2">
            <LevelBadge nivel={actual.nivel} size={config.badgeSize} showTooltip={false} />
            <div className="flex flex-col">
              <span className={cn('font-semibold text-white', config.text)}>
                {actual.nombre}
              </span>
              <span className="text-xs text-zinc-500">
                Nivel actual
              </span>
            </div>
          </div>

          {/* Arrow */}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </motion.div>

          {/* Next level */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className={cn('font-semibold text-zinc-400', config.text)}>
                {siguiente.nombre}
              </span>
              <span className="text-xs text-zinc-600">
                Siguiente nivel
              </span>
            </div>
            <div className="opacity-50">
              <LevelBadge nivel={siguiente.nivel} size={config.badgeSize} showTooltip={false} />
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="relative">
        <div
          className={cn(
            'w-full bg-zinc-800/50 rounded-full overflow-hidden',
            config.height
          )}
        >
          <motion.div
            className={cn('h-full rounded-full relative', config.height)}
            style={{
              background: `linear-gradient(90deg, ${actual.color}, ${siguiente.color})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progreso}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Glow effect on edge */}
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{
                background: siguiente.color,
                boxShadow: `0 0 10px ${siguiente.color}, 0 0 20px ${siguiente.color}50`,
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </div>

      {/* Footer info */}
      {showDetails && (
        <div className="flex items-center justify-between mt-2">
          <span className={cn('text-zinc-400 tabular-nums', size === 'lg' ? 'text-sm' : 'text-xs')}>
            {creditosActuales.toLocaleString()} CR
          </span>
          <span className={cn('text-zinc-500', size === 'lg' ? 'text-sm' : 'text-xs')}>
            Faltan <span className="text-purple-400 font-medium">{xpFaltante.toLocaleString()} CR</span> para {siguiente.nombre}
          </span>
          <span className={cn('text-zinc-400 tabular-nums', size === 'lg' ? 'text-sm' : 'text-xs')}>
            {siguiente.xpRequerido.toLocaleString()} CR
          </span>
        </div>
      )}
    </motion.div>
  );
}
