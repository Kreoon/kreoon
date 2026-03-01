// Página pública para cancelar una reserva

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CancellationPolicy } from '../types';

interface BookingDetails {
  id: string;
  event_type: {
    title: string;
    duration_minutes: number;
    cancellation_policy: CancellationPolicy | null;
  };
  host: {
    full_name: string;
  };
  start_time: string;
  end_time: string;
  status: string;
}

export function CancelBookingPage() {
  const { bookingId, token } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

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
            start_time,
            end_time,
            status,
            cancel_token,
            event_type:booking_event_types(
              title,
              duration_minutes,
              cancellation_policy
            ),
            host:profiles!bookings_host_id_fkey(
              full_name
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

        if (data.cancel_token !== token) {
          setError('Enlace inválido o expirado');
          setLoading(false);
          return;
        }

        if (data.status === 'cancelled') {
          setCancelled(true);
        }

        setBooking({
          id: data.id,
          event_type: data.event_type as unknown as BookingDetails['event_type'],
          host: data.host as unknown as BookingDetails['host'],
          start_time: data.start_time,
          end_time: data.end_time,
          status: data.status,
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

  const canCancel = () => {
    if (!booking) return false;
    if (booking.status === 'cancelled') return false;

    const policy = booking.event_type.cancellation_policy;
    if (!policy?.allow_cancellation) return false;

    const startTime = new Date(booking.start_time);
    const now = new Date();
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilStart >= (policy.min_hours_before || 0);
  };

  const handleCancel = async () => {
    if (!booking || !canCancel()) return;

    setCancelling(true);
    try {
      const { error: cancelError } = await supabase.functions.invoke('booking-cancel', {
        body: {
          bookingId: booking.id,
          token,
          reason,
        },
      });

      if (cancelError) throw cancelError;

      setCancelled(true);
      toast.success('Reserva cancelada');
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error('Error al cancelar la reserva');
    } finally {
      setCancelling(false);
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
            El enlace de cancelación no es válido o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  if (cancelled) {
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
            Reserva cancelada
          </h1>
          <p className="text-slate-500 mb-6">
            Tu cita ha sido cancelada correctamente. Se ha enviado una notificación al anfitrión.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!booking) return null;

  const startDate = new Date(booking.start_time);
  const policy = booking.event_type.cancellation_policy;
  const hoursUntilStart = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const canCancelNow = canCancel();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-red-500 to-rose-500 text-white">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6" />
              <h1 className="text-xl font-bold">Cancelar reserva</h1>
            </div>
            <p className="text-white/80 text-sm">
              ¿Estás seguro de que deseas cancelar esta cita?
            </p>
          </div>

          {/* Booking Details */}
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-lg mb-4">
              {booking.event_type.title}
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>con {booking.host.full_name}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  {startDate.toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {startDate.toLocaleTimeString('es', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ({booking.event_type.duration_minutes} min)
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Form or Warning */}
          <div className="p-6">
            {canCancelNow ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Motivo de cancelación (opcional)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Cuéntanos por qué cancelas..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-3"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirmar cancelación
                    </>
                  )}
                </Button>

                {policy?.policy_text && (
                  <p className="text-xs text-slate-500 text-center mt-4">
                    {policy.policy_text}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      No es posible cancelar esta reserva
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {policy?.allow_cancellation === false
                        ? 'Las cancelaciones no están permitidas para este tipo de cita.'
                        : `Las cancelaciones deben realizarse con al menos ${policy?.min_hours_before || 24} horas de anticipación. Quedan ${Math.round(hoursUntilStart)} horas para tu cita.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
