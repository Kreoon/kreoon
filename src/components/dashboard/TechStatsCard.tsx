import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface TechStatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
  goalValue?: number;
  goalLabel?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  variant?: "default" | "glow" | "glass" | "neon";
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
    
    const duration = 1000;
    const steps = 30;
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
  onClick,
  subtitle,
  prefix = "",
  suffix = "",
  goalValue,
  goalLabel,
  size = "md",
  animated = true,
  variant = "default",
}: TechStatsCardProps) {
  const sizeConfig = {
    sm: {
      padding: "p-4",
      iconSize: "h-4 w-4",
      iconWrapper: "p-2 rounded-lg",
      titleSize: "text-[10px]",
      valueSize: "text-xl",
      orbSize: "h-24 w-24 -right-8 -top-8",
    },
    md: {
      padding: "p-5",
      iconSize: "h-5 w-5",
      iconWrapper: "p-2.5 rounded-xl",
      titleSize: "text-xs",
      valueSize: "text-2xl md:text-3xl",
      orbSize: "h-32 w-32 -right-10 -top-10",
    },
    lg: {
      padding: "p-6",
      iconSize: "h-6 w-6",
      iconWrapper: "p-3 rounded-xl",
      titleSize: "text-sm",
      valueSize: "text-3xl md:text-4xl",
      orbSize: "h-40 w-40 -right-12 -top-12",
    },
  };

  const variantConfig = {
    default: cn(
      "bg-gradient-to-br from-[hsl(250,20%,6%)] via-[hsl(250,20%,5%)] to-[hsl(250,20%,4%)]",
      "border border-[hsl(270,100%,60%,0.15)]",
      "shadow-[0_0_40px_-10px_hsl(270,100%,60%,0.2)]",
      "hover:border-[hsl(270,100%,60%,0.3)]",
      "hover:shadow-[0_0_60px_-10px_hsl(270,100%,60%,0.35)]"
    ),
    glow: cn(
      "bg-gradient-to-br from-[hsl(250,20%,7%)] to-[hsl(250,20%,4%)]",
      "border border-[hsl(270,100%,60%,0.25)]",
      "shadow-[0_0_50px_-8px_hsl(270,100%,60%,0.3)]",
      "hover:border-[hsl(270,100%,60%,0.4)]",
      "hover:shadow-[0_0_80px_-8px_hsl(270,100%,60%,0.45)]"
    ),
    glass: cn(
      "bg-[hsl(250,20%,5%,0.8)] backdrop-blur-2xl",
      "border border-[hsl(0,0%,100%,0.05)]",
      "shadow-[0_8px_32px_hsl(0,0%,0%,0.4)]",
      "hover:border-[hsl(270,100%,60%,0.2)]",
      "hover:shadow-[0_8px_40px_hsl(270,100%,60%,0.15)]"
    ),
    neon: cn(
      "bg-gradient-to-br from-[hsl(270,100%,60%,0.08)] via-[hsl(250,20%,5%)] to-[hsl(250,20%,4%)]",
      "border-2 border-[hsl(270,100%,60%,0.3)]",
      "shadow-[0_0_30px_-5px_hsl(270,100%,60%,0.4),inset_0_1px_0_hsl(270,100%,60%,0.1)]",
      "hover:border-[hsl(270,100%,60%,0.5)]",
      "hover:shadow-[0_0_50px_-5px_hsl(270,100%,60%,0.5),inset_0_1px_0_hsl(270,100%,60%,0.15)]"
    ),
  };

  const sizeConf = sizeConfig[size];
  const progressPercent = goalValue && goalValue > 0 ? Math.min((value / goalValue) * 100, 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "transition-all duration-500 ease-out",
        variantConfig[variant],
        sizeConf.padding,
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
    >
      {/* Animated gradient orb */}
      <div
        className={cn(
          "absolute rounded-full blur-3xl",
          "bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-transparent",
          "transition-all duration-700 group-hover:scale-150 group-hover:opacity-80",
          "opacity-50",
          sizeConf.orbSize
        )}
      />

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(270,100%,60%,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(270,100%,60%,0.3) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top highlight line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[hsl(270,100%,60%,0.3)] to-transparent" />

      {/* Icon */}
      <div
        className={cn(
          "absolute right-4 top-4 backdrop-blur-sm",
          "bg-[hsl(270,100%,60%,0.1)] border border-[hsl(270,100%,60%,0.2)]",
          "transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
          "group-hover:bg-[hsl(270,100%,60%,0.15)] group-hover:border-[hsl(270,100%,60%,0.3)]",
          sizeConf.iconWrapper
        )}
      >
        <Icon className={cn(sizeConf.iconSize, "text-[hsl(270,100%,70%)]")} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p className={cn(
          "font-semibold text-[hsl(270,60%,70%)] uppercase tracking-[0.15em] mb-2",
          sizeConf.titleSize
        )}>
          {title}
        </p>
        <p className={cn(
          "font-bold tracking-tight text-white mb-1",
          sizeConf.valueSize
        )}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} animated={animated} />
        </p>
        
        {subtitle && (
          <p className="text-sm text-[hsl(270,30%,60%)]">{subtitle}</p>
        )}

        {/* Goal Progress */}
        {goalValue && goalValue > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[hsl(270,30%,55%)]">{goalLabel || 'Meta'}</span>
              <span className={cn(
                "font-medium",
                progressPercent >= 100 
                  ? "text-[hsl(270,100%,70%)]" 
                  : "text-[hsl(270,40%,60%)]"
              )}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-1.5 bg-[hsl(250,20%,10%)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[hsl(270,100%,50%)] to-[hsl(280,100%,60%)] transition-all duration-1000 shadow-[0_0_10px_hsl(270,100%,60%,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Trend */}
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
              "border backdrop-blur-sm",
              trend > 0 
                ? "bg-[hsl(270,100%,60%,0.1)] border-[hsl(270,100%,60%,0.2)] text-[hsl(270,100%,70%)]" 
                : "bg-[hsl(350,80%,50%,0.1)] border-[hsl(350,80%,50%,0.2)] text-[hsl(350,80%,60%)]"
            )}>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend > 0 && "+"}{trend}%
            </div>
            <span className="text-xs text-[hsl(250,20%,40%)]">vs mes anterior</span>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-px",
        "bg-gradient-to-r from-transparent via-[hsl(270,100%,60%,0.4)] to-transparent",
        "opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      )} />
    </div>
  );
}

export { AnimatedNumber };
