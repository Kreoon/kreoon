import { Trophy, Calendar, Flame } from "lucide-react";
import { useReputationSeasons } from "@/hooks/useUnifiedReputation";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ActiveSeasonBanner({ className }: { className?: string }) {
  const { activeSeason, loading } = useReputationSeasons();

  if (loading || !activeSeason) return null;

  const daysRemaining = differenceInDays(new Date(activeSeason.end_date), new Date());
  const isEndingSoon = daysRemaining <= 7 && daysRemaining > 0;
  const hasEnded = daysRemaining < 0;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all",
      isEndingSoon
        ? "bg-warning/10 border-warning/30 text-warning"
        : hasEnded
        ? "bg-muted/50 border-border text-muted-foreground"
        : "bg-primary/10 border-primary/30 text-primary",
      className
    )}>
      <div className={cn(
        "p-1.5 rounded-lg",
        isEndingSoon ? "bg-warning/20" : hasEnded ? "bg-muted" : "bg-primary/20"
      )}>
        {isEndingSoon ? (
          <Flame className="h-4 w-4" />
        ) : (
          <Trophy className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{activeSeason.name}</span>
          {isEndingSoon && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground font-bold animate-pulse">
              ¡{daysRemaining} días!
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(activeSeason.start_date), "d MMM", { locale: es })} -{" "}
            {format(new Date(activeSeason.end_date), "d MMM yyyy", { locale: es })}
          </span>
        </div>
      </div>
    </div>
  );
}
