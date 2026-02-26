import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FOUNDER_KEYS, PACKAGE_VALUE } from '@/lib/unlock-access/constants';
import { getKeyState } from '@/lib/unlock-access/utils';
import { FounderKeyCard } from './FounderKeyCard';

interface FounderKeysProgressProps {
  unlockedCount: number;
}

export function FounderKeysProgress({ unlockedCount }: FounderKeysProgressProps) {
  const isComplete = unlockedCount >= 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">EARLY BIRD - Solo 500 Fundadores</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Paquete Fundador KREOON
        </h2>

        <div className="flex items-center justify-center gap-3">
          <span className="text-lg sm:text-xl text-white/40 line-through">${PACKAGE_VALUE} USD</span>
          <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            GRATIS
          </span>
        </div>

        <p className="text-sm text-white/50 mt-2">
          {isComplete
            ? 'Has desbloqueado TODOS los beneficios de fundador'
            : `Consigue ${3 - unlockedCount} llave${3 - unlockedCount === 1 ? '' : 's'} mas para desbloquear todo`
          }
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / 3) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-white/40">0 llaves</span>
          <span className="text-xs text-white/40">3 llaves</span>
        </div>
      </div>

      {/* Keys grid */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.15 } }
        }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {FOUNDER_KEYS.map((key, index) => (
          <FounderKeyCard
            key={key.id}
            keyData={key}
            state={getKeyState(index, unlockedCount)}
            index={index}
          />
        ))}
      </motion.div>
    </div>
  );
}
