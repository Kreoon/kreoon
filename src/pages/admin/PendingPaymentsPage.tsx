import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';

interface PendingCampaign {
  id: string;
  title: string;
  total_budget: number | null;
  budget_per_video: number | null;
  currency: string | null;
  created_at: string;
  payment_status: string;
  client_name: string | null;
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'hoy';
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}

export default function PendingPaymentsPage() {
  const { toast } = useToast();
  const { activateCampaign } = useMarketplaceCampaigns();

  const [campaigns, setCampaigns] = useState<PendingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('marketplace_campaigns')
        .select(`
          id,
          title,
          total_budget,
          budget_per_video,
          currency,
          created_at,
          payment_status,
          profiles!marketplace_campaigns_created_by_fkey ( full_name )
        `)
        .eq('payment_status', 'pending_payment')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PendingPaymentsPage] Error:', error);
        return;
      }

      const normalized: PendingCampaign[] = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        total_budget: row.total_budget,
        budget_per_video: row.budget_per_video,
        currency: row.currency ?? 'USD',
        created_at: row.created_at,
        payment_status: row.payment_status,
        client_name: row.profiles?.full_name ?? null,
      }));

      setCampaigns(normalized);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleConfirm = async (campaignId: string) => {
    setConfirmingId(campaignId);
    try {
      const result = await activateCampaign(campaignId);
      if (result?.success) {
        toast({ title: 'Pago confirmado. Campaña activada.' });
        setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      } else {
        toast({
          title: result?.error || 'Error al activar la campaña',
          variant: 'destructive',
        });
      }
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl leading-none">💰</span>
            <h1 className="text-2xl font-bold text-foreground">Pagos Pendientes</h1>
            {campaigns.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/30">
                {campaigns.length} pendiente{campaigns.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Confirma los pagos recibidos para activar las campañas
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
          aria-label="Refrescar lista"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card px-6 py-16 text-center">
          <span className="text-4xl mb-4 block">🎉</span>
          <h3 className="text-foreground font-semibold text-lg">Sin pagos pendientes</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Todas las campañas están al día. Buen trabajo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const amount = campaign.total_budget ?? campaign.budget_per_video ?? 0;
            const isConfirming = confirmingId === campaign.id;

            return (
              <div
                key={campaign.id}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-border/50 bg-card hover:border-primary/40 transition-colors"
              >
                <span className="text-2xl leading-none flex-shrink-0">💳</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm truncate">{campaign.title}</h3>
                    <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20 flex-shrink-0">
                      ⏳ Pendiente confirmación
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {campaign.client_name && (
                      <span>{campaign.client_name}</span>
                    )}
                    <span className="font-semibold text-primary text-sm">
                      ${amount.toLocaleString('en-US')} {campaign.currency ?? 'USD'}
                    </span>
                    <span>{daysAgo(campaign.created_at)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleConfirm(campaign.id)}
                  disabled={isConfirming}
                  className={cn(
                    'flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-opacity flex-shrink-0',
                    isConfirming ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
                  )}
                >
                  {isConfirming
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Activando...</>
                    : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirmar pago</>
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
