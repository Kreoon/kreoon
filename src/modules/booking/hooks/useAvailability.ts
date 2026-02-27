// Hook para gestionar disponibilidad de booking

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  BookingAvailability,
  BookingException,
  AvailabilityInput,
  ExceptionInput,
  DaySchedule,
  WeeklySchedule,
} from '../types';

const AVAILABILITY_KEY = 'booking-availability';
const EXCEPTIONS_KEY = 'booking-exceptions';

/**
 * Hook para gestionar disponibilidad semanal del usuario
 */
export function useAvailability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener disponibilidad semanal
  const {
    data: availability = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [AVAILABILITY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('booking_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as BookingAvailability[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Convertir a formato WeeklySchedule
  const weeklySchedule: WeeklySchedule = {};
  for (let day = 0; day < 7; day++) {
    const daySlots = availability.filter((a) => a.day_of_week === day);
    weeklySchedule[day] = {
      day_of_week: day,
      enabled: daySlots.length > 0,
      slots: daySlots.map((slot) => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })),
    };
  }

  // Agregar slot de disponibilidad
  const addSlot = useMutation({
    mutationFn: async (input: AvailabilityInput) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('booking_availability')
        .insert({
          ...input,
          user_id: user.id,
          timezone: input.timezone || 'America/Bogota',
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookingAvailability;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
    },
    onError: (error: Error) => {
      console.error('Error adding availability slot:', error);
      toast.error('Error al agregar horario');
    },
  });

  // Eliminar slot de disponibilidad
  const removeSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
    },
    onError: (error: Error) => {
      console.error('Error removing availability slot:', error);
      toast.error('Error al eliminar horario');
    },
  });

  // Actualizar toda la disponibilidad de un día
  const updateDaySchedule = useMutation({
    mutationFn: async ({
      day_of_week,
      slots,
      timezone = 'America/Bogota',
    }: {
      day_of_week: number;
      slots: Array<{ start_time: string; end_time: string }>;
      timezone?: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      // Eliminar slots existentes del día
      const { error: deleteError } = await supabase
        .from('booking_availability')
        .delete()
        .eq('user_id', user.id)
        .eq('day_of_week', day_of_week);

      if (deleteError) throw deleteError;

      // Si no hay slots nuevos, solo limpiamos
      if (slots.length === 0) return [];

      // Insertar nuevos slots
      const { data, error: insertError } = await supabase
        .from('booking_availability')
        .insert(
          slots.map((slot) => ({
            user_id: user.id,
            day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            timezone,
          }))
        )
        .select();

      if (insertError) throw insertError;
      return data as BookingAvailability[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
      toast.success('Disponibilidad actualizada');
    },
    onError: (error: Error) => {
      console.error('Error updating day schedule:', error);
      toast.error('Error al actualizar disponibilidad');
    },
  });

  // Copiar disponibilidad de un día a otros días
  const copyDayToOthers = useMutation({
    mutationFn: async ({
      sourceDay,
      targetDays,
      timezone = 'America/Bogota',
    }: {
      sourceDay: number;
      targetDays: number[];
      timezone?: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const sourceSlots = availability.filter((a) => a.day_of_week === sourceDay);

      if (sourceSlots.length === 0) {
        throw new Error('El día origen no tiene horarios configurados');
      }

      // Eliminar slots de los días destino
      const { error: deleteError } = await supabase
        .from('booking_availability')
        .delete()
        .eq('user_id', user.id)
        .in('day_of_week', targetDays);

      if (deleteError) throw deleteError;

      // Crear slots para cada día destino
      const newSlots = targetDays.flatMap((day) =>
        sourceSlots.map((slot) => ({
          user_id: user.id,
          day_of_week: day,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone,
        }))
      );

      const { data, error: insertError } = await supabase
        .from('booking_availability')
        .insert(newSlots)
        .select();

      if (insertError) throw insertError;
      return data as BookingAvailability[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
      toast.success('Disponibilidad copiada');
    },
    onError: (error: Error) => {
      console.error('Error copying availability:', error);
      toast.error(error.message || 'Error al copiar disponibilidad');
    },
  });

  return {
    availability,
    weeklySchedule,
    isLoading,
    error,
    refetch,
    addSlot,
    removeSlot,
    updateDaySchedule,
    copyDayToOthers,
  };
}

/**
 * Hook para gestionar excepciones (días bloqueados o con horarios especiales)
 */
export function useBookingExceptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener excepciones
  const {
    data: exceptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [EXCEPTIONS_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('booking_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .order('exception_date', { ascending: true });

      if (error) throw error;
      return data as BookingException[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Agregar excepción
  const addException = useMutation({
    mutationFn: async (input: ExceptionInput) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('booking_exceptions')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookingException;
    },
    onSuccess: (_, { is_blocked }) => {
      queryClient.invalidateQueries({ queryKey: [EXCEPTIONS_KEY] });
      toast.success(is_blocked ? 'Día bloqueado' : 'Horario especial agregado');
    },
    onError: (error: Error) => {
      console.error('Error adding exception:', error);
      toast.error('Error al agregar excepción');
    },
  });

  // Eliminar excepción
  const removeException = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXCEPTIONS_KEY] });
      toast.success('Excepción eliminada');
    },
    onError: (error: Error) => {
      console.error('Error removing exception:', error);
      toast.error('Error al eliminar excepción');
    },
  });

  return {
    exceptions,
    isLoading,
    error,
    refetch,
    addException,
    removeException,
    // Helpers
    isDateBlocked: (date: string) =>
      exceptions.some((e) => e.exception_date === date && e.is_blocked),
    getExceptionForDate: (date: string) =>
      exceptions.find((e) => e.exception_date === date),
  };
}
