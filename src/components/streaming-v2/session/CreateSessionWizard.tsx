/**
 * CreateSessionWizard - Wizard para crear nueva sesión de streaming
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon,
  Radio,
  ShoppingBag,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { PlatformIcon } from '../shared/PlatformIcon';
import type {
  StreamingSessionType,
  StreamingChannel,
  CreateSessionInput,
} from '@/types/streaming.types';

const sessionSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(100),
  description: z.string().max(500).optional(),
  session_type: z.enum(['standard', 'shopping', 'interview', 'webinar', 'podcast']),
  is_shopping_enabled: z.boolean().default(false),
  scheduled_at: z.date().optional(),
  channel_ids: z.array(z.string()).min(1, 'Selecciona al menos un canal'),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface CreateSessionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSessionInput) => Promise<void>;
  channels: StreamingChannel[];
  isLoading?: boolean;
}

const SESSION_TYPES: {
  value: StreamingSessionType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Transmisión en vivo general',
    icon: Radio,
  },
  {
    value: 'shopping',
    label: 'Live Shopping',
    description: 'Venta de productos en vivo',
    icon: ShoppingBag,
  },
  {
    value: 'interview',
    label: 'Entrevista',
    description: 'Conversación con invitados',
    icon: Users,
  },
  {
    value: 'webinar',
    label: 'Webinar',
    description: 'Presentación educativa',
    icon: Video,
  },
];

export function CreateSessionWizard({
  open,
  onOpenChange,
  onSubmit,
  channels,
  isLoading,
}: CreateSessionWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: '',
      description: '',
      session_type: 'standard',
      is_shopping_enabled: false,
      channel_ids: [],
    },
  });

  const handleSubmit = async (data: SessionFormData) => {
    await onSubmit({
      ...data,
      scheduled_at: data.scheduled_at?.toISOString(),
      stream_settings: {
        resolution: '1080p',
        fps: 30,
        bitrate: 6000,
        encoder: 'browser',
        audio_bitrate: 128,
        latency_mode: 'normal',
      },
    });
    form.reset();
    setStep(1);
    onOpenChange(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!form.watch('title');
      case 2:
        return form.watch('channel_ids').length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const selectedType = form.watch('session_type');
  const selectedChannels = form.watch('channel_ids');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Sesión de Streaming</DialogTitle>
          <DialogDescription>
            Paso {step} de {totalSteps}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título de la sesión *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Live Shopping - Colección Primavera"
                  {...form.register('title')}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe de qué tratará tu live..."
                  rows={3}
                  {...form.register('description')}
                />
              </div>

              <div className="space-y-3">
                <Label>Tipo de sesión</Label>
                <RadioGroup
                  value={selectedType}
                  onValueChange={(value) =>
                    form.setValue('session_type', value as StreamingSessionType)
                  }
                  className="grid grid-cols-2 gap-3"
                >
                  {SESSION_TYPES.map((type) => (
                    <Label
                      key={type.value}
                      htmlFor={type.value}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all',
                        selectedType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      <RadioGroupItem
                        value={type.value}
                        id={type.value}
                        className="sr-only"
                      />
                      <type.icon className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">{type.label}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {type.description}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Auto-enable shopping for shopping type */}
              {selectedType === 'shopping' && (
                <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                  <ShoppingBag className="inline-block mr-2 h-4 w-4" />
                  Live Shopping habilitado automáticamente
                </div>
              )}
            </div>
          )}

          {/* Step 2: Channels */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Selecciona los canales para transmitir *</Label>
                <p className="text-sm text-muted-foreground">
                  Tu live se transmitirá simultáneamente a todos los canales seleccionados
                </p>
              </div>

              {channels.length === 0 ? (
                <div className="text-center py-8">
                  <Radio className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No tienes canales configurados
                  </p>
                  <Button variant="outline" className="mt-3">
                    Configurar Canales
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <Label
                      key={channel.id}
                      htmlFor={`channel-${channel.id}`}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                        selectedChannels.includes(channel.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      <Checkbox
                        id={`channel-${channel.id}`}
                        checked={selectedChannels.includes(channel.id)}
                        onCheckedChange={(checked) => {
                          const current = form.getValues('channel_ids');
                          if (checked) {
                            form.setValue('channel_ids', [...current, channel.id]);
                          } else {
                            form.setValue(
                              'channel_ids',
                              current.filter((id) => id !== channel.id)
                            );
                          }
                        }}
                      />
                      <PlatformIcon platform={channel.platform} size="md" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {channel.platform_display_name || channel.platform}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {channel.max_resolution} • {channel.max_bitrate} kbps
                        </p>
                      </div>
                    </Label>
                  ))}
                </div>
              )}

              {form.formState.errors.channel_ids && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.channel_ids.message}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>¿Cuándo quieres transmitir?</Label>
              </div>

              <RadioGroup
                defaultValue="now"
                onValueChange={(value) => {
                  if (value === 'now') {
                    form.setValue('scheduled_at', undefined);
                  }
                }}
                className="space-y-3"
              >
                <Label
                  htmlFor="now"
                  className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer"
                >
                  <RadioGroupItem value="now" id="now" />
                  <div>
                    <p className="font-medium">Ahora</p>
                    <p className="text-sm text-muted-foreground">
                      Iniciar el live inmediatamente
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="scheduled"
                  className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer"
                >
                  <RadioGroupItem value="scheduled" id="scheduled" />
                  <div className="flex-1">
                    <p className="font-medium">Programar</p>
                    <p className="text-sm text-muted-foreground">
                      Seleccionar fecha y hora
                    </p>
                  </div>
                </Label>
              </RadioGroup>

              {/* Date picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !form.watch('scheduled_at') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('scheduled_at') ? (
                      format(form.watch('scheduled_at')!, 'PPP HH:mm', { locale: es })
                    ) : (
                      'Seleccionar fecha y hora'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('scheduled_at')}
                    onSelect={(date) => form.setValue('scheduled_at', date)}
                    disabled={(date) => date < new Date()}
                    locale={es}
                  />
                  {/* Time input */}
                  <div className="border-t p-3">
                    <Label htmlFor="time">Hora</Label>
                    <Input
                      id="time"
                      type="time"
                      className="mt-1"
                      onChange={(e) => {
                        const current = form.watch('scheduled_at') || new Date();
                        const [hours, minutes] = e.target.value.split(':');
                        current.setHours(parseInt(hours), parseInt(minutes));
                        form.setValue('scheduled_at', new Date(current));
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium">Resumen</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Título:</span>{' '}
                    {form.watch('title')}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Tipo:</span>{' '}
                    {SESSION_TYPES.find((t) => t.value === selectedType)?.label}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Canales:</span>{' '}
                    {selectedChannels.length} seleccionados
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={isLoading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
            )}

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || !canProceed()}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="mr-2 h-4 w-4" />
                )}
                {form.watch('scheduled_at') ? 'Programar Live' : 'Crear y Empezar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateSessionWizard;
