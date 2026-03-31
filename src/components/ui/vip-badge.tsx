import { cn } from '@/lib/utils';
import { Star, Sparkles } from 'lucide-react';

interface VipBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glow' | 'minimal';
  className?: string;
}

export function VipBadge({ 
  size = 'md', 
  variant = 'default',
  className 
}: VipBadgeProps) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'minimal') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1 text-purple-500",
          className
        )}
        title="Cliente VIP"
      >
        <Star className={cn(iconSizes[size], "fill-purple-500")} />
      </div>
    );
  }

  if (variant === 'glow') {
    return (
      <div 
        className={cn(
          "inline-flex items-center font-semibold rounded-full",
          "bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600",
          "text-white shadow-lg shadow-purple-500/30",
          "animate-pulse",
          sizeClasses[size],
          className
        )}
      >
        <Sparkles className={cn(iconSizes[size], "fill-white")} />
        <span>Cliente VIP</span>
      </div>
    );
  }

  // Default variant
  return (
    <div 
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        "bg-gradient-to-r from-purple-500/20 via-violet-400/20 to-purple-500/20",
        "border-2 border-purple-500/50",
        "text-purple-500",
        "",
        "transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105",
        sizeClasses[size],
        className
      )}
    >
      <Star className={cn(iconSizes[size], "fill-purple-500")} />
      <span>Cliente VIP</span>
    </div>
  );
}