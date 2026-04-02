import { Sparkles } from 'lucide-react';
import { MarketplaceRoleSelector } from '../../roles/MarketplaceRoleSelector';
import type { MarketplaceRoleId } from '../../types/marketplace';

interface WizardStepRolesProps {
  selectedRoles: MarketplaceRoleId[];
  onChange: (roles: MarketplaceRoleId[]) => void;
}

export function WizardStepRoles({ selectedRoles, onChange }: WizardStepRolesProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-sm bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-purple-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Crea tu perfil en el Marketplace
        </h2>
        <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
          Selecciona los roles que mejor te describen. Las marcas te encontraran segun tus especialidades.
        </p>
      </div>

      {/* Role selector */}
      <div className="bg-white/5 rounded-sm border border-white/10 p-6">
        <MarketplaceRoleSelector
          selectedRoles={selectedRoles}
          onChange={onChange}
          maxRoles={5}
          showCategories
          label="Tus especialidades (max. 5)"
        />
      </div>

      {/* Tip */}
      {selectedRoles.length === 0 && (
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Selecciona al menos 1 rol para continuar
          </p>
        </div>
      )}

      {selectedRoles.length > 0 && (
        <div className="p-4 rounded-sm bg-purple-500/10 border border-purple-500/20 text-center">
          <p className="text-purple-300 text-sm">
            {selectedRoles.length} {selectedRoles.length === 1 ? 'rol seleccionado' : 'roles seleccionados'} — Las marcas veran estos roles en tu perfil
          </p>
        </div>
      )}
    </div>
  );
}
