// Página pública para reservar citas

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Clock,
  Video,
  Phone,
  MapPin,
  Link as LinkIcon,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CalendarIcon,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useBookingHost,
  usePublicEventTypes,
  useAvailableSlots,
  useAvailableDates,
  useCreateBooking,
} from '../../hooks';
import { TimeSlotSelector } from './TimeSlotSelector';
import { BookingSuccess } from './BookingSuccess';
import type { BookingEventType, TimeSlot, Booking, BookingLocationType } from '../../types';
import { LOCATION_TYPE_LABELS } from '../../types';

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

const guestSchema = z.object({
  guest_name: z.string().min(2, 'El nombre es requerido'),
  guest_email: z.string().email('Email inválido'),
  guest_phone: z.string().optional(),
  guest_notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type GuestFormData = z.infer<typeof guestSchema>;

type BookingStep = 'event-type' | 'date-time' | 'details' | 'success';

export function PublicBookingPage() {
  const { username, eventSlug } = useParams<{ username: string; eventSlug?: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<BookingStep>('event-type');
  const [selectedEventType, setSelectedEventType] = useState<BookingEventType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Queries
  const { data: host, isLoading: loadingHost, error: hostError } = useBookingHost(username);
  const { data: eventTypes = [], isLoading: loadingEventTypes } = usePublicEventTypes(host?.user_id);
  const { data: availableDates = [] } = useAvailableDates(
    host?.user_id,
    selectedEventType?.id,
    new Date(),
    addDays(new Date(), selectedEventType?.max_days_in_advance || 60),
    timezone
  );
  const { data: slots = [], isLoading: loadingSlots } = useAvailableSlots(
    host?.user_id,
    selectedEventType?.id,
    selectedDate,
    timezone
  );

  const createBooking = useCreateBooking();

  // Form
  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_notes: '',
    },
  });

  // Auto-seleccionar event type si viene en URL
  useMemo(() => {
    if (eventSlug && eventTypes.length > 0 && !selectedEventType) {
      const found = eventTypes.find((et) => et.slug === eventSlug);
      if (found) {
        setSelectedEventType(found);
        setStep('date-time');
      }
    }
  }, [eventSlug, eventTypes, selectedEventType]);

  // Handlers
  const handleSelectEventType = (eventType: BookingEventType) => {
    setSelectedEventType(eventType);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setStep('date-time');
  };

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinueToDetails = () => {
    if (selectedSlot) {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'date-time') {
      setSelectedEventType(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setStep('event-type');
    } else if (step === 'details') {
      setStep('date-time');
    }
  };

  const handleSubmit = (data: GuestFormData) => {
    if (!host || !selectedEventType || !selectedSlot) return;

    createBooking.mutate(
      {
        event_type_id: selectedEventType.id,
        host_user_id: host.user_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone,
        guest_notes: data.guest_notes,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        timezone,
      },
      {
        onSuccess: (booking) => {
          setCreatedBooking(booking);
          setStep('success');
        },
      }
    );
  };

  // Loading/Error states
  if (loadingHost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hostError || !host) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Usuario no encontrado</h2>
            <p className="text-muted-foreground">
              No pudimos encontrar un usuario con el nombre "{username}"
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success' && createdBooking) {
    return <BookingSuccess booking={createdBooking} hostName={host.display_name} />;
  }

  const LocationIcon = selectedEventType
    ? LOCATION_ICONS[selectedEventType.location_type]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con info del host */}
        <div className="text-center mb-8">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={host.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {host.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{host.display_name}</h1>
          <p className="text-muted-foreground">Agenda una cita conmigo</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {['event-type', 'date-time', 'details'].map((s, i) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                ['event-type', 'date-time', 'details'].indexOf(step) >= i
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Seleccionar tipo de evento */}
        {step === 'event-type' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-6">
              Selecciona el tipo de cita
            </h2>

            {loadingEventTypes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : eventTypes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Este usuario no tiene tipos de cita disponibles
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {eventTypes.map((eventType) => {
                  const Icon = LOCATION_ICONS[eventType.location_type];
                  return (
                    <Card
                      key={eventType.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectEventType(eventType)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div
                            className="w-1 rounded-full"
                            style={{ backgroundColor: eventType.color }}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{eventType.title}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {eventType.duration_minutes} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Icon className="h-4 w-4" />
                                {LOCATION_TYPE_LABELS[eventType.location_type]}
                              </span>
                            </div>
                            {eventType.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {eventType.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Seleccionar fecha y hora */}
        {step === 'date-time' && selectedEventType && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Info del evento seleccionado */}
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-1 h-full rounded-full min-h-[60px]"
                      style={{ backgroundColor: selectedEventType.color }}
                    />
                    <div>
                      <CardTitle>{selectedEventType.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {selectedEventType.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          {LocationIcon && <LocationIcon className="h-4 w-4" />}
                          {LOCATION_TYPE_LABELS[selectedEventType.location_type]}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendario */}
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelectDate}
                    disabled={(date) => {
                      // Deshabilitar fechas pasadas
                      if (date < new Date()) return true;
                      // Deshabilitar fechas sin disponibilidad
                      return !availableDates.some(
                        (d) => d.toDateString() === date.toDateString()
                      );
                    }}
                    locale={es}
                    className="rounded-md border mx-auto"
                  />
                </CardContent>
              </Card>

              {/* Slots de tiempo */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate
                      ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                      : 'Selecciona una fecha'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    <TimeSlotSelector
                      slots={slots}
                      selectedSlot={selectedSlot}
                      onSelect={handleSelectSlot}
                      isLoading={loadingSlots}
                      timezone={timezone}
                    />
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Selecciona una fecha en el calendario
                    </p>
                  )}

                  {selectedSlot && (
                    <Button className="w-full mt-6" onClick={handleContinueToDetails}>
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Detalles del invitado */}
        {step === 'details' && selectedEventType && selectedSlot && (
          <div className="max-w-lg mx-auto">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Completa tus datos</CardTitle>
                <CardDescription>
                  {selectedEventType.title} -{' '}
                  {format(selectedSlot.start, "EEEE d 'de' MMMM 'a las' HH:mm", {
                    locale: es,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="guest_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="guest_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="tu@email.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="guest_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+57 300 123 4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="guest_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas adicionales (opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="¿Hay algo que debería saber antes de la cita?"
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createBooking.isPending}
                    >
                      {createBooking.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Confirmar reserva
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
