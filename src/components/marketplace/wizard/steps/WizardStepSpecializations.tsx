import { Award } from 'lucide-react';
import { SpecializationPicker } from '@/components/roles/SpecializationPicker';
import { getBaseRole } from '@/lib/roles';
import type { MarketplaceRoleId } from '../../types/marketplace';
import type { AppRole, Specialization } from '@/types/database';

interface WizardStepSpecializationsProps {
  selectedMarketplaceRoles: MarketplaceRoleId[];
  selectedSpecializations: Specialization[];
  onChange: (specs: Specialization[]) => void;
}

export function WizardStepSpecializations({
  selectedMarketplaceRoles,
  selectedSpecializations,
  onChange,
}: WizardStepSpecializationsProps) {
  // Convertir MarketplaceRoleId a AppRole usando getBaseRole
  const derivedRoles: AppRole[] = selectedMarketplaceRoles
    .map(role => getBaseRole(role))
    .filter((role, index, arr) => arr.indexOf(role) === index); // unique

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-sm bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
          <Award className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Tus especializaciones
        </h2>
        <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
          Selecciona hasta 5 habilidades especificas dentro de tus roles.
          Esto ayuda a las marcas a encontrarte con mayor precision.
        </p>
      </div>

      {/* Specialization picker */}
      <div className="bg-white/5 rounded-sm border border-white/10 p-6">
        {derivedRoles.length > 0 ? (
          <SpecializationPicker
            selectedRoles={derivedRoles}
            selectedSpecializations={selectedSpecializations}
            onSpecializationsChange={onChange}
            maxSpecializations={5}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Selecciona al menos un rol en el paso anterior para ver especializaciones</p>
          </div>
        )}
      </div>

      {/* Status */}
      {selectedSpecializations.length > 0 && (
        <div className="p-4 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-emerald-300 text-sm">
            {selectedSpecializations.length} {selectedSpecializations.length === 1 ? 'especializacion seleccionada' : 'especializaciones seleccionadas'}
          </p>
        </div>
      )}

      {derivedRoles.length > 0 && selectedSpecializations.length === 0 && (
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Las especializaciones son opcionales pero ayudan a las marcas a encontrarte
          </p>
        </div>
      )}
    </div>
  );
}
