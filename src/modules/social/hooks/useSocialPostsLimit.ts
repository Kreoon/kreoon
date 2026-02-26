import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PLANS, getPlanById } from '@/lib/finance/constants';

/**
 * Default limit for free plan
 */
const FREE_PLAN_LIMIT = 50;

/**
 * Plan ID mappings from subscription tier to constants.ts plan IDs
 */
function getPlanIdFromTier(tier: string | null, accountType?: string): string {
  if (!tier) {
    // No subscription = free plan based on account type
    if (accountType === 'talent') return 'creadores-basico';
    return 'marcas-free';
  }

  // Map tier names to plan IDs
  const tierMap: Record<string, string> = {
    // Marcas
    brand_free: 'marcas-free',
    brand_starter: 'marcas-starter',
    brand_pro: 'marcas-pro',
    brand_business: 'marcas-business',
    // Creadores
    creator_free: 'creadores-basico',
    creator_pro: 'creadores-pro',
    // Agencias
    agency_starter: 'agencias-starter',
    agency_pro: 'agencias-pro',
    agency_enterprise: 'agencias-enterprise',
    // Legacy fallbacks
    starter: 'marcas-starter',
    pro: 'marcas-pro',
    business: 'marcas-business',
  };

  return tierMap[tier] || (accountType === 'talent' ? 'creadores-basico' : 'marcas-free');
}

export interface SocialPostsLimitStatus {
  loading: boolean;
  usedThisMonth: number;
  limit: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
  percentUsed: number;
  canCreatePost: boolean;
  isUnlimited: boolean;
  planName: string;
  refresh: () => void;
}

/**
 * Hook to check Social Hub posts limit for the current month.
 * Counts posts from scheduled_posts table where created_at is in current month.
 */
export function useSocialPostsLimit(): SocialPostsLimitStatus {
  const { user, profile } = useAuth();
  const orgId = profile?.current_organization_id;
  const accountType = user?.user_metadata?.account_type;
  const isTalent = accountType === 'talent';

  // Get subscription - personal for talents, org for others
  const subscriptionScope = isTalent ? null : orgId;
  const { currentTier, isLoading: subLoading } = useSubscription(subscriptionScope);

  // Get limit from plan
  const planId = getPlanIdFromTier(currentTier, accountType);
  const plan = getPlanById(planId);
  const limit = plan?.socialPostsPerMonth ?? FREE_PLAN_LIMIT;
  const isUnlimited = limit === null;

  // Count posts this month
  const {
    data: usedThisMonth = 0,
    isLoading: countLoading,
    refetch,
  } = useQuery({
    queryKey: ['social-posts-count', user?.id, orgId],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Get first day of current month in UTC
      const now = new Date();
      const firstDayOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

      let query = supabase
        .from('scheduled_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', firstDayOfMonth.toISOString());

      // Filter by org if applicable
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { count, error } = await query;
      if (error) {
        console.error('[useSocialPostsLimit] Error counting posts:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 min cache
  });

  const loading = subLoading || countLoading;
  const remaining = isUnlimited ? null : Math.max(0, limit - usedThisMonth);
  const percentUsed = isUnlimited ? 0 : Math.min(100, (usedThisMonth / limit) * 100);
  const canCreatePost = isUnlimited || usedThisMonth < limit;

  return {
    loading,
    usedThisMonth,
    limit,
    remaining,
    percentUsed,
    canCreatePost,
    isUnlimited,
    planName: plan?.name || 'Básico',
    refresh: refetch,
  };
}
