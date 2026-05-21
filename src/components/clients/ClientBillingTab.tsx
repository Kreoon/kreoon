import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Camera, FolderKanban, FileText, Loader2, Trash2,
  CheckCircle2, Clock, Lock, Download, ChevronDown, ChevronUp,
  DollarSign, Edit2, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/finance-format';
import { generateClientInvoicePDF } from '@/lib/client-invoice-pdf';
import {
  useClientBillingItems,
  useClientClosings,
  useDeleteFillmaker,
  usePayClientClosing,
  useDeleteClientClosing,
  useUpdateContentBillingPrice,
  type BillingItem,
  type ClientClosing,
} from '@/hooks/useClientBilling';
import { FillmakerDialog } from './FillmakerDialog';
import { ClientClosingDialog } from './ClientClosingDialog';

interface Props {
  orgId: string;
  clientId: string;
  clientName: string;
  orgName: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  in_closing: 'En cierre',
  paid: 'Pagado',
};

const CLOSING_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  paid: 'Pagado',
};

const CLOSING_STATUS_COLOR: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  sent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  paid: 'bg-green-500/15 text-green-400 border-green-500/30',
};

function fmtDate(d: string) {
  try { return format(parseISO(d), 'd MMM yyyy', { locale: es }); }
  catch { return d; }
}

// ─── Edición inline de precio ─────────────────────────────────

