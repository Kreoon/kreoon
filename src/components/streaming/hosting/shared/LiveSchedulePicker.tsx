import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

interface LiveSchedulePickerProps {
  date: Date | null;
  onDateChange: (date: Date | null) => void;
  timeStart: string;
  onTimeStartChange: (time: string) => void;
  timeEnd?: string;
  onTimeEndChange?: (time: string) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  estimatedDuration: number;
  onEstimatedDurationChange: (mins: number) => void;
}

const TIMEZONES = [
  { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
  { value: 'America/Mexico_City', label: 'México (GMT-6)' },
  { value: 'America/Lima', label: 'Perú (GMT-5)' },
  { value: 'America/Santiago', label: 'Chile (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
  { value: 'Europe/Madrid', label: 'España (GMT+1)' },
  { value: 'America/New_York', label: 'Estados Unidos Este (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Estados Unidos Oeste (GMT-8)' },
];

const DURATIONS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
];

export function LiveSchedulePicker({
  date,
  onDateChange,
  timeStart,
  onTimeStartChange,
  timeEnd,
  onTimeEndChange,
  timezone,
  onTimezoneChange,
  estimatedDuration,
  onEstimatedDurationChange,
}: LiveSchedulePickerProps) {
  const minDate = addDays(new Date(), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Date picker */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Fecha del Live
          </Label>
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={(d) => onDateChange(d || null)}
            disabled={(d) => d < minDate}
            locale={es}
            className="rounded-md border"
          />
        </div>

        {/* Time and settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora de Inicio
            </Label>
            <Input
              type="time"
              value={timeStart}
              onChange={(e) => onTimeStartChange(e.target.value)}
              className="w-full"
            />
          </div>

          {onTimeEndChange && (
            <div className="space-y-2">
              <Label>Hora de Fin (opcional)</Label>
              <Input
                type="time"
                value={timeEnd || ''}
                onChange={(e) => onTimeEndChange(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Duración Estimada</Label>
            <Select
              value={estimatedDuration.toString()}
              onValueChange={(v) => onEstimatedDurationChange(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Zona Horaria</Label>
            <Select value={timezone} onValueChange={onTimezoneChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {date && timeStart && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                El live está programado para:
              </p>
              <p className="font-medium">
                {format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </p>
              <p className="font-medium">
                {timeStart} ({TIMEZONES.find(t => t.value === timezone)?.label || timezone})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
