import { motion } from 'framer-motion';
import {
  Sparkles,
  Star,
  Zap,
  Clock,
  Trophy,
  Award,
  Flame,
  Calendar,
  Users,
  TrendingUp,
  Crown,
  Medal,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insignia } from '@/lib/studio-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Sparkles,
  Star,
  Zap,
  Clock,
  Trophy,
  Award,
  Flame,
  Calendar,
  Users,
  TrendingUp,
  Crown,
  Medal,
};

interface AchievementCardProps {
  insignia: Insignia;
  unlocked?: boolean;
  unlockedAt?: Date;
  showCredits?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'w-12 h-12',
    icon: 20,
    padding: 'p-2',
  },
  md: {
    container: 'min-w-[200px]',
    icon: 24,
    padding: 'p-3',
  },
  lg: {
    container: 'min-w-[240px]',
    icon: 32,
    padding: 'p-4',
  },
};

export function AchievementCard({
  insignia,
  unlocked = false,
  unlockedAt,
  showCredits = true,
  size = 'md',
  onClick,
  className,
}: AchievementCardProps) {
  const config = sizeConfig[size];
  const Icon = iconMap[insignia.icono] || Award;
  const isElite = insignia.categoria === 'elite' || insignia.categoria === 'liderazgo';

  // Small badge version
  if (size === 'sm') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className={cn(
                'relative rounded-xl flex items-center justify-center',
                config.container,
                config.padding,
                unlocked
                  ? 'cursor-pointer'
                  : 'cursor-default opacity-40',
                className
              )}
              style={{
                background: unlocked
                  ? `linear-gradient(135deg, ${insignia.color}20 0%, ${insignia.color}10 100%)`
                  : 'rgba(39, 39, 42, 0.5)',
                border: unlocked
                  ? `1px solid ${insignia.color}40`
                  : '1px solid rgba(63, 63, 70, 0.3)',
                boxShadow: unlocked
                  ? `0 4px 20px ${insignia.color}20`
                  : undefined,
              }}
              whileHover={unlocked ? { scale: 1.05 } : undefined}
              whileTap={unlocked ? { scale: 0.95 } : undefined}
              onClick={onClick}
            >
              {unlocked ? (
                <Icon
                  size={config.icon}
                  style={{ color: insignia.color }}
                />
              ) : (
                <Lock size={config.icon} className="text-zinc-600" />
              )}

              {/* Elite shimmer */}
              {unlocked && isElite && (
                <motion.div
                  className="absolute inset-0 rounded-xl overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${insignia.color}30, transparent)`,
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent
            className="bg-zinc-900/95 backdrop-blur-sm border-white/10 max-w-[200px]"
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold" style={{ color: insignia.color }}>
                {insignia.nombre}
              </span>
              <span className="text-xs text-zinc-400">{insignia.descripcion}</span>
              {!unlocked && (
                <span className="text-xs text-zinc-500 italic">Bloqueado</span>
              )}
              {unlocked && showCredits && (
                <span className="text-xs text-purple-400">+{insignia.creditos} CR</span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Medium - horizontal card
  if (size === 'md') {
    return (
      <motion.div
        className={cn(
          'relative rounded-xl overflow-hidden',
          config.container,
          config.padding,
          unlocked ? 'cursor-pointer' : 'cursor-default',
          className
        )}
        style={{
          background: unlocked
            ? `linear-gradient(135deg, ${insignia.color}15 0%, rgba(18, 18, 26, 0.9) 100%)`
            : 'rgba(24, 24, 27, 0.8)',
          border: unlocked
            ? `1px solid ${insignia.color}30`
            : '1px solid rgba(63, 63, 70, 0.2)',
          boxShadow: unlocked
            ? `0 4px 20px ${insignia.color}15, inset 0 1px 0 rgba(255,255,255,0.05)`
            : undefined,
        }}
        whileHover={unlocked ? { scale: 1.02, y: -2 } : undefined}
        onClick={onClick}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Locked overlay */}
        {!unlocked && (
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-zinc-600" />
          </div>
        )}

        <div className={cn('flex items-center gap-3', !unlocked && 'opacity-40')}>
          {/* Icon circle */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${insignia.color}30 0%, ${insignia.color}10 100%)`,
              boxShadow: unlocked ? `0 0 15px ${insignia.color}30` : undefined,
            }}
          >
            <Icon size={config.icon} style={{ color: insignia.color }} />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">
                {insignia.nombre}
              </span>
              {showCredits && unlocked && (
                <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                  +{insignia.creditos} CR
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 truncate">
              {insignia.descripcion}
            </p>
          </div>
        </div>

        {/* Elite shimmer */}
        {unlocked && isElite && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent, ${insignia.color}20, transparent)`,
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Large - vertical card
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        config.container,
        config.padding,
        unlocked ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      style={{
        background: unlocked
          ? `linear-gradient(180deg, ${insignia.color}15 0%, rgba(18, 18, 26, 0.95) 50%)`
          : 'rgba(24, 24, 27, 0.8)',
        border: unlocked
          ? `1px solid ${insignia.color}30`
          : '1px solid rgba(63, 63, 70, 0.2)',
        boxShadow: unlocked
          ? `0 8px 30px ${insignia.color}20, inset 0 1px 0 rgba(255,255,255,0.05)`
          : undefined,
      }}
      whileHover={unlocked ? { scale: 1.02, y: -4 } : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Locked overlay */}
      {!unlocked && (
        <div className="absolute inset-0 bg-zinc-900/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
          <Lock className="w-8 h-8 text-zinc-600" />
          <span className="text-xs text-zinc-500">Bloqueado</span>
        </div>
      )}

      <div className={cn('flex flex-col items-center text-center gap-3', !unlocked && 'opacity-30')}>
        {/* Large icon circle */}
        <motion.div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${insignia.color}40 0%, ${insignia.color}20 100%)`,
            boxShadow: unlocked
              ? `0 0 30px ${insignia.color}30, inset 0 2px 0 rgba(255,255,255,0.1)`
              : undefined,
          }}
          animate={unlocked ? { scale: [1, 1.05, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon size={config.icon} style={{ color: insignia.color }} />
        </motion.div>

        {/* Name */}
        <h3 className="font-bold text-white text-lg">
          {insignia.nombre}
        </h3>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed">
          {insignia.descripcion}
        </p>

        {/* Credits */}
        {showCredits && (
          <div
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: `${insignia.color}15`,
              color: insignia.color,
            }}
          >
            +{insignia.creditos} CR
          </div>
        )}

        {/* Unlock date */}
        {unlocked && unlockedAt && (
          <span className="text-xs text-zinc-600">
            Desbloqueado {formatDistanceToNow(unlockedAt, { addSuffix: true, locale: es })}
          </span>
        )}
      </div>

      {/* Elite shimmer */}
      {unlocked && isElite && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${insignia.color}15, transparent)`,
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
