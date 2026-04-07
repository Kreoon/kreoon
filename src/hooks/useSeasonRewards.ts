import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type RewardType = 'points_bonus' | 'badge' | 'monetary' | 'custom';
export type PositionType = 'rank' | 'percentile' | 'threshold';
export type ClaimStatus = 'pending' | 'claimed' | 'delivered' | 'expired' | 'cancelled';

export interface SeasonReward {
  id: string;
  season_id: string;
  organization_id: string;
  reward_type: RewardType;
  position_type: PositionType;
  position_min: number;
  position_max: number | null;
  role_key: string | null;
  points_amount: number;
  badge_id: string | null;
  monetary_amount: number;
  monetary_currency: string;
  custom_data: Record<string, unknown>;
  display_name: string;
  display_icon: string;
  display_color: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface SeasonRewardClaim {
  id: string;
  season_id: string;
  reward_id: string;
  user_id: string;
  organization_id: string;
  final_rank: number;
  final_points: number;
  final_level: string | null;
  role_key: string;
  status: ClaimStatus;
  claimed_at: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
  delivery_notes: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  claim_data: Record<string, unknown>;
  notification_sent: boolean;
  created_at: string;
  reward?: SeasonReward;
}

export interface CreateRewardInput {
  season_id: string;
  organization_id: string;
  reward_type: RewardType;
  position_type: PositionType;
  position_min: number;
  position_max?: number | null;
  role_key?: string | null;
  points_amount?: number;
  badge_id?: string | null;
  monetary_amount?: number;
  monetary_currency?: string;
  custom_data?: Record<string, unknown>;
  display_name: string;
  display_icon?: string;
  display_color?: string;
  description?: string | null;
  priority?: number;
}

// Presets de premios comunes
export const REWARD_PRESETS = {
  champion: {
    display_name: 'Campeon de Temporada',
    display_icon: 'crown',
    display_color: '#FFD700',
    position_type: 'rank' as PositionType,
    position_min: 1,
    position_max: 1,
    priority: 1
  },
  top3: {
    display_name: 'Top 3',
    display_icon: 'medal',
    display_color: '#C0C0C0',
    position_type: 'rank' as PositionType,
    position_min: 1,
    position_max: 3,
    priority: 2
  },
  top10: {
    display_name: 'Top 10',
    display_icon: 'star',
    display_color: '#CD7F32',
    position_type: 'rank' as PositionType,
    position_min: 1,
    position_max: 10,
    priority: 3
  },
  top10Percent: {
    display_name: 'Top 10%',
    display_icon: 'trending-up',
    display_color: '#4CAF50',
    position_type: 'percentile' as PositionType,
    position_min: 10,
    priority: 4
  }
};

export function useSeasonRewards(seasonId?: string, organizationId?: string) {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const [userClaims, setUserClaims] = useState<SeasonRewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rewards for a season
  const fetchRewards = useCallback(async () => {
    if (!seasonId) {
      setRewards([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('season_rewards')
        .select('*')
        .eq('season_id', seasonId)
        .eq('is_active', true)
        .order('priority');

      if (fetchError) throw fetchError;

      setRewards((data || []) as SeasonReward[]);
    } catch (err) {
      console.error('Error fetching season rewards:', err);
      setError('Error al cargar premios');
    }
  }, [seasonId]);

  // Fetch user's claims
  const fetchUserClaims = useCallback(async () => {
    if (!user?.id) {
      setUserClaims([]);
      return;
    }

    try {
      let query = supabase
        .from('season_reward_claims')
        .select(`
          *,
          reward:season_rewards(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (seasonId) {
        query = query.eq('season_id', seasonId);
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setUserClaims((data || []) as SeasonRewardClaim[]);
    } catch (err) {
      console.error('Error fetching user claims:', err);
    }
  }, [user?.id, seasonId, organizationId]);

  // Create a new reward (admin only)
  const createReward = useCallback(async (input: CreateRewardInput): Promise<SeasonReward | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('season_rewards')
        .insert({
          ...input,
          is_active: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchRewards();
      return data as SeasonReward;
    } catch (err) {
      console.error('Error creating reward:', err);
      setError('Error al crear premio');
      return null;
    }
  }, [fetchRewards]);

  // Update a reward
  const updateReward = useCallback(async (
    rewardId: string,
    updates: Partial<SeasonReward>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('season_rewards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', rewardId);

      if (updateError) throw updateError;

      await fetchRewards();
      return true;
    } catch (err) {
      console.error('Error updating reward:', err);
      setError('Error al actualizar premio');
      return false;
    }
  }, [fetchRewards]);

  // Delete a reward (soft delete)
  const deleteReward = useCallback(async (rewardId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('season_rewards')
        .update({ is_active: false })
        .eq('id', rewardId);

      if (deleteError) throw deleteError;

      await fetchRewards();
      return true;
    } catch (err) {
      console.error('Error deleting reward:', err);
      setError('Error al eliminar premio');
      return false;
    }
  }, [fetchRewards]);

  // Mark claim as delivered (admin)
  const deliverClaim = useCallback(async (
    claimId: string,
    deliveryNotes?: string,
    paymentReference?: string,
    paymentMethod?: string
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('season_reward_claims')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivered_by: user?.id,
          delivery_notes: deliveryNotes,
          payment_reference: paymentReference,
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (updateError) throw updateError;

      await fetchUserClaims();
      return true;
    } catch (err) {
      console.error('Error delivering claim:', err);
      return false;
    }
  }, [user?.id, fetchUserClaims]);

  // Get rewards by position type
  const getRewardsByPosition = useCallback(() => {
    const byRank = rewards.filter(r => r.position_type === 'rank');
    const byPercentile = rewards.filter(r => r.position_type === 'percentile');
    const byThreshold = rewards.filter(r => r.position_type === 'threshold');

    return { byRank, byPercentile, byThreshold };
  }, [rewards]);

  // Get potential reward for a given position
  const getPotentialReward = useCallback((
    rank: number,
    percentile: number,
    points: number,
    roleKey?: string
  ): SeasonReward | null => {
    // Filtrar por rol si aplica
    const applicableRewards = rewards.filter(r =>
      !r.role_key || r.role_key === roleKey
    );

    // Buscar premio por rank
    const rankReward = applicableRewards.find(r =>
      r.position_type === 'rank' &&
      rank >= r.position_min &&
      (!r.position_max || rank <= r.position_max)
    );
    if (rankReward) return rankReward;

    // Buscar premio por percentil
    const percentileReward = applicableRewards.find(r =>
      r.position_type === 'percentile' &&
      percentile <= r.position_min
    );
    if (percentileReward) return percentileReward;

    // Buscar premio por threshold
    const thresholdReward = applicableRewards.find(r =>
      r.position_type === 'threshold' &&
      points >= r.position_min
    );
    if (thresholdReward) return thresholdReward;

    return null;
  }, [rewards]);

  // Get pending claims (for admin dashboard)
  const getPendingClaims = useCallback(async (orgId: string): Promise<SeasonRewardClaim[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('season_reward_claims')
        .select(`
          *,
          reward:season_rewards(*)
        `)
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at');

      if (fetchError) throw fetchError;

      return (data || []) as SeasonRewardClaim[];
    } catch (err) {
      console.error('Error fetching pending claims:', err);
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRewards(), fetchUserClaims()]);
      setLoading(false);
    };

    loadData();
  }, [fetchRewards, fetchUserClaims]);

  // Realtime subscription
  useEffect(() => {
    if (!seasonId) return;

    const channel = supabase
      .channel('season-rewards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'season_rewards',
          filter: `season_id=eq.${seasonId}`
        },
        () => fetchRewards()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'season_reward_claims',
          filter: `season_id=eq.${seasonId}`
        },
        () => fetchUserClaims()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [seasonId, fetchRewards, fetchUserClaims]);

  return {
    rewards,
    userClaims,
    loading,
    error,
    createReward,
    updateReward,
    deleteReward,
    deliverClaim,
    getRewardsByPosition,
    getPotentialReward,
    getPendingClaims,
    refetch: () => Promise.all([fetchRewards(), fetchUserClaims()]),
    REWARD_PRESETS
  };
}
