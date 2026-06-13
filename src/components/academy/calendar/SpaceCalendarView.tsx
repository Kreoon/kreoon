import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, isSameDay, startOfMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSpaceCalendar, useCancelSpaceEvent } from '@/hooks/academy/useAcademyCalendar';
import { EventCard } from './EventCard';
import { EventFormDialog } from './EventFormDialog';
import { GoogleCalendarConnectButton } from './GoogleCalendarConnectButton';
import type { AcademySpaceEventFull } from '@/types/academy-v3';

interface SpaceCalendarViewProps {
  spaceId: string;
  isOwner: boolean;
  accentColor?: string;
}

type ViewMode = 'month' | 'week' | 'agenda';

export function SpaceCalendarView({ spaceId, isOwner, accentColor = '#8B5CF6' }: SpaceCalendarViewProps) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [showForm, setShowForm] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);

  const monthKey = format(cursor, 'yyyy-MM');
  const { data: events = [], isLoading } = useSpaceCalendar(spaceId, monthKey);
  const cancelEvent = useCancelSpaceEvent();

  const eventsByDay = useMemo(() => {
    const m = new Map<string, AcademySpaceEventFull[]>();
    events.forEach((ev) => {
      const key = format(new Date(ev.starts_at), 'yyyy-MM-dd');
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(ev);
    });
    return m;
  }, [events]);

  function handleCancel(event: AcademySpaceEventFull) {
    const reason = prompt('Motivo de la cancelación (opcional):');
    if (reason === null) return;
    cancelEvent.mutate({ event_id: event.id, space_id: spaceId, reason: reason || undefined });
  }

  return (
    <div className="space-y-4">
      {/* Header de controles */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="p-2 rounded hover:bg-white/5 text-zinc-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="font-bold text-lg capitalize">{format(cursor, 'MMMM yyyy', { locale: es })}</h2>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="p-2 rounded hover:bg-white/5 text-zinc-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-white/10 rounded p-0.5">
            {(['month', 'week', 'agenda'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1',
                  view === v ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {v === 'agenda' ? <List className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Agenda'}
              </button>
            ))}
          </div>
          {isOwner && (
            <Button
              onClick={() => {
                setDefaultDate(undefined);
                setShowForm(true);
              }}
              size="sm"
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nuevo evento
            </Button>
          )}
        </div>
      </div>

      {/* Google Calendar status */}
      <GoogleCalendarConnectButton spaceId={spaceId} isOwner={isOwner} accentColor={accentColor} />

      {/* Vista */}
      {isLoading ? (
        <div className="text-zinc-500 text-center py-12">Cargando eventos...</div>
      ) : view === 'month' ? (
        <MonthGrid
          cursor={cursor}
          eventsByDay={eventsByDay}
          accentColor={accentColor}
          onDayClick={(d) => {
            if (isOwner) {
              setDefaultDate(d);
              setShowForm(true);
            }
          }}
        />
      ) : view === 'week' ? (
        <WeekView
          cursor={cursor}
          eventsByDay={eventsByDay}
          accentColor={accentColor}
          spaceId={spaceId}
          isOwner={isOwner}
          onCancel={handleCancel}
        />
      ) : (
        <AgendaView events={events} accentColor={accentColor} spaceId={spaceId} isOwner={isOwner} onCancel={handleCancel} />
      )}

      {showForm && (
        <EventFormDialog
          spaceId={spaceId}
          defaultDate={defaultDate}
          onClose={() => setShowForm(false)}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}

function MonthGrid({
  cursor,
  eventsByDay,
  accentColor,
  onDayClick,
}: {
  cursor: Date;
  eventsByDay: Map<string, AcademySpaceEventFull[]>;
  accentColor: string;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today = new Date();

  return (
    <Card className="p-2 bg-white/5 border-white/10">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((n) => (
          <div key={n} className="text-[10px] uppercase tracking-wide text-zinc-500 text-center py-1">
            {n}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = isSameDay(day, today);
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[88px] p-1.5 rounded border text-left transition-colors',
                inMonth ? 'border-white/10 hover:bg-white/5' : 'border-transparent opacity-30',
                isToday && 'ring-1'
              )}
              style={isToday ? { borderColor: accentColor } : undefined}
            >
              <div
                className={cn(
                  'text-xs font-semibold mb-1',
                  isToday ? 'text-zinc-100' : 'text-zinc-400'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[10px] truncate px-1 py-0.5 rounded"
                    style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                    title={ev.title}
                  >
                    {format(new Date(ev.starts_at), 'HH:mm')} {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-zinc-500 px-1">+{dayEvents.length - 3} más</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({
  cursor,
  eventsByDay,
  accentColor,
  spaceId,
  isOwner,
  onCancel,
}: {
  cursor: Date;
  eventsByDay: Map<string, AcademySpaceEventFull[]>;
  accentColor: string;
  spaceId: string;
  isOwner: boolean;
  onCancel: (e: AcademySpaceEventFull) => void;
}) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  return (
    <div className="space-y-3">
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const evs = eventsByDay.get(key) ?? [];
        return (
          <div key={key}>
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1.5">
              {format(d, 'EEEE d', { locale: es })}
            </div>
            {evs.length === 0 ? (
              <div className="text-xs text-zinc-600 italic pl-2 mb-2">Sin eventos</div>
            ) : (
              <div className="space-y-2">
                {evs.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    spaceId={spaceId}
                    isOwner={isOwner}
                    accentColor={accentColor}
                    onCancel={onCancel}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgendaView({
  events,
  accentColor,
  spaceId,
  isOwner,
  onCancel,
}: {
  events: AcademySpaceEventFull[];
  accentColor: string;
  spaceId: string;
  isOwner: boolean;
  onCancel: (e: AcademySpaceEventFull) => void;
}) {
  if (events.length === 0) {
    return <div className="text-zinc-500 text-center py-12">Sin eventos en este mes.</div>;
  }
  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <EventCard
          key={ev.id}
          event={ev}
          spaceId={spaceId}
          isOwner={isOwner}
          accentColor={accentColor}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
