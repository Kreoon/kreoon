// Drawer con detalles de una reserva

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { format } from 'date-fns';
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
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle>{booking.event_type?.title || 'Cita'}</SheetTitle>
                <SheetDescription>
                  {format(new Date(booking.start_time), "EEEE d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </SheetDescription>
              </div>
              <Badge
                variant="outline"
                className={`${BOOKING_STATUS_COLORS[booking.status].bg} ${
                  BOOKING_STATUS_COLORS[booking.status].text
                }`}
              >
                {BOOKING_STATUS_LABELS[booking.status]}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Horario */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                  {format(new Date(booking.end_time), 'HH:mm')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {booking.event_type?.duration_minutes} minutos
                </p>
              </div>
            </div>

            {/* Invitado */}
            <div className="space-y-3">
              <h4 className="font-medium">Invitado</h4>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{booking.guest_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${booking.guest_email}`}
                  className="text-primary hover:underline"
                >
                  {booking.guest_email}
                </a>
              </div>
              {booking.guest_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${booking.guest_phone}`}
                    className="text-primary hover:underline"
                  >
                    {booking.guest_phone}
                  </a>
                </div>
              )}
            </div>

            {/* Ubicación */}
            <div className="space-y-3">
              <h4 className="font-medium">Ubicación</h4>
              <div className="flex items-center gap-3">
                <LocationIcon className="h-4 w-4 text-muted-foreground" />
                <span>{LOCATION_TYPE_LABELS[booking.location_type]}</span>
              </div>
              {booking.meeting_url && (
                <Button variant="outline" asChild className="w-full">
                  <a href={booking.meeting_url} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Unirse a la reunión
                  </a>
                </Button>
              )}
              {booking.location_details && !booking.meeting_url && (
                <p className="text-sm text-muted-foreground pl-7">
                  {booking.location_details}
                </p>
              )}
            </div>

            {/* Notas del invitado */}
            {booking.guest_notes && (
              <div className="space-y-2">
                <h4 className="font-medium">Notas del invitado</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {booking.guest_notes}
                </p>
              </div>
            )}

            {/* Notas del host */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Mis notas</h4>
                {!isEditingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHostNotes(booking.host_notes || '');
                      setIsEditingNotes(true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {booking.host_notes ? 'Editar' : 'Agregar'}
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={hostNotes}
                    onChange={(e) => setHostNotes(e.target.value)}
                    placeholder="Notas privadas sobre esta cita..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={updateBooking.isPending}>
                      {updateBooking.isPending && (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      )}
                      Guardar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : booking.host_notes ? (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {booking.host_notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sin notas</p>
              )}
            </div>

            <Separator />

            {/* Acciones */}
            <div className="space-y-2">
              {isPending && (
                <>
                  <Button
                    className="w-full"
                    onClick={handleConfirm}
                    disabled={confirmBooking.isPending}
                  >
                    {confirmBooking.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Confirmar reserva
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </>
              )}

              {isConfirmed && !isPast && (
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar reserva
                </Button>
              )}

              {isConfirmed && isPast && (
                <>
                  <Button
                    className="w-full"
                    onClick={handleComplete}
                    disabled={completeBooking.isPending}
                  >
                    {completeBooking.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Marcar como completada
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleNoShow}
                    disabled={markNoShow.isPending}
                  >
                    No asistió
                  </Button>
                </>
              )}
            </div>

            {/* Info de cancelación */}
            {booking.status === 'cancelled' && booking.cancelled_at && (
              <div className="bg-destructive/10 p-3 rounded-lg text-sm">
                <p className="font-medium text-destructive">Reserva cancelada</p>
                <p className="text-muted-foreground">
                  Cancelada por {booking.cancelled_by === 'host' ? 'ti' : 'el invitado'} el{' '}
                  {format(new Date(booking.cancelled_at), "d 'de' MMMM 'a las' HH:mm", {
                    locale: es,
                  })}
                </p>
                {booking.cancellation_reason && (
                  <p className="mt-1">Razón: {booking.cancellation_reason}</p>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de cancelación */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar esta reserva? Se notificará al
              invitado por email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Razón (opcional)</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explica brevemente por qué cancelas..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelBooking.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
