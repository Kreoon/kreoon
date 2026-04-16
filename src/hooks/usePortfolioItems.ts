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
  // Campos para contenido de organizaciones
  content_id: string | null;
  source_type: 'manual' | 'organization_content';
  organization_id: string | null;
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
  // Campos para contenido de organizaciones
  content_id: (row.content_id as string) || null,
  source_type: (row.source_type as 'manual' | 'organization_content') || 'manual',
  organization_id: (row.organization_id as string) || null,
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
      console.log('[usePortfolioItems] Deleting item:', id);

      // ── 1. Delete from database via Edge Function (bypasses RLS) ──
      const { data: result, error: fnError } = await supabase.functions.invoke('portfolio-item-delete', {
        body: { itemId: id },
      });

      console.log('[usePortfolioItems] Edge function result:', result, fnError);

      if (fnError) {
        console.error('[usePortfolioItems] Edge function error:', fnError);
        toast.error('Error al eliminar: ' + (fnError.message || 'Error desconocido'));
        return false;
      }

      if (!result?.success) {
        console.error('[usePortfolioItems] Delete failed:', result?.error);
        toast.error(result?.error || 'No se pudo eliminar el item');
        return false;
      }

      // ── 2. Delete from Bunny CDN (using info returned by Edge Function) ──
      const { media_type, bunny_video_id, media_url } = result;

      if (media_type === 'video') {
        const videoId = bunny_video_id
          || (media_url ? extractBunnyIds(media_url)?.videoId : null);
        if (videoId) {
          console.log('[usePortfolioItems] Deleting video from Bunny:', videoId);
          const { error: bunnyErr } = await supabase.functions.invoke('bunny-delete-v2', {
            body: { videoId },
          });
          if (bunnyErr) {
            console.warn('[usePortfolioItems] Bunny video delete warning:', bunnyErr);
          }
        }
      } else if (media_type === 'image' && media_url) {
        const match = media_url.match(/cdn\.kreoon\.com\/(.+)$/i)
          || media_url.match(/b-cdn\.net\/(.+)$/i)
          || media_url.match(/\.b-cdn\.net\/(.+)$/i);
        if (match) {
          const storagePath = decodeURIComponent(match[1].split('?')[0]);
          console.log('[usePortfolioItems] Deleting image from Bunny:', storagePath);
          const { error: bunnyErr } = await supabase.functions.invoke('bunny-raw-delete', {
            body: { storagePath },
          });
          if (bunnyErr) {
            console.warn('[usePortfolioItems] Bunny image delete warning:', bunnyErr);
          }
        }
      }

      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item eliminado');
      return true;
    } catch (err) {
      console.error('[usePortfolioItems] Error deleting:', err);
      toast.error('Error al eliminar item');
      return false;
    }
  }, []);

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

    // Validar formato de video soportado
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      toast.error(`Formato de video no soportado: .${ext || file.type}. Usa MP4, WebM o MOV.`);
      return null;
    }

    // Validar tamaño máximo (500MB)
    const MAX_VIDEO_SIZE_MB = 500;
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`El video es muy grande. Máximo ${MAX_VIDEO_SIZE_MB}MB.`);
      return null;
    }

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

      const { video_id, embed_url, media_id } = slotData;

      // Step 2: Upload video through Edge Function proxy (avoids CORS issues)
      // The Edge Function streams the video to Bunny without loading it all in memory
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/bunny-marketplace-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/octet-stream',
          'x-video-id': video_id,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.statusText}`);
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

    // Validar formato de imagen soportado por navegadores
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'];
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      console.error('[usePortfolioItems] Invalid image format:', file.type, ext);
      toast.error(`Formato no soportado: .${ext || file.type}. Usa JPG, PNG, GIF o WebP.`);
      return null;
    }

    // Validar tamaño máximo (5MB para base64 - Edge Functions tienen límite de memoria)
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`La imagen es muy grande. Máximo ${MAX_SIZE_MB}MB.`);
      return null;
    }

    console.log('[usePortfolioItems] uploadImage starting, creatorProfileId:', creatorProfileId);

    setAdding(true);
    try {
      // Verificar sesión activa antes de invocar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('[usePortfolioItems] No active session:', sessionError?.message);
        throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
      }

      console.log('[usePortfolioItems] Session active, user:', session.user.id);

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      console.log('[usePortfolioItems] Image converted to base64, size:', base64.length);

      // Call edge function which uploads to Bunny server-side AND creates DB record
      const { data: result, error: fnError } = await supabase.functions.invoke('portfolio-image-upload', {
        body: {
          creatorProfileId,
          title: metadata?.title || file.name.replace(/\.[^.]+$/, ''),
          category: metadata?.category || null,
          fileName: file.name,
          fileExt: ext,
          imageBase64: base64,
          contentType: file.type || 'image/jpeg',
        },
      });

      if (fnError || !result?.success) {
        throw new Error(fnError?.message || result?.error || 'Error al subir imagen');
      }

      // Add the item to local state (record already created by edge function)
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
