import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  UserType,
  ORG_USER_TYPE_OPTIONS,
  GENERAL_USER_TYPE_OPTIONS,
  RegistrationFlow,
} from '../types';

const EMOJI_MAP: Record<string, string> = {
  client: '🏢',
  freelancer: '✨',
  brand: '🏢',
  organization: '🏛️',
};

interface TypeSelectorStepProps {
  flow: RegistrationFlow;
  selectedType?: UserType;
  onSelect: (type: UserType) => void;
  orgName?: string;
}

export function TypeSelectorStep({
  flow,
  selectedType,
  onSelect,
  orgName,
}: TypeSelectorStepProps) {
  const options = flow === 'org' ? ORG_USER_TYPE_OPTIONS : GENERAL_USER_TYPE_OPTIONS;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="text-5xl mb-2">👋</div>
        <h1 className="text-3xl font-bold text-white leading-tight">
          {flow === 'org' ? (
            <>¿Cómo te unes a<br />{orgName || 'la organización'}?</>
          ) : (
            <>¿Cómo quieres<br />usar Kreoon?</>
          )}
        </h1>
        <p className="text-white/60 text-base">
          Elige tu tipo de cuenta — puedes cambiarlo después
        </p>
      </div>

      {/* Big Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((option) => {
          const emoji = EMOJI_MAP[option.type] ?? '👤';
          const isSelected = selectedType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type)}
              className={cn(
                "relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all text-center",
                "hover:scale-[1.03] active:scale-[0.97] cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/15 shadow-2xl shadow-primary/20"
                  : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
              )}
            >
              {/* Giant emoji */}
              <span className="text-6xl leading-none select-none">{emoji}</span>

              {/* Title */}
              <h3 className={cn(
                "text-xl font-bold leading-tight",
                isSelected ? "text-white" : "text-white/90"
              )}>
                {option.title}
              </h3>

              {/* Description */}
              <p className={cn(
                "text-sm leading-relaxed",
                isSelected ? "text-white/70" : "text-white/50"
              )}>
                {option.description}
              </p>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
