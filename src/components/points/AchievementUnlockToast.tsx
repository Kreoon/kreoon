import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Star } from 'lucide-react';
import { Achievement } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';

interface AchievementUnlockToastProps {
  achievement: Achievement;
  onClose: () => void;
}

const RARITY_COLORS = {
  common: 'from-slate-500 to-slate-600',
  uncommon: 'from-green-500 to-emerald-600',
  rare: 'from-blue-500 to-indigo-600',
  epic: 'from-purple-500 to-violet-600',
  legendary: 'from-amber-500 to-orange-600',
};

const RARITY_LABELS = {
  common: 'Comun',
  uncommon: 'Poco comun',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Legendario',
};

export function AchievementUnlockToast({ achievement, onClose }: AchievementUnlockToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const rarity = (achievement.rarity || 'common') as keyof typeof RARITY_COLORS;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border shadow-2xl',
            'bg-gradient-to-br p-4 min-w-[300px] max-w-[400px]',
            RARITY_COLORS[rarity]
          )}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Trophy className="w-8 h-8 text-white" />
            </div>

            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Logro Desbloqueado
                </span>
              </div>

              <h4 className="text-lg font-bold mb-1">{achievement.name}</h4>
              <p className="text-sm opacity-90 mb-2">{achievement.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                  {RARITY_LABELS[rarity]}
                </span>
                {achievement.points && (
                  <span className="text-sm font-semibold">+{achievement.points} UP</span>
                )}
              </div>
            </div>
          </div>

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: 2, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
