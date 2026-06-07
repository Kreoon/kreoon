import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSpaceEvent } from '@/hooks/academy/useAcademyCalendar';
import { useGoogleCalendarConnection } from '@/hooks/academy/useAcademyCalendar';
import type { EventType } from '@/types/academy-v3';

interface EventFormDialogProps {
  spaceId: string;
  defaultDate?: Date;
  onClose: () => void;
  accentColor?: string;
}

export function EventFormDialog({ spaceId, defaultDate, onClose, accentColor = '#8B5CF6' }: EventFormDialogProps) {
  const create = useCreateSpaceEvent();
  const { data: gcalConnection } = useGoogleCalendarConnection(spaceId);

  const startDefault = defaultDate
    ? toLocalDateTime(defaultDate)
    : toLocalDateTime(new Date(Date.now() + 60 * 60 * 1000));
  const endDefault = defaultDate
    ? toLocalDateTime(new Date(defaultDate.getTime() + 60 * 60 * 1000))
    : toLocalDateTime(new Date(Date.now() + 2 * 60 * 60 * 1000));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('live_call');
  const [startsAt, setStartsAt] = useState(startDefault);
  const [endsAt, setEndsAt] = useState(endDefault);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [autoInvite, setAutoInvite] = useState(true);
  const [syncGoogle, setSyncGoogle] = useState(!!gcalConnection?.is_active);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!title || !startsAt || !endsAt) {
      setError('Completa título, inicio y fin');
      return;
    }
    try {
      await create.mutateAsync({
        space_id: spaceId,
        title,
        description,
        type,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        meeting_url: meetingUrl || undefined,
        auto_invite_all: autoInvite,
        sync_to_google: syncGoogle && !!gcalConnection?.is_active,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo crear el evento');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <Card
        className="max-w-lg w-full p-6 space-y-4 bg-[#0c0c16] border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Nuevo evento</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Q&A semanal con la comunidad"
            className="bg-black/30 border-white/10"
          />
        </div>
        <div>
          <Label>Descripción (opcional)</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md bg-black/30 border border-white/10 p-2 text-sm h-20 focus:outline-none focus:border-purple-500/50"
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
            <Label>URL del meeting (opcional)</Label>
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="bg-black/30 border-white/10"
            />
            {gcalConnection?.is_active && !meetingUrl && (
              <p className="text-[10px] text-zinc-500 mt-1">
                Se generará automáticamente un link de Google Meet
              </p>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoInvite}
            onChange={(e) => setAutoInvite(e.target.checked)}
            className="accent-purple-500"
          />
          Invitar automáticamente a todos los miembros activos
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={syncGoogle}
            disabled={!gcalConnection?.is_active}
            onChange={(e) => setSyncGoogle(e.target.checked)}
            className="accent-purple-500"
          />
          Sincronizar con Google Calendar
          {!gcalConnection?.is_active && (
            <span className="text-xs text-zinc-500">(conecta primero)</span>
          )}
        </label>

        {error && (
          <div className="rounded bg-rose-500/10 border border-rose-500/30 p-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="text-white"
            style={{ backgroundColor: accentColor }}
          >
            {create.isPending ? 'Creando...' : 'Crear evento'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function toLocalDateTime(d: Date): string {
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
