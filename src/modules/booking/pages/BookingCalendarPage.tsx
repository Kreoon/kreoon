// Página del calendario de reservas

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, List, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingCalendar } from '../components/Calendar';
import { useBookings } from '../hooks';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../types';

export function BookingCalendarPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const { bookings, upcomingBookings, todayBookings, isLoading } = useBookings();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis citas</h1>
          <p className="text-muted-foreground">
            Gestiona tus reservas y calendario
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/booking/settings">
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Link>
          </Button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayBookings.length}</p>
            <p className="text-xs text-muted-foreground">
              {todayBookings.length === 1 ? 'cita' : 'citas'} programadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcomingBookings.length}</p>
            <p className="text-xs text-muted-foreground">citas por atender</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próxima cita
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 ? (
              <>
                <p className="text-lg font-semibold">
                  {format(new Date(upcomingBookings[0].start_time), 'HH:mm', {
                    locale: es,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(upcomingBookings[0].start_time), "EEEE d 'de' MMMM", {
                    locale: es,
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin citas próximas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vista principal */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <BookingCalendar />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Próximas citas</CardTitle>
              <CardDescription>
                Lista de todas tus citas ordenadas por fecha
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tienes citas próximas</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/booking/settings">Configurar disponibilidad</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor: booking.event_type?.color || '#8B5CF6',
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">
                            {booking.event_type?.title || 'Cita'}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`${BOOKING_STATUS_COLORS[booking.status].bg} ${
                              BOOKING_STATUS_COLORS[booking.status].text
                            }`}
                          >
                            {BOOKING_STATUS_LABELS[booking.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(
                            new Date(booking.start_time),
                            "EEEE d 'de' MMMM 'a las' HH:mm",
                            { locale: es }
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Con {booking.guest_name} ({booking.guest_email})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
