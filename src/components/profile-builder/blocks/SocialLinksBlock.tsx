import { memo } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '../types/profile-builder';

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

interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

interface SocialLinksConfig {
  layout: 'horizontal' | 'vertical';
  showLabels: boolean;
}

interface SocialLinksContent {
  title?: string;
  links?: SocialLink[];
}

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; bgColor: string; placeholder: string }
> = {
  instagram: {
    label: 'Instagram',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10 hover:bg-pink-500/20',
    placeholder: 'https://instagram.com/usuario',
  },
  tiktok: {
    label: 'TikTok',
    color: 'text-foreground',
    bgColor: 'bg-foreground/10 hover:bg-foreground/20',
    placeholder: 'https://tiktok.com/@usuario',
  },
  youtube: {
    label: 'YouTube',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
    placeholder: 'https://youtube.com/@canal',
  },
  twitter: {
    label: 'X / Twitter',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10 hover:bg-sky-500/20',
    placeholder: 'https://twitter.com/usuario',
  },
  facebook: {
    label: 'Facebook',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10 hover:bg-blue-600/20',
    placeholder: 'https://facebook.com/pagina',
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    placeholder: 'https://linkedin.com/in/usuario',
  },
  twitch: {
    label: 'Twitch',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    placeholder: 'https://twitch.tv/usuario',
  },
  pinterest: {
    label: 'Pinterest',
    color: 'text-red-600',
    bgColor: 'bg-red-600/10 hover:bg-red-600/20',
    placeholder: 'https://pinterest.com/usuario',
  },
  snapchat: {
    label: 'Snapchat',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 hover:bg-yellow-400/20',
    placeholder: 'https://snapchat.com/add/usuario',
  },
  discord: {
    label: 'Discord',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    placeholder: 'https://discord.gg/servidor',
  },
  telegram: {
    label: 'Telegram',
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10 hover:bg-sky-400/20',
    placeholder: 'https://t.me/usuario',
  },
  whatsapp: {
    label: 'WhatsApp',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20',
    placeholder: 'https://wa.me/573001234567',
  },
  website: {
    label: 'Sitio Web',
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
    placeholder: 'https://tusitio.com',
  },
  other: {
    label: 'Otro',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30 hover:bg-muted/50',
    placeholder: 'https://...',
  },
};

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  instagram: 'IG',
  tiktok: 'TK',
  youtube: 'YT',
  twitter: 'X',
  facebook: 'FB',
  linkedin: 'LI',
  twitch: 'TV',
  pinterest: 'PT',
  snapchat: 'SC',
  discord: 'DC',
  telegram: 'TG',
  whatsapp: 'WA',
  website: 'WEB',
  other: '?',
};

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as SocialPlatform[];

const DEFAULT_LINKS: SocialLink[] = [
  { platform: 'instagram', url: '' },
  { platform: 'tiktok', url: '' },
  { platform: 'youtube', url: '' },
];

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

function SocialLinksBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as SocialLinksConfig;
  const content = block.content as SocialLinksContent;
  const styles = block.styles;
  const links = content.links || DEFAULT_LINKS;

  const handleContentUpdate = (updates: Partial<SocialLinksContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateLink = (index: number, updates: Partial<SocialLink>) => {
    const newLinks = links.map((link, i) =>
      i === index ? { ...link, ...updates } : link
    );
    handleContentUpdate({ links: newLinks });
  };

  const handleAddLink = () => {
    const usedPlatforms = links.map((l) => l.platform);
    const nextPlatform = ALL_PLATFORMS.find((p) => !usedPlatforms.includes(p)) || 'other';
    handleContentUpdate({ links: [...links, { platform: nextPlatform, url: '' }] });
  };

  const handleRemoveLink = (index: number) => {
    handleContentUpdate({ links: links.filter((_, i) => i !== index) });
  };

  const visibleLinks = links.filter((l) => l.url || isEditing);

  return (
    <div
      className={cn('rounded-lg', paddingClasses[styles.padding || 'sm'])}
      style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}
    >
      {/* Titulo opcional */}
      {(content.title || (isEditing && isSelected)) && (
        <div className="mb-4">
          {isEditing && isSelected ? (
            <input
              type="text"
              value={content.title || ''}
              onChange={(e) => handleContentUpdate({ title: e.target.value })}
              placeholder="Sigueme en mis redes (opcional)"
              className="text-lg font-semibold text-foreground bg-transparent border-none w-full focus:outline-none focus:ring-1 focus:ring-primary rounded"
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{content.title}</h2>
          )}
        </div>
      )}

      {/* Modo edicion: lista con inputs */}
      {isEditing && isSelected ? (
        <div className="flex flex-col gap-3">
          {links.map((link, index) => {
            const meta = PLATFORM_META[link.platform];
            return (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={link.platform}
                  onChange={(e) =>
                    handleUpdateLink(index, { platform: e.target.value as SocialPlatform })
                  }
                  className="text-sm bg-card border border-border/50 rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_META[p].label}
                    </option>
                  ))}
                </select>
                <Input
                  value={link.url}
                  onChange={(e) => handleUpdateLink(index, { url: e.target.value })}
                  placeholder={meta.placeholder}
                  className="flex-1 bg-transparent border-border/50 text-sm"
                />
                <button
                  onClick={() => handleRemoveLink(index)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  aria-label={`Eliminar ${meta.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddLink}
            className="gap-1 self-start"
          >
            <Plus className="h-4 w-4" />
            Agregar red social
          </Button>
        </div>
      ) : (
        /* Modo preview */
        <div
          className={cn(
            'flex flex-wrap gap-3',
            config.layout === 'vertical' ? 'flex-col' : 'flex-row',
          )}
        >
          {visibleLinks.map((link, index) => {
            const meta = PLATFORM_META[link.platform];
            return (
              <a
                key={index}
                href={link.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
                  meta.bgColor,
                  config.layout === 'vertical' ? 'w-full' : '',
                )}
                aria-label={`Visitar ${meta.label}`}
              >
                <span
                  className={cn('text-xs font-bold w-8 text-center flex-shrink-0', meta.color)}
                >
                  {PLATFORM_ICONS[link.platform]}
                </span>
                {config.showLabels && (
                  <>
                    <span className={cn('text-sm font-medium', meta.color)}>{meta.label}</span>
                    {config.layout === 'vertical' && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    )}
                  </>
                )}
              </a>
            );
          })}

          {visibleLinks.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Sin redes sociales configuradas</p>
          )}
        </div>
      )}
    </div>
  );
}

export const SocialLinksBlock = memo(SocialLinksBlockComponent);
