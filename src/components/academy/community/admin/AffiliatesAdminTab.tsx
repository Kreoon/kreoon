import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AffiliatesAdminTabProps {
  spaceId: string;
  spaceSlug: string;
  accentColor?: string;
}

const COMMISSION_OPTIONS = [10, 20, 30, 40, 50];

/**
 * Diferenciador KREOON: comisión visible + link personalizado por space.
 * No es un sistema de affiliate completo todavía — config + tracking link readable.
 * El tracking real requiere integración con un sistema de attribution.
 */
export function AffiliatesAdminTab({ spaceId, spaceSlug, accentColor = '#8B5CF6' }: AffiliatesAdminTabProps) {
  const { user } = useAuth();
  const [commission, setCommission] = useState<number>(30);
  const [copied, setCopied] = useState(false);

  // Cargar config actual del space (metadata)
  const { data: spaceMeta } = useQuery({
    queryKey: ['academy', 'space-affiliate-config', spaceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('academy_spaces')
        .select('metadata, member_count')
        .eq('id', spaceId)
        .single();
      return data;
    },
    enabled: !!spaceId,
  });

  useEffect(() => {
    const stored = spaceMeta?.metadata?.affiliate_commission_pct;
    if (typeof stored === 'number') setCommission(stored);
  }, [spaceMeta]);

  const inviteLink = `https://kreoon.com/academia/${spaceSlug}?ref=${user?.id?.slice(0, 8) ?? ''}`;

  async function saveCommission(value: number) {
    setCommission(value);
    const newMeta = { ...(spaceMeta?.metadata ?? {}), affiliate_commission_pct: value };
    await (supabase as any)
      .from('academy_spaces')
      .update({ metadata: newMeta })
      .eq('id', spaceId);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-kreoon-bg-card border-white/10">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}26` }}
          >
            <Handshake className="h-5 w-5" style={{ color: accentColor }} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold">Programa de afiliados</h3>
            <p className="text-xs text-zinc-300 mt-1">
              Tus miembros pueden invitar a otros y ganar un % de cada venta que cierren.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-zinc-300">
              Comisión por venta referida
            </Label>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {COMMISSION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => saveCommission(opt)}
                  aria-pressed={commission === opt}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-semibold transition-colors border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                    commission === opt
                      ? 'bg-purple-500/15 text-purple-100'
                      : 'border-white/10 text-zinc-300 hover:text-zinc-100'
                  )}
                  style={
                    commission === opt
                      ? { borderColor: accentColor, color: accentColor }
                      : undefined
                  }
                >
                  {opt}%
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-2">
              KREOON cobra su comisión sobre la venta total; tu afiliado recibe el % seleccionado
              después de eso.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-zinc-300">
              Tu link de invitación
            </Label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 bg-kreoon-bg-secondary border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200 focus:outline-none focus:border-purple-500/50"
                aria-label="Link de invitación al space"
              />
              <Button
                onClick={copyLink}
                variant="outline"
                aria-label="Copiar link de invitación"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-kreoon-bg-card border-white/10">
        <h3 className="font-semibold mb-3">Estado del programa</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <Stat label="Miembros totales" value={String(spaceMeta?.member_count ?? 0)} />
          <Stat label="Comisión configurada" value={`${commission}%`} accent={accentColor} />
          <Stat label="Sistema attribution" value="En setup" accent="#fbbf24" />
        </div>
        <p className="text-xs text-zinc-400 mt-3">
          El tracking de conversiones requiere completar la configuración de Stripe Connect. Una vez
          conectado, las ventas con tu ref aparecerán aquí.
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 rounded-lg bg-kreoon-bg-secondary border border-white/5">
      <div className="text-lg font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="text-[10px] text-zinc-300 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
