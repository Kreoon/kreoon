import { useState, useCallback } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceFilters, MarketplaceViewMode } from './types/marketplace';
import { CONTENT_TYPES } from './types/marketplace';
import { getAdaptiveFilters } from './hooks/useAdaptiveFilters';
import type { AdaptiveFilterConfig } from './hooks/useAdaptiveFilters';

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  filters: MarketplaceFilters;
  onApply: (filters: MarketplaceFilters) => void;
  resultCount: number;
  activeRoleCategory?: MarketplaceViewMode;
}

const LEVELS = [
  { id: 'bronze', label: 'Bronce' },
  { id: 'silver', label: 'Plata' },
  { id: 'gold', label: 'Oro' },
  { id: 'elite', label: 'Elite' },
];

const LANGUAGES = ['Español', 'Inglés', 'Portugués'];

const RATING_OPTIONS = [
  { value: null, label: 'Cualquiera' },
  { value: 4.0, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
  { value: 4.8, label: '4.8+' },
];

export function FilterModal({ open, onClose, filters, onApply, resultCount, activeRoleCategory }: FilterModalProps) {
  const [local, setLocal] = useState<MarketplaceFilters>(filters);
  const [expandedAdaptive, setExpandedAdaptive] = useState(true);

  const adaptiveFilters = activeRoleCategory ? getAdaptiveFilters(activeRoleCategory) : [];

  const update = useCallback(<K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K],
  ) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayItem = useCallback((key: 'content_type' | 'level' | 'languages' | 'platforms' | 'software' | 'tech_stack' | 'education_format', item: string) => {
    setLocal(prev => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  }, []);

  const handleClear = useCallback(() => {
    setLocal(prev => ({
      ...prev,
      price_min: null,
      price_max: null,
      rating_min: null,
      level: [],
      languages: [],
      content_type: [],
      availability: 'any',
      platforms: [],
      software: [],
      accepts_exchange: null,
      tech_stack: [],
      education_format: [],
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(local);
    onClose();
  }, [local, onApply, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 sm:animate-in sm:fade-in sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="w-8" />
          <h3 className="text-lg font-semibold text-white">Filtros</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Adaptive filters section */}
          {adaptiveFilters.length > 0 && (
            <div className="py-6 border-b border-white/10">
              <button
                onClick={() => setExpandedAdaptive(!expandedAdaptive)}
                className="flex items-center justify-between w-full mb-4"
              >
                <h4 className="text-sm font-semibold text-purple-300">Filtros de especialidad</h4>
                {expandedAdaptive ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {expandedAdaptive && (
                <div className="space-y-5">
                  {adaptiveFilters.map(af => (
                    <AdaptiveSection
                      key={af.key}
                      config={af}
                      local={local}
                      onToggle={toggleArrayItem}
                      onUpdate={update}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price range */}
          <div className="py-6 border-b border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Rango de precio</h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Mínimo"
                value={local.price_min ?? ''}
                onChange={e =>
                  update('price_min', e.target.value ? Number(e.target.value) : null)
                }
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500/50"
              />
              <span className="text-gray-500">—</span>
              <input
                type="number"
                placeholder="Máximo"
                value={local.price_max ?? ''}
                onChange={e =>
                  update('price_max', e.target.value ? Number(e.target.value) : null)
                }
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Rating */}
          <div className="py-6 border-b border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Calificación mínima</h4>
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => update('rating_min', opt.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors border',
                    local.rating_min === opt.value
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {opt.value ? `⭐ ${opt.label}` : opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="py-6 border-b border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Nivel del creador</h4>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => toggleArrayItem('level', l.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors border',
                    local.level.includes(l.id)
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="py-6 border-b border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Idiomas</h4>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  onClick={() => toggleArrayItem('languages', l)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors border',
                    local.languages.includes(l)
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Content types */}
          <div className="py-6 border-b border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Tipo de contenido</h4>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(ct => (
                <button
                  key={ct}
                  onClick={() => toggleArrayItem('content_type', ct)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors border',
                    local.content_type.includes(ct)
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="py-6">
            <h4 className="text-sm font-semibold text-white mb-4">Disponibilidad</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'any' as const, label: 'Cualquier momento' },
                { id: 'now' as const, label: 'Disponible ahora' },
                { id: 'week' as const, label: 'Esta semana' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => update('availability', opt.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors border',
                    local.availability === opt.id
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#1a1a2e]">
          <button
            onClick={handleClear}
            className="text-purple-400 underline text-sm hover:text-white transition-colors"
          >
            Limpiar todo
          </button>
          <button
            onClick={handleApply}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-6 py-3 font-semibold text-sm transition-colors"
          >
            Mostrar {resultCount} resultados
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Adaptive filter section renderer ---

function AdaptiveSection({
  config,
  local,
  onToggle,
  onUpdate,
}: {
  config: AdaptiveFilterConfig;
  local: MarketplaceFilters;
  onToggle: (key: any, item: string) => void;
  onUpdate: (key: any, value: any) => void;
}) {
  if (config.type === 'toggle') {
    const isOn = local[config.filterKey] === true;
    return (
      <div>
        <h5 className="text-xs font-medium text-gray-400 mb-2">{config.label}</h5>
        <button
          onClick={() => onUpdate(config.filterKey, isOn ? null : true)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm transition-colors border',
            isOn
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
          )}
        >
          {config.options[0]?.label}
        </button>
      </div>
    );
  }

  const selected = (local[config.filterKey] as string[]) || [];
  return (
    <div>
      <h5 className="text-xs font-medium text-gray-400 mb-2">{config.label}</h5>
      <div className="flex flex-wrap gap-2">
        {config.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onToggle(config.filterKey, opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs transition-colors border',
              selected.includes(opt.value)
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
