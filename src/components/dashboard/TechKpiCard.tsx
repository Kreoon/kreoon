import { useState, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface TechKpiCardProps {
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
  chartType?: "radial" | "bar" | "sparkline" | "none";
  chartData?: number[];
  color?: "violet" | "cyan" | "emerald" | "amber" | "rose";
  size?: "sm" | "md" | "lg";
}

// Animated counter
const AnimatedCounter = ({ 
  value, 
  prefix = "", 
  suffix = "" 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
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
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Radial progress chart (sin brillo)
const RadialChart = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-20 w-20" role="img" aria-label={`${Math.round(percentage)}% de la meta`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold tabular-nums text-foreground">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

// Bar chart mini
const BarChart = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data) || 1;
  return (
    <div className="flex h-12 items-end gap-1" aria-hidden="true">
      {data.map((value, i) => (
        <div
          key={i}
          className="w-2 rounded-t-sm"
          style={{ backgroundColor: color, height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  );
};

// Sparkline chart
const SparklineChart = ({ data, color }: { data: number[]; color: string }) => {
  const gradId = useId();
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, i) => `${(i / (data.length - 1)) * 100},${100 - ((value - min) / range) * 100}`)
    .join(" ");

  return (
    <div className="h-10 w-24" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

// Series de gráficos con contraste AA (--chart-n) en vez de colores nova con brillo
const colorMap = {
  violet: "hsl(var(--chart-1))",
  cyan: "hsl(var(--chart-5))",
  emerald: "hsl(var(--chart-3))",
  amber: "hsl(var(--chart-4))",
  rose: "hsl(var(--chart-2))",
};

export function TechKpiCard({
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
  chartType = "none",
  chartData = [30, 45, 35, 60, 48, 72, 55],
  color = "violet",
  size = "md",
}: TechKpiCardProps) {
  const colorValue = colorMap[color];

  const sizeConfig = {
    sm: { padding: "p-4", valueSize: "text-[22px]" },
    md: { padding: "p-5", valueSize: "text-[28px]" },
    lg: { padding: "p-6", valueSize: "text-[34px]" },
  };
  const sizeConf = sizeConfig[size];
  const pct = goalValue && goalValue > 0 ? Math.round(Math.min((value / goalValue) * 100, 100)) : 0;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "rounded-card border border-border bg-card shadow-soft",
        sizeConf.padding,
        onClick &&
          "cursor-pointer transition-[box-shadow,background-color] duration-150 hover:bg-[hsl(var(--surface-hover))] hover:shadow-raised motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent"
            >
              <Icon className="h-[18px] w-[18px]" style={{ color: colorValue }} />
            </span>
            <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">{title}</p>
          </div>

          <p className={cn("font-semibold leading-none tracking-tight tabular-nums text-foreground", sizeConf.valueSize)}>
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </p>

          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}

          {trend !== undefined && trend !== 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                  trend > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {trend > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                {trend > 0 && "+"}
                {trend}%
              </div>
              <span className="text-xs text-muted-foreground">vs anterior</span>
            </div>
          )}
        </div>

        {chartType !== "none" && (
          <div className="ml-4">
            {chartType === "radial" && goalValue && <RadialChart value={value} max={goalValue} color={colorValue} />}
            {chartType === "bar" && <BarChart data={chartData} color={colorValue} />}
            {chartType === "sparkline" && <SparklineChart data={chartData} color={colorValue} />}
          </div>
        )}
      </div>

      {goalValue && goalValue > 0 && chartType !== "radial" && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{goalLabel || "Meta"}</span>
            <span className="font-medium tabular-nums text-foreground">{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={`${goalLabel || "Meta"}: ${pct}%`}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
