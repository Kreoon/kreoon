import { memo, useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ACHIEVEMENTS } from '@/lib/unlock-access/game-constants';
import { cn } from '@/lib/utils';

const ReactConfetti = lazy(() => import('react-confetti'));

type AchievementKey = keyof typeof ACHIEVEMENTS;

interface AchievementModalProps {
  achievement: AchievementKey | null;
  onClose: () => void;
}

export const AchievementModal = memo(function AchievementModal({
  achievement,
  onClose
}: AchievementModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const achievementData = achievement ? ACHIEVEMENTS[achievement] : null;
  const isLegendary = achievementData?.legendary;

  useEffect(() => {
    if (achievement) {
      setShowConfetti(true);
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });

      const timeout = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [achievement]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (achievement) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [achievement, onClose]);

  if (!achievementData) return null;

  return (
    <AnimatePresence>
      {achievement && (
        <>
          {/* Confetti */}
          {showConfetti && (
            <Suspense fallback={null}>
              <ReactConfetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={isLegendary ? 500 : 200}
                colors={isLegendary
                  ? ['#fbbf24', '#f59e0b', '#d97706', '#ffffff', '#fef3c7']
                  : ['#a855f7', '#ec4899', '#6366f1', '#ffffff', '#f0abfc']
                }
                style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
              />
            </Suspense>
          )}

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className={cn(
              'relative max-w-sm w-full rounded-3xl overflow-hidden',
              'bg-gradient-to-b from-slate-800 to-slate-900',
              'border-2',
              isLegendary ? 'border-yellow-500/50' : 'border-purple-500/50'
            )}>
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>

              {/* Glow effect */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  'absolute inset-0',
                  isLegendary
                    ? 'bg-gradient-to-t from-yellow-500/30 to-transparent'
                    : 'bg-gradient-to-t from-purple-500/30 to-transparent'
                )}
              />

              {/* Content */}
              <div className="relative z-10 p-8 text-center">
                {/* Banner */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    'inline-block px-4 py-1 rounded-full text-xs font-medium mb-6',
                    isLegendary
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  )}
                >
                  {isLegendary ? '⭐ LOGRO LEGENDARIO' : '🏆 LOGRO DESBLOQUEADO'}
                </motion.div>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.3, duration: 0.8 }}
                  className="mb-6"
                >
                  <div className={cn(
                    'inline-flex items-center justify-center',
                    'w-24 h-24 rounded-sm',
                    isLegendary
                      ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/50'
                      : 'bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/50'
                  )}>
                    <motion.span
                      animate={isLegendary ? {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-5xl"
                    >
                      {achievementData.icon}
                    </motion.span>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={cn(
                    'text-2xl sm:text-3xl font-bold mb-2',
                    isLegendary ? 'text-yellow-300' : 'text-white'
                  )}
                >
                  {achievementData.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/70 mb-6"
                >
                  {achievementData.description}
                </motion.p>

                {/* XP Reward */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.6 }}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-sm',
                    'bg-white/10 border border-white/20'
                  )}
                >
                  <span className="text-lg">✨</span>
                  <span className="text-white/80 font-medium">
                    +{achievementData.xp} XP
                  </span>
                </motion.div>

                {/* Close button */}
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  onClick={onClose}
                  className={cn(
                    'mt-8 w-full py-3 rounded-sm font-medium',
                    'transition-all',
                    isLegendary
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
                  )}
                >
                  {isLegendary ? 'Reclamar Gloria' : 'Continuar'}
                </motion.button>
              </div>

              {/* Sparkles decoration */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      'absolute w-1 h-1 rounded-full',
                      isLegendary ? 'bg-yellow-400' : 'bg-purple-400'
                    )}
                    initial={{
                      x: `${50 + (Math.random() - 0.5) * 30}%`,
                      y: `${50 + (Math.random() - 0.5) * 30}%`,
                      opacity: 0,
                      scale: 0
                    }}
                    animate={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
