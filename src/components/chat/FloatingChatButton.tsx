import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

export function FloatingChatButton({ onClick, isOpen, unreadCount = 0 }: FloatingChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex items-center justify-center",
        "w-14 h-14 rounded-full",
        "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600",
        "shadow-lg shadow-emerald-500/30",
        "border-2 border-emerald-400/30",
        "transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-background",
        isOpen && "bg-gradient-to-br from-rose-500 via-rose-600 to-red-600 shadow-rose-500/30 border-rose-400/30"
      )}
    >
      {/* Glow effect */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full blur-xl",
          isOpen ? "bg-rose-500/30" : "bg-emerald-500/30"
        )}
        animate={{
          scale: isHovered ? 1.4 : 1,
          opacity: isHovered ? 0.6 : 0.4,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Inner gradient */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

      {/* Icon */}
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="h-6 w-6 text-white drop-shadow-sm" />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageCircle className="h-6 w-6 text-white drop-shadow-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      <AnimatePresence>
        {unreadCount > 0 && !isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-lg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse animation when has unread */}
      {unreadCount > 0 && !isOpen && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-emerald-400"
          animate={{
            scale: [1, 1.3],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}
    </motion.button>
  );
}
