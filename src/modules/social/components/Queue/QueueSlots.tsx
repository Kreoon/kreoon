import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DAY_LABELS, MAX_QUEUE_SLOTS_PER_DAY } from '../../config/constants';
import type { QueueSlot } from '../../types/social.types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface QueueSlotsProps {
  slots: QueueSlot[];
  onSave: (slots: QueueSlot[]) => void;
  isSaving?: boolean;
}

export function QueueSlots({ slots: initialSlots, onSave, isSaving }: QueueSlotsProps) {
  const [slots, setSlots] = useState<QueueSlot[]>(initialSlots);

  const getSlot = (day: string) => slots.find(s => s.day === day) || { day, times: [] };

  const addTime = (day: string) => {
    setSlots(prev => {
      const existing = prev.find(s => s.day === day);
      if (existing) {
        if (existing.times.length >= MAX_QUEUE_SLOTS_PER_DAY) return prev;
        return prev.map(s =>
          s.day === day ? { ...s, times: [...s.times, '12:00'].sort() } : s
        );
      }
      return [...prev, { day: day as QueueSlot['day'], times: ['12:00'] }];
    });
  };

  const removeTime = (day: string, index: number) => {
    setSlots(prev =>
      prev.map(s =>
        s.day === day ? { ...s, times: s.times.filter((_, i) => i !== index) } : s
      ).filter(s => s.times.length > 0)
    );
  };

  const updateTime = (day: string, index: number, value: string) => {
    setSlots(prev =>
      prev.map(s =>
        s.day === day
          ? { ...s, times: s.times.map((t, i) => i === index ? value : t).sort() }
          : s
      )
    );
  };

  return (
    <div className="space-y-4">
      {DAYS.map(day => {
        const slot = getSlot(day);
        return (
          <div key={day} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">{DAY_LABELS[day]}</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => addTime(day)}
                disabled={slot.times.length >= MAX_QUEUE_SLOTS_PER_DAY}
              >
                <Plus className="w-3 h-3 mr-1" /> Agregar
              </Button>
            </div>
            {slot.times.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slot.times.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(day, idx, e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <button
                      onClick={() => removeTime(day, idx)}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500/10 text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Sin horarios</p>
            )}
          </div>
        );
      })}

      <Button
        onClick={() => onSave(slots.filter(s => s.times.length > 0))}
        disabled={isSaving}
        size="sm"
        className="w-full"
      >
        <Save className="w-4 h-4 mr-1" />
        Guardar Horarios
      </Button>
    </div>
  );
}
