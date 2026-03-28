import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

const FAQItem = memo(function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index
}: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="group"
    >
      <button
        onClick={onToggle}
        className={cn(
          'w-full p-4 rounded-sm text-left transition-all duration-300',
          'border',
          isOpen
            ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30'
            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
        )}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: isOpen ? 1.1 : 1 }}
            className={cn(
              'w-8 h-8 rounded-sm flex items-center justify-center shrink-0',
              'transition-colors duration-300',
              isOpen
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60'
            )}
          >
            <span className="text-sm font-bold">{index + 1}</span>
          </motion.div>

          <span className={cn(
            'flex-1 font-medium text-sm transition-colors',
            isOpen ? 'text-white' : 'text-white/70'
          )}>
            {question}
          </span>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
              'transition-colors duration-300',
              isOpen
                ? 'bg-purple-500/20'
                : 'bg-white/5 group-hover:bg-white/10'
            )}
          >
            <ChevronDown className={cn(
              'w-4 h-4 transition-colors',
              isOpen ? 'text-purple-400' : 'text-white/40'
            )} />
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 pl-11">
                <p className="text-sm text-white/60 leading-relaxed">
                  {answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
});

export const UnlockFAQ = memo(function UnlockFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-sm p-5 sm:p-6',
        'bg-white/[0.02] border border-white/10'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
          <MessageCircleQuestion className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">¿Tienes dudas?</h3>
          <p className="text-xs text-white/50">Respuestas a las preguntas más comunes</p>
        </div>
        <Sparkles className="w-4 h-4 text-amber-400/60 ml-auto hidden sm:block" />
      </div>

      {/* FAQ items */}
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, index) => (
          <FAQItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            index={index}
          />
        ))}
      </div>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-white/30 mt-4 pt-4 border-t border-white/5"
      >
        ¿Más preguntas? Escríbenos a soporte@kreoon.com
      </motion.p>
    </motion.div>
  );
});
