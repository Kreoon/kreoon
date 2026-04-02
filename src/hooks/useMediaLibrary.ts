import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MediaItem, MediaFilters } from '@/components/profile-builder/media/types';

interface UseMediaLibraryOptions {
  userId: string;
  creatorProfileId?: string;
  filters?: Partial<MediaFilters>;
}

interface UseMediaLibraryReturn {
  items: MediaItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: MediaItem) => void;
}

function normalizePortfolioItem(row: Record<string, unknown>): MediaItem | null {
  const mediaType = row.media_type as string;
  if (mediaType !== 'image' && mediaType !== 'video') return null;

  return {
    id: row.id as string,
    type: mediaType as 'image' | 'video',
    url: row.media_url as string,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? undefined,
    title: (row.title as string | null) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    source: 'portfolio_items',
    createdAt: row.created_at as string,
    aspectRatio: (row.aspect_ratio as string | null) ?? undefined,
  };
}

function normalizeMarketplaceMedia(row: Record<string, unknown>): MediaItem | null {
  const fileType = (row.file_type as string | null) ?? '';
  let type: 'image' | 'video' | null = null;

  if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(fileType)) {
    type = 'image';
  } else if (fileType.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].includes(fileType)) {
    type = 'video';
  }

  if (!type) return null;

  return {
    id: row.id as string,
    type,
    url: row.file_url as string,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? undefined,
    source: 'marketplace_media',
    createdAt: row.created_at as string,
  };
}

export function useMediaLibrary({
  userId,
  creatorProfileId,
  filters,
}: UseMediaLibraryOptions): UseMediaLibraryReturn {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results: MediaItem[] = [];

      const fetchPortfolio =
        !filters?.source || filters.source === 'all' || filters.source === 'portfolio_items';
      const fetchMarketplace =
        !filters?.source || filters.source === 'all' || filters.source === 'marketplace_media';

      // Consulta portfolio_items
      if (fetchPortfolio && creatorProfileId) {
        let query = (supabase as any)
          .from('portfolio_items')
          .select('id, creator_id, title, media_type, media_url, thumbnail_url, tags, aspect_ratio, created_at')
          .eq('creator_id', creatorProfileId)
          .order('created_at', { ascending: false });

        if (filters?.type && filters.type !== 'all') {
          query = query.eq('media_type', filters.type);
        } else {
          query = query.in('media_type', ['image', 'video']);
        }

        const { data: portfolioData, error: portfolioError } = await query;

        if (portfolioError) {
          console.error('[useMediaLibrary] Error fetching portfolio_items:', portfolioError);
        } else {
          const normalized = (portfolioData ?? [])
            .map((row: Record<string, unknown>) => normalizePortfolioItem(row))
            .filter((item): item is MediaItem => item !== null);
          results.push(...normalized);
        }
      }

      // Consulta marketplace_media
      if (fetchMarketplace) {
        let query = (supabase as any)
          .from('marketplace_media')
          .select('id, file_url, thumbnail_url, file_type, uploaded_by, created_at')
          .eq('uploaded_by', userId)
          .order('created_at', { ascending: false });

        if (filters?.type && filters.type !== 'all') {
          const typePrefixes =
            filters.type === 'image'
              ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']
              : ['video/mp4', 'video/webm', 'video/quicktime', 'mp4', 'webm', 'mov'];
          query = query.in('file_type', typePrefixes);
        }

        const { data: marketplaceData, error: marketplaceError } = await query;

        if (marketplaceError) {
          console.error('[useMediaLibrary] Error fetching marketplace_media:', marketplaceError);
        } else {
          const normalized = (marketplaceData ?? [])
            .map((row: Record<string, unknown>) => normalizeMarketplaceMedia(row))
            .filter((item): item is MediaItem => item !== null);
          results.push(...normalized);
        }
      }

      // Aplicar busqueda por titulo si hay searchQuery
      if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
        const query = filters.searchQuery.toLowerCase().trim();
        const filtered = results.filter((item) => {
          const titleMatch = item.title?.toLowerCase().includes(query) ?? false;
          const tagMatch = item.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false;
          return titleMatch || tagMatch;
        });
        setItems(filtered);
      } else {
        // Ordenar por fecha descendente (mezcla de las dos fuentes)
        results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setItems(results);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar medios';
      console.error('[useMediaLibrary] Unexpected error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId, creatorProfileId, filters?.type, filters?.source, filters?.searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback((item: MediaItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    addItem,
  };
}

export default useMediaLibrary;
