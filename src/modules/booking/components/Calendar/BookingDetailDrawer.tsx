// Booking Detail Drawer - Calendly-inspired design

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Video,
  Link as LinkIcon,
  Check,
  X,
  MessageSquare,
  Loader2,
  CalendarDays,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking, BookingLocationType } from '../../types';
import {
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
} from '../../types';
import { useBookings } from '../../hooks';

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

// Design tokens
const styles = {
  section: {
    padding: '16px 0',
    borderBottom: '1px solid #E5E7EB',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
  },
  iconWrapper: (color: string) => ({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: color + '15',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  actionButton: (variant: 'primary' | 'danger' | 'outline') => ({
    width: '100%',
    padding: '12px 20px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    ...(variant === 'primary' && {
      background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
      color: '#FFFFFF',
      boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)',
    }),
    ...(variant === 'danger' && {
      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      color: '#FFFFFF',
      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
    }),
    ...(variant === 'outline' && {
      background: '#FFFFFF',
      color: '#374151',
      border: '1px solid #E5E7EB',
    }),
  }),
};

interface BookingDetailDrawerProps {
  booking: Booking | null;
  onClose: () => void;
}

export function BookingDetailDrawer({ booking, onClose }: BookingDetailDrawerProps) {
  const { confirmBooking, cancelBooking, completeBooking, markNoShow, updateBooking } =
    useBookings();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [hostNotes, setHostNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  if (!booking) {
    return (
      <Sheet open={false} onOpenChange={onClose}>
        <SheetContent />
      </Sheet>
    );
  }

  const LocationIcon = LOCATION_ICONS[booking.location_type];
  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';
  const isPast = new Date(booking.end_time) < new Date();
  const startDate = new Date(booking.start_time);

  const handleConfirm = () => {
    confirmBooking.mutate(booking.id, {
      onSuccess: onClose,
    });
  };

  const handleCancel = () => {
    cancelBooking.mutate(
      { id: booking.id, reason: cancelReason },
      {
        onSuccess: () => {
          setShowCancelDialog(false);
          setCancelReason('');
          onClose();
        },
      }
    );
  };

  const handleComplete = () => {
    completeBooking.mutate(booking.id, {
      onSuccess: onClose,
    });
  };

  const handleNoShow = () => {
    markNoShow.mutate(booking.id, {
      onSuccess: onClose,
    });
  };

  const handleSaveNotes = () => {
    updateBooking.mutate(
      { id: booking.id, host_notes: hostNotes },
      {
        onSuccess: () => setIsEditingNotes(false),
      }
    );
  };

  return (
    <>
      <Sheet open={!!booking} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-lg p-0 overflow-hidden">
          {/* Header with color bar */}
          <div
            className="h-2"
            style={{ background: booking.event_type?.color || '#8B5CF6' }}
          />

          <div className="p-6">
            <SheetHeader className="text-left">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SheetTitle className="text-xl font-semibold text-slate-900">
                    {booking.event_type?.title || 'Cita'}
                  </SheetTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {format(startDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    BOOKING_STATUS_COLORS[booking.status].bg
                  } ${BOOKING_STATUS_COLORS[booking.status].text}`}
                >
                  {booking.status === 'confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {booking.status === 'pending' && <AlertCircle className="w-3.5 h-3.5" />}
                  {booking.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-0">
              {/* Time section */}
              <div style={styles.section}>
                <div style={styles.infoRow}>
                  <div style={styles.iconWrapper('#0066FF')}>
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {format(startDate, 'HH:mm')} – {format(new Date(booking.end_time), 'HH:mm')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {booking.event_type?.duration_minutes} minutos ·{' '}
                      {formatDistanceToNow(startDate, { locale: es, addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guest section */}
              <div style={styles.section}>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Invitado
                </h4>
                <div className="space-y-2">
                  <div style={styles.infoRow}>
                    <div style={styles.iconWrapper('#10B981')}>
                      <User className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="font-medium text-slate-900">{booking.guest_name}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <div style={styles.iconWrapper('#8B5CF6')}>
                      <Mail className="w-4 h-4 text-purple-500" />
                    </div>
                    <a
                      href={`mailto:${booking.guest_email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {booking.guest_email}
                    </a>
                  </div>
                  {booking.guest_phone && (
                    <div style={styles.infoRow}>
                      <div style={styles.iconWrapper('#F59E0B')}>
                        <Phone className="w-4 h-4 text-amber-500" />
                      </div>
                      <a
                        href={`tel:${booking.guest_phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {booking.guest_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Location section */}
              <div style={styles.section}>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Ubicación
                </h4>
                <div style={styles.infoRow}>
                  <div style={styles.iconWrapper('#EC4899')}>
                    <LocationIcon className="w-4 h-4 text-pink-500" />
                  </div>
                  <span className="text-slate-900">{LOCATION_TYPE_LABELS[booking.location_type]}</span>
                </div>
                {booking.meeting_url && (
                  <motion.a
                    href={booking.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="mt-3 flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Unirse a la reunión
                    <ExternalLink className="w-3 h-3" />
                  </motion.a>
                )}
                {booking.location_details && !booking.meeting_url && (
                  <p className="mt-2 text-sm text-slate-500 pl-12">
                    {booking.location_details}
                  </p>
                )}
              </div>

              {/* Guest notes */}
              {booking.guest_notes && (
                <div style={styles.section}>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Notas del invitado
                  </h4>
                  <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">
                    {booking.guest_notes}
                  </p>
                </div>
              )}

              {/* Host notes */}
              <div style={styles.section}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Mis notas
                  </h4>
                  {!isEditingNotes && (
                    <button
                      onClick={() => {
                        setHostNotes(booking.host_notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {booking.host_notes ? 'Editar' : 'Agregar'}
                    </button>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  {isEditingNotes ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Textarea
                        value={hostNotes}
                        onChange={(e) => setHostNotes(e.target.value)}
                        placeholder="Notas privadas sobre esta cita..."
                        className="bg-slate-50 border-slate-200 rounded-xl"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={updateBooking.isPending}
                          className="rounded-lg"
                        >
                          {updateBooking.isPending && (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          )}
                          Guardar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingNotes(false)}
                          className="rounded-lg"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </motion.div>
                  ) : booking.host_notes ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl"
                    >
                      {booking.host_notes}
                    </motion.p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Sin notas</p>
                  )}
                </AnimatePresence>
              </div>

              {/* Cancellation info */}
              {booking.status === 'cancelled' && booking.cancelled_at && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 p-4 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
                    <XCircle className="w-4 h-4" />
                    Reserva cancelada
                  </div>
                  <p className="text-sm text-red-700">
                    Cancelada por {booking.cancelled_by === 'host' ? 'ti' : 'el invitado'} el{' '}
                    {format(new Date(booking.cancelled_at), "d 'de' MMMM 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                  {booking.cancellation_reason && (
                    <p className="text-sm text-red-600 mt-2">
                      Razón: {booking.cancellation_reason}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <div className="pt-6 space-y-3">
                {isPending && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleConfirm}
                      disabled={confirmBooking.isPending}
                      style={styles.actionButton('primary')}
                      className="disabled:opacity-50"
                    >
                      {confirmBooking.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Confirmar reserva
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setShowCancelDialog(true)}
                      style={styles.actionButton('outline')}
                    >
                      <X className="w-4 h-4" />
                      Rechazar
                    </motion.button>
                  </>
                )}

                {isConfirmed && !isPast && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setShowCancelDialog(true)}
                    style={styles.actionButton('danger')}
                  >
                    <X className="w-4 h-4" />
                    Cancelar reserva
                  </motion.button>
                )}

                {isConfirmed && isPast && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleComplete}
                      disabled={completeBooking.isPending}
                      style={styles.actionButton('primary')}
                      className="disabled:opacity-50"
                    >
                      {completeBooking.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Marcar como completada
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleNoShow}
                      disabled={markNoShow.isPending}
                      style={styles.actionButton('outline')}
                      className="disabled:opacity-50"
                    >
                      No asistió
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Se notificará al invitado por email sobre la cancelación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm text-slate-600">Razón (opcional)</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explica brevemente por qué cancelas..."
              className="mt-2 bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              {cancelBooking.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
