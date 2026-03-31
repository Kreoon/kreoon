import { motion } from 'framer-motion';
import { Star, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNivelActual, type NivelInfo, NIVELES } from '@/lib/studio-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LevelBadgeProps {
  nivel?: number;
  creditos?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'w-8 h-8',
    icon: 'w-3 h-3',
    text: 'text-xs',
    padding: 'p-1.5',
  },
  md: {
    container: 'w-10 h-10',
    icon: 'w-4 h-4',
    text: 'text-sm',
    padding: 'p-2',
  },
  lg: {
    container: 'w-14 h-14',
    icon: 'w-5 h-5',
    text: 'text-base',
    padding: 'p-3',
  },
  xl: {
    container: 'w-20 h-20',
    icon: 'w-7 h-7',
    text: 'text-lg',
    padding: 'p-4',
  },
};

const getLevelIcon = (nivel: number) => {
  if (nivel >= 10) return Crown;
  if (nivel >= 7) return Sparkles;
  return Star;
};

export function LevelBadge({
  nivel,
  creditos,
  size = 'md',
  showLabel = false,
  showTooltip = true,
  animated = true,
  className,
}: LevelBadgeProps) {
  // Get level info either from nivel prop or calculate from creditos
  const nivelInfo: NivelInfo = nivel
    ? NIVELES.find(n => n.nivel === nivel) || NIVELES[0]
    : getNivelActual(creditos || 0);

  const config = sizeConfig[size];
  const Icon = getLevelIcon(nivelInfo.nivel);
  const isMaxLevel = nivelInfo.nivel === 10;
  const isHighLevel = nivelInfo.nivel >= 7;

  const badgeContent = (
    <motion.div
      className={cn(
        'relative flex flex-col items-center gap-1',
        className
      )}
      initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Badge Container */}
      <motion.div
        className={cn(
          'relative rounded-sm flex items-center justify-center',
          config.container,
          config.padding,
          '',
          'border border-white/10',
          'shadow-lg'
        )}
        style={{
          background: `linear-gradient(135deg, ${nivelInfo.color}20 0%, ${nivelInfo.color}10 100%)`,
          boxShadow: isHighLevel
            ? `0 0 20px ${nivelInfo.color}40, 0 0 40px ${nivelInfo.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 4px 20px ${nivelInfo.color}30, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
        whileHover={animated ? { scale: 1.05 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {/* Glow Effect for High Levels */}
        {isHighLevel && (
          <motion.div
            className="absolute inset-0 rounded-sm"
            style={{
              background: `radial-gradient(circle at center, ${nivelInfo.color}30 0%, transparent 70%)`,
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Shimmer Effect for Max Level */}
        {isMaxLevel && (
          <motion.div
            className="absolute inset-0 rounded-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              }}
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}

        {/* Level Number */}
        <span
          className={cn(
            'relative font-bold z-10',
            config.text
          )}
          style={{ color: nivelInfo.color }}
        >
          {nivelInfo.nivel}
        </span>

        {/* Icon Badge */}
        <div
          className={cn(
            'absolute -top-1 -right-1 rounded-full p-0.5',
            ''
          )}
          style={{
            background: `linear-gradient(135deg, ${nivelInfo.color} 0%, ${nivelInfo.color}cc 100%)`,
            boxShadow: `0 2px 8px ${nivelInfo.color}50`,
          }}
        >
          <Icon className={cn(config.icon, 'text-white')} />
        </div>
      </motion.div>

      {/* Label */}
      {showLabel && (
        <motion.div
          className="flex flex-col items-center"
          initial={animated ? { opacity: 0, y: 5 } : undefined}
          animate={animated ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.1 }}
        >
          <span
            className={cn(
              'font-semibold whitespace-nowrap',
              size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
            )}
            style={{ color: nivelInfo.color }}
          >
            {nivelInfo.nombre}
          </span>
          <span className="text-xs text-zinc-500">
            {nivelInfo.descripcion}
          </span>
        </motion.div>
      )}
    </motion.div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-zinc-900/95 border-white/10 px-3 py-2"
        >
          <div className="flex flex-col gap-1">
            <span
              className="font-semibold"
              style={{ color: nivelInfo.color }}
            >
              Nivel {nivelInfo.nivel}: {nivelInfo.nombre}
            </span>
            <span className="text-xs text-zinc-400">
              {nivelInfo.descripcion}
            </span>
            {nivelInfo.nivel < 10 && (
              <span className="text-xs text-zinc-500">
                Siguiente: {NIVELES[nivelInfo.nivel].xpRequerido.toLocaleString()} CR
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
