// Selector de slots de tiempo disponibles

import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import type { TimeSlot } from '../../types';

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  isLoading?: boolean;
  timezone?: string;
}

export function TimeSlotSelector({
  slots,
  selectedSlot,
  onSelect,
  isLoading,
  timezone = 'America/Bogota',
}: TimeSlotSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay horarios disponibles para esta fecha
      </div>
    );
  }

  // Agrupar por mañana/tarde/noche
  const morning = slots.filter((s) => s.start.getHours() < 12);
  const afternoon = slots.filter((s) => s.start.getHours() >= 12 && s.start.getHours() < 18);
  const evening = slots.filter((s) => s.start.getHours() >= 18);

  const renderSlots = (slotsGroup: TimeSlot[], label: string) => {
    if (slotsGroup.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slotsGroup.map((slot, index) => {
            const isSelected =
              selectedSlot &&
              slot.start.getTime() === selectedSlot.start.getTime();

            return (
              <Button
                key={index}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelect(slot)}
                className="w-full"
              >
                {format(slot.start, 'HH:mm')}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderSlots(morning, 'Mañana')}
      {renderSlots(afternoon, 'Tarde')}
      {renderSlots(evening, 'Noche')}

      <p className="text-xs text-muted-foreground text-center">
        Horarios en zona horaria: {timezone}
      </p>
    </div>
  );
}
