import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, Video } from 'lucide-react';
import { BigCard } from './BigCard';
import { safeUrl } from '@/lib/safeUrl';

interface EventLike {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  cover_image_url?: string | null;
  meeting_url?: string | null;
  google_meet_link?: string | null;
  rsvp_count?: number | null;
  emoji?: string | null;
}

interface EventBigCardProps {
  event: EventLike;
  accentColor?: string;
  compact?: boolean;
}

export function EventBigCard({ event, accentColor = '#8B5CF6', compact = false }: EventBigCardProps) {
  const dt = new Date(event.starts_at);
  const meetUrl = safeUrl(event.meeting_url ?? event.google_meet_link);
  const emoji = event.emoji ?? '🎬';
  const isToday = new Date().toDateString() === dt.toDateString();

  if (compact) {
    return (
      <BigCard accentColor={accentColor} className="p-3">
        <div className="flex items-center gap-3">
          {/* Date chip */}
          <div
            className="flex-shrink-0 rounded-2xl px-2.5 py-2 text-center min-w-[54px]"
            style={{
              background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
              border: `2px solid ${accentColor}40`,
            }}
          >
            <div className="text-[10px] font-bold uppercase" style={{ color: accentColor }}>
              {format(dt, 'MMM', { locale: es })}
            </div>
            <div className="text-2xl font-extrabold leading-none text-white">
              {format(dt, 'd')}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm" aria-hidden="true">{emoji}</span>
              <div className="text-sm font-bold text-zinc-100 truncate">{event.title}</div>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>{format(dt, 'HH:mm')}</span>
              {event.rsvp_count != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {event.rsvp_count}
                </span>
              )}
            </div>
            {meetUrl && (
              <a
                href={meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold mt-0.5 inline-flex items-center gap-1"
                style={{ color: accentColor }}
              >
                <Video className="h-3 w-3" aria-hidden="true" /> Unirme
              </a>
            )}
          </div>
          {isToday && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 motion-safe:animate-pulse">
              HOY
            </span>
          )}
        </div>
      </BigCard>
    );
  }

  return (
    <BigCard accentColor={accentColor} glow>
      {/* Cover banner */}
      <div
        className="relative aspect-[3/1] w-full overflow-hidden"
        style={
          !event.cover_image_url
            ? { background: `linear-gradient(135deg, ${accentColor}50, ${accentColor}10)` }
            : undefined
        }
      >
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl" aria-hidden="true">
            {emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Date overlay */}
        <div
          className="absolute top-4 left-4 rounded-2xl px-3 py-2 text-center backdrop-blur-md shadow-xl"
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: `2px solid ${accentColor}80`,
          }}
        >
          <div className="text-[10px] font-bold uppercase" style={{ color: accentColor }}>
            {format(dt, 'MMM', { locale: es })}
          </div>
          <div className="text-3xl font-extrabold leading-none text-white">
            {format(dt, 'd')}
          </div>
        </div>

        {isToday && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-extrabold shadow-lg motion-safe:animate-pulse">
            🔴 HOY
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        <h3 className="font-extrabold text-lg md:text-xl text-white leading-tight line-clamp-2">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
            {format(dt, "EEEE d 'a las' HH:mm", { locale: es })}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {event.rsvp_count != null && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {event.rsvp_count} {event.rsvp_count === 1 ? 'asistente' : 'asistentes'}
            </span>
          )}
          {meetUrl && (
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm text-white shadow-lg motion-safe:hover:scale-105 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              }}
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Unirme al live
            </a>
          )}
        </div>
      </div>
    </BigCard>
  );
}
