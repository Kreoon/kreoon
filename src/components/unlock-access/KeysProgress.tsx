import { memo } from 'react';
import { motion } from 'framer-motion';
import { Key } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeysProgressProps {
  keysCollected: number;
  referrals?: { name: string; avatar?: string }[];
}

// SVG Key icon component
const KeyIcon = memo(function KeyIcon({
  filled,
  index,
  isCurrent
}: {
  filled: boolean;
  index: number;
  isCurrent: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: index * 0.15, type: 'spring' }}
      className="relative"
    >
      {/* Pulse sutil para la siguiente llave a conseguir (solo si hay progreso) */}
      {isCurrent && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-white/20 rounded-full blur-md"
        />
      )}

      <div className={cn(
        'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center',
        'border-2 transition-all duration-300',
        // Solo dorada si está desbloqueada (filled)
        filled && 'bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-300 shadow-lg shadow-amber-500/30',
        // Todas las no-desbloqueadas se ven grises (sin color)
        !filled && 'bg-white/5 border-white/20'
      )}>
        {filled ? (
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <Key className="w-6 h-6 text-amber-900" strokeWidth={2.5} />
          </motion.div>
        ) : (
          <Key className="w-6 h-6 text-white/30" strokeWidth={1.5} />
        )}
      </div>
    </motion.div>
  );
});

export const KeysProgress = memo(function KeysProgress({
  keysCollected,
  referrals = []
}: KeysProgressProps) {
  const isComplete = keysCollected >= 3;
  const progress = (keysCollected / 3) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl p-5 sm:p-6',
        'bg-white/[0.03] border border-white/10'
      )}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
          🔑 Consigue las 3 Llaves
        </h2>
        {isComplete && (
          <p className="text-sm text-green-400 font-medium">
            ¡Desbloqueaste todos los beneficios!
          </p>
        )}
      </div>

      {/* Círculo de progreso con llaves */}
      <div className="flex flex-col items-center mb-6">
        {/* Progress circle */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-4">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100) }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              'text-3xl sm:text-4xl font-bold',
              isComplete ? 'text-amber-400' : 'text-white'
            )}>
              {keysCollected}/3
            </span>
            <span className="text-xs text-white/40">llaves</span>
          </div>
        </div>

        {/* 3 Key icons */}
        <div className="flex items-center gap-4 sm:gap-6">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <KeyIcon
                filled={index < keysCollected}
                index={index}
                isCurrent={index === keysCollected}
              />
              {/* Referral name if unlocked */}
              {referrals[index] && (
                <div className="flex items-center gap-1">
                  {referrals[index].avatar ? (
                    <img
                      src={referrals[index].avatar}
                      alt=""
                      className="w-4 h-4 rounded-full"
                    />
                  ) : null}
                  <span className="text-[10px] text-green-400 truncate max-w-[60px]">
                    {referrals[index].name.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
});
