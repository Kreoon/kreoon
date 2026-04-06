/**
 * FeaturedMediaSelector - Selector de imagen destacada para el marketplace
 *
 * Permite al creador seleccionar qué imagen/video de su portafolio
 * se mostrará como destacada en las tarjetas del marketplace.
 */

import { useState } from 'react';
import { Star, ImagePlus, X, Loader2, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useFeaturedMedia } from '@/hooks/useFeaturedMedia';
import { getOptimizedThumbnail } from '@/lib/imageOptimization';

interface FeaturedMediaSelectorProps {
  creatorProfileId: string;
  currentFeaturedUrl?: string | null;
  currentFeaturedType?: 'image' | 'video' | null;
}

interface PortfolioItemOption {
  id: string;
  url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  title: string | null;
}

export function FeaturedMediaSelector({
  creatorProfileId,
  currentFeaturedUrl,
  currentFeaturedType,
}: FeaturedMediaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: setFeaturedMedia, isPending } = useFeaturedMedia();

  // Estado local optimista para preview inmediata
  const [optimisticMedia, setOptimisticMedia] = useState<{
    url: string | null;
    type: 'image' | 'video' | null;
  } | null>(null);

  // Usar valor optimista si existe, sino el valor real del servidor
  const displayFeaturedUrl = optimisticMedia !== null ? optimisticMedia.url : currentFeaturedUrl;
  const displayFeaturedType = optimisticMedia !== null ? optimisticMedia.type : currentFeaturedType;

  // Obtener items del portafolio
  const { data: portfolioItems, isLoading } = useQuery({
    queryKey: ['portfolio-items-for-featured', creatorProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('id, media_url, thumbnail_url, media_type, title')
        .eq('creator_id', creatorProfileId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      // Mapear media_url a url para consistencia con el tipo
      return (data || []).map(item => ({
        ...item,
        url: item.media_url,
      })) as PortfolioItemOption[];
    },
    enabled: isOpen && !!creatorProfileId,
  });

  const handleSelect = (item: PortfolioItemOption) => {
    const optimisticUrl = item.thumbnail_url || item.url;
    console.log('[FeaturedMediaSelector] Seleccionando:', {
      itemId: item.id,
      optimisticUrl,
      mediaType: item.media_type,
    });

    // Actualización optimista inmediata
    setOptimisticMedia({
      url: optimisticUrl,
      type: item.media_type,
    });
    setIsOpen(false);

    setFeaturedMedia(
      { creatorProfileId, mediaId: item.id },
      {
        onSuccess: (data) => {
          console.log('[FeaturedMediaSelector] Éxito:', data);
        },
        onError: (error) => {
          console.error('[FeaturedMediaSelector] Error:', error);
          // Revertir si falla
          setOptimisticMedia(null);
        },
        onSettled: () => {
          // Limpiar estado optimista cuando el servidor responde
          // (el valor real vendrá de las props actualizadas)
          setTimeout(() => setOptimisticMedia(null), 500);
        },
      }
    );
  };

  const handleClear = () => {
    // Actualización optimista inmediata
    setOptimisticMedia({ url: null, type: null });

    setFeaturedMedia(
      { creatorProfileId, mediaId: null },
      {
        onSuccess: () => setIsOpen(false),
        onError: () => {
          // Revertir si falla
          setOptimisticMedia(null);
        },
        onSettled: () => {
          setTimeout(() => setOptimisticMedia(null), 500);
        },
      }
    );
  };

  const displayUrl = displayFeaturedUrl
    ? getOptimizedThumbnail(displayFeaturedUrl, 120, 160, 80)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium">Imagen destacada</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Esta imagen se mostrara en tu tarjeta del marketplace
      </p>

      {/* Preview actual */}
      <div className="relative">
        {displayUrl ? (
          <div className="relative aspect-[9/16] w-24 rounded-lg overflow-hidden bg-muted border border-border">
            <img
              src={displayUrl}
              alt="Imagen destacada"
              className="w-full h-full object-cover"
            />
            {displayFeaturedType === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
            <button
              onClick={handleClear}
              disabled={isPending}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
              aria-label="Quitar imagen destacada"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="aspect-[9/16] w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
            <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Star className="h-4 w-4 mr-2" />
        {displayFeaturedUrl ? 'Cambiar' : 'Seleccionar'}
      </Button>

      {/* Dialog de selección */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar imagen destacada</DialogTitle>
            <DialogDescription>
              Elige la imagen o video que se mostrara en tu tarjeta del marketplace
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : portfolioItems && portfolioItems.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {portfolioItems.map((item) => {
                  const thumbUrl = getOptimizedThumbnail(
                    item.thumbnail_url || item.url,
                    200,
                    280,
                    80
                  );
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      disabled={isPending}
                      className={cn(
                        'relative aspect-[9/16] rounded-lg overflow-hidden bg-muted',
                        'ring-2 ring-transparent hover:ring-primary/50 transition-all',
                        'focus:outline-none focus:ring-primary',
                        isPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <img
                        src={thumbUrl}
                        alt={item.title || 'Portfolio item'}
                        className="w-full h-full object-cover"
                      />
                      {item.media_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                      {item.title && (
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-xs text-white truncate">{item.title}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImagePlus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tienes contenido en tu portafolio
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sube videos o imagenes primero
                </p>
              </div>
            )}
          </div>

          {displayFeaturedUrl && (
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isPending}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Quitar imagen destacada
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
