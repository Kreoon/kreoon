// Página de configuración de booking

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Calendar, Clock, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { EventTypeList } from '../components/EventTypes';
import { AvailabilityEditor } from '../components/Availability';
import { useProfile } from '@/hooks/useProfile';
import { useBookingStats } from '../hooks';

export function BookingSettingsPage() {
  const { profile } = useProfile();
  const { data: stats } = useBookingStats();

  const bookingUrl = profile?.username
    ? `${window.location.origin}/book/${profile.username}`
    : null;

  const handleCopyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  const handleOpenLink = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking</h1>
          <p className="text-muted-foreground">
            Configura tus tipos de cita y disponibilidad
          </p>
        </div>

        {bookingUrl && (
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 bg-muted rounded-lg text-sm truncate max-w-[300px]">
              {bookingUrl}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleOpenLink}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">reservas totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">por confirmar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Confirmadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              <p className="text-xs text-muted-foreground">próximas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">este mes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="event-types" className="space-y-6">
        <TabsList>
          <TabsTrigger value="event-types" className="gap-2">
            <Calendar className="h-4 w-4" />
            Tipos de evento
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Clock className="h-4 w-4" />
            Disponibilidad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event-types">
          <EventTypeList />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
