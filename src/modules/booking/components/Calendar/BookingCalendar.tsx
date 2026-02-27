// Booking Calendar - Calendly-inspired design

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday as checkIsToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useBookings } from '../../hooks';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import type { Booking, CalendarBooking } from '../../types';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../types';

// Design tokens
const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: '0',
  },
  calendarSection: {
    padding: '24px',
    borderRight: '1px solid #E5E7EB',
  },
  sidePanel: {
    padding: '24px',
    background: '#FAFBFC',
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto' as const,
  },
  dayCell: (isCurrentMonth: boolean, isToday: boolean, isSelected: boolean, hasBookings: boolean) => ({
    minHeight: '90px',
    padding: '8px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: isSelected
      ? '#EFF6FF'
      : isCurrentMonth
      ? '#FFFFFF'
      : '#F8FAFC',
    border: isSelected
      ? '2px solid #0066FF'
      : isToday
      ? '2px solid #0066FF'
      : '1px solid #E5E7EB',
    opacity: isCurrentMonth ? 1 : 0.5,
  }),
  bookingPill: (color: string) => ({
    fontSize: '11px',
    padding: '3px 6px',
    borderRadius: '6px',
    background: color + '20',
    borderLeft: `3px solid ${color}`,
    marginTop: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  navButton: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function BookingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { bookings, isLoading } = useBookings({
    from: calendarStart,
    to: calendarEnd,
  });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();

    bookings.forEach((booking) => {
      const dateKey = format(new Date(booking.start_time), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [
        ...existing,
        {
          id: booking.id,
          title: `${booking.guest_name} - ${booking.event_type?.title || 'Cita'}`,
          start: new Date(booking.start_time),
          end: new Date(booking.end_time),
          status: booking.status,
          color: booking.event_type?.color || '#8B5CF6',
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          location_type: booking.location_type,
        },
      ]);
    });

    return map;
  }, [bookings]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return bookings
      .filter((b) => format(new Date(b.start_time), 'yyyy-MM-dd') === dateKey)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [selectedDate, bookings]);

  return (
    <div className="lg:grid" style={styles.container}>
      {/* Calendar Grid */}
      <div style={styles.calendarSection}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05, background: '#F8FAFC' }}
              whileTap={{ scale: 0.95 }}
              style={styles.navButton}
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, background: '#F8FAFC' }}
              whileTap={{ scale: 0.98 }}
              style={{
                ...styles.navButton,
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
              onClick={() => setCurrentMonth(new Date())}
            >
              Hoy
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, background: '#F8FAFC' }}
              whileTap={{ scale: 0.95 }}
              style={styles.navButton}
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </motion.button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayBookings = bookingsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = checkIsToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <motion.div
                key={dateKey}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={styles.dayCell(isCurrentMonth, isToday, !!isSelected, dayBookings.length > 0)}
                onClick={() => setSelectedDate(day)}
              >
                <div
                  className={`text-sm font-medium ${
                    isToday
                      ? 'text-blue-600'
                      : isSelected
                      ? 'text-blue-600'
                      : 'text-slate-700'
                  }`}
                >
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5 mt-1">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <motion.div
                      key={booking.id}
                      whileHover={{ opacity: 0.8 }}
                      style={styles.bookingPill(booking.color)}
                      className="truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fullBooking = bookings.find((b) => b.id === booking.id);
                        if (fullBooking) setSelectedBooking(fullBooking);
                      }}
                    >
                      <span className="font-semibold">{format(booking.start, 'HH:mm')}</span>
                      <span className="text-slate-600 ml-1">{booking.guest_name.split(' ')[0]}</span>
                    </motion.div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-slate-400 pl-1">
                      +{dayBookings.length - 2} más
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Side Panel */}
      <div style={styles.sidePanel}>
        <div className="flex items-center gap-2 mb-6">
          <CalendarIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-900">
            {selectedDate
              ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
              : 'Selecciona un día'}
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {!selectedDate ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 mb-4">
                <CalendarIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                Haz clic en un día para ver las reservas
              </p>
            </motion.div>
          ) : selectedDayBookings.length === 0 ? (
            <motion.div
              key="no-bookings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-slate-500 text-sm">
                No hay reservas para este día
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {selectedDayBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedBooking(booking)}
                  className="p-4 rounded-xl bg-white border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                  style={{
                    borderLeft: `4px solid ${booking.event_type?.color || '#8B5CF6'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {booking.event_type?.title || 'Cita'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            BOOKING_STATUS_COLORS[booking.status].bg
                          } ${BOOKING_STATUS_COLORS[booking.status].text}`}
                        >
                          {booking.status === 'confirmed' && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {booking.status === 'pending' && (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(booking.start_time), 'HH:mm')} –{' '}
                          {format(new Date(booking.end_time), 'HH:mm')}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {booking.guest_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
