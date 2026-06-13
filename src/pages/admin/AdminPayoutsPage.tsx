import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ExternalLink, Loader2, Wallet, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/lib/permissionGroups';
import {
  useOwnerPayoutsSummary,
  useOwnerPayoutsDetail,
  useMarkOwnerPayoutPaid,
  type OwnerPayoutSummary,
  type OwnerPayoutRow,
} from '@/hooks/admin/useOwnerPayouts';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'stripe_transfer', label: 'Stripe Transfer' },
  { value: 'other', label: 'Otro' },
];

function formatUsd(n: number): string {
  return `USD ${Number(n).toFixed(2)}`;
}

export default function AdminPayoutsPage() {
  const { activeRole, roles, user, loading } = useAuth();
  const isKreoonAdmin = !!user && (
    isAdmin(activeRole as any) ||
    roles.some((r) => isAdmin(r as any))
  );

  const { data: summary, isLoading: loadingSummary } = useOwnerPayoutsSummary();
  const [selectedOwner, setSelectedOwner] = useState<OwnerPayoutSummary | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isKreoonAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-10 w-10" />
        <p>Solo los administradores de KREOON pueden ver esta página.</p>
        <Link to="/" className="text-primary hover:underline text-sm">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Payouts a owners de academias
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cobros que entraron a KREOON central (sin Stripe Connect del owner) y están
              pendientes de liquidar por fuera.
            </p>
          </div>
        </div>

        {/* Resumen agregado por owner */}
        {loadingSummary ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto animate-spin" />
            <p className="text-sm mt-2">Cargando deudas pendientes…</p>
          </Card>
        ) : !summary || summary.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
            <p className="font-medium mt-2 text-foreground">No hay payouts pendientes</p>
            <p className="text-sm mt-1">
              Todos los owners están al día o están cobrando vía Stripe Connect.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium text-right">Cobros</th>
                    <th className="px-4 py-3 font-medium text-right">Total a pagar</th>
                    <th className="px-4 py-3 font-medium">Más antiguo</th>
                    <th className="px-4 py-3 font-medium">Stripe Connect</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr
                      key={row.owner_user_id}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                      onClick={() => setSelectedOwner(row)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {row.owner_full_name || row.owner_email || row.owner_user_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">{row.owner_email}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.pending_count}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatUsd(row.pending_total_usd)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(row.oldest_pending_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {row.has_stripe_connect ? (
                          <Badge variant="outline" className="text-xs">Onboardeado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No conectado</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <OwnerPayoutDetailDialog
          owner={selectedOwner}
          onClose={() => setSelectedOwner(null)}
        />
      </div>
    </div>
  );
}

// ─── Detalle por owner ────────────────────────────────────────────────

function OwnerPayoutDetailDialog({
  owner,
  onClose,
}: {
  owner: OwnerPayoutSummary | null;
  onClose: () => void;
}) {
  const { data: rows, isLoading } = useOwnerPayoutsDetail(owner?.owner_user_id ?? null);
  const [payingId, setPayingId] = useState<string | null>(null);

  return (
    <Dialog open={!!owner} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {owner?.owner_full_name || owner?.owner_email || 'Owner'}
          </DialogTitle>
          <DialogDescription>
            {owner?.owner_email && <span className="block text-xs">{owner.owner_email}</span>}
            Detalle de cobros que KREOON debe liquidar.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        ) : !rows || rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            No hay payouts registrados para este owner.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-md border p-3 text-sm flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {formatUsd(row.net_owner_amount_usd)}
                    </span>
                    {row.paid_out_at && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                        Pagado
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {row.source_type === 'academy_membership_subscription' ? 'Suscripción' : 'Curso'} ·
                    bruto {formatUsd(row.gross_amount_usd)} · fee {row.platform_fee_percent}% (
                    {formatUsd(row.platform_fee_amount_usd)})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cobrado{' '}
                    {formatDistanceToNow(new Date(row.collected_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                    {row.paid_out_at && (
                      <>
                        {' · '}Pagado{' '}
                        {formatDistanceToNow(new Date(row.paid_out_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                        {row.paid_out_method && ` vía ${row.paid_out_method}`}
                        {row.paid_out_reference && ` (ref: ${row.paid_out_reference})`}
                      </>
                    )}
                  </div>
                  {row.stripe_session_id && (
                    <a
                      href={`https://dashboard.stripe.com/test/payments?query=${row.stripe_session_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Ver en Stripe <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {!row.paid_out_at && (
                  <Button
                    size="sm"
                    onClick={() => setPayingId(row.id)}
                    className="shrink-0"
                  >
                    Marcar como pagada
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <MarkPaidDialog
          payoutId={payingId}
          onClose={() => setPayingId(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal "marcar como pagada" ───────────────────────────────────────

function MarkPaidDialog({ payoutId, onClose }: { payoutId: string | null; onClose: () => void }) {
  const markPaid = useMarkOwnerPayoutPaid();
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!payoutId || !reference) {
      toast.error('Ingresa una referencia de pago.');
      return;
    }
    try {
      await markPaid.mutateAsync({ payoutId, method, reference, notes: notes || undefined });
      toast.success('Marcado como pagado.');
      setReference('');
      setNotes('');
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'No pudimos marcar como pagado.');
    }
  };

  return (
    <Dialog open={!!payoutId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como pagada</DialogTitle>
          <DialogDescription>
            Después de hacer la transferencia por fuera, registra la referencia aquí
            para que quede el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Referencia *</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. comprobante bancario, ID de transacción, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier nota adicional"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={markPaid.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={markPaid.isPending || !reference}>
              {markPaid.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Confirmar pago'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
