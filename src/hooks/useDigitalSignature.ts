import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  SignatureMethod,
  SignatureReceipt,
  MySignatureItem,
  BrowserInfo,
  getSignatureMethodForDocument,
} from '@/types/digital-signature';

interface SignDocumentParams {
  documentId: string;
  signerFullName: string;
  signatureMethod?: SignatureMethod;
  typedSignature?: string;
  signatureImageUrl?: string;
  declarationText?: string;
}

interface GeolocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Hook para gestionar firmas digitales
 */
export function useDigitalSignature() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Obtener información del navegador
  const getBrowserInfo = useCallback((): BrowserInfo => {
    const nav = navigator;
    const screen = window.screen;

    return {
      browser: nav.userAgent.includes('Chrome') ? 'Chrome' :
               nav.userAgent.includes('Firefox') ? 'Firefox' :
               nav.userAgent.includes('Safari') ? 'Safari' :
               nav.userAgent.includes('Edge') ? 'Edge' : 'Unknown',
      os: nav.platform,
      platform: nav.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: nav.language,
    };
  }, []);

  // Obtener IP del cliente (via API pública)
  const getClientIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
  }, []);

  // Obtener geolocalización (con permiso del usuario)
  const getGeolocation = useCallback((): Promise<GeolocationData | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }, []);

  // Firmar documento
  const signDocumentMutation = useMutation({
    mutationFn: async (params: SignDocumentParams): Promise<string> => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const [ip, geo, browserInfo] = await Promise.all([
        getClientIP(),
        getGeolocation(),
        Promise.resolve(getBrowserInfo()),
      ]);

      const { data, error } = await supabase.rpc('sign_legal_document', {
        p_user_id: user.id,
        p_document_id: params.documentId,
        p_signer_full_name: params.signerFullName,
        p_declaration_text: params.declarationText || null,
        p_signature_method: params.signatureMethod || 'typed_name',
        p_typed_signature: params.typedSignature || null,
        p_signature_image_url: params.signatureImageUrl || null,
        p_ip_address: ip,
        p_user_agent: navigator.userAgent,
        p_browser_info: browserInfo,
        p_geolocation: geo,
      });

      if (error) {
        console.error('[signature] Error signing document:', error);
        throw new Error(error.message || 'Error al firmar documento');
      }

      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['pending-consents-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['profile-completion'] });
    },
  });

  // Obtener mis firmas
  const { data: mySignatures, isLoading: isLoadingSignatures } = useQuery({
    queryKey: ['my-signatures', user?.id],
    queryFn: async (): Promise<MySignatureItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_my_signatures', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[signature] Error fetching signatures:', error);
        return [];
      }

      return (data || []) as MySignatureItem[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Obtener comprobante de firma
  const getSignatureReceipt = useCallback(async (signatureId: string): Promise<SignatureReceipt | null> => {
    if (!user?.id) return null;

    const { data, error } = await supabase.rpc('get_signature_receipt', {
      p_signature_id: signatureId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('[signature] Error fetching receipt:', error);
      return null;
    }

    return data as SignatureReceipt;
  }, [user?.id]);

  // Verificar si un documento ya está firmado
  const isDocumentSigned = useCallback((documentType: string): boolean => {
    if (!mySignatures) return false;
    return mySignatures.some(
      sig => sig.document_type === documentType && sig.status === 'valid'
    );
  }, [mySignatures]);

  // Obtener firma de un documento específico
  const getSignatureForDocument = useCallback((documentType: string): MySignatureItem | null => {
    if (!mySignatures) return null;
    return mySignatures.find(
      sig => sig.document_type === documentType && sig.status === 'valid'
    ) || null;
  }, [mySignatures]);

  return {
    // Estado
    mySignatures: mySignatures || [],
    isLoadingSignatures,
    isSigning: signDocumentMutation.isPending,
    signError: signDocumentMutation.error,

    // Acciones
    signDocument: signDocumentMutation.mutateAsync,
    getSignatureReceipt,

    // Helpers
    isDocumentSigned,
    getSignatureForDocument,
    getSignatureMethodForDocument,
    getBrowserInfo,
    getClientIP,
    getGeolocation,

    // Datos del perfil para pre-llenar
    signerFullName: profile?.full_name || '',
    signerEmail: profile?.email || user?.email || '',
    signerDocumentType: profile?.document_type || '',
    signerDocumentNumber: profile?.document_number || '',
  };
}

export default useDigitalSignature;
