/**
 * LiveReactions - Sistema de reacciones flotantes para streams en vivo
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { REACTION_EMOJIS, type ReactionType } from '@/types/live-streaming.types';

interface LiveReactionsProps {
  onSendReaction: (type: ReactionType) => Promise<void>;
  recentReactions: { id: string; type: ReactionType; x: number }[];
  className?: string;
}

export function LiveReactions({
  onSendReaction,
  recentReactions,
  className,
}: LiveReactionsProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Floating reactions */}
      <FloatingReactions reactions={recentReactions} />

      {/* Reaction buttons */}
      <ReactionBar onSendReaction={onSendReaction} />
    </div>
  );
}

/**
 * FloatingReactions - Reacciones que flotan hacia arriba
 */
interface FloatingReactionsProps {
  reactions: { id: string; type: ReactionType; x: number }[];
}

function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="absolute bottom-16 left-0 right-0 h-64 pointer-events-none overflow-hidden">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute bottom-0 animate-float-up text-2xl"
          style={{
            left: `${reaction.x}%`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        >
          {REACTION_EMOJIS[reaction.type]}
        </div>
      ))}
    </div>
  );
}

/**
 * ReactionBar - Barra de botones de reacción
 */
interface ReactionBarProps {
  onSendReaction: (type: ReactionType) => Promise<void>;
  compact?: boolean;
}

export function ReactionBar({ onSendReaction, compact = false }: ReactionBarProps) {
  const [cooldowns, setCooldowns] = useState<Record<ReactionType, boolean>>({
    heart: false,
    fire: false,
    clap: false,
    wow: false,
    laugh: false,
  });

  const handleReaction = async (type: ReactionType) => {
    if (cooldowns[type]) return;

    // Set cooldown
    setCooldowns((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCooldowns((prev) => ({ ...prev, [type]: false }));
    }, 500); // 500ms cooldown

    await onSendReaction(type);
  };

  const reactions = Object.entries(REACTION_EMOJIS) as [ReactionType, string][];

  return (
    <div className={cn('flex gap-1', compact ? 'gap-0.5' : 'gap-2')}>
      {reactions.map(([type, emoji]) => (
        <Button
          key={type}
          variant="ghost"
          size={compact ? 'sm' : 'default'}
          className={cn(
            'text-xl transition-transform hover:scale-110 active:scale-95',
            compact ? 'h-8 w-8 p-0' : 'h-10 w-10 p-0',
            cooldowns[type] && 'opacity-50'
          )}
          onClick={() => handleReaction(type)}
          disabled={cooldowns[type]}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}

/**
 * LikeButton - Botón principal de "Me gusta" con contador
 */
interface LikeButtonProps {
  count: number;
  onLike: () => void;
  className?: string;
}

export function LikeButton({ count, onLike, className }: LikeButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    onLike();
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors',
        className
      )}
    >
      <span
        className={cn(
          'text-xl transition-transform',
          isAnimating && 'scale-125'
        )}
      >
        ❤️
      </span>
      <span className="text-white font-medium">{formatCount(count)}</span>
    </button>
  );
}

// CSS para la animación de flotar hacia arriba (agregar a global CSS o Tailwind config)
// @keyframes float-up {
//   0% { opacity: 1; transform: translateY(0) scale(1); }
//   100% { opacity: 0; transform: translateY(-200px) scale(1.5); }
// }
// .animate-float-up { animation: float-up ease-out forwards; }
