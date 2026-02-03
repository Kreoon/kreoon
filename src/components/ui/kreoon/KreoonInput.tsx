import * as React from "react";
import { cn } from "@/lib/utils";

export interface KreoonInputProps extends React.ComponentPropsWithoutRef<"input"> {
  /** Etiqueta mostrada encima del input */
  label?: string;
  /** Mensaje de error mostrado debajo (activa estado error visual) */
  error?: string;
  /** Icono opcional a la izquierda del input */
  icon?: React.ReactNode;
  /** Clases CSS adicionales para el contenedor */
  className?: string;
}

/**
 * Input base del Design System Kreoon.
 * Fondo oscuro, borde sutil, focus con borde púrpura y glow.
 * Soporta label, error y icono a la izquierda.
 */
const KreoonInput = React.forwardRef<HTMLInputElement, KreoonInputProps>(
  (
    { label, error, icon, className, id: idProp, disabled, ...inputProps },
    ref,
  ) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const hasError = Boolean(error);

    return (
      <div className={cn("space-y-1.5", className)}>
        {label ? (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-kreoon-text-secondary"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted pointer-events-none"
              aria-hidden
            >
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
            className={cn(
              "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
              "placeholder:text-kreoon-text-muted/70",
              "transition-all duration-200 ease-out",
              icon && "pl-10",
              "border-kreoon-border",
              "hover:border-kreoon-purple-400/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50 focus-visible:border-kreoon-purple-400",
              "focus-visible:shadow-kreoon-glow-sm",
              hasError &&
                "border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            {...inputProps}
          />
        </div>
        {hasError ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

KreoonInput.displayName = "KreoonInput";

export { KreoonInput };
