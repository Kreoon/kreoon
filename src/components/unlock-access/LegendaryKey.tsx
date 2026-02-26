import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Sparkles } from 'lucide-react';
import { type LegendaryKey as LegendaryKeyType } from '@/lib/unlock-access/game-constants';
import { cn } from '@/lib/utils';

interface GuardianInfo {
  name: string;
  avatar?: string;
  joinedAt?: Date;
}

interface LegendaryKeyProps {
  keyData: LegendaryKeyType;
  status: 'locked' | 'current' | 'unlocked';
  guardian?: GuardianInfo;
  index: number;
}

export const LegendaryKey = memo(function LegendaryKey({
  keyData,
  status,
  guardian,
  index
}: LegendaryKeyProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isUnlocked = status === 'unlocked';
  const isCurrent = status === 'current';
  const isLocked = status === 'locked';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className="relative perspective-1000"
      style={{ perspective: '1000px' }}
    >
      {/* Pulse animation for current */}
      {isCurrent && (
        <motion.div
          animate={{
            scale: [1, 1.03, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-br',
            keyData.color
          )}
        />
      )}

      {/* Card container */}
      <motion.div
        className="relative cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div
          className={cn(
            'relative rounded-2xl p-5 min-h-[200px]',
            'backface-hidden',
            isLocked && 'bg-white/[0.02] border border-white/5 opacity-50 grayscale',
            isCurrent && 'bg-white/[0.05] border-2 border-purple-500/50',
            isUnlocked && `bg-gradient-to-br ${keyData.color} border-2 border-white/20`
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Key icon */}
          <div className="flex items-center justify-between mb-4">
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                isLocked && 'bg-white/5',
                isCurrent && `bg-gradient-to-br ${keyData.color}`,
                isUnlocked && 'bg-white/20'
              )}
            >
              {isLocked ? (
                <Lock className="w-6 h-6 text-white/30" />
              ) : (
                <motion.span
                  animate={isUnlocked ? { rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl"
                >
                  {keyData.icon}
                </motion.span>
              )}
            </div>

            {/* Status badge */}
            {isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            )}
            {isCurrent && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="px-2 py-1 rounded-full bg-purple-500/30 border border-purple-400/50"
              >
                <Sparkles className="w-4 h-4 text-purple-300" />
              </motion.div>
            )}
          </div>

          {/* Key info */}
          <div className="space-y-2">
            <span className={cn(
              'text-xs uppercase tracking-wider',
              isLocked ? 'text-white/30' : 'text-white/70'
            )}>
              Llave {keyData.id} de 3
            </span>
            <h3 className={cn(
              'font-bold text-lg',
              isLocked ? 'text-white/40' : 'text-white'
            )}>
              {keyData.name}
            </h3>
            <p className={cn(
              'text-sm',
              isLocked ? 'text-white/20' : 'text-white/60'
            )}>
              {keyData.subtitle}
            </p>
          </div>

          {/* Guardian info */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <span className="text-xs text-white/40 block mb-2">Guardian:</span>
            {guardian ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                  {guardian.avatar ? (
                    <img src={guardian.avatar} alt={guardian.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    guardian.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-sm text-white font-medium">{guardian.name}</span>
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Unido
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/30">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="text-lg">?</span>
                </div>
                <span className="text-sm">
                  {isCurrent ? 'Buscando...' : 'Bloqueado'}
                </span>
              </div>
            )}
          </div>

          {/* Flip hint */}
          <p className="text-center text-xs text-white/30 mt-4">
            Toca para ver recompensas
          </p>
        </div>

        {/* Back of card (rewards) */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl p-5',
            'backface-hidden',
            `bg-gradient-to-br ${keyData.color}`
          )}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="h-full flex flex-col">
            <h4 className="font-bold text-white mb-1">{keyData.name}</h4>
            <p className="text-xs text-white/70 mb-4">Recompensas incluidas:</p>

            <ul className="space-y-3 flex-1">
              {keyData.rewards.map((reward, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-xl">{reward.icon}</span>
                  <div className="flex-1">
                    <span className="text-sm text-white block">{reward.text}</span>
                    <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                      {reward.value}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>

            <p className="text-center text-xs text-white/50 mt-4">
              Toca para volver
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
