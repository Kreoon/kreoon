import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MarketplaceStats {
  // Common
  activeProjects: number;
  completedProjects: number;

  // Creator-specific
  pendingOffers: number;
  inProgress: number;
  creatorEarnings: number;
  availableCampaigns: number;

  // Editor-specific
  pendingEdits: number;
  delivered: number;
  editorEarnings: number;

  // Brand-specific
  activeCampaigns: number;
  inRevision: number;
  totalInvested: number;
}

const EMPTY_STATS: MarketplaceStats = {
  activeProjects: 0,
  completedProjects: 0,
  pendingOffers: 0,
  inProgress: 0,
  creatorEarnings: 0,
  availableCampaigns: 0,
  pendingEdits: 0,
  delivered: 0,
  editorEarnings: 0,
  activeCampaigns: 0,
  inRevision: 0,
  totalInvested: 0,
};

interface UseMarketplaceStatsOptions {
  role?: 'creator' | 'editor' | 'brand' | 'admin';
  brandId?: string;
}

export function useMarketplaceStats(options: UseMarketplaceStatsOptions = {}) {
  const { user } = useAuth();
  const [stats, setStats] = useState<MarketplaceStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const result: MarketplaceStats = { ...EMPTY_STATS };

      // Fetch projects based on role
      let projectQuery = (supabase as any)
        .from('marketplace_projects')
        .select('status, total_price, payment_method, payment_status, creator_payout');

      if (options.role === 'creator') {
        projectQuery = projectQuery.eq('creator_id', user.id);
      } else if (options.role === 'editor') {
        projectQuery = projectQuery.eq('editor_id', user.id);
      } else if (options.role === 'brand' && options.brandId) {
        projectQuery = projectQuery.eq('brand_id', options.brandId);
      }
      // admin: no filter = all projects

      const { data: projects } = await projectQuery;

      if (projects) {
        for (const p of projects) {
          const status = p.status as string;
          const price = Number(p.total_price) || 0;
          const payout = Number(p.creator_payout) || 0;
          const isReleased = p.payment_method === 'payment' && p.payment_status === 'released';

          // Common stats
          if (!['completed', 'cancelled'].includes(status)) {
            result.activeProjects++;
          }
          if (status === 'completed') result.completedProjects++;

          // Creator stats
          if (status === 'pending') result.pendingOffers++;
          if (status === 'in_progress') result.inProgress++;
          if (isReleased) result.creatorEarnings += payout || price;

          // Editor stats
          if (status === 'in_progress') result.pendingEdits++;
          if (status === 'revision') result.delivered++;
          if (status === 'approved' && price > 0) {
            result.editorEarnings += price * 0.15;
          }

          // Brand stats
          if (status === 'revision') result.inRevision++;
          if (isReleased) result.totalInvested += price;
        }
      }

      // Fetch campaign count
      if (options.role === 'creator' || options.role === 'admin') {
        const { count } = await (supabase as any)
          .from('marketplace_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');
        result.availableCampaigns = count || 0;
      }

      if (options.role === 'brand' && options.brandId) {
        const { count } = await (supabase as any)
          .from('marketplace_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', options.brandId)
          .eq('status', 'active');
        result.activeCampaigns = count || 0;
      }

      if (options.role === 'admin') {
        const { count } = await (supabase as any)
          .from('marketplace_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');
        result.activeCampaigns = count || 0;
      }

      setStats(result);
    } catch (err) {
      console.error('[useMarketplaceStats] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, options.role, options.brandId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
