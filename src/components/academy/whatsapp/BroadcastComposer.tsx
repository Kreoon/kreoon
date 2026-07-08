import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  spaceId: string;
  accentColor?: string;
}

type Audience = 'all' | 'tier' | 'level' | 'inactive';

export function BroadcastComposer({ spaceId, accentColor = '#8B5CF6' }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [audience, setAudience] = useState<Audience>('all');
  const [tierSlug, setTierSlug] = useState('');
  const [minLevel, setMinLevel] = useState<number | ''>('');
  const [maxInactiveDays, setMaxInactiveDays] = useState<number | ''>('');
  const [message, setMessage] = useState('');

  // Historial reciente
  const { data: history } = useQuery({
    queryKey: ['academy-wa-broadcasts', spaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_wa_broadcasts')
        .select('id, message_text, sent_count, failed_count, status, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('not_authenticated');
      if (!message.trim()) throw new Error('message_required');

      const audienceFilter: Record<string, unknown> = {};
      if (audience === 'tier' && tierSlug) audienceFilter.tier = tierSlug;
      if (audience === 'level' && minLevel) audienceFilter.min_level = Number(minLevel);
      if (audience === 'inactive' && maxInactiveDays) audienceFilter.max_inactive_days = Number(maxInactiveDays);

      // 1. Crear el broadcast en pending
      const { data: broadcast, error } = await supabase
        .from('academy_wa_broadcasts')
        .insert({
          space_id: spaceId,
          sender_user_id: user.id,
          audience_filter: audienceFilter,
          message_text: message,
          variables: ['__member_name__', message],
          status: 'pending',
        })
        .select('id')
        .single();

      if (error || !broadcast) throw error ?? new Error('insert_failed');

      // 2. Invocar el worker
      const { data, error: invokeErr } = await supabase.functions.invoke('academy-wa-broadcast', {
        body: { broadcast_id: broadcast.id },
      });

      if (invokeErr) throw invokeErr;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Broadcast enviado: ${data.sent} ok / ${data.failed} fallo`);
      setMessage('');
      qc.invalidateQueries({ queryKey: ['academy-wa-broadcasts', spaceId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10 p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Send className="h-4 w-4" style={{ color: accentColor }} />
            Broadcast WhatsApp
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Envía un mensaje a los miembros de tu space que tienen WhatsApp activado.
          </p>
        </div>

        {/* Audience selector */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Audiencia</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'tier', label: 'Por tier' },
              { id: 'level', label: 'Por nivel mínimo' },
              { id: 'inactive', label: 'Inactivos' },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => setAudience(a.id as Audience)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  audience === a.id
                    ? 'bg-white/10 text-zinc-100 border border-white/20'
                    : 'text-zinc-400 hover:bg-white/5 border border-transparent'
                }`}
                style={audience === a.id ? { borderColor: accentColor } : undefined}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {audience === 'tier' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Tier slug (ej: pro, vip)</Label>
            <Input
              value={tierSlug}
              onChange={(e) => setTierSlug(e.target.value)}
              placeholder="pro"
              className="bg-white/5 border-white/10"
            />
          </div>
        )}

        {audience === 'level' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Nivel mínimo</Label>
            <Input
              type="number"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="3"
              className="bg-white/5 border-white/10"
            />
          </div>
        )}

        {audience === 'inactive' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Días sin actividad ≥</Label>
            <Input
              type="number"
              value={maxInactiveDays}
              onChange={(e) => setMaxInactiveDays(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="14"
              className="bg-white/5 border-white/10"
            />
          </div>
        )}

        {/* Message */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Mensaje (template academy_broadcast)</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe el mensaje a enviar. Se enviará el template academy_broadcast con {{1}}=nombre miembro, {{2}}=este texto."
            rows={4}
            className="bg-white/5 border-white/10 text-sm"
          />
          <p className="text-[10px] text-zinc-500">
            ⚠️ Template MARKETING — solo se envía a miembros con whatsapp_enabled (opt-in).
          </p>
        </div>

        <Button
          onClick={() => sendMutation.mutate()}
          disabled={!message.trim() || sendMutation.isPending}
          style={{ backgroundColor: accentColor }}
          className="w-full"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" /> Enviar broadcast
            </>
          )}
        </Button>
      </Card>

      {/* History */}
      {!!history?.length && (
        <Card className="bg-white/5 border-white/10 p-5 space-y-3">
          <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <History className="h-4 w-4 text-zinc-400" /> Últimos broadcasts
          </h4>
          {history.map((b: any) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 border-t border-white/5 pt-3 first:border-t-0 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-300 truncate">{b.message_text}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {new Date(b.created_at).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className="border-white/10 text-zinc-400 text-[10px]">
                  {b.status}
                </Badge>
                <span className="text-[10px] text-zinc-500">
                  {b.sent_count} ok · {b.failed_count} ✗
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
