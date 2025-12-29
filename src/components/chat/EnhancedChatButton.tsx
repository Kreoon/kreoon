import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EnhancedChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

export function EnhancedChatButton({ onClick, isOpen, unreadCount = 0 }: EnhancedChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "fixed bottom-20 right-6 z-50 md:bottom-16",
              "flex items-center justify-center",
              "w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary via-primary to-primary/80",
              "shadow-lg shadow-primary/30",
              "border-2 border-primary/30",
              "transition-all duration-300",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
              isOpen && "bg-gradient-to-br from-destructive via-destructive to-destructive/80 shadow-destructive/30 border-destructive/30"
            )}
          >
            {/* Glow effect */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full blur-xl",
                isOpen ? "bg-destructive/30" : "bg-primary/30"
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
                  <X className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageCircle className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
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
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground shadow-lg"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pulse animation when has unread */}
            {unreadCount > 0 && !isOpen && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary"
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
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={12}>
          <p>{isOpen ? 'Cerrar chat' : 'Chat de la organización'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
