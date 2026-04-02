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

      // Batch 1: Fetch all independent queries in parallel
      const [
        profileResult,
        servicesResult,
        availabilityResult,
        verificationResult,
        reviewsResult,
        reviewsCountResult,
        membershipResult,
      ] = await Promise.all([
        // Profile
        supabase
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
          .single(),
        // Services
        supabase
          .from('creator_services')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true }),
        // Availability
        supabase
          .from('creator_availability')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        // Verification
        supabase
          .from('marketplace_verifications')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        // Recent reviews
        supabase
          .from('marketplace_reviews')
          .select(`
            *,
            reviewer:profiles!reviewer_id (id, full_name, avatar_url, username)
          `)
          .eq('reviewed_id', userId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(5),
        // Reviews count
        supabase
          .from('marketplace_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('reviewed_id', userId)
          .eq('is_public', true),
        // Organization membership (fetch always, filter later based on is_independent)
        supabase
          .from('organization_members')
          .select(`
            organization_id,
            organizations (name)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      // Handle profile error (critical)
      if (profileResult.error) throw profileResult.error;
      const profile = profileResult.data;

      // Extract data from parallel results
      const servicesData = servicesResult.data;
      const availabilityData = availabilityResult.data;
      const verification = verificationResult.data;
      const reviewsData = reviewsResult.data;
      const reviewsCount = reviewsCountResult.count;

      // Process organization data (only use if not independent)
      let organizationName = null;
      let organizationId = null;
      if (!profile.is_independent && membershipResult.data) {
        organizationId = membershipResult.data.organization_id;
        organizationName = (membershipResult.data.organizations as any)?.name || null;
      }

      // Process services
      const services: CreatorService[] = (servicesData || []).map((s: any) => ({
        ...s,
        deliverables: s.deliverables || [],
        portfolio_items: s.portfolio_items || [],
      }));

      // Process availability
      const availability: CreatorAvailability | null = availabilityData
        ? {
            ...availabilityData,
            preferred_industries: availabilityData.preferred_industries || [],
            do_not_work_with: availabilityData.do_not_work_with || [],
          }
        : null;

      const recentReviews: MarketplaceReview[] = reviewsData || [];

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
      await supabase
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

      // Fetch all stats in parallel
      const [
        totalViewsResult,
        views7DaysResult,
        views30DaysResult,
        uniqueViewersResult,
      ] = await Promise.all([
        // Total views
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId),
        // Views last 7 days
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .gte('viewed_at', last7Days.toISOString()),
        // Views last 30 days
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .gte('viewed_at', last30Days.toISOString()),
        // Unique viewers last 30 days
        supabase
          .from('profile_views')
          .select('viewer_id, viewer_anon_id')
          .eq('profile_id', profileId)
          .gte('viewed_at', last30Days.toISOString()),
      ]);

      const uniqueCount = new Set(
        (uniqueViewersResult.data || []).map((v: any) => v.viewer_id || v.viewer_anon_id)
      ).size;

      return {
        total: totalViewsResult.count || 0,
        last7Days: views7DaysResult.count || 0,
        last30Days: views30DaysResult.count || 0,
        uniqueLast30Days: uniqueCount,
      };
    },
    enabled: !!profileId,
  });
}
