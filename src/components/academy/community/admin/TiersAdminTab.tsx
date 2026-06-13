// ============================================================================
// Tab Tiers de membresía: Bronce/Plata/Oro o tiers custom por academia.
// Cada tier: nombre, descripción, features[], precios mensual/anual,
// badge_color, sort_order. Para activar pricing por tier, el owner los crea
// acá y el JoinGate los muestra como selector.
// ============================================================================

import { useState } from 'react';
import { Plus, Trash2, Crown, Loader2, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useAcademyTiers, useCreateTier, useUpdateTier, useDeleteTier,
  type AcademyMembershipTier,
} from '@/hooks/academy/useAcademyTiersAndBundles';

interface Props { spaceId: string; accentColor?: string; }

export function TiersAdminTab({ spaceId, accentColor = '#8B5CF6' }: Props) {
  const { data: tiers = [], isLoading } = useAcademyTiers(spaceId);
  const [openCreate, setOpenCreate] = useState(false);
  const update = useUpdateTier(spaceId);
  const del = useDeleteTier(spaceId);

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white/5 border-white/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4" style={{ color: accentColor }} />
              Tiers de membresía
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Definí planes con distintos precios y features. Los miembros eligen al suscribirse.
            </p>
          </div>
          <Button onClick={() => setOpenCreate(true)} className="text-white" style={{ backgroundColor: accentColor }}>
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo tier
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 mx-auto animate-spin" />
        </Card>
      ) : tiers.length === 0 ? (
        <Card className="p-10 text-center text-zinc-500">
          <Crown className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-zinc-300">Sin tiers aún</p>
          <p className="text-xs mt-1">Creá Bronce/Plata/Oro o tus propios niveles.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tiers.map((t) => (
            <TierCard
              key={t.id}
              tier={t}
              accentColor={accentColor}
              onDelete={async () => {
                if (!confirm(`¿Eliminar tier ${t.name}? Los miembros actuales en ese tier no se desuscriben.`)) return;
                try {
                  await del.mutateAsync(t.id);
                  toast.success('Tier eliminado');
                } catch (e: any) { toast.error(e?.message ?? 'Error'); }
              }}
              onUpdate={async (patch) => {
                try { await update.mutateAsync({ id: t.id, patch }); toast.success('Tier actualizado'); }
                catch (e: any) { toast.error(e?.message ?? 'Error'); }
              }}
            />
          ))}
        </div>
      )}

      <CreateTierDialog open={openCreate} onOpenChange={setOpenCreate} spaceId={spaceId} accentColor={accentColor} />
    </div>
  );
}

function TierCard({
  tier, accentColor, onDelete, onUpdate,
}: {
  tier: AcademyMembershipTier;
  accentColor: string;
  onDelete: () => void;
  onUpdate: (patch: Partial<AcademyMembershipTier>) => void;
}) {
  const badge = tier.badge_color || accentColor;
  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: `${badge}26` }}>
          <Crown className="h-6 w-6" style={{ color: badge }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-base" style={{ color: badge }}>{tier.name}</h4>
            <code className="text-[10px] text-zinc-500 font-mono">{tier.tier_slug}</code>
          </div>
          {tier.description && <p className="text-xs text-zinc-400 mt-1">{tier.description}</p>}
          <div className="flex gap-4 mt-2 text-xs">
            {tier.monthly_price_usd != null && (
              <span className="text-zinc-300">${tier.monthly_price_usd}/mes</span>
            )}
            {tier.yearly_price_usd != null && (
              <span className="text-zinc-300">${tier.yearly_price_usd}/año</span>
            )}
          </div>
          {Array.isArray(tier.features) && tier.features.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {tier.features.map((f, idx) => (
                <li key={idx} className="text-xs text-zinc-400 flex items-start gap-1">
                  <span style={{ color: badge }}>✓</span> {f}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar tier">
          <Trash2 className="h-4 w-4 text-rose-400" />
        </Button>
      </div>
    </Card>
  );
}

function CreateTierDialog({
  open, onOpenChange, spaceId, accentColor,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; spaceId: string; accentColor: string;
}) {
  const create = useCreateTier();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [badge, setBadge] = useState('#cd7f32');

  const reset = () => {
    setSlug(''); setName(''); setDescription('');
    setMonthly(''); setYearly(''); setFeatures(['']);
    setBadge('#cd7f32');
  };

  const submit = async () => {
    if (!name.trim()) return toast.error('Nombre obligatorio');
    if (!slug.trim()) return toast.error('Slug obligatorio');
    const filteredFeatures = features.map((f) => f.trim()).filter(Boolean);
    try {
      await create.mutateAsync({
        space_id: spaceId,
        tier_slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        name: name.trim(),
        description: description.trim() || null,
        monthly_price_usd: monthly ? Number(monthly) : null,
        yearly_price_usd: yearly ? Number(yearly) : null,
        features: filteredFeatures as any,
        badge_color: badge,
        sort_order: 0,
        is_active: true,
      } as any);
      toast.success('Tier creado');
      reset();
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message?.includes('duplicate') ? 'Ya existe un tier con ese slug' : (e?.message ?? 'Error');
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo tier</DialogTitle>
          <DialogDescription>Ej: Bronce, Plata, Oro. Cada uno con sus features.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
              }} placeholder="Bronce" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="bronce" />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Acceso básico a la comunidad" />
          </div>
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <Label>Mensual (USD)</Label>
              <Input type="number" min={0} step={1} value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="10" />
            </div>
            <div>
              <Label>Anual (USD)</Label>
              <Input type="number" min={0} step={1} value={yearly} onChange={(e) => setYearly(e.target.value)} placeholder="100" />
            </div>
            <div>
              <Label>Color</Label>
              <Input type="color" value={badge} onChange={(e) => setBadge(e.target.value)} className="h-9 p-1" />
            </div>
          </div>
          <div>
            <Label>Features (una por línea)</Label>
            {features.map((f, idx) => (
              <div key={idx} className="flex gap-2 mt-1">
                <Input
                  value={f}
                  onChange={(e) => setFeatures(features.map((x, i) => i === idx ? e.target.value : x))}
                  placeholder="Acceso al feed"
                  className="bg-black/30 border-white/10"
                />
                <Button variant="ghost" size="icon"
                        onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                        aria-label="Eliminar">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-2"
                    onClick={() => setFeatures([...features, ''])}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Feature
            </Button>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancelar</Button>
            <Button onClick={submit} disabled={create.isPending} className="text-white" style={{ backgroundColor: accentColor }}>
              {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando…</> : <><Save className="h-4 w-4 mr-2" /> Crear tier</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
