// Booking Calendar Page - Calendly-inspired design

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  List,
  Settings,
  Clock,
  User,
  Mail,
  MapPin,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Video,
  Phone,
  Link as LinkIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingCalendar } from '../components/Calendar';
import { useBookings } from '../hooks';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, LOCATION_TYPE_LABELS } from '../types';
import type { BookingLocationType } from '../types';

// Design tokens
const styles = {
  container: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    minHeight: '100vh',
    backgroundColor: '#FAFBFC',
  },
  header: {
    background: 'linear-gradient(135deg, hsl(270 90% 50%) 0%, hsl(280 90% 45%) 100%)',
    padding: '48px 0 80px',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
  statsCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s ease',
  },
  tab: (isActive: boolean) => ({
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
  bookingCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
};

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

type ViewType = 'calendar' | 'list';

export function BookingCalendarPage() {
  const [view, setView] = useState<ViewType>('list');
  const { bookings, upcomingBookings, todayBookings, isLoading } = useBookings();

  const nextBooking = upcomingBookings[0];

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  };

  const statsItems = [
    {
      label: 'Hoy',
      value: todayBookings.length,
      sublabel: todayBookings.length === 1 ? 'cita programada' : 'citas programadas',
      icon: CalendarDays,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
    {
      label: 'Próximas',
      value: upcomingBookings.length,
      sublabel: 'citas por atender',
      icon: Clock,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      label: 'Próxima cita',
      value: nextBooking
        ? format(new Date(nextBooking.start_time), 'HH:mm')
        : '—',
      sublabel: nextBooking
        ? getDateLabel(new Date(nextBooking.start_time))
        : 'Sin citas próximas',
      icon: CheckCircle2,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      isTime: true,
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerPattern} />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-3 text-white/80 mb-3">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Calendario</span>
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Mis citas
              </h1>
              <p className="text-white/80 text-lg mt-2">
                Gestiona tus reservas y calendario de citas
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to="/booking/settings"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 backdrop-blur text-white font-medium text-sm hover:bg-white/25 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Stats Cards - overlapping header */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {statsItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              style={styles.statsCard}
              className="hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p
                    className={`font-bold text-slate-900 mt-1 ${
                      item.isTime ? 'text-2xl' : 'text-3xl'
                    }`}
                  >
                    {item.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{item.sublabel}</p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 mb-8"
        >
          <button onClick={() => setView('list')} style={styles.tab(view === 'list')}>
            <List className="w-5 h-5" />
            Lista
            {view === 'list' && <ChevronRight className="w-4 h-4 ml-1" />}
          </button>

          <button onClick={() => setView('calendar')} style={styles.tab(view === 'calendar')}>
            <Calendar className="w-5 h-5" />
            Calendario
            {view === 'calendar' && <ChevronRight className="w-4 h-4 ml-1" />}
          </button>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {view === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pb-12"
            >
              <div style={styles.bookingCard}>
                <BookingCalendar />
              </div>
            </motion.div>
          )}

          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pb-12"
            >
              <div style={styles.bookingCard}>
                <div className="p-6 border-b bg-slate-50">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Próximas citas
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Lista de todas tus citas ordenadas por fecha
                  </p>
                </div>

                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-6">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-2">
                      No tienes citas próximas
                    </h4>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                      Comparte tu enlace de reservas para que tus clientes puedan agendar citas contigo.
                    </p>
                    <Link
                      to="/booking/settings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      Configurar disponibilidad
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {upcomingBookings.map((booking, index) => {
                      const LocationIcon = LOCATION_ICONS[booking.location_type as BookingLocationType] || MapPin;
                      const startDate = new Date(booking.start_time);

                      return (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-5 hover:bg-slate-50/50 transition-colors group"
                        >
                          <div className="flex items-start gap-4">
                            {/* Color bar */}
                            <div
                              className="w-1.5 h-full min-h-[80px] rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: booking.event_type?.color || '#8B5CF6',
                              }}
                            />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="font-semibold text-slate-900">
                                  {booking.event_type?.title || 'Cita'}
                                </h4>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
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

                              <div className="mt-2 space-y-1.5">
                                <p className="flex items-center gap-2 text-sm text-slate-600">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium">
                                    {format(startDate, 'HH:mm')}
                                  </span>
                                  <span className="text-slate-400">·</span>
                                  <span>{getDateLabel(startDate)}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-slate-400">
                                    {formatDistanceToNow(startDate, {
                                      locale: es,
                                      addSuffix: true,
                                    })}
                                  </span>
                                </p>

                                <p className="flex items-center gap-2 text-sm text-slate-600">
                                  <User className="w-4 h-4 text-slate-400" />
                                  {booking.guest_name}
                                </p>

                                <p className="flex items-center gap-2 text-sm text-slate-500">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  {booking.guest_email}
                                </p>

                                <p className="flex items-center gap-2 text-sm text-slate-500">
                                  <LocationIcon className="w-4 h-4 text-slate-400" />
                                  {LOCATION_TYPE_LABELS[booking.location_type as BookingLocationType] ||
                                    'Ubicación'}
                                </p>
                              </div>
                            </div>

                            {/* Time badge */}
                            <div className="flex-shrink-0 text-right">
                              <div className="inline-block px-4 py-2 rounded-xl bg-slate-100">
                                <p className="text-2xl font-bold text-slate-900">
                                  {format(startDate, 'HH:mm')}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(startDate, 'd MMM', { locale: es })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
