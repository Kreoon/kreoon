import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  useAcademyNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationsRead,
} from '@/hooks/academy/useAcademyCommunityV3';

interface NotificationBellProps {
  spaceId: string;
  accentColor?: string;
}

export function NotificationBell({ spaceId, accentColor = '#8B5CF6' }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useAcademyNotifications(spaceId);
  const { data: unread = 0 } = useUnreadNotificationsCount(spaceId);
  const markRead = useMarkNotificationsRead();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  function handleClick(n: { link: string | null; id: string }) {
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-zinc-300 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-h-[28rem] rounded-xl border border-white/10 bg-[#0c0c16] shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            {unread > 0 && (
              <button
                onClick={() => markRead.mutate(spaceId)}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Marcar todo
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">Sin notificaciones aún</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-white/5 transition-colors',
                        !n.is_read && 'bg-purple-500/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar profile={n.sender} accentColor={accentColor} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-100 line-clamp-2">{n.title}</div>
                          {n.body && (
                            <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.body}</div>
                          )}
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {(() => {
                              try {
                                return formatDistanceToNow(new Date(n.created_at), {
                                  locale: es,
                                  addSuffix: true,
                                });
                              } catch {
                                return '';
                              }
                            })()}
                          </div>
                        </div>
                        {!n.is_read && (
                          <span
                            className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: accentColor }}
                          />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ profile, accentColor }: { profile: any; accentColor: string }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
      style={{ backgroundColor: `${accentColor}40` }}
    >
      {(profile?.full_name ?? 'K').charAt(0).toUpperCase()}
    </div>
  );
}
