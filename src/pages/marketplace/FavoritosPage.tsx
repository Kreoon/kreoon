import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCreatorFavorites } from '@/contexts/CreatorFavoritesContext';
import { MarketplaceCreatorCard } from '@/components/marketplace/CreatorCard';
import { CreatorCardSkeleton } from '@/components/marketplace/CreatorCardSkeleton';
import type { MarketplaceCreator, PortfolioMedia } from '@/components/marketplace/types/marketplace';
import { cn } from '@/lib/utils';

const CREATOR_FIELDS = `
  id, user_id, slug, display_name, avatar_url, bio, location_city,
  location_country, country_flag, categories, content_types, level,
  is_verified, rating_avg, rating_count, base_price, currency,
  is_available, languages, completed_projects, created_at,
  accepts_product_exchange, marketplace_roles,
  featured_media_url, featured_media_type,
  trust_score, trust_score_breakdown
`;

function mapRow(row: Record<string, unknown>): MarketplaceCreator {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    slug: (row.slug as string) || null,
    display_name: (row.display_name as string) || '',
    avatar_url: row.avatar_url as string | null,
    bio: row.bio as string | null,
    location_city: row.location_city as string | null,
    location_country: row.location_country as string | null,
    country_flag: row.country_flag as string | null,
    categories: (row.categories as string[]) || [],
    content_types: (row.content_types as string[]) || [],
    level: (row.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    is_verified: (row.is_verified as boolean) || false,
    rating_avg: Number(row.rating_avg) || 0,
    rating_count: Number(row.rating_count) || 0,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    currency: (row.currency as string) || 'USD',
    portfolio_media: (row.portfolio_media as PortfolioMedia[]) || [],
    is_available: row.is_available !== false,
    languages: (row.languages as string[]) || ['es'],
    completed_projects: Number(row.completed_projects) || 0,
    joined_at: (row.created_at as string) || '',
    accepts_product_exchange: (row.accepts_product_exchange as boolean) || false,
    marketplace_roles: (row.marketplace_roles as string[]) || [],
    featured_media_url: row.featured_media_url as string | null,
    featured_media_type: row.featured_media_type as 'image' | 'video' | null,
    trust_score: Number(row.trust_score) || 50,
    trust_score_breakdown: null,
    is_new_profile: false,
  };
}

export default function FavoritosPage() {
  const navigate = useNavigate();
  const { favoritedIds, isLoaded } = useCreatorFavorites();
  const [creators, setCreators] = useState<MarketplaceCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const ids = Array.from(favoritedIds);
    if (ids.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      (supabase as any)
        .from('creator_profiles')
        .select(CREATOR_FIELDS)
        .in('id', ids)
        .eq('is_active', true),
      (supabase as any)
        .from('portfolio_items')
        .select('id, creator_id, media_url, thumbnail_url, media_type')
        .in('creator_id', ids)
        .eq('is_public', true)
        .order('display_order', { ascending: true })
        .limit(300),
    ]).then(([{ data: rows }, { data: portfolioRows }]) => {
      const portfolioMap = new Map<string, PortfolioMedia[]>();
      for (const p of (portfolioRows || [])) {
        const arr = portfolioMap.get(p.creator_id) || [];
        arr.push({
          id: p.id,
          url: p.media_url,
          thumbnail_url: p.thumbnail_url,
          type: p.media_type === 'video' ? 'video' : 'image',
        });
        portfolioMap.set(p.creator_id, arr);
      }

      const mapped = (rows || []).map((r: Record<string, unknown>) => ({
        ...mapRow(r),
        portfolio_media: portfolioMap.get(r.id as string) || [],
      }));

      // Preserve the order from favoritedIds (most recently saved first)
      const idOrder = new Map(ids.map((id, i) => [id, i]));
      mapped.sort((a: MarketplaceCreator, b: MarketplaceCreator) =>
        (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999)
      );

      setCreators(mapped);
      setLoading(false);
    });
  }, [isLoaded, favoritedIds]);

  const handleCreatorClick = (slugOrId: string) => {
    navigate(`/marketplace/creator/${slugOrId}`);
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Heart className="h-5 w-5 text-red-400 fill-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Favoritos</h1>
            {!loading && (
              <p className="text-sm text-muted-foreground">
                {creators.length === 0
                  ? 'Todavía no tienes favoritos'
                  : `${creators.length} creador${creators.length !== 1 ? 'es' : ''} guardado${creators.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading || !isLoaded ? (
          <div className={cn(
            'grid gap-3 sm:gap-4 lg:gap-6',
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
          )}>
            {Array.from({ length: 10 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
              <Heart className="h-10 w-10 text-red-400/50" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Aún no tienes favoritos</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Cuando encuentres un creador que te guste, toca el{' '}
                <Heart className="inline h-3.5 w-3.5 text-red-400" /> en su tarjeta
                para guardarlo aquí.
              </p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="mt-2 px-6 py-2 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors text-sm font-medium"
            >
              Explorar creadores
            </button>
          </div>
        ) : (
          <div className={cn(
            'grid gap-3 sm:gap-4 lg:gap-6',
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
          )}>
            {creators.map((creator, i) => (
              <MarketplaceCreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => handleCreatorClick(creator.slug || creator.id)}
                priority={i < 6}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
