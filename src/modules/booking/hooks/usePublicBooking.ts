// Hook para el flujo de reserva pública (sin autenticación requerida)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  BookingEventType,
  BookingHost,
  TimeSlot,
  CreateBookingInput,
  Booking,
} from '../types';

const HOST_KEY = 'booking-host';
const PUBLIC_EVENT_TYPES_KEY = 'booking-public-event-types';
const SLOTS_KEY = 'booking-slots';

/**
 * Hook para obtener información del host por username
 */
export function useBookingHost(username: string | undefined) {
  return useQuery({
    queryKey: [HOST_KEY, username],
    queryFn: async () => {
      if (!username) return null;

      const { data, error } = await supabase
        .rpc('get_booking_host_by_username', { _username: username })
        .single();

      if (error) throw error;
      return data as BookingHost;
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

/**
 * Hook para obtener tipos de evento públicos de un host
 */
export function usePublicEventTypes(hostUserId: string | undefined) {
  return useQuery({
    queryKey: [PUBLIC_EVENT_TYPES_KEY, hostUserId],
    queryFn: async () => {
      if (!hostUserId) return [];

      const { data, error } = await supabase
        .from('booking_event_types')
        .select('*')
        .eq('user_id', hostUserId)
        .eq('is_active', true)
        .order('duration_minutes', { ascending: true });

      if (error) throw error;
      return data as BookingEventType[];
    },
    enabled: !!hostUserId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para obtener slots disponibles para una fecha
 */
export function useAvailableSlots(
  hostUserId: string | undefined,
  eventTypeId: string | undefined,
  date: Date | undefined,
  timezone: string = 'America/Bogota'
) {
  return useQuery({
    queryKey: [SLOTS_KEY, hostUserId, eventTypeId, date?.toISOString(), timezone],
    queryFn: async () => {
      if (!hostUserId || !eventTypeId || !date) return [];

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error } = await supabase.rpc('get_available_booking_slots', {
        _host_user_id: hostUserId,
        _event_type_id: eventTypeId,
        _date: dateStr,
        _timezone: timezone,
      });

      if (error) throw error;

      // Convertir a TimeSlot[]
      return (data || []).map((slot: { slot_start: string; slot_end: string }) => ({
        start: new Date(slot.slot_start),
        end: new Date(slot.slot_end),
      })) as TimeSlot[];
    },
    enabled: !!hostUserId && !!eventTypeId && !!date,
    staleTime: 1000 * 60 * 1, // 1 min (slots pueden cambiar rápido)
  });
}

/**
 * Hook para crear una reserva
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      // Obtener el event type para location_type
      const { data: eventType, error: eventError } = await supabase
        .from('booking_event_types')
        .select('location_type, location_details')
        .eq('id', input.event_type_id)
        .single();

      if (eventError) throw eventError;

      // Crear la reserva
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          event_type_id: input.event_type_id,
          host_user_id: input.host_user_id,
          guest_name: input.guest_name,
          guest_email: input.guest_email,
          guest_phone: input.guest_phone,
          guest_notes: input.guest_notes,
          start_time: input.start_time,
          end_time: input.end_time,
          timezone: input.timezone,
          location_type: eventType.location_type,
          location_details: eventType.location_details,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      // Invalidar slots para que se actualicen
      queryClient.invalidateQueries({ queryKey: [SLOTS_KEY] });
      toast.success('Reserva creada exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creating booking:', error);
      toast.error('Error al crear la reserva');
    },
  });
}

/**
 * Hook para confirmar reserva via token
 */
export function useConfirmBookingByToken() {
  return useMutation({
    mutationFn: async (confirmationToken: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('confirmation_token', confirmationToken)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      toast.success('Reserva confirmada');
    },
    onError: (error: Error) => {
      console.error('Error confirming booking:', error);
      toast.error('Error al confirmar reserva');
    },
  });
}

/**
 * Hook para cancelar reserva via token
 */
export function useCancelBookingByToken() {
  return useMutation({
    mutationFn: async ({
      cancellationToken,
      reason,
    }: {
      cancellationToken: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'guest',
          cancellation_reason: reason,
        })
        .eq('cancellation_token', cancellationToken)
        .in('status', ['pending', 'confirmed'])
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      toast.success('Reserva cancelada');
    },
    onError: (error: Error) => {
      console.error('Error cancelling booking:', error);
      toast.error('Error al cancelar reserva');
    },
  });
}

/**
 * Hook para obtener fechas con disponibilidad en un rango
 */
export function useAvailableDates(
  hostUserId: string | undefined,
  eventTypeId: string | undefined,
  startDate: Date,
  endDate: Date,
  timezone: string = 'America/Bogota'
) {
  return useQuery({
    queryKey: [
      'booking-available-dates',
      hostUserId,
      eventTypeId,
      startDate.toISOString(),
      endDate.toISOString(),
      timezone,
    ],
    queryFn: async () => {
      if (!hostUserId || !eventTypeId) return [];

      // Obtener disponibilidad semanal del host
      const { data: availability, error: availError } = await supabase
        .from('booking_availability')
        .select('day_of_week')
        .eq('user_id', hostUserId);

      if (availError) throw availError;

      const availableDays = new Set(availability?.map((a) => a.day_of_week) || []);

      // Obtener excepciones (días bloqueados)
      const { data: exceptions, error: excError } = await supabase
        .from('booking_exceptions')
        .select('exception_date, is_blocked')
        .eq('user_id', hostUserId)
        .gte('exception_date', startDate.toISOString().split('T')[0])
        .lte('exception_date', endDate.toISOString().split('T')[0]);

      if (excError) throw excError;

      const blockedDates = new Set(
        exceptions?.filter((e) => e.is_blocked).map((e) => e.exception_date) || []
      );
      const specialDates = new Set(
        exceptions?.filter((e) => !e.is_blocked).map((e) => e.exception_date) || []
      );

      // Generar lista de fechas disponibles
      const dates: Date[] = [];
      const current = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();

        // La fecha debe ser futura
        if (current >= today) {
          // Si tiene horario especial, está disponible
          if (specialDates.has(dateStr)) {
            dates.push(new Date(current));
          }
          // Si no está bloqueada y el día de la semana tiene disponibilidad
          else if (!blockedDates.has(dateStr) && availableDays.has(dayOfWeek)) {
            dates.push(new Date(current));
          }
        }

        current.setDate(current.getDate() + 1);
      }

      return dates;
    },
    enabled: !!hostUserId && !!eventTypeId,
    staleTime: 1000 * 60 * 5,
  });
}
