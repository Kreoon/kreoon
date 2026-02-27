// Hook para gestionar tipos de evento de booking

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { BookingEventType, EventTypeInput } from '../types';

const QUERY_KEY = 'booking-event-types';

/**
 * Hook para gestionar tipos de evento del usuario
 */
export function useEventTypes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener todos los tipos de evento del usuario
  const {
    data: eventTypes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('booking_event_types')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BookingEventType[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // Crear nuevo tipo de evento
  const createEventType = useMutation({
    mutationFn: async (input: EventTypeInput) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('booking_event_types')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookingEventType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tipo de evento creado');
    },
    onError: (error: Error) => {
      console.error('Error creating event type:', error);
      toast.error('Error al crear tipo de evento');
    },
  });

  // Actualizar tipo de evento
  const updateEventType = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<EventTypeInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_event_types')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BookingEventType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tipo de evento actualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating event type:', error);
      toast.error('Error al actualizar tipo de evento');
    },
  });

  // Eliminar tipo de evento
  const deleteEventType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_event_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tipo de evento eliminado');
    },
    onError: (error: Error) => {
      console.error('Error deleting event type:', error);
      toast.error('Error al eliminar tipo de evento');
    },
  });

  // Toggle activo/inactivo
  const toggleEventType = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('booking_event_types')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(is_active ? 'Tipo de evento activado' : 'Tipo de evento desactivado');
    },
    onError: (error: Error) => {
      console.error('Error toggling event type:', error);
      toast.error('Error al cambiar estado');
    },
  });

  return {
    eventTypes,
    isLoading,
    error,
    refetch,
    createEventType,
    updateEventType,
    deleteEventType,
    toggleEventType,
    // Computed
    activeEventTypes: eventTypes.filter((et) => et.is_active),
  };
}

/**
 * Hook para obtener un tipo de evento específico por ID
 */
export function useEventType(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, 'single', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('booking_event_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as BookingEventType;
    },
    enabled: !!id && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}
