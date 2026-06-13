import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BigCardProps extends HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
  glow?: boolean;
  liftOnHover?: boolean;
  gradient?: 'purple' | 'cyan' | 'amber' | 'rose' | 'emerald' | 'none';
  emoji?: string;
  emojiSize?: 'lg' | 'xl' | '2xl';
  children: ReactNode;
}

const GRADIENT_MAP = {
  purple: 'bg-gradient-to-br from-[#7c3aed]/15 via-[#7c3aed]/5 to-transparent',
  cyan: 'bg-gradient-to-br from-[#06b6d4]/12 via-[#7c3aed]/5 to-transparent',
  amber: 'bg-gradient-to-br from-[#f59e0b]/10 via-[#7c3aed]/5 to-transparent',
  rose: 'bg-gradient-to-br from-[#db2777]/12 via-[#7c3aed]/5 to-transparent',
  emerald: 'bg-gradient-to-br from-[#10b981]/10 via-[#7c3aed]/5 to-transparent',
  none: '',
} as const;

const EMOJI_SIZE = {
  lg: 'text-3xl',
  xl: 'text-4xl md:text-5xl',
  '2xl': 'text-5xl md:text-6xl',
} as const;

/**
 * BigCard — wrapper unificado del sistema Duolingo-style para Academia.
 * Bordes ultra-redondos, hover lift, glow opcional, gradient contextual.
 */
export const BigCard = forwardRef<HTMLDivElement, BigCardProps>(function BigCard(
  {
    accentColor,
    glow = false,
    liftOnHover = true,
    gradient = 'none',
    className,
    children,
    style,
    ...rest
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-3xl border-2 border-white/10 bg-kreoon-bg-card overflow-hidden',
        'transition-all duration-300',
        liftOnHover &&
          'motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-2xl motion-safe:hover:border-white/20',
        gradient !== 'none' && GRADIENT_MAP[gradient],
        className
      )}
      style={{
        ...(accentColor && glow
          ? { boxShadow: `0 8px 32px -8px ${accentColor}30` }
          : null),
        ...style,
      }}
      {...rest}
    >
      {glow && accentColor && (
        <div
          className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
});

interface BigCardEmojiProps {
  emoji: string;
  size?: keyof typeof EMOJI_SIZE;
  bounce?: boolean;
  accentColor?: string;
  className?: string;
}

export function BigCardEmoji({
  emoji,
  size = 'xl',
  bounce = false,
  accentColor,
  className,
}: BigCardEmojiProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-2xl flex-shrink-0',
        'h-16 w-16 md:h-20 md:w-20',
        bounce && 'motion-safe:animate-bounce-soft',
        className
      )}
      style={
        accentColor
          ? { backgroundColor: `${accentColor}1f`, border: `2px solid ${accentColor}40` }
          : undefined
      }
      aria-hidden="true"
    >
      <span className={EMOJI_SIZE[size]}>{emoji}</span>
    </div>
  );
}
