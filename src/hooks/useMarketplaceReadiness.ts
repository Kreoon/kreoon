import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MarketplaceReadinessStatus {
  loading: boolean;
  isReady: boolean;
  hasCreatorProfile: boolean;
  hasAvatar: boolean;
  hasPortfolio: boolean;
  portfolioCount: number;
  creatorProfileId: string | null;
  avatarUrl: string | null;
  refresh: () => void;
}

/**
 * Hook to check if a talent user is ready to appear in the marketplace.
 * Requirements (same as useMarketplaceCreators filter):
 * 1. Have avatar_url (from creator_profiles OR profiles as fallback)
 * 2. Have at least 1 portfolio item from: portfolio_items, published content, or portfolio_posts
 */
export function useMarketplaceReadiness(): MarketplaceReadinessStatus {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<MarketplaceReadinessStatus>({
    loading: true,
    isReady: false,
    hasCreatorProfile: false,
    hasAvatar: false,
    hasPortfolio: false,
    portfolioCount: 0,
    creatorProfileId: null,
    avatarUrl: null,
    refresh: () => {},
  });

  const checkReadiness = useCallback(async () => {
    if (!user?.id) {
      setStatus(prev => ({ ...prev, loading: false, refresh: checkReadiness }));
      return;
    }

    // Only check for talent users
    const userType = user.user_metadata?.account_type;
    if (userType !== 'talent') {
      setStatus(prev => ({
        ...prev,
        loading: false,
        isReady: true, // Non-talent users are always "ready" (no popup)
        refresh: checkReadiness,
      }));
      return;
    }

    try {
      // Get creator profile with avatar
      const { data: creatorProfile, error: cpError } = await (supabase as any)
        .from('creator_profiles')
        .select('id, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cpError) throw cpError;

      const hasCreatorProfile = !!creatorProfile;
      // Avatar can come from creator_profiles OR profiles (fallback, same as marketplace)
      const avatarUrl = creatorProfile?.avatar_url || profile?.avatar_url || null;
      const hasAvatar = !!avatarUrl && avatarUrl.trim() !== '';
      const creatorProfileId = creatorProfile?.id || null;

      // Count portfolio from ALL sources (same as useMarketplaceCreators):
      // 1. portfolio_items (marketplace native)
      // 2. content (published videos)
      // 3. portfolio_posts (social feed)

      let portfolioItemsCount = 0;
      let publishedContentCount = 0;
      let portfolioPostsCount = 0;

      // 1. Portfolio items (if creator profile exists)
      if (creatorProfileId) {
        const { count, error: piError } = await (supabase as any)
          .from('portfolio_items')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', creatorProfileId);

        if (!piError) portfolioItemsCount = count || 0;
      }

      // 2. Published content
      const { count: contentCount, error: contentError } = await supabase
        .from('content')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('is_published', true);

      if (!contentError) publishedContentCount = contentCount || 0;

      // 3. Portfolio posts
      const { count: postsCount, error: postsError } = await supabase
        .from('portfolio_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!postsError) portfolioPostsCount = postsCount || 0;

      const totalPortfolio = portfolioItemsCount + publishedContentCount + portfolioPostsCount;
      const hasPortfolio = totalPortfolio > 0;
      const isReady = hasAvatar && hasPortfolio;

      setStatus({
        loading: false,
        isReady,
        hasCreatorProfile,
        hasAvatar,
        hasPortfolio,
        portfolioCount: totalPortfolio,
        creatorProfileId,
        avatarUrl,
        refresh: checkReadiness,
      });
    } catch (err) {
      console.error('[useMarketplaceReadiness] Error:', err);
      setStatus(prev => ({ ...prev, loading: false, refresh: checkReadiness }));
    }
  }, [user?.id, profile?.avatar_url]);

  useEffect(() => {
    checkReadiness();
  }, [checkReadiness]);

  return status;
}
