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
  'The Innocent':   { emoji: '🕊️', color: 'from-sky-50 dark:from-sky-950/30 to-blue-50 dark:to-blue-950/30 border-sky-200 dark:border-sky-800' },
  'The Sage':       { emoji: '🦉', color: 'from-indigo-50 dark:from-indigo-950/30 to-violet-50 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800' },
  'The Explorer':   { emoji: '🧭', color: 'from-teal-50 dark:from-teal-950/30 to-cyan-50 dark:to-cyan-950/30 border-teal-200 dark:border-teal-800' },
  'The Outlaw':     { emoji: '🔥', color: 'from-red-50 dark:from-red-950/30 to-orange-50 dark:to-orange-950/30 border-red-200 dark:border-red-800' },
  'The Magician':   { emoji: '✨', color: 'from-purple-50 dark:from-purple-950/30 to-fuchsia-50 dark:to-fuchsia-950/30 border-purple-200 dark:border-purple-800' },
  'The Hero':       { emoji: '⚔️', color: 'from-amber-50 dark:from-amber-950/30 to-yellow-50 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800' },
  'The Lover':      { emoji: '❤️', color: 'from-rose-50 dark:from-rose-950/30 to-pink-50 dark:to-pink-950/30 border-rose-200 dark:border-rose-800' },
  'The Jester':     { emoji: '🃏', color: 'from-yellow-50 dark:from-yellow-950/30 to-lime-50 dark:to-lime-950/30 border-yellow-200 dark:border-yellow-800' },
  'The Everyman':   { emoji: '🤝', color: 'from-stone-50 dark:from-stone-950/30 to-gray-50 dark:to-gray-950/30 border-stone-200 dark:border-stone-800' },
  'The Caregiver':  { emoji: '💚', color: 'from-green-50 dark:from-green-950/30 to-emerald-50 dark:to-emerald-950/30 border-green-200 dark:border-green-800' },
  'The Ruler':      { emoji: '👑', color: 'from-amber-50 dark:from-amber-950/30 to-orange-50 dark:to-orange-950/30 border-amber-200 dark:border-amber-800' },
  'The Creator':    { emoji: '🎨', color: 'from-pink-50 dark:from-pink-950/30 to-violet-50 dark:to-violet-950/30 border-pink-200 dark:border-pink-800' },
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
        <div className={`p-5 rounded-lg bg-gradient-to-br ${archetypeConfig?.color || 'from-violet-50 dark:from-violet-950/30 to-purple-50 dark:to-purple-950/30 border-violet-200 dark:border-violet-800'} border`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{archetypeConfig?.emoji || '🎭'}</span>
            <div className="flex-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Arquetipo de Marca</p>
              {isEditing ? (
                <EditableText value={archetype} onChange={change('brand_archetype') as (v: string) => void} placeholder="Arquetipo..." />
              ) : (
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{archetype}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personality Traits */}
      {(data.personality_traits?.length > 0 || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Rasgos de Personalidad</p>
          {isEditing ? (
            <EditableTags items={data.personality_traits || []} onChange={change('personality_traits') as (v: string[]) => void} color="purple" placeholder="Agregar rasgo..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.personality_traits?.map((trait, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-xs text-purple-600 dark:text-purple-300">
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
            <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                <p className="text-sm font-medium text-pink-600 dark:text-pink-400">Tono de Voz</p>
              </div>
              {isEditing ? (
                <EditableText value={data.tone_of_voice || (data.voice?.tone?.join(', ') ?? '')} onChange={change('tone_of_voice') as (v: string) => void} placeholder="Tono de voz..." />
              ) : (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{toneOfVoice}</p>
              )}
            </div>
          )}
          {(data.communication_style || isEditing) && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Estilo de Comunicación</p>
              </div>
              {isEditing ? (
                <EditableText value={data.communication_style} onChange={change('communication_style') as (v: string) => void} placeholder="Estilo de comunicación..." />
              ) : (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{data.communication_style}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Do Say / Don't Say */}
      {(data.voice?.do_say?.length > 0 || data.voice?.dont_say?.length > 0 || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.voice?.do_say?.length > 0 || isEditing) && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">Sí Dice</p>
              {isEditing ? (
                <EditableTags items={data.voice?.do_say || []} onChange={change('voice.do_say') as (v: string[]) => void} color="emerald" placeholder="Agregar frase..." />
              ) : (
                <ul className="space-y-2">
                  {data.voice?.do_say?.map((phrase, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      {phrase}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {(data.voice?.dont_say?.length > 0 || isEditing) && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">No Dice</p>
              {isEditing ? (
                <EditableTags items={data.voice?.dont_say || []} onChange={change('voice.dont_say') as (v: string[]) => void} color="red" placeholder="Agregar frase..." />
              ) : (
                <ul className="space-y-2">
                  {data.voice?.dont_say?.map((phrase, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <X className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
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
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
            {taglines.length > 1 ? 'Sugerencias de Tagline' : 'Tagline'}
          </p>
          {isEditing ? (
            <EditableTags items={data.tagline_suggestions || (data.messaging?.tagline ? [data.messaging.tagline] : [])} onChange={change('tagline_suggestions') as (v: string[]) => void} color="amber" placeholder="Agregar tagline..." />
          ) : (
            taglines.map((tagline, i) => (
              <p key={i} className="text-sm text-zinc-900 dark:text-zinc-100 font-medium italic mb-1">"{tagline}"</p>
            ))
          )}
        </div>
      )}

      {/* Key Messages */}
      {(keyMessages.length > 0 || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Mensajes Clave</p>
          {isEditing ? (
            <EditableTags items={data.key_messages || data.messaging?.key_messages || []} onChange={change('key_messages') as (v: string[]) => void} color="purple" placeholder="Agregar mensaje..." />
          ) : (
            <ul className="space-y-2">
              {keyMessages.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="text-purple-600 dark:text-purple-400 font-medium mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Elevator Pitch */}
      {(data.messaging?.elevator_pitch || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Elevator Pitch</p>
          {isEditing ? (
            <EditableText value={data.messaging?.elevator_pitch} onChange={change('messaging.elevator_pitch') as (v: string) => void} multiline placeholder="Elevator pitch..." />
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.messaging?.elevator_pitch}</p>
          )}
        </div>
      )}
    </div>
  );
}
