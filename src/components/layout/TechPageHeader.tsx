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
      {/* Background glow effects */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-[hsl(270,100%,60%,0.06)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-10 right-20 w-48 h-48 bg-[hsl(280,100%,55%,0.04)] rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn(
              "flex items-center justify-center",
              "w-14 h-14 rounded-2xl",
              "bg-gradient-to-br from-[hsl(270,100%,60%,0.15)] to-[hsl(270,100%,60%,0.05)]",
              "border border-[hsl(270,100%,60%,0.25)]",
              "shadow-[0_0_30px_-8px_hsl(270,100%,60%,0.4)]",
              "transition-all duration-500 hover:shadow-[0_0_40px_-8px_hsl(270,100%,60%,0.5)] hover:scale-105"
            )}>
              <Icon className="h-7 w-7 text-[hsl(270,100%,70%)]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[hsl(270,30%,60%)] mt-1">{subtitle}</p>
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
      <div className="mt-6 h-px bg-gradient-to-r from-transparent via-[hsl(270,100%,60%,0.25)] to-transparent" />
    </div>
  );
}
