/**
 * useAccountBlock - Hook para verificar el estado de bloqueo de una cuenta
 *
 * Verifica si el usuario o su organizacion tiene algun bloqueo activo
 * por incumplimiento de pago.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BlockType =
  | 'client_payment_default'        // Cliente incumplio acuerdo de pago especial
  | 'organization_payment_default'  // Organizacion sin pagos al dia
  | 'organization_no_payment_method'; // Organizacion sin metodo de pago valido

export interface AccountBlockStatus {
  isBlocked: boolean;
  blockType: BlockType | null;
  blockReason: string | null;
  blockedSince: Date | null;
  loading: boolean;
  error: Error | null;
}

interface CheckAccountBlockedResult {
  is_blocked: boolean;
  block_type: BlockType | null;
  block_reason: string | null;
  blocked_since: string | null;
}

/**
 * Hook para verificar si un usuario tiene su cuenta bloqueada
 *
 * @param userId - ID del usuario a verificar (null para desactivar la query)
 * @returns Estado de bloqueo de la cuenta
 *
 * @example
 * ```tsx
 * const { isBlocked, blockType, blockReason, loading } = useAccountBlock(user?.id);
 *
 * if (isBlocked) {
 *   return <AccountBlockedBanner type={blockType} reason={blockReason} />;
 * }
 * ```
 */
export function useAccountBlock(userId: string | null | undefined): AccountBlockStatus {
  const { data, isLoading, error } = useQuery({
    queryKey: ['account-block', userId],
    queryFn: async (): Promise<CheckAccountBlockedResult | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .rpc('check_account_blocked', { p_user_id: userId });

      if (error) {
        console.error('[useAccountBlock] Error checking block status:', error);
        throw error;
      }

      // La RPC retorna un array, tomamos el primer resultado
      const result = Array.isArray(data) ? data[0] : data;
      return result as CheckAccountBlockedResult | null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });

  return {
    isBlocked: data?.is_blocked ?? false,
    blockType: data?.block_type ?? null,
    blockReason: data?.block_reason ?? null,
    blockedSince: data?.blocked_since ? new Date(data.blocked_since) : null,
    loading: isLoading,
    error: error as Error | null,
  };
}

/**
 * Obtiene el mensaje de bloqueo segun el tipo
 */
export function getBlockTypeMessage(blockType: BlockType | null): string {
  switch (blockType) {
    case 'client_payment_default':
      return 'Tu cuenta ha sido bloqueada por incumplimiento en el acuerdo de pago. Regulariza tus pagos para continuar.';
    case 'organization_payment_default':
      return 'Tu organizacion ha sido bloqueada por falta de pago. Regulariza los pagos pendientes para continuar.';
    case 'organization_no_payment_method':
      return 'Tu organizacion no tiene un metodo de pago valido. Agrega uno para continuar usando la plataforma.';
    default:
      return 'Tu cuenta ha sido bloqueada. Contacta a soporte para mas informacion.';
  }
}

/**
 * Obtiene el titulo del bloqueo segun el tipo
 */
export function getBlockTypeTitle(blockType: BlockType | null): string {
  switch (blockType) {
    case 'client_payment_default':
      return 'Pago Pendiente';
    case 'organization_payment_default':
      return 'Membresia Vencida';
    case 'organization_no_payment_method':
      return 'Metodo de Pago Requerido';
    default:
      return 'Cuenta Bloqueada';
  }
}

export default useAccountBlock;
