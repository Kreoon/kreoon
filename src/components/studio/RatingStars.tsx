import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeConfig = {
  sm: {
    star: 14,
    gap: 'gap-0.5',
    text: 'text-xs',
    countText: 'text-xs',
  },
  md: {
    star: 18,
    gap: 'gap-1',
    text: 'text-sm',
    countText: 'text-xs',
  },
  lg: {
    star: 24,
    gap: 'gap-1.5',
    text: 'text-base',
    countText: 'text-sm',
  },
};

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = true,
  showCount = false,
  count,
  interactive = false,
  onChange,
  className,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const config = sizeConfig[size];
  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (interactive) {
      setHoverRating(index + 1);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null);
    }
  };

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      {/* Stars */}
      <div
        className={cn('flex items-center', config.gap)}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxRating }).map((_, index) => {
          const fillPercentage = Math.min(
            Math.max((displayRating - index) * 100, 0),
            100
          );
          const isFilled = fillPercentage > 0;
          const isPartial = fillPercentage > 0 && fillPercentage < 100;

          return (
            <motion.button
              key={index}
              type="button"
              className={cn(
                'relative',
                interactive && 'cursor-pointer'
              )}
              onClick={() => handleClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              whileHover={interactive ? { scale: 1.15 } : undefined}
              whileTap={interactive ? { scale: 0.95 } : undefined}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.05,
                type: 'spring',
                stiffness: 300,
              }}
              disabled={!interactive}
              style={{ width: config.star, height: config.star }}
            >
              {/* Background star (empty) */}
              <Star
                size={config.star}
                className="absolute inset-0 text-zinc-600"
                strokeWidth={1.5}
              />

              {/* Filled star with clip for partial */}
              {isFilled && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: isPartial
                      ? `inset(0 ${100 - fillPercentage}% 0 0)`
                      : undefined,
                  }}
                >
                  <Star
                    size={config.star}
                    className="text-amber-400"
                    fill="#fbbf24"
                    strokeWidth={1.5}
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))',
                    }}
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Rating value */}
      {showValue && (
        <motion.span
          className={cn('font-medium text-white ml-1', config.text)}
          key={rating}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {rating.toFixed(1)}
        </motion.span>
      )}

      {/* Review count */}
      {showCount && count !== undefined && (
        <span className={cn('text-zinc-500', config.countText)}>
          ({count.toLocaleString()} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}

// Compact inline version
export function RatingStarsInline({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Star
        size={12}
        className="text-amber-400"
        fill="#fbbf24"
      />
      <span className="text-xs font-medium text-white">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}
