import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LegalDocument {
  id: string;
  document_type: string;
  version: string;
  version_date: string;
  title: string;
  title_en?: string;
  content_html: string;
  content_html_en?: string;
  summary?: string;
  is_current: boolean;
  is_required: boolean;
  applies_to: string[];
  published_at?: string;
}

export interface PendingConsent {
  document_id: string;
  document_type: string;
  title: string;
  version: string;
  summary?: string;
  is_required: boolean;
}

export interface UserConsent {
  id: string;
  user_id: string;
  document_id: string;
  document_type: string;
  document_version: string;
  accepted: boolean;
  accepted_at?: string;
  consent_method: string;
  is_current: boolean;
}

export interface ConsentRequest {
  documentId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Hook para gestionar consentimientos legales del usuario
 */
export function useLegalConsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Obtener documentos legales vigentes
  const {
    data: currentDocuments,
    isLoading: isLoadingDocuments,
  } = useQuery({
    queryKey: ['legal-documents', 'current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('is_current', true)
        .order('document_type');

      if (error) throw error;
      return data as LegalDocument[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Obtener consentimientos pendientes del usuario actual
  const {
    data: pendingConsents,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['pending-consents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .rpc('get_pending_consents', { p_user_id: user.id });

      if (error) throw error;
      return data as PendingConsent[];
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  // Obtener consentimientos actuales del usuario
  const {
    data: userConsents,
    isLoading: isLoadingConsents,
  } = useQuery({
    queryKey: ['user-consents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_legal_consents')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .eq('accepted', true);

      if (error) throw error;
      return data as UserConsent[];
    },
    enabled: !!user?.id,
  });

  // Verificar si usuario ha verificado su edad
  const {
    data: ageVerification,
    isLoading: isLoadingAge,
  } = useQuery({
    queryKey: ['age-verification', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('age_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('declared_age_18_plus', true)
        .eq('verification_status', 'verified')
        .maybeSingle();

      if (error) {
        // Ignorar errores de tabla no existente o sin resultados
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return null;
        }
        console.warn('[useLegalConsent] Error fetching age verification:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Mutación para registrar consentimiento
  const recordConsentMutation = useMutation({
    mutationFn: async ({ documentId, ipAddress, userAgent }: ConsentRequest) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .rpc('record_consent', {
          p_user_id: user.id,
          p_document_id: documentId,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || navigator.userAgent,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-consents'] });
      queryClient.invalidateQueries({ queryKey: ['user-consents'] });
    },
  });

  // Mutación para registrar verificación de edad
  const recordAgeVerificationMutation = useMutation({
    mutationFn: async (declared18Plus: boolean) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .rpc('record_age_verification', {
          p_user_id: user.id,
          p_declared_age_18_plus: declared18Plus,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['age-verification'] });
    },
  });

  // Aceptar un documento específico
  const acceptDocument = useCallback(async (documentId: string) => {
    return recordConsentMutation.mutateAsync({
      documentId,
      userAgent: navigator.userAgent,
    });
  }, [recordConsentMutation]);

  // Aceptar múltiples documentos
  const acceptMultipleDocuments = useCallback(async (documentIds: string[]) => {
    const results = await Promise.all(
      documentIds.map(id => acceptDocument(id))
    );
    return results;
  }, [acceptDocument]);

  // Verificar edad
  const verifyAge = useCallback(async (is18Plus: boolean) => {
    return recordAgeVerificationMutation.mutateAsync(is18Plus);
  }, [recordAgeVerificationMutation]);

  // Verificar si el usuario ha aceptado un documento específico
  const hasAcceptedDocument = useCallback((documentType: string): boolean => {
    if (!userConsents) return false;
    return userConsents.some(c => c.document_type === documentType && c.accepted);
  }, [userConsents]);

  // Verificar si el usuario tiene todos los consentimientos requeridos
  const hasAllRequiredConsents = useCallback((): boolean => {
    if (!pendingConsents) return true;
    const requiredPending = pendingConsents.filter(p => p.is_required);
    return requiredPending.length === 0;
  }, [pendingConsents]);

  // Verificar si el usuario es mayor de edad verificado
  const isAgeVerified = useCallback((): boolean => {
    return !!ageVerification;
  }, [ageVerification]);

  // Obtener un documento por tipo
  const getDocumentByType = useCallback((documentType: string): LegalDocument | undefined => {
    return currentDocuments?.find(d => d.document_type === documentType);
  }, [currentDocuments]);

  // Efecto para mostrar modal si hay consentimientos pendientes
  useEffect(() => {
    if (user && pendingConsents && pendingConsents.length > 0) {
      const hasRequiredPending = pendingConsents.some(p => p.is_required);
      if (hasRequiredPending) {
        setShowConsentModal(true);
      }
    }
  }, [user, pendingConsents]);

  return {
    // Estado
    currentDocuments,
    pendingConsents,
    userConsents,
    ageVerification,
    showConsentModal,
    setShowConsentModal,

    // Loading states
    isLoading: isLoadingDocuments || isLoadingPending || isLoadingConsents || isLoadingAge,
    isLoadingDocuments,
    isLoadingPending,
    isLoadingConsents,
    isLoadingAge,

    // Mutation states
    isAccepting: recordConsentMutation.isPending,
    isVerifyingAge: recordAgeVerificationMutation.isPending,

    // Acciones
    acceptDocument,
    acceptMultipleDocuments,
    verifyAge,
    refetchPending,

    // Helpers
    hasAcceptedDocument,
    hasAllRequiredConsents,
    isAgeVerified,
    getDocumentByType,
  };
}

/**
 * Hook para verificar consentimiento antes de una acción específica
 */
export function useConsentGate(requiredFor: 'registration' | 'first_upload' | 'first_transaction' | 'first_live') {
  const { pendingConsents, showConsentModal, setShowConsentModal } = useLegalConsent();

  const checkConsent = useCallback(() => {
    // Por ahora, solo verificamos si hay pendientes
    // En el futuro se puede filtrar por required_at
    if (pendingConsents && pendingConsents.some(p => p.is_required)) {
      setShowConsentModal(true);
      return false;
    }
    return true;
  }, [pendingConsents, setShowConsentModal]);

  return {
    canProceed: !pendingConsents?.some(p => p.is_required),
    checkConsent,
    showConsentModal,
    setShowConsentModal,
  };
}

export default useLegalConsent;
