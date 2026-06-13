import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Link2, MessageCircle, Sparkles, Send, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WhatsAppTemplatesPanel } from './WhatsAppTemplatesPanel';
import { BroadcastComposer } from './BroadcastComposer';

interface Props {
  spaceId: string;
  spaceSlug: string;
  accentColor?: string;
}

type SubTab = 'group' | 'templates' | 'broadcast' | 'summaries';

export function WhatsAppHubPanel({ spaceId, spaceSlug, accentColor = '#8B5CF6' }: Props) {
  const [subtab, setSubtab] = useState<SubTab>('group');

  const TABS: { id: SubTab; label: string; icon: any }[] = [
    { id: 'group', label: 'Grupo', icon: Link2 },
    { id: 'templates', label: 'Plantillas', icon: MessageCircle },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'summaries', label: 'Resúmenes IA', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-white/5 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubtab(t.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              subtab === t.id ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/5'
            }`}
            style={subtab === t.id ? { color: accentColor } : undefined}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {subtab === 'group' && <GroupConfig spaceId={spaceId} accentColor={accentColor} />}
      {subtab === 'templates' && <WhatsAppTemplatesPanel accentColor={accentColor} />}
      {subtab === 'broadcast' && (
        <BroadcastComposer spaceId={spaceId} accentColor={accentColor} />
      )}
      {subtab === 'summaries' && <SummariesPanel spaceId={spaceId} spaceSlug={spaceSlug} />}
    </div>
  );
}

// ─── Group config ────────────────────────────────────────────
function GroupConfig({ spaceId, accentColor }: { spaceId: string; accentColor: string }) {
  const qc = useQueryClient();
  const [inviteUrl, setInviteUrl] = useState('');
  const [groupName, setGroupName] = useState('');

  const { data: group, isLoading } = useQuery({
    queryKey: ['academy-wa-group', spaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_space_whatsapp_groups')
        .select('*')
        .eq('space_id', spaceId)
        .maybeSingle();
      if (data) {
        setInviteUrl(data.group_invite_url ?? '');
        setGroupName(data.group_name ?? '');
      }
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('academy_space_whatsapp_groups')
        .upsert({
          space_id: spaceId,
          group_invite_url: inviteUrl,
          group_name: groupName || null,
          auto_invite_on_join: group?.auto_invite_on_join ?? true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grupo conectado');
      qc.invalidateQueries({ queryKey: ['academy-wa-group', spaceId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const toggleAutoInviteMutation = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase
        .from('academy_space_whatsapp_groups')
        .update({ auto_invite_on_join: val })
        .eq('space_id', spaceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-wa-group', spaceId] }),
  });

  if (isLoading) return <div className="text-zinc-500 text-sm p-4">Cargando…</div>;

  return (
    <Card className="bg-white/5 border-white/10 p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
          <Link2 className="h-4 w-4" style={{ color: accentColor }} />
          Conectar grupo de WhatsApp
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Pega el invite link del grupo. Los nuevos miembros recibirán el link en el WA de bienvenida.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-zinc-400">Nombre del grupo (opcional)</Label>
        <Input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Comunidad CRION"
          className="bg-white/5 border-white/10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-zinc-400">Invite URL</Label>
        <Input
          value={inviteUrl}
          onChange={(e) => setInviteUrl(e.target.value)}
          placeholder="https://chat.whatsapp.com/XXXXXX"
          className="bg-white/5 border-white/10 font-mono text-xs"
        />
      </div>

      {group && (
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="text-xs text-zinc-400">
            <p>Auto-invite al inscribirse</p>
            <p className="text-zinc-500 text-[10px]">Incluye el link en el template de bienvenida</p>
          </div>
          <Switch
            checked={group.auto_invite_on_join}
            onCheckedChange={(v) => toggleAutoInviteMutation.mutate(v)}
          />
        </div>
      )}

      <Button
        onClick={() => upsertMutation.mutate()}
        disabled={!inviteUrl.trim() || upsertMutation.isPending}
        style={{ backgroundColor: accentColor }}
        className="w-full"
      >
        {group ? 'Actualizar' : 'Conectar grupo'}
      </Button>
    </Card>
  );
}

// ─── Summaries ───────────────────────────────────────────────
function SummariesPanel({ spaceId, spaceSlug }: { spaceId: string; spaceSlug: string }) {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ['academy-wa-summaries', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_wa_summaries')
        .select('*')
        .eq('space_id', spaceId)
        .order('summary_date', { ascending: false })
        .limit(14);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="text-zinc-500 text-sm p-4">Cargando resúmenes…</div>;
  if (!summaries?.length)
    return (
      <Card className="bg-white/5 border-white/10 p-6 text-center text-zinc-400 text-sm">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
        No hay resúmenes aún. Se generan automáticamente a las 20:00 UTC.
      </Card>
    );

  return (
    <div className="space-y-3">
      {summaries.map((s: any) => (
        <Card key={s.id} className="bg-white/5 border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-100">
              {new Date(s.summary_date).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <div className="flex gap-2 text-xs text-zinc-400">
              <Badge variant="outline" className="border-white/10 text-zinc-300">
                <Users className="h-3 w-3 mr-1" /> {s.active_members}
              </Badge>
              <Badge variant="outline" className="border-white/10 text-zinc-300">
                <MessageCircle className="h-3 w-3 mr-1" /> {s.total_messages}
              </Badge>
            </div>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-zinc-300 text-xs whitespace-pre-wrap">
            {s.summary_md}
          </div>
        </Card>
      ))}
    </div>
  );
}
