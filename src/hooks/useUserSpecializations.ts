import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Specialization } from '@/types/database';
import { MAX_SPECIALIZATIONS_PER_USER } from '@/lib/specializations';

interface UseUserSpecializationsResult {
  specializations: Specialization[];
  loading: boolean;
  error: string | null;
  updateSpecializations: (specs: Specialization[]) => Promise<boolean>;
  addSpecialization: (spec: Specialization) => Promise<boolean>;
  removeSpecialization: (spec: Specialization) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook para gestionar las especializaciones del usuario
 * @param userId - ID del usuario (opcional, usa el usuario autenticado si no se provee)
 */
export function useUserSpecializations(userId?: string): UseUserSpecializationsResult {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch specializations
  const fetchSpecializations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Si no hay userId, obtener el del usuario autenticado
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSpecializations([]);
          setLoading(false);
          return;
        }
        targetUserId = user.id;
      }

      const { data, error: fetchError } = await supabase
        .from('user_specializations')
        .select('specialization')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        // Si la tabla no existe aun, no es un error critico
        if (fetchError.code === '42P01') {
          setSpecializations([]);
        } else {
          throw fetchError;
        }
      } else {
        setSpecializations((data || []).map(d => d.specialization as Specialization));
      }
    } catch (err) {
      console.error('Error fetching specializations:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSpecializations([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Cargar al montar
  useEffect(() => {
    fetchSpecializations();
  }, [fetchSpecializations]);

  // Update all specializations (replace)
  const updateSpecializations = useCallback(async (specs: Specialization[]): Promise<boolean> => {
    try {
      setError(null);

      // Validar limite
      if (specs.length > MAX_SPECIALIZATIONS_PER_USER) {
        setError(`Maximo ${MAX_SPECIALIZATIONS_PER_USER} especializaciones permitidas`);
        return false;
      }

      // Obtener userId
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Usuario no autenticado');
          return false;
        }
        targetUserId = user.id;
      }

      // Eliminar todas las especializaciones actuales
      const { error: deleteError } = await supabase
        .from('user_specializations')
        .delete()
        .eq('user_id', targetUserId);

      if (deleteError) throw deleteError;

      // Si hay nuevas especializaciones, insertarlas
      if (specs.length > 0) {
        const { error: insertError } = await supabase
          .from('user_specializations')
          .insert(
            specs.map(spec => ({
              user_id: targetUserId,
              specialization: spec,
            }))
          );

        if (insertError) throw insertError;
      }

      // Actualizar estado local
      setSpecializations(specs);
      return true;
    } catch (err) {
      console.error('Error updating specializations:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar');
      return false;
    }
  }, [userId]);

  // Add single specialization
  const addSpecialization = useCallback(async (spec: Specialization): Promise<boolean> => {
    // Validar que no exista ya
    if (specializations.includes(spec)) {
      return true; // Ya existe, no es error
    }

    // Validar limite
    if (specializations.length >= MAX_SPECIALIZATIONS_PER_USER) {
      setError(`Maximo ${MAX_SPECIALIZATIONS_PER_USER} especializaciones permitidas`);
      return false;
    }

    try {
      setError(null);

      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Usuario no autenticado');
          return false;
        }
        targetUserId = user.id;
      }

      const { error: insertError } = await supabase
        .from('user_specializations')
        .insert({ user_id: targetUserId, specialization: spec });

      if (insertError) throw insertError;

      setSpecializations(prev => [...prev, spec]);
      return true;
    } catch (err) {
      console.error('Error adding specialization:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar');
      return false;
    }
  }, [userId, specializations]);

  // Remove single specialization
  const removeSpecialization = useCallback(async (spec: Specialization): Promise<boolean> => {
    try {
      setError(null);

      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Usuario no autenticado');
          return false;
        }
        targetUserId = user.id;
      }

      const { error: deleteError } = await supabase
        .from('user_specializations')
        .delete()
        .eq('user_id', targetUserId)
        .eq('specialization', spec);

      if (deleteError) throw deleteError;

      setSpecializations(prev => prev.filter(s => s !== spec));
      return true;
    } catch (err) {
      console.error('Error removing specialization:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      return false;
    }
  }, [userId]);

  return {
    specializations,
    loading,
    error,
    updateSpecializations,
    addSpecialization,
    removeSpecialization,
    refetch: fetchSpecializations,
  };
}

/**
 * Fetch specializations for a specific user (read-only, for profiles)
 */
export async function fetchUserSpecializations(userId: string): Promise<Specialization[]> {
  try {
    const { data, error } = await supabase
      .from('user_specializations')
      .select('specialization')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user specializations:', error);
      return [];
    }

    return (data || []).map(d => d.specialization as Specialization);
  } catch (err) {
    console.error('Error fetching user specializations:', err);
    return [];
  }
}
