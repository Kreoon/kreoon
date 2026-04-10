import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

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
  trigger_event?: string; // 'registration' | 'role_assignment' | 'deprecated'
  display_order?: number;
  user_role?: string; // 'all' | 'talent' | 'client' | rol específico
  account_type?: string; // 'talent' | 'client' | 'organization' | null (para filtrar por tipo de cuenta)
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

export interface City {
  id: string;
  country_code: string;
  name: string;
  is_capital: boolean;
  sort_order: number;
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
  gender?: 'male' | 'female' | 'other';
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
  social_x?: string;
  social_youtube?: string;
  social_linkedin?: string;
}

/**
 * Campos extendidos del perfil que pueden existir en la BD pero no en el tipo base.
 * Usamos esta interfaz para acceso seguro sin `as any`.
 */
interface ProfileExtendedFields {
  nationality?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_tiktok?: string | null;
  social_x?: string | null;
  social_youtube?: string | null;
  social_linkedin?: string | null;
}

/**
 * Helper para acceder a campos extendidos del perfil de forma segura.
 */
function getExtendedField<K extends keyof ProfileExtendedFields>(
  profile: Record<string, unknown> | null | undefined,
  field: K
): ProfileExtendedFields[K] {
  if (!profile || typeof profile !== 'object') return undefined;
  return profile[field] as ProfileExtendedFields[K];
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

      // Retry logic: intentar hasta 3 veces antes de fallar
      const MAX_RETRIES = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { data, error } = await supabase.rpc('check_profile_completion', {
          p_user_id: user.id,
        });

        if (!error && data) {
          return data as ProfileCompletionStatus;
        }

        if (error) {
          lastError = error;

          // Si la función RPC no existe, NO asumir completo - es un error crítico
          if (error.code === 'PGRST202' || error.message?.includes('Could not find')) {
            logger.error('onboarding RPC check_profile_completion not found. Database migration required.', {
              errorCode: error.code,
              errorMessage: error.message,
            });
            // Devolver incompleto con mensaje de error claro
            return {
              complete: false,
              missing: ['rpc_not_found'],
              has_social: false,
              age_ok: false,
              profile_completed: false,
              age_verified: false,
              legal_consents_completed: false,
              onboarding_completed: false,
            };
          }

          // Para otros errores, reintentar si no es el último intento
          if (attempt < MAX_RETRIES) {
            logger.warn(`onboarding Retry ${attempt}/${MAX_RETRIES} for check_profile_completion`, {
              errorCode: error.code,
              errorMessage: error.message,
            });
            // Esperar antes de reintentar (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            continue;
          }
        }
      }

      // Si llegamos aquí, todos los reintentos fallaron
      logger.error('onboarding All retries failed for check_profile_completion', lastError);
      // Devolver incompleto con error en lugar de lanzar excepción
      return {
        complete: false,
        missing: ['check_failed'],
        has_social: false,
        age_ok: false,
        profile_completed: false,
        age_verified: false,
        legal_consents_completed: false,
        onboarding_completed: false,
      };
    },
    enabled: !!user?.id,
    staleTime: 0, // Siempre fresco
    refetchOnWindowFocus: true,
    retry: false, // No reintentar si falla (evita loops)
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

      try {
        const { data, error } = await supabase.rpc('get_pending_consents', {
          p_user_id: user.id,
        });

        if (error) {
          // Cualquier error con esta RPC no debe bloquear el onboarding
          logger.warn('onboarding Error en get_pending_consents', { code: error.code, message: error.message });
          return [];
        }

        return (data || []) as PendingDocument[];
      } catch (e) {
        logger.warn('onboarding Excepción en get_pending_consents', { error: e });
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    retry: false,
  });

  // Lista de países
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async (): Promise<Country[]> => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('sort_order');

      if (error) {
        // Si la tabla no existe, devolver lista por defecto
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          logger.warn('onboarding Table countries not found. Using defaults');
          return getDefaultCountries();
        }
        throw error;
      }
      return data as Country[];
    },
    staleTime: 60 * 60 * 1000, // 1 hora
    retry: false,
  });

  // Tipos de documento
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async (): Promise<DocumentType[]> => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true);

      if (error) {
        // Si la tabla no existe, devolver lista por defecto
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          logger.warn('onboarding Table document_types not found. Using defaults');
          return getDefaultDocumentTypes();
        }
        throw error;
      }
      return data as DocumentType[];
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  // Lista de ciudades
  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('sort_order');

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          logger.warn('onboarding Table cities not found. Using empty list');
          return [];
        }
        throw error;
      }
      return data as City[];
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  // Filtrar ciudades por país
  const getCitiesByCountry = useCallback((countryCode: string): City[] => {
    if (!cities || !countryCode) return [];
    return cities.filter(c => c.country_code === countryCode);
  }, [cities]);

  // Guardar datos del perfil
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      // Capturar user.id al inicio para evitar race conditions
      const userId = user?.id;
      logger.debug('useOnboardingGate saveProfileData llamado', { userId });

      if (!userId) {
        const error = new Error('No authenticated user. Please log in again.');
        logger.error('useOnboardingGate No user ID available', error);
        throw error;
      }

      logger.debug('useOnboardingGate Llamando RPC save_profile_data');
      const { data: result, error } = await supabase.rpc('save_profile_data', {
        p_user_id: userId,
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
        p_gender: data.gender || null,
      });

      logger.debug('useOnboardingGate RPC result', { hasResult: !!result, hasError: !!error });

      if (error) {
        logger.error('useOnboardingGate RPC error', error);
        throw error;
      }

      const res = result as { success: boolean; error?: string };

      if (!res.success) {
        logger.error('useOnboardingGate RPC returned success=false', new Error(res.error || 'Error saving profile'));
        throw new Error(res.error || 'Error saving profile');
      }

      return res;
    },
    onSuccess: () => {
      logger.debug('useOnboardingGate Mutation success, refetching');
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      logger.error('useOnboardingGate Mutation error', error);
    },
  });

  // Completar onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      // Capturar user.id al inicio para evitar race conditions
      const userId = user?.id;

      if (!userId) {
        const error = new Error('No authenticated user. Please log in again.');
        logger.error('useOnboardingGate completeOnboarding No user ID available', error);
        throw error;
      }

      const { data, error } = await supabase.rpc('complete_onboarding', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('useOnboardingGate complete_onboarding error', error);
        throw error;
      }
      if (!data) {
        logger.warn('useOnboardingGate complete_onboarding returned false');
        throw new Error('Could not complete onboarding');
      }

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
      logger.error('onboarding Error checking username', error);
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

    // Si hay documentos pendientes de REGISTRO (no de asignación de rol)
    const requiredPending = pendingDocuments?.filter(
      d => d.is_required && (d.trigger_event === 'registration' || !d.trigger_event)
    ) || [];
    if (requiredPending.length > 0 || !completionStatus.legal_consents_completed) {
      return 'legal_consents';
    }

    return 'complete';
  }, [authLoading, isLoadingCompletion, completionStatus, pendingDocuments]);

  const currentStep = getCurrentStep();
  // MEJORA: Si el perfil ya indica onboarding_completed, confiar en eso
  // Esto previene que usuarios con cache desactualizado queden atascados
  const profileOnboardingCompleted = profile && (profile as any).onboarding_completed === true;
  const isComplete = currentStep === 'complete' || profileOnboardingCompleted;
  const isLoading = authLoading || isLoadingCompletion || isLoadingDocuments;

  // Datos del perfil actual para pre-llenar
  // Usamos el helper getExtendedField para campos que pueden no estar en el tipo base
  const profileRecord = profile as Record<string, unknown> | null;
  const existingProfileData: Partial<ProfileData> = {
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    phone: profile?.phone || '',
    email: profile?.email || user?.email || '',
    country: profile?.country || '',
    city: profile?.city || '',
    address: profile?.address || '',
    nationality: getExtendedField(profileRecord, 'nationality') || '',
    document_type: profile?.document_type || '',
    document_number: profile?.document_number || '',
    date_of_birth: getExtendedField(profileRecord, 'date_of_birth') || '',
    gender: getExtendedField(profileRecord, 'gender') || undefined,
    social_instagram: getExtendedField(profileRecord, 'social_instagram') || profile?.instagram || '',
    social_facebook: getExtendedField(profileRecord, 'social_facebook') || profile?.facebook || '',
    social_tiktok: getExtendedField(profileRecord, 'social_tiktok') || profile?.tiktok || '',
    social_x: getExtendedField(profileRecord, 'social_x') || '',
    social_youtube: getExtendedField(profileRecord, 'social_youtube') || '',
    social_linkedin: getExtendedField(profileRecord, 'social_linkedin') || '',
  };

  return {
    // Estado
    isLoading,
    isComplete,
    currentStep,
    completionStatus,
    pendingDocuments: pendingDocuments || [],
    requiredPendingDocuments: (pendingDocuments || []).filter(
      d => d.is_required && (d.trigger_event === 'registration' || !d.trigger_event)
    ),

    // Datos de referencia
    countries: countries || [],
    cities: cities || [],
    getCitiesByCountry,
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

// ============================================
// FALLBACK DATA (cuando las tablas no existen)
// ============================================

function getDefaultCountries(): Country[] {
  return [
    { code: 'CO', name_es: 'Colombia', name_en: 'Colombia', dial_code: '+57', flag: '🇨🇴', is_latam: true, sort_order: 1 },
    { code: 'MX', name_es: 'México', name_en: 'Mexico', dial_code: '+52', flag: '🇲🇽', is_latam: true, sort_order: 2 },
    { code: 'AR', name_es: 'Argentina', name_en: 'Argentina', dial_code: '+54', flag: '🇦🇷', is_latam: true, sort_order: 3 },
    { code: 'PE', name_es: 'Perú', name_en: 'Peru', dial_code: '+51', flag: '🇵🇪', is_latam: true, sort_order: 4 },
    { code: 'CL', name_es: 'Chile', name_en: 'Chile', dial_code: '+56', flag: '🇨🇱', is_latam: true, sort_order: 5 },
    { code: 'EC', name_es: 'Ecuador', name_en: 'Ecuador', dial_code: '+593', flag: '🇪🇨', is_latam: true, sort_order: 6 },
    { code: 'US', name_es: 'Estados Unidos', name_en: 'United States', dial_code: '+1', flag: '🇺🇸', is_latam: false, sort_order: 10 },
    { code: 'ES', name_es: 'España', name_en: 'Spain', dial_code: '+34', flag: '🇪🇸', is_latam: false, sort_order: 11 },
  ];
}

function getDefaultDocumentTypes(): DocumentType[] {
  return [
    { id: 'cc', label_es: 'Cédula de Ciudadanía', label_en: 'National ID', countries: ['CO'], format_hint: '10 dígitos', is_active: true },
    { id: 'ce', label_es: 'Cédula de Extranjería', label_en: 'Foreign ID', countries: ['CO'], format_hint: '6-10 caracteres', is_active: true },
    { id: 'passport', label_es: 'Pasaporte', label_en: 'Passport', countries: ['*'], format_hint: 'Alfanumérico', is_active: true },
    { id: 'curp', label_es: 'CURP', label_en: 'CURP', countries: ['MX'], format_hint: '18 caracteres', is_active: true },
    { id: 'ine', label_es: 'INE', label_en: 'INE', countries: ['MX'], format_hint: '13 dígitos', is_active: true },
    { id: 'dni', label_es: 'DNI', label_en: 'DNI', countries: ['AR', 'PE', 'ES'], format_hint: '8 dígitos', is_active: true },
    { id: 'rut', label_es: 'RUT', label_en: 'RUT', countries: ['CL'], format_hint: '9 dígitos + K', is_active: true },
    { id: 'ssn', label_es: 'SSN', label_en: 'Social Security Number', countries: ['US'], format_hint: '9 dígitos', is_active: true },
  ];
}
