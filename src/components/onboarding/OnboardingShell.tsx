/**
 * OnboardingShell - Layout compartido para todos los pasos del onboarding
 *
 * Unifica:
 * - Header con logo y botón de logout
 * - Indicador de pasos
 * - Estructura de contenido
 */

import { LogOut, CheckCircle2 } from 'lucide-react';
import { KreoonLogo } from '@/components/ui/kreoon-logo';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface OnboardingStep {
  id: string;
  label: string;
  shortLabel?: string;
}

interface OnboardingShellProps {
  children: ReactNode;
  currentStep: number;
  steps: OnboardingStep[];
  onLogout?: () => void;
  className?: string;
}

export function OnboardingShell({
  children,
  currentStep,
  steps,
  onLogout,
  className,
}: OnboardingShellProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KreoonLogo heightClass="h-8" />
            <span className="text-lg font-semibold text-foreground tracking-tight">
              KREOON
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;
            const isPending = stepNumber > currentStep;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-[0.125rem] flex items-center justify-center text-sm font-mono font-medium transition-colors",
                      isCompleted && "bg-green-500 text-white",
                      isActive && "bg-primary text-primary-foreground",
                      isPending && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm hidden sm:inline transition-colors",
                      isCompleted && "text-muted-foreground",
                      isActive && "font-medium text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.shortLabel || step.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-8 sm:w-12 h-px mx-2 sm:mx-4 transition-colors",
                      stepNumber < currentStep ? "bg-green-500" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          © 2026 KREOON TECH LLC. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

// Configuraciones de pasos predefinidas
export const TALENT_STEPS: OnboardingStep[] = [
  { id: 'account_type', label: 'Tipo de cuenta', shortLabel: 'Cuenta' },
  { id: 'specializations', label: 'Especialidades', shortLabel: 'Roles' },
  { id: 'profile', label: 'Datos personales', shortLabel: 'Datos' },
  { id: 'legal', label: 'Términos legales', shortLabel: 'Términos' },
];

export const CLIENT_STEPS: OnboardingStep[] = [
  { id: 'account_type', label: 'Tipo de cuenta', shortLabel: 'Cuenta' },
  { id: 'profile', label: 'Datos personales', shortLabel: 'Datos' },
  { id: 'legal', label: 'Términos legales', shortLabel: 'Términos' },
];

export default OnboardingShell;
