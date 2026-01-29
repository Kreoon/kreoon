import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CreatorCard, type CreatorData } from '@/components/portfolio/creators/CreatorCard';
import { CreatorsFilters, type CreatorsFiltersState } from '@/components/portfolio/creators/CreatorsFilters';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CreatorWithPoints extends CreatorData {
  total_points: number;
}

export default function CreatorsPortfolioPage() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<CreatorsFiltersState>({
    niche: 'all',
    country: 'all',
    upRange: 'all',
  });

  // Fetch creators with UP points
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['creators-portfolio'],
    queryFn: async () => {
      // Fetch profiles with featured video
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          country,
          content_categories,
          industries,
          featured_video_url,
          featured_video_thumbnail
        `)
        .eq('is_public', true)
        .not('featured_video_url', 'is', null);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Fetch UP totals
      const { data: upTotals, error: upError } = await supabase
        .from('up_creadores_totals')
        .select('user_id, total_points');

      if (upError) {
        console.error('Error fetching UP totals:', upError);
      }

      // Create UP points map
      const upMap = new Map<string, number>();
      upTotals?.forEach((up) => {
        upMap.set(up.user_id, up.total_points || 0);
      });

      // Merge data
      const creatorsWithPoints: CreatorWithPoints[] = profiles.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name || 'Creador',
        avatar_url: profile.avatar_url || undefined,
        country: profile.country || undefined,
        content_categories: profile.content_categories || [],
        industries: profile.industries || [],
        featured_video_url: profile.featured_video_url || undefined,
        featured_video_thumbnail: profile.featured_video_thumbnail || undefined,
        total_points: upMap.get(profile.id) || 0,
      }));

      // Sort by UP points (highest first)
      return creatorsWithPoints.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Extract unique niches and countries for filters
  const { niches, countries } = useMemo(() => {
    const nichesSet = new Set<string>();
    const countriesSet = new Set<string>();

    creators.forEach((creator) => {
      creator.content_categories?.forEach((cat: string) => nichesSet.add(cat));
      creator.industries?.forEach((ind: string) => nichesSet.add(ind));
      if (creator.country) countriesSet.add(creator.country);
    });

    return {
      niches: Array.from(nichesSet).sort(),
      countries: Array.from(countriesSet).sort(),
    };
  }, [creators]);

  // Filter creators
  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      // Niche filter
      if (filters.niche !== 'all') {
        const hasNiche = creator.content_categories?.includes(filters.niche) ||
          creator.industries?.includes(filters.niche);
        if (!hasNiche) return false;
      }

      // Country filter
      if (filters.country !== 'all' && creator.country !== filters.country) {
        return false;
      }

      // UP range filter
      if (filters.upRange !== 'all') {
        const points = creator.total_points || 0;
        switch (filters.upRange) {
          case '0-500':
            if (points >= 500) return false;
            break;
          case '500-800':
            if (points < 500 || points >= 800) return false;
            break;
          case '800-1200':
            if (points < 800 || points >= 1200) return false;
            break;
          case '1200+':
            if (points < 1200) return false;
            break;
        }
      }

      return true;
    });
  }, [creators, filters]);

  const handleFilterChange = useCallback((key: keyof CreatorsFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ niche: 'all', country: 'all', upRange: 'all' });
  }, []);

  const handleCreatorClick = useCallback((creatorId: string) => {
    navigate(`/p/${creatorId}`);
  }, [navigate]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-social-accent/10">
              <Users className="h-6 w-6 text-social-accent" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-social-foreground">
              Portafolio de Creadores
            </h1>
          </div>
          <p className="text-social-muted-foreground text-sm md:text-base">
            Explora a nuestros creadores activos y visualiza su contenido real
          </p>
        </div>

        {/* Filters */}
        <CreatorsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          niches={niches}
          countries={countries}
          className="pb-2 border-b border-social-border/50"
        />

        {/* Creators Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-social-accent animate-spin" />
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-16 w-16 text-social-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-social-foreground mb-2">
              No se encontraron creadores
            </h3>
            <p className="text-social-muted-foreground text-sm max-w-md">
              {filters.niche !== 'all' || filters.country !== 'all' || filters.upRange !== 'all'
                ? 'Intenta ajustar los filtros para ver más resultados.'
                : 'Aún no hay creadores con video destacado disponibles.'}
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4 md:gap-6",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}>
            {filteredCreators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => handleCreatorClick(creator.id)}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredCreators.length > 0 && (
          <p className="text-center text-social-muted-foreground text-sm pt-4">
            Mostrando {filteredCreators.length} de {creators.length} creadores
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
