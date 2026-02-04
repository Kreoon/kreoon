// Withdrawal Service - Business logic for withdrawal operations
import { supabase } from '@/integrations/supabase/client';
import type {
  WithdrawalRequest,
  WithdrawalStatus,
  PaymentMethodType,
  PaymentDetails,
  CreateWithdrawalInput,
  ProcessWithdrawalInput,
  WITHDRAWAL_FEES,
} from '../types';

export class WithdrawalService {
  /**
   * Create a withdrawal request
   */
  static async createWithdrawal(
    userId: string,
    input: CreateWithdrawalInput
  ): Promise<string> {
    const fee = this.calculateFee(input.payment_method, input.amount);

    const { data, error } = await supabase.rpc('create_withdrawal_request', {
      p_wallet_id: input.wallet_id,
      p_user_id: userId,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_payment_details: input.payment_details,
      p_fee: fee,
    });

    if (error) throw error;
    return data as string;
  }

  /**
   * Get withdrawal by ID
   */
  static async getWithdrawal(withdrawalId: string): Promise<WithdrawalRequest | null> {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as WithdrawalRequest | null;
  }

  /**
   * Get user's withdrawals
   */
  static async getUserWithdrawals(
    userId: string,
    status?: WithdrawalStatus[]
  ): Promise<WithdrawalRequest[]> {
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as WithdrawalRequest[];
  }

  /**
   * Get pending withdrawals for admin
   */
  static async getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        wallets:wallet_id (
          id,
          wallet_type,
          available_balance,
          pending_balance
        )
      `)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as WithdrawalRequest[];
  }

  /**
   * Cancel a pending withdrawal
   */
  static async cancelWithdrawal(withdrawalId: string, userId: string): Promise<boolean> {
    // Verify ownership and status
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !withdrawal) {
      throw new Error('Cannot cancel this withdrawal request');
    }

    // Update status (wallet balance restoration handled by trigger/function)
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'cancelled' })
      .eq('id', withdrawalId);

    if (error) throw error;
    return true;
  }

  /**
   * Process a withdrawal (admin only - via edge function)
   */
  static async processWithdrawal(input: ProcessWithdrawalInput): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('wallet-process-withdrawal', {
      body: input,
    });

    if (error) throw error;
    return data.success;
  }

  /**
   * Calculate withdrawal fee based on method and amount
   */
  static calculateFee(method: PaymentMethodType, amount: number): number {
    const feeConfig = WITHDRAWAL_FEES[method];
    return feeConfig.fixed + (amount * feeConfig.percentage / 100);
  }

  /**
   * Get minimum withdrawal amount for a method
   */
  static getMinimumAmount(method: PaymentMethodType): number {
    return WITHDRAWAL_FEES[method].min;
  }

  /**
   * Validate withdrawal request
   */
  static validateWithdrawal(
    amount: number,
    availableBalance: number,
    method: PaymentMethodType
  ): { valid: boolean; error?: string } {
    const minAmount = this.getMinimumAmount(method);
    const fee = this.calculateFee(method, amount);
    const netAmount = amount - fee;

    if (amount <= 0) {
      return { valid: false, error: 'El monto debe ser mayor a 0' };
    }

    if (amount < minAmount) {
      return { valid: false, error: `El monto mínimo para este método es ${minAmount}` };
    }

    if (amount > availableBalance) {
      return { valid: false, error: 'Balance insuficiente' };
    }

    if (netAmount <= 0) {
      return { valid: false, error: 'El monto después de comisiones debe ser mayor a 0' };
    }

    return { valid: true };
  }

  /**
   * Check if user has pending withdrawal
   */
  static async hasPendingWithdrawal(walletId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('wallet_id', walletId)
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  }
}
