// Event Type Form - Calendly-inspired design

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Loader2,
  Clock,
  MapPin,
  Video,
  Phone,
  Link as LinkIcon,
  Palette,
  Calendar,
  Timer,
  Shield,
  CheckCircle2,
} from 'lucide-react';
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

// Design tokens
const styles = {
  section: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    padding: '20px',
    marginBottom: '16px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px',
  },
  input: {
    background: '#FAFBFC',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '15px',
    transition: 'all 0.2s ease',
  },
  colorButton: (isSelected: boolean) => ({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: isSelected ? '3px solid #8B5CF6' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
    boxShadow: isSelected ? '0 0 0 3px rgba(139, 92, 246, 0.2)' : 'none',
  }),
  submitButton: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    padding: '12px 28px',
    borderRadius: '10px',
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
  },
};

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

// Duration presets
const DURATION_PRESETS = [15, 30, 45, 60, 90];

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
  const selectedDuration = form.watch('duration_minutes');
  const selectedColor = form.watch('color');

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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Información básica */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.section}
        >
          <div style={styles.sectionTitle}>
            <Calendar className="w-4 h-4 text-violet-500" />
            Información básica
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    Nombre del evento *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Llamada de descubrimiento"
                      className="bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-lg"
                      {...field}
                    />
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
                  <FormLabel className="text-slate-700 font-medium">
                    Descripción
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente de qué trata esta cita..."
                      className="bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 resize-none rounded-lg"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </motion.div>

        {/* Duración */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={styles.section}
        >
          <div style={styles.sectionTitle}>
            <Clock className="w-4 h-4 text-violet-500" />
            Duración
          </div>

          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((duration) => (
                    <motion.button
                      key={duration}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => field.onChange(duration)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDuration === duration
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {duration} min
                    </motion.button>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      placeholder="Otro"
                      className="w-24 h-10 bg-slate-50 border-slate-200 rounded-lg text-center"
                      value={!DURATION_PRESETS.includes(selectedDuration) ? selectedDuration : ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                    />
                    <span className="text-sm text-slate-500">min</span>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        {/* Ubicación */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={styles.section}
        >
          <div style={styles.sectionTitle}>
            <MapPin className="w-4 h-4 text-violet-500" />
            Ubicación
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="location_type"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(LOCATION_TYPE_LABELS) as BookingLocationType[]).map((type) => {
                      const Icon = LOCATION_ICONS[type];
                      const isSelected = field.value === type;

                      return (
                        <motion.button
                          key={type}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => field.onChange(type)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-violet-50 text-violet-600 border-2 border-violet-500'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {LOCATION_TYPE_LABELS[type]}
                          {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                        </motion.button>
                      );
                    })}
                  </div>
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
                    <FormLabel className="text-slate-700 font-medium">
                      {locationType === 'in_person' ? 'Dirección' : 'Detalles'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          locationType === 'in_person'
                            ? 'Ej: Calle 123 #45-67, Bogotá'
                            : 'Ej: URL o instrucciones personalizadas'
                        }
                        className="bg-slate-50 border-slate-200 h-11 rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </motion.div>

        {/* Buffers y límites */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={styles.section}
        >
          <div style={styles.sectionTitle}>
            <Timer className="w-4 h-4 text-violet-500" />
            Buffers de tiempo
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="buffer_before_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">
                    Antes de la cita
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        className="bg-slate-50 border-slate-200 h-10 rounded-lg pr-12"
                        {...field}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        min
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Tiempo libre antes de cada cita
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buffer_after_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">
                    Después de la cita
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        className="bg-slate-50 border-slate-200 h-10 rounded-lg pr-12"
                        {...field}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        min
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Tiempo libre después de cada cita
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </motion.div>

        {/* Límites de reserva */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={styles.section}
        >
          <div style={styles.sectionTitle}>
            <Shield className="w-4 h-4 text-violet-500" />
            Límites de reserva
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="min_notice_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">
                    Aviso mínimo
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={720}
                        className="bg-slate-50 border-slate-200 h-10 rounded-lg pr-10"
                        {...field}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        hrs
                      </span>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_days_in_advance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">
                    Máx. anticipación
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="bg-slate-50 border-slate-200 h-10 rounded-lg pr-12"
                        {...field}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        días
                      </span>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_bookings_per_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">
                    Límite diario
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      placeholder="∞"
                      className="bg-slate-50 border-slate-200 h-10 rounded-lg text-center"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value) : null)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </motion.div>

        {/* Color */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={styles.section}
        >
          <div style={styles.sectionTitle}>
            <Palette className="w-4 h-4 text-violet-500" />
            Color del evento
          </div>

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-3 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <motion.button
                      key={color}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        ...styles.colorButton(selectedColor === color),
                        backgroundColor: color,
                      }}
                      onClick={() => field.onChange(color)}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-end gap-3 pt-4"
        >
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-6 h-11 rounded-lg"
            >
              Cancelar
            </Button>
          )}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={styles.submitButton}
            className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {eventType ? 'Guardar cambios' : 'Crear evento'}
          </motion.button>
        </motion.div>
      </form>
    </Form>
  );
}
