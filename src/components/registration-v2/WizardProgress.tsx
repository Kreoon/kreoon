import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStep, getStepLabel } from './types';

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: WizardStep;
}

const STEP_EMOJIS: Record<WizardStep, string> = {
  'invite-code': '🔑',
  'type-selector': '👤',
  'form': '📝',
  'success': '🎉',
};

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const currentIndex = steps.indexOf(currentStep);

  if (currentStep === 'success') return null;

  // Excluir el paso success del indicador
  const visibleSteps = steps.filter(s => s !== 'success');

  if (visibleSteps.length <= 1) return null;

  const currentVisibleIndex = visibleSteps.indexOf(currentStep);

  return (
    <div className="flex flex-col items-center gap-3 mb-8 px-4">
      {/* Paso X de Y */}
      <p className="text-xs font-semibold text-white/40 tracking-wide uppercase">
        Paso {currentVisibleIndex + 1} de {visibleSteps.length}
      </p>

      <div className="flex items-center justify-center gap-1">
      {visibleSteps.map((step, index) => {
        const stepIndex = steps.indexOf(step);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step === currentStep;
        const isPending = stepIndex > currentIndex;

        return (
          <div key={step} className="flex items-center">
            {/* Step bubble */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                  "text-base font-bold shadow-md",
                  isCompleted && "bg-primary text-white scale-95",
                  isCurrent && "bg-primary/20 border-2 border-primary text-primary scale-110 shadow-primary/30",
                  isPending && "bg-white/5 border border-white/15 text-white/30"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-lg leading-none">{STEP_EMOJIS[step]}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors whitespace-nowrap",
                  isCompleted && "text-primary/80",
                  isCurrent && "text-white",
                  isPending && "text-white/30"
                )}
              >
                {getStepLabel(step)}
              </span>
            </div>

            {/* Connector */}
            {index < visibleSteps.length - 1 && (
              <div
                className={cn(
                  "w-10 h-1 mx-2 mb-5 rounded-full transition-all duration-500",
                  stepIndex < currentIndex ? "bg-primary" : "bg-white/10"
                )}
              />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
