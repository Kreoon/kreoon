// Calendario de reservas

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useBookings } from '../../hooks';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import type { Booking, CalendarBooking } from '../../types';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../types';

export function BookingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Obtener reservas del mes actual (+/- 1 semana para días de semanas parciales)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { bookings, isLoading } = useBookings({
    from: calendarStart,
    to: calendarEnd,
  });

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Agrupar reservas por día
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();

    bookings.forEach((booking) => {
      const dateKey = format(new Date(booking.start_time), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [
        ...existing,
        {
          id: booking.id,
          title: `${booking.guest_name} - ${booking.event_type?.title || 'Cita'}`,
          start: new Date(booking.start_time),
          end: new Date(booking.end_time),
          status: booking.status,
          color: booking.event_type?.color || '#8B5CF6',
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          location_type: booking.location_type,
        },
      ]);
    });

    return map;
  }, [bookings]);

  // Reservas del día seleccionado
  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return bookings.filter(
      (b) => format(new Date(b.start_time), 'yyyy-MM-dd') === dateKey
    );
  }, [selectedDate, bookings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendario mensual */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Encabezados de días */}
          <div className="grid grid-cols-7 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del calendario */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={dateKey}
                  className={`min-h-[100px] p-1 border rounded-lg cursor-pointer transition-colors ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/50'
                  } ${isSelected ? 'ring-2 ring-primary' : ''} ${
                    isToday ? 'border-primary' : ''
                  } hover:bg-muted/50`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div
                    className={`text-sm font-medium ${
                      !isCurrentMonth ? 'text-muted-foreground' : ''
                    } ${isToday ? 'text-primary' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Indicadores de reservas */}
                  <div className="space-y-1 mt-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <div
                        key={booking.id}
                        className="text-xs truncate px-1 py-0.5 rounded"
                        style={{ backgroundColor: booking.color + '30' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullBooking = bookings.find((b) => b.id === booking.id);
                          if (fullBooking) setSelectedBooking(fullBooking);
                        }}
                      >
                        <span className="font-medium">
                          {format(booking.start, 'HH:mm')}
                        </span>{' '}
                        {booking.guest_name}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayBookings.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Panel lateral con detalles del día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {selectedDate
              ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
              : 'Selecciona un día'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-muted-foreground text-center py-8">
              Haz clic en un día para ver las reservas
            </p>
          ) : selectedDayBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay reservas para este día
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayBookings
                .sort(
                  (a, b) =>
                    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                )
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ borderLeftWidth: 4, borderLeftColor: booking.event_type?.color }}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{booking.event_type?.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                          {format(new Date(booking.end_time), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          {booking.guest_name}
                        </div>
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
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer de detalles */}
      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
