import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KIRO_MESSAGES } from '@/lib/unlock-access/constants';
import { getStoredKiroMessageIndex, storeKiroMessageIndex } from '@/lib/unlock-access/utils';
import { cn } from '@/lib/utils';

interface KiroMessageCarouselProps {
  qualifiedCount: number;
}

export function KiroMessageCarousel({ qualifiedCount }: KiroMessageCarouselProps) {
  const messages = KIRO_MESSAGES[Math.min(qualifiedCount, 3)] || KIRO_MESSAGES[0];
  const [messageIndex, setMessageIndex] = useState(() => {
    const stored = getStoredKiroMessageIndex();
    return stored % messages.length;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = (prev + 1) % messages.length;
        storeKiroMessageIndex(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Reset index when qualifiedCount changes
  useEffect(() => {
    setMessageIndex(0);
    storeKiroMessageIndex(0);
  }, [qualifiedCount]);

  const isComplete = qualifiedCount >= 3;

  return (
    <div className={cn(
      'rounded-2xl p-5 sm:p-6 border backdrop-blur-xl',
      isComplete
        ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border-emerald-500/30'
        : 'bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/10 border-purple-500/20'
    )}>
      <div className="flex items-start gap-4">
        {/* Kiro Avatar */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className={cn(
            'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg',
            isComplete
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20'
              : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/20'
          )}
        >
          <span className="text-2xl sm:text-3xl">{isComplete ? '🎉' : '🤖'}</span>
        </motion.div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-white">KIRO</span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isComplete
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'bg-purple-500/30 text-purple-300'
            )}>
              {isComplete ? 'Celebrando!' : 'Tu guia'}
            </span>
          </div>

          <div className="min-h-[3rem] sm:min-h-[2.5rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm sm:text-base text-white/80 leading-relaxed"
              >
                {messages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {messages.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setMessageIndex(i);
              storeKiroMessageIndex(i);
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i === messageIndex
                ? isComplete ? 'bg-emerald-400 scale-125' : 'bg-purple-400 scale-125'
                : 'bg-white/20 hover:bg-white/40'
            )}
          />
        ))}
      </div>
    </div>
  );
}
