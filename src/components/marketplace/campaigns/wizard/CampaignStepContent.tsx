import { Plus, Trash2, Video } from 'lucide-react';
import { CONTENT_TYPES } from '../../types/marketplace';
import type { CampaignContentRequirement } from '../../types/marketplace';

interface CampaignStepContentProps {
  requirements: CampaignContentRequirement[];
  onChange: (requirements: CampaignContentRequirement[]) => void;
}

const EMPTY_REQUIREMENT: CampaignContentRequirement = {
  content_type: '',
  quantity: 1,
  duration_seconds: undefined,
  description: '',
};

export function CampaignStepContent({ requirements, onChange }: CampaignStepContentProps) {
  const updateRequirement = (index: number, partial: Partial<CampaignContentRequirement>) => {
    const updated = requirements.map((r, i) => (i === index ? { ...r, ...partial } : r));
    onChange(updated);
  };

  const addRequirement = () => {
    onChange([...requirements, { ...EMPTY_REQUIREMENT }]);
  };

  const removeRequirement = (index: number) => {
    if (requirements.length <= 1) return;
    onChange(requirements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Contenido Requerido</h2>
        <p className="text-gray-500 text-sm">Define que tipo de contenido necesitas de los creadores</p>
      </div>

      <div className="space-y-4">
        {requirements.map((req, index) => (
          <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-purple-400" />
                <span className="text-white text-sm font-medium">Tipo de contenido {index + 1}</span>
              </div>
              {requirements.length > 1 && (
                <button
                  onClick={() => removeRequirement(index)}
                  className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Content type */}
              <div>
                <label className="text-gray-500 text-xs block mb-1">Tipo <span className="text-red-400">*</span></label>
                <select
                  value={req.content_type}
                  onChange={e => updateRequirement(index, { content_type: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a2e]">Seleccionar</option>
                  {CONTENT_TYPES.map(ct => (
                    <option key={ct} value={ct} className="bg-[#1a1a2e]">{ct}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-gray-500 text-xs block mb-1">Cantidad <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={req.quantity}
                  onChange={e => updateRequirement(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-gray-500 text-xs block mb-1">Duracion (seg)</label>
                <input
                  type="number"
                  min="0"
                  value={req.duration_seconds ?? ''}
                  onChange={e => updateRequirement(index, { duration_seconds: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Opcional"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-gray-500 text-xs block mb-1">Descripcion del contenido</label>
              <textarea
                value={req.description}
                onChange={e => updateRequirement(index, { description: e.target.value })}
                placeholder="Describe que esperas para este tipo de contenido..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRequirement}
        className="w-full border border-dashed border-white/20 rounded-xl py-3 text-gray-400 text-sm hover:border-purple-500/50 hover:text-purple-300 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Agregar otro tipo de contenido
      </button>
    </div>
  );
}
