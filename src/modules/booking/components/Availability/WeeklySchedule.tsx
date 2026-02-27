// Weekly Schedule Editor - Calendly-inspired design

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Trash2, Copy, X, Check, ChevronRight } from 'lucide-react';
import { DAY_LABELS } from '../../types';
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

// Design tokens
const styles = {
  dayRow: (isEnabled: boolean, isCopyTarget: boolean) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px 20px',
    borderRadius: '12px',
    background: isEnabled ? '#FFFFFF' : '#F8FAFC',
    border: isCopyTarget ? '2px dashed #8B5CF6' : '1px solid #E5E7EB',
    transition: 'all 0.2s ease',
    cursor: isCopyTarget ? 'pointer' : 'default',
  }),
  timeInput: {
    background: '#F8FAFC',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100px',
    transition: 'all 0.2s ease',
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: 'transparent',
    border: '1px dashed #CBD5E1',
    color: '#64748B',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

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
      onUpdateDay(dayOfWeek, []);
    } else {
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
    const weekdays = [1, 2, 3, 4, 5].filter((d) => d !== copyingFrom);
    onCopyDay(copyingFrom, weekdays);
    setCopyingFrom(null);
  };

  // Orden: Lun, Mar, Mie, Jue, Vie, Sab, Dom
  const daysOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <AnimatePresence>
          {daysOrder.map((dayOfWeek, index) => {
            const daySchedule = schedule[dayOfWeek] || { slots: [], enabled: false };
            const isEnabled = daySchedule.slots.length > 0;
            const isCopyTarget = copyingFrom !== null && copyingFrom !== dayOfWeek;

            return (
              <motion.div
                key={dayOfWeek}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                style={styles.dayRow(isEnabled, isCopyTarget)}
                className={`group ${isCopyTarget ? 'hover:bg-violet-50 hover:border-violet-400' : ''}`}
                onClick={() => {
                  if (isCopyTarget) {
                    handleCopyDayTo(dayOfWeek);
                  }
                }}
              >
                {/* Day toggle */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleDay(dayOfWeek)}
                    disabled={isLoading || copyingFrom !== null}
                    className="data-[state=checked]:bg-violet-500"
                  />
                  <span
                    className={`font-medium text-sm ${
                      isEnabled ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {DAY_LABELS[dayOfWeek]}
                  </span>
                </div>

                {/* Time slots */}
                <div className="flex-1">
                  {isEnabled ? (
                    <div className="space-y-2">
                      {daySchedule.slots.map((slot, slotIndex) => (
                        <motion.div
                          key={slotIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              handleUpdateSlot(dayOfWeek, slotIndex, 'start_time', e.target.value)
                            }
                            style={styles.timeInput}
                            className="focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
                            disabled={isLoading || copyingFrom !== null}
                          />
                          <span className="text-slate-300 font-medium">—</span>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) =>
                              handleUpdateSlot(dayOfWeek, slotIndex, 'end_time', e.target.value)
                            }
                            style={styles.timeInput}
                            className="focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
                            disabled={isLoading || copyingFrom !== null}
                          />
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRemoveSlot(dayOfWeek, slotIndex)}
                            disabled={isLoading || copyingFrom !== null}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      ))}
                      <motion.button
                        whileHover={{
                          borderColor: '#8B5CF6',
                          color: '#8B5CF6',
                          background: '#F5F3FF',
                        }}
                        style={styles.addButton}
                        onClick={() => handleAddSlot(dayOfWeek)}
                        disabled={isLoading || copyingFrom !== null}
                      >
                        <Plus className="w-4 h-4" />
                        Agregar horario
                      </motion.button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <span className="text-sm text-slate-400 italic">No disponible</span>
                    </div>
                  )}
                </div>

                {/* Copy button */}
                {isEnabled && onCopyDay && (
                  <div className="flex-shrink-0">
                    {copyingFrom === dayOfWeek ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-violet-600 font-medium">
                          Selecciona destino
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToWeekdays();
                          }}
                          className="h-7 text-xs rounded-lg border-violet-200 text-violet-600 hover:bg-violet-50"
                        >
                          Lun-Vie
                        </Button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopyingFrom(null);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </motion.div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyDayStart(dayOfWeek);
                            }}
                            disabled={isLoading}
                            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar a otros días</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}

                {/* Copy target indicator */}
                {isCopyTarget && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-shrink-0"
                  >
                    <div className="p-2 rounded-lg bg-violet-100">
                      <ChevronRight className="w-4 h-4 text-violet-500" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Copy mode indicator */}
        <AnimatePresence>
          {copyingFrom !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-violet-50 border border-violet-200"
            >
              <span className="text-sm text-violet-700">
                Haz clic en un día para copiar el horario de{' '}
                <strong>{DAY_LABELS[copyingFrom]}</strong>
              </span>
              <button
                onClick={() => setCopyingFrom(null)}
                className="ml-2 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100 rounded"
              >
                Cancelar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
