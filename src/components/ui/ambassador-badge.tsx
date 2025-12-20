import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface AmbassadorBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glow' | 'minimal';
  className?: string;
}

export function AmbassadorBadge({ 
  size = 'md', 
  variant = 'default',
  className 
}: AmbassadorBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'minimal') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1 text-amber-500",
          className
        )}
        title="Embajador"
      >
        <Crown className={cn(iconSizes[size], "fill-amber-500")} />
      </div>
    );
  }

  if (variant === 'glow') {
    return (
      <div 
        className={cn(
          "inline-flex items-center font-semibold rounded-full",
          "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500",
          "text-amber-950 shadow-lg shadow-amber-500/30",
          "animate-pulse",
          sizeClasses[size],
          className
        )}
      >
        <Crown className={cn(iconSizes[size], "fill-amber-950")} />
        <span>Embajador</span>
      </div>
    );
  }

  // Default variant
  return (
    <div 
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        "bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20",
        "border-2 border-amber-500/50",
        "text-amber-500",
        "backdrop-blur-sm",
        "transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105",
        sizeClasses[size],
        className
      )}
    >
      <Crown className={cn(iconSizes[size], "fill-amber-500")} />
      <span>Embajador</span>
    </div>
  );
}
