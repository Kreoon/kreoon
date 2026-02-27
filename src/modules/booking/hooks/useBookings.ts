// Hook para gestionar reservas de booking

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Booking, BookingStatus, UpdateBookingInput, CalendarBooking } from '../types';

const QUERY_KEY = 'bookings';

/**
 * Hook para gestionar reservas del usuario (como host)
 */
export function useBookings(options?: {
  status?: BookingStatus[];
  from?: Date;
  to?: Date;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener reservas
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, user?.id, options?.status, options?.from, options?.to],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('bookings')
        .select(`
          *,
          event_type:booking_event_types(*)
        `)
        .eq('host_user_id', user.id)
        .order('start_time', { ascending: true });

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      if (options?.from) {
        query = query.gte('start_time', options.from.toISOString());
      }

      if (options?.to) {
        query = query.lte('start_time', options.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 min
  });

  // Actualizar estado de reserva
  const updateBooking = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateBookingInput & { id: string }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: Error) => {
      console.error('Error updating booking:', error);
      toast.error('Error al actualizar reserva');
    },
  });

  // Confirmar reserva
  const confirmBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Reserva confirmada');
    },
    onError: (error: Error) => {
      console.error('Error confirming booking:', error);
      toast.error('Error al confirmar reserva');
    },
  });

  // Cancelar reserva
  const cancelBooking = useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'host',
          cancellation_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Reserva cancelada');
    },
    onError: (error: Error) => {
      console.error('Error cancelling booking:', error);
      toast.error('Error al cancelar reserva');
    },
  });

  // Marcar como completada
  const completeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Reserva marcada como completada');
    },
    onError: (error: Error) => {
      console.error('Error completing booking:', error);
      toast.error('Error al completar reserva');
    },
  });

  // Marcar como no asistió
  const markNoShow = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Reserva marcada como no asistió');
    },
    onError: (error: Error) => {
      console.error('Error marking no show:', error);
      toast.error('Error al marcar reserva');
    },
  });

  // Convertir a formato de calendario
  const calendarBookings: CalendarBooking[] = bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.guest_name} - ${booking.event_type?.title || 'Cita'}`,
    start: new Date(booking.start_time),
    end: new Date(booking.end_time),
    status: booking.status,
    color: booking.event_type?.color || '#8B5CF6',
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
    location_type: booking.location_type,
  }));

  return {
    bookings,
    calendarBookings,
    isLoading,
    error,
    refetch,
    updateBooking,
    confirmBooking,
    cancelBooking,
    completeBooking,
    markNoShow,
    // Computed
    upcomingBookings: bookings.filter(
      (b) =>
        ['pending', 'confirmed'].includes(b.status) &&
        new Date(b.start_time) > new Date()
    ),
    todayBookings: bookings.filter((b) => {
      const start = new Date(b.start_time);
      const today = new Date();
      return (
        start.toDateString() === today.toDateString() &&
        ['pending', 'confirmed'].includes(b.status)
      );
    }),
  };
}

/**
 * Hook para obtener una reserva específica por ID
 */
export function useBooking(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, 'single', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          event_type:booking_event_types(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Booking;
    },
    enabled: !!id && !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook para estadísticas de reservas
 */
export function useBookingStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, 'stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('bookings')
        .select('status, start_time')
        .eq('host_user_id', user.id)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter((b) => b.status === 'pending').length,
        confirmed: data.filter((b) => b.status === 'confirmed').length,
        completed: data.filter((b) => b.status === 'completed').length,
        cancelled: data.filter((b) => b.status === 'cancelled').length,
        noShow: data.filter((b) => b.status === 'no_show').length,
      };

      return stats;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}
