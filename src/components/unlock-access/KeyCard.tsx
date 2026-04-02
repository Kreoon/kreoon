import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, User } from 'lucide-react';
import { type KeyData } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

interface ReferralInfo {
  name: string;
  avatar?: string;
}

interface KeyCardProps {
  keyData: KeyData;
  status: 'locked' | 'current' | 'unlocked';
  referral?: ReferralInfo;
  index: number;
}

export const KeyCard = memo(function KeyCard({
  keyData,
  status,
  referral,
  index
}: KeyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isUnlocked = status === 'unlocked';
  const isCurrent = status === 'current';
  const isLocked = status === 'locked';

  const colorClasses = {
    amber: {
      gradient: 'from-amber-500 to-yellow-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    purple: {
      gradient: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
    },
    emerald: {
      gradient: 'from-emerald-500 to-teal-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
    },
  }[keyData.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative h-[220px]"
      style={{ perspective: '1000px' }}
    >
      {/* Pulse sutil para la siguiente llave (sin color, solo resplandor blanco) */}
      {isCurrent && (
        <motion.div
          animate={{
            scale: [1, 1.03, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-sm bg-white/10"
        />
      )}

      {/* Card */}
      <motion.div
        className="relative w-full h-full cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className={cn(
            'absolute inset-0 rounded-sm p-4 flex flex-col',
            'border transition-all',
            // Locked y current se ven iguales (grises, sin color)
            (isLocked || isCurrent) && 'bg-white/[0.02] border-white/10',
            isLocked && 'opacity-60',
            // Solo unlocked tiene el color dorado
            isUnlocked && `bg-gradient-to-br ${colorClasses.gradient} border-white/20`
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              'w-12 h-12 rounded-sm flex items-center justify-center',
              // Locked y current se ven iguales (sin color)
              (isLocked || isCurrent) && 'bg-white/5',
              isUnlocked && 'bg-white/20'
            )}>
              {isUnlocked ? (
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl"
                >
                  {keyData.icon}
                </motion.span>
              ) : (
                <Lock className="w-5 h-5 text-white/30" />
              )}
            </div>

            {isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Name */}
          <div className="mb-2">
            <p className={cn(
              'text-xs uppercase tracking-wider',
              // Locked y current se ven iguales (gris), solo unlocked tiene color
              isUnlocked ? 'text-white/70' : 'text-white/30'
            )}>
              {keyData.name}
            </p>
            <p className={cn(
              'text-sm font-medium',
              isUnlocked ? 'text-white' : 'text-white/40'
            )}>
              {keyData.subtitle}
            </p>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Referral or status */}
          <div className={cn(
            'pt-3 border-t',
            isUnlocked ? 'border-white/10' : 'border-white/5'
          )}>
            {referral ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                  {referral.avatar ? (
                    <img src={referral.avatar} alt={referral.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{referral.name}</p>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Unido
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/30">
                {isCurrent ? '🔗 Invita a alguien...' : '🔒 Bloqueada'}
              </p>
            )}
          </div>

          {/* Flip hint */}
          <p className="text-center text-[10px] text-white/30 mt-2">
            Toca para ver recompensas
          </p>
        </div>

        {/* Back (rewards) */}
        <div
          className={cn(
            'absolute inset-0 rounded-sm p-4 flex flex-col',
            `bg-gradient-to-br ${colorClasses.gradient}`
          )}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="mb-2">
            <p className="text-white/80 text-xs">{keyData.name}</p>
            <p className="text-white font-medium text-sm">Recompensas:</p>
          </div>

          <div className="flex-1 space-y-2">
            {keyData.rewards.map((reward, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-2 bg-white/10 rounded-sm p-2"
              >
                <span className="text-lg">{reward.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs truncate">{reward.text}</p>
                  <p className="text-white/60 text-[10px]">{reward.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-[10px] text-white/50 mt-2">
            Toca para volver
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
});
