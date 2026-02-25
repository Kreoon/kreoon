import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Download, Trash2, Clock, AlertCircle, Loader2, Copy, Zap, Eye, EyeOff, X, Globe, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { GeneratedBanner } from '../types/ad-generator.types';

interface ParsedCopy {
  headline: string;
  subheadline: string;
  cta: string;
  body?: string;
  badge?: string;
  // Meta Ad copy fields
  primary_text?: string;
  meta_headline?: string;
  meta_description?: string;
  meta_cta?: string;
}

function parseCopyText(raw: string | null): ParsedCopy | null {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.headline) return parsed as ParsedCopy;
  } catch {
    // not JSON — ignore
  }
  return null;
}

interface GeneratedBannerCardProps {
  banner: GeneratedBanner;
  onDelete?: (id: string) => void;
}

export function GeneratedBannerCard({ banner, onDelete }: GeneratedBannerCardProps) {
  const { toast } = useToast();
  const [showMeta, setShowMeta] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const parsedCopy = parseCopyText(banner.generated_copy);

  const downloadImage = useCallback(async () => {
    if (!banner.generated_image_url) return;
    try {
      const resp = await fetch(banner.generated_image_url);
      if (!resp.ok) throw new Error('Failed to fetch image');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banner-${banner.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error al descargar', variant: 'destructive' });
    }
  }, [banner, toast]);

  const handleCopyCopy = () => {
    if (!parsedCopy) return;
    const parts: string[] = [];
    // Meta Ads copy (what goes in Meta Ads Manager)
    parts.push('--- COPY PARA META ADS ---');
    parts.push(`Texto principal: ${primaryText}`);
    parts.push(`Título: ${metaHeadline}`);
    parts.push(`Descripción: ${metaDescription}`);
    parts.push(`CTA: ${metaCTA}`);
    // Image text (what's rendered in the banner)
    parts.push('');
    parts.push('--- TEXTO EN LA IMAGEN ---');
    parts.push(`Headline: ${parsedCopy.headline}`);
    parts.push(`Subheadline: ${parsedCopy.subheadline}`);
    if (parsedCopy.badge) parts.push(`Badge: ${parsedCopy.badge}`);
    parts.push(`CTA: ${parsedCopy.cta}`);
    navigator.clipboard.writeText(parts.join('\n'));
    toast({ title: 'Copy para Ads copiado al portapapeles' });
  };

  const isLoading = banner.status === 'pending' || banner.status === 'generating';
  const isFailed = banner.status === 'failed';
  const providerLabel = banner.ai_model === 'nano-banana-pro' ? 'NanoBanana' : banner.ai_provider === 'fal' ? 'Flux' : banner.ai_provider;

  const primaryText = parsedCopy?.primary_text || parsedCopy?.body || parsedCopy?.subheadline || '';
  const metaHeadline = parsedCopy?.meta_headline || parsedCopy?.headline || '';
  const metaDescription = parsedCopy?.meta_description || parsedCopy?.subheadline || '';
  const metaCTA = parsedCopy?.meta_cta || 'Más información';

  return (
    <>
      {/* Meta Ad Preview Card */}
      <div className={cn(
        "rounded-lg border border-border bg-card overflow-hidden group",
        isFailed && "border-destructive/30",
      )}>
        {/* Meta-style header: brand + sponsored */}
        {banner.status === 'completed' && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground leading-tight truncate">
                  {providerLabel || 'Ad'}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  Sponsored · <Globe className="h-2.5 w-2.5" />
                </p>
              </div>
              {/* Toggle metadata panel */}
              {parsedCopy && (
                <button
                  onClick={() => setShowMeta((v) => !v)}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  title={showMeta ? 'Ocultar copy' : 'Mostrar copy'}
                >
                  {showMeta ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            {/* Primary text (above image in Meta) */}
            {showMeta && primaryText && (
              <p className="text-[11px] text-foreground mt-2 line-clamp-3 leading-relaxed">
                {primaryText}
              </p>
            )}
          </div>
        )}

        {/* Image area — clickable */}
        <div
          className={cn(
            "relative bg-muted/30 cursor-pointer",
            banner.output_size === '9:16' ? 'aspect-[9/16]' :
            banner.output_size === '4:5' ? 'aspect-[4/5]' :
            banner.output_size === '16:9' ? 'aspect-video' :
            banner.output_size === '3:2' ? 'aspect-[3/2]' :
            'aspect-square'
          )}
          onClick={() => banner.generated_image_url && setLightboxOpen(true)}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {isFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-xs text-destructive text-center">{banner.error_message || 'Error al generar'}</p>
            </div>
          )}
          {banner.generated_image_url && (
            <>
              <img
                src={banner.generated_image_url}
                alt="Banner generado"
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Meta-style footer: titulo + descripcion + CTA */}
        {banner.status === 'completed' && showMeta && parsedCopy && (
          <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">kreoon.com</p>
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">{metaHeadline}</p>
                {metaDescription && metaDescription !== metaHeadline && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{metaDescription}</p>
                )}
              </div>
              <div className="shrink-0">
                <span className="text-[10px] font-medium text-white bg-primary px-2.5 py-1 rounded whitespace-nowrap">
                  {metaCTA}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Meta-style engagement bar */}
        {banner.status === 'completed' && showMeta && (
          <div className="px-3 py-1.5 border-t border-border/30 flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px]"><ThumbsUp className="h-3 w-3" /> Me gusta</span>
              <span className="flex items-center gap-1 text-[10px]"><MessageCircle className="h-3 w-3" /> Comentar</span>
              <span className="flex items-center gap-1 text-[10px]"><Share2 className="h-3 w-3" /> Compartir</span>
            </div>
          </div>
        )}

        {/* Ad copy fields panel */}
        {banner.status === 'completed' && showMeta && parsedCopy && (
          <div className="px-3 py-2 border-t border-border/30 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Copy para Ads</p>
            <div className="space-y-1 text-[11px]">
              <div>
                <span className="text-muted-foreground font-medium">Texto principal: </span>
                <span className="text-foreground">{primaryText}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Titulo: </span>
                <span className="text-foreground font-semibold">{metaHeadline}</span>
              </div>
              {metaDescription && (
                <div>
                  <span className="text-muted-foreground font-medium">Descripcion: </span>
                  <span className="text-foreground">{metaDescription}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground font-medium">CTA: </span>
                <span className="text-primary font-medium">{metaCTA}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions bar */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-1">
            <Clock className="h-3 w-3" />
            {banner.generation_time_ms
              ? `${(banner.generation_time_ms / 1000).toFixed(1)}s`
              : banner.status}
            <span className="mx-1">·</span>
            <span className="capitalize">{banner.output_size}</span>
          </div>
          {parsedCopy && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCopy} title="Copiar copy">
              <Copy className="h-3 w-3" />
            </Button>
          )}
          {banner.generated_image_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadImage} title="Descargar">
              <Download className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
              onClick={() => onDelete(banner.id)}
              title="Eliminar"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Lightbox popup */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95 border-none [&>button]:hidden">
          <DialogTitle className="sr-only">Vista previa del banner</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {banner.generated_image_url && (
              <img
                src={banner.generated_image_url}
                alt="Banner generado"
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
            {/* Bottom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 bg-white/10 hover:bg-white/20 text-white border-none"
                onClick={downloadImage}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              {parsedCopy && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 bg-white/10 hover:bg-white/20 text-white border-none"
                  onClick={handleCopyCopy}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar copy
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
