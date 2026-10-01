import type { LucideIcon } from "lucide-react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatTone } from "./StatTile";

export interface PipelineStage {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: StatTone;
  onClick?: () => void;
}

const ICON_TONE: Record<StatTone, string> = {
  neutral: "text-[hsl(var(--text-secondary))]",
  danger: "text-destructive",
  warning: "text-foreground",
  success: "text-success",
  info: "text-info",
};

/**
 * «Cómo van los videos»: siete estados como mini-tarjetas. En móvil es una fila con scroll horizontal
 * con ajuste por snap; cada estado es un botón, por lo que la fila se recorre con el teclado.
 */
export function PipelineStrip({ stages }: { stages: PipelineStage[] }) {
  return (
    <section
      aria-labelledby="pipeline-titulo"
      className="rounded-card border border-border bg-card p-5 shadow-soft"
    >
      <h2 id="pipeline-titulo" className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <Activity className="h-4 w-4 text-[hsl(var(--text-secondary))]" aria-hidden="true" />
        Cómo van los videos
      </h2>
      <ul
        className={cn(
          "-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2",
          "xl:mx-0 xl:grid xl:grid-cols-7 xl:overflow-visible xl:px-0 xl:pb-0",
        )}
      >
        {stages.map(({ key, label, value, icon: Icon, tone = "neutral", onClick }) => (
          <li key={key} className="min-w-[104px] shrink-0 snap-start xl:min-w-0">
            <button
              type="button"
              onClick={onClick}
              className={cn(
                "flex w-full flex-col items-start gap-2 rounded-control bg-[hsl(var(--surface-hover))] p-3 text-left",
                "transition-colors hover:bg-[hsl(var(--surface-selected))] motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              )}
            >
              <Icon className={cn("h-4 w-4", ICON_TONE[tone])} aria-hidden="true" />
              <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">{value}</span>
              <span className="text-xs font-medium leading-tight text-[hsl(var(--text-secondary))]">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
