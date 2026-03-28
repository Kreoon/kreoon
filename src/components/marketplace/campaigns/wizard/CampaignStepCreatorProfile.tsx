import { cn } from '@/lib/utils';
import { MARKETPLACE_CATEGORIES, COUNTRIES, CONTENT_TYPES } from '../../types/marketplace';
import { MarketplaceRoleSelector } from '../../roles/MarketplaceRoleSelector';
import type { CampaignCreatorRequirements, MarketplaceRoleId } from '../../types/marketplace';

interface CampaignStepCreatorProfileProps {
  data: CampaignCreatorRequirements;
  onChange: <K extends keyof CampaignCreatorRequirements>(field: K, value: CampaignCreatorRequirements[K]) => void;
}

const LANGUAGES = ['Español', 'Ingles', 'Portugues', 'Frances'];
const RATING_OPTIONS = [3.0, 3.5, 4.0, 4.5, 5.0];

export function CampaignStepCreatorProfile({ data, onChange }: CampaignStepCreatorProfileProps) {
  const toggleArrayItem = <K extends keyof CampaignCreatorRequirements>(
    field: K,
    item: string,
  ) => {
    const current = data[field] as string[];
    if (current.includes(item)) {
      onChange(field, current.filter(v => v !== item) as CampaignCreatorRequirements[K]);
    } else {
      onChange(field, [...current, item] as CampaignCreatorRequirements[K]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Perfil de Creador</h2>
        <p className="text-gray-500 text-sm">Define los requisitos que deben cumplir los creadores para aplicar</p>
      </div>

      {/* Desired roles (optional) */}
      <MarketplaceRoleSelector
        selectedRoles={data.desired_roles ?? []}
        onChange={(roles: MarketplaceRoleId[]) => onChange('desired_roles', roles)}
        maxRoles={5}
        showCategories
        label="Roles Deseados (opcional)"
      />

      {/* Min rating */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-2">Rating Minimo</label>
        <div className="flex gap-2">
          {RATING_OPTIONS.map(rating => (
            <button
              key={rating}
              onClick={() => onChange('min_rating', rating)}
              className={cn(
                'px-4 py-2 rounded-sm text-sm font-medium border transition-all',
                data.min_rating === rating
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-400 hover:border-white/20',
              )}
            >
              {rating}+
            </button>
          ))}
        </div>
      </div>

      {/* Min completed projects */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-1.5">Proyectos Completados Minimos</label>
        <input
          type="number"
          min="0"
          value={data.min_completed_projects}
          onChange={e => onChange('min_completed_projects', Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 max-w-xs"
        />
      </div>

      {/* Min followers (optional) */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-1.5">Seguidores Minimos <span className="text-gray-600">(opcional)</span></label>
        <input
          type="number"
          min="0"
          value={data.min_followers ?? ''}
          onChange={e => onChange('min_followers', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Ej: 5000"
          className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 max-w-xs"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-2">Categorias</label>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
            <button
              key={cat.id}
              onClick={() => toggleArrayItem('categories', cat.label)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                data.categories.includes(cat.label)
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-500 hover:border-white/20',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Countries */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-2">Paises</label>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map(country => (
            <button
              key={country.code}
              onClick={() => toggleArrayItem('countries', country.code)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1',
                data.countries.includes(country.code)
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-500 hover:border-white/20',
              )}
            >
              <span>{country.flag}</span>
              {country.label}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-2">Idiomas</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => toggleArrayItem('languages', lang)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                data.languages.includes(lang)
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-500 hover:border-white/20',
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Content types */}
      <div>
        <label className="text-foreground/80 text-sm font-medium block mb-2">Tipos de Contenido</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct}
              onClick={() => toggleArrayItem('content_types', ct)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                data.content_types.includes(ct)
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-500 hover:border-white/20',
              )}
            >
              {ct}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
