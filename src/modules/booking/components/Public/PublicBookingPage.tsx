// Página pública para reservar citas - Diseño Premium estilo Calendly

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Video,
  Phone,
  MapPin,
  Link as LinkIcon,
  ArrowLeft,
  Globe,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Mail,
  MessageSquare,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useBookingHost,
  usePublicEventTypes,
  useAvailableSlots,
  useAvailableDates,
  useCreateBooking,
} from '../../hooks';
import type { BookingEventType, TimeSlot, Booking, BookingLocationType } from '../../types';
import { LOCATION_TYPE_LABELS } from '../../types';

// ============================================================================
// STYLES - Calendly-inspired Premium Design System
// ============================================================================

const styles = {
  // Layout
  container: `
    min-h-screen bg-[#F8FAFC]
    font-['Plus_Jakarta_Sans',_'Inter',_system-ui,_sans-serif]
  `,
  wrapper: `
    max-w-5xl mx-auto min-h-screen
    flex flex-col lg:flex-row
    shadow-[0_0_60px_-15px_rgba(0,0,0,0.1)]
    bg-white
  `,

  // Left Panel (Host Info)
  leftPanel: `
    lg:w-[320px] lg:min-w-[320px] lg:border-r border-[#E2E8F0]
    bg-gradient-to-br from-white to-[#F8FAFC]
    p-8 lg:p-10
    flex flex-col
  `,
  hostAvatar: `
    w-24 h-24 rounded-full
    ring-4 ring-white shadow-xl
    mb-6
  `,
  hostName: `
    text-2xl font-bold text-[#0F172A] tracking-tight
    mb-1
  `,
  hostUsername: `
    text-sm text-[#64748B] mb-6
  `,
  eventTitle: `
    text-lg font-semibold text-[#0F172A]
    mb-4
  `,
  eventMeta: `
    flex items-center gap-2 text-sm text-[#64748B]
    mb-3
  `,
  eventDescription: `
    text-sm text-[#64748B] leading-relaxed
    mt-4 pt-4 border-t border-[#E2E8F0]
  `,

  // Right Panel (Booking Flow)
  rightPanel: `
    flex-1 p-8 lg:p-10
    overflow-auto
  `,
  stepTitle: `
    text-xl font-semibold text-[#0F172A]
    mb-6
  `,

  // Calendar
  calendarContainer: `
    bg-white rounded-2xl
    max-w-md
  `,
  calendarHeader: `
    flex items-center justify-between mb-6
  `,
  calendarMonth: `
    text-lg font-semibold text-[#0F172A]
  `,
  calendarNav: `
    flex gap-1
  `,
  calendarNavBtn: `
    p-2 rounded-full hover:bg-[#F1F5F9] transition-colors
    text-[#64748B] hover:text-[#0F172A]
    disabled:opacity-30 disabled:cursor-not-allowed
  `,
  calendarWeekdays: `
    grid grid-cols-7 mb-2
  `,
  calendarWeekday: `
    text-center text-xs font-medium text-[#94A3B8] py-2
  `,
  calendarDays: `
    grid grid-cols-7 gap-1
  `,
  calendarDay: (isAvailable: boolean, isSelected: boolean, isCurrentMonth: boolean) => `
    aspect-square flex items-center justify-center
    rounded-full text-sm font-medium
    transition-all duration-200
    ${!isCurrentMonth ? 'text-[#CBD5E1]' : ''}
    ${isAvailable && isCurrentMonth && !isSelected
      ? 'text-[#0F172A] hover:bg-[#006BFF] hover:text-white cursor-pointer'
      : ''}
    ${isSelected
      ? 'bg-[#006BFF] text-white shadow-lg shadow-blue-500/30'
      : ''}
    ${!isAvailable && isCurrentMonth
      ? 'text-[#CBD5E1] cursor-not-allowed'
      : ''}
  `,

  // Time Slots
  timeSlotsContainer: `
    mt-8 lg:mt-0 lg:ml-10
  `,
  timeSlotsGrid: `
    grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto
    pr-2
  `,
  timeSlot: (isSelected: boolean) => `
    px-4 py-3 rounded-lg text-sm font-medium
    border transition-all duration-200
    ${isSelected
      ? 'bg-[#006BFF] text-white border-[#006BFF] shadow-lg shadow-blue-500/20'
      : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#006BFF] hover:text-[#006BFF]'}
  `,

  // Timezone Selector
  timezoneSelector: `
    flex items-center gap-2 text-sm text-[#64748B]
    mt-6 pt-6 border-t border-[#E2E8F0]
  `,

  // Form
  formContainer: `
    max-w-md
  `,
  formField: `
    mb-5
  `,
  formLabel: `
    block text-sm font-medium text-[#0F172A] mb-2
  `,
  formInput: `
    w-full px-4 py-3 rounded-xl
    border border-[#E2E8F0] bg-white
    text-[#0F172A] placeholder:text-[#94A3B8]
    focus:outline-none focus:ring-2 focus:ring-[#006BFF]/20 focus:border-[#006BFF]
    transition-all duration-200
  `,
  formTextarea: `
    w-full px-4 py-3 rounded-xl
    border border-[#E2E8F0] bg-white
    text-[#0F172A] placeholder:text-[#94A3B8]
    focus:outline-none focus:ring-2 focus:ring-[#006BFF]/20 focus:border-[#006BFF]
    transition-all duration-200
    resize-none
  `,

  // Buttons
  primaryBtn: `
    w-full py-4 px-6 rounded-xl
    bg-[#006BFF] text-white font-semibold
    hover:bg-[#0055CC] active:bg-[#0044AA]
    transition-all duration-200
    shadow-lg shadow-blue-500/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  backBtn: `
    flex items-center gap-2 text-sm text-[#64748B]
    hover:text-[#0F172A] transition-colors
    mb-6
  `,

  // Event Type Cards
  eventTypeCard: (isSelected: boolean, color: string) => `
    p-5 rounded-2xl border-2 cursor-pointer
    transition-all duration-200
    ${isSelected
      ? `border-[${color}] bg-[${color}]/5 shadow-lg`
      : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-md bg-white'}
  `,
  eventTypeColor: (color: string) => `
    w-1.5 h-full rounded-full
  `,

  // Success State
  successContainer: `
    min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4
    font-['Plus_Jakarta_Sans',_'Inter',_system-ui,_sans-serif]
  `,
  successCard: `
    bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full
    text-center
  `,
  successIcon: `
    w-20 h-20 rounded-full bg-[#10B981]/10
    flex items-center justify-center mx-auto mb-6
  `,
  successTitle: `
    text-2xl font-bold text-[#0F172A] mb-2
  `,
  successSubtitle: `
    text-[#64748B] mb-8
  `,
  successDetail: `
    flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC]
    text-left mb-3
  `,

  // Loading
  loadingContainer: `
    min-h-screen flex items-center justify-center
    bg-[#F8FAFC]
  `,
  loadingSpinner: `
    w-10 h-10 border-3 border-[#E2E8F0] border-t-[#006BFF]
    rounded-full animate-spin
  `,
};

// ============================================================================
// LOCATION ICONS
// ============================================================================

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

// ============================================================================
// TIMEZONES
// ============================================================================

const COMMON_TIMEZONES = [
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
];

// ============================================================================
// FORM SCHEMA
// ============================================================================

const guestSchema = z.object({
  guest_name: z.string().min(2, 'El nombre es requerido'),
  guest_email: z.string().email('Email inválido'),
  guest_phone: z.string().optional(),
  guest_notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type GuestFormData = z.infer<typeof guestSchema>;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type BookingStep = 'event-type' | 'date-time' | 'details' | 'success';

export function PublicBookingPage() {
  const { username, eventSlug } = useParams<{ username: string; eventSlug?: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<BookingStep>('event-type');
  const [selectedEventType, setSelectedEventType] = useState<BookingEventType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Queries
  const { data: host, isLoading: loadingHost, error: hostError } = useBookingHost(username);
  const { data: eventTypes = [], isLoading: loadingEventTypes } = usePublicEventTypes(host?.user_id);
  const { data: availableDates = [] } = useAvailableDates(
    host?.user_id,
    selectedEventType?.id,
    startOfMonth(currentMonth),
    endOfMonth(addMonths(currentMonth, 2)),
    timezone
  );
  const { data: slots = [], isLoading: loadingSlots } = useAvailableSlots(
    host?.user_id,
    selectedEventType?.id,
    selectedDate,
    timezone
  );

  const createBooking = useCreateBooking();

  // Form
  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_notes: '',
    },
  });

  // Auto-select event type from URL
  useEffect(() => {
    if (eventSlug && eventTypes.length > 0 && !selectedEventType) {
      const found = eventTypes.find((et) => et.slug === eventSlug);
      if (found) {
        setSelectedEventType(found);
        setStep('date-time');
      }
    }
  }, [eventSlug, eventTypes, selectedEventType]);

  // Handlers
  const handleSelectEventType = (eventType: BookingEventType) => {
    setSelectedEventType(eventType);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setStep('date-time');
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinueToDetails = () => {
    if (selectedSlot) {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'date-time') {
      setSelectedEventType(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setStep('event-type');
    } else if (step === 'details') {
      setStep('date-time');
    }
  };

  const handleSubmit = (data: GuestFormData) => {
    if (!host || !selectedEventType || !selectedSlot) return;

    createBooking.mutate(
      {
        event_type_id: selectedEventType.id,
        host_user_id: host.user_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone,
        guest_notes: data.guest_notes,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        timezone,
      },
      {
        onSuccess: (booking) => {
          setCreatedBooking(booking);
          setStep('success');
        },
      }
    );
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days from previous month
    const firstDayOfWeek = start.getDay();
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const paddedStart = new Date(start);
    paddedStart.setDate(paddedStart.getDate() - paddingDays);

    return eachDayOfInterval({ start: paddedStart, end });
  }, [currentMonth]);

  const isDateAvailable = (date: Date) => {
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return false;
    return availableDates.some((d) => isSameDay(d, date));
  };

  // Loading state
  if (loadingHost) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  // Error state
  if (hostError || !host) {
    return (
      <div className={styles.loadingContainer}>
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-[#0F172A] mb-2">
            Usuario no encontrado
          </h2>
          <p className="text-[#64748B] mb-6">
            No pudimos encontrar un usuario con el nombre "{username}"
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#006BFF] text-white rounded-xl font-medium hover:bg-[#0055CC] transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success' && createdBooking) {
    return (
      <div className={styles.successContainer}>
        <motion.div
          className={styles.successCard}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className={styles.successIcon}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Check className="w-10 h-10 text-[#10B981]" />
          </motion.div>

          <h1 className={styles.successTitle}>¡Reserva confirmada!</h1>
          <p className={styles.successSubtitle}>
            Te hemos enviado un email con los detalles
          </p>

          <div className="space-y-3 mb-8">
            <div className={styles.successDetail}>
              <CalendarIcon className="w-5 h-5 text-[#006BFF]" />
              <div>
                <p className="font-medium text-[#0F172A]">
                  {format(new Date(createdBooking.start_time), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
                <p className="text-sm text-[#64748B]">
                  {format(new Date(createdBooking.start_time), 'HH:mm')} - {format(new Date(createdBooking.end_time), 'HH:mm')}
                </p>
              </div>
            </div>

            <div className={styles.successDetail}>
              <User className="w-5 h-5 text-[#006BFF]" />
              <div>
                <p className="font-medium text-[#0F172A]">{host.display_name}</p>
                <p className="text-sm text-[#64748B]">{selectedEventType?.title}</p>
              </div>
            </div>

            <div className={styles.successDetail}>
              {selectedEventType && (
                <>
                  {(() => {
                    const Icon = LOCATION_ICONS[selectedEventType.location_type];
                    return <Icon className="w-5 h-5 text-[#006BFF]" />;
                  })()}
                  <div>
                    <p className="font-medium text-[#0F172A]">
                      {LOCATION_TYPE_LABELS[selectedEventType.location_type]}
                    </p>
                    <p className="text-sm text-[#64748B]">
                      Recibirás el enlace por email
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <a
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEventType?.title || 'Cita')}&dates=${format(new Date(createdBooking.start_time), "yyyyMMdd'T'HHmmss")}/${format(new Date(createdBooking.end_time), "yyyyMMdd'T'HHmmss")}&details=${encodeURIComponent(`Cita con ${host.display_name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl border-2 border-[#E2E8F0] text-[#0F172A] font-semibold hover:border-[#006BFF] hover:text-[#006BFF] transition-colors"
          >
            <CalendarIcon className="w-5 h-5" />
            Agregar a Google Calendar
          </a>
        </motion.div>
      </div>
    );
  }

  const LocationIcon = selectedEventType ? LOCATION_ICONS[selectedEventType.location_type] : null;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Left Panel - Host Info */}
        <div className={styles.leftPanel}>
          <Avatar className={styles.hostAvatar}>
            <AvatarImage src={host.avatar_url || undefined} />
            <AvatarFallback className="text-3xl bg-gradient-to-br from-[#006BFF] to-[#0055CC] text-white">
              {host.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h1 className={styles.hostName}>{host.display_name}</h1>
          <p className={styles.hostUsername}>@{host.username || username}</p>

          {selectedEventType && (
            <motion.div {...fadeInUp}>
              <h2 className={styles.eventTitle}>{selectedEventType.title}</h2>

              <div className={styles.eventMeta}>
                <Clock className="w-4 h-4" />
                <span>{selectedEventType.duration_minutes} minutos</span>
              </div>

              <div className={styles.eventMeta}>
                {LocationIcon && <LocationIcon className="w-4 h-4" />}
                <span>{LOCATION_TYPE_LABELS[selectedEventType.location_type]}</span>
              </div>

              {selectedDate && selectedSlot && (
                <div className={styles.eventMeta}>
                  <CalendarIcon className="w-4 h-4" />
                  <span>
                    {format(selectedSlot.start, "EEE d MMM, HH:mm", { locale: es })}
                  </span>
                </div>
              )}

              {selectedEventType.description && (
                <p className={styles.eventDescription}>
                  {selectedEventType.description}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Panel - Booking Flow */}
        <div className={styles.rightPanel}>
          <AnimatePresence mode="wait">
            {/* Step 1: Select Event Type */}
            {step === 'event-type' && (
              <motion.div key="event-type" {...fadeInUp}>
                <h2 className={styles.stepTitle}>Selecciona un tipo de cita</h2>

                {loadingEventTypes ? (
                  <div className="flex justify-center py-12">
                    <div className={styles.loadingSpinner} />
                  </div>
                ) : eventTypes.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 mx-auto text-[#CBD5E1] mb-4" />
                    <p className="text-[#64748B]">
                      No hay tipos de cita disponibles
                    </p>
                  </div>
                ) : (
                  <motion.div
                    className="space-y-3"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {eventTypes.map((eventType) => {
                      const Icon = LOCATION_ICONS[eventType.location_type];
                      return (
                        <motion.div
                          key={eventType.id}
                          variants={fadeInUp}
                          onClick={() => handleSelectEventType(eventType)}
                          className="p-5 rounded-2xl border-2 border-[#E2E8F0] bg-white cursor-pointer hover:border-[#006BFF] hover:shadow-lg transition-all duration-200 group"
                        >
                          <div className="flex gap-4">
                            <div
                              className="w-1.5 rounded-full self-stretch"
                              style={{ backgroundColor: eventType.color }}
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-[#0F172A] group-hover:text-[#006BFF] transition-colors">
                                {eventType.title}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-[#64748B]">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  {eventType.duration_minutes} min
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Icon className="w-4 h-4" />
                                  {LOCATION_TYPE_LABELS[eventType.location_type]}
                                </span>
                              </div>
                              {eventType.description && (
                                <p className="text-sm text-[#94A3B8] mt-2 line-clamp-2">
                                  {eventType.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Date & Time */}
            {step === 'date-time' && selectedEventType && (
              <motion.div key="date-time" {...fadeInUp}>
                <button onClick={handleBack} className={styles.backBtn}>
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>

                <h2 className={styles.stepTitle}>Selecciona fecha y hora</h2>

                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Calendar */}
                  <div className={styles.calendarContainer}>
                    <div className={styles.calendarHeader}>
                      <h3 className={styles.calendarMonth}>
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                      </h3>
                      <div className={styles.calendarNav}>
                        <button
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                          className={styles.calendarNavBtn}
                          disabled={isSameMonth(currentMonth, new Date())}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                          className={styles.calendarNavBtn}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className={styles.calendarWeekdays}>
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                        <div key={day} className={styles.calendarWeekday}>
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className={styles.calendarDays}>
                      {calendarDays.slice(0, 42).map((day, i) => {
                        const available = isDateAvailable(day);
                        const selected = selectedDate && isSameDay(day, selectedDate);
                        const currentMonth_ = isSameMonth(day, currentMonth);

                        return (
                          <button
                            key={i}
                            onClick={() => available && currentMonth_ && handleSelectDate(day)}
                            disabled={!available || !currentMonth_}
                            className={styles.calendarDay(available, selected || false, currentMonth_)}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>

                    {/* Timezone Selector */}
                    <div className={styles.timezoneSelector}>
                      <Globe className="w-4 h-4" />
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="border-0 p-0 h-auto shadow-none text-[#64748B] hover:text-[#0F172A]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <motion.div
                      className={styles.timeSlotsContainer}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-sm font-medium text-[#64748B] mb-4">
                        {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                      </h3>

                      {loadingSlots ? (
                        <div className="flex justify-center py-8">
                          <div className={styles.loadingSpinner} />
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-[#94A3B8] text-center py-8">
                          No hay horarios disponibles
                        </p>
                      ) : (
                        <>
                          <div className={styles.timeSlotsGrid}>
                            {slots.map((slot, i) => (
                              <button
                                key={i}
                                onClick={() => handleSelectSlot(slot)}
                                className={styles.timeSlot(
                                  selectedSlot?.start.getTime() === slot.start.getTime()
                                )}
                              >
                                {format(slot.start, 'HH:mm')}
                              </button>
                            ))}
                          </div>

                          {selectedSlot && (
                            <motion.button
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={handleContinueToDetails}
                              className={`${styles.primaryBtn} mt-6`}
                            >
                              Continuar
                            </motion.button>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Guest Details */}
            {step === 'details' && selectedEventType && selectedSlot && (
              <motion.div key="details" {...fadeInUp}>
                <button onClick={handleBack} className={styles.backBtn}>
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>

                <h2 className={styles.stepTitle}>Completa tus datos</h2>

                <div className={styles.formContainer}>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                      <FormField
                        control={form.control}
                        name="guest_name"
                        render={({ field }) => (
                          <FormItem className={styles.formField}>
                            <FormLabel className={styles.formLabel}>
                              <User className="w-4 h-4 inline mr-2" />
                              Nombre completo *
                            </FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                placeholder="Tu nombre"
                                className={styles.formInput}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm mt-1" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="guest_email"
                        render={({ field }) => (
                          <FormItem className={styles.formField}>
                            <FormLabel className={styles.formLabel}>
                              <Mail className="w-4 h-4 inline mr-2" />
                              Email *
                            </FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                type="email"
                                placeholder="tu@email.com"
                                className={styles.formInput}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm mt-1" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="guest_phone"
                        render={({ field }) => (
                          <FormItem className={styles.formField}>
                            <FormLabel className={styles.formLabel}>
                              <Phone className="w-4 h-4 inline mr-2" />
                              Teléfono (opcional)
                            </FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                placeholder="+57 300 123 4567"
                                className={styles.formInput}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm mt-1" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="guest_notes"
                        render={({ field }) => (
                          <FormItem className={styles.formField}>
                            <FormLabel className={styles.formLabel}>
                              <MessageSquare className="w-4 h-4 inline mr-2" />
                              ¿Algo que debamos saber? (opcional)
                            </FormLabel>
                            <FormControl>
                              <textarea
                                {...field}
                                placeholder="Comparte cualquier detalle relevante para la cita..."
                                rows={4}
                                className={styles.formTextarea}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm mt-1" />
                          </FormItem>
                        )}
                      />

                      <button
                        type="submit"
                        disabled={createBooking.isPending}
                        className={styles.primaryBtn}
                      >
                        {createBooking.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Confirmando...
                          </span>
                        ) : (
                          'Confirmar reserva'
                        )}
                      </button>
                    </form>
                  </Form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
