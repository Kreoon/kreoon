import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CampaignInvitation, InvitationStatus } from '@/components/marketplace/types/marketplace';

function mapInvitationRow(row: any, profile?: { id: string; full_name: string; avatar_url: string | null }): CampaignInvitation {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    invited_profile_id: row.invited_profile_id,
    invited_by: row.invited_by,
    message: row.message || undefined,
    status: row.status as InvitationStatus,
    sent_at: row.sent_at || '',
    responded_at: row.responded_at || undefined,
    expires_at: row.expires_at || '',
    invited_profile: profile,
  };
}

export function useCampaignInvitations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getInvitationsForCampaign = useCallback(async (campaignId: string): Promise<CampaignInvitation[]> => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await (supabase as any)
        .from('campaign_invitations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (err) throw err;
      if (!rows?.length) return [];

      // Fetch invited profiles
      const profileIds = [...new Set(rows.map((r: any) => r.invited_profile_id).filter(Boolean))] as string[];
      const profilesMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();

      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', profileIds);
        for (const p of profiles || []) {
          profilesMap.set(p.id, { id: p.id, full_name: p.full_name || '', avatar_url: p.avatar_url });
        }
      }

      return rows.map((row: any) => mapInvitationRow(row, profilesMap.get(row.invited_profile_id)));
    } catch (err) {
      console.error('[useCampaignInvitations] Fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyInvitations = useCallback(async (): Promise<CampaignInvitation[]> => {
    if (!user?.id) return [];
    setLoading(true);
    try {
      const { data: rows, error: err } = await (supabase as any)
        .from('campaign_invitations')
        .select('*')
        .eq('invited_profile_id', user.id)
        .in('status', ['pending', 'accepted'])
        .order('sent_at', { ascending: false });

      if (err) throw err;
      return (rows || []).map((row: any) => mapInvitationRow(row));
    } catch (err) {
      console.error('[useCampaignInvitations] My invitations error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createInvitation = useCallback(async (
    campaignId: string,
    profileId: string,
    message?: string,
  ): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const { data: result, error: err } = await (supabase as any)
        .from('campaign_invitations')
        .insert({
          campaign_id: campaignId,
          invited_profile_id: profileId,
          invited_by: user.id,
          message: message || null,
        })
        .select('id')
        .single();

      if (err) throw err;
      return result?.id || null;
    } catch (err) {
      console.error('[useCampaignInvitations] Create error:', err);
      return null;
    }
  }, [user?.id]);

  const createBulkInvitations = useCallback(async (
    campaignId: string,
    profileIds: string[],
    message?: string,
  ): Promise<boolean> => {
    if (!user?.id || !profileIds.length) return false;
    try {
      const rows = profileIds.map(profileId => ({
        campaign_id: campaignId,
        invited_profile_id: profileId,
        invited_by: user.id,
        message: message || null,
      }));

      const { error: err } = await (supabase as any)
        .from('campaign_invitations')
        .insert(rows);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('[useCampaignInvitations] Bulk create error:', err);
      return false;
    }
  }, [user?.id]);

  const respondToInvitation = useCallback(async (
    invitationId: string,
    response: 'accepted' | 'declined',
  ): Promise<boolean> => {
    try {
      const { error: err } = await (supabase as any)
        .from('campaign_invitations')
        .update({
          status: response,
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('[useCampaignInvitations] Respond error:', err);
      return false;
    }
  }, []);

  return {
    loading,
    getInvitationsForCampaign,
    getMyInvitations,
    createInvitation,
    createBulkInvitations,
    respondToInvitation,
  };
}
