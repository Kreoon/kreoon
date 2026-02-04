import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  CreatorAvailability,
  CreatorAvailabilityInput,
  AvailabilityStatus,
} from '@/types/marketplace';

interface UseCreatorAvailabilityOptions {
  userId?: string;
}

export function useCreatorAvailability(options: UseCreatorAvailabilityOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = options.userId || user?.id;

  // Fetch availability
  const {
    data: availability,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['creator-availability', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await (supabase as any)
        .from('creator_availability')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;

      // Return default if no record exists
      if (!data) {
        return {
          user_id: targetUserId,
          status: 'available' as AvailabilityStatus,
          status_message: null,
          vacation_until: null,
          max_concurrent_projects: 3,
          current_projects_count: 0,
          typical_response_hours: 24,
          preferred_project_size: 'any',
          preferred_industries: [],
          do_not_work_with: [],
          auto_busy_threshold: 3,
          updated_at: new Date().toISOString(),
        } as CreatorAvailability;
      }

      return {
        ...data,
        preferred_industries: data.preferred_industries || [],
        do_not_work_with: data.do_not_work_with || [],
      } as CreatorAvailability;
    },
    enabled: !!targetUserId,
  });

  // Update or create availability
  const updateMutation = useMutation({
    mutationFn: async (input: CreatorAvailabilityInput) => {
      if (!user?.id) throw new Error('No autenticado');

      // Upsert - insert or update
      const { data, error } = await (supabase as any)
        .from('creator_availability')
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
      return data as CreatorAvailability;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-availability', user?.id] });
      toast.success('Disponibilidad actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Quick status change
  const setStatus = async (status: AvailabilityStatus, message?: string) => {
    await updateMutation.mutateAsync({
      status,
      status_message: message || null,
      vacation_until: status === 'vacation' ? availability?.vacation_until : null,
    });
  };

  // Set vacation mode
  const setVacation = async (until: Date, message?: string) => {
    await updateMutation.mutateAsync({
      status: 'vacation',
      status_message: message || `De vacaciones hasta ${until.toLocaleDateString()}`,
      vacation_until: until.toISOString(),
    });
  };

  // End vacation early
  const endVacation = async () => {
    await updateMutation.mutateAsync({
      status: 'available',
      status_message: null,
      vacation_until: null,
    });
  };

  // Increment/decrement project count
  const updateProjectCount = async (delta: number) => {
    if (!availability) return;
    const newCount = Math.max(0, availability.current_projects_count + delta);
    await updateMutation.mutateAsync({
      current_projects_count: newCount,
    });
  };

  // Check if available for new projects
  const isAcceptingProjects = (): boolean => {
    if (!availability) return false;
    if (availability.status === 'unavailable') return false;
    if (availability.status === 'vacation') {
      const vacationEnd = availability.vacation_until
        ? new Date(availability.vacation_until)
        : null;
      if (vacationEnd && vacationEnd > new Date()) return false;
    }
    return true;
  };

  // Get display status text
  const getStatusDisplay = (): { text: string; color: string } => {
    if (!availability) {
      return { text: 'Disponible', color: 'text-green-500' };
    }

    switch (availability.status) {
      case 'available':
        return { text: 'Disponible', color: 'text-green-500' };
      case 'busy':
        return {
          text: `Ocupado${availability.typical_response_hours ? ` · Responde en ~${availability.typical_response_hours}h` : ''}`,
          color: 'text-yellow-500',
        };
      case 'unavailable':
        return { text: 'No disponible', color: 'text-red-500' };
      case 'vacation':
        const vacationEnd = availability.vacation_until
          ? new Date(availability.vacation_until).toLocaleDateString()
          : '';
        return {
          text: `De vacaciones${vacationEnd ? ` hasta ${vacationEnd}` : ''}`,
          color: 'text-blue-500',
        };
      default:
        return { text: 'Disponible', color: 'text-green-500' };
    }
  };

  return {
    availability,
    isLoading,
    error,
    refetch,
    updateAvailability: updateMutation.mutateAsync,
    setStatus,
    setVacation,
    endVacation,
    updateProjectCount,
    isAcceptingProjects,
    getStatusDisplay,
    isUpdating: updateMutation.isPending,
  };
}
