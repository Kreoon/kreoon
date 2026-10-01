import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Clock, ExternalLink, Video, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { safeUrl } from '@/lib/safeUrl';
import {
  useRespondToInvitation,
  useMyMemberCalendarStatus,
  useConnectMemberCalendar,
} from '@/hooks/academy/useAcademyCalendar';
import { useEventCheckin } from '@/hooks/academy/useAcademyJoinSpace';
import { useToast } from '@/hooks/use-toast';
import type { AcademySpaceEventFull, EventInvitationStatus } from '@/types/academy-v3';

interface EventCardProps {
  event: AcademySpaceEventFull;
  spaceId: string;
  isOwner: boolean;
  accentColor?: string;
  onCancel?: (event: AcademySpaceEventFull) => void;
}

export function EventCard({ event, spaceId, isOwner, accentColor = '#8B5CF6', onCancel }: EventCardProps) {
  const rsvp = useRespondToInvitation();
  const { data: memberCalStatus } = useMyMemberCalendarStatus();
  const connectMemberCal = useConnectMemberCalendar();
  const checkin = useEventCheckin();
  const { toast } = useToast();

  const dt = new Date(event.starts_at);
  const endDt = event.ends_at ? new Date(event.ends_at) : null;
  const myInv = (() => {
    if (!event.my_invitation) return null;
    if (Array.isArray(event.my_invitation)) return event.my_invitation[0] ?? null;
    return event.my_invitation;
  })();
  const myStatus = myInv?.status ?? null;
  const myAttended = (myInv as any)?.attended === true || (event as any).my_attended === true;

  // Check-in habilitado: 15 min antes del inicio hasta 30 min después del fin
  const now = Date.now();
  const checkinStart = dt.getTime() - 15 * 60_000;
  const checkinEnd = (endDt?.getTime() ?? dt.getTime() + 60 * 60_000) + 30 * 60_000;
  const canCheckin = !isOwner && !myAttended && now >= checkinStart && now <= checkinEnd;

  async function handleCheckin() {
    try {
      await checkin.mutateAsync(event.id);
      toast({
        title: '🎥 ¡Asistencia registrada!',
        description: '+20 XP. Sigue así para desbloquear "Asiduo".',
      });
    } catch (e: any) {
      toast({
        title: 'No pudimos registrar tu asistencia',
        description: e?.message ?? 'Intenta de nuevo',
        variant: 'destructive',
      });
    }
  }

  function respond(status: EventInvitationStatus) {
    rsvp.mutate({
      event_id: event.id,
      space_id: spaceId,
      status,
      add_to_google_cal: status === 'accepted' && memberCalStatus?.is_active === true,
    });
  }

  return (
    <Card className="p-4 bg-muted/50 border-border hover:border-border transition-colors">
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{event.title}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border uppercase">
              {event.type}
            </span>
            {event.google_event_id && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                  borderColor: `${accentColor}30`,
                }}
                title="Sincronizado con Google Calendar"
              >
                <Check className="h-2.5 w-2.5" /> Google
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(dt, "PPP 'a las' HH:mm", { locale: es })}
            </span>
            <span>· {event.rsvp_count} invitados</span>
          </div>
          {(() => {
            // safeUrl bloquea javascript: y data: URIs (prevención XSS via meeting_url)
            const meetingHref = safeUrl(event.meeting_url ?? event.google_meet_link);
            if (!meetingHref) return null;
            return (
              <a
                href={meetingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                style={{ color: accentColor }}
              >
                <Video className="h-3 w-3" /> Unirse <ExternalLink className="h-2.5 w-2.5" />
              </a>
            );
          })()}
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {isOwner ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel?.(event)}
              className="text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
            >
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
          ) : (
            <>
              {canCheckin && (
                <Button
                  onClick={handleCheckin}
                  disabled={checkin.isPending}
                  size="sm"
                  className="text-white font-bold rounded-xl shadow-lg motion-safe:animate-pulse"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    boxShadow: '0 4px 12px -2px rgba(124,58,237,0.6)',
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Check-in +20 XP
                </Button>
              )}
              {myAttended && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Asististe
                </span>
              )}
              {(['accepted', 'tentative', 'declined'] as EventInvitationStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => respond(s)}
                  disabled={rsvp.isPending}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded border flex items-center gap-1',
                    myStatus === s
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {myStatus === s && <Check className="h-2.5 w-2.5" />}
                  {s === 'accepted' ? 'Voy' : s === 'tentative' ? 'Tal vez' : 'No voy'}
                </button>
              ))}
              {myStatus === 'accepted' && myInv?.google_calendar_added && (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <Check className="h-2.5 w-2.5" /> En tu Calendar
                </span>
              )}
              {myStatus === 'accepted' && !myInv?.google_calendar_added && !memberCalStatus?.is_active && (
                <button
                  onClick={() => connectMemberCal.mutate()}
                  className="text-[9px] text-muted-foreground hover:text-primary/80 underline"
                >
                  + Mi Calendar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
