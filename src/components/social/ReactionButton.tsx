import { useState, useRef } from 'react';
import { Heart, Flame, HandMetal, Sparkles, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type ReactionType = 'love' | 'fire' | 'clap' | 'wow' | 'sad';

interface Reaction {
  type: ReactionType;
  icon: typeof Heart;
  label: string;
  color: string;
  bgColor: string;
}

const reactions: Reaction[] = [
  { type: 'love', icon: Heart, label: 'Me encanta', color: 'text-red-500', bgColor: 'bg-red-500/20' },
  { type: 'fire', icon: Flame, label: 'Fuego', color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  { type: 'clap', icon: HandMetal, label: 'Aplausos', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
  { type: 'wow', icon: Sparkles, label: 'Wow', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  { type: 'sad', icon: Frown, label: 'Triste', color: 'text-slate-400', bgColor: 'bg-slate-400/20' },
];

interface ReactionButtonProps {
  currentReaction?: ReactionType | null;
  onReact: (type: ReactionType | null) => void;
  reactionCounts?: Record<ReactionType, number>;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  className?: string;
}

export function ReactionButton({
  currentReaction,
  onReact,
  reactionCounts = {} as Record<ReactionType, number>,
  size = 'md',
  showCounts = false,
  className,
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const currentReactionData = currentReaction 
    ? reactions.find(r => r.type === currentReaction) 
    : null;

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPicker(false);
  };

  const handleQuickReact = () => {
    if (currentReaction) {
      onReact(null);
    } else {
      setAnimateHeart(true);
      setTimeout(() => setAnimateHeart(false), 400);
      onReact('love');
    }
  };

  const handleSelectReaction = (type: ReactionType) => {
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 400);
    onReact(type === currentReaction ? null : type);
    setShowPicker(false);
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <div 
      ref={containerRef}
      className={cn("relative inline-flex items-center gap-1", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main button */}
      <button
        onClick={handleQuickReact}
        className={cn(
          "flex items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95",
          currentReactionData?.color || "text-social-muted-foreground hover:text-red-400"
        )}
      >
        {currentReactionData ? (
          <currentReactionData.icon 
            className={cn(
              sizes[size],
              "fill-current",
              animateHeart && "animate-bounce-heart"
            )} 
          />
        ) : (
          <Heart 
            className={cn(
              sizes[size],
              animateHeart && "animate-bounce-heart fill-red-500 text-red-500"
            )} 
          />
        )}
        {showCounts && totalReactions > 0 && (
          <span className="text-sm font-medium">{totalReactions}</span>
        )}
      </button>

      {/* Reaction picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="glass-social-strong rounded-full px-2 py-1.5 flex items-center gap-1 shadow-lg">
              {reactions.map((reaction, index) => (
                <motion.button
                  key={reaction.type}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 500, damping: 15 }}
                  onClick={() => handleSelectReaction(reaction.type)}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-200",
                    "hover:scale-125 hover:bg-white/10",
                    currentReaction === reaction.type && reaction.bgColor
                  )}
                  title={reaction.label}
                >
                  <reaction.icon 
                    className={cn(
                      "h-6 w-6 transition-transform",
                      reaction.color,
                      currentReaction === reaction.type && "fill-current"
                    )} 
                  />
                </motion.button>
              ))}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-social-card rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Floating hearts animation for double-tap
export function FloatingHearts({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            scale: 0,
            x: '50%',
            y: '50%',
          }}
          animate={{ 
            opacity: 0, 
            scale: 1.5,
            x: `${50 + (Math.random() - 0.5) * 60}%`,
            y: `${30 + Math.random() * 20}%`,
          }}
          transition={{ 
            duration: 0.8 + Math.random() * 0.4,
            delay: i * 0.08,
            ease: 'easeOut'
          }}
          className="absolute"
        >
          <Heart className="h-8 w-8 text-red-500 fill-red-500" />
        </motion.div>
      ))}
    </div>
  );
}
