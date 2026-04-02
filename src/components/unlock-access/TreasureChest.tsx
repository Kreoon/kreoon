import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TREASURE_CHEST_REWARDS } from '@/lib/unlock-access/game-constants';
import { cn } from '@/lib/utils';

interface TreasureChestProps {
  isUnlocked: boolean;
  onOpen?: () => void;
}

export const TreasureChest = memo(function TreasureChest({
  isUnlocked,
  onOpen
}: TreasureChestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  const handleChestClick = () => {
    if (!isUnlocked) return;

    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => setShowRewards(true), 800);
      onOpen?.();
    }
  };

  return (
    <div className="relative">
      {/* Glow effect when unlocked */}
      {isUnlocked && !isOpen && (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 to-amber-400/20 rounded-3xl blur-xl"
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'relative rounded-3xl p-6 sm:p-8 overflow-hidden',
          'bg-gradient-to-b from-slate-800/80 to-slate-900/90',
          'border-2',
          isUnlocked ? 'border-yellow-500/50' : 'border-white/10',
          isUnlocked && !isOpen && 'cursor-pointer hover:border-yellow-400/70 transition-colors'
        )}
        onClick={handleChestClick}
        whileHover={isUnlocked && !isOpen ? { scale: 1.02 } : {}}
        whileTap={isUnlocked && !isOpen ? { scale: 0.98 } : {}}
      >
        {/* Chains */}
        <AnimatePresence>
          {!isUnlocked && (
            <motion.div
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Chain links decoration */}
              <div className="absolute top-1/2 left-4 right-4 h-2 bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-50" />
              <div className="absolute top-1/3 left-8 right-8 h-1 bg-slate-600/30 rounded-full" />
              <div className="absolute top-2/3 left-8 right-8 h-1 bg-slate-600/30 rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breaking chains animation */}
        <AnimatePresence>
          {isUnlocked && !isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{
                    x: '50%',
                    y: '50%',
                    opacity: 0
                  }}
                  animate={{
                    x: `${20 + Math.random() * 60}%`,
                    y: `${20 + Math.random() * 60}%`,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chest content */}
        <div className="relative z-10">
          {/* Chest icon */}
          <motion.div
            animate={isOpen ? { rotateX: -30 } : {}}
            transition={{ type: 'spring', duration: 0.8 }}
            className="flex justify-center mb-6"
          >
            <motion.div
              animate={isUnlocked && !isOpen ? { y: [0, -5, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn(
                'text-6xl sm:text-7xl',
                !isUnlocked && 'grayscale opacity-50'
              )}
            >
              {isOpen ? '📖' : '📦'}
            </motion.div>
          </motion.div>

          {/* Title */}
          <div className="text-center mb-6">
            <h3 className={cn(
              'text-xl sm:text-2xl font-bold mb-2',
              isUnlocked ? 'text-yellow-300' : 'text-white/50'
            )}>
              {isOpen ? 'Tesoros Desbloqueados!' : 'Cofre del Fundador'}
            </h3>
            <p className={cn(
              'text-sm',
              isUnlocked ? 'text-white/70' : 'text-white/30'
            )}>
              {isOpen
                ? 'Estos son tus premios legendarios'
                : isUnlocked
                  ? 'Toca para revelar tus tesoros'
                  : 'Consigue las 3 llaves para abrir'
              }
            </p>
          </div>

          {/* Rewards list */}
          <AnimatePresence mode="wait">
            {showRewards ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {TREASURE_CHEST_REWARDS.map((reward, index) => (
                  <motion.div
                    key={reward.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-sm',
                      'bg-gradient-to-r from-yellow-500/10 to-amber-500/5',
                      'border border-yellow-500/20'
                    )}
                  >
                    <span className="text-2xl">{reward.icon}</span>
                    <div className="flex-1">
                      <span className="text-white font-medium block text-sm">
                        {reward.title}
                      </span>
                      <span className="text-yellow-300/70 text-xs">
                        {reward.value}
                      </span>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.15 + 0.3, type: 'spring' }}
                      className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"
                    >
                      <span className="text-green-400 text-sm">✓</span>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {TREASURE_CHEST_REWARDS.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-12 rounded-sm',
                      'bg-white/5 border border-white/5',
                      !isUnlocked && 'opacity-30'
                    )}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Total value */}
          <motion.div
            animate={isUnlocked ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              'mt-6 p-4 rounded-sm text-center',
              isUnlocked
                ? 'bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border border-yellow-500/30'
                : 'bg-white/5 border border-white/10'
            )}
          >
            <span className={cn(
              'text-sm',
              isUnlocked ? 'text-yellow-300/70' : 'text-white/30'
            )}>
              Valor total del cofre
            </span>
            <span className={cn(
              'block text-2xl sm:text-3xl font-bold mt-1',
              isUnlocked ? 'text-yellow-300' : 'text-white/20'
            )}>
              $497 USD
            </span>
          </motion.div>

          {/* Lock indicator */}
          {!isUnlocked && (
            <div className="absolute top-4 right-4">
              <span className="text-2xl">🔒</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});
