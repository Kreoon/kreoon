// Escrow Service - Business logic for escrow operations
import { supabase } from '@/integrations/supabase/client';
import type { EscrowHold, EscrowStatus, CreateEscrowInput } from '../types';

export class EscrowService {
  /**
   * Create a new escrow hold (via edge function for atomic operation)
   */
  static async createEscrow(input: CreateEscrowInput): Promise<string> {
    const { data, error } = await supabase.functions.invoke('wallet-create-escrow', {
      body: input,
    });

    if (error) throw error;
    return data.escrow_id;
  }

  /**
   * Get escrow by ID
   */
  static async getEscrow(escrowId: string): Promise<EscrowHold | null> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .select('*')
      .eq('id', escrowId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as EscrowHold | null;
  }

  /**
   * Get escrows for a content piece
   */
  static async getContentEscrows(contentId: string): Promise<EscrowHold[]> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .select('*')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EscrowHold[];
  }

  /**
   * Get escrows for a campaign
   */
  static async getCampaignEscrows(campaignId: string): Promise<EscrowHold[]> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EscrowHold[];
  }

  /**
   * Get organization escrows with optional status filter
   */
  static async getOrganizationEscrows(
    organizationId: string,
    status?: EscrowStatus[]
  ): Promise<EscrowHold[]> {
    let query = supabase
      .from('escrow_holds')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as EscrowHold[];
  }

  /**
   * Assign editor to escrow
   */
  static async assignEditor(escrowId: string, editorWalletId: string): Promise<EscrowHold> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .update({
        editor_wallet_id: editorWalletId,
        editor_assigned_at: new Date().toISOString(),
        status: 'pending_editor' as EscrowStatus,
      })
      .eq('id', escrowId)
      .select()
      .single();

    if (error) throw error;
    return data as EscrowHold;
  }

  /**
   * Assign creator to escrow
   */
  static async assignCreator(escrowId: string, creatorWalletId: string): Promise<EscrowHold> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .update({
        creator_wallet_id: creatorWalletId,
      })
      .eq('id', escrowId)
      .select()
      .single();

    if (error) throw error;
    return data as EscrowHold;
  }

  /**
   * Mark content as delivered
   */
  static async markDelivered(escrowId: string): Promise<EscrowHold> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .update({
        content_delivered_at: new Date().toISOString(),
        status: 'pending_approval' as EscrowStatus,
      })
      .eq('id', escrowId)
      .select()
      .single();

    if (error) throw error;
    return data as EscrowHold;
  }

  /**
   * Release escrow (via edge function for atomic operation)
   */
  static async releaseEscrow(escrowId: string, platformWalletId?: string): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('wallet-release-escrow', {
      body: { escrow_id: escrowId, platform_wallet_id: platformWalletId },
    });

    if (error) throw error;
    return data.success;
  }

  /**
   * Refund escrow (via edge function for atomic operation)
   */
  static async refundEscrow(escrowId: string, reason?: string): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('wallet-refund-escrow', {
      body: { escrow_id: escrowId, reason },
    });

    if (error) throw error;
    return data.success;
  }

  /**
   * Initiate dispute
   */
  static async initiateDispute(escrowId: string, reason: string): Promise<EscrowHold> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .update({
        status: 'disputed' as EscrowStatus,
        metadata: supabase.rpc('jsonb_set', {
          target: 'metadata',
          path: '{dispute_reason}',
          value: JSON.stringify(reason),
        }),
        notes: `Disputa iniciada: ${reason}`,
      })
      .eq('id', escrowId)
      .select()
      .single();

    if (error) throw error;
    return data as EscrowHold;
  }

  /**
   * Calculate escrow distribution amounts
   */
  static calculateDistribution(
    totalAmount: number,
    creatorPercentage: number = 70,
    editorPercentage: number = 20,
    platformPercentage: number = 10
  ): {
    creatorAmount: number;
    editorAmount: number;
    platformFee: number;
  } {
    const platformFee = Math.round(totalAmount * (platformPercentage / 100) * 100) / 100;
    const remaining = totalAmount - platformFee;
    const creatorRatio = creatorPercentage / (creatorPercentage + editorPercentage);
    const creatorAmount = Math.round(remaining * creatorRatio * 100) / 100;
    const editorAmount = remaining - creatorAmount;

    return { creatorAmount, editorAmount, platformFee };
  }
}
