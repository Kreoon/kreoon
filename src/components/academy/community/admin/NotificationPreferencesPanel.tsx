// ============================================================================
// Panel de preferencias de notificación del miembro.
// Edita la fila academy_notification_settings(user_id, space_id).
// Si no existe, se crea con defaults al primer toggle.
// ============================================================================

import { useEffect, useState } from 'react';
import { Bell, Volume2, Monitor, UserPlus, MessageSquare, TrendingUp, Sparkles, DollarSign, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props { spaceId: string; }

interface Settings {
  id?: string;
  notify_new_member: boolean;
  notify_new_post: boolean;
  notify_new_comment_on_my_post: boolean;
  notify_reply_to_my_comment: boolean;
  notify_reaction_on_my_post: boolean;
  notify_level_up: boolean;
  notify_payment_received: boolean;
  notify_event_reminder: boolean;
  weekly_digest: boolean;
  sound_enabled: boolean;
  desktop_push_enabled: boolean;
}

const DEFAULTS: Settings = {
  notify_new_member: true,
  notify_new_post: true,
  notify_new_comment_on_my_post: true,
  notify_reply_to_my_comment: true,
  notify_reaction_on_my_post: false,
  notify_level_up: true,
  notify_payment_received: true,
  notify_event_reminder: true,
  weekly_digest: false,
  sound_enabled: false,
  desktop_push_enabled: false,
};

export function NotificationPreferencesPanel({ spaceId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Settings>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ['academy', 'notif-settings', spaceId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from('academy_notification_settings')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data as Settings | null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) setDraft({ ...DEFAULTS, ...data });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const row = { ...draft, user_id: user.id, space_id: spaceId };
      const { error } = await (supabase as any)
        .from('academy_notification_settings')
        .upsert(row, { onConflict: 'space_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'notif-settings', spaceId, user?.id] });
    },
  });

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function requestDesktopPermission(enabled: boolean) {
    set('desktop_push_enabled', enabled);
    if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
    }
  }

  if (isLoading) {
    return <div className="text-zinc-400 text-sm py-8 text-center">Cargando preferencias...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-violet-400" />
          <h3 className="font-semibold">Qué notificaciones querés recibir</h3>
        </div>

        <Toggle
          icon={<UserPlus className="h-4 w-4 text-emerald-400" />}
          label="Nuevos miembros se unen"
          description="Cuando alguien se inscribe a la academia"
          checked={draft.notify_new_member}
          onChange={(v) => set('notify_new_member', v)}
        />
        <Toggle
          icon={<MessageSquare className="h-4 w-4 text-violet-400" />}
          label="Nuevos posts en el feed"
          description="Cuando un miembro publica algo nuevo"
          checked={draft.notify_new_post}
          onChange={(v) => set('notify_new_post', v)}
        />
        <Toggle
          icon={<MessageSquare className="h-4 w-4 text-sky-400" />}
          label="Comentarios en mis posts"
          description="Cuando alguien comenta en algo que publiqué"
          checked={draft.notify_new_comment_on_my_post}
          onChange={(v) => set('notify_new_comment_on_my_post', v)}
        />
        <Toggle
          icon={<MessageSquare className="h-4 w-4 text-sky-400" />}
          label="Respuestas a mis comentarios"
          description="Hilo de discusión activo"
          checked={draft.notify_reply_to_my_comment}
          onChange={(v) => set('notify_reply_to_my_comment', v)}
        />
        <Toggle
          icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
          label="Reacciones en mis posts"
          description="Puede ser ruidoso si publicás seguido"
          checked={draft.notify_reaction_on_my_post}
          onChange={(v) => set('notify_reaction_on_my_post', v)}
        />
        <Toggle
          icon={<Sparkles className="h-4 w-4 text-amber-400" />}
          label="Cuando subo de nivel"
          description="Solo a vos cuando alcanzás un nivel nuevo"
          checked={draft.notify_level_up}
          onChange={(v) => set('notify_level_up', v)}
        />
        <Toggle
          icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
          label="Pagos / ingresos recibidos"
          description="Si sos owner: cada vez que entra dinero a tu academia"
          checked={draft.notify_payment_received}
          onChange={(v) => set('notify_payment_received', v)}
        />
        <Toggle
          icon={<Bell className="h-4 w-4 text-zinc-400" />}
          label="Recordatorios de eventos"
          description="30 min antes de cada evento del calendario"
          checked={draft.notify_event_reminder}
          onChange={(v) => set('notify_event_reminder', v)}
        />
        <Toggle
          icon={<Bell className="h-4 w-4 text-zinc-400" />}
          label="Resumen semanal por email"
          description="Lo más relevante de tu academia, cada lunes"
          checked={draft.weekly_digest}
          onChange={(v) => set('weekly_digest', v)}
        />
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <h3 className="font-semibold">Cómo recibirlas</h3>
        <Toggle
          icon={<Volume2 className="h-4 w-4 text-violet-400" />}
          label="Sonido"
          description="Pequeño tono al llegar una notif (cuando la app está abierta)"
          checked={draft.sound_enabled}
          onChange={(v) => set('sound_enabled', v)}
        />
        <Toggle
          icon={<Monitor className="h-4 w-4 text-violet-400" />}
          label="Notificaciones de escritorio"
          description="Te aparecen en el sistema operativo aunque tengas otra pestaña"
          checked={draft.desktop_push_enabled}
          onChange={requestDesktopPermission}
        />
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="bg-violet-500 hover:bg-violet-600 text-white"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? 'Guardando...' : 'Guardar preferencias'}
      </Button>
    </div>
  );
}

function Toggle({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="flex gap-3 flex-1 min-w-0">
        <div className="mt-0.5">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100">{label}</div>
          <div className="text-xs text-zinc-500">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
