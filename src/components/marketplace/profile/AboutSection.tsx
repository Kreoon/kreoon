import { useState } from 'react';
import { Globe, Clock, Smartphone } from 'lucide-react';
import type { CreatorFullProfile } from '../types/marketplace';

interface AboutSectionProps {
  creator: CreatorFullProfile;
}

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
          className={`text-gray-300 text-base leading-relaxed whitespace-pre-line ${
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
      </div>
    </div>
  );
}
