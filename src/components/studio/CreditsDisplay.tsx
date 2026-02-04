import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditsDisplayProps {
  creditos: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: 'w-4 h-4',
    text: 'text-sm',
    suffix: 'text-xs',
    gap: 'gap-1',
    padding: 'px-2 py-1',
  },
  md: {
    icon: 'w-5 h-5',
    text: 'text-base',
    suffix: 'text-sm',
    gap: 'gap-1.5',
    padding: 'px-3 py-1.5',
  },
  lg: {
    icon: 'w-6 h-6',
    text: 'text-xl',
    suffix: 'text-base',
    gap: 'gap-2',
    padding: 'px-4 py-2',
  },
};

export function CreditsDisplay({
  creditos,
  showLabel = true,
  size = 'md',
  animated = true,
  className,
}: CreditsDisplayProps) {
  const config = sizeConfig[size];
  const previousCreditos = useRef(creditos);
  const [displayValue, setDisplayValue] = useState(creditos);
  const motionValue = useMotionValue(creditos);

  useEffect(() => {
    if (animated && previousCreditos.current !== creditos) {
      const controls = animate(motionValue, creditos, {
        duration: 1,
        ease: 'easeOut',
        onUpdate: (latest) => {
          setDisplayValue(Math.round(latest));
        },
      });
      previousCreditos.current = creditos;
      return controls.stop;
    } else {
      setDisplayValue(creditos);
    }
  }, [creditos, animated, motionValue]);

  const formattedValue = displayValue.toLocaleString();

  return (
    <motion.div
      className={cn(
        'inline-flex items-center rounded-lg',
        config.gap,
        config.padding,
        'bg-gradient-to-r from-purple-500/10 to-purple-600/5',
        'border border-purple-500/20',
        'backdrop-blur-sm',
        className
      )}
      initial={animated ? { scale: 0.9, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        boxShadow: '0 2px 10px rgba(139, 92, 246, 0.15)',
      }}
    >
      {/* Credit Icon */}
      <motion.div
        className={cn(
          'relative flex items-center justify-center',
          config.icon
        )}
        whileHover={{ rotate: 15 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        <Ticket
          className={cn(config.icon, 'text-purple-400')}
          style={{
            filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))',
          }}
        />
      </motion.div>

      {/* Value Container */}
      <div className="flex items-baseline gap-1">
        <motion.span
          className={cn(
            'font-bold text-white tabular-nums',
            config.text
          )}
          key={displayValue}
          initial={animated ? { y: -10, opacity: 0 } : undefined}
          animate={animated ? { y: 0, opacity: 1 } : undefined}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {formattedValue}
        </motion.span>
        <span
          className={cn(
            'font-medium text-purple-400/80',
            config.suffix
          )}
        >
          CR
        </span>
      </div>

      {/* Label for large size */}
      {showLabel && size === 'lg' && (
        <span className="text-sm text-zinc-500 ml-1">
          Créditos
        </span>
      )}
    </motion.div>
  );
}

// Compact version for headers
export function CreditsDisplayCompact({
  creditos,
  className,
}: {
  creditos: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-purple-500/10 border border-purple-500/20',
        className
      )}
    >
      <Ticket className="w-3 h-3 text-purple-400" />
      <span className="text-xs font-semibold text-white tabular-nums">
        {creditos.toLocaleString()}
      </span>
    </div>
  );
}
