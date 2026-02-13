import { X, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface KIROAssistantProps {
  message: string;
  onDismiss: () => void;
}

export function KIROAssistant({ message, onDismiss }: KIROAssistantProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500
                        flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-purple-400 mb-1">KIRO sugiere</p>
          <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
