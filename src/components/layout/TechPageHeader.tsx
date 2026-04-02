import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechPageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
}

export function TechPageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  badge,
}: TechPageHeaderProps) {
  return (
    <div className="relative mb-8">
      {/* Background glow effects - only visible in dark mode */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/[0.06] rounded-full blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute -top-10 right-20 w-48 h-48 bg-primary/[0.04] rounded-full blur-[100px] pointer-events-none dark:block hidden" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn(
              "flex items-center justify-center",
              "w-14 h-14 rounded-sm",
              "bg-primary/10",
              "border border-primary/20",
              "shadow-sm",
              "transition-all duration-300 hover:shadow-md hover:scale-105"
            )}>
              <Icon className="h-7 w-7 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
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
      
      {/* Decorative gradient line */}
      <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}
