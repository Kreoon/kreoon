import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegalCheckbox {
  id: string;
  label: string;
  linkText: string;
  href: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  isImportant?: boolean;
}

interface LegalCheckboxesProps {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptDataTreatment: boolean;
  acceptAge18Plus: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
  onDataTreatmentChange: (checked: boolean) => void;
  onAge18PlusChange: (checked: boolean) => void;
  errors?: {
    acceptTerms?: string;
    acceptPrivacy?: string;
    acceptDataTreatment?: string;
    acceptAge18Plus?: string;
  };
  disabled?: boolean;
}

export function LegalCheckboxes({
  acceptTerms,
  acceptPrivacy,
  acceptDataTreatment,
  acceptAge18Plus,
  onTermsChange,
  onPrivacyChange,
  onDataTreatmentChange,
  onAge18PlusChange,
  errors,
  disabled,
}: LegalCheckboxesProps) {
  const checkboxes: LegalCheckbox[] = [
    {
      id: 'age-18-plus',
      label: 'Declaro bajo juramento que',
      linkText: 'soy mayor de 18 años',
      href: '/legal/age-verification',
      checked: acceptAge18Plus,
      onChange: onAge18PlusChange,
      error: errors?.acceptAge18Plus,
      isImportant: true,
    },
    {
      id: 'terms',
      label: 'Acepto los',
      linkText: 'Términos y Condiciones',
      href: '/legal/terms',
      checked: acceptTerms,
      onChange: onTermsChange,
      error: errors?.acceptTerms,
    },
    {
      id: 'privacy',
      label: 'Acepto la',
      linkText: 'Política de Privacidad',
      href: '/legal/privacy',
      checked: acceptPrivacy,
      onChange: onPrivacyChange,
      error: errors?.acceptPrivacy,
    },
    {
      id: 'data-treatment',
      label: 'Acepto el',
      linkText: 'Tratamiento de Datos (Ley 1581)',
      href: '/legal/privacy',
      checked: acceptDataTreatment,
      onChange: onDataTreatmentChange,
      error: errors?.acceptDataTreatment,
    },
  ];

  const hasAnyError = checkboxes.some(cb => cb.error);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/90">
        Aceptaciones legales <span className="text-red-400">*</span>
      </label>

      <div className={cn(
        "space-y-2.5 p-4 rounded-sm border transition-colors",
        hasAnyError
          ? "border-red-500/30 bg-red-500/5"
          : "border-white/10 bg-white/5"
      )}>
        {checkboxes.map((checkbox) => (
          <label
            key={checkbox.id}
            className={cn(
              "flex items-start gap-3 cursor-pointer group",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Custom checkbox */}
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={checkbox.checked}
                onChange={(e) => !disabled && checkbox.onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className={cn(
                "w-5 h-5 rounded border-2 transition-all",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50",
                checkbox.checked
                  ? "bg-primary border-primary"
                  : checkbox.error
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-white/30 bg-white/5 group-hover:border-white/50"
              )}>
                {checkbox.checked && (
                  <svg
                    className="w-full h-full text-white p-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Label con link */}
            <span className="text-sm text-white/80 leading-relaxed">
              {checkbox.label}{' '}
              <a
                href={checkbox.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2"
              >
                {checkbox.linkText}
                <ExternalLink className="h-3 w-3" />
              </a>
            </span>
          </label>
        ))}
      </div>

      {hasAnyError && (
        <p className="text-xs text-red-400">
          Debes aceptar todos los términos para continuar
        </p>
      )}
    </div>
  );
}
