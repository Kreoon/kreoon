import * as React from "react";
import { cn } from "@/lib/utils";

export type KreoonSectionTitleAlign = "left" | "center";

export interface KreoonSectionTitleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Título principal */
  title: string;
  /** Subtítulo opcional, texto secondary */
  subtitle?: string;
  /** Alineación del bloque */
  align?: KreoonSectionTitleAlign;
  /** Muestra barra/acento púrpura decorativo bajo el título */
  accent?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Título de sección del Design System Kreoon.
 * Título grande en blanco, subtitle en secondary; opcional acento púrpura.
 */
const KreoonSectionTitle = React.forwardRef<
  HTMLDivElement,
  KreoonSectionTitleProps
>(
  (
    { title, subtitle, align = "left", accent = true, className, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "space-y-2",
          align === "center" && "text-center",
          align === "left" && "text-left",
          className,
        )}
        {...props}
      >
        <div className={cn("space-y-1.5", align === "center" && "flex flex-col items-center")}>
          <h2 className="text-2xl font-bold tracking-tight text-kreoon-text-primary md:text-3xl">
            {title}
          </h2>
          {accent ? (
            <div
              className={cn(
                "h-1 w-12 rounded-full bg-kreoon-gradient",
                align === "center" && "mx-auto",
              )}
              aria-hidden
            />
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-sm text-kreoon-text-secondary md:text-base max-w-2xl">
            {subtitle}
          </p>
        ) : null}
      </div>
    );
  },
);

KreoonSectionTitle.displayName = "KreoonSectionTitle";

export { KreoonSectionTitle };
