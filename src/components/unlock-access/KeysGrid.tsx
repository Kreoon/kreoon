import { memo } from 'react';
import { motion } from 'framer-motion';
import { KEYS } from '@/lib/unlock-access/constants';
import { KeyCard } from './KeyCard';

interface ReferralInfo {
  name: string;
  avatar?: string;
}

interface KeysGridProps {
  keysCollected: number;
  referrals: ReferralInfo[];
}

export const KeysGrid = memo(function KeysGrid({
  keysCollected,
  referrals
}: KeysGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Section title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">
          🔑 Las 3 Llaves
        </h2>
        <p className="text-sm text-white/50">
          Cada persona que se une desbloquea una llave
        </p>
      </div>

      {/* Keys grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KEYS.map((keyData, index) => {
          let status: 'locked' | 'current' | 'unlocked' = 'locked';
          if (index < keysCollected) status = 'unlocked';
          else if (index === keysCollected) status = 'current';

          return (
            <KeyCard
              key={keyData.id}
              keyData={keyData}
              status={status}
              referral={referrals[index]}
              index={index}
            />
          );
        })}
      </div>
    </motion.div>
  );
});
