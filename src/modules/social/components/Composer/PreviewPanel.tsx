import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PlatformIcon } from '../common/PlatformIcon';
import { PLATFORMS } from '../../config';
import type { SocialPlatform } from '../../types/social.types';

interface PreviewPanelProps {
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  thumbnailUrl: string | null;
  platforms: SocialPlatform[];
  username?: string;
}

export function PreviewPanel({ caption, hashtags, mediaUrls, thumbnailUrl, platforms, username = 'tu_cuenta' }: PreviewPanelProps) {
  const fullCaption = useMemo(() => {
    const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '';
    return caption + hashtagStr;
  }, [caption, hashtags]);

  const activePlatform = platforms[0] || 'instagram';

  return (
    <Card className="bg-muted/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={activePlatform} size="xs" />
          <CardTitle className="text-xs text-muted-foreground">
            Vista previa - {PLATFORMS[activePlatform]?.name || activePlatform}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mock post layout */}
        <div className="bg-card rounded-lg overflow-hidden border">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div>
              <p className="text-xs font-semibold">@{username}</p>
              <p className="text-[10px] text-muted-foreground">Ahora</p>
            </div>
          </div>

          {/* Media */}
          {(thumbnailUrl || mediaUrls.length > 0) && (
            <div className="aspect-square bg-muted relative">
              <img
                src={thumbnailUrl || mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
              {mediaUrls.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  1/{mediaUrls.length}
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div className="p-3">
            <p className="text-xs whitespace-pre-wrap break-words">
              {fullCaption.length > 300
                ? fullCaption.slice(0, 300) + '...'
                : fullCaption || 'Tu caption aquí...'}
            </p>
          </div>

          {/* Character count per platform */}
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {platforms.map(p => {
              const config = PLATFORMS[p];
              if (!config) return null;
              const over = fullCaption.length > config.maxCaptionLength;
              return (
                <span
                  key={p}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    over ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {config.name}: {fullCaption.length}/{config.maxCaptionLength}
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
