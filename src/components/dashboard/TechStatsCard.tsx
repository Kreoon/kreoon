import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TechStatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  color?: "primary" | "success" | "warning" | "info" | "destructive" | "violet";
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
  goalValue?: number;
  goalLabel?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

// Animated number counter
const AnimatedNumber = ({ 
  value, 
  prefix = "", 
  suffix = "",
  animated = true 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  animated?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  
  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }
    
    const duration = 800;
    const steps = 25;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, animated]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

export function TechStatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "primary",
  onClick,
  subtitle,
  prefix = "",
  suffix = "",
  goalValue,
  goalLabel,
  size = "md",
  animated = true,
}: TechStatsCardProps) {
  const colorConfig = {
    primary: {
      gradient: "from-primary/25 via-primary/10 to-transparent",
      border: "border-primary/30 hover:border-primary/50",
      glow: "shadow-primary/20 hover:shadow-primary/40",
      icon: "text-primary bg-primary/15",
      bar: "bg-primary",
      accent: "text-primary",
    },
    success: {
      gradient: "from-success/25 via-success/10 to-transparent",
      border: "border-success/30 hover:border-success/50",
      glow: "shadow-success/20 hover:shadow-success/40",
      icon: "text-success bg-success/15",
      bar: "bg-success",
      accent: "text-success",
    },
    warning: {
      gradient: "from-warning/25 via-warning/10 to-transparent",
      border: "border-warning/30 hover:border-warning/50",
      glow: "shadow-warning/20 hover:shadow-warning/40",
      icon: "text-warning bg-warning/15",
      bar: "bg-warning",
      accent: "text-warning",
    },
    info: {
      gradient: "from-info/25 via-info/10 to-transparent",
      border: "border-info/30 hover:border-info/50",
      glow: "shadow-info/20 hover:shadow-info/40",
      icon: "text-info bg-info/15",
      bar: "bg-info",
      accent: "text-info",
    },
    destructive: {
      gradient: "from-destructive/25 via-destructive/10 to-transparent",
      border: "border-destructive/30 hover:border-destructive/50",
      glow: "shadow-destructive/20 hover:shadow-destructive/40",
      icon: "text-destructive bg-destructive/15",
      bar: "bg-destructive",
      accent: "text-destructive",
    },
    violet: {
      gradient: "from-violet-500/25 via-violet-500/10 to-transparent",
      border: "border-violet-500/30 hover:border-violet-500/50",
      glow: "shadow-violet-500/20 hover:shadow-violet-500/40",
      icon: "text-violet-400 bg-violet-500/15",
      bar: "bg-violet-500",
      accent: "text-violet-400",
    },
  };

  const sizeConfig = {
    sm: {
      padding: "p-4",
      iconSize: "h-4 w-4",
      iconWrapper: "p-2",
      titleSize: "text-xs",
      valueSize: "text-2xl",
      orbSize: "h-20 w-20 -right-6 -top-6",
    },
    md: {
      padding: "p-5",
      iconSize: "h-5 w-5",
      iconWrapper: "p-2.5",
      titleSize: "text-xs",
      valueSize: "text-3xl",
      orbSize: "h-28 w-28 -right-8 -top-8",
    },
    lg: {
      padding: "p-6",
      iconSize: "h-6 w-6",
      iconWrapper: "p-3",
      titleSize: "text-sm",
      valueSize: "text-4xl",
      orbSize: "h-36 w-36 -right-12 -top-12",
    },
  };

  const config = colorConfig[color];
  const sizeConf = sizeConfig[size];
  const progressPercent = goalValue && goalValue > 0 ? Math.min((value / goalValue) * 100, 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-card/80 backdrop-blur-xl",
        "border-2 transition-all duration-500",
        "shadow-[0_0_30px_-8px]",
        config.border,
        config.glow,
        sizeConf.padding,
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
    >
      {/* Background Gradient Orb */}
      <div
        className={cn(
          "absolute rounded-full opacity-60 blur-3xl",
          "bg-gradient-to-br",
          config.gradient,
          sizeConf.orbSize,
          "transition-all duration-700 group-hover:scale-150 group-hover:opacity-80"
        )}
      />

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Icon */}
      <div
        className={cn(
          "absolute right-4 top-4 rounded-xl backdrop-blur-sm",
          "transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
          config.icon,
          sizeConf.iconWrapper
        )}
      >
        <Icon className={sizeConf.iconSize} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p className={cn(
          "font-semibold text-muted-foreground uppercase tracking-wider mb-2",
          sizeConf.titleSize
        )}>
          {title}
        </p>
        <p className={cn(
          "font-bold tracking-tight text-foreground mb-1",
          sizeConf.valueSize
        )}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} animated={animated} />
        </p>
        
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}

        {/* Goal Progress */}
        {goalValue && goalValue > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{goalLabel || 'Meta'}</span>
              <span className={cn(
                "font-medium",
                progressPercent >= 100 ? "text-success" : progressPercent >= 75 ? "text-warning" : "text-muted-foreground"
              )}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", config.bar)}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Trend */}
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-3">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              trend > 0 
                ? "bg-success/10 text-success" 
                : trend < 0 
                ? "bg-destructive/10 text-destructive" 
                : "bg-muted text-muted-foreground"
            )}>
              {trend > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : trend < 0 ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : null}
              {trend > 0 && "+"}{trend}%
            </div>
            <span className="text-xs text-muted-foreground">vs mes anterior</span>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-0.5",
        config.bar,
        "opacity-50 transition-opacity duration-500 group-hover:opacity-100"
      )} />
    </div>
  );
}

export { AnimatedNumber };
