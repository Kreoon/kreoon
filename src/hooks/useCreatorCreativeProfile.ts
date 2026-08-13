import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos — reflejan 1:1 la tabla public.creator_creative_profile (backend ya hecho)
// ──────────────────────────────────────────────────────────────────────────────

export type RangoEdad = '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type Genero = 'femenino' | 'masculino' | 'no_binario' | 'prefiero_no_decir';
export type EstiloEnergia = 'calmado' | 'neutro' | 'alta-energia';
export type Registro = 'coloquial' | 'neutro' | 'formal';

export interface CreatorCreativeProfile {
  user_id: string;
  rango_edad: RangoEdad | null;
  genero: Genero | null;
  ciudad: string | null;
  pais_acento: string | null;
  estilo_energia: EstiloEnergia | null;
  registro: Registro | null;
  muletillas: string[];
  frases_ejemplo: string[];
  escenarios: string[];
  formatos_fuertes: string[];
  nichos_afines: string[];
  restricciones: string[];
  completitud: number;
  completada_por: string | null;
  created_at: string;
  updated_at: string;
}

// Lo que el formulario puede escribir. `completitud` nunca se manda: la calcula
// un trigger en la base. `completada_por` se rellena solo con quien está guardando.
export type CreatorCreativeProfileInput = Partial<
  Omit<CreatorCreativeProfile, 'user_id' | 'completitud' | 'completada_por' | 'created_at' | 'updated_at'>
>;

const QUERY_KEY = 'creator-creative-profile';
const COMPLETION_QUERY_KEY = 'creator-creative-profile-completion';

// ──────────────────────────────────────────────────────────────────────────────
// Hook principal — leer / crear / actualizar la ficha de un creador
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @param targetUserId Si se pasa (ej. el staff llenando la ficha de un creador desde
 * el directorio de talento), se usa ese id. Si no, se usa el usuario autenticado.
 */
export function useCreatorCreativeProfile(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId ?? user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_creative_profile')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as CreatorCreativeProfile | null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (input: CreatorCreativeProfileInput) => {
      if (!userId) throw new Error('Falta el usuario dueño de la ficha creativa');
      const payload = {
        user_id: userId,
        completada_por: user?.id ?? userId,
        ...input,
      };
      const { data, error } = await supabase
        .from('creator_creative_profile')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as CreatorCreativeProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY, userId], data);
      queryClient.invalidateQueries({ queryKey: [COMPLETION_QUERY_KEY] });
    },
    onError: (err) => {
      console.error('[useCreatorCreativeProfile] Error guardando la ficha creativa:', err);
      toast.error('No se pudo guardar la ficha creativa. Intenta de nuevo.');
    },
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isSaving: mutation.isPending,
    /** Guarda (upsert) los campos que le pases; se combinan con lo ya guardado. */
    save: mutation.mutate,
    saveAsync: mutation.mutateAsync,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook liviano para el directorio de talento — solo trae completitud por lote
// ──────────────────────────────────────────────────────────────────────────────

export interface CreativeProfileCompletion {
  user_id: string;
  completitud: number;
}

/**
 * Trae la completitud (0-100) de la ficha creativa para un conjunto de user_id
 * ya visibles en pantalla (ej. el directorio de talento). No usa get_unified_talent.
 */
export function useCreatorCreativeProfilesCompletion(userIds: string[]) {
  const ids = useMemo(() => Array.from(new Set(userIds)).sort(), [userIds]);

  const query = useQuery({
    queryKey: [COMPLETION_QUERY_KEY, ids],
    queryFn: async () => {
      if (ids.length === 0) return [] as CreativeProfileCompletion[];
      const { data, error } = await supabase
        .from('creator_creative_profile')
        .select('user_id, completitud')
        .in('user_id', ids);
      if (error) throw error;
      return (data ?? []) as CreativeProfileCompletion[];
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const completionMap = useMemo(() => {
    const map = new Map<string, number>();
    (query.data ?? []).forEach(row => map.set(row.user_id, row.completitud));
    return map;
  }, [query.data]);

  return { completionMap, isLoading: query.isLoading };
}
