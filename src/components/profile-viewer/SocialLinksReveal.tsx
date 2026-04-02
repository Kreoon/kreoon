import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanViewCreatorContact } from '@/hooks/useCreatorPlanFeatures';
import type { CreatorTier } from '@/hooks/useCreatorPlanFeatures';

type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'twitch'
  | 'pinterest'
  | 'snapchat'
  | 'discord'
  | 'telegram'
  | 'whatsapp'
  | 'website'
  | 'other';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

interface SocialLinksRevealProps {
  creatorTier: CreatorTier;
  links: SocialLink[];
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
}

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  instagram: {
    label: 'Instagram',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    icon: 'IG',
  },
  tiktok: {
    label: 'TikTok',
    color: 'text-zinc-100',
    bgColor: 'bg-zinc-700/40',
    icon: 'TK',
  },
  youtube: {
    label: 'YouTube',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: 'YT',
  },
  twitter: {
    label: 'X / Twitter',
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    icon: 'X',
  },
  facebook: {
    label: 'Facebook',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    icon: 'FB',
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: 'LI',
  },
  twitch: {
    label: 'Twitch',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: 'TV',
  },
  pinterest: {
    label: 'Pinterest',
    color: 'text-red-600',
    bgColor: 'bg-red-600/10',
    icon: 'PT',
  },
  snapchat: {
    label: 'Snapchat',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    icon: 'SC',
  },
  discord: {
    label: 'Discord',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    icon: 'DC',
  },
  telegram: {
    label: 'Telegram',
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    icon: 'TG',
  },
  whatsapp: {
    label: 'WhatsApp',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: 'WA',
  },
  website: {
    label: 'Sitio Web',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: 'WEB',
  },
  other: {
    label: 'Otro',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    icon: '?',
  },
};

export function SocialLinksReveal({
  creatorTier,
  links,
  layout = 'horizontal',
  showLabels = false,
  className,
}: SocialLinksRevealProps) {
  const { revealSocials } = useCanViewCreatorContact(creatorTier);

  const visibleLinks = links.filter((l) => l.url.trim() !== '');

  if (visibleLinks.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap gap-3',
        layout === 'vertical' && 'flex-col',
        className,
      )}
      aria-label="Redes sociales del creador"
    >
      {visibleLinks.map((link, index) => {
        const meta = PLATFORM_META[link.platform] ?? PLATFORM_META['other'];

        // Plan free: iconos visibles pero sin link (efecto blur/deshabilitado)
        if (!revealSocials) {
          return (
            <div
              key={`${link.platform}-${index}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 cursor-not-allowed',
                'opacity-50 select-none',
                meta.bgColor,
                layout === 'vertical' && 'w-full',
              )}
              title="Disponible en plan Pro o superior"
              aria-label={`${meta.label} — requiere plan Pro`}
              role="img"
            >
              <span
                className={cn(
                  'text-xs font-bold w-8 text-center flex-shrink-0',
                  meta.color,
                )}
                aria-hidden="true"
              >
                {meta.icon}
              </span>
              {showLabels && (
                <span className={cn('text-sm font-medium blur-sm', meta.color)}>
                  {meta.label}
                </span>
              )}
            </div>
          );
        }

        // Plan pro o premium: link clickeable
        return (
          <a
            key={`${link.platform}-${index}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
              meta.bgColor,
              'hover:opacity-80',
              layout === 'vertical' && 'w-full',
            )}
            aria-label={`Visitar ${meta.label}`}
          >
            <span
              className={cn('text-xs font-bold w-8 text-center flex-shrink-0', meta.color)}
              aria-hidden="true"
            >
              {meta.icon}
            </span>
            {showLabels && (
              <>
                <span className={cn('text-sm font-medium', meta.color)}>{meta.label}</span>
                {layout === 'vertical' && (
                  <ExternalLink
                    className="h-3 w-3 text-muted-foreground ml-auto"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </a>
        );
      })}

      {/* Indicador de upgrade solo cuando hay links bloqueados */}
      {!revealSocials && visibleLinks.length > 0 && (
        <p className="w-full text-xs text-muted-foreground mt-1" role="note">
          Actualiza al plan Pro para ver los links
        </p>
      )}
    </div>
  );
}
