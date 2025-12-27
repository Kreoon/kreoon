import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AmbassadorLevel } from '@/types/database';

interface AmbassadorBadgeProps {
  level?: AmbassadorLevel;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glow' | 'minimal';
  showTooltip?: boolean;
  className?: string;
}

const LEVEL_LABELS: Record<AmbassadorLevel, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro'
};

const LEVEL_COLORS: Record<AmbassadorLevel, { bg: string; text: string; border: string; fill: string }> = {
  bronze: {
    bg: 'from-amber-600/20 via-amber-700/20 to-amber-600/20',
    text: 'text-amber-600',
    border: 'border-amber-600/50',
    fill: 'fill-amber-600'
  },
  silver: {
    bg: 'from-slate-400/20 via-slate-300/20 to-slate-400/20',
    text: 'text-slate-400',
    border: 'border-slate-400/50',
    fill: 'fill-slate-400'
  },
  gold: {
    bg: 'from-yellow-500/20 via-yellow-400/20 to-yellow-500/20',
    text: 'text-yellow-500',
    border: 'border-yellow-500/50',
    fill: 'fill-yellow-500'
  }
};

export function AmbassadorBadge({ 
  level = 'bronze',
  size = 'md', 
  variant = 'default',
  showTooltip = true,
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

  const colors = LEVEL_COLORS[level];
  const levelLabel = LEVEL_LABELS[level];

  const renderBadge = () => {
    if (variant === 'minimal') {
      return (
        <div 
          className={cn(
            "inline-flex items-center gap-1",
            colors.text,
            className
          )}
          title={`Embajador ${levelLabel}`}
        >
          <Crown className={cn(iconSizes[size], colors.fill)} />
        </div>
      );
    }

    if (variant === 'glow') {
      return (
        <div 
          className={cn(
            "inline-flex items-center font-semibold rounded-full",
            "bg-gradient-to-r",
            colors.bg,
            colors.text,
            "shadow-lg shadow-current/30",
            "animate-pulse",
            sizeClasses[size],
            className
          )}
        >
          <Crown className={cn(iconSizes[size], colors.fill)} />
          <span>🏅 {levelLabel}</span>
        </div>
      );
    }

    // Default variant
    return (
      <div 
        className={cn(
          "inline-flex items-center font-semibold rounded-full",
          "bg-gradient-to-r",
          colors.bg,
          "border-2",
          colors.border,
          colors.text,
          "backdrop-blur-sm",
          "transition-all duration-300 hover:shadow-lg hover:shadow-current/20 hover:scale-105",
          sizeClasses[size],
          className
        )}
      >
        <Crown className={cn(iconSizes[size], colors.fill)} />
        <span>Embajador {levelLabel}</span>
      </div>
    );
  };

  if (!showTooltip) return renderBadge();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {renderBadge()}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Embajador {levelLabel}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Este usuario puede crear contenido interno para la organización y recibe recompensas en puntos UP.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Indicator dot for compact displays
interface AmbassadorBadgeIndicatorProps {
  level?: AmbassadorLevel;
  className?: string;
}

export function AmbassadorBadgeIndicator({ level = 'bronze', className = '' }: AmbassadorBadgeIndicatorProps) {
  const bgColors: Record<AmbassadorLevel, string> = {
    bronze: 'bg-amber-600',
    silver: 'bg-slate-400',
    gold: 'bg-yellow-500'
  };

  return (
    <div 
      className={cn("w-3 h-3 rounded-full", bgColors[level], className)}
      title={`Embajador ${LEVEL_LABELS[level]}`}
    />
  );
}
