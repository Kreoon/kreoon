// Wallet Service - Business logic for wallet operations
import { supabase } from '@/integrations/supabase/client';
import type { Wallet, WalletType } from '../types';

export class WalletService {
  /**
   * Ensure a wallet exists for a user, creating one if necessary
   */
  static async ensureUserWallet(userId: string, walletType: WalletType = 'creator'): Promise<string> {
    const { data, error } = await supabase.rpc('ensure_user_wallet', {
      p_user_id: userId,
      p_wallet_type: walletType,
    });

    if (error) throw error;
    return data as string;
  }

  /**
   * Get wallet by ID
   */
  static async getWallet(walletId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Wallet | null;
  }

  /**
   * Get user's wallet of a specific type
   */
  static async getUserWallet(userId: string, walletType: WalletType = 'creator'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', walletType)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Wallet | null;
  }

  /**
   * Get all wallets for a user
   */
  static async getUserWallets(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('wallet_type');

    if (error) throw error;
    return (data || []) as Wallet[];
  }

  /**
   * Get organization wallets
   */
  static async getOrganizationWallets(organizationId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('wallet_type');

    if (error) throw error;
    return (data || []) as Wallet[];
  }

  /**
   * Update wallet settings
   */
  static async updateWalletSettings(
    walletId: string,
    settings: Partial<Wallet['settings']>
  ): Promise<Wallet> {
    const { data: current, error: fetchError } = await supabase
      .from('wallets')
      .select('settings')
      .eq('id', walletId)
      .single();

    if (fetchError) throw fetchError;

    const newSettings = { ...current.settings, ...settings };

    const { data, error } = await supabase
      .from('wallets')
      .update({ settings: newSettings })
      .eq('id', walletId)
      .select()
      .single();

    if (error) throw error;
    return data as Wallet;
  }

  /**
   * Check if wallet has sufficient balance
   */
  static async hasSufficientBalance(walletId: string, amount: number): Promise<boolean> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) return false;
    return wallet.available_balance >= amount;
  }

  /**
   * Get total balance across all user wallets
   */
  static async getTotalUserBalance(userId: string): Promise<{
    available: number;
    pending: number;
    reserved: number;
    total: number;
  }> {
    const wallets = await this.getUserWallets(userId);

    return wallets.reduce(
      (acc, wallet) => ({
        available: acc.available + wallet.available_balance,
        pending: acc.pending + wallet.pending_balance,
        reserved: acc.reserved + wallet.reserved_balance,
        total:
          acc.total +
          wallet.available_balance +
          wallet.pending_balance +
          wallet.reserved_balance,
      }),
      { available: 0, pending: 0, reserved: 0, total: 0 }
    );
  }
}
