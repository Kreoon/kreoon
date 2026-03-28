import * as React from "react";
import { Eye, AlertTriangle, CheckCircle2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NovaAlertBannerProps {
  type: "review" | "warning" | "success";
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  count?: number;
  className?: string;
}

const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  review: {
    icon: Eye,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
  },
};

export function NovaAlertBanner({
  type,
  title,
  description,
  actionLabel,
  onAction,
  count,
  className,
}: NovaAlertBannerProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "p-2 rounded-lg",
            config.bg,
            "border",
            config.border
          )}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                {title}
              </p>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  config.bg,
                  config.color
                )}>
                  {count}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="shrink-0 rounded-lg"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
