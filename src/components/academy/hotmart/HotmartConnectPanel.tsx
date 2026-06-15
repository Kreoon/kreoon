import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  spaceId: string;
  planSlug: 'hobby' | 'pro' | string;
  accentColor?: string;
}

// Account ID público de KREOON en Hotmart — el creator debe agregarlo
// como co-productor al crear su producto.
// TODO: mover a config server cuando KREOON tenga cuenta Hotmart productora.
const KREOON_HOTMART_ACCOUNT_ID = 'KREOON-PENDING';

// Comisión KREOON paridad con Stripe Connect.
const COMMISSION_BY_PLAN: Record<string, number> = {
  hobby: 10,
  pro: 2.9,
};

export function HotmartConnectPanel({ spaceId, planSlug, accentColor = '#8B5CF6' }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const commission = COMMISSION_BY_PLAN[planSlug] ?? 10;

  const [productId, setProductId] = useState('');
  const [hottok, setHottok] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [productUcode, setProductUcode] = useState('');

  const { data: connections, isLoading } = useQuery({
    queryKey: ['academy-hotmart-coproductions', spaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_hotmart_coproductions')
        .select(`
          id, hotmart_product_id, hotmart_offer_code, course_id,
          kreoon_commission_percent, coproduction_status, active,
          accepted_at, created_at,
          course:academy_courses(id, title)
        `)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['academy-courses-for-hotmart', spaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_courses')
        .select('id, title')
        .eq('space_id', spaceId)
        .eq('status', 'published');
      return data ?? [];
    },
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('not_authenticated');
      if (!productId.trim() || !hottok.trim()) throw new Error('missing_fields');

      const { error } = await supabase.from('academy_hotmart_coproductions').insert({
        space_id: spaceId,
        course_id: selectedCourseId || null,
        hotmart_product_id: productId.trim(),
        hotmart_offer_code: offerCode.trim() || null,
        hotmart_product_ucode: productUcode.trim() || null,
        producer_hottok: hottok.trim(),
        kreoon_account_id: KREOON_HOTMART_ACCOUNT_ID,
        kreoon_commission_percent: commission,
        coproduction_status: 'pending',
        active: false,
        connected_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Producto conectado. Confirma al aceptar la invitación de co-producción.');
      setProductId('');
      setHottok('');
      setOfferCode('');
      setProductUcode('');
      setSelectedCourseId('');
      qc.invalidateQueries({ queryKey: ['academy-hotmart-coproductions', spaceId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('academy_hotmart_coproductions')
        .update({
          coproduction_status: 'accepted',
          accepted_at: new Date().toISOString(),
          active: true,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Activado');
      qc.invalidateQueries({ queryKey: ['academy-hotmart-coproductions', spaceId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('academy_hotmart_coproductions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conexión eliminada');
      qc.invalidateQueries({ queryKey: ['academy-hotmart-coproductions', spaceId] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-white/5 border-white/10 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor + '22', color: accentColor }}
          >
            <Link2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-zinc-100">Hotmart Co-producción</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Vende tus cursos con PIX, Boleto, OXXO, PSE y cuotas locales LATAM. Hotmart cobra al
              cliente y divide automáticamente cada venta entre ti y KREOON.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-zinc-500 text-[10px] uppercase font-semibold">Tu parte</p>
            <p className="text-lg font-bold text-emerald-400">{(100 - 9.9 - commission).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-zinc-500 text-[10px] uppercase font-semibold">KREOON</p>
            <p className="text-lg font-bold" style={{ color: accentColor }}>
              {commission}%
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-zinc-500 text-[10px] uppercase font-semibold">Hotmart</p>
            <p className="text-lg font-bold text-zinc-300">9.9%</p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Pasos para conectar
          </p>
          <ol className="list-decimal ml-4 mt-2 space-y-1">
            <li>Crea tu cuenta en Hotmart si no la tienes.</li>
            <li>Crea tu producto (curso/membresía).</li>
            <li>
              Invita a este Account ID como co-productor con{' '}
              <strong>{commission}%</strong> de comisión:
              <button
                onClick={() => {
                  navigator.clipboard.writeText(KREOON_HOTMART_ACCOUNT_ID);
                  toast.success('Copiado');
                }}
                className="ml-2 inline-flex items-center gap-1 font-mono text-amber-100 hover:text-white"
              >
                {KREOON_HOTMART_ACCOUNT_ID}
                <Copy className="h-3 w-3" />
              </button>
            </li>
            <li>Copia el <code>product_id</code> y tu <code>Hottok</code> del dashboard Hotmart.</li>
            <li>Conecta abajo y activa cuando aceptes la invitación.</li>
          </ol>
        </div>
      </Card>

      {/* Form de conexión nueva */}
      <Card className="bg-white/5 border-white/10 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-zinc-100">Conectar producto nuevo</h4>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Curso a entregar</Label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Membresía del space (sin curso específico)</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">hotmart_product_id</Label>
            <Input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="A12345678"
              className="bg-white/5 border-white/10 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Hottok (token webhook)</Label>
            <Input
              value={hottok}
              onChange={(e) => setHottok(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="bg-white/5 border-white/10 font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Offer code (opcional)</Label>
            <Input
              value={offerCode}
              onChange={(e) => setOfferCode(e.target.value)}
              placeholder="abc12345"
              className="bg-white/5 border-white/10 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Product ucode (opcional)</Label>
            <Input
              value={productUcode}
              onChange={(e) => setProductUcode(e.target.value)}
              placeholder="uuid"
              className="bg-white/5 border-white/10 font-mono text-xs"
            />
          </div>
        </div>

        <Button
          onClick={() => createMutation.mutate()}
          disabled={!productId.trim() || !hottok.trim() || createMutation.isPending}
          style={{ backgroundColor: accentColor }}
          className="w-full"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando…
            </>
          ) : (
            'Conectar producto'
          )}
        </Button>
      </Card>

      {/* Conexiones existentes */}
      {!!connections?.length && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-zinc-100">Productos conectados</h4>
          {connections.map((c: any) => (
            <Card
              key={c.id}
              className={`p-4 bg-white/5 border ${c.active ? 'border-emerald-500/30' : 'border-amber-500/30'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-zinc-100">
                      {c.course?.title ?? 'Membresía del space'}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        c.active
                          ? 'border-emerald-500/30 text-emerald-300'
                          : 'border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {c.coproduction_status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
                      {c.kreoon_commission_percent}% KREOON
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    {c.hotmart_product_id}
                    {c.hotmart_offer_code && ` · off=${c.hotmart_offer_code}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`https://pay.hotmart.com/${c.hotmart_product_id}${c.hotmart_offer_code ? `?off=${c.hotmart_offer_code}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-200 p-1.5"
                    title="Ver checkout"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {!c.active && (
                    <Button
                      size="sm"
                      onClick={() => activateMutation.mutate(c.id)}
                      disabled={activateMutation.isPending}
                      className="h-7 text-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Activar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`¿Eliminar conexión ${c.hotmart_product_id}?`))
                        deleteMutation.mutate(c.id);
                    }}
                    className="text-zinc-400 hover:text-red-400 h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
