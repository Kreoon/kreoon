import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { HiringBrief } from '../types/marketplace';

interface HiringStepBriefProps {
  data: HiringBrief;
  onChange: <K extends keyof HiringBrief>(field: K, value: HiringBrief[K]) => void;
}

const OBJECTIVES = [
  'Generar awareness y alcance',
  'Conversiones y ventas',
  'Contenido para ads (Meta/TikTok)',
  'Contenido organico para redes',
  'Lanzamiento de producto',
  'Branding y posicionamiento',
  'Testimonial / Social proof',
];

const TONES = [
  'Casual y autentico',
  'Energetico y aspiracional',
  'Educativo y confiable',
  'Divertido y entretenido',
  'Elegante y premium',
  'Motivacional e intenso',
  'Cercano y amigable',
];

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={add}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, i) => (
            <span
              key={i}
              className="flex items-center gap-1 bg-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function HiringStepBrief({ data, onChange }: HiringStepBriefProps) {
  return (
    <div className="space-y-6">
      {/* Product name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Nombre del producto / marca <span className="text-pink-400">*</span>
        </label>
        <input
          value={data.product_name}
          onChange={e => onChange('product_name', e.target.value)}
          placeholder="Ej: Proteina Vegana NaturalFit"
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Product URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          URL del producto <span className="text-gray-500">(opcional)</span>
        </label>
        <input
          value={data.product_url || ''}
          onChange={e => onChange('product_url', e.target.value)}
          placeholder="https://tuproducto.com"
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Objective */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Objetivo del contenido <span className="text-pink-400">*</span>
        </label>
        <select
          value={data.objective}
          onChange={e => onChange('objective', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 [&>option]:bg-card"
        >
          <option value="">Selecciona un objetivo</option>
          {OBJECTIVES.map(obj => (
            <option key={obj} value={obj}>{obj}</option>
          ))}
        </select>
      </div>

      {/* Target audience */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Audiencia objetivo</label>
        <input
          value={data.target_audience}
          onChange={e => onChange('target_audience', e.target.value)}
          placeholder="Ej: Mujeres 25-40, interesadas en fitness"
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Key messages */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Mensajes clave</label>
        <TagInput
          value={data.key_messages}
          onChange={v => onChange('key_messages', v)}
          placeholder="Agrega un mensaje clave y presiona Enter"
        />
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Tono del contenido</label>
        <select
          value={data.tone}
          onChange={e => onChange('tone', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 [&>option]:bg-card"
        >
          <option value="">Selecciona un tono</option>
          {TONES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Dos */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Que SI hacer</label>
        <TagInput
          value={data.dos}
          onChange={v => onChange('dos', v)}
          placeholder="Ej: Mostrar el producto en uso"
        />
      </div>

      {/* Don'ts */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Que NO hacer</label>
        <TagInput
          value={data.donts}
          onChange={v => onChange('donts', v)}
          placeholder="Ej: No comparar con otra marca"
        />
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Fecha limite <span className="text-gray-500">(opcional)</span>
        </label>
        <input
          type="date"
          value={data.deadline || ''}
          onChange={e => onChange('deadline', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Notas adicionales <span className="text-gray-500">(opcional)</span>
        </label>
        <textarea
          value={data.notes || ''}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="Referencias, instrucciones especiales, etc."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>
    </div>
  );
}
