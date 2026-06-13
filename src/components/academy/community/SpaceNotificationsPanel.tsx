import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SpaceNotificationSettings } from '@/types/academy-community';

interface SpaceNotificationsPanelProps {
  spaceId: string;
  isOwner?: boolean;
}

const ADMIN_FIELDS: { key: keyof SpaceNotificationSettings; label: string }[] = [
  { key: 'notify_membership_request', label: 'Nueva solicitud de membresía' },
  { key: 'notify_new_post', label: 'Nuevo post en mi space' },
  { key: 'notify_new_customer_email', label: 'Nuevo email de cliente' },
  { key: 'notify_reported_content', label: 'Contenido reportado' },
];

const MEMBER_FIELDS: { key: keyof SpaceNotificationSettings; label: string }[] = [
  { key: 'notify_new_comment_on_my_post', label: 'Nuevo comentario en mi post' },
  { key: 'notify_reply_to_my_comment', label: 'Respuesta a mi comentario' },
  { key: 'notify_reaction_on_my_post', label: 'Reacción en mi post' },
  { key: 'notify_new_post_in_category', label: 'Nuevo post en categorías que sigo' },
  { key: 'notify_new_lesson', label: 'Nueva lección publicada' },
  { key: 'notify_event_reminder', label: 'Recordatorio de evento' },
];

const EMAIL_FIELDS: { key: keyof SpaceNotificationSettings; label: string }[] = [
  { key: 'weekly_digest', label: 'Digest semanal por email' },
  { key: 'daily_notifications', label: 'Notificaciones diarias por email' },
  { key: 'admin_broadcast', label: 'Mensajes broadcast del admin' },
];

export function SpaceNotificationsPanel({ spaceId, isOwner }: SpaceNotificationsPanelProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Partial<SpaceNotificationSettings>>({});

  const { data } = useQuery({
    queryKey: ['academy', 'notif-settings', spaceId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('academy_notification_settings')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as SpaceNotificationSettings | null;
    },
    enabled: !!spaceId && !!user,
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      const { error } = await (supabase as any).from('academy_notification_settings').upsert(
        {
          space_id: spaceId,
          user_id: user.id,
          ...draft,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'space_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'notif-settings', spaceId] }),
  });

  function toggle(key: keyof SpaceNotificationSettings) {
    setDraft((d) => ({ ...d, [key]: !d[key] }));
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <Section title="Admin" fields={ADMIN_FIELDS} draft={draft} onToggle={toggle} />
      )}
      <Section title="Mis notificaciones" fields={MEMBER_FIELDS} draft={draft} onToggle={toggle} />
      <Section title="Email" fields={EMAIL_FIELDS} draft={draft} onToggle={toggle} />
      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="bg-purple-500 hover:bg-purple-600 text-white"
      >
        {save.isPending ? 'Guardando...' : 'Guardar preferencias'}
      </Button>
    </div>
  );
}

function Section({
  title,
  fields,
  draft,
  onToggle,
}: {
  title: string;
  fields: { key: keyof SpaceNotificationSettings; label: string }[];
  draft: Partial<SpaceNotificationSettings>;
  onToggle: (key: keyof SpaceNotificationSettings) => void;
}) {
  return (
    <Card className="p-5 bg-white/5 border-white/10">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-1">
        {fields.map((f) => (
          <label
            key={f.key as string}
            className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 px-2 rounded"
          >
            <span className="text-sm">{f.label}</span>
            <button
              type="button"
              onClick={() => onToggle(f.key)}
              className={cn(
                'relative w-9 h-5 rounded-full transition-colors',
                draft[f.key] ? 'bg-purple-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                  draft[f.key] ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
          </label>
        ))}
      </div>
    </Card>
  );
}
