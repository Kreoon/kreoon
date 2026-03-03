import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { PortfolioGallery } from './PortfolioGallery';
import { CreatorHeader } from './CreatorHeader';
import { AboutSection } from './AboutSection';
import { ServicesSection } from './ServicesSection';
import { PortfolioGrid } from './PortfolioGrid';
import { StatsSection } from './StatsSection';
import { ReviewsSection } from './ReviewsSection';
import { PricingSidebar } from './PricingSidebar';
import { SimilarCreators } from './SimilarCreators';
import { CreatorProfileSkeleton } from './CreatorProfileSkeleton';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import type { CreatorFullProfile, PortfolioMedia, CreatorService as MarketplaceCreatorService, CreatorStats, CreatorReview, CreatorPackage } from '../types/marketplace';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';

/**
 * Converts real DB data into the existing CreatorFullProfile shape
 * so all existing sub-components work without modification.
 */
function dbToCreatorFullProfile(
  data: NonNullable<ReturnType<typeof useCreatorPublicProfile>['data']>
): CreatorFullProfile {
  const { profile, portfolioItems, services, reviews } = data;

  // Map portfolio items to PortfolioMedia
  const portfolio_media: PortfolioMedia[] = portfolioItems.map(item => ({
    id: item.id,
    url: item.media_url,
    thumbnail_url: item.thumbnail_url,
    type: item.media_type === 'video' ? 'video' : 'image',
  }));

  // Map services to the simplified format used by ServicesSection
  const ICON_BY_TYPE: Record<string, string> = {
    ugc_video: 'Video',
    reels_tiktok: 'Smartphone',
    review: 'Star',
    unboxing: 'Package',
    testimonial: 'Star',
    tutorial: 'BookOpen',
    vsl: 'PlayCircle',
    photography: 'Camera',
    live_streaming: 'Video',
    consulting: 'MessageSquare',
    other: 'Video',
  };

  const mappedServices: MarketplaceCreatorService[] = services.map(s => ({
    id: s.id,
    icon: ICON_BY_TYPE[s.service_type] || 'Video',
    title: s.title,
    description: s.description || '',
  }));

  // Map reviews
  const mappedReviews: CreatorReview[] = reviews.map(r => ({
    id: r.id,
    brand_name: r.brand_name || 'Marca',
    campaign_type: r.campaign_type || 'Proyecto',
    rating: r.rating,
    text: r.text,
    date: r.date,
  }));

  // Build packages from services (each service = one package)
  const packages: CreatorPackage[] = services
    .filter(svc => svc.price_amount != null && svc.price_amount > 0)
    .map(svc => {
      const includes: string[] = [];
      if (svc.deliverables && svc.deliverables.length > 0) {
        for (const del of svc.deliverables) {
          includes.push(del.quantity > 1 ? `${del.quantity}x ${del.item}` : del.item);
        }
      }
      if (svc.revisions_included > 0) {
        includes.push(`${svc.revisions_included} revisión(es)`);
      }
      return {
        id: svc.id,
        name: svc.title,
        description: svc.description || '',
        price: svc.price_amount || 0,
        currency: svc.price_currency || profile.currency,
        delivery_days: svc.delivery_days ? `${svc.delivery_days} días` : '5-7 días',
        includes,
        is_popular: svc.is_featured,
      };
    });

  // Mark most popular package
  if (packages.length > 1) {
    const mid = Math.floor(packages.length / 2);
    packages[mid].is_popular = true;
  }

  const stats: CreatorStats = {
    completed_projects: profile.completed_projects,
    rating_avg: profile.rating_avg,
    rating_count: profile.rating_count,
    response_time_hours: profile.response_time_hours,
    on_time_delivery_pct: profile.on_time_delivery_pct,
    repeat_clients_pct: profile.repeat_clients_pct,
  };

  // Build social links as booleans for CreatorHeader
  const social_links: Record<string, boolean> = {};
  if (profile.social_links) {
    for (const [key, val] of Object.entries(profile.social_links)) {
      social_links[key] = !!val;
    }
  }

  return {
    id: profile.id,
    user_id: profile.user_id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url,
    bio: profile.bio,
    bio_full: profile.bio_full || profile.bio || '',
    location_city: profile.location_city,
    location_country: profile.location_country,
    country_flag: profile.country_flag,
    categories: profile.categories,
    content_types: profile.content_types,
    level: profile.level,
    is_verified: profile.is_verified,
    rating_avg: profile.rating_avg,
    rating_count: profile.rating_count,
    base_price: profile.base_price,
    currency: profile.currency,
    portfolio_media,
    is_available: profile.is_available,
    languages: profile.languages,
    completed_projects: profile.completed_projects,
    joined_at: profile.created_at,
    accepts_product_exchange: profile.accepts_product_exchange,
    marketplace_roles: profile.marketplace_roles as any,
    services: mappedServices,
    stats,
    reviews: mappedReviews,
    packages,
    similar_creator_ids: [],
    social_links,
    platforms: profile.platforms,
    response_time: profile.response_time_hours < 1
      ? `< ${Math.round(profile.response_time_hours * 60)} min`
      : `< ${profile.response_time_hours} hrs`,
    delivery_time: '3-7 días',
    exchange_conditions: profile.exchange_conditions || undefined,
  } as CreatorFullProfile;
}

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: dbData, loading: dbLoading } = useCreatorPublicProfile(id);

  const creator: CreatorFullProfile | null = useMemo(() => {
    if (dbData) return dbToCreatorFullProfile(dbData);
    return null;
  }, [dbData]);

  const portfolioItems: PortfolioItemData[] = useMemo(
    () => dbData?.portfolioItems || [],
    [dbData],
  );

  const isLoading = dbLoading;

  if (!id || isLoading) return <CreatorProfileSkeleton />;

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Creador no encontrado</h2>
          <p className="text-gray-400">El perfil que buscas no existe o fue removido.</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Volver al Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Validate minimum requirements: VALID profile photo URL AND at least 1 portfolio item
  const avatarUrl = creator.avatar_url?.trim() || '';
  const hasValidAvatar = avatarUrl.length > 0 && avatarUrl.startsWith('http');
  const hasMinimumRequirements = hasValidAvatar && creator.portfolio_media.length > 0;

  if (!hasMinimumRequirements) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Perfil incompleto</h2>
          <p className="text-gray-400">
            Este creador aún no ha completado su perfil. Se requiere foto de perfil y al menos un contenido en el portafolio para aparecer en el marketplace.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Explorar Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Hero banner */}
      {creator.banner_url ? (
        <div className="relative w-full h-48 md:h-64 overflow-hidden">
          <img
            src={creator.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-transparent to-[#0a0a0f]" />
        </div>
      ) : (
        <div className="w-full h-24 md:h-32 bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-indigo-900/30" />
      )}

      {/* Back button */}
      <div className={creator.banner_url ? 'max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-10 relative z-10 pb-4' : 'max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-4'}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <PortfolioGallery
          media={creator.portfolio_media}
          portfolioItems={portfolioItems}
          creatorName={creator.display_name}
          creatorAvatar={creator.avatar_url}
          creatorId={creator.id}
        />
      </div>

      {/* Main content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            <CreatorHeader creator={creator} />

            {/* Mobile: Full pricing section inline */}
            <div className="lg:hidden">
              <PricingSidebar
                creatorId={creator.id}
                creatorUserId={creator.user_id}
                basePrice={creator.base_price}
                currency={creator.currency}
                packages={creator.packages}
                creatorName={creator.display_name}
                acceptsExchange={creator.accepts_product_exchange}
                exchangeConditions={creator.exchange_conditions}
                mobileInline
              />
            </div>

            <AboutSection creator={creator} />
            <ServicesSection services={creator.services} />
            <PortfolioGrid
              media={creator.portfolio_media}
              portfolioItems={portfolioItems}
              creatorName={creator.display_name}
              creatorAvatar={creator.avatar_url}
              creatorId={creator.id}
            />
            <StatsSection stats={creator.stats} />
            <ReviewsSection
              reviews={creator.reviews}
              ratingAvg={creator.stats.rating_avg}
              ratingCount={creator.stats.rating_count}
            />
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <PricingSidebar
              creatorId={creator.id}
              creatorUserId={creator.user_id}
              basePrice={creator.base_price}
              currency={creator.currency}
              packages={creator.packages}
              creatorName={creator.display_name}
              acceptsExchange={creator.accepts_product_exchange}
              exchangeConditions={creator.exchange_conditions}
            />
          </div>
        </div>

        {/* Similar creators (full width) */}
        <div className="mt-12">
          <SimilarCreators
            creatorIds={creator.similar_creator_ids}
            currentCreatorId={creator.id}
            categories={creator.categories}
          />
        </div>
      </div>
    </div>
  );
}
