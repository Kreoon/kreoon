// ============================================================================
// Tab Afiliados: opt-in + comisión + tu link + lista de afiliados.
// Reemplaza la versión legacy (que solo guardaba metadata) por una integración
// real con academy_affiliate_links + RPC get_or_create_affiliate_link.
// ============================================================================

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Copy, Handshake, MousePointerClick, Sparkles, DollarSign, Save, Users, Power,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props { spaceId: string; spaceSlug: string; accentColor?: string; }

interface SpaceConfig {
  owner_id: string;
  affiliates_enabled: boolean;
  affiliates_default_commission_pct: number;
}

export function AffiliatesAdminTab({ spaceId, spaceSlug, accentColor = '#8B5CF6' }: Props) {
  const { user } = useAuth();

  const { data: spaceCfg } = useQuery<SpaceConfig>({
    queryKey: ['academy', 'affiliate-cfg', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .select('owner_id, affiliates_enabled, affiliates_default_commission_pct')
        .eq('id', spaceId)
        .single();
      if (error) throw error;
      return data as SpaceConfig;
    },
  });

  const isOwner = !!user && spaceCfg?.owner_id === user.id;
  const isEnabled = !!spaceCfg?.affiliates_enabled;

  return (
    <div className="space-y-4">
      {isOwner && <OwnerConfig cfg={spaceCfg} spaceId={spaceId} />}

      {!isEnabled ? (
        <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-400">
          <Handshake className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-zinc-300">Programa de afiliados no activo</p>
          <p className="text-xs mt-1">
            {isOwner
              ? 'Activá el toggle de arriba para que tus miembros generen links de referido.'
              : 'El owner aún no habilitó el programa de afiliados en esta academia.'}
          </p>
        </Card>
      ) : (
        <>
          <MyAffiliateLink spaceId={spaceId} spaceSlug={spaceSlug} accentColor={accentColor} />
          {isOwner && <OwnerAffiliatesList spaceId={spaceId} accentColor={accentColor} />}
        </>
      )}
    </div>
  );
}

function OwnerConfig({ cfg, spaceId }: { cfg?: SpaceConfig; spaceId: string }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState<boolean>(cfg?.affiliates_enabled ?? false);
  const [pct, setPct] = useState<string>(String(cfg?.affiliates_default_commission_pct ?? 20));

  useEffect(() => {
    if (cfg) {
      setEnabled(cfg.affiliates_enabled);
      setPct(String(cfg.affiliates_default_commission_pct));
    }
  }, [cfg?.affiliates_enabled, cfg?.affiliates_default_commission_pct]);

  const save = useMutation({
    mutationFn: async () => {
      const pctNum = Math.max(0, Math.min(50, Number(pct) || 0));
      const { error } = await (supabase as any)
        .from('academy_spaces')
        .update({
          affiliates_enabled: enabled,
          affiliates_default_commission_pct: pctNum,
        })
        .eq('id', spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'affiliate-cfg', spaceId] });
      toast.success('Configuración actualizada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <Card className="p-5 bg-white/5 border-white/10 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Power className="h-4 w-4 text-violet-400" /> Programa de afiliados
      </h3>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Activar programa</Label>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Cuando ON, miembros generan links y ganan comisión por cada referido que pague.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <Label>Comisión por defecto (%)</Label>
          <Input
            type="number" min={0} max={50} step={0.5}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="bg-black/30 border-white/10"
          />
          <p className="text-[10px] text-zinc-500 mt-0.5">Entre 0% y 50%</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}
                className="bg-violet-500 hover:bg-violet-600 text-white">
          <Save className="h-4 w-4 mr-2" /> Guardar
        </Button>
      </div>
    </Card>
  );
}

function MyAffiliateLink({ spaceId, spaceSlug, accentColor }: { spaceId: string; spaceSlug: string; accentColor: string }) {
  const { data: link, isLoading, error } = useQuery({
    queryKey: ['academy', 'my-affiliate-link', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_or_create_affiliate_link', {
        p_space_id: spaceId,
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  if (isLoading) return <Card className="p-6 text-center text-zinc-500 text-sm">Cargando tu link...</Card>;
  if (error || !link) return null;

  const url = `${window.location.origin}/a/${spaceSlug}?ref=${encodeURIComponent(link.code)}`;
  const earned = Number(link.earned_total_usd ?? 0);
  const pct = Number(link.commission_pct ?? 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <>
      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Handshake className="h-4 w-4" style={{ color: accentColor }} /> Tu link de afiliado
        </h3>
        <div className="flex gap-2">
          <Input value={url} readOnly className="bg-black/30 border-white/10 font-mono text-xs" />
          <Button onClick={copy} className="text-white" style={{ backgroundColor: accentColor }}>
            <Copy className="h-4 w-4 mr-1.5" /> Copiar
          </Button>
        </div>
        <p className="text-xs text-zinc-400">
          Comisión: <strong>{pct}%</strong> sobre cada miembro que se suscriba usando tu link.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={MousePointerClick} label="Clicks únicos" value={link.clicks.toLocaleString()} accent="#a78bfa" />
        <StatCard icon={Sparkles} label="Conversiones" value={link.conversions.toLocaleString()} accent="#10b981" />
        <StatCard icon={DollarSign} label="Ganado" value={`$${earned.toFixed(2)}`} accent="#f59e0b" />
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-2"
           style={{ backgroundColor: `${accent}26` }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] text-zinc-300 uppercase tracking-wide mt-1">{label}</div>
    </Card>
  );
}

function OwnerAffiliatesList({ spaceId, accentColor }: { spaceId: string; accentColor: string }) {
  const { data: links = [] } = useQuery({
    queryKey: ['academy', 'affiliates-list', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_affiliate_links')
        .select('id, code, commission_pct, clicks, conversions, earned_total_usd, is_active, created_at, user_id')
        .eq('space_id', spaceId)
        .order('earned_total_usd', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (links.length === 0) {
    return (
      <Card className="p-6 text-center text-zinc-500 text-sm">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Aún no hay afiliados generando links.
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-white/5 border-white/10">
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" style={{ color: accentColor }} />
        Afiliados ({links.length})
      </h3>
      <ul className="divide-y divide-white/5">
        {(links as any[]).map((l) => (
          <li key={l.id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-100 truncate font-mono">{l.code}</div>
              <div className="text-[11px] text-zinc-500">user {String(l.user_id).slice(0, 8)} · {l.commission_pct}%</div>
            </div>
            <div className="text-right text-xs">
              <div className="text-zinc-300">{l.clicks} clicks · {l.conversions} conv.</div>
              <div className="font-bold" style={{ color: accentColor }}>
                ${Number(l.earned_total_usd ?? 0).toFixed(2)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
