import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechPageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
  gradient?: boolean;
}

export function TechPageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  badge,
  gradient = true,
}: TechPageHeaderProps) {
  return (
    <div className="relative mb-6">
      {/* Background glow effect */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-10 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn(
              "flex items-center justify-center",
              "w-14 h-14 rounded-2xl",
              "bg-gradient-to-br from-primary/20 to-primary/5",
              "border border-primary/30",
              "shadow-lg shadow-primary/20",
              "transition-all duration-500 hover:shadow-primary/40 hover:scale-105"
            )}>
              <Icon className="h-7 w-7 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className={cn(
                "text-2xl md:text-3xl font-bold tracking-tight",
                gradient && "bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text"
              )}>
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {action && (
          <div className="flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
      
      {/* Decorative line */}
      <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
