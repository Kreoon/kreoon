// Editor visual de horarios semanales

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Trash2, Copy } from 'lucide-react';
import { DAY_LABELS, DAY_LABELS_SHORT } from '../../types';
import type { WeeklySchedule as WeeklyScheduleType } from '../../types';

interface WeeklyScheduleProps {
  schedule: WeeklyScheduleType;
  onUpdateDay: (
    dayOfWeek: number,
    slots: Array<{ start_time: string; end_time: string }>
  ) => void;
  onCopyDay?: (sourceDay: number, targetDays: number[]) => void;
  isLoading?: boolean;
}

export function WeeklySchedule({
  schedule,
  onUpdateDay,
  onCopyDay,
  isLoading,
}: WeeklyScheduleProps) {
  const [copyingFrom, setCopyingFrom] = useState<number | null>(null);

  const handleToggleDay = (dayOfWeek: number) => {
    const currentSlots = schedule[dayOfWeek]?.slots || [];
    if (currentSlots.length > 0) {
      // Deshabilitar: eliminar todos los slots
      onUpdateDay(dayOfWeek, []);
    } else {
      // Habilitar: agregar slot por defecto
      onUpdateDay(dayOfWeek, [{ start_time: '09:00', end_time: '17:00' }]);
    }
  };

  const handleAddSlot = (dayOfWeek: number) => {
    const currentSlots = schedule[dayOfWeek]?.slots || [];
    const lastSlot = currentSlots[currentSlots.length - 1];
    const newStart = lastSlot ? lastSlot.end_time : '09:00';
    const newEnd =
      newStart >= '17:00' ? '18:00' : `${parseInt(newStart.split(':')[0]) + 1}:00`;

    onUpdateDay(dayOfWeek, [...currentSlots, { start_time: newStart, end_time: newEnd }]);
  };

  const handleRemoveSlot = (dayOfWeek: number, index: number) => {
    const currentSlots = schedule[dayOfWeek]?.slots || [];
    const newSlots = currentSlots.filter((_, i) => i !== index);
    onUpdateDay(dayOfWeek, newSlots);
  };

  const handleUpdateSlot = (
    dayOfWeek: number,
    index: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const currentSlots = schedule[dayOfWeek]?.slots || [];
    const newSlots = currentSlots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    onUpdateDay(dayOfWeek, newSlots);
  };

  const handleCopyDayStart = (dayOfWeek: number) => {
    setCopyingFrom(dayOfWeek);
  };

  const handleCopyDayTo = (targetDay: number) => {
    if (copyingFrom === null || !onCopyDay) return;
    onCopyDay(copyingFrom, [targetDay]);
    setCopyingFrom(null);
  };

  const handleCopyToWeekdays = () => {
    if (copyingFrom === null || !onCopyDay) return;
    // Copiar a lunes-viernes (1-5)
    const weekdays = [1, 2, 3, 4, 5].filter((d) => d !== copyingFrom);
    onCopyDay(copyingFrom, weekdays);
    setCopyingFrom(null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
          const daySchedule = schedule[dayOfWeek] || { slots: [], enabled: false };
          const isEnabled = daySchedule.slots.length > 0;

          return (
            <div
              key={dayOfWeek}
              className={`p-4 rounded-lg border transition-colors ${
                isEnabled ? 'bg-background' : 'bg-muted/50'
              } ${copyingFrom !== null && copyingFrom !== dayOfWeek ? 'cursor-pointer hover:border-primary' : ''}`}
              onClick={() => {
                if (copyingFrom !== null && copyingFrom !== dayOfWeek) {
                  handleCopyDayTo(dayOfWeek);
                }
              }}
            >
              <div className="flex items-start gap-4">
                {/* Day toggle */}
                <div className="flex items-center gap-3 min-w-[120px]">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleDay(dayOfWeek)}
                    disabled={isLoading}
                  />
                  <Label
                    className={`font-medium ${!isEnabled ? 'text-muted-foreground' : ''}`}
                  >
                    {DAY_LABELS[dayOfWeek]}
                  </Label>
                </div>

                {/* Time slots */}
                <div className="flex-1 space-y-2">
                  {isEnabled ? (
                    <>
                      {daySchedule.slots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              handleUpdateSlot(dayOfWeek, index, 'start_time', e.target.value)
                            }
                            className="w-28"
                            disabled={isLoading}
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) =>
                              handleUpdateSlot(dayOfWeek, index, 'end_time', e.target.value)
                            }
                            className="w-28"
                            disabled={isLoading}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSlot(dayOfWeek, index)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSlot(dayOfWeek)}
                        disabled={isLoading}
                        className="text-muted-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar horario
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">No disponible</span>
                  )}
                </div>

                {/* Copy button */}
                {isEnabled && onCopyDay && (
                  <div className="flex gap-1">
                    {copyingFrom === dayOfWeek ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Selecciona día destino
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToWeekdays();
                          }}
                        >
                          Lun-Vie
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopyingFrom(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyDayStart(dayOfWeek);
                            }}
                            disabled={isLoading}
                          >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar a otros días</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {copyingFrom !== null && (
          <p className="text-sm text-muted-foreground text-center">
            Haz clic en un día para copiar el horario de {DAY_LABELS[copyingFrom]}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
