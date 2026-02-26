import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { CONFIG, getDaysRemaining, isUrgent } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  isComplete: boolean;
}

export const HeroSection = memo(function HeroSection({ isComplete }: HeroSectionProps) {
  const daysLeft = getDaysRemaining();
  const urgent = isUrgent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-2xl p-6 sm:p-8 overflow-hidden',
        'bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-pink-900/30',
        'border border-white/10'
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-[60px]" />
      </div>

      <div className="relative text-center">
        {/* Icon */}
        <motion.div
          animate={isComplete ? { rotate: [0, 10, -10, 0] } : { y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4"
        >
          {isComplete ? (
            <Sparkles className="w-8 h-8 text-amber-400" />
          ) : (
            <Lock className="w-8 h-8 text-purple-400" />
          )}
        </motion.div>

        {/* Title */}
        <h1 className={cn(
          'text-2xl sm:text-3xl font-bold mb-2',
          isComplete ? 'text-amber-300' : 'text-white'
        )}>
          {isComplete ? '🎉 ¡Acceso Desbloqueado!' : '🔐 Acceso Anticipado'}
        </h1>

        {/* Subtitle */}
        <p className="text-white/60 mb-4 max-w-md mx-auto">
          {isComplete
            ? 'Ya eres parte del grupo exclusivo. Todos los beneficios son tuyos.'
            : 'Desbloquea $497 USD en beneficios invitando a 3 personas'
          }
        </p>

        {/* Value proposition */}
        {!isComplete && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-2xl text-white/30 line-through font-bold">
              ${CONFIG.packageValue}
            </span>
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl font-bold text-green-400"
            >
              GRATIS
            </motion.span>
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium',
            'bg-white/5 border border-white/10 text-white/70'
          )}>
            👥 Solo los primeros 500
          </div>
          <div className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium',
            urgent
              ? 'bg-red-500/20 border border-red-500/30 text-red-300'
              : 'bg-white/5 border border-white/10 text-white/70'
          )}>
            {urgent ? `⚡ ¡Solo ${daysLeft} días!` : `📅 Cierra el 30 de Abril`}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
