import * as React from "react";
import { KreoonCard, KreoonGlassCard, KreoonButton } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export type StatusCardVariant = "default" | "highlighted" | "glass";

export interface StatusCardAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export interface StatusCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  variant?: StatusCardVariant;
  action?: StatusCardAction;
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Card reutilizable para páginas de estado (pending, welcome, etc.).
 * Contenedor Kreoon según variant; header opcional; footer con acciones.
 */
export function StatusCard({
  children,
  title,
  icon,
  variant = "default",
  action,
  secondaryAction,
  className,
}: StatusCardProps) {
  const hasHeader = Boolean(title || icon);
  const hasFooter = Boolean(action || secondaryAction);

  const content = (
    <>
      {hasHeader && (
        <div className="flex flex-row items-center gap-3 px-5 pt-5">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center text-kreoon-purple-400 [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </span>
          )}
          {title && (
            <h3 className="font-semibold text-kreoon-text-primary">{title}</h3>
          )}
        </div>
      )}

      <div
        className={cn(
          "px-5 py-4",
          hasHeader && "pt-3",
          hasFooter && "pb-3",
        )}
      >
        {children}
      </div>

      {hasFooter && (
        <footer className="border-t border-kreoon-border/50 px-5 py-4">
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3",
              secondaryAction ? "sm:justify-between" : "sm:justify-end",
            )}
          >
            {secondaryAction && (
              <KreoonButton
                type="button"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </KreoonButton>
            )}
            {action && (
              <KreoonButton
                type="button"
                variant={action.variant ?? "primary"}
                size="md"
                className="w-full sm:w-auto"
                onClick={action.onClick}
              >
                {action.label}
              </KreoonButton>
            )}
          </div>
        </footer>
      )}
    </>
  );

  if (variant === "glass") {
    return (
      <KreoonGlassCard intensity="medium" className={cn("overflow-hidden", className)}>
        {content}
      </KreoonGlassCard>
    );
  }

  if (variant === "highlighted") {
    return (
      <KreoonCard
        glow
        className={cn(
          "overflow-hidden border-kreoon-purple-400/40 shadow-kreoon-glow-sm",
          className,
        )}
      >
        {content}
      </KreoonCard>
    );
  }

  return (
    <KreoonCard className={cn("overflow-hidden", className)}>
      {content}
    </KreoonCard>
  );
}

StatusCard.displayName = "StatusCard";
