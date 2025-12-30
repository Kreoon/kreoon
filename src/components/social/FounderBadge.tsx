import { cn } from '@/lib/utils';
import { Crown, Sparkles, Shield, Star } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FounderBadgeProps {
  badgeType?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const badgeConfig = {
  ceo: {
    icon: Crown,
    label: 'CEO de Kreoon',
    description: 'Creador y CEO de Kreoon',
    gradient: 'from-amber-400 via-yellow-500 to-orange-500',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
    ring: 'ring-amber-400/50',
  },
  cofounder: {
    icon: Star,
    label: 'Co-Fundador',
    description: 'Co-fundador de la plataforma',
    gradient: 'from-purple-400 via-violet-500 to-indigo-500',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
    ring: 'ring-violet-400/50',
  },
  team: {
    icon: Shield,
    label: 'Equipo Core',
    description: 'Miembro del equipo fundador',
    gradient: 'from-blue-400 via-cyan-500 to-teal-500',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
    ring: 'ring-cyan-400/50',
  },
};

const sizeConfig = {
  sm: {
    badge: 'h-5 w-5',
    icon: 'h-3 w-3',
    text: 'text-xs',
    padding: 'px-2 py-0.5',
  },
  md: {
    badge: 'h-6 w-6',
    icon: 'h-3.5 w-3.5',
    text: 'text-sm',
    padding: 'px-2.5 py-1',
  },
  lg: {
    badge: 'h-8 w-8',
    icon: 'h-4 w-4',
    text: 'text-base',
    padding: 'px-3 py-1.5',
  },
};

export function FounderBadge({ 
  badgeType, 
  size = 'md', 
  showLabel = false,
  className 
}: FounderBadgeProps) {
  if (!badgeType || !badgeConfig[badgeType as keyof typeof badgeConfig]) {
    return null;
  }

  const config = badgeConfig[badgeType as keyof typeof badgeConfig];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  const badge = (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full",
        "bg-gradient-to-r text-white font-semibold",
        "animate-pulse-slow",
        config.gradient,
        config.glow,
        showLabel ? sizes.padding : '',
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-full",
        !showLabel && sizes.badge,
        !showLabel && "p-1"
      )}>
        <Icon className={cn(sizes.icon, "drop-shadow-sm")} />
      </div>
      {showLabel && (
        <span className={cn(sizes.text, "pr-1 whitespace-nowrap")}>
          {config.label}
        </span>
      )}
      <Sparkles className={cn(
        "absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-wiggle",
        !showLabel && "hidden"
      )} />
    </div>
  );

  if (showLabel) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="glass-card border-white/20 bg-background/95"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-amber-400" />
            <div>
              <p className="font-semibold">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Special avatar ring for founders
export function FounderAvatarRing({ 
  badgeType, 
  children,
  className 
}: { 
  badgeType?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  if (!badgeType || !badgeConfig[badgeType as keyof typeof badgeConfig]) {
    return <>{children}</>;
  }

  const config = badgeConfig[badgeType as keyof typeof badgeConfig];

  return (
    <div className={cn("relative", className)}>
      {/* Animated gradient ring */}
      <div className={cn(
        "absolute -inset-1 rounded-full bg-gradient-to-r animate-spin-slow",
        config.gradient,
        "blur-sm opacity-75"
      )} />
      <div className="relative">
        {children}
      </div>
      {/* Badge overlay */}
      <div className="absolute -bottom-1 -right-1 z-10">
        <FounderBadge badgeType={badgeType} size="sm" />
      </div>
    </div>
  );
}