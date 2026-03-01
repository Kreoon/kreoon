// Página pública para reprogramar una reserva

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TimeSlotSelector } from '../components/Public/TimeSlotSelector';
import type { CancellationPolicy, TimeSlot } from '../types';

interface BookingDetails {
  id: string;
  event_type_id: string;
  event_type: {
    title: string;
    duration_minutes: number;
    cancellation_policy: CancellationPolicy | null;
  };
  host: {
    id: string;
    full_name: string;
    username: string;
  };
  start_time: string;
  end_time: string;
  status: string;
  reschedule_count: number;
}

export function RescheduleBookingPage() {
  const { bookingId, token } = useParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId || !token) {
        setError('Enlace inválido');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            id,
            event_type_id,
            start_time,
            end_time,
            status,
            reschedule_token,
            reschedule_count,
            event_type:booking_event_types(
              title,
              duration_minutes,
              cancellation_policy
            ),
            host:profiles!bookings_host_id_fkey(
              id,
              full_name,
              username
            )
          `)
          .eq('id', bookingId)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Reserva no encontrada');
          setLoading(false);
          return;
        }

        if (data.reschedule_token !== token) {
          setError('Enlace inválido o expirado');
          setLoading(false);
          return;
        }

        setBooking({
          id: data.id,
          event_type_id: data.event_type_id,
          event_type: data.event_type as unknown as BookingDetails['event_type'],
          host: data.host as unknown as BookingDetails['host'],
          start_time: data.start_time,
          end_time: data.end_time,
          status: data.status,
          reschedule_count: data.reschedule_count || 0,
        });
      } catch (err) {
        console.error('Error loading booking:', err);
        setError('Error al cargar la reserva');
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, token]);

  // Load available slots when date changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate || !booking) return;

      setLoadingSlots(true);
      try {
        const { data, error } = await supabase.functions.invoke('booking-available-slots', {
          body: {
            eventTypeId: booking.event_type_id,
            date: selectedDate.toISOString().split('T')[0],
            excludeBookingId: booking.id,
          },
        });

        if (error) throw error;
        setAvailableSlots(data?.slots || []);
      } catch (err) {
        console.error('Error loading slots:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedDate, booking]);

  const canReschedule = () => {
    if (!booking) return false;
    if (booking.status === 'cancelled') return false;

    const policy = booking.event_type.cancellation_policy;
    if (!policy?.allow_reschedule) return false;

    const limit = policy.reschedule_limit || 2;
    if (booking.reschedule_count >= limit) return false;

    return true;
  };

  const handleReschedule = async () => {
    if (!booking || !selectedSlot || !canReschedule()) return;

    setRescheduling(true);
    try {
      const { error: rescheduleError } = await supabase.functions.invoke('booking-reschedule', {
        body: {
          bookingId: booking.id,
          token,
          newStartTime: selectedSlot.start,
          newEndTime: selectedSlot.end,
        },
      });

      if (rescheduleError) throw rescheduleError;

      setRescheduled(true);
      toast.success('Reserva reprogramada');
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      toast.error('Error al reprogramar la reserva');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{error}</h1>
          <p className="text-slate-500">
            El enlace de reprogramación no es válido o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  if (rescheduled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Reserva reprogramada
          </h1>
          <p className="text-slate-500 mb-4">
            Tu cita ha sido reprogramada para el{' '}
            <span className="font-medium text-slate-900">
              {selectedSlot &&
                new Date(selectedSlot.start).toLocaleDateString('es', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
              a las{' '}
              {selectedSlot &&
                new Date(selectedSlot.start).toLocaleTimeString('es', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            Se ha enviado una confirmación por email.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!booking) return null;

  const startDate = new Date(booking.start_time);
  const policy = booking.event_type.cancellation_policy;
  const canRescheduleNow = canReschedule();
  const remainingReschedules = (policy?.reschedule_limit || 2) - booking.reschedule_count;

  // Calendar helpers
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isDateSelectable = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-6 h-6" />
              <h1 className="text-xl font-bold">Reprogramar reserva</h1>
            </div>
            <p className="text-white/80 text-sm">
              Elige una nueva fecha y hora para tu cita
            </p>
          </div>

          {/* Current Booking Details */}
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-500 mb-2">Cita actual</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">
                  {booking.event_type.title}
                </h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {startDate.toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {startDate.toLocaleTimeString('es', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {booking.host.full_name}
                  </span>
                </div>
              </div>
              {canRescheduleNow && (
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                  {remainingReschedules} cambio{remainingReschedules !== 1 ? 's' : ''} restante{remainingReschedules !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {canRescheduleNow ? (
            <>
              {/* Calendar */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-900">
                    {currentMonth.toLocaleDateString('es', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                        )
                      }
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                        )
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                    <div key={i} className="py-2 text-slate-400 font-medium">
                      {d}
                    </div>
                  ))}
                  {days.map((day, i) => (
                    <div key={i} className="aspect-square">
                      {day && (
                        <button
                          onClick={() => {
                            const date = new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth(),
                              day
                            );
                            setSelectedDate(date);
                            setSelectedSlot(null);
                          }}
                          disabled={!isDateSelectable(day)}
                          className={`w-full h-full rounded-lg text-sm font-medium transition-all ${
                            selectedDate?.getDate() === day &&
                            selectedDate?.getMonth() === currentMonth.getMonth()
                              ? 'bg-violet-500 text-white'
                              : isDateSelectable(day)
                              ? 'hover:bg-violet-50 text-slate-700'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {day}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="p-6 border-b border-slate-100">
                  <h3 className="font-medium text-slate-900 mb-4">
                    Horarios disponibles -{' '}
                    {selectedDate.toLocaleDateString('es', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>

                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">
                      No hay horarios disponibles para esta fecha
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => {
                        const startTime = new Date(slot.start);
                        return (
                          <button
                            key={slot.start}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              selectedSlot?.start === slot.start
                                ? 'bg-violet-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-violet-100'
                            }`}
                          >
                            {startTime.toLocaleTimeString('es', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Button */}
              <div className="p-6">
                <Button
                  onClick={handleReschedule}
                  disabled={!selectedSlot || rescheduling}
                  className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-lg py-3"
                >
                  {rescheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reprogramando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Confirmar nueva fecha
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      No es posible reprogramar esta reserva
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {policy?.allow_reschedule === false
                        ? 'Las reprogramaciones no están permitidas para este tipo de cita.'
                        : `Has alcanzado el límite de ${policy?.reschedule_limit || 2} reprogramaciones para esta reserva.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
