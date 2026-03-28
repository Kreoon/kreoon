// Página de confirmación de reserva exitosa

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User, Mail, Video, MapPin, Phone, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking, BookingLocationType } from '../../types';
import { LOCATION_TYPE_LABELS } from '../../types';

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

interface BookingSuccessProps {
  booking: Booking;
  hostName: string;
}

export function BookingSuccess({ booking, hostName }: BookingSuccessProps) {
  const LocationIcon = LOCATION_ICONS[booking.location_type];

  // Generar enlace para agregar al calendario
  const generateCalendarUrl = () => {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    const formatDateForGoogle = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: booking.event_type?.title || 'Cita',
      dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
      details: `Cita con ${hostName}`,
      location: booking.location_details || LOCATION_TYPE_LABELS[booking.location_type],
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Reserva confirmada</CardTitle>
          <p className="text-muted-foreground mt-2">
            Tu cita ha sido agendada exitosamente
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalles de la reserva */}
          <div className="bg-muted/50 rounded-sm p-4 space-y-4">
            <h3 className="font-semibold text-lg">
              {booking.event_type?.title || 'Cita'}
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(booking.start_time), "EEEE d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                  {format(new Date(booking.end_time), 'HH:mm')} ({booking.timezone})
                </span>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Con {hostName}</span>
              </div>

              <div className="flex items-center gap-3">
                <LocationIcon className="h-4 w-4 text-muted-foreground" />
                <span>{LOCATION_TYPE_LABELS[booking.location_type]}</span>
              </div>
            </div>
          </div>

          {/* Mensaje sobre confirmación */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Hemos enviado un email de confirmación a{' '}
              <strong>{booking.guest_email}</strong>
            </p>
            {booking.status === 'pending' && (
              <p className="mt-2 text-amber-600">
                Tu reserva está pendiente de confirmación por parte de {hostName}.
                Recibirás un email cuando sea confirmada.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            <Button asChild className="w-full">
              <a href={generateCalendarUrl()} target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4 mr-2" />
                Agregar a Google Calendar
              </a>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <a href="/">Volver al inicio</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
