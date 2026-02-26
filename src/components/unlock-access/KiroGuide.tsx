import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { KIRO_DIALOGUES } from '@/lib/unlock-access/game-constants';
import { getUrgencyLevel } from '@/lib/unlock-access/utils';
import { cn } from '@/lib/utils';

interface KiroGuideProps {
  keysCollected: number;
  showTips?: boolean;
}

export const KiroGuide = memo(function KiroGuide({
  keysCollected,
  showTips = true
}: KiroGuideProps) {
  const [currentDialogue, setCurrentDialogue] = useState(0);
  const [showTip, setShowTip] = useState(false);

  const progressKey = keysCollected as 0 | 1 | 2 | 3;
  const dialogues = KIRO_DIALOGUES.progress[progressKey] || KIRO_DIALOGUES.progress[0];
  const urgency = getUrgencyLevel();
  const urgencyMessage = KIRO_DIALOGUES.urgency[urgency];

  const nextDialogue = useCallback(() => {
    setCurrentDialogue((prev) => (prev + 1) % dialogues.length);
  }, [dialogues.length]);

  const prevDialogue = useCallback(() => {
    setCurrentDialogue((prev) => (prev - 1 + dialogues.length) % dialogues.length);
  }, [dialogues.length]);

  // Auto-rotate dialogues
  useEffect(() => {
    const interval = setInterval(nextDialogue, 8000);
    return () => clearInterval(interval);
  }, [nextDialogue]);

  // Random tip display
  useEffect(() => {
    if (!showTips) return;

    const showRandomTip = () => {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 5000);
    };

    const timeout = setTimeout(showRandomTip, 15000);
    const interval = setInterval(showRandomTip, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [showTips]);

  const randomTip = KIRO_DIALOGUES.tips[Math.floor(Math.random() * KIRO_DIALOGUES.tips.length)];

  return (
    <div className="relative">
      {/* Kiro container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Floating glow */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-3xl blur-xl"
        />

        {/* Main card */}
        <div className={cn(
          'relative rounded-3xl p-5 sm:p-6 overflow-hidden',
          'bg-gradient-to-br from-slate-800/90 via-purple-900/20 to-slate-900/90',
          'border border-purple-500/30'
        )}>
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                initial={{
                  x: `${Math.random() * 100}%`,
                  y: '100%',
                  opacity: 0
                }}
                animate={{
                  y: '-10%',
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: 'linear'
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex gap-4">
            {/* Kiro Avatar */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="flex-shrink-0"
            >
              <div className={cn(
                'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
                'bg-gradient-to-br from-purple-500 to-pink-500',
                'flex items-center justify-center',
                'border-2 border-purple-400/50',
                'shadow-lg shadow-purple-500/30'
              )}>
                <span className="text-3xl sm:text-4xl">🦉</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-xs text-purple-300 font-medium">KIRO</span>
              </div>
            </motion.div>

            {/* Dialogue bubble */}
            <div className="flex-1 min-w-0">
              {/* Speech bubble */}
              <div className={cn(
                'relative rounded-2xl p-4',
                'bg-white/[0.05] border border-white/10',
                'before:absolute before:left-[-8px] before:top-6',
                'before:w-0 before:h-0',
                'before:border-t-[8px] before:border-t-transparent',
                'before:border-r-[8px] before:border-r-white/10',
                'before:border-b-[8px] before:border-b-transparent'
              )}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentDialogue}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-white/90 text-sm sm:text-base leading-relaxed"
                  >
                    {dialogues[currentDialogue]}
                  </motion.p>
                </AnimatePresence>

                {/* Navigation dots */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={prevDialogue}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/50" />
                  </button>

                  <div className="flex gap-1.5">
                    {dialogues.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentDialogue(i)}
                        className={cn(
                          'w-2 h-2 rounded-full transition-all',
                          i === currentDialogue
                            ? 'bg-purple-400 w-4'
                            : 'bg-white/20 hover:bg-white/30'
                        )}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextDialogue}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              </div>

              {/* Urgency alert */}
              {urgency !== 'normal' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={cn(
                    'mt-3 p-3 rounded-xl text-xs',
                    urgency === 'critical' && 'bg-red-500/20 border border-red-500/30 text-red-300',
                    urgency === 'high' && 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                  )}
                >
                  <span className="mr-2">⚠️</span>
                  {urgencyMessage}
                </motion.div>
              )}
            </div>
          </div>

          {/* Tip popup */}
          <AnimatePresence>
            {showTip && showTips && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-4',
                  'max-w-xs w-full px-4'
                )}
              >
                <div className={cn(
                  'p-3 rounded-xl',
                  'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
                  'border border-yellow-500/30',
                  'shadow-lg shadow-yellow-500/10'
                )}>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200/90">{randomTip}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
});
