import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type OnboardingStep = 'loading' | 'profile_data' | 'legal_consents' | 'complete';

export interface ProfileCompletionStatus {
  complete: boolean;
  missing: string[];
  has_social: boolean;
  age_ok: boolean;
  profile_completed: boolean;
  age_verified: boolean;
  legal_consents_completed: boolean;
  onboarding_completed: boolean;
}

export interface PendingDocument {
  document_id: string;
  document_type: string;
  title: string;
  version: string;
  summary?: string;
  is_required: boolean;
}

export interface Country {
  code: string;
  name_es: string;
  name_en: string;
  dial_code: string;
  flag: string;
  is_latam: boolean;
  sort_order: number;
}

export interface DocumentType {
  id: string;
  label_es: string;
  label_en?: string;
  countries: string[];
  format_hint?: string;
  is_active: boolean;
}

export interface ProfileData {
  full_name: string;
  username: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  address: string;
  nationality: string;
  document_type: string;
  document_number: string;
  date_of_birth: string;
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
  social_x?: string;
  social_youtube?: string;
  social_linkedin?: string;
}

/**
 * Hook principal para el gate de onboarding obligatorio.
 * Verifica: perfil completo + documentos legales aceptados + edad verificada.
 */
export function useOnboardingGate() {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Estado del perfil
  const {
    data: completionStatus,
    isLoading: isLoadingCompletion,
    refetch: refetchCompletion,
  } = useQuery({
    queryKey: ['profile-completion', user?.id],
    queryFn: async (): Promise<ProfileCompletionStatus> => {
      if (!user?.id) {
        return {
          complete: false,
          missing: ['not_authenticated'],
          has_social: false,
          age_ok: false,
          profile_completed: false,
          age_verified: false,
          legal_consents_completed: false,
          onboarding_completed: false,
        };
      }

      const { data, error } = await supabase.rpc('check_profile_completion', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[onboarding] Error checking profile completion:', error);
        throw error;
      }

      return data as ProfileCompletionStatus;
    },
    enabled: !!user?.id,
    staleTime: 0, // Siempre fresco
    refetchOnWindowFocus: true,
  });

  // Documentos legales pendientes
  const {
    data: pendingDocuments,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['pending-consents-onboarding', user?.id],
    queryFn: async (): Promise<PendingDocument[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_pending_consents', {
        p_user_id: user.id,
      });

      if (error) {
        // Si la función no existe, devolver vacío
        if (error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }

      return (data || []) as PendingDocument[];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Lista de países
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async (): Promise<Country[]> => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as Country[];
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  // Tipos de documento
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async (): Promise<DocumentType[]> => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as DocumentType[];
    },
    staleTime: 60 * 60 * 1000,
  });

  // Guardar datos del perfil
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!user?.id) throw new Error('No user');

      const { data: result, error } = await supabase.rpc('save_profile_data', {
        p_user_id: user.id,
        p_full_name: data.full_name,
        p_username: data.username,
        p_phone: data.phone,
        p_country: data.country,
        p_city: data.city,
        p_address: data.address,
        p_nationality: data.nationality,
        p_document_type: data.document_type,
        p_document_number: data.document_number,
        p_date_of_birth: data.date_of_birth,
        p_social_instagram: data.social_instagram || null,
        p_social_facebook: data.social_facebook || null,
        p_social_tiktok: data.social_tiktok || null,
        p_social_x: data.social_x || null,
        p_social_youtube: data.social_youtube || null,
        p_social_linkedin: data.social_linkedin || null,
      });

      if (error) throw error;

      const res = result as { success: boolean; error?: string };
      if (!res.success) {
        throw new Error(res.error || 'Error saving profile');
      }

      return res;
    },
    onSuccess: () => {
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Completar onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase.rpc('complete_onboarding', {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (!data) throw new Error('Could not complete onboarding');

      return data;
    },
    onSuccess: () => {
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Verificar unicidad de username
  const checkUsernameAvailable = useCallback(async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) return false;

    const { data, error } = await supabase.rpc('check_username_available', {
      p_username: username,
      p_user_id: user?.id || null,
    });

    if (error) {
      console.error('[onboarding] Error checking username:', error);
      return false;
    }

    return !!data;
  }, [user?.id]);

  // Determinar paso actual
  const getCurrentStep = useCallback((): OnboardingStep => {
    if (authLoading || isLoadingCompletion) return 'loading';

    if (!completionStatus) return 'profile_data';

    // Si onboarding ya está completo
    if (completionStatus.onboarding_completed) return 'complete';

    // Si el perfil no está completo
    if (!completionStatus.profile_completed || !completionStatus.complete) {
      return 'profile_data';
    }

    // Si hay documentos pendientes
    const requiredPending = pendingDocuments?.filter(d => d.is_required) || [];
    if (requiredPending.length > 0 || !completionStatus.legal_consents_completed) {
      return 'legal_consents';
    }

    return 'complete';
  }, [authLoading, isLoadingCompletion, completionStatus, pendingDocuments]);

  const currentStep = getCurrentStep();
  const isComplete = currentStep === 'complete';
  const isLoading = authLoading || isLoadingCompletion || isLoadingDocuments;

  // Datos del perfil actual para pre-llenar
  const existingProfileData: Partial<ProfileData> = {
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    phone: profile?.phone || '',
    email: profile?.email || user?.email || '',
    country: profile?.country || '',
    city: profile?.city || '',
    address: profile?.address || '',
    nationality: (profile as any)?.nationality || '',
    document_type: profile?.document_type || '',
    document_number: profile?.document_number || '',
    date_of_birth: (profile as any)?.date_of_birth || '',
    social_instagram: (profile as any)?.social_instagram || profile?.instagram || '',
    social_facebook: (profile as any)?.social_facebook || profile?.facebook || '',
    social_tiktok: (profile as any)?.social_tiktok || profile?.tiktok || '',
    social_x: (profile as any)?.social_x || '',
    social_youtube: (profile as any)?.social_youtube || '',
    social_linkedin: (profile as any)?.social_linkedin || '',
  };

  return {
    // Estado
    isLoading,
    isComplete,
    currentStep,
    completionStatus,
    pendingDocuments: pendingDocuments || [],
    requiredPendingDocuments: (pendingDocuments || []).filter(d => d.is_required),

    // Datos de referencia
    countries: countries || [],
    documentTypes: documentTypes || [],
    existingProfileData,

    // Acciones
    saveProfileData: saveProfileMutation.mutateAsync,
    completeOnboarding: completeOnboardingMutation.mutateAsync,
    checkUsernameAvailable,
    refetch: () => {
      refetchCompletion();
      refetchDocuments();
    },

    // Estados de mutación
    isSavingProfile: saveProfileMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
    saveError: saveProfileMutation.error,
    completeError: completeOnboardingMutation.error,
  };
}

export default useOnboardingGate;
