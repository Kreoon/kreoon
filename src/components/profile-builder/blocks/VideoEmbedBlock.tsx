import { memo, useMemo } from 'react';
import { Video, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '../types/profile-builder';
import { BunnyStreamPlayer, isBunnyUrl } from './BunnyStreamPlayer';
import { getBlockStyleObject } from './blockStyles';

type VideoProvider = 'youtube' | 'vimeo' | 'bunny' | 'unknown';

interface VideoEmbedConfig {
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
}

interface VideoEmbedContent {
  url?: string;
  provider?: VideoProvider;
}

const borderRadiusClasses: Record<string, string> = {
  none: '',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-2xl',
};

function detectProvider(url: string): VideoProvider {
  if (!url) return 'unknown';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('bunnycdn') || lower.includes('b-cdn.net') || lower.includes('iframe.mediadelivery.net'))
    return 'bunny';
  return 'unknown';
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function buildEmbedUrl(url: string, provider: VideoProvider, config: VideoEmbedConfig): string | null {
  if (!url) return null;

  switch (provider) {
    case 'youtube': {
      const id = extractYoutubeId(url);
      if (!id) return null;
      const params = new URLSearchParams();
      if (config.autoplay) params.set('autoplay', '1');
      if (config.muted) params.set('mute', '1');
      if (!config.controls) params.set('controls', '0');
      params.set('rel', '0');
      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }
    case 'vimeo': {
      const id = extractVimeoId(url);
      if (!id) return null;
      const params = new URLSearchParams();
      if (config.autoplay) params.set('autoplay', '1');
      if (config.muted) params.set('muted', '1');
      if (!config.controls) params.set('controls', '0');
      return `https://player.vimeo.com/video/${id}?${params.toString()}`;
    }
    case 'bunny': {
      // Si ya es una URL de iframe de bunny, usarla directamente
      if (url.includes('iframe.mediadelivery.net')) return url;
      return url;
    }
    default:
      return null;
  }
}

function VideoEmbedBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as VideoEmbedConfig;
  const content = block.content as VideoEmbedContent;
  const styles = block.styles;

  const provider = useMemo(
    () => content.url ? detectProvider(content.url) : 'unknown',
    [content.url],
  );

  const embedUrl = useMemo(
    () => content.url ? buildEmbedUrl(content.url, provider, config) : null,
    [content.url, provider, config],
  );

  const handleUrlChange = (url: string) => {
    const detectedProvider = detectProvider(url);
    onUpdate({
      content: { ...content, url, provider: detectedProvider },
    });
  };

  const containerBorderRadius = borderRadiusClasses[styles.borderRadius || 'md'];

  return (
    <div
      className={cn(containerBorderRadius)}
      style={getBlockStyleObject(styles)}
    >
      {/* Campo URL en edicion */}
      {isEditing && isSelected && (
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            URL del video (YouTube, Vimeo o Bunny CDN)
          </label>
          <Input
            value={content.url || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="bg-transparent border-border/50"
          />
          {content.url && provider !== 'unknown' && (
            <p className="text-xs text-primary mt-1">
              Proveedor detectado: {provider}
            </p>
          )}
        </div>
      )}

      {/* Player */}
      {content.url && provider === 'bunny' ? (
        <BunnyStreamPlayer
          videoUrl={content.url}
          autoplay={config.autoplay}
          muted={config.muted}
          preload={true}
          showSpeed={true}
          aspectRatio="16:9"
          borderRadius={styles.borderRadius || 'md'}
        />
      ) : embedUrl ? (
        <div
          className={cn(
            'relative w-full overflow-hidden',
            containerBorderRadius,
          )}
          style={{ paddingBottom: '56.25%' }}
        >
          <iframe
            src={embedUrl}
            title="Video embebido"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <div
          className={cn(
            'w-full aspect-video bg-muted/30 border border-border/50 flex flex-col items-center justify-center gap-3',
            containerBorderRadius,
          )}
        >
          {content.url && provider === 'unknown' ? (
            <>
              <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                URL no reconocida. Usa una URL de YouTube, Vimeo o Bunny CDN.
              </p>
            </>
          ) : (
            <>
              <Video className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Pega una URL de video arriba' : 'Sin video configurado'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const VideoEmbedBlock = memo(VideoEmbedBlockComponent);
