import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Video, Scissors, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_ROLES, MARKETPLACE_ROLE_CATEGORIES, MAX_ROLES_PER_CREATOR } from '@/components/marketplace/roles/marketplaceRoleConfig';
import type { MarketplaceRoleCategory } from '@/components/marketplace/types/marketplace';
import { PLATFORMS, TALENT_CATEGORIES } from '../types';
import type { StepComponentProps } from '../types';

const TALENT_TYPES = [
  { id: 'creator' as const, label: 'Creador', icon: Video, description: 'Creo contenido' },
  { id: 'editor' as const, label: 'Productor', icon: Scissors, description: 'Edito y produzco' },
  { id: 'both' as const, label: 'Ambos', icon: Layers, description: 'Creo y edito' },
];

const CATEGORY_ORDER: MarketplaceRoleCategory[] = [
  'content_creation', 'post_production', 'strategy_marketing', 'technology', 'education',
];

export function TalentProfileStep({ data, onChange, onNext, onBack, mode }: StepComponentProps) {
  const [error, setError] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<MarketplaceRoleCategory | null>(null);
  const isCompact = mode === 'compact';

  const toggleRole = (roleId: string) => {
    const current = data.marketplaceRoles;
    if (current.includes(roleId)) {
      onChange({ marketplaceRoles: current.filter(r => r !== roleId) });
    } else if (current.length < MAX_ROLES_PER_CREATOR) {
      onChange({ marketplaceRoles: [...current, roleId] });
    }
  };

  const togglePlatform = (platformId: string) => {
    const current = data.platforms;
    if (current.includes(platformId)) {
      onChange({ platforms: current.filter(p => p !== platformId) });
    } else {
      onChange({ platforms: [...current, platformId] });
    }
  };

  const toggleCategory = (cat: string) => {
    const current = data.categories;
    if (current.includes(cat)) {
      onChange({ categories: current.filter(c => c !== cat) });
    } else {
      onChange({ categories: [...current, cat] });
    }
  };

  const handleNext = () => {
    if (!data.talentType) return setError('Selecciona tu tipo de talento');
    if (data.marketplaceRoles.length === 0) return setError('Selecciona al menos un rol de especialización');
    setError('');
    onNext();
  };

  // Auto-expand relevant category when talent type changes
  const getDefaultExpanded = (): MarketplaceRoleCategory => {
    if (data.talentType === 'editor') return 'post_production';
    return 'content_creation';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>

      <h2 className={cn('font-bold text-white mb-1', isCompact ? 'text-lg' : 'text-xl')}>
        Tu perfil de talento
      </h2>
      <p className="text-sm text-gray-400 mb-5">Define tu especialización para que las marcas te encuentren</p>

      {/* Talent type */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-300 mb-2">¿Qué haces?</label>
        <div className="flex gap-2">
          {TALENT_TYPES.map(t => {
            const Icon = t.icon;
            const selected = data.talentType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange({ talentType: t.id })}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-all',
                  selected
                    ? 'border-purple-500/60 bg-purple-500/15 text-purple-300'
                    : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Marketplace roles */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-300">Roles de especialización</label>
          <span className="text-[10px] text-gray-500">
            {data.marketplaceRoles.length}/{MAX_ROLES_PER_CREATOR} seleccionados
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {CATEGORY_ORDER.map(catId => {
            const cat = MARKETPLACE_ROLE_CATEGORIES[catId];
            const roles = MARKETPLACE_ROLES.filter(r => r.category === catId);
            const isExpanded = expandedCategory === catId || (expandedCategory === null && catId === getDefaultExpanded());
            const selectedInCategory = roles.filter(r => data.marketplaceRoles.includes(r.id)).length;

            return (
              <div key={catId} className="rounded-lg border border-white/5 overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : catId)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                >
                  <span className={cn('font-medium', cat.color)}>{cat.label}</span>
                  <span className="text-gray-500">
                    {selectedInCategory > 0 && (
                      <span className="text-purple-400 mr-1">{selectedInCategory}</span>
                    )}
                    {roles.length} roles
                  </span>
                </button>
                {isExpanded && (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                    {roles.map(role => {
                      const selected = data.marketplaceRoles.includes(role.id);
                      const disabled = !selected && data.marketplaceRoles.length >= MAX_ROLES_PER_CREATOR;
                      return (
                        <button
                          key={role.id}
                          onClick={() => !disabled && toggleRole(role.id)}
                          disabled={disabled}
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-all',
                            selected
                              ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                              : disabled
                              ? 'border-white/5 bg-white/[0.01] text-gray-600 cursor-not-allowed'
                              : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-gray-300',
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Platforms */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-300 mb-2">Plataformas principales</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => {
            const selected = data.platforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all',
                  selected
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                    : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20',
                )}
              >
                {selected && <Check className="h-3 w-3" />}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories (optional) */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-300 mb-2">
          Categorías <span className="text-gray-500">(opcional)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TALENT_CATEGORIES.map(cat => {
            const selected = data.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] border transition-all',
                  selected
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                    : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20',
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={handleNext}
        className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 text-sm transition-colors"
      >
        Continuar
      </button>
    </motion.div>
  );
}
