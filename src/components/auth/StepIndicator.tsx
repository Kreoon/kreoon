import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  label: string;
  description?: string;
}

export interface StepIndicatorProps {
  /** Lista de pasos con label y opcional descripción */
  steps: StepItem[];
  /** Índice del paso actual (0-based) */
  currentStep: number;
  /** Índices de pasos ya completados */
  completedSteps?: number[];
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * Indicador visual de progreso para wizards multi-paso.
 * Círculos conectados por líneas; paso actual con glow, completados con check.
 */
export function StepIndicator({
  steps,
  currentStep,
  completedSteps = [],
  className,
}: StepIndicatorProps) {
  const isCompleted = (index: number) =>
    completedSteps.includes(index) || index < currentStep;

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: solo "Paso X de Y" */}
      <div className="mb-2 text-center text-sm text-kreoon-text-muted lg:hidden">
        Paso {currentStep + 1} de {steps.length}
      </div>

      {/* Desktop: círculos + líneas + labels */}
      <div className="hidden items-start lg:flex lg:flex-row">
        {steps.map((step, index) => {
          const completed = isCompleted(index);
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep && !completed;
          const lineToNext = index < steps.length - 1;
          const segmentFilled = lineToNext && currentStep > index;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  <motion.div
                    layout
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors duration-200",
                      isCurrent && [
                        "border-kreoon-purple-500 bg-kreoon-purple-500/20 text-kreoon-purple-400",
                        "shadow-kreoon-glow-sm",
                      ],
                      completed &&
                        !isCurrent &&
                        "border-kreoon-purple-500 bg-kreoon-purple-500 text-kreoon-text-primary",
                      isFuture && "border-kreoon-border bg-transparent text-kreoon-text-muted",
                    )}
                  >
                    {completed && !isCurrent ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </motion.div>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "text-xs font-medium transition-colors duration-200",
                        isCurrent && "text-kreoon-purple-400",
                        completed && !isCurrent && "text-kreoon-text-primary",
                        isFuture && "text-kreoon-text-muted",
                      )}
                    >
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="mt-0.5 text-[10px] text-kreoon-text-muted line-clamp-2 max-w-[80px]">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {lineToNext && (
                <div className="relative mx-1 mt-4 flex h-0.5 min-w-[24px] flex-1 items-center lg:min-w-[32px]">
                  <div
                    className="absolute inset-0 rounded-full bg-kreoon-border"
                    aria-hidden
                  />
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full bg-kreoon-purple-500/60"
                    initial={false}
                    animate={{
                      width: segmentFilled ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    aria-hidden
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile: mini barra de puntos (opcional, solo círculos pequeños) */}
      <div className="flex items-center justify-center gap-1.5 lg:hidden">
        {steps.map((_, index) => {
          const completed = isCompleted(index);
          const isCurrent = index === currentStep;
          return (
            <motion.div
              key={index}
              layout
              transition={{ duration: 0.2 }}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-200",
                isCurrent && "w-6 bg-kreoon-purple-500",
                completed && !isCurrent && "bg-kreoon-purple-500/60",
                index > currentStep && !completed && "bg-kreoon-border",
              )}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}

StepIndicator.displayName = "StepIndicator";
