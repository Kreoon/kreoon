import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Crown, Sparkles, Zap, BadgeCheck, TrendingUp, Gift } from 'lucide-react';

const BENEFITS = [
  {
    icon: Crown,
    title: '3 meses Creator Pro',
    subtitle: 'Valor $72 USD',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/30'
  },
  {
    icon: Zap,
    title: '18,000 Tokens IA',
    subtitle: '6,000/mes x 3 meses',
    gradient: 'from-purple-500 to-pink-500',
    glow: 'shadow-purple-500/30'
  },
  {
    icon: Sparkles,
    title: 'Herramientas IA creativa',
    subtitle: 'Genera contenido con IA',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/30'
  },
  {
    icon: BadgeCheck,
    title: 'Badge verificado',
    subtitle: 'Perfil destacado',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/30'
  },
  {
    icon: TrendingUp,
    title: 'Posición privilegiada',
    subtitle: 'Aparece primero en búsquedas',
    gradient: 'from-rose-500 to-pink-500',
    glow: 'shadow-rose-500/30'
  },
  {
    icon: Gift,
    title: 'Aplicaciones ilimitadas',
    subtitle: 'A todas las campañas',
    gradient: 'from-yellow-500 to-amber-500',
    glow: 'shadow-yellow-500/30'
  },
];

interface BenefitsGridProps {
  isUnlocked?: boolean;
}

export const BenefitsGrid = memo(function BenefitsGrid({
  isUnlocked = false
}: BenefitsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center justify-center gap-2">
          <span className="text-2xl">🎁</span>
          {isUnlocked ? 'Tus beneficios desbloqueados' : 'Beneficios que desbloqueas'}
        </h2>
      </div>

      {/* Grid de beneficios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {BENEFITS.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08, type: 'spring' }}
              className={cn(
                'relative group',
                'rounded-sm p-4',
                'flex flex-col items-center text-center gap-2',
                'transition-all duration-300',
                isUnlocked
                  ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20'
                  : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
              )}
            >
              {/* Glow effect on hover */}
              <div className={cn(
                'absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity blur-xl',
                `bg-gradient-to-br ${benefit.gradient}`
              )} style={{ filter: 'blur(20px)', opacity: 0.15 }} />

              {/* Icon container */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  'relative w-12 h-12 rounded-sm',
                  'flex items-center justify-center',
                  isUnlocked
                    ? `bg-gradient-to-br ${benefit.gradient} shadow-lg ${benefit.glow}`
                    : 'bg-white/10'
                )}
              >
                <Icon className={cn(
                  'w-6 h-6',
                  isUnlocked ? 'text-white' : 'text-white/50'
                )} />
              </motion.div>

              {/* Title */}
              <p className={cn(
                'text-xs sm:text-sm font-bold leading-tight',
                isUnlocked ? 'text-white' : 'text-white/80'
              )}>
                {benefit.title}
              </p>

              {/* Subtitle */}
              <p className={cn(
                'text-[10px] sm:text-xs leading-tight',
                isUnlocked ? 'text-white/60' : 'text-white/40'
              )}>
                {benefit.subtitle}
              </p>

              {/* Unlocked checkmark */}
              {isUnlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: 'spring' }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});
