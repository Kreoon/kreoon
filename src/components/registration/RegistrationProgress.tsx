import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { RegistrationStep, RegistrationIntent } from './types';

interface RegistrationProgressProps {
  steps: RegistrationStep[];
  currentIndex: number;
  intent: RegistrationIntent | null;
}

const STEP_LABELS: Record<RegistrationStep, string> = {
  intent: 'Tipo',
  credentials: 'Cuenta',
  'talent-profile': 'Perfil',
  'brand-profile': 'Marca',
  'org-details': 'Organización',
  'join-org': 'Unirse',
  terms: 'Confirmar',
  success: 'Listo',
};

const INTENT_COLORS: Record<string, string> = {
  talent: 'bg-purple-500',
  brand: 'bg-emerald-500',
  organization: 'bg-amber-500',
  join: 'bg-blue-500',
};

export function RegistrationProgress({ steps, currentIndex, intent }: RegistrationProgressProps) {
  const accentColor = INTENT_COLORS[intent || 'talent'];

  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step} className="flex items-center">
            {i > 0 && (
              <div className={cn(
                'h-px w-6 mx-1 transition-colors',
                isCompleted ? accentColor : 'bg-white/10',
              )} />
            )}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all',
                  isCompleted
                    ? cn(accentColor, 'text-white')
                    : isCurrent
                    ? 'border-2 border-purple-500 text-white bg-transparent'
                    : 'border border-white/10 text-gray-500 bg-transparent',
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn(
                'text-[9px] mt-1 whitespace-nowrap',
                isCurrent ? 'text-white' : 'text-gray-500',
              )}>
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
