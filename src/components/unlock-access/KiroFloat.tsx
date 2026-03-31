import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { KIRO_MESSAGES } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

interface KiroFloatProps {
  keysCollected: number;
}

export const KiroFloat = memo(function KiroFloat({
  keysCollected
}: KiroFloatProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const progressKey = Math.min(keysCollected, 3) as 0 | 1 | 2 | 3;
  const messages = KIRO_MESSAGES[progressKey] || KIRO_MESSAGES[0];

  const nextMessage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % messages.length);
  }, [messages.length]);

  const prevMessage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length);
  }, [messages.length]);

  // Auto-rotate messages
  useEffect(() => {
    if (isMinimized) return;
    const interval = setInterval(nextMessage, 6000);
    return () => clearInterval(interval);
  }, [nextMessage, isMinimized]);

  // Reset index when keys change
  useEffect(() => {
    setCurrentIndex(0);
  }, [keysCollected]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-4 right-4 z-40 max-w-xs"
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsMinimized(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'w-14 h-14 rounded-full',
              'bg-gradient-to-br from-purple-500 to-pink-500',
              'flex items-center justify-center',
              'shadow-lg shadow-purple-500/30',
              'border-2 border-white/20'
            )}
          >
            <span className="text-2xl">🤖</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'rounded-sm overflow-hidden',
              'bg-gradient-to-br from-slate-800/95 via-purple-900/30 to-slate-900/95',
              'border border-purple-500/30',
              'shadow-xl shadow-purple-500/20',
              ''
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-xl"
                >
                  🤖
                </motion.div>
                <span className="text-sm font-medium text-white">KIRO</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-sm hover:bg-white/10 transition-colors"
                >
                  <span className="text-white/50 text-xs">−</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-sm hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {/* Message */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/90 text-sm leading-relaxed"
                >
                  {messages[currentIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            {messages.length > 1 && (
              <div className="flex items-center justify-between px-4 pb-3">
                <button
                  onClick={prevMessage}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white/40" />
                </button>

                <div className="flex gap-1">
                  {messages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-all',
                        i === currentIndex
                          ? 'bg-purple-400 w-3'
                          : 'bg-white/20 hover:bg-white/30'
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={nextMessage}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
