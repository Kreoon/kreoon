import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tono semántico del chip de icono. El color vive SOLO en el chip: la tarjeta, el contorno y la cifra
 * se mantienen neutros (tinta sobre blanco) para no competir entre sí.
 */
export type StatTone = "neutral" | "danger" | "warning" | "success" | "info";

const CHIP: Record<StatTone, string> = {
  neutral: "bg-accent text-accent-foreground",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/20 text-foreground",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

export type StatSize = "hero" | "default" | "compact";

const VALUE: Record<StatSize, string> = {
  hero: "text-[34px]",
  default: "text-[28px]",
  compact: "text-[22px]",
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  size?: StatSize;
  onClick?: () => void;
  /** Contenido extra bajo la cifra (p. ej. barra de progreso de meta). */
  children?: ReactNode;
  className?: string;
}

/**
 * Métrica con jerarquía clara: etiqueta pequeña + cifra 28–34 px con números tabulares.
 * Si recibe `onClick` se renderiza como <button> (teclado y foco visibles); si no, como <div>.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  size = "default",
  onClick,
  children,
  className,
}: StatTileProps) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            aria-hidden="true"
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-control", CHIP[tone])}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <span className="min-w-0 text-sm font-medium leading-snug text-[hsl(var(--text-secondary))]">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "mt-4 font-semibold leading-none tracking-tight text-foreground tabular-nums [overflow-wrap:anywhere]",
          VALUE[size],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-sm leading-snug text-muted-foreground">{hint}</div>}
      {children}
    </>
  );

  const base = cn(
    "block w-full min-w-0 rounded-card border border-border bg-card p-5 text-left shadow-soft",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "transition-[box-shadow,background-color] duration-150 hover:bg-[hsl(var(--surface-hover))] hover:shadow-raised",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "motion-reduce:transition-none",
        )}
      >
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

/** Barra de progreso hacia una meta, sin brillo ni animación infinita. */
export function GoalBar({ value, max, label = "Meta" }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
        <span>
          {label}: <span className="tabular-nums">{max.toLocaleString()}</span>
        </span>
        <span className="font-medium tabular-nums text-foreground">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${label}: ${pct}%`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
