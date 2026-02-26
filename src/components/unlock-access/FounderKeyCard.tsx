import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { type FounderKey } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

interface FounderKeyCardProps {
  keyData: FounderKey;
  state: 'locked' | 'current' | 'unlocked';
  index: number;
}

export const FounderKeyCard = memo(function FounderKeyCard({
  keyData,
  state,
  index
}: FounderKeyCardProps) {
  const Icon = keyData.icon;
  const isUnlocked = state === 'unlocked';
  const isCurrent = state === 'current';
  const isLocked = state === 'locked';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className="relative"
    >
      {/* Pulse animation for current key */}
      {isCurrent && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-br',
            keyData.color
          )}
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div
        className={cn(
          'relative rounded-2xl p-4 sm:p-5 transition-all duration-300',
          isLocked && 'bg-white/[0.02] border border-white/5 opacity-60 grayscale',
          isCurrent && 'bg-white/[0.05] border-2 border-purple-500/50 shadow-lg shadow-purple-500/20',
          isUnlocked && 'bg-gradient-to-br border-2',
          isUnlocked && keyData.color,
          isUnlocked && keyData.borderColor.replace('border-', 'border-').replace('/30', '/50')
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center',
                isLocked && 'bg-white/5',
                isCurrent && `bg-gradient-to-br ${keyData.color}`,
                isUnlocked && 'bg-white/20'
              )}
            >
              {isLocked ? (
                <Lock className="w-5 h-5 text-white/30" />
              ) : (
                <Icon className={cn(
                  'w-5 h-5 sm:w-6 sm:h-6',
                  isUnlocked ? 'text-white' : 'text-white'
                )} />
              )}
            </div>
            <div>
              <span className={cn(
                'text-xs uppercase tracking-wider',
                isLocked ? 'text-white/30' : 'text-white/70'
              )}>
                Llave {keyData.id}
              </span>
              <h3 className={cn(
                'font-bold text-sm sm:text-base',
                isLocked ? 'text-white/40' : 'text-white'
              )}>
                {keyData.name}
              </h3>
            </div>
          </div>

          {/* Status badge */}
          {isUnlocked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Check className="w-5 h-5 text-white" />
            </motion.div>
          )}

          {isCurrent && (
            <div className="px-2 py-1 rounded-full bg-purple-500/30 border border-purple-500/50">
              <span className="text-[10px] font-medium text-purple-300 uppercase">Siguiente</span>
            </div>
          )}
        </div>

        {/* Benefits list */}
        <ul className="space-y-2">
          {keyData.benefits.map((benefit, i) => (
            <li
              key={i}
              className={cn(
                'flex items-center justify-between text-xs sm:text-sm',
                isLocked ? 'text-white/30' : 'text-white/80'
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isLocked ? 'bg-white/20' : isUnlocked ? 'bg-white/60' : 'bg-purple-400'
                )} />
                {benefit.text}
              </span>
              <span className={cn(
                'font-semibold text-[10px] sm:text-xs px-2 py-0.5 rounded',
                isLocked ? 'bg-white/5 text-white/30' : 'bg-white/10 text-white'
              )}>
                {benefit.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
});
