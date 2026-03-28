import * as React from "react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { ActivityItem } from "@/hooks/useClientActivityFeed";
import { Clock, ChevronRight } from "lucide-react";

interface NovaActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  onActivityClick?: (activity: ActivityItem) => void;
  className?: string;
}

function formatActivityTime(date: Date): string {
  if (isToday(date)) {
    return `Hoy, ${format(date, "HH:mm", { locale: es })}`;
  }
  if (isYesterday(date)) {
    return `Ayer, ${format(date, "HH:mm", { locale: es })}`;
  }
  return format(date, "d MMM, HH:mm", { locale: es });
}

export function NovaActivityFeed({
  activities,
  maxItems = 10,
  onActivityClick,
  className,
}: NovaActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-8 px-4",
        "rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700",
        "bg-zinc-50 dark:bg-zinc-900/50",
        className
      )}>
        <Clock className="h-10 w-10 text-zinc-400 mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sin actividad reciente
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {displayActivities.map((activity, index) => {
        const Icon = activity.icon;

        return (
          <div
            key={activity.id}
            onClick={() => onActivityClick?.(activity)}
            className={cn(
              "group relative flex items-start gap-3 p-3 rounded-lg",
              "transition-colors duration-150",
              "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
              onActivityClick && "cursor-pointer"
            )}
          >
            {/* Timeline line */}
            {index < displayActivities.length - 1 && (
              <div className="absolute left-[22px] top-12 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700/50" />
            )}

            {/* Icon */}
            <div className={cn(
              "shrink-0 p-2 rounded-lg",
              "bg-zinc-100 dark:bg-zinc-800",
              "border border-zinc-200 dark:border-zinc-700",
              "group-hover:border-purple-500/50",
              "transition-colors duration-150"
            )}>
              <Icon className={cn("h-4 w-4", activity.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                {activity.description}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {formatActivityTime(activity.timestamp)}
              </p>
            </div>

            {/* Hover indicator */}
            {onActivityClick && (
              <ChevronRight className={cn(
                "h-4 w-4 text-zinc-400 shrink-0 mt-1",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity duration-150"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
