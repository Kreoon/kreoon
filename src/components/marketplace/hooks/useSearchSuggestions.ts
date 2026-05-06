import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchSuggestion {
  id: string;
  type: 'creator' | 'category' | 'role';
  display_name: string;
  slug: string | null;
  avatar_url: string | null;
  subtitle: string | null;
  rating_avg?: number;
  rating_count?: number;
  location?: string;
  is_verified?: boolean;
  base_price?: number | null;
  currency?: string;
  level?: 'bronze' | 'silver' | 'gold' | 'elite';
  featured_media_url?: string | null;
  featured_media_type?: 'image' | 'video' | null;
  portfolio_thumbnail?: string | null;
}

async function fetchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) return [];

  const searchTerm = query.toLowerCase().trim();
  const isUsernameSearch = searchTerm.startsWith('@');
  const cleanTerm = isUsernameSearch ? searchTerm.slice(1) : searchTerm;

  // Obtener IDs de usuarios excluidos (clientes)
  const { data: excludedRows } = await supabase.rpc('get_marketplace_excluded_user_ids');
  const excludedUserIds = new Set((excludedRows || []).map((r: { user_id: string }) => r.user_id));

  // Buscar creadores que coincidan
  const { data, error } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      user_id,
      display_name,
      slug,
      username,
      avatar_url,
      primary_role,
      location_city,
      location_country,
      rating_avg,
      rating_count,
      categories,
      marketplace_roles,
      is_verified,
      base_price,
      currency,
      level,
      featured_media_url,
      featured_media_type
    `)
    .eq('is_active', true)
    .or(
      isUsernameSearch
        ? `slug.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%`
        : `display_name.ilike.%${cleanTerm}%,slug.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%,primary_role.ilike.%${cleanTerm}%,categories.cs.{${cleanTerm}}`
    )
    .order('rating_avg', { ascending: false })
    .limit(15);

  if (error) {
    console.error('[useSearchSuggestions] Error:', error);
    return [];
  }

  // Filtrar clientes
  const filteredCreators = (data || []).filter(creator => !excludedUserIds.has(creator.user_id)).slice(0, 6);
  const creatorIds = filteredCreators.map(c => c.id);

  // Obtener thumbnails del portafolio para los creadores filtrados
  const portfolioMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: portfolioItems } = await supabase
      .from('portfolio_items')
      .select('creator_id, media_url, thumbnail_url, media_type')
      .in('creator_id', creatorIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Guardar el primer thumbnail de imagen por creador
    for (const item of portfolioItems || []) {
      if (!portfolioMap.has(item.creator_id)) {
        const thumb = item.thumbnail_url || (item.media_type === 'image' ? item.media_url : null);
        if (thumb) {
          portfolioMap.set(item.creator_id, thumb);
        }
      }
    }
  }

  // Mapear a sugerencias
  const suggestions: SearchSuggestion[] = filteredCreators.map(creator => ({
    id: creator.id,
    type: 'creator' as const,
    display_name: creator.display_name,
    slug: creator.slug || creator.username,
    avatar_url: creator.avatar_url,
    subtitle: creator.primary_role || (creator.categories as string[])?.[0] || null,
    rating_avg: Number(creator.rating_avg) || 0,
    rating_count: Number(creator.rating_count) || 0,
    location: creator.location_city
      ? `${creator.location_city}, ${creator.location_country}`
      : creator.location_country,
    is_verified: creator.is_verified || false,
    base_price: creator.base_price != null ? Number(creator.base_price) : null,
    currency: creator.currency || 'USD',
    level: (creator.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    featured_media_url: creator.featured_media_url,
    featured_media_type: creator.featured_media_type as 'image' | 'video' | null,
    portfolio_thumbnail: portfolioMap.get(creator.id) || null,
  }));

  return suggestions;
}

export function useSearchSuggestions(query: string, enabled: boolean = true) {
  const debouncedQuery = query.trim();

  return useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => fetchSuggestions(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}
