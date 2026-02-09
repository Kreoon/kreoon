import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CampaignDeliverable, DeliverableStatus } from '@/components/marketplace/types/marketplace';

function mapDeliverableRow(row: any): CampaignDeliverable {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    creator_id: row.creator_id,
    application_id: row.application_id || undefined,
    title: row.title || undefined,
    description: row.description || undefined,
    file_url: row.file_url,
    file_type: row.file_type || 'video',
    thumbnail_url: row.thumbnail_url || undefined,
    duration_seconds: row.duration_seconds != null ? Number(row.duration_seconds) : undefined,
    file_size_mb: row.file_size_mb != null ? Number(row.file_size_mb) : undefined,
    revision_number: Number(row.revision_number) || 1,
    max_revisions: Number(row.max_revisions) || 2,
    status: row.status as DeliverableStatus,
    feedback: row.feedback || undefined,
    approved_by: row.approved_by || undefined,
    submitted_at: row.submitted_at || '',
    reviewed_at: row.reviewed_at || undefined,
    updated_at: row.updated_at || '',
  };
}

export function useCampaignDeliverables() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getDeliverablesForCampaign = useCallback(async (campaignId: string): Promise<CampaignDeliverable[]> => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await (supabase as any)
        .from('campaign_deliverables')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('submitted_at', { ascending: false });

      if (err) throw err;
      return (rows || []).map(mapDeliverableRow);
    } catch (err) {
      console.error('[useCampaignDeliverables] Fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const submitDeliverable = useCallback(async (data: {
    campaign_id: string;
    application_id?: string;
    title?: string;
    description?: string;
    file_url: string;
    file_type?: string;
    thumbnail_url?: string;
    duration_seconds?: number;
    file_size_mb?: number;
  }): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const { data: result, error: err } = await (supabase as any)
        .from('campaign_deliverables')
        .insert({
          ...data,
          creator_id: user.id,
          status: 'submitted',
        })
        .select('id')
        .single();

      if (err) throw err;
      return result?.id || null;
    } catch (err) {
      console.error('[useCampaignDeliverables] Submit error:', err);
      return null;
    }
  }, [user?.id]);

  const reviewDeliverable = useCallback(async (
    deliverableId: string,
    status: 'approved' | 'revision_requested' | 'rejected',
    feedback?: string,
  ): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const updateData: Record<string, any> = {
        status,
        reviewed_at: new Date().toISOString(),
      };
      if (feedback) updateData.feedback = feedback;
      if (status === 'approved') updateData.approved_by = user.id;

      const { error: err } = await (supabase as any)
        .from('campaign_deliverables')
        .update(updateData)
        .eq('id', deliverableId);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('[useCampaignDeliverables] Review error:', err);
      return false;
    }
  }, [user?.id]);

  return {
    loading,
    getDeliverablesForCampaign,
    submitDeliverable,
    reviewDeliverable,
  };
}
