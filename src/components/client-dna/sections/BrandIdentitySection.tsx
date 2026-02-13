import React from 'react';
import { Check, X, Sparkles, MessageSquare } from 'lucide-react';
import { BrandIdentity } from '@/types/client-dna';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: BrandIdentity;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

const ARCHETYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  'The Innocent':   { emoji: '🕊️', color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20' },
  'The Sage':       { emoji: '🦉', color: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/20' },
  'The Explorer':   { emoji: '🧭', color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/20' },
  'The Outlaw':     { emoji: '🔥', color: 'from-red-500/10 to-orange-500/10 border-red-500/20' },
  'The Magician':   { emoji: '✨', color: 'from-purple-500/10 to-fuchsia-500/10 border-purple-500/20' },
  'The Hero':       { emoji: '⚔️', color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/20' },
  'The Lover':      { emoji: '❤️', color: 'from-rose-500/10 to-pink-500/10 border-rose-500/20' },
  'The Jester':     { emoji: '🃏', color: 'from-yellow-500/10 to-lime-500/10 border-yellow-500/20' },
  'The Everyman':   { emoji: '🤝', color: 'from-stone-500/10 to-gray-500/10 border-stone-500/20' },
  'The Caregiver':  { emoji: '💚', color: 'from-green-500/10 to-emerald-500/10 border-green-500/20' },
  'The Ruler':      { emoji: '👑', color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20' },
  'The Creator':    { emoji: '🎨', color: 'from-pink-500/10 to-violet-500/10 border-pink-500/20' },
};

// Adapters for old→new data
function getToneOfVoice(data: any): string | null {
  if (data.tone_of_voice) return data.tone_of_voice;
  if (data.voice?.tone?.length) return data.voice.tone.join(', ');
  return null;
}

function getKeyMessages(data: any): string[] {
  if (Array.isArray(data.key_messages) && data.key_messages.length) return data.key_messages;
  if (data.messaging?.key_messages?.length) return data.messaging.key_messages;
  return [];
}

function getTaglineSuggestions(data: any): string[] {
  if (Array.isArray(data.tagline_suggestions) && data.tagline_suggestions.length) return data.tagline_suggestions;
  if (data.messaging?.tagline) return [data.messaging.tagline];
  return [];
}

export function BrandIdentitySection({ data, isEditing, onFieldChange }: Props) {
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);
  const archetype = data.brand_archetype;
  const archetypeConfig = archetype
    ? ARCHETYPE_CONFIG[archetype] || ARCHETYPE_CONFIG[Object.keys(ARCHETYPE_CONFIG).find(k => archetype.toLowerCase().includes(k.replace('The ', '').toLowerCase())) || '']
    : null;

  const toneOfVoice = getToneOfVoice(data);
  const keyMessages = getKeyMessages(data);
  const taglines = getTaglineSuggestions(data);

  return (
    <div className="space-y-6">
      {/* Archetype */}
      {(archetype || isEditing) && (
        <div className={`p-5 rounded-xl bg-gradient-to-br ${archetypeConfig?.color || 'from-violet-500/10 to-purple-500/10 border-violet-500/20'} border`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{archetypeConfig?.emoji || '🎭'}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Arquetipo de Marca</p>
              {isEditing ? (
                <EditableText value={archetype} onChange={change('brand_archetype') as (v: string) => void} placeholder="Arquetipo..." />
              ) : (
                <p className="text-sm font-bold text-white">{archetype}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personality Traits */}
      {(data.personality_traits?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Rasgos de Personalidad</p>
          {isEditing ? (
            <EditableTags items={data.personality_traits || []} onChange={change('personality_traits') as (v: string[]) => void} color="purple" placeholder="Agregar rasgo..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.personality_traits?.map((trait, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                  {trait}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tone of Voice & Communication Style */}
      {(toneOfVoice || data.communication_style || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(toneOfVoice || isEditing) && (
            <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <p className="text-sm font-medium text-pink-400">Tono de Voz</p>
              </div>
              {isEditing ? (
                <EditableText value={data.tone_of_voice || (data.voice?.tone?.join(', ') ?? '')} onChange={change('tone_of_voice') as (v: string) => void} placeholder="Tono de voz..." />
              ) : (
                <p className="text-sm text-gray-300">{toneOfVoice}</p>
              )}
            </div>
          )}
          {(data.communication_style || isEditing) && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-medium text-blue-400">Estilo de Comunicación</p>
              </div>
              {isEditing ? (
                <EditableText value={data.communication_style} onChange={change('communication_style') as (v: string) => void} placeholder="Estilo de comunicación..." />
              ) : (
                <p className="text-sm text-gray-300">{data.communication_style}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Do Say / Don't Say */}
      {(data.voice?.do_say?.length > 0 || data.voice?.dont_say?.length > 0 || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.voice?.do_say?.length > 0 || isEditing) && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400 mb-3">Sí Dice</p>
              {isEditing ? (
                <EditableTags items={data.voice?.do_say || []} onChange={change('voice.do_say') as (v: string[]) => void} color="emerald" placeholder="Agregar frase..." />
              ) : (
                <ul className="space-y-2">
                  {data.voice?.do_say?.map((phrase, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {phrase}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {(data.voice?.dont_say?.length > 0 || isEditing) && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-sm font-medium text-red-400 mb-3">No Dice</p>
              {isEditing ? (
                <EditableTags items={data.voice?.dont_say || []} onChange={change('voice.dont_say') as (v: string[]) => void} color="red" placeholder="Agregar frase..." />
              ) : (
                <ul className="space-y-2">
                  {data.voice?.dont_say?.map((phrase, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      {phrase}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tagline Suggestions */}
      {(taglines.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400 uppercase tracking-wider mb-3">
            {taglines.length > 1 ? 'Sugerencias de Tagline' : 'Tagline'}
          </p>
          {isEditing ? (
            <EditableTags items={data.tagline_suggestions || (data.messaging?.tagline ? [data.messaging.tagline] : [])} onChange={change('tagline_suggestions') as (v: string[]) => void} color="amber" placeholder="Agregar tagline..." />
          ) : (
            taglines.map((tagline, i) => (
              <p key={i} className="text-sm text-white font-medium italic mb-1">"{tagline}"</p>
            ))
          )}
        </div>
      )}

      {/* Key Messages */}
      {(keyMessages.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Mensajes Clave</p>
          {isEditing ? (
            <EditableTags items={data.key_messages || data.messaging?.key_messages || []} onChange={change('key_messages') as (v: string[]) => void} color="purple" placeholder="Agregar mensaje..." />
          ) : (
            <ul className="space-y-2">
              {keyMessages.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-purple-400 font-medium mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Elevator Pitch */}
      {(data.messaging?.elevator_pitch || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Elevator Pitch</p>
          {isEditing ? (
            <EditableText value={data.messaging?.elevator_pitch} onChange={change('messaging.elevator_pitch') as (v: string) => void} multiline placeholder="Elevator pitch..." />
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed">{data.messaging?.elevator_pitch}</p>
          )}
        </div>
      )}
    </div>
  );
}
