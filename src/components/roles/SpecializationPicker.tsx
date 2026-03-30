import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AppRole, Specialization, SpecializationCategory } from '@/types/database';
import { X } from 'lucide-react';
import {
  SPECIALIZATIONS_BY_ROLE,
  SPECIALIZATION_CATEGORY_LABELS,
  getSpecializationLabel,
  getSpecializationIconComponent,
} from '@/lib/specializations';

interface SpecializationPickerProps {
  selectedRoles: AppRole[];
  selectedSpecializations: Specialization[];
  onSpecializationsChange: (specs: Specialization[]) => void;
  maxSpecializations?: number;
}

// Mapeo de AppRole a SpecializationCategory
const ROLE_TO_CATEGORY: Partial<Record<AppRole, SpecializationCategory>> = {
  content_creator: 'content_creator',
  editor: 'editor',
  digital_strategist: 'digital_strategist',
  creative_strategist: 'creative_strategist',
};

export function SpecializationPicker({
  selectedRoles,
  selectedSpecializations,
  onSpecializationsChange,
  maxSpecializations = 5,
}: SpecializationPickerProps) {
  // Filtrar categorias basadas en los roles seleccionados
  const visibleCategories = useMemo(() => {
    const categories: SpecializationCategory[] = [];
    selectedRoles.forEach(role => {
      const category = ROLE_TO_CATEGORY[role];
      if (category && !categories.includes(category)) {
        categories.push(category);
      }
    });
    return categories;
  }, [selectedRoles]);

  // Toggle especializacion
  const toggleSpecialization = (spec: Specialization) => {
    const current = [...selectedSpecializations];
    if (current.includes(spec)) {
      onSpecializationsChange(current.filter(s => s !== spec));
    } else {
      if (current.length >= maxSpecializations) return;
      onSpecializationsChange([...current, spec]);
    }
  };

  // Remover especializacion
  const removeSpecialization = (spec: Specialization) => {
    onSpecializationsChange(selectedSpecializations.filter(s => s !== spec));
  };

  // Si no hay roles seleccionados, no mostrar nada
  if (visibleCategories.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-500 dark:text-zinc-400">
        Selecciona al menos un rol para ver especializaciones
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Badges de especializaciones seleccionadas */}
      {selectedSpecializations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          {selectedSpecializations.map(spec => {
            return (
              <Badge
                key={spec}
                variant="secondary"
                className="bg-purple-500/10 text-purple-400 border-purple-500/30 cursor-pointer hover:bg-purple-500/20 gap-1 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                onClick={() => removeSpecialization(spec)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    removeSpecialization(spec);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Remover especializacion: ${getSpecializationLabel(spec)}`}
              >
                {getSpecializationLabel(spec)}
                <X className="h-3 w-3" aria-hidden="true" />
              </Badge>
            );
          })}
          <span className="text-xs text-zinc-500 self-center ml-1">
            {selectedSpecializations.length}/{maxSpecializations}
          </span>
        </div>
      )}

      {/* Grupos de especializaciones por categoria */}
      <div className="space-y-4">
        {visibleCategories.map(category => {
          const specs = SPECIALIZATIONS_BY_ROLE[category];
          if (!specs || specs.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {SPECIALIZATION_CATEGORY_LABELS[category]}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {specs.map(specId => {
                  const Icon = getSpecializationIconComponent(specId);
                  const label = getSpecializationLabel(specId);
                  const isSelected = selectedSpecializations.includes(specId);
                  const isDisabled = !isSelected && selectedSpecializations.length >= maxSpecializations;

                  return (
                    <label
                      key={specId}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors duration-150',
                        'bg-white dark:bg-[#1a1a24]',
                        'border',
                        'focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-[#1a1a24]',
                        isSelected
                          ? 'border-purple-500 bg-purple-500/5 dark:bg-purple-500/10'
                          : 'border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600',
                        isDisabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => !isDisabled && toggleSpecialization(specId)}
                        disabled={isDisabled}
                        aria-label={`Seleccionar especializacion: ${label}`}
                        className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      />
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isSelected ? 'text-purple-500' : 'text-zinc-400 dark:text-zinc-500'
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          'text-sm',
                          isSelected
                            ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                            : 'text-zinc-600 dark:text-zinc-400'
                        )}
                      >
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contador cuando esta lleno */}
      {selectedSpecializations.length >= maxSpecializations && (
        <p className="text-xs text-amber-500 dark:text-amber-400 text-center">
          Has alcanzado el maximo de {maxSpecializations} especializaciones
        </p>
      )}
    </div>
  );
}
