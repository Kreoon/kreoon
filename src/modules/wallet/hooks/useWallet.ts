import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  Wallet,
  WalletType,
  WalletDisplay,
} from '../types';
import { toWalletDisplay } from '../types';

interface UseWalletOptions {
  walletType?: WalletType;
  organizationId?: string;
}

export function useWallet(options: UseWalletOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { walletType = 'creator', organizationId } = options;

  // Query para obtener el wallet del usuario actual
  const {
    data: wallet,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wallet', user?.id, walletType, organizationId],
    queryFn: async (): Promise<Wallet | null> => {
      if (!user?.id) return null;

      let query = supabase
        .from('unified_wallets')
        .select('*');

      if (organizationId) {
        query = query
          .eq('organization_id', organizationId)
          .eq('wallet_type', walletType);
      } else {
        query = query
          .eq('user_id', user.id)
          .eq('wallet_type', walletType);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data as Wallet | null;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Mutation para crear wallet si no existe
  const ensureWalletMutation = useMutation({
    mutationFn: async (type: WalletType = 'creator'): Promise<string> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('ensure_user_wallet', {
          p_user_id: user.id,
          p_wallet_type: type,
        });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
    },
    onError: (error) => {
      console.error('Error ensuring wallet:', error);
      toast.error('Error al crear wallet');
    },
  });

  // Helper para obtener display version
  const walletDisplay = wallet ? toWalletDisplay(wallet, user?.email || undefined) : null;

  // Función para refrescar el wallet
  const refreshWallet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
  }, [queryClient, user?.id]);

  return {
    wallet,
    walletDisplay,
    isLoading,
    error,
    refetch,
    refreshWallet,
    ensureWallet: ensureWalletMutation.mutate,
    isEnsuring: ensureWalletMutation.isPending,
  };
}

// Hook para obtener todos los wallets de un usuario
export function useUserWallets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: wallets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wallets', 'user', user?.id],
    queryFn: async (): Promise<Wallet[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('unified_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('wallet_type');

      if (error) throw error;
      return (data || []) as Wallet[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const walletsDisplay: WalletDisplay[] = (wallets || []).map(w =>
    toWalletDisplay(w, user?.email || undefined)
  );

  const refreshWallets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallets', 'user', user?.id] });
  }, [queryClient, user?.id]);

  return {
    wallets,
    walletsDisplay,
    isLoading,
    error,
    refetch,
    refreshWallets,
  };
}

// Hook para obtener wallets de una organización (para admin/agencias)
export function useOrganizationWallets(organizationId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: wallets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wallets', 'organization', organizationId],
    queryFn: async (): Promise<Wallet[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('unified_wallets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('wallet_type');

      if (error) throw error;
      return (data || []) as Wallet[];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });

  const walletsDisplay: WalletDisplay[] = (wallets || []).map(w =>
    toWalletDisplay(w)
  );

  const refreshWallets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallets', 'organization', organizationId] });
  }, [queryClient, organizationId]);

  return {
    wallets,
    walletsDisplay,
    isLoading,
    error,
    refetch,
    refreshWallets,
  };
}

// Hook para admin - ver todos los wallets
export function useAllWallets(filters?: { status?: string; walletType?: WalletType }) {
  const { isAdmin } = useAuth();

  const {
    data: wallets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wallets', 'all', filters],
    queryFn: async (): Promise<Wallet[]> => {
      let query = supabase
        .from('unified_wallets')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          organizations:organization_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.walletType) {
        query = query.eq('wallet_type', filters.walletType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Wallet[];
    },
    enabled: isAdmin,
    staleTime: 60 * 1000, // 1 minute for admin queries
  });

  return {
    wallets: wallets || [],
    isLoading,
    error,
    refetch,
  };
}
