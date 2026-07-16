import { memo, useMemo } from 'react';
import { LayoutTemplate, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

// Bloque para importar diseño externo (Figma, o una imagen ya exportada de
// Gamma/Stitch/Canva/etc). A diferencia de VideoEmbedBlock, esto valida el
// HOSTNAME exacto de la URL (no un `includes()` de substring) y el iframe de
// Figma lleva `sandbox` — nunca se acepta HTML/script arbitrario de un
// dominio no confiable. Una imagen no corre ningún riesgo de por sí (no
// ejecuta script), por eso es la opción "segura por diseño" para
// Gamma/Stitch/Canva, que no tienen un embed oficial equivalente al de Figma.

type DesignProvider = 'figma' | 'image' | 'unknown';

interface ExternalDesignContent {
  source_url?: string;
  figma_embed_url?: string;
  image_url?: string;
  provider?: DesignProvider;
  title?: string;
}

const ALLOWED_FIGMA_HOSTS = new Set(['www.figma.com', 'figma.com']);

const borderRadiusClasses: Record<string, string> = {
  none: '',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-2xl',
};

export function detectDesignProvider(url: string): DesignProvider {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return 'unknown';
    if (ALLOWED_FIGMA_HOSTS.has(parsed.hostname.toLowerCase())) return 'figma';
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(parsed.pathname)) return 'image';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function buildFigmaEmbedUrl(sourceUrl: string): string {
  const params = new URLSearchParams({ embed_host: 'kreoon', url: sourceUrl });
  return `https://www.figma.com/embed?${params.toString()}`;
}

function ExternalDesignBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const content = block.content as ExternalDesignContent;
  const styles = block.styles;

  const provider = useMemo(
    () => content.provider ?? (content.source_url ? detectDesignProvider(content.source_url) : 'unknown'),
    [content.provider, content.source_url]
  );

  const handleUrlChange = (url: string) => {
    const detected = detectDesignProvider(url);
    onUpdate({
      content: {
        ...content,
        source_url: url,
        provider: detected,
        figma_embed_url: detected === 'figma' ? buildFigmaEmbedUrl(url) : undefined,
        image_url: detected === 'image' ? url : undefined,
      },
    });
  };

  const containerBorderRadius = borderRadiusClasses[styles.borderRadius || 'md'];

  return (
    <div className={cn(containerBorderRadius)} style={getBlockStyleObject(styles)}>
      {isEditing && isSelected && (
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Link de Figma o URL de una imagen exportada (Gamma, Stitch, Canva)
          </label>
          <Input
            value={content.source_url || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.figma.com/file/... o https://.../diseno.png"
            className="bg-transparent border-border/50"
          />
          {content.source_url && provider !== 'unknown' && (
            <p className="text-xs text-primary mt-1">Fuente detectada: {provider === 'figma' ? 'Figma' : 'Imagen'}</p>
          )}
        </div>
      )}

      {provider === 'figma' && content.figma_embed_url ? (
        <div className={cn('relative w-full overflow-hidden', containerBorderRadius)} style={{ minHeight: '480px' }}>
          <iframe
            src={content.figma_embed_url}
            title={content.title || 'Diseño de Figma'}
            loading="lazy"
            allow="fullscreen"
            // Restringe el iframe al mínimo que Figma necesita para renderizar
            // (scripts propios + su mismo origen) — nunca top-navigation,
            // forms, ni modals que puedan usarse para phishing.
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      ) : provider === 'image' && content.image_url ? (
        <img
          src={content.image_url}
          alt={content.title || 'Diseño importado'}
          loading="lazy"
          className={cn('w-full h-auto', containerBorderRadius)}
        />
      ) : (
        <div
          className={cn(
            'w-full aspect-video bg-muted/30 border border-border/50 flex flex-col items-center justify-center gap-3',
            containerBorderRadius
          )}
        >
          {content.source_url && provider === 'unknown' ? (
            <>
              <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Fuente no soportada. Usá un link de Figma o una URL de imagen (.png/.jpg/.webp).
              </p>
            </>
          ) : (
            <>
              <LayoutTemplate className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Pegá un link de Figma o una imagen arriba' : 'Sin diseño configurado'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const ExternalDesignBlock = memo(ExternalDesignBlockComponent);
