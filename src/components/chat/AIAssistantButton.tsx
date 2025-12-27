import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChatPanel } from './AIChatPanel';
import { useAuth } from '@/hooks/useAuth';

interface AIAssistantButtonProps {
  className?: string;
}

export function AIAssistantButton({ className }: AIAssistantButtonProps) {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const organizationId = profile?.current_organization_id;
  const [isHovered, setIsHovered] = useState(false);

  if (!organizationId) return null;

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
          "shadow-lg shadow-primary/25",
          "border-2 border-primary/30",
          "transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
          isOpen && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
          className
        )}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
          animate={{
            scale: isHovered ? 1.3 : 1,
            opacity: isHovered ? 0.6 : 0.4,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Inner gradient */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

        {/* Icon */}
        <motion.div
          animate={{ rotate: isHovered ? 15 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <Sparkles className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
          ) : (
            <Bot className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
          )}
        </motion.div>

        {/* Floating particles */}
        {isHovered && !isOpen && (
          <>
            <motion.div
              className="absolute w-1.5 h-1.5 rounded-full bg-primary-foreground/60"
              animate={{
                y: [-10, -20],
                x: [0, 10],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-1 h-1 rounded-full bg-primary-foreground/60"
              animate={{
                y: [-8, -18],
                x: [0, -8],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
            />
          </>
        )}
      </motion.button>

      <AIChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        organizationId={organizationId}
      />
    </>
  );
}
