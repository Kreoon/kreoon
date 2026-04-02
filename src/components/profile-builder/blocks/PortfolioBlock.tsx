import { memo, useState, useMemo } from 'react';
import { Play, Plus, Camera, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';
import { isBunnyUrl } from './BunnyStreamPlayer';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { FullscreenVideoViewer } from '@/components/content/FullscreenVideoViewer';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';

interface PortfolioItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  title?: string;
}

interface PortfolioConfig {
  layout: 'grid' | 'masonry' | 'featured';
  columns: 2 | 3 | 4;
  showTitles: boolean;
  maxItems?: number;
}

interface PortfolioContent {
  items?: PortfolioItem[];
}

function PortfolioBlockComponent({ block, isEditing, isSelected, onUpdate, userId, creatorProfileId }: BlockProps) {
  const config = block.config as PortfolioConfig;
  const content = block.content as PortfolioContent;
  const styles = block.styles;
  const items = content.items || [];
  const maxItems = config.maxItems || 9;

  // Estado para media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // Estado para video player modal tipo TikTok (solo en modo público)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Función para obtener thumbnail correcto (prioriza Bunny CDN)
  const getEffectiveThumbnail = useMemo(() => {
    return (item: PortfolioItem): string | undefined => {
      // Si ya tiene thumbnailUrl que no es de Bunny video, usarla
      if (item.thumbnailUrl && !item.thumbnailUrl.includes('playlist.m3u8')) {
        // Si es un video de Bunny, obtener el thumbnail de Bunny CDN
        if (item.type === 'video' && isBunnyUrl(item.url)) {
          const bunnyUrls = getBunnyVideoUrls(item.url);
          if (bunnyUrls?.thumbnail) {
            return bunnyUrls.thumbnail;
          }
        }
        return item.thumbnailUrl;
      }
      // Si es video de Bunny, obtener thumbnail de Bunny CDN
      if (item.type === 'video' && isBunnyUrl(item.url)) {
        const bunnyUrls = getBunnyVideoUrls(item.url);
        return bunnyUrls?.thumbnail || item.url;
      }
      // Fallback a la URL del item
      return item.url;
    };
  }, []);

  // Convertir items a formato para FullscreenVideoViewer
  const viewerItems = useMemo(() => {
    return items.map((item) => {
      const bunnyUrls = item.type === 'video' ? getBunnyVideoUrls(item.url) : null;
      return {
        id: item.id,
        title: item.title || '',
        videoUrls: item.type === 'video' ? [item.url] : [],
        thumbnailUrl: getEffectiveThumbnail(item),
        viewsCount: 0,
        likesCount: 0,
        isLiked: false,
        mediaType: item.type as 'video' | 'image',
        mediaUrl: item.url,
        caption: item.title || '',
      };
    });
  }, [items, getEffectiveThumbnail]);

  // Abrir visor en un índice específico
  const openViewer = (index: number) => {
    setViewerInitialIndex(index);
    setViewerOpen(true);
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const columnsClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  const handleAddItem = () => {
    if (userId) {
      setEditingItemId(null);
      setMediaPickerOpen(true);
    }
  };

  const handleEditItem = (itemId: string) => {
    setEditingItemId(itemId);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (editingItemId) {
      // Actualizar item existente
      const updatedItems = items.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              url: media.url,
              thumbnailUrl: media.thumbnail_url || media.url,
              type: media.type === 'video' ? 'video' as const : 'image' as const,
            }
          : item
      );
      onUpdate({ content: { ...content, items: updatedItems } });
    } else {
      // Agregar nuevo item
      const newItem: PortfolioItem = {
        id: crypto.randomUUID(),
        type: media.type === 'video' ? 'video' : 'image',
        url: media.url,
        thumbnailUrl: media.thumbnail_url || media.url,
        title: media.title || '',
      };
      onUpdate({ content: { ...content, items: [...items, newItem] } });
    }
    setMediaPickerOpen(false);
    setEditingItemId(null);
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdate({ content: { ...content, items: items.filter((i) => i.id !== itemId) } });
  };

  return (
    <div className={cn(paddingClasses[styles.padding || 'md'])}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Portfolio</h2>
        {isEditing && isSelected && items.length < maxItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>

      {/* Grid */}
      {items.length > 0 ? (
        <div
          className={cn(
            'grid gap-3',
            columnsClasses[config.columns || 3],
          )}
        >
          {items.slice(0, maxItems).map((item) => (
            <div
              key={item.id}
              className={cn(
                'group relative aspect-[9/16] rounded-lg overflow-hidden bg-muted cursor-pointer',
                'hover:ring-2 hover:ring-primary/50 transition-all',
              )}
              onClick={() => {
                if (isEditing && isSelected && item.url) {
                  handleEditItem(item.id);
                } else if (!isEditing && item.url) {
                  // En modo público, abrir visor tipo TikTok
                  const itemIndex = items.findIndex((i) => i.id === item.id);
                  if (itemIndex >= 0) {
                    openViewer(itemIndex);
                  }
                }
              }}
            >
              {item.url ? (
                <>
                  <img
                    src={getEffectiveThumbnail(item)}
                    alt={item.title || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  {config.showTitles && item.title && (
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                      <p className="text-sm text-white truncate">{item.title}</p>
                    </div>
                  )}
                  {/* Overlay de edicion */}
                  {isEditing && isSelected && (
                    <>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Eliminar item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-muted-foreground"
                  onClick={() => isEditing && isSelected && handleEditItem(item.id)}
                >
                  <Plus className="h-8 w-8" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No tienes contenido en tu portfolio aun
          </p>
          {isEditing && isSelected && (
            <Button variant="outline" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar contenido
            </Button>
          )}
        </div>
      )}

      {/* Media Library Picker */}
      {userId && (
        <MediaLibraryPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleMediaSelect}
          allowedTypes={['image', 'video']}
          userId={userId}
          creatorProfileId={creatorProfileId}
        />
      )}

      {/* Visor tipo TikTok con scroll infinito */}
      {viewerOpen && viewerItems.length > 0 && (
        <VideoPlayerProvider>
          <FullscreenVideoViewer
            videos={viewerItems}
            initialIndex={viewerInitialIndex}
            onClose={() => setViewerOpen(false)}
          />
        </VideoPlayerProvider>
      )}
    </div>
  );
}

export const PortfolioBlock = memo(PortfolioBlockComponent);
