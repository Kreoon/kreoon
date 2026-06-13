// ============================================================================
// Centro global de notificaciones para academia.
// Montar UNA vez en main.tsx — se suscribe a las notifs del usuario logueado y
// emite toasts cuando llega un evento nuevo, además de campanita persistente
// en el header.
// ============================================================================

import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, CheckCheck, UserPlus, MessageSquare, TrendingUp, DollarSign, Sparkles } from 'lucide-react';
import { useAcademyNotifications, type AcademyNotification } from '@/hooks/academy/useAcademyLive';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function iconForType(type: string) {
  switch (type) {
    case 'new_member':       return <UserPlus className="h-4 w-4 text-emerald-400" />;
    case 'new_post':         return <MessageSquare className="h-4 w-4 text-violet-400" />;
    case 'new_comment':      return <MessageSquare className="h-4 w-4 text-sky-400" />;
    case 'level_up':         return <Sparkles className="h-4 w-4 text-amber-400" />;
    case 'payment_received': return <DollarSign className="h-4 w-4 text-emerald-400" />;
    default:                 return <Bell className="h-4 w-4 text-zinc-400" />;
  }
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export function AcademyNotificationCenter() {
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { notifications, unreadCount, markAsRead, markAllRead } = useAcademyNotifications({
    onNew: (n) => {
      // Toast inmediato con el icono según tipo
      toast(n.title, {
        description: n.body ?? undefined,
        icon: iconForType(n.type),
        duration: 6000,
        action: n.link
          ? { label: 'Ver', onClick: () => { window.location.href = n.link!; } }
          : undefined,
      });

      // Sonido opcional (silencioso si el audio no está disponible)
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => {});
        }
      } catch { /* ignore */ }

      // Desktop notification si el user lo aceptó previamente
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body ?? '', tag: n.id });
        }
      } catch { /* ignore */ }
    },
  });

  return (
    <>
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
        preload="auto"
      />

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 max-h-[70vh] overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <span className="font-semibold text-sm text-zinc-100">Notificaciones</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100"
                  >
                    <CheckCheck className="h-3 w-3" /> Marcar leídas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">Sin notificaciones aún</div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {notifications.map((n) => (
                    <NotifRow key={n.id} n={n} onClick={() => markAsRead(n.id)} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function NotifRow({ n, onClick }: { n: AcademyNotification; onClick: () => void }) {
  const body = (
    <div
      className={cn(
        'flex gap-2 px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer',
        !n.is_read && 'bg-violet-500/5'
      )}
      onClick={onClick}
    >
      <div className="mt-0.5">{iconForType(n.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-zinc-100 line-clamp-2">{n.title}</div>
        {n.body && <div className="text-[11px] text-zinc-500 line-clamp-1">{n.body}</div>}
        <div className="text-[10px] text-zinc-600 mt-0.5">{relTime(n.created_at)}</div>
      </div>
      {!n.is_read && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
    </div>
  );
  return n.link ? <Link to={n.link}>{body}</Link> : body;
}
