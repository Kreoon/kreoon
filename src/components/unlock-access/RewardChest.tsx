import { useState, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Lock, Check } from 'lucide-react';
import { CHEST_REWARDS, CONFIG } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

const ReactConfetti = lazy(() => import('react-confetti'));

interface RewardChestProps {
  isUnlocked: boolean;
  onOpen?: () => void;
}

export const RewardChest = memo(function RewardChest({
  isUnlocked,
  onOpen
}: RewardChestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleOpen = () => {
    if (!isUnlocked || isOpen) return;
    setIsOpen(true);
    setShowConfetti(true);
    onOpen?.();
    setTimeout(() => setShowConfetti(false), 4000);
  };

  return (
    <div className="relative">
      {/* Confetti */}
      {showConfetti && (
        <Suspense fallback={null}>
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            colors={['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff', '#a855f7']}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
          />
        </Suspense>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative rounded-sm overflow-hidden',
          'bg-gradient-to-b from-white/[0.05] to-white/[0.02]',
          'border',
          isUnlocked ? 'border-amber-500/30' : 'border-white/10'
        )}
      >
        {/* Glow effect */}
        {isUnlocked && !isOpen && (
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent pointer-events-none"
          />
        )}

        <div className="relative p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={isUnlocked && !isOpen ? {
                  y: [0, -3, 0],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={cn(
                  'w-12 h-12 rounded-sm flex items-center justify-center',
                  isUnlocked ? 'bg-amber-500/20' : 'bg-white/5'
                )}
              >
                <Gift className={cn(
                  'w-6 h-6',
                  isUnlocked ? 'text-amber-400' : 'text-white/30'
                )} />
              </motion.div>
              <div>
                <h3 className={cn(
                  'font-semibold',
                  isUnlocked ? 'text-amber-300' : 'text-white/50'
                )}>
                  {isOpen ? '¡Desbloqueado!' : 'Cofre de Recompensas'}
                </h3>
                <p className="text-xs text-white/40">
                  {isOpen
                    ? 'Estos beneficios ya son tuyos'
                    : 'Consigue las 3 llaves para abrir'
                  }
                </p>
              </div>
            </div>

            {/* Value badge */}
            <div className={cn(
              'text-right',
              !isUnlocked && 'opacity-50'
            )}>
              <p className="text-xs text-white/40 line-through">${CONFIG.packageValue}</p>
              <p className={cn(
                'text-lg font-bold',
                isUnlocked ? 'text-green-400' : 'text-white/50'
              )}>
                GRATIS
              </p>
            </div>
          </div>

          {/* Rewards list */}
          <div className="space-y-2">
            {CHEST_REWARDS.map((reward, index) => (
              <motion.div
                key={reward.text}
                initial={isOpen ? { opacity: 0, x: -20 } : {}}
                animate={isOpen ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-sm',
                  'transition-all',
                  isUnlocked
                    ? 'bg-white/[0.05]'
                    : 'bg-white/[0.02]',
                  !isUnlocked && 'blur-[1px]'
                )}
              >
                <span className={cn(
                  'text-xl',
                  !isUnlocked && 'grayscale opacity-50'
                )}>
                  {reward.icon}
                </span>
                <div className="flex-1">
                  <p className={cn(
                    'text-sm',
                    isUnlocked ? 'text-white' : 'text-white/40'
                  )}>
                    {reward.text}
                  </p>
                </div>
                <div className={cn(
                  'text-xs font-medium px-2 py-1 rounded-sm',
                  isUnlocked
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-white/5 text-white/30'
                )}>
                  {reward.value}
                </div>
                {isOpen && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    <Check className="w-4 h-4 text-green-400" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* CTA or Lock */}
          <div className="mt-4">
            {isUnlocked ? (
              <AnimatePresence mode="wait">
                {!isOpen ? (
                  <motion.button
                    key="open"
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={handleOpen}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'w-full py-3 rounded-sm font-medium',
                      'bg-gradient-to-r from-amber-500 to-yellow-500',
                      'text-black',
                      'shadow-lg shadow-amber-500/20'
                    )}
                  >
                    🎁 Abrir Cofre
                  </motion.button>
                ) : (
                  <motion.div
                    key="opened"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-3"
                  >
                    <span className="text-green-400 text-sm flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      ¡Todas las recompensas desbloqueadas!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-white/30">
                <Lock className="w-4 h-4" />
                <span className="text-sm">Faltan llaves para abrir</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
