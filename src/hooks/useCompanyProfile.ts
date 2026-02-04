import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CompanyProfile, CompanyProfileInput } from '@/types/ai-matching';

/**
 * Hook para gestionar el perfil de empresa/marca
 */
export function useCompanyProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener perfil de empresa
  const {
    data: companyProfile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['company-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyProfile | null;
    },
    enabled: !!user?.id,
  });

  // Crear o actualizar perfil
  const upsertMutation = useMutation({
    mutationFn: async (input: CompanyProfileInput) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('company_profiles')
        .upsert({
          user_id: user.id,
          ...input,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as CompanyProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile', user?.id] });
      toast.success('Perfil actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Actualizar campos específicos
  const updateField = async <K extends keyof CompanyProfileInput>(
    field: K,
    value: CompanyProfileInput[K]
  ) => {
    if (!companyProfile) return;
    await upsertMutation.mutateAsync({
      ...companyProfile,
      [field]: value,
    } as CompanyProfileInput);
  };

  // Agregar creador exitoso
  const addSuccessfulCreator = async (creatorId: string) => {
    if (!companyProfile) return;

    const currentIds = companyProfile.successful_creator_ids || [];
    if (currentIds.includes(creatorId)) return;

    await upsertMutation.mutateAsync({
      ...companyProfile,
      successful_creator_ids: [...currentIds, creatorId],
    } as CompanyProfileInput);
  };

  // Verificar si tiene perfil completo
  const isProfileComplete = (): boolean => {
    if (!companyProfile) return false;
    return !!(
      companyProfile.company_name &&
      companyProfile.industry &&
      companyProfile.target_audience
    );
  };

  // Calcular progreso del perfil
  const getProfileProgress = (): number => {
    if (!companyProfile) return 0;

    const fields = [
      'company_name',
      'company_logo_url',
      'industry',
      'niche_tags',
      'company_description',
      'target_audience',
      'brand_voice',
      'content_goals',
      'preferred_content_types',
      'preferred_platforms',
      'typical_budget_range',
    ];

    const filled = fields.filter((field) => {
      const value = (companyProfile as any)[field];
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    });

    return Math.round((filled.length / fields.length) * 100);
  };

  return {
    companyProfile,
    isLoading,
    error,
    refetch,
    upsertProfile: upsertMutation.mutateAsync,
    updateField,
    addSuccessfulCreator,
    isProfileComplete,
    getProfileProgress,
    isUpdating: upsertMutation.isPending,
    hasProfile: !!companyProfile,
  };
}

/**
 * Hook para obtener perfil de empresa por ID (público)
 */
export function useCompanyProfileById(userId: string | undefined) {
  return useQuery({
    queryKey: ['company-profile-public', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await (supabase as any)
        .from('company_profiles')
        .select(`
          id,
          company_name,
          company_logo_url,
          industry,
          sub_industry,
          niche_tags,
          company_description,
          is_verified,
          created_at
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
