// Availability Editor - Calendly-inspired design

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Loader2,
  CalendarOff,
  Clock,
  CalendarDays,
  AlertCircle,
  Trash2,
  X,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAvailability, useBookingExceptions } from '../../hooks';
import { WeeklySchedule } from './WeeklySchedule';
import type { BookingException } from '../../types';

// Calendly-style design tokens
const styles = {
  tabButton: (isActive: boolean) => ({
    padding: '14px 24px',
    borderRadius: '12px',
    fontWeight: 500,
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    background: isActive ? '#8B5CF6' : '#FFFFFF',
    color: isActive ? '#FFFFFF' : '#64748B',
    boxShadow: isActive
      ? '0 4px 12px rgba(139, 92, 246, 0.25)'
      : '0 1px 3px rgba(0, 0, 0, 0.05)',
  }),
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  exceptionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    transition: 'all 0.2s ease',
  },
  typeButton: (isActive: boolean) => ({
    flex: 1,
    padding: '20px',
    borderRadius: '12px',
    border: isActive ? '2px solid #8B5CF6' : '1px solid #E5E7EB',
    background: isActive ? '#F5F3FF' : '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  }),
};

type TabValue = 'weekly' | 'exceptions';

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

  const [activeTab, setActiveTab] = useState<TabValue>('weekly');
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
      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
      >
        <button
          onClick={() => setActiveTab('weekly')}
          style={styles.tabButton(activeTab === 'weekly')}
        >
          <Clock className="w-5 h-5" />
          Horario semanal
          {activeTab === 'weekly' && <ChevronRight className="w-4 h-4 ml-1" />}
        </button>

        <button
          onClick={() => setActiveTab('exceptions')}
          style={styles.tabButton(activeTab === 'exceptions')}
        >
          <CalendarDays className="w-5 h-5" />
          Excepciones
          {exceptions.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'exceptions'
                  ? 'bg-white/20 text-white'
                  : 'bg-violet-100 text-violet-600'
              }`}
            >
              {exceptions.length}
            </span>
          )}
        </button>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'weekly' && (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={styles.card}
          >
            <div className="p-6 border-b bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">
                Disponibilidad semanal
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Define los horarios en los que estás disponible para recibir citas
              </p>
            </div>
            <div className="p-6">
              <WeeklySchedule
                schedule={weeklySchedule}
                onUpdateDay={handleUpdateDay}
                onCopyDay={handleCopyDay}
                isLoading={isLoading}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'exceptions' && (
          <motion.div
            key="exceptions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Calendar for adding exceptions */}
            <div style={styles.card}>
              <div className="p-6 border-b bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">
                  Agregar excepción
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Selecciona una fecha para bloquearla o definir un horario especial
                </p>
              </div>
              <div className="p-6">
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
                      blocked: {
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        fontWeight: 600,
                      },
                      special: {
                        backgroundColor: '#DBEAFE',
                        color: '#2563EB',
                        fontWeight: 600,
                      },
                    }}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex justify-center gap-6 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                    <span className="text-slate-600">Día bloqueado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200" />
                    <span className="text-slate-600">Horario especial</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exceptions list */}
            {exceptions.length > 0 && (
              <div style={styles.card}>
                <div className="p-6 border-b bg-slate-50">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Excepciones configuradas
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {exceptions.map((exception, index) => (
                        <motion.div
                          key={exception.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <ExceptionItem
                            exception={exception}
                            onRemove={() => removeException.mutate(exception.id)}
                            isLoading={removeException.isPending}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog para agregar excepción */}
      <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="p-6 border-b bg-slate-50">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {selectedDate &&
                  format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Type selection */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setExceptionType('block')}
                style={styles.typeButton(exceptionType === 'block')}
              >
                <div
                  className={`p-3 rounded-full ${
                    exceptionType === 'block' ? 'bg-red-100' : 'bg-slate-100'
                  }`}
                >
                  <CalendarOff
                    className={`w-6 h-6 ${
                      exceptionType === 'block' ? 'text-red-500' : 'text-slate-400'
                    }`}
                  />
                </div>
                <span
                  className={`font-medium ${
                    exceptionType === 'block' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Bloquear día
                </span>
                <span className="text-xs text-slate-400">No disponible</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setExceptionType('special')}
                style={styles.typeButton(exceptionType === 'special')}
              >
                <div
                  className={`p-3 rounded-full ${
                    exceptionType === 'special' ? 'bg-violet-100' : 'bg-slate-100'
                  }`}
                >
                  <Clock
                    className={`w-6 h-6 ${
                      exceptionType === 'special' ? 'text-violet-500' : 'text-slate-400'
                    }`}
                  />
                </div>
                <span
                  className={`font-medium ${
                    exceptionType === 'special' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Horario especial
                </span>
                <span className="text-xs text-slate-400">Personalizado</span>
              </motion.button>
            </div>

            {/* Special hours */}
            <AnimatePresence>
              {exceptionType === 'special' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm text-slate-600">Desde</Label>
                      <Input
                        type="time"
                        value={specialStartTime}
                        onChange={(e) => setSpecialStartTime(e.target.value)}
                        className="bg-slate-50 border-slate-200 h-11 rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm text-slate-600">Hasta</Label>
                      <Input
                        type="time"
                        value={specialEndTime}
                        onChange={(e) => setSpecialEndTime(e.target.value)}
                        className="bg-slate-50 border-slate-200 h-11 rounded-lg"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reason */}
            <div>
              <Label className="text-sm text-slate-600">Razón (opcional)</Label>
              <Input
                placeholder="Ej: Vacaciones, día festivo..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="bg-slate-50 border-slate-200 h-11 rounded-lg mt-1"
              />
            </div>
          </div>

          <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsExceptionDialogOpen(false)}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddException}
              disabled={addException.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
              }}
            >
              {addException.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </motion.button>
          </div>
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
    <motion.div
      whileHover={{ backgroundColor: '#F8FAFC' }}
      style={styles.exceptionItem}
      className="group"
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl ${
            exception.is_blocked ? 'bg-red-50' : 'bg-violet-50'
          }`}
        >
          {exception.is_blocked ? (
            <CalendarOff className="w-5 h-5 text-red-500" />
          ) : (
            <Clock className="w-5 h-5 text-violet-500" />
          )}
        </div>
        <div>
          <p className="font-medium text-slate-900">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <p className="text-sm text-slate-500">
            {exception.is_blocked ? (
              'Día bloqueado'
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {exception.start_time?.slice(0, 5)} - {exception.end_time?.slice(0, 5)}
              </span>
            )}
            {exception.reason && (
              <span className="text-slate-400"> · {exception.reason}</span>
            )}
          </p>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onRemove}
        disabled={isLoading}
        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
