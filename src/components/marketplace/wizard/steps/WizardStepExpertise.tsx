import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_CATEGORIES, CONTENT_TYPES } from '../../types/marketplace';

interface ExpertiseData {
  categories: string[];
  content_types: string[];
  platforms: string[];
  languages: string[];
  experience_level: string;
  custom_tags: string[];
}

interface WizardStepExpertiseProps {
  data: ExpertiseData;
  onChange: (data: ExpertiseData) => void;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'blog', label: 'Blog' },
];

const LANGUAGES = [
  { id: 'es', label: 'Espanol' },
  { id: 'en', label: 'Ingles' },
  { id: 'pt', label: 'Portugues' },
  { id: 'fr', label: 'Frances' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Principiante', desc: 'Menos de 1 ano' },
  { value: 'intermediate', label: 'Intermedio', desc: '1-3 anos' },
  { value: 'advanced', label: 'Avanzado', desc: '3-5 anos' },
  { value: 'expert', label: 'Experto', desc: '5+ anos' },
];

export function WizardStepExpertise({ data, onChange }: WizardStepExpertiseProps) {
  const [customTag, setCustomTag] = useState('');

  const toggle = (field: keyof ExpertiseData, value: string) => {
    const current = data[field] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...data, [field]: updated });
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !data.custom_tags.includes(trimmed)) {
      onChange({ ...data, custom_tags: [...data.custom_tags, trimmed] });
      setCustomTag('');
    }
  };

  const removeCustomTag = (tag: string) => {
    onChange({ ...data, custom_tags: data.custom_tags.filter(t => t !== tag) });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Tu expertise</h2>
        <p className="text-gray-400 text-sm">Define tus habilidades y areas de especializacion</p>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-3">Categorias</label>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
            <button
              key={cat.id}
              onClick={() => toggle('categories', cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                data.categories.includes(cat.id)
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content types */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-3">Tipos de servicio</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggle('content_types', type)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                data.content_types.includes(type)
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-3">Plataformas</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => toggle('platforms', p.id)}
              className={cn(
                'px-3 py-2 rounded-sm text-xs font-medium transition-all border text-center',
                data.platforms.includes(p.id)
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Experience level */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-3">Nivel de experiencia</label>
        <div className="grid grid-cols-2 gap-3">
          {EXPERIENCE_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => onChange({ ...data, experience_level: level.value })}
              className={cn(
                'p-3 rounded-sm border text-left transition-all',
                data.experience_level === level.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <p className="text-white text-sm font-medium">{level.label}</p>
              <p className="text-gray-500 text-xs">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-3">Idiomas</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => toggle('languages', lang.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                data.languages.includes(lang.id)
                  ? 'bg-green-500/20 text-green-300 border-green-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom tags */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-3">Etiquetas personalizadas</label>
        {data.custom_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.custom_tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-xs"
              >
                {tag}
                <X className="h-3 w-3 cursor-pointer text-gray-400 hover:text-white" onClick={() => removeCustomTag(tag)} />
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
            placeholder="Ej: Animacion 3D, Storytelling..."
            className="flex-1 bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
          />
          <button
            onClick={addCustomTag}
            disabled={!customTag.trim()}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-foreground/80 rounded-sm text-sm transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
