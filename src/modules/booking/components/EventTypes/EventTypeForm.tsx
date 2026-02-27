// Formulario para crear/editar tipos de evento

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import type { BookingEventType, EventTypeInput, BookingLocationType } from '../../types';
import { LOCATION_TYPE_LABELS, DEFAULT_COLORS } from '../../types';

const eventTypeSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(100, 'Máximo 100 caracteres'),
  slug: z.string().optional(),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  duration_minutes: z.coerce.number().min(5, 'Mínimo 5 minutos').max(480, 'Máximo 8 horas'),
  buffer_before_minutes: z.coerce.number().min(0).max(120).optional(),
  buffer_after_minutes: z.coerce.number().min(0).max(120).optional(),
  min_notice_hours: z.coerce.number().min(0).max(720).optional(),
  max_days_in_advance: z.coerce.number().min(1).max(365).optional(),
  max_bookings_per_day: z.coerce.number().min(1).max(50).nullable().optional(),
  location_type: z.enum(['google_meet', 'zoom', 'phone', 'in_person', 'custom']),
  location_details: z.string().max(500).optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof eventTypeSchema>;

interface EventTypeFormProps {
  eventType?: BookingEventType;
  onSubmit: (data: EventTypeInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function EventTypeForm({
  eventType,
  onSubmit,
  onCancel,
  isLoading,
}: EventTypeFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: {
      title: eventType?.title || '',
      slug: eventType?.slug || '',
      description: eventType?.description || '',
      duration_minutes: eventType?.duration_minutes || 30,
      buffer_before_minutes: eventType?.buffer_before_minutes || 0,
      buffer_after_minutes: eventType?.buffer_after_minutes || 0,
      min_notice_hours: eventType?.min_notice_hours || 24,
      max_days_in_advance: eventType?.max_days_in_advance || 60,
      max_bookings_per_day: eventType?.max_bookings_per_day || null,
      location_type: eventType?.location_type || 'google_meet',
      location_details: eventType?.location_details || '',
      color: eventType?.color || DEFAULT_COLORS[0],
      is_active: eventType?.is_active ?? true,
    },
  });

  const locationType = form.watch('location_type');

  const handleSubmit = (data: FormData) => {
    onSubmit({
      title: data.title,
      slug: data.slug || undefined,
      description: data.description || undefined,
      duration_minutes: data.duration_minutes,
      buffer_before_minutes: data.buffer_before_minutes,
      buffer_after_minutes: data.buffer_after_minutes,
      min_notice_hours: data.min_notice_hours,
      max_days_in_advance: data.max_days_in_advance,
      max_bookings_per_day: data.max_bookings_per_day,
      location_type: data.location_type as BookingLocationType,
      location_details: data.location_details,
      color: data.color,
      is_active: data.is_active,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Información básica */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Llamada de descubrimiento" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe brevemente de qué trata esta cita..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Duración y buffers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (min) *</FormLabel>
                <FormControl>
                  <Input type="number" min={5} max={480} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="buffer_before_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buffer antes (min)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={120} {...field} />
                </FormControl>
                <FormDescription>Tiempo libre antes de la cita</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="buffer_after_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buffer después (min)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={120} {...field} />
                </FormControl>
                <FormDescription>Tiempo libre después de la cita</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Límites */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="min_notice_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aviso mínimo (horas)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={720} {...field} />
                </FormControl>
                <FormDescription>Horas de anticipación mínima</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_days_in_advance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días máximo</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={365} {...field} />
                </FormControl>
                <FormDescription>Hasta cuántos días adelante</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_bookings_per_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Límite diario</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="Sin límite"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </FormControl>
                <FormDescription>Máximo de citas por día</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ubicación */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="location_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de ubicación *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(LOCATION_TYPE_LABELS) as BookingLocationType[]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {LOCATION_TYPE_LABELS[type]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(locationType === 'in_person' || locationType === 'custom') && (
            <FormField
              control={form.control}
              name="location_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {locationType === 'in_person' ? 'Dirección' : 'Detalles de ubicación'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        locationType === 'in_person'
                          ? 'Ej: Calle 123 #45-67, Bogotá'
                          : 'Ej: URL personalizada o instrucciones'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Color */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      field.value === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => field.onChange(color)}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {eventType ? 'Guardar cambios' : 'Crear tipo de evento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
