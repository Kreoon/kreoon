import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GAME_FAQ_ITEMS } from '@/lib/unlock-access/game-constants';
import { cn } from '@/lib/utils';

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem = memo(function FAQItem({
  question,
  answer,
  index,
  isOpen,
  onToggle
}: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'rounded-xl overflow-hidden',
        'border transition-colors',
        isOpen
          ? 'bg-white/[0.05] border-purple-500/30'
          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <span className="text-xl flex-shrink-0 mt-0.5">
          {isOpen ? '📖' : '📕'}
        </span>
        <span className={cn(
          'flex-1 font-medium transition-colors',
          isOpen ? 'text-purple-200' : 'text-white/80'
        )}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className={cn(
            'w-5 h-5 transition-colors',
            isOpen ? 'text-purple-400' : 'text-white/40'
          )} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pl-12">
              <p className="text-white/60 text-sm leading-relaxed">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export const GameFAQ = memo(function GameFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative"
    >
      {/* Decorative header */}
      <div className="text-center mb-6">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block"
        >
          <span className="text-3xl">📜</span>
        </motion.div>
        <h3 className="text-xl font-bold text-white mt-2">
          El Grimorio del Conocimiento
        </h3>
        <p className="text-sm text-white/50 mt-1">
          Respuestas a las preguntas mas frecuentes del reino
        </p>
      </div>

      {/* FAQ container */}
      <div className={cn(
        'rounded-2xl p-4 sm:p-6',
        'bg-gradient-to-b from-slate-800/50 to-slate-900/50',
        'border border-white/10'
      )}>
        <div className="space-y-3">
          {GAME_FAQ_ITEMS.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Footer decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 pt-4 border-t border-white/10 text-center"
        >
          <p className="text-xs text-white/30">
            ¿Mas preguntas? Contacta a los Sabios del Reino en{' '}
            <a
              href="mailto:soporte@kreoon.com"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              soporte@kreoon.com
            </a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
});
