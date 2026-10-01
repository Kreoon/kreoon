import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * Tarjetas de dashboard sobre tokens semánticos (bg-card, text-foreground, border-border, shadow-soft):
 * se ven bien en claro y en oscuro sin depender de --nova-*. Sin orbes, brillos ni animaciones infinitas.
 * El API se mantiene porque lo usan los dashboards de creador, editor y estratega.
 */

interface DashboardKpiCardProps {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Color del icono (chip). Es el único color de la tarjeta. */
  iconColor?: string;
  onClick?: () => void;
  subtitle?: ReactNode;
  trend?: number;
  children?: ReactNode;
  className?: string;
  /** @deprecated El contorno ya no se colorea; se conserva para no romper llamadas existentes. */
  borderColor?: string;
}

function activateOnKey(onClick?: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
}

export function DashboardKpiCard({
  title,
  value,
  icon: Icon,
  iconColor,
  onClick,
  subtitle,
  trend,
  children,
  className,
}: DashboardKpiCardProps) {
  return (
    <div
      onClick={onClick}
      onKeyDown={activateOnKey(onClick)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "rounded-card border border-border bg-card p-5 shadow-soft",
        onClick &&
          "cursor-pointer transition-[box-shadow,background-color] duration-150 hover:bg-[hsl(var(--surface-hover))] hover:shadow-raised motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent text-accent-foreground"
        >
          <Icon className="h-[18px] w-[18px]" style={iconColor ? { color: iconColor } : undefined} />
        </span>
        <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">{title}</span>
      </div>

      <div className="mt-4 text-[28px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </div>

      {subtitle && <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>}

      {trend !== undefined && trend !== 0 && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            trend > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {trend > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
          {trend > 0 && "+"}
          {trend}%
        </div>
      )}

      {children}
    </div>
  );
}

// Barra de progreso hacia una meta (sin brillo ni destello animado)
export function TechProgress({
  value,
  max = 100,
  label,
  showPercent = true,
}: {
  value: number;
  max?: number;
  /** @deprecated El color ya no se parametriza: usa el primario. */
  color?: string;
  label?: string;
  showPercent?: boolean;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {label || "Meta"}: <span className="tabular-nums">{max.toLocaleString()}</span>
        </span>
        {showPercent && <span className="font-medium tabular-nums text-foreground">{Math.round(percent)}%</span>}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={`${label || "Meta"}: ${Math.round(percent)}%`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// Mini-tarjeta de estado del pipeline
export function PipelineItem({
  icon: Icon,
  value,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  /** Color del icono (único acento). */
  color?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full flex-col items-center gap-1 rounded-control bg-[hsl(var(--surface-hover))] p-3 text-center",
        onClick &&
          "transition-colors hover:bg-[hsl(var(--surface-selected))] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Icon className="h-4 w-4 text-[hsl(var(--text-secondary))]" style={color ? { color } : undefined} aria-hidden="true" />
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-[hsl(var(--text-secondary))]">{label}</span>
    </Tag>
  );
}

// Encabezado de sección
export function TechSectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon className="h-4 w-4 text-[hsl(var(--text-secondary))]" aria-hidden="true" />
        {title}
      </h3>
      {action}
    </div>
  );
}
