import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RoleGateDocument {
  document_id: string;
  document_type: string;
  title: string;
  version: string;
  summary?: string;
  is_required: boolean;
  already_signed: boolean;
  gate_title: string;
  gate_description: string;
}

export interface RoleGateStatus {
  has_pending_documents: boolean;
  pending_count: number;
  gate_title: string | null;
  gate_description: string | null;
}

/**
 * Hook para verificar y gestionar documentos legales requeridos por rol.
 * Se usa cuando un usuario recibe un nuevo rol que tiene documentos asociados.
 */
export function useRoleLegalGate(targetRole?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Verificar si un rol tiene documentos pendientes
  const {
    data: gateStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['role-legal-gate-status', user?.id, targetRole],
    queryFn: async (): Promise<RoleGateStatus | null> => {
      if (!user?.id || !targetRole) return null;

      try {
        const { data, error } = await supabase.rpc('check_role_legal_gate', {
          p_user_id: user.id,
          p_role: targetRole,
        });

        if (error) {
          // Si la función no existe, asumir que no hay gate
          if (error.code === 'PGRST202' || error.message?.includes('Could not find')) {
            console.warn('[useRoleLegalGate] RPC check_role_legal_gate not found');
            return null;
          }
          console.error('[useRoleLegalGate] Error checking gate:', error);
          return null;
        }

        // data es un array con un solo elemento
        const result = Array.isArray(data) ? data[0] : data;
        return result as RoleGateStatus;
      } catch (e) {
        console.warn('[useRoleLegalGate] Exception:', e);
        return null;
      }
    },
    enabled: !!user?.id && !!targetRole,
    staleTime: 0,
    retry: false,
  });

  // Obtener documentos pendientes para un rol
  const {
    data: pendingDocuments,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['role-legal-gate-documents', user?.id, targetRole],
    queryFn: async (): Promise<RoleGateDocument[]> => {
      if (!user?.id || !targetRole) return [];

      try {
        const { data, error } = await supabase.rpc('get_role_gate_documents', {
          p_user_id: user.id,
          p_role: targetRole,
        });

        if (error) {
          if (error.code === 'PGRST202' || error.message?.includes('Could not find')) {
            console.warn('[useRoleLegalGate] RPC get_role_gate_documents not found');
            return [];
          }
          console.error('[useRoleLegalGate] Error getting documents:', error);
          return [];
        }

        return (data || []) as RoleGateDocument[];
      } catch (e) {
        console.warn('[useRoleLegalGate] Exception getting documents:', e);
        return [];
      }
    },
    enabled: !!user?.id && !!targetRole && (gateStatus?.has_pending_documents ?? false),
    staleTime: 0,
    retry: false,
  });

  // Verificar si el usuario puede proceder con el rol
  const canProceedWithRole = useCallback((): boolean => {
    if (!gateStatus) return true; // Sin gate = puede proceder
    return !gateStatus.has_pending_documents;
  }, [gateStatus]);

  // Refrescar todo el estado
  const refetch = useCallback(() => {
    refetchStatus();
    refetchDocuments();
    queryClient.invalidateQueries({ queryKey: ['role-legal-gate-status'] });
    queryClient.invalidateQueries({ queryKey: ['role-legal-gate-documents'] });
  }, [refetchStatus, refetchDocuments, queryClient]);

  // Documentos que aún no han sido firmados
  const unsignedDocuments = (pendingDocuments || []).filter(doc => !doc.already_signed);

  return {
    // Estado
    isLoading: isLoadingStatus || isLoadingDocuments,
    hasPendingDocuments: gateStatus?.has_pending_documents ?? false,
    pendingCount: gateStatus?.pending_count ?? 0,
    gateTitle: gateStatus?.gate_title ?? null,
    gateDescription: gateStatus?.gate_description ?? null,

    // Documentos
    pendingDocuments: pendingDocuments || [],
    unsignedDocuments,

    // Utilidades
    canProceedWithRole,
    refetch,
  };
}

export default useRoleLegalGate;
