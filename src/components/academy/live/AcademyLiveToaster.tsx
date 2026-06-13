// ============================================================================
// AcademyLiveToaster — emite toasts globales cuando llega cualquier notif
// del streaming layer. Montar UNA vez (p.ej. en main.tsx) para que funcione
// en toda la app, sin importar en qué página esté el usuario.
//
// La campana persistente la sigue manejando NotificationBell dentro de cada
// SpaceNavbar; este componente es solo la capa de "popup transitorio".
// ============================================================================

import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, MessageSquare, Sparkles, DollarSign, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useAcademyNotifications } from '@/hooks/academy/useAcademyLive';
import { useAuth } from '@/hooks/useAuth';

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

export function AcademyLiveToaster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hook que ya hace realtime + cache invalidation; aquí solo decoramos.
  useAcademyNotifications({
    onNew: (n) => {
      toast(n.title, {
        description: n.body ?? undefined,
        icon: iconForType(n.type),
        duration: 6000,
        action: n.link
          ? { label: 'Ver', onClick: () => navigate(n.link!) }
          : undefined,
      });

      // Sonido opcional silencioso si no hay permiso/contexto
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => {});
        }
      } catch { /* ignore */ }

      // Notificación nativa de escritorio si el user la habilitó
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body ?? '', tag: n.id });
        }
      } catch { /* ignore */ }
    },
  });

  if (!user) return null;

  return (
    <audio
      ref={audioRef}
      src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
      preload="auto"
      aria-hidden="true"
    />
  );
}
