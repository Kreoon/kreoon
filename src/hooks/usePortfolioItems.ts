import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractBunnyIds } from '@/hooks/useHLSPlayer';

export interface PortfolioItemData {
  id: string;
  creator_id: string;
  title: string | null;
  description: string | null;
  media_type: 'video' | 'image' | 'carousel';
  media_url: string;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  duration_seconds: number | null;
  aspect_ratio: string;
  category: string | null;
  tags: string[];
  brand_name: string | null;
  views_count: number;
  likes_count: number;
  is_featured: boolean;
  is_public: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface UsePortfolioItemsOptions {
  creatorProfileId?: string;
}

interface UsePortfolioItemsReturn {
  items: PortfolioItemData[];
  loading: boolean;
  adding: boolean;
  addItem: (data: Partial<PortfolioItemData>) => Promise<PortfolioItemData | null>;
  updateItem: (id: string, data: Partial<PortfolioItemData>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  reorderItems: (orderedIds: string[]) => Promise<boolean>;
  togglePin: (id: string) => Promise<boolean>;
  uploadVideo: (file: File, creatorId: string, metadata?: { title?: string; category?: string }) => Promise<PortfolioItemData | null>;
  uploadImage: (file: File, creatorId: string, metadata?: { title?: string; category?: string }) => Promise<PortfolioItemData | null>;
  refresh: () => Promise<void>;
}

const mapRow = (row: Record<string, unknown>): PortfolioItemData => ({
  id: row.id as string,
  creator_id: row.creator_id as string,
  title: row.title as string | null,
  description: row.description as string | null,
  media_type: (row.media_type as 'video' | 'image' | 'carousel') || 'video',
  media_url: row.media_url as string || '',
  thumbnail_url: row.thumbnail_url as string | null,
  bunny_video_id: row.bunny_video_id as string | null,
  duration_seconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
  aspect_ratio: (row.aspect_ratio as string) || '9:16',
  category: row.category as string | null,
  tags: (row.tags as string[]) || [],
  brand_name: row.brand_name as string | null,
  views_count: Number(row.views_count) || 0,
  likes_count: Number(row.likes_count) || 0,
  is_featured: (row.is_featured as boolean) || false,
  is_public: row.is_public !== false,
  display_order: Number(row.display_order) || 0,
  created_at: row.created_at as string || '',
  updated_at: row.updated_at as string || '',
});

export function usePortfolioItems(options: UsePortfolioItemsOptions = {}): UsePortfolioItemsReturn {
  const { creatorProfileId } = options;
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!creatorProfileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('portfolio_items')
        .select('*')
        .eq('creator_id', creatorProfileId)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []).map(mapRow));
    } catch (err) {
      console.error('[usePortfolioItems] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorProfileId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (data: Partial<PortfolioItemData>): Promise<PortfolioItemData | null> => {
    if (!creatorProfileId) return null;

    setAdding(true);
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order)) : -1;

      const { data: row, error } = await (supabase as any)
        .from('portfolio_items')
        .insert({
          creator_id: creatorProfileId,
          title: data.title || null,
          description: data.description || null,
          media_type: data.media_type || 'video',
          media_url: data.media_url || '',
          thumbnail_url: data.thumbnail_url || null,
          bunny_video_id: data.bunny_video_id || null,
          duration_seconds: data.duration_seconds || null,
          aspect_ratio: data.aspect_ratio || '9:16',
          category: data.category || null,
          tags: data.tags || [],
          brand_name: data.brand_name || null,
          is_featured: data.is_featured || false,
          is_public: data.is_public !== false,
          display_order: maxOrder + 1,
        })
        .select('*')
        .single();

      if (error) throw error;

      const mapped = mapRow(row);
      setItems(prev => [...prev, mapped]);
      return mapped;
    } catch (err: any) {
      console.error('[usePortfolioItems] Error adding:', err);
      console.error('[usePortfolioItems] creatorProfileId:', creatorProfileId);
      const errorMsg = err?.message || err?.details || 'Error desconocido';
      toast.error(`Error guardando en base de datos: ${errorMsg}`);
      return null;
    } finally {
      setAdding(false);
    }
  }, [creatorProfileId, items]);

  const updateItem = useCallback(async (id: string, data: Partial<PortfolioItemData>): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('portfolio_items')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      return true;
    } catch (err) {
      console.error('[usePortfolioItems] Error updating:', err);
      toast.error('Error al actualizar item');
      return false;
    }
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Find the item to get Bunny CDN info before deleting
      const item = items.find(i => i.id === id);

      // ── 1. Delete from Bunny CDN ──────────────────────────────
      if (item) {
        if (item.media_type === 'video') {
          // Video stream: delete via bunny-delete-v2
          const videoId = item.bunny_video_id
            || (item.media_url ? extractBunnyIds(item.media_url)?.videoId : null);
          if (videoId) {
            const { error: bunnyErr } = await supabase.functions.invoke('bunny-delete-v2', {
              body: { videoId },
            });
            if (bunnyErr) {
              console.warn('[usePortfolioItems] Bunny video delete warning:', bunnyErr);
            }
          }
        } else if (item.media_type === 'image' && item.media_url) {
          // Image in Bunny Storage: extract storage path from CDN URL
          // URL format: https://{cdn-host}/marketplace/portfolio/{creatorId}/{file}
          const match = item.media_url.match(/b-cdn\.net\/(.+)$/i)
            || item.media_url.match(/\.b-cdn\.net\/(.+)$/i);
          if (match) {
            const storagePath = decodeURIComponent(match[1].split('?')[0]);
            const { error: bunnyErr } = await supabase.functions.invoke('bunny-raw-delete', {
              body: { storagePath },
            });
            if (bunnyErr) {
              console.warn('[usePortfolioItems] Bunny image delete warning:', bunnyErr);
            }
          }
        }
      }

      // ── 2. Delete from database ───────────────────────────────
      const { error } = await (supabase as any)
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item eliminado');
      return true;
    } catch (err) {
      console.error('[usePortfolioItems] Error deleting:', err);
      toast.error('Error al eliminar item');
      return false;
    }
  }, [items]);

  const reorderItems = useCallback(async (orderedIds: string[]): Promise<boolean> => {
    try {
      // Optimistic update
      const reordered = orderedIds.map((id, index) => {
        const item = items.find(i => i.id === id);
        return item ? { ...item, display_order: index } : null;
      }).filter(Boolean) as PortfolioItemData[];
      setItems(reordered);

      // Batch update in DB
      const updates = orderedIds.map((id, index) =>
        (supabase as any)
          .from('portfolio_items')
          .update({ display_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);
      return true;
    } catch (err) {
      console.error('[usePortfolioItems] Error reordering:', err);
      toast.error('Error al reordenar');
      await fetchItems(); // Revert
      return false;
    }
  }, [items, fetchItems]);

  const togglePin = useCallback(async (id: string): Promise<boolean> => {
    const item = items.find(i => i.id === id);
    if (!item) return false;

    const newValue = !item.is_featured;

    // Check max 3 featured
    if (newValue && items.filter(i => i.is_featured).length >= 3) {
      toast.error('Maximo 3 items destacados');
      return false;
    }

    return updateItem(id, { is_featured: newValue });
  }, [items, updateItem]);

  const uploadVideo = useCallback(async (
    file: File,
    creatorId: string,
    metadata?: { title?: string; category?: string }
  ): Promise<PortfolioItemData | null> => {
    if (!creatorProfileId) return null;

    setAdding(true);
    try {
      // Step 1: Create video slot via edge function
      const { data: slotData, error: slotError } = await supabase.functions.invoke('bunny-marketplace-upload', {
        body: {
          upload_type: 'portfolio',
          portfolio_item_id: null,
          title: metadata?.title || file.name,
          creator_id: creatorId,
        },
      });

      if (slotError || !slotData?.success) {
        throw new Error(slotError?.message || slotData?.error || 'Failed to create video slot');
      }

      const { upload_url, access_key, video_id, embed_url, media_id } = slotData;

      // Step 2: Upload file directly to Bunny CDN
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'AccessKey': access_key,
          'Content-Type': 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Confirm upload
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('bunny-marketplace-upload', {
        method: 'PUT',
        body: {
          upload_type: 'portfolio',
          video_id,
          embed_url,
          media_id,
          portfolio_creator_id: creatorId,
          portfolio_title: metadata?.title || file.name.replace(/\.[^.]+$/, ''),
          portfolio_category: metadata?.category || null,
        },
      });

      if (confirmError) {
        console.error('[usePortfolioItems] Confirm error:', confirmError);
        // Show specific error message from edge function
        const errorMsg = confirmData?.error || confirmError.message || 'Error al confirmar subida';
        toast.error(errorMsg);
        return null;
      }

      // Check for error in response body (edge function returned 4xx/5xx with JSON)
      if (confirmData?.error) {
        console.error('[usePortfolioItems] Edge function error:', confirmData.error, confirmData.details);
        toast.error(confirmData.error);
        return null;
      }

      // Step 4: Get the created portfolio item
      const portfolioItemId = confirmData?.portfolio_item_id;

      if (portfolioItemId) {
        // Fetch the created item
        const { data: itemRow } = await (supabase as any)
          .from('portfolio_items')
          .select('*')
          .eq('id', portfolioItemId)
          .single();

        if (itemRow) {
          const mapped = mapRow(itemRow);
          setItems(prev => [...prev, mapped]);
          toast.success('Video subido - procesando...');
          return mapped;
        }
      }

      // If no portfolio_item_id, something went wrong
      console.error('[usePortfolioItems] No portfolio_item_id in response:', confirmData);
      toast.error('Error: el video se subió pero no se pudo crear el registro');
      return null;
    } catch (err) {
      console.error('[usePortfolioItems] Error uploading video:', err);
      toast.error('Error al subir video');
      return null;
    } finally {
      setAdding(false);
    }
  }, [creatorProfileId, addItem]);

  const uploadImage = useCallback(async (
    file: File,
    creatorId: string,
    metadata?: { title?: string; category?: string }
  ): Promise<PortfolioItemData | null> => {
    if (!creatorProfileId) {
      console.error('[usePortfolioItems] uploadImage called but creatorProfileId is empty');
      toast.error('Error: No se encontró tu perfil de creador');
      return null;
    }
    console.log('[usePortfolioItems] uploadImage starting, creatorProfileId:', creatorProfileId);

    setAdding(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

      // Step 1: Call edge function to get upload credentials AND create DB record
      // This uses service_role to bypass RLS issues
      const { data: result, error: fnError } = await supabase.functions.invoke('portfolio-image-upload', {
        body: {
          creatorProfileId,
          title: metadata?.title || file.name.replace(/\.[^.]+$/, ''),
          category: metadata?.category || null,
          fileName: file.name,
          fileExt: ext,
        },
      });

      if (fnError || !result?.success) {
        throw new Error(fnError?.message || result?.error || 'Error al preparar subida');
      }

      // Step 2: Upload directly to Bunny Storage
      const uploadResponse = await fetch(result.uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': result.accessKey,
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Add the item to local state (record already created by edge function)
      const mapped = mapRow(result.portfolioItem);
      setItems(prev => [...prev, mapped]);

      toast.success('Imagen agregada al portafolio');
      return mapped;
    } catch (err: any) {
      console.error('[usePortfolioItems] Error uploading image:', err);
      console.error('[usePortfolioItems] creatorProfileId:', creatorProfileId);
      const errorMsg = err?.message || err?.details || 'Error desconocido';
      toast.error(`Error al subir imagen: ${errorMsg}`);
      return null;
    } finally {
      setAdding(false);
    }
  }, [creatorProfileId]);

  return {
    items,
    loading,
    adding,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    togglePin,
    uploadVideo,
    uploadImage,
    refresh: fetchItems,
  };
}
