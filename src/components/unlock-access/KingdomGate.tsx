import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KingdomGateProps {
  unlockedKeys: number;
  onGateClick: () => void;
}

function KeySlot({ index, isUnlocked, isCurrent }: { index: number; isUnlocked: boolean; isCurrent: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring' }}
      className="relative"
    >
      {/* Glow effect for unlocked */}
      {isUnlocked && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-yellow-400/40 blur-md"
        />
      )}

      {/* Current slot pulse */}
      {isCurrent && !isUnlocked && (
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-purple-500/40 blur-md"
        />
      )}

      <div
        className={cn(
          'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center',
          'border-2 transition-all duration-500',
          isUnlocked && 'bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300 shadow-lg shadow-yellow-500/30',
          isCurrent && !isUnlocked && 'bg-purple-500/20 border-purple-400 border-dashed',
          !isUnlocked && !isCurrent && 'bg-white/5 border-white/20'
        )}
      >
        {isUnlocked ? (
          <motion.span
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-xl sm:text-2xl"
          >
            🗝️
          </motion.span>
        ) : isCurrent ? (
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-lg sm:text-xl opacity-60"
          >
            ✨
          </motion.span>
        ) : (
          <span className="text-lg sm:text-xl opacity-30">🔒</span>
        )}
      </div>
    </motion.div>
  );
}

export function KingdomGate({ unlockedKeys, onGateClick }: KingdomGateProps) {
  const [isShaking, setIsShaking] = useState(false);
  const isOpen = unlockedKeys >= 3;

  const handleClick = useCallback(() => {
    if (!isOpen) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
    onGateClick();
  }, [isOpen, onGateClick]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      {/* Magical particles background */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: '100%',
              opacity: 0
            }}
            animate={{
              y: '-20%',
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Gate Container */}
      <motion.div
        animate={isShaking ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer',
          'rounded-3xl p-6 sm:p-8',
          'bg-gradient-to-b from-slate-800/80 via-slate-900/90 to-black/80',
          'border-2 border-white/10',
          'overflow-hidden',
          'group'
        )}
      >
        {/* Inner glow when open */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 via-amber-500/10 to-transparent"
            />
          )}
        </AnimatePresence>

        {/* Gate arch decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-b-4 border-white/10 rounded-b-full" />

        {/* Gate content */}
        <div className="relative z-10 text-center space-y-6">
          {/* Title */}
          <div>
            <motion.h2
              animate={isOpen ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 2, repeat: isOpen ? Infinity : 0 }}
              className={cn(
                'text-xl sm:text-2xl font-bold',
                isOpen ? 'text-yellow-300' : 'text-white'
              )}
            >
              {isOpen ? '🏰 El Reino te Espera' : '🚪 La Puerta del Reino'}
            </motion.h2>
            <p className="text-sm text-white/50 mt-1">
              {isOpen
                ? 'Las puertas estan abiertas, Fundador'
                : 'Inserta las 3 llaves para entrar'
              }
            </p>
          </div>

          {/* Key Slots */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {[0, 1, 2].map((index) => (
              <KeySlot
                key={index}
                index={index}
                isUnlocked={index < unlockedKeys}
                isCurrent={index === unlockedKeys}
              />
            ))}
          </div>

          {/* Gate status message */}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="open"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 text-yellow-300"
              >
                <span className="text-2xl">✨</span>
                <span className="font-medium">Click para entrar al Reino</span>
                <span className="text-2xl">✨</span>
              </motion.div>
            ) : (
              <motion.p
                key="closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-white/40"
              >
                {unlockedKeys === 0 && 'Consigue tu primera llave invitando a un Guardian'}
                {unlockedKeys === 1 && 'Faltan 2 llaves mas...'}
                {unlockedKeys === 2 && 'Solo falta 1 llave!'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Hover glow effect */}
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'bg-gradient-to-t from-purple-500/10 to-transparent'
        )} />
      </motion.div>
    </motion.div>
  );
}
