import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Video, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSpaceEvents, useCreateEvent, useRsvpEvent } from '@/hooks/academy/useSpaceEvents';
import type { AcademySpaceEvent, EventType, RsvpStatus } from '@/types/academy-community';

interface SpaceCalendarProps {
  spaceId: string;
  isOwner?: boolean;
  accentColor?: string;
}

export function SpaceCalendar({ spaceId, isOwner, accentColor = '#8B5CF6' }: SpaceCalendarProps) {
  const { data: events = [], isLoading } = useSpaceEvents(spaceId);
  const create = useCreateEvent();
  const rsvp = useRsvpEvent();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('live_call');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');

  function reset() {
    setShowCreate(false);
    setTitle('');
    setDescription('');
    setType('live_call');
    setStartsAt('');
    setEndsAt('');
    setMeetingUrl('');
  }

  async function handleCreate() {
    if (!title || !startsAt || !endsAt) return;
    await create.mutateAsync({
      space_id: spaceId,
      title,
      description: description || null,
      type,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      meeting_url: meetingUrl || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    reset();
  }

  const upcoming = events.filter((e) => new Date(e.starts_at) >= new Date());
  const past = events.filter((e) => new Date(e.starts_at) < new Date());

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreate((v) => !v)}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo evento
          </Button>
        </div>
      )}

      {showCreate && (
        <Card className="p-5 bg-white/5 border-white/10 space-y-3">
          <h3 className="font-semibold">Nuevo evento</h3>
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-black/30 border-white/10"
            />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm h-16"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inicio</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm"
              >
                <option value="live_call">Live call</option>
                <option value="workshop">Workshop</option>
                <option value="webinar">Webinar</option>
                <option value="challenge">Challenge</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <Label>URL de la reunión</Label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/..."
                className="bg-black/30 border-white/10"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-purple-500 hover:bg-purple-600 text-white">
              {create.isPending ? 'Creando...' : 'Crear evento'}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-zinc-500 text-center py-8">Cargando eventos...</div>
      ) : (
        <>
          <Section title="Próximos eventos" events={upcoming} onRsvp={rsvp.mutate} accentColor={accentColor} />
          {past.length > 0 && (
            <Section title="Pasados" events={past} onRsvp={rsvp.mutate} accentColor={accentColor} pastMode />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  events,
  onRsvp,
  accentColor,
  pastMode,
}: {
  title: string;
  events: AcademySpaceEvent[];
  onRsvp: (args: { eventId: string; status: RsvpStatus }) => void;
  accentColor: string;
  pastMode?: boolean;
}) {
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      {events.length === 0 ? (
        <Card className="p-6 text-center bg-white/5 border-white/10 text-zinc-500 text-sm">
          {pastMode ? 'Sin eventos pasados' : 'Sin eventos próximos'}
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <EventRow key={ev.id} event={ev} onRsvp={onRsvp} accentColor={accentColor} pastMode={pastMode} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({
  event,
  onRsvp,
  accentColor,
  pastMode,
}: {
  event: AcademySpaceEvent;
  onRsvp: (args: { eventId: string; status: RsvpStatus }) => void;
  accentColor: string;
  pastMode?: boolean;
}) {
  const dt = new Date(event.starts_at);
  const myRsvp = (() => {
    if (!event.my_rsvp) return null;
    if (Array.isArray(event.my_rsvp)) return event.my_rsvp[0]?.status ?? null;
    return event.my_rsvp;
  })();

  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-start gap-4">
        <div
          className="rounded-lg p-3 text-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor, minWidth: 64 }}
        >
          <div className="text-[10px] uppercase">{format(dt, 'MMM', { locale: es })}</div>
          <div className="text-2xl font-bold leading-none">{format(dt, 'd')}</div>
          <div className="text-[10px] mt-1">{format(dt, 'HH:mm')}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{event.title}</h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
              {event.type}
            </span>
          </div>
          {event.description && (
            <p className="text-xs text-zinc-400 line-clamp-2">{event.description}</p>
          )}
          {event.meeting_url && (
            <a
              href={event.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              <Video className="h-3 w-3" /> Unirse <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        {!pastMode && (
          <div className="flex flex-col gap-1">
            {(['going', 'maybe', 'not_going'] as RsvpStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onRsvp({ eventId: event.id, status: s })}
                className={cn(
                  'text-[10px] px-2 py-1 rounded border flex items-center gap-1',
                  myRsvp === s
                    ? 'border-purple-500 bg-purple-500/15 text-purple-200'
                    : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {myRsvp === s && <Check className="h-2.5 w-2.5" />}
                {s === 'going' ? 'Voy' : s === 'maybe' ? 'Tal vez' : 'No voy'}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
