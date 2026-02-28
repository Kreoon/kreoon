import { Building2, Users, Sparkles, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  UserType,
  UserTypeOption,
  ORG_USER_TYPE_OPTIONS,
  GENERAL_USER_TYPE_OPTIONS,
  RegistrationFlow,
} from '../types';

interface TypeSelectorStepProps {
  flow: RegistrationFlow;
  selectedType?: UserType;
  onSelect: (type: UserType) => void;
  orgName?: string;
}

const ICONS = {
  Building2,
  Users,
  Sparkles,
  User,
};

export function TypeSelectorStep({
  flow,
  selectedType,
  onSelect,
  orgName,
}: TypeSelectorStepProps) {
  const options = flow === 'org' ? ORG_USER_TYPE_OPTIONS : GENERAL_USER_TYPE_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">
          {flow === 'org' ? (
            <>¿Cómo te unirás a {orgName || 'la organización'}?</>
          ) : (
            <>¿Qué tipo de cuenta necesitas?</>
          )}
        </h1>
        <p className="text-white/60">
          Selecciona la opción que mejor describe tu perfil
        </p>
      </div>

      {/* Options grid */}
      <div className={cn(
        "grid gap-4",
        options.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      )}>
        {options.map((option) => {
          const Icon = ICONS[option.icon as keyof typeof ICONS];
          const isSelected = selectedType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type)}
              className={cn(
                "relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group",
                "hover:scale-[1.02] hover:shadow-lg",
                isSelected
                  ? "border-primary bg-primary/10 shadow-primary/20"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-primary text-white"
                  : "bg-white/10 text-white/60 group-hover:bg-white/15 group-hover:text-white/80"
              )}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold text-lg",
                  isSelected ? "text-white" : "text-white/90"
                )}>
                  {option.title}
                </h3>
                <p className={cn(
                  "text-sm mt-0.5",
                  isSelected ? "text-white/70" : "text-white/50"
                )}>
                  {option.description}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className={cn(
                "h-5 w-5 flex-shrink-0 transition-all",
                isSelected
                  ? "text-primary translate-x-0"
                  : "text-white/30 -translate-x-1 group-hover:translate-x-0 group-hover:text-white/50"
              )} />

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper text for general flow */}
      {flow === 'general' && (
        <p className="text-center text-xs text-white/40">
          ¿Ya tienes una cuenta?{' '}
          <a href="/auth" className="text-primary hover:underline">
            Inicia sesión
          </a>
        </p>
      )}
    </div>
  );
}
