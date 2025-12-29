import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
  onClick?: () => void;
}

export function StatsCard({ title, value, icon, trend, trendLabel, className, onClick }: StatsCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 md:p-6",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 md:space-y-2">
          <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl md:text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive && <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-success" />}
              {isNegative && <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-destructive" />}
              <span className={cn(
                "text-xs md:text-sm font-medium",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}>
                {isPositive && "+"}{trend}%
              </span>
              {trendLabel && (
                <span className="text-xs md:text-sm text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/15">
          {icon}
        </div>
      </div>
      
      {/* Decorative gradient */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 transition-all duration-300 group-hover:scale-150 group-hover:bg-primary/8" />
    </div>
  );
}
