import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, ArrowRight } from 'lucide-react';
import { MarketplaceSearchBar } from './MarketplaceSearchBar';
import { AISearchInput } from './AISearchInput';
import { cn } from '@/lib/utils';
import { MarketplaceTabBar } from './MarketplaceTabBar';
import { CategoryBar } from './CategoryBar';
import { RoleCategoryBar } from './RoleCategoryBar';
import { RoleSubChips } from './RoleSubChips';
import { ActiveFilters } from './ActiveFilters';
import { CreatorCarousel } from './CreatorCarousel';
import { CreatorGrid } from './CreatorGrid';
import { MarketplaceOrgGrid } from './OrgGrid';
import { FilterModal } from './FilterModal';
import { CampaignsFeed } from './campaigns/feed/CampaignsFeed';
import { ActiveLivesCarousel } from '@/components/live-streaming/ActiveLivesCarousel';
import { useMarketplaceFilters } from './hooks/useMarketplaceFilters';
import { useCreatorSearch } from './hooks/useCreatorSearch';
import { useInfiniteCreators } from './hooks/useInfiniteCreators';
import { useOrgSearch } from './hooks/useOrgSearch';
import { useInfiniteOrgs } from './hooks/useInfiniteOrgs';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import type { MarketplaceFilters, MarketplaceViewMode, MarketplaceRoleId, MarketplaceTab } from './types/marketplace';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { user, activeRole, isPlatformAdmin } = useAuth();
  const { exists: hasCreatorProfile, loading: profileLoading } = useCreatorProfile();
  const { filters, updateFilter, resetFilters, activeFilterCount, setFilters } =
    useMarketplaceFilters();
  const { creators, featured, newTalent, topRated, recommended, totalCount, isPersonalized } =
    useCreatorSearch(filters);
  const { visibleCreators, hasMore, loadMore, reset } = useInfiniteCreators(creators);

  // Org search
  const { orgs, totalCount: orgTotalCount } = useOrgSearch(filters);
  const { visibleOrgs, hasMore: orgHasMore, loadMore: orgLoadMore, reset: orgReset } = useInfiniteOrgs(orgs);

  const [activeTab, setActiveTab] = useState<MarketplaceTab>('creators');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [aiSearchMode, setAiSearchMode] = useState(false);

  // Don't show "create profile" banner for client users - they can browse but not be creators
  const isClientUser = activeRole === 'client';
  const showCreatorBanner = user && !isClientUser && !hasCreatorProfile && !profileLoading && !bannerDismissed;

  const isAgencies = activeTab === 'agencies';
  const isAllView = filters.role_category === 'all';
  const hasRoleCategorySelected = !isAllView && filters.role_category !== 'agencies';

  // Reset pagination when filters change
  useEffect(() => {
    reset();
    orgReset();
  }, [filters, reset, orgReset]);

  // Preload LCP images from first carousel for better performance
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current || featured.length === 0) return;
    preloadedRef.current = true;

    // Preload first 3 creator thumbnails
    featured.slice(0, 3).forEach((creator) => {
      const firstMedia = creator.portfolio_media?.[0];
      if (!firstMedia) return;

      let thumbUrl = firstMedia.thumbnail_url || firstMedia.url;
      if (firstMedia.type === 'video') {
        const bunnyThumb = getBunnyThumbnailUrl(firstMedia.url);
        if (bunnyThumb) thumbUrl = bunnyThumb;
      }

      if (thumbUrl) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbUrl;
        link.fetchPriority = 'high';
        document.head.appendChild(link);
      }
    });
  }, [featured]);

  const handleCreatorClick = useCallback(
    (id: string) => {
      navigate(`/marketplace/creator/${id}`);
    },
    [navigate],
  );

  const handleOrgClick = useCallback(
    (slug: string) => {
      navigate(`/marketplace/org/${slug}`);
    },
    [navigate],
  );

  const handleSearchSubmit = useCallback(() => {
    setIsSearchActive(filters.search.length > 0);
  }, [filters.search]);

  const handleAIFiltersChange = useCallback(
    (newFilters: Partial<MarketplaceFilters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
      setIsSearchActive(true);
    },
    [setFilters]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilter('search', value);
      if (value.length === 0) setIsSearchActive(false);
    },
    [updateFilter],
  );

  const handleCategoryChange = useCallback(
    (category: string | null) => {
      updateFilter('category', category);
    },
    [updateFilter],
  );

  const handleRoleCategoryChange = useCallback(
    (category: MarketplaceViewMode) => {
      updateFilter('role_category', category);
      // If the user selects a creator role sub-category, ensure we're on the creators tab
      if (category !== 'agencies') {
        setActiveTab('creators');
      }
    },
    [updateFilter],
  );

  const handleToggleRole = useCallback(
    (roleId: MarketplaceRoleId) => {
      const current = filters.marketplace_roles;
      const next = current.includes(roleId)
        ? current.filter(r => r !== roleId)
        : [...current, roleId];
      updateFilter('marketplace_roles', next);
    },
    [filters.marketplace_roles, updateFilter],
  );

  const handleRemoveFilter = useCallback(
    (key: keyof MarketplaceFilters, value?: string) => {
      if (key === 'content_type' && value) {
        updateFilter('content_type', filters.content_type.filter(t => t !== value));
      } else if (key === 'level' && value) {
        updateFilter('level', filters.level.filter(l => l !== value));
      } else if (key === 'languages' && value) {
        updateFilter('languages', filters.languages.filter(l => l !== value));
      } else if (key === 'marketplace_roles' && value) {
        updateFilter('marketplace_roles', filters.marketplace_roles.filter(r => r !== value));
      } else if (key === 'platforms' && value) {
        updateFilter('platforms', filters.platforms.filter(p => p !== value));
      } else if (key === 'software' && value) {
        updateFilter('software', filters.software.filter(s => s !== value));
      } else if (key === 'tech_stack' && value) {
        updateFilter('tech_stack', filters.tech_stack.filter(t => t !== value));
      } else if (key === 'education_format' && value) {
        updateFilter('education_format', filters.education_format.filter(f => f !== value));
      } else if (key === 'accepts_exchange') {
        updateFilter('accepts_exchange', null);
      } else if (key === 'price_min' || key === 'price_max') {
        updateFilter('price_min', null);
        updateFilter('price_max', null);
      } else if (key === 'category') {
        updateFilter('category', null);
      } else if (key === 'country') {
        updateFilter('country', null);
      } else if (key === 'rating_min') {
        updateFilter('rating_min', null);
      } else if (key === 'availability') {
        updateFilter('availability', 'any');
      }
    },
    [filters, updateFilter],
  );

  const handleApplyFilters = useCallback(
    (newFilters: MarketplaceFilters) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  const showCarousels = !isSearchActive && isAllView && !filters.category && activeFilterCount === 0;

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-background">
        {/* Sticky header area */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            {/* Search bar - AI mode toggle */}
            <div className="py-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setAiSearchMode(false)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors",
                    !aiSearchMode
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  )}
                >
                  Búsqueda normal
                </button>
                <button
                  onClick={() => setAiSearchMode(true)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1",
                    aiSearchMode
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  AI Search
                </button>
              </div>

              {aiSearchMode ? (
                <AISearchInput onFiltersChange={handleAIFiltersChange} />
              ) : (
                <MarketplaceSearchBar
                  search={filters.search}
                  country={filters.country}
                  contentTypes={filters.content_type}
                  onSearchChange={handleSearchChange}
                  onCountryChange={v => updateFilter('country', v)}
                  onContentTypesChange={v => updateFilter('content_type', v)}
                  onSubmit={handleSearchSubmit}
                />
              )}
            </div>

            {/* Top-level tab bar: Creadores / Agencias / Campañas */}
            <MarketplaceTabBar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                // When switching to creators, reset role_category if it was on agencies
                if (tab === 'creators' && filters.role_category === 'agencies') {
                  updateFilter('role_category', 'all');
                }
              }}
              creatorsCount={totalCount}
              agenciesCount={orgTotalCount}
            />

            {/* Sub-filters only visible for creators tab */}
            {activeTab === 'creators' && (
              <>
                {/* Role category bar */}
                <RoleCategoryBar
                  active={filters.role_category}
                  onChange={handleRoleCategoryChange}
                />

                {/* Sub-role chips (when a specific role category is selected) */}
                {hasRoleCategorySelected && (
                  <RoleSubChips
                    category={filters.role_category as any}
                    selectedRoles={filters.marketplace_roles}
                    onToggleRole={handleToggleRole}
                  />
                )}

                {/* Category bar */}
                <CategoryBar
                  activeCategory={filters.category}
                  onCategoryChange={handleCategoryChange}
                  onOpenFilters={() => setFilterModalOpen(true)}
                  activeFilterCount={activeFilterCount}
                />
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-10 pb-24">
          {/* Campaigns tab */}
          {activeTab === 'campaigns' ? (
            <CampaignsFeed />
          ) : (
          <>
          {/* Banner: invitar a crear perfil de marketplace */}
          {showCreatorBanner && (
            <div className="relative bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-semibold text-sm">
                  Muestra tu talento en el marketplace
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Crea tu perfil de creador y deja que las marcas te encuentren. Tu contenido ya publicado se agregará automáticamente.
                </p>
              </div>
              <button
                onClick={() => navigate('/settings?section=marketplace')}
                className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-foreground text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
              >
                Crear perfil
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="absolute top-2 right-2 text-gray-500 hover:text-foreground text-xs px-1.5 py-0.5 rounded"
              >
                ×
              </button>
            </div>
          )}

          {/* Active filters */}
          {activeFilterCount > 0 && (
            <ActiveFilters
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={resetFilters}
            />
          )}

          {isAgencies ? (
            /* Organization grid */
            <MarketplaceOrgGrid
              orgs={visibleOrgs}
              hasMore={orgHasMore}
              totalCount={orgTotalCount}
              onLoadMore={orgLoadMore}
              onOrgClick={handleOrgClick}
            />
          ) : (
            <>
              {/* Curated sections (hidden during search or filtered views) */}
              {/* Personalized recommendations - priority if first visible */}
              {showCarousels && isPersonalized && recommended.length > 0 && (
                <CreatorCarousel
                  title="Recomendados para ti"
                  emoji="✨"
                  subtitle="Basado en tus intereses y actividad"
                  creators={recommended.slice(0, 8)}
                  onCreatorClick={handleCreatorClick}
                  priority={true}
                />
              )}

              {/* Lives activos - solo para admins (feature en construcción para otros) */}
              {(activeRole === 'admin' || isPlatformAdmin) && (
                <ActiveLivesCarousel
                  onViewAll={() => navigate('/live')}
                  className="mb-6"
                />
              )}

              {showCarousels && (
                <>
                  {/* First carousel - priority loading for LCP */}
                  <CreatorCarousel
                    title="Talento Destacado"
                    emoji="🔥"
                    subtitle="Los mejores profesionales creativos en LATAM"
                    creators={featured.slice(0, 8)}
                    onCreatorClick={handleCreatorClick}
                    priority={true}
                  />

                  {/* Secondary carousels - limited items to reduce initial load */}
                  <CreatorCarousel
                    title="Nuevos Talentos"
                    emoji="🆕"
                    subtitle="Recien llegados con propuestas frescas y descuentos de bienvenida"
                    creators={newTalent.slice(0, 6)}
                    onCreatorClick={handleCreatorClick}
                  />

                  <CreatorCarousel
                    title="Los Mejor Valorados"
                    emoji="⭐"
                    subtitle="Consistencia y calidad comprobada por marcas"
                    creators={topRated.slice(0, 6)}
                    onCreatorClick={handleCreatorClick}
                  />
                </>
              )}

              {/* Main creator grid */}
              <CreatorGrid
                creators={visibleCreators}
                hasMore={hasMore}
                totalCount={totalCount}
                onLoadMore={loadMore}
                onCreatorClick={handleCreatorClick}
                searchQuery={isSearchActive ? filters.search : undefined}
                priority={!showCarousels}
              />
            </>
          )}
          </>
          )}
        </div>

        {/* Filter modal */}
        <FilterModal
          open={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={filters}
          onApply={handleApplyFilters}
          resultCount={isAgencies ? orgTotalCount : totalCount}
          activeRoleCategory={filters.role_category}
        />
      </div>
    </ScrollArea>
  );
}
