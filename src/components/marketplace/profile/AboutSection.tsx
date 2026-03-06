import { useState } from 'react';
import { Globe, Clock, Smartphone, Award, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorFullProfile } from '../types/marketplace';

interface AboutSectionProps {
  creator: CreatorFullProfile;
}

const EXPERIENCE_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Principiante', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  intermediate: { label: 'Intermedio', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  advanced: { label: 'Avanzado', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  expert: { label: 'Experto', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

/** Strip contact info from bio text: emails, phone numbers, URLs, WhatsApp mentions, @handles */
function sanitizeBio(text: string): string {
  return text
    // Emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[contacto oculto]')
    // URLs (http/https/www)
    .replace(/(?:https?:\/\/|www\.)[^\s]+/gi, '[enlace oculto]')
    // Phone numbers (international & local formats)
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '[contacto oculto]')
    // WhatsApp mentions
    .replace(/whatsapp\s*:?\s*[^\s,.]*/gi, '[contacto oculto]')
    // @handles (social media)
    .replace(/@[\w.]{3,}/g, '[usuario oculto]');
}

export function AboutSection({ creator }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const rawBio = creator.bio_full || creator.bio || '';
  const bio = sanitizeBio(rawBio);
  const isLong = bio.length > 300;
  const firstName = creator.display_name.split(' ')[0];

  return (
    <div className="pb-8 border-b border-white/10 space-y-4">
      <h2 className="text-xl font-semibold text-white">Sobre {firstName}</h2>

      <div className="relative">
        <p
          className={`text-foreground/80 text-base leading-relaxed whitespace-pre-line ${
            !expanded && isLong ? 'line-clamp-4' : ''
          }`}
        >
          {bio}
        </p>
        {isLong && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium mt-1 transition-colors"
          >
            Leer más ▾
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        {creator.languages.length > 0 && (
          <div className="flex items-center gap-2.5 text-gray-400 text-sm">
            <Globe className="h-4 w-4 flex-shrink-0" />
            <span>{creator.languages.join(', ')}</span>
          </div>
        )}
        {creator.delivery_time && (
          <div className="flex items-center gap-2.5 text-gray-400 text-sm">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>Tiempo de entrega: {creator.delivery_time}</span>
          </div>
        )}
        {creator.platforms.length > 0 && (
          <div className="flex items-center gap-2.5 text-gray-400 text-sm">
            <Smartphone className="h-4 w-4 flex-shrink-0" />
            <span>Plataformas: {creator.platforms.join(', ')}</span>
          </div>
        )}

        {/* Experience Level - from Talent DNA */}
        {creator.experience_level && EXPERIENCE_LABELS[creator.experience_level] && (
          <div className="flex items-center gap-2.5 text-sm">
            <Award className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium border',
                EXPERIENCE_LABELS[creator.experience_level].color
              )}
            >
              {EXPERIENCE_LABELS[creator.experience_level].label}
            </span>
          </div>
        )}

        {/* Content Style - from Talent DNA */}
        {creator.content_style?.tone_descriptors && creator.content_style.tone_descriptors.length > 0 && (
          <div className="flex items-start gap-2.5 text-sm">
            <Palette className="h-4 w-4 flex-shrink-0 text-gray-400 mt-0.5" />
            <div className="flex flex-wrap gap-1.5">
              {creator.content_style.tone_descriptors.slice(0, 5).map((style, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-gray-300 border border-white/10"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
