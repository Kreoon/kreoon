// ============================================================================
// Activity Sidebar — panel lateral tipo Discord con eventos del space.
// Muestra: nuevos miembros, posts, level-ups, ingresos (si es owner).
// ============================================================================

import { Activity, UserPlus, MessageSquare, Sparkles, DollarSign, Bell } from 'lucide-react';
import { useAcademyActivityFeed, useAcademyLiveContent } from '@/hooks/academy/useAcademyLive';
import { PresenceBadge } from './PresenceBadge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

function iconForType(type: string) {
  switch (type) {
    case 'new_member':       return <UserPlus className="h-3.5 w-3.5 text-emerald-400" />;
    case 'new_post':         return <MessageSquare className="h-3.5 w-3.5 text-violet-400" />;
    case 'level_up':         return <Sparkles className="h-3.5 w-3.5 text-amber-400" />;
    case 'payment_received': return <DollarSign className="h-3.5 w-3.5 text-emerald-400" />;
    default:                 return <Bell className="h-3.5 w-3.5 text-zinc-400" />;
  }
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface ActivitySidebarProps {
  spaceId: string | null | undefined;
  className?: string;
}

export function ActivitySidebar({ spaceId, className }: ActivitySidebarProps) {
  // Activa el live feed para que posts/comments/points se refresquen solos
  useAcademyLiveContent(spaceId);
  const { data: events = [], isLoading } = useAcademyActivityFeed(spaceId);

  return (
    <aside
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm',
        'flex flex-col overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-sm">En vivo</span>
        </div>
        <PresenceBadge spaceId={spaceId} variant="compact" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-zinc-500 text-xs">Cargando...</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs">
            Nada por aquí todavía. Cuando alguien se una, publique o suba de nivel, vas a verlo en tiempo real.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {events.map((e) => {
              const body = (
                <div className="flex gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                  <div className="mt-0.5">{iconForType(e.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-zinc-100 line-clamp-2">{e.title}</div>
                    {e.body && (
                      <div className="text-[11px] text-zinc-500 line-clamp-1">{e.body}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600 whitespace-nowrap mt-1">
                    {relTime(e.created_at)}
                  </span>
                </div>
              );
              return (
                <li key={e.id}>{e.link ? <Link to={e.link}>{body}</Link> : body}</li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
