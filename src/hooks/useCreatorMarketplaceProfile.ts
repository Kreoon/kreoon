import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  CreatorMarketplaceProfile,
  MarketplaceProfileStats,
  CreatorService,
  CreatorAvailability,
  MarketplaceReview,
  MarketplaceBadge,
} from '@/types/marketplace';

export function useCreatorMarketplaceProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['creator-marketplace-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          bio,
          is_available_for_hire,
          marketplace_enabled,
          minimum_budget,
          preferred_contact_method,
          is_featured_creator,
          featured_until,
          total_contracts_completed,
          total_earnings,
          avg_rating,
          response_rate,
          on_time_delivery_rate,
          is_independent
        `)
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch organization if not independent
      let organizationName = null;
      let organizationId = null;
      if (!profile.is_independent) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select(`
            organization_id,
            organizations (name)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (membership) {
          organizationId = membership.organization_id;
          organizationName = (membership.organizations as any)?.name || null;
        }
      }

      // Fetch services
      const { data: servicesData } = await (supabase as any)
        .from('creator_services')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true });

      const services: CreatorService[] = (servicesData || []).map((s: any) => ({
        ...s,
        deliverables: s.deliverables || [],
        portfolio_items: s.portfolio_items || [],
      }));

      // Fetch availability
      const { data: availabilityData } = await (supabase as any)
        .from('creator_availability')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const availability: CreatorAvailability | null = availabilityData
        ? {
            ...availabilityData,
            preferred_industries: availabilityData.preferred_industries || [],
            do_not_work_with: availabilityData.do_not_work_with || [],
          }
        : null;

      // Fetch verification
      const { data: verification } = await (supabase as any)
        .from('marketplace_verifications')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch recent reviews
      const { data: reviewsData } = await (supabase as any)
        .from('marketplace_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id (id, full_name, avatar_url, username)
        `)
        .eq('reviewed_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentReviews: MarketplaceReview[] = reviewsData || [];

      // Count total reviews
      const { count: reviewsCount } = await (supabase as any)
        .from('marketplace_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed_id', userId)
        .eq('is_public', true);

      // Build stats
      const stats: MarketplaceProfileStats = {
        total_contracts_completed: profile.total_contracts_completed || 0,
        total_earnings: profile.total_earnings || 0,
        avg_rating: profile.avg_rating,
        response_rate: profile.response_rate,
        on_time_delivery_rate: profile.on_time_delivery_rate,
        reviews_count: reviewsCount || 0,
        services_count: services.length,
        is_verified: verification?.verification_status === 'verified',
        verification_level: verification?.verification_level || 0,
        badges: (verification?.badges || []) as MarketplaceBadge[],
      };

      const creatorProfile: CreatorMarketplaceProfile = {
        id: profile.id,
        full_name: profile.full_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_available_for_hire: profile.is_available_for_hire,
        marketplace_enabled: profile.marketplace_enabled,
        minimum_budget: profile.minimum_budget,
        preferred_contact_method: profile.preferred_contact_method || 'kreoon',
        is_featured_creator: profile.is_featured_creator,
        featured_until: profile.featured_until,
        is_independent: profile.is_independent,
        organization_id: organizationId,
        organization_name: organizationName,
        stats,
        availability,
        services,
        recent_reviews: recentReviews,
      };

      return creatorProfile;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to track profile views
export function useTrackProfileView(profileId: string | undefined) {
  return useQuery({
    queryKey: ['track-profile-view', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // Get current user or anonymous ID
      const { data: { user } } = await supabase.auth.getUser();
      const anonId = !user ? localStorage.getItem('anon_viewer_id') : null;

      // Don't track self-views
      if (user?.id === profileId) return null;

      // Insert view
      await (supabase as any)
        .from('profile_views')
        .insert({
          profile_id: profileId,
          viewer_id: user?.id || null,
          viewer_anon_id: anonId,
          source: 'direct',
        });

      return true;
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 30, // Only track once per 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook to get profile view stats (for profile owner)
export function useProfileViewStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile-view-stats', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total views
      const { count: totalViews } = await (supabase as any)
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      // Views last 7 days
      const { count: views7Days } = await (supabase as any)
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('viewed_at', last7Days.toISOString());

      // Views last 30 days
      const { count: views30Days } = await (supabase as any)
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('viewed_at', last30Days.toISOString());

      // Unique viewers last 30 days
      const { data: uniqueViewers } = await (supabase as any)
        .from('profile_views')
        .select('viewer_id, viewer_anon_id')
        .eq('profile_id', profileId)
        .gte('viewed_at', last30Days.toISOString());

      const uniqueCount = new Set(
        (uniqueViewers || []).map((v: any) => v.viewer_id || v.viewer_anon_id)
      ).size;

      return {
        total: totalViews || 0,
        last7Days: views7Days || 0,
        last30Days: views30Days || 0,
        uniqueLast30Days: uniqueCount,
      };
    },
    enabled: !!profileId,
  });
}
