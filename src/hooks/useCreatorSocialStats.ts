/**
 * Hook para obtener estadísticas de redes sociales de un creador
 * Conecta con Social Hub (social_accounts + snapshots) del usuario
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorSocialAccount {
  id: string;
  platform: string;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  is_active: boolean;
  // Métricas del último snapshot
  followers_count: number;
  following_count: number;
  posts_count: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  video_views: number;
  engagement_rate: number;
  reach: number;
}

export interface CreatorSocialStatsTotals {
  total_followers: number;
  total_following: number;
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_video_views: number;
  total_reach: number;
  avg_engagement_rate: number;
  platforms_count: number;
  accounts: CreatorSocialAccount[];
}

/**
 * Obtener estadísticas sociales de un creador desde Social Hub
 */
export function useCreatorSocialStats(creatorProfileId: string | undefined) {
  return useQuery({
    queryKey: ['creator-social-stats', creatorProfileId],
    queryFn: async (): Promise<CreatorSocialStatsTotals | null> => {
      if (!creatorProfileId) return null;

      // 1. Obtener el user_id del creator_profile
      const { data: creatorProfile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('user_id')
        .eq('id', creatorProfileId)
        .single();

      if (profileError || !creatorProfile?.user_id) {
        console.error('[useCreatorSocialStats] Error getting creator profile:', profileError);
        return null;
      }

      const userId = creatorProfile.user_id;

      // 2. Obtener las cuentas sociales activas del usuario
      const { data: accounts, error: accountsError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('platform', { ascending: true });

      if (accountsError) {
        console.error('[useCreatorSocialStats] Error getting social accounts:', accountsError);
        return null;
      }

      if (!accounts || accounts.length === 0) {
        return null;
      }

      // 3. Obtener las métricas más recientes de cada cuenta (snapshots)
      const accountIds = accounts.map(a => a.id);
      const { data: snapshots, error: snapshotsError } = await supabase
        .from('social_account_snapshots')
        .select('*')
        .in('account_id', accountIds)
        .order('snapshot_date', { ascending: false });

      if (snapshotsError) {
        console.error('[useCreatorSocialStats] Error getting snapshots:', snapshotsError);
      }

      // Obtener el último snapshot por cuenta
      const latestSnapshots: Record<string, any> = {};
      if (snapshots) {
        for (const snapshot of snapshots) {
          if (!latestSnapshots[snapshot.account_id]) {
            latestSnapshots[snapshot.account_id] = snapshot;
          }
        }
      }

      // 4. Combinar cuentas con sus métricas
      const accountsWithMetrics: CreatorSocialAccount[] = accounts.map(account => {
        const snapshot = latestSnapshots[account.id] || {};

        const followers = snapshot.followers_count || 0;
        const likes = Number(snapshot.total_likes || 0);
        const comments = Number(snapshot.total_comments || 0);
        const shares = Number(snapshot.total_shares || 0);
        const reach = Number(snapshot.reach || 0);

        // Calcular engagement rate
        const totalEngagement = likes + comments + shares;
        const denominator = reach > 0 ? reach : followers > 0 ? followers : 1;
        const engagementRate = (totalEngagement / denominator) * 100;

        return {
          id: account.id,
          platform: account.platform,
          platform_username: account.platform_username,
          platform_display_name: account.platform_display_name,
          platform_avatar_url: account.platform_avatar_url,
          is_active: account.is_active,
          followers_count: followers,
          following_count: snapshot.following_count || 0,
          posts_count: snapshot.posts_count || 0,
          total_likes: likes,
          total_comments: comments,
          total_shares: shares,
          video_views: Number(snapshot.video_views || 0),
          engagement_rate: engagementRate,
          reach: reach,
        };
      });

      // 5. Calcular totales
      const totals = accountsWithMetrics.reduce(
        (acc, account) => ({
          total_followers: acc.total_followers + account.followers_count,
          total_following: acc.total_following + account.following_count,
          total_posts: acc.total_posts + account.posts_count,
          total_likes: acc.total_likes + account.total_likes,
          total_comments: acc.total_comments + account.total_comments,
          total_shares: acc.total_shares + account.total_shares,
          total_video_views: acc.total_video_views + account.video_views,
          total_reach: acc.total_reach + account.reach,
          engagement_sum: acc.engagement_sum + account.engagement_rate,
        }),
        {
          total_followers: 0,
          total_following: 0,
          total_posts: 0,
          total_likes: 0,
          total_comments: 0,
          total_shares: 0,
          total_video_views: 0,
          total_reach: 0,
          engagement_sum: 0,
        }
      );

      return {
        ...totals,
        avg_engagement_rate: accountsWithMetrics.length > 0
          ? totals.engagement_sum / accountsWithMetrics.length
          : 0,
        platforms_count: accountsWithMetrics.length,
        accounts: accountsWithMetrics,
      };
    },
    enabled: !!creatorProfileId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export default useCreatorSocialStats;