function PriceCell({ item, orgId, clientId }: { item: BillingItem; orgId: string; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(item.price_client));
  const updatePrice = useUpdateContentBillingPrice();

  async function save() {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) { setEditing(false); return; }
    try {
      await updatePrice.mutateAsync({
        id: item.id,
        orgId,
        clientId,
        billing_price: n,
        billing_currency: item.currency,
      });
      setEditing(false);
    } catch (err: any) {
      toast({ title: 'Error al actualizar precio', description: err.message, variant: 'destructive' });
    }
  }

  if (item.item_type !== 'project' || item.billing_status !== 'pending') {
    return (
      <span className="text-sm font-semibold text-green-400 whitespace-nowrap">
        {formatCurrency(item.price_client, item.currency)}
      </span>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-green-400 whitespace-nowrap">
          {formatCurrency(item.price_client, item.currency)}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => setEditing(true)}>
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        type="number"
        min="0"
        value={val}
        onChange={e => setVal(e.target.value)}
        className="h-7 w-24 text-sm bg-white/5 border-white/10"
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      />
      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400" onClick={save} disabled={updatePrice.isPending}>
        {updatePrice.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditing(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─── Fila de ítem ─────────────────────────────────────────────

function BillingItemRow({
  item, orgId, clientId, onDelete,
}: { item: BillingItem; orgId: string; clientId: string; onDelete: (id: string) => void }) {
  const statusColor = item.billing_status === 'pending'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : item.billing_status === 'in_closing'
      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      : 'bg-green-500/15 text-green-400 border-green-500/30';

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
      <div className="shrink-0">
        {item.item_type === 'fillmaker'
          ? <Camera className="h-4 w-4 text-violet-400" />
          : <FolderKanban className="h-4 w-4 text-blue-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">{fmtDate(item.item_date)}</p>
      </div>
      <Badge className={`text-xs shrink-0 ${statusColor}`}>
        {STATUS_LABEL[item.billing_status] ?? item.billing_status}
      </Badge>
      <PriceCell item={item} orgId={orgId} clientId={clientId} />
      {item.billing_status === 'pending' && item.item_type === 'fillmaker' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ─── Fila de cierre ───────────────────────────────────────────

function ClosingRow({
  closing, orgId, clientId, clientName, orgName, onRefetch, allItems,
}: {
  closing: ClientClosing;
  orgId: string;
  clientId: string;
  clientName: string;
  orgName: string;
  onRefetch: () => void;
  allItems: BillingItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  // CRITICAL 3 — usar RPC con cascade correcto en lugar de UPDATE directo
  const payClosing = usePayClientClosing();
  const deleteClosing = useDeleteClientClosing();

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      await payClosing.mutateAsync({
        closingId: closing.id,
        orgId,
        clientId,
      });
      toast({ title: 'Marcado como pagado' });
      onRefetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleDelete() {
    if (closing.status !== 'draft') {
      toast({ title: 'Solo se pueden eliminar cierres en borrador', variant: 'destructive' });
      return;
    }
    try {
      await deleteClosing.mutateAsync({ id: closing.id, clientId, orgId });
      toast({ title: 'Cierre eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  function handleDownloadPDF() {
    const closingItems = allItems.filter(i => i.closing_id === closing.id);
    generateClientInvoicePDF({
      closing,
      items: closingItems,
      clientName,
      orgName,
    });
  }

  return (
    <div className="rounded border border-white/10 bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-medium text-sm">{closing.name}</span>
            <Badge className={`text-xs ${CLOSING_STATUS_COLOR[closing.status]}`}>
              {CLOSING_STATUS_LABEL[closing.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtDate(closing.created_at)} · {closing.currency}
            {closing.payment_date ? ` · Pagado: ${fmtDate(closing.payment_date)}` : ''}
          </p>
        </div>

        <span className="text-base font-bold text-green-400 whitespace-nowrap">
          {formatCurrency(closing.total_amount, closing.currency)}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(x => !x)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver PDF" onClick={handleDownloadPDF}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          {closing.status !== 'paid' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-400 hover:text-green-400"
              title="Marcar como pagado"
              onClick={handleMarkPaid}
              disabled={markingPaid}
            >
              {markingPaid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </Button>
          )}
          {closing.status === 'draft' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Eliminar cierre"
              onClick={handleDelete}
              disabled={deleteClosing.isPending}
            >
              {deleteClosing.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {expanded && closing.notes && (
        <div className="px-3 pb-3 border-t border-white/5 pt-2">
          <p className="text-xs text-muted-foreground">{closing.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────

export function ClientBillingTab({ orgId, clientId, clientName, orgName }: Props) {
  const [fillmakerOpen, setFillmakerOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);

  const { data: allItems = [], isLoading: loadingItems, refetch: refetchItems } = useClientBillingItems(orgId, clientId);
  // CRITICAL 1 — pasar orgId como primer argumento
  const { data: closings = [], isLoading: loadingClosings, refetch: refetchClosings } = useClientClosings(orgId, clientId);
  const deleteFillmaker = useDeleteFillmaker();

  const pendingItems = useMemo(() => allItems.filter(i => i.billing_status === 'pending'), [allItems]);
  const pendingTotal = useMemo(() => pendingItems.reduce((acc, i) => acc + i.price_client, 0), [pendingItems]);
  const pendingByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of pendingItems) {
      map.set(item.currency, (map.get(item.currency) ?? 0) + item.price_client);
    }
    return Array.from(map.entries());
  }, [pendingItems]);
  const hasMultiCurrency = pendingByCurrency.length > 1;

  async function handleDeleteFillmaker(id: string) {
    try {
      await deleteFillmaker.mutateAsync({ id, orgId, clientId });
      toast({ title: 'Servicio eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  function handleRefetch() {
    refetchItems();
    refetchClosings();
  }

  return (
    <div className="space-y-6">
      {/* ─── KPI Total pendiente ─────────────────────────── */}
      <Card className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/20 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded">
              <DollarSign className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide">Pendiente de cobrar</p>
              {hasMultiCurrency
                ? pendingByCurrency.map(([cur, amt]) => (
                    <p key={cur} className="text-lg font-bold text-white leading-tight">{formatCurrency(amt, cur)}</p>
                  ))
                : <p className="text-2xl font-bold text-white">{formatCurrency(pendingTotal, pendingByCurrency[0]?.[0] ?? 'COP')}</p>
              }
              <p className="text-violet-400 text-xs mt-0.5">{pendingItems.length} ítem{pendingItems.length !== 1 ? 's' : ''} sin cobrar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setFillmakerOpen(true)} className="gap-1.5 h-8">
              <Camera className="h-3.5 w-3.5" />
              Fillmaker
            </Button>
            <Button
              size="sm"
              onClick={() => setClosingOpen(true)}
              disabled={pendingItems.length === 0}
              className="gap-1.5 h-8"
            >
              <FileText className="h-3.5 w-3.5" />
              Generar cierre
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Ítems ──────────────────────────────────────── */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold text-white">Proyectos y servicios</h3>
          <p className="text-xs text-muted-foreground">Proyectos sin paquete + servicios Fillmaker</p>
        </div>

        {loadingItems ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Clock className="h-8 w-8 opacity-30" />
            <p className="text-sm">Sin proyectos ni servicios registrados</p>
            <Button size="sm" variant="outline" onClick={() => setFillmakerOpen(true)} className="gap-2 mt-1">
              <Plus className="h-3.5 w-3.5" />
              Agregar Fillmaker
            </Button>
          </div>
        ) : (
          <div>
            {allItems.map(item => (
              <BillingItemRow
                key={item.id}
                item={item}
                orgId={orgId}
                clientId={clientId}
                onDelete={handleDeleteFillmaker}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ─── Cierres anteriores ─────────────────────────── */}
      <Card className="bg-white/5 border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Cierres registrados
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{closings.length} cierre{closings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loadingClosings ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : closings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin cierres aún</p>
        ) : (
          <div className="space-y-2">
            {closings.map(c => (
              <ClosingRow
                key={c.id}
                closing={c}
                orgId={orgId}
                clientId={clientId}
                clientName={clientName}
                orgName={orgName}
                onRefetch={handleRefetch}
                allItems={allItems}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ─── Dialogs ─────────────────────────────────────── */}
      <FillmakerDialog
        open={fillmakerOpen}
        onOpenChange={setFillmakerOpen}
        orgId={orgId}
        clientId={clientId}
      />

      {closingOpen && (
        <ClientClosingDialog
          open={closingOpen}
          onOpenChange={setClosingOpen}
          orgId={orgId}
          clientId={clientId}
          clientName={clientName}
          orgName={orgName}
          pendingItems={pendingItems}
        />
      )}
    </div>
  );
}
