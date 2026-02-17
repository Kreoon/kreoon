// Escrow Service - Business logic for escrow operations
import { supabase } from '@/integrations/supabase/client';
import type { EscrowHold, EscrowStatus, CreateEscrowInput } from '../types';

// Helper to invoke the escrow-service edge function with auth
async function invokeEscrowService<T = any>(
  action: string,
  body: Record<string, any>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data, error } = await supabase.functions.invoke(`escrow-service/${action}`, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || `Error en escrow/${action}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export class EscrowService {
  /**
   * Create a new escrow hold (via edge function for atomic operation)
   */
  static async createEscrow(input: CreateEscrowInput): Promise<string> {
    const data = await invokeEscrowService('create', input);
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
   * Get escrows for a project
   */
  static async getProjectEscrows(projectId: string): Promise<EscrowHold[]> {
    const { data, error } = await supabase
      .from('escrow_holds')
      .select('*')
      .eq('project_id', projectId)
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
   * Approve escrow (via edge function)
   */
  static async approveEscrow(escrowId: string): Promise<boolean> {
    const data = await invokeEscrowService('approve', { escrow_id: escrowId });
    return data.success;
  }

  /**
   * Release escrow (via edge function for atomic operation)
   */
  static async releaseEscrow(escrowId: string, milestoneId?: string): Promise<boolean> {
    const data = await invokeEscrowService('release', {
      escrow_id: escrowId,
      milestone_id: milestoneId,
    });
    return data.success;
  }

  /**
   * Refund escrow (via edge function for atomic operation)
   */
  static async refundEscrow(escrowId: string, reason?: string, partialAmount?: number): Promise<boolean> {
    const data = await invokeEscrowService('refund', {
      escrow_id: escrowId,
      reason,
      partial_amount: partialAmount,
    });
    return data.success;
  }

  /**
   * Initiate dispute (via edge function)
   */
  static async initiateDispute(escrowId: string, reason: string): Promise<boolean> {
    const data = await invokeEscrowService('dispute', {
      escrow_id: escrowId,
      reason,
    });
    return data.success;
  }

  /**
   * Calculate escrow distribution amounts
   */
  static calculateDistribution(
    totalAmount: number,
    creatorPercentage: number = 70,
    editorPercentage: number = 15,
    platformPercentage: number = 25
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
