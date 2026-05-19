import { LogOut } from 'lucide-react';
import { KreoonLogo } from '@/components/ui/kreoon-logo';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface OnboardingStep {
  id: string;
  label: string;
  emoji: string;
}

interface OnboardingShellProps {
  children: ReactNode;
  currentStep: number; // 1-based
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
  const total = steps.length;
  const current = currentStep - 1; // 0-based para los pills

  return (
    <div className={cn('min-h-screen bg-background flex flex-col', className)}>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KreoonLogo heightClass="h-7" />
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </header>

      {/* Indicador de progreso */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-5 pb-2">

        {/* Pills WizardSteps */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-full transition-all duration-300',
                i < current  ? 'h-2 w-6 bg-green-500' :
                i === current ? 'h-2 w-8 bg-primary' :
                                'h-2 w-2 bg-muted-foreground/25'
              )}
            />
          ))}
        </div>

        {/* Paso actual con emoji */}
        <p className="text-center text-sm text-muted-foreground">
          <span className="mr-1">{steps[current]?.emoji}</span>
          <span className="font-medium text-foreground">{steps[current]?.label}</span>
          <span className="ml-2 text-xs">Paso {currentStep} de {total}</span>
        </p>
      </div>

      {/* Contenido */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 KREOON TECH LLC
        </p>
      </footer>
    </div>
  );
}

// ─── Definición de pasos ─────────────────────────────────────────

export const TALENT_STEPS: OnboardingStep[] = [
  { id: 'account_type',      label: '¿Quién eres?',       emoji: '👋' },
  { id: 'specializations',   label: 'Tus especialidades',  emoji: '⭐' },
  { id: 'profile',           label: 'Tus datos',           emoji: '📋' },
  { id: 'legal',             label: 'Términos legales',    emoji: '📄' },
];

export const CLIENT_STEPS: OnboardingStep[] = [
  { id: 'account_type', label: '¿Quién eres?',    emoji: '👋' },
  { id: 'profile',      label: 'Tus datos',        emoji: '📋' },
  { id: 'legal',        label: 'Términos legales', emoji: '📄' },
];

export default OnboardingShell;
