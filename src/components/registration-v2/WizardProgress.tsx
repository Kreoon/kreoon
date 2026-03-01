import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStep, getStepLabel } from './types';

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: WizardStep;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const currentIndex = steps.indexOf(currentStep);

  // No mostrar progreso si solo hay 2 pasos (type-selector + form)
  if (steps.length <= 2) return null;

  // No mostrar el paso success en el indicador
  const visibleSteps = steps.filter(s => s !== 'success');

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {visibleSteps.map((step, index) => {
        const stepIndex = steps.indexOf(step);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step === currentStep;
        const isPending = stepIndex > currentIndex;

        return (
          <div key={step} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  "text-sm font-medium",
                  isCompleted && "bg-primary text-white",
                  isCurrent && "bg-primary/20 border-2 border-primary text-primary",
                  isPending && "bg-white/5 border border-white/20 text-white/40"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1.5 transition-colors",
                  isCompleted && "text-primary",
                  isCurrent && "text-white",
                  isPending && "text-white/40"
                )}
              >
                {getStepLabel(step)}
              </span>
            </div>

            {/* Connector line */}
            {index < visibleSteps.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-2 transition-colors",
                  stepIndex < currentIndex ? "bg-primary" : "bg-white/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
