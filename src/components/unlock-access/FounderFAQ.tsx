import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FAQ_ITEMS } from '@/lib/unlock-access/constants';

export function FounderFAQ() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 sm:p-6 bg-white/[0.02] border border-white/10"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-purple-400" />
        </div>
        <h3 className="font-semibold text-white">Preguntas frecuentes</h3>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border-none bg-white/[0.02] rounded-xl px-4 data-[state=open]:bg-white/[0.04]"
          >
            <AccordionTrigger className="text-sm text-white/80 hover:text-white hover:no-underline py-4">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-white/60 pb-4 leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
