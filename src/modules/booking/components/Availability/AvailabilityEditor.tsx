// Editor de disponibilidad completo con excepciones

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Plus, Trash2, CalendarOff, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAvailability, useBookingExceptions } from '../../hooks';
import { WeeklySchedule } from './WeeklySchedule';
import type { BookingException } from '../../types';

export function AvailabilityEditor() {
  const {
    weeklySchedule,
    isLoading: loadingAvailability,
    updateDaySchedule,
    copyDayToOthers,
  } = useAvailability();

  const {
    exceptions,
    isLoading: loadingExceptions,
    addException,
    removeException,
  } = useBookingExceptions();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [exceptionType, setExceptionType] = useState<'block' | 'special'>('block');
  const [exceptionReason, setExceptionReason] = useState('');
  const [specialStartTime, setSpecialStartTime] = useState('09:00');
  const [specialEndTime, setSpecialEndTime] = useState('17:00');

  const isLoading =
    loadingAvailability ||
    loadingExceptions ||
    updateDaySchedule.isPending ||
    copyDayToOthers.isPending;

  const handleUpdateDay = (
    dayOfWeek: number,
    slots: Array<{ start_time: string; end_time: string }>
  ) => {
    updateDaySchedule.mutate({ day_of_week: dayOfWeek, slots });
  };

  const handleCopyDay = (sourceDay: number, targetDays: number[]) => {
    copyDayToOthers.mutate({ sourceDay, targetDays });
  };

  const handleAddException = () => {
    if (!selectedDate) return;

    addException.mutate(
      {
        exception_date: format(selectedDate, 'yyyy-MM-dd'),
        is_blocked: exceptionType === 'block',
        start_time: exceptionType === 'special' ? specialStartTime : undefined,
        end_time: exceptionType === 'special' ? specialEndTime : undefined,
        reason: exceptionReason || undefined,
      },
      {
        onSuccess: () => {
          setIsExceptionDialogOpen(false);
          setSelectedDate(undefined);
          setExceptionReason('');
          setExceptionType('block');
        },
      }
    );
  };

  const openExceptionDialog = (date: Date) => {
    setSelectedDate(date);
    setIsExceptionDialogOpen(true);
  };

  // Agrupar excepciones por tipo
  const blockedDates = exceptions.filter((e) => e.is_blocked);
  const specialDates = exceptions.filter((e) => !e.is_blocked);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Horario semanal</TabsTrigger>
          <TabsTrigger value="exceptions">
            Excepciones
            {exceptions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {exceptions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad semanal</CardTitle>
              <CardDescription>
                Define los horarios en los que estás disponible para recibir citas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklySchedule
                schedule={weeklySchedule}
                onUpdateDay={handleUpdateDay}
                onCopyDay={handleCopyDay}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agregar excepción</CardTitle>
              <CardDescription>
                Bloquea días específicos o define horarios especiales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && openExceptionDialog(date)}
                  disabled={(date) => date < new Date()}
                  locale={es}
                  modifiers={{
                    blocked: blockedDates.map((e) => new Date(e.exception_date)),
                    special: specialDates.map((e) => new Date(e.exception_date)),
                  }}
                  modifiersStyles={{
                    blocked: { backgroundColor: 'hsl(var(--destructive) / 0.2)' },
                    special: { backgroundColor: 'hsl(var(--primary) / 0.2)' },
                  }}
                />
              </div>
              <div className="flex justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-destructive/20" />
                  <span className="text-muted-foreground">Día bloqueado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/20" />
                  <span className="text-muted-foreground">Horario especial</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de excepciones */}
          {exceptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Excepciones configuradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exceptions.map((exception) => (
                    <ExceptionItem
                      key={exception.id}
                      exception={exception}
                      onRemove={() => removeException.mutate(exception.id)}
                      isLoading={removeException.isPending}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para agregar excepción */}
      <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurar {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de excepción */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={exceptionType === 'block' ? 'default' : 'outline'}
                onClick={() => setExceptionType('block')}
                className="h-auto py-4 flex-col"
              >
                <CalendarOff className="h-6 w-6 mb-2" />
                <span>Bloquear día</span>
              </Button>
              <Button
                variant={exceptionType === 'special' ? 'default' : 'outline'}
                onClick={() => setExceptionType('special')}
                className="h-auto py-4 flex-col"
              >
                <Clock className="h-6 w-6 mb-2" />
                <span>Horario especial</span>
              </Button>
            </div>

            {/* Horario especial */}
            {exceptionType === 'special' && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label>Desde</Label>
                  <Input
                    type="time"
                    value={specialStartTime}
                    onChange={(e) => setSpecialStartTime(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Hasta</Label>
                  <Input
                    type="time"
                    value={specialEndTime}
                    onChange={(e) => setSpecialEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Razón */}
            <div>
              <Label>Razón (opcional)</Label>
              <Input
                placeholder="Ej: Vacaciones, día festivo..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExceptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddException} disabled={addException.isPending}>
              {addException.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExceptionItem({
  exception,
  onRemove,
  isLoading,
}: {
  exception: BookingException;
  onRemove: () => void;
  isLoading: boolean;
}) {
  const date = new Date(exception.exception_date);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            exception.is_blocked ? 'bg-destructive/10' : 'bg-primary/10'
          }`}
        >
          {exception.is_blocked ? (
            <CalendarOff className="h-4 w-4 text-destructive" />
          ) : (
            <Clock className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <p className="font-medium">
            {format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
          <p className="text-sm text-muted-foreground">
            {exception.is_blocked
              ? 'Día bloqueado'
              : `${exception.start_time} - ${exception.end_time}`}
            {exception.reason && ` - ${exception.reason}`}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} disabled={isLoading}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
