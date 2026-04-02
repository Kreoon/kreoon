import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MARKETPLACE_CATEGORIES } from '../../types/marketplace';

export interface CampaignBasicInfo {
  title: string;
  description: string;
  category: string;
  deadline: string;
  tags: string[];
}

interface CampaignStepBasicInfoProps {
  data: CampaignBasicInfo;
  onChange: <K extends keyof CampaignBasicInfo>(field: K, value: CampaignBasicInfo[K]) => void;
}

export function CampaignStepBasicInfo({ data, onChange }: CampaignStepBasicInfoProps) {
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !data.tags.includes(trimmed)) {
      onChange('tags', [...data.tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    onChange('tags', data.tags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--nova-text-bright)] mb-1">Informacion Basica</h2>
        <p className="text-[var(--nova-text-muted)] text-sm">Define los datos principales de tu campana</p>
      </div>

      {/* Title */}
      <div>
        <label className="text-[var(--nova-text-primary)] text-sm font-medium block mb-1.5">
          Titulo de la Campana <span className="text-[var(--nova-error)]">*</span>
        </label>
        <input
          value={data.title}
          onChange={e => onChange('title', e.target.value)}
          placeholder="Ej: Lanzamiento Proteina Vegana 2026"
          className="w-full bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] rounded-sm px-4 py-3 text-[var(--nova-text-bright)] text-sm placeholder:text-[var(--nova-text-disabled)] focus:outline-none focus:border-[var(--nova-accent-primary)] transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[var(--nova-text-primary)] text-sm font-medium block mb-1.5">
          Descripcion <span className="text-[var(--nova-error)]">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Describe el objetivo de la campana, que tipo de contenido buscas y que esperas de los creadores..."
          rows={5}
          className="w-full bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] rounded-sm px-4 py-3 text-[var(--nova-text-bright)] text-sm placeholder:text-[var(--nova-text-disabled)] focus:outline-none focus:border-[var(--nova-accent-primary)] resize-none transition-colors"
        />
        <p className="text-[var(--nova-text-disabled)] text-xs mt-1">{data.description.length}/1000 caracteres</p>
      </div>

      {/* Category */}
      <div>
        <label className="text-[var(--nova-text-primary)] text-sm font-medium block mb-1.5">
          Categoria <span className="text-[var(--nova-error)]">*</span>
        </label>
        <select
          value={data.category}
          onChange={e => onChange('category', e.target.value)}
          className="w-full bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] rounded-sm px-4 py-3 text-[var(--nova-text-bright)] text-sm focus:outline-none focus:border-[var(--nova-accent-primary)] appearance-none cursor-pointer transition-colors"
        >
          <option value="" className="bg-[var(--nova-bg-surface)]">Selecciona una categoria</option>
          {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
            <option key={cat.id} value={cat.id} className="bg-[var(--nova-bg-surface)]">{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Deadline */}
      <div>
        <label className="text-[var(--nova-text-primary)] text-sm font-medium block mb-1.5">Fecha Limite</label>
        <input
          type="date"
          value={data.deadline}
          onChange={e => onChange('deadline', e.target.value)}
          className="w-full bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] rounded-sm px-4 py-3 text-[var(--nova-text-bright)] text-sm focus:outline-none focus:border-[var(--nova-accent-primary)] transition-colors"
        />
        <p className="text-[var(--nova-text-disabled)] text-xs mt-1">Hasta cuando se aceptan aplicaciones</p>
      </div>

      {/* Tags */}
      <div>
        <label className="text-[var(--nova-text-primary)] text-sm font-medium block mb-1.5">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="Agregar tag y presiona Enter"
            className="flex-1 bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] rounded-sm px-4 py-3 text-[var(--nova-text-bright)] text-sm placeholder:text-[var(--nova-text-disabled)] focus:outline-none focus:border-[var(--nova-accent-primary)] transition-colors"
          />
          <button
            onClick={addTag}
            disabled={!tagInput.trim()}
            className="bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] hover:bg-[var(--nova-bg-hover)] disabled:opacity-40 px-3 rounded-sm transition-colors"
          >
            <Plus className="h-4 w-4 text-[var(--nova-text-secondary)]" />
          </button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-[var(--nova-accent-primary)]/15 text-[var(--nova-accent-primary-hover)] text-xs px-2.5 py-1 rounded-full">
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-[var(--nova-text-bright)]"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
