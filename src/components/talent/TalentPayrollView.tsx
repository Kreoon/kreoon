import { useState, useMemo, useRef } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, ChevronDown, ChevronUp, Loader2, Check,
  Download, Users, AlertCircle, Calendar, Play, RefreshCw,
  Clock, CheckCircle, Upload, X, FileText, Zap,
  AlertTriangle, History, Search, TrendingUp, Activity, BadgeDollarSign, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  usePaymentAccounts, useCreatePayment, usePayrollSummary, useUpdatePayment,
  useUploadReceipt, useOverduePayments, usePaidClosuresByMonth,
  useTalentFinanceRealtime, useClosureContentDetails,
} from '@/hooks/useTalentPayments';
import type { PayrollEntry, OverduePayment, MonthlyClosureGroup, ClosureContentDetail } from '@/hooks/useTalentPayments';
import type { TalentPayment, PaymentStatus } from '@/types/talentPayments.types';
import { PAYMENT_ACCOUNT_LABELS, PAYMENT_STATUS_LABELS } from '@/types/talentPayments.types';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { useOrgPayrollOverview } from '@/hooks/useFinanceOverview';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { TabIntro, HelpTip } from '@/components/finance/FinanceHelp';
import { useFillmakerPayroll } from '@/hooks/useClientBilling';
import type { FillmakerPayrollItem } from '@/hooks/useClientBilling';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_LABELS_ES: Record<string, string> = {
  pending:    'Pendiente',
  processing: 'En transferencia',
  paid:       'Pagado',
  cancelled:  'Cancelado',
};

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ContentExportDetail {
  id: string;
  title: string | null;
  sequence_number: string | null;
  client_name: string | null;
  creator_payment: number | null;
  editor_payment: number | null;
}

// Fechas indexadas por status: contentId → { to_status → moved_at (ISO) }
type StatusDateMap = Map<string, Record<string, string>>;

// ─── Estados del kanban que se incluyen como columnas en el CSV ───────────────

const KANBAN_STATUS_COLUMNS: { key: string; label: string }[] = [
  { key: 'draft',           label: 'Borrador'            },
  { key: 'script_pending',  label: 'Guión pendiente'     },
  { key: 'script_approved', label: 'Guión aprobado'      },
  { key: 'assigned',        label: 'Asignado'            },
  { key: 'recording',       label: 'Grabando'            },
  { key: 'recorded',        label: 'Grabado'             },
  { key: 'editing',         label: 'Editando'            },
  { key: 'review',          label: 'En revisión'         },
  { key: 'issue',           label: 'Con observación'     },
  { key: 'corrected',       label: 'Corregido'           },
  { key: 'delivered',       label: 'Entregado al cliente'},
  { key: 'approved',        label: 'Aprobado'            },
  { key: 'paid',            label: 'Pagado'              },
];

const CSV_HEADERS = [
  'Sección',
  'Talento',
  'Estado liquidación',
  'Descripción liquidación',
  'Rol',
  '# Proyecto',
  'Título',
  'Cliente',
  'Monto (COP)',
  'Moneda',
  // Una columna por cada estado del kanban
  ...KANBAN_STATUS_COLUMNS.map((s) => `Fecha — ${s.label}`),
  'Fecha prevista pago',
  'Liquidación creada',
];

async function exportDetailedPayrollToCSV(
  closures: MonthlyClosureEntry[],
  unpaid: PayrollEntry[],
) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const num = (v: number | null | undefined) => v != null ? v.toFixed(0) : '';
  const dt  = (d: string | null | undefined) =>
    d ? format(new Date(d), 'yyyy-MM-dd HH:mm') : '';

  // ── 1. Recopilar todos los IDs de contenido ───────────────────────────────
  const allIds = new Set<string>([
    ...closures.flatMap((c) => c.payment.content_ids ?? []),
    ...unpaid.flatMap((e) => e.items.map((i) => i.id)),
  ]);

  const detailMap = new Map<string, ContentExportDetail>();
  const statusDateMap: StatusDateMap = new Map();

  if (allIds.size > 0) {
    const idList = [...allIds];

    // ── 2a. Detalles de contenido + join cliente ──────────────────────────
    const { data: contentRows } = await supabase
      .from('content')
      .select('id, title, sequence_number, clients(name), creator_payment, editor_payment')
      .in('id', idList);

    for (const row of contentRows ?? []) {
      detailMap.set(row.id, {
        id: row.id,
        title: row.title ?? null,
        sequence_number: (row as any).sequence_number ?? null,
        client_name: (row as any).clients?.name ?? null,
        creator_payment: row.creator_payment != null ? Number(row.creator_payment) : null,
        editor_payment:  row.editor_payment  != null ? Number(row.editor_payment)  : null,
      });
    }

    // ── 2b. Historial completo de cambios de estado ───────────────────────
    // Usamos content_status_logs (más completo) con fallback a content_history.
    // Guardamos la ÚLTIMA fecha en que cada contenido llegó a cada estado
    // (un proyecto puede volver a 'issue' → 'corrected' → 'delivered' varias veces).
    const { data: statusLogs } = await supabase
      .from('content_status_logs')
      .select('content_id, to_status, moved_at')
      .in('content_id', idList)
      .order('moved_at', { ascending: true }); // asc → el último sobreescribe = fecha más reciente por estado

    for (const log of statusLogs ?? []) {
      if (!statusDateMap.has(log.content_id)) statusDateMap.set(log.content_id, {});
      if (log.to_status) statusDateMap.get(log.content_id)![log.to_status] = log.moved_at;
    }

    // Fallback a content_history para proyectos sin registros en status_logs
    const idsWithoutLogs = idList.filter((id) => !statusDateMap.has(id));
    if (idsWithoutLogs.length > 0) {
      const { data: historyRows } = await supabase
        .from('content_history')
        .select('content_id, new_status, created_at')
        .in('content_id', idsWithoutLogs)
        .order('created_at', { ascending: true });

      for (const h of historyRows ?? []) {
        if (!statusDateMap.has(h.content_id)) statusDateMap.set(h.content_id, {});
        if (h.new_status) statusDateMap.get(h.content_id)![h.new_status] = h.created_at;
      }
    }
  }

  // ── 3. Helper: fechas kanban como array ordenado por KANBAN_STATUS_COLUMNS ─
  function kanbanDates(contentId: string): string[] {
    const dates = statusDateMap.get(contentId) ?? {};
    return KANBAN_STATUS_COLUMNS.map((s) => esc(dt(dates[s.key])));
  }

  // ── 4. Construir filas ────────────────────────────────────────────────────
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
  const rows: string[] = [];

  rows.push(esc(`Nómina detallada — Kreoon — Generado el ${dateStr}`));
  rows.push(esc(`Proyectos incluidos: ${allIds.size} · Liquidaciones activas: ${closures.length} · Próximo cierre: ${unpaid.reduce((s, e) => s + e.project_count, 0)} proyectos`));
  rows.push('');
  rows.push(CSV_HEADERS.map(esc).join(','));

  // ─ Sección A: Liquidaciones activas ──────────────────────────────────────
  let totalA = 0;

  for (const { payment: p, full_name } of closures) {
    const contentIds = p.content_ids ?? [];
    const baseFields = [
      esc('Liquidación activa'),
      esc(full_name),
      esc(STATUS_LABELS_ES[p.status] ?? p.status),
      esc(p.description ?? ''),
    ];

    if (contentIds.length === 0) {
      rows.push([
        ...baseFields,
        esc(''), esc(''), esc(''), esc(''),
        num(p.amount), esc(p.currency),
        ...KANBAN_STATUS_COLUMNS.map(() => esc('')),
        esc(dt(p.payment_date)),
        esc(dt(p.created_at)),
      ].join(','));
      totalA += p.amount;
    } else {
      for (const cid of contentIds) {
        const d = detailMap.get(cid);
        const projectAmount = d
          ? ((d.creator_payment ?? 0) + (d.editor_payment ?? 0))
          : p.amount / contentIds.length;

        rows.push([
          ...baseFields,
          esc('Creador/Editor'),
          esc(d?.sequence_number ?? ''),
          esc(d?.title ?? cid),
          esc(d?.client_name ?? ''),
          num(projectAmount),
          esc(p.currency),
          ...kanbanDates(cid),
          esc(dt(p.payment_date)),
          esc(dt(p.created_at)),
        ].join(','));
        totalA += projectAmount;
      }
    }
  }

  // ─ Sección B: Próximo cierre — un fila por proyecto × rol ────────────────
  let totalB = 0;

  for (const entry of unpaid) {
    for (const item of entry.items) {
      const d = detailMap.get(item.id);
      rows.push([
        esc('Próximo cierre'),
        esc(entry.full_name),
        esc('Sin liquidar'),
        esc(''),
        esc(item.role === 'creator' ? 'Creador' : 'Editor'),
        esc(d?.sequence_number ?? item.sequence_number ?? ''),
        esc(d?.title ?? item.title),
        esc(d?.client_name ?? ''),
        num(item.amount),
        esc('COP'),
        ...kanbanDates(item.id),
        esc(''),
        esc(''),
      ].join(','));
      totalB += item.amount;
    }
  }

  // ── 5. Resumen ────────────────────────────────────────────────────────────
  rows.push('');
  rows.push(esc('=== RESUMEN ==='));
  rows.push([esc('Total liquidaciones activas'), num(totalA)].join(','));
  rows.push([esc('Total próximo cierre'),        num(totalB)].join(','));
  rows.push([esc('GRAN TOTAL'),                  num(totalA + totalB)].join(','));

  // ── 6. Descarga ───────────────────────────────────────────────────────────
  const csv  = '﻿' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `nomina_detallada_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Hook: cierres mensuales pendientes de pago (de toda la org) ─────────────

interface MonthlyClosureEntry {
  payment: TalentPayment;
  full_name: string;
  avatar_url: string | null;
}

function useMonthlyClosures(organizationId: string) {
  return useQuery({
    queryKey: ['monthly-closures', organizationId],
    staleTime: 0,
    queryFn: async (): Promise<MonthlyClosureEntry[]> => {
      const { data: payments, error } = await supabase
        .from('talent_payments')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'processing'])
        .or('fillmaker_service_id.is.null,status.eq.processing')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!payments || payments.length === 0) return [];

      const userIds = [...new Set(payments.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return payments.map((p) => {
        const profile = profileMap.get(p.user_id);
        return {
          payment: p as TalentPayment,
          full_name: profile?.full_name ?? 'Usuario',
          avatar_url: profile?.avatar_url ?? null,
        };
      });
    },
    enabled: !!organizationId,
  });
}

// ─── Fecha prevista del próximo pago ─────────────────────────────────────────

function NextPaymentBadge() {
  const today = new Date();
  const day = today.getDate();
  // Si estamos antes del día 20 de este mes, el próximo cierre es el 20 de este mes
  // Si ya pasó, el próximo es el 20 del mes que viene
  const nextClose = day < 20
    ? new Date(today.getFullYear(), today.getMonth(), 20)
    : new Date(today.getFullYear(), today.getMonth() + 1, 20);
  const nextPay = startOfMonth(addMonths(nextClose, 1));

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-primary" />
        Próximo cierre: <strong className="text-foreground">{format(nextClose, "d 'de' MMMM", { locale: es })}</strong>
      </span>
      <span className="text-border">·</span>
      <span className="flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5 text-green-500" />
        Pago previsto: <strong className="text-foreground">1-5 de {format(nextPay, 'MMMM yyyy', { locale: es })}</strong>
      </span>
    </div>
  );
}

// ─── Fila de cierre mensual pendiente / en transferencia ─────────────────────

function ClosureRow({
  entry,
  organizationId,
  hideIdentity = false,
}: {
  entry: MonthlyClosureEntry;
  organizationId: string;
  hideIdentity?: boolean;
}) {
  const qc = useQueryClient();
  const { data: accounts = [] } = usePaymentAccounts(organizationId, entry.payment.user_id);
  const updatePayment = useUpdatePayment(organizationId);
  const uploadReceipt = useUploadReceipt(organizationId);
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(false);
  // step: 'idle' | 'initiate' (confirmar iniciar transferencia) | 'confirm' (subir comprobante)
  const [step, setStep] = useState<'idle' | 'initiate' | 'confirm'>('idle');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const p = entry.payment;
  const contentCount = (p.content_ids ?? []).length;
  const payDate = p.payment_date ? new Date(p.payment_date) : null;
  const isPending    = p.status === 'pending';
  const isProcessing = p.status === 'processing';

  async function handleInitiateTransfer() {
    await updatePayment.mutateAsync({
      id: p.id,
      userId: p.user_id,
      status: 'processing' as PaymentStatus,
      payment_account_id: accountId || undefined,
    });
    qc.invalidateQueries({ queryKey: ['monthly-closures', organizationId] });
    toast({ title: `Transferencia iniciada — ${entry.full_name}` });
    setStep('idle');
  }

  async function handleConfirmPaid() {
    if (!receipt) return;
    const { path } = await uploadReceipt.mutateAsync({ file: receipt, userId: p.user_id });
    await updatePayment.mutateAsync({
      id: p.id,
      userId: p.user_id,
      status: 'paid' as PaymentStatus,
      receipt_url: path,
      payment_date: new Date(date).toISOString(),
      payment_account_id: accountId || undefined,
    });
    qc.invalidateQueries({ queryKey: ['monthly-closures', organizationId] });
    qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, p.user_id] });
    qc.invalidateQueries({ queryKey: ['content-financial-summary', organizationId, p.user_id] });
    toast({ title: `Pago confirmado — ${entry.full_name}` });
    setStep('idle');
    setReceipt(null);
  }

  const borderClass = isProcessing
    ? 'border-blue-400/40'
    : 'border-yellow-400/30';

  const amountClass = isProcessing
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div className={`rounded-lg border ${borderClass} bg-card overflow-hidden`}>
      <div className="flex items-center gap-3 p-3">
        {/* Avatar — oculto cuando va dentro de un grupo de usuario */}
        {!hideIdentity && (
          entry.avatar_url ? (
            <img src={entry.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {entry.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!hideIdentity && <p className="text-sm font-semibold truncate">{entry.full_name}</p>}
            {isProcessing && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium shrink-0">
                En transferencia
              </span>
            )}
            {!isProcessing && hideIdentity && isPending && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 font-medium shrink-0">
                Pendiente
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {p.description ?? 'Cierre mensual'}
            </p>
            {payDate && (
              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                Pagar antes del {format(payDate, "d 'de' MMM", { locale: es })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${amountClass}`}>
            {formatCurrency(p.amount, p.currency)}
          </span>

          {isPending && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => setStep(step === 'initiate' ? 'idle' : 'initiate')}
            >
              <Zap className="h-3 w-3" />
              Transferir
            </Button>
          )}

          {isProcessing && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
              onClick={() => setStep(step === 'confirm' ? 'idle' : 'confirm')}
            >
              <CheckCircle className="h-3 w-3" />
              Confirmar pago
            </Button>
          )}

          {contentCount > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Paso 1: Iniciar transferencia */}
      {step === 'initiate' && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Selecciona la cuenta destino y confirma que iniciaste la transferencia.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Cuenta destino</Label>
            <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                    {a.account_number ? ` · ${a.account_number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setStep('idle')}>Cancelar</Button>
            <Button
              size="sm"
              className="gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleInitiateTransfer}
              disabled={updatePayment.isPending}
            >
              {updatePayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Marcar en transferencia
            </Button>
          </div>
        </div>
      )}

      {/* Paso 2: Confirmar pago con comprobante */}
      {step === 'confirm' && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Sube el comprobante de transferencia para marcar el pago como confirmado.
          </p>

          {/* Comprobante — obligatorio */}
          <div className="space-y-1">
            <Label className="text-xs">
              Comprobante de transferencia <span className="text-destructive">*</span>
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                receipt ? 'border-green-400/50 bg-green-50 dark:bg-green-900/10' : 'border-border'
              }`}
            >
              {receipt ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <FileText className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="truncate text-green-700 dark:text-green-400">{receipt.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReceipt(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground mb-1.5">Imagen o PDF del comprobante</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>
                    Seleccionar archivo
                  </Button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cuenta usada</Label>
              <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                      {a.account_number ? ` · ${a.account_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha de pago</Label>
              <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setReceipt(null); }}>Cancelar</Button>
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700"
              onClick={handleConfirmPaid}
              disabled={!receipt || updatePayment.isPending || uploadReceipt.isPending}
            >
              {(updatePayment.isPending || uploadReceipt.isPending)
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle className="h-3.5 w-3.5" />}
              Confirmar pago
            </Button>
          </div>
        </div>
      )}

      {/* Proyectos del cierre — tabla con cliente y fecha de aprobación */}
      {expanded && contentCount > 0 && (
        <ClosureContentTable contentIds={p.content_ids ?? []} userId={p.user_id} />
      )}
    </div>
  );
}

// ─── Grupo de cierres para un mismo usuario ───────────────────────────────────

function ClosureGroup({
  entries,
  organizationId,
}: {
  entries: MonthlyClosureEntry[];
  organizationId: string;
}) {
  const first = entries[0];
  const total = entries.reduce((s, e) => s + e.payment.amount, 0);
  const hasProcessing = entries.some((e) => e.payment.status === 'processing');
  const initials = first.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`rounded-lg border overflow-hidden ${hasProcessing ? 'border-blue-400/40' : 'border-yellow-400/30'} bg-card`}>
      {/* Cabecera de usuario */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 border-b border-border">
        {first.avatar_url ? (
          <img src={first.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{first.full_name}</p>
          <p className="text-[10px] text-muted-foreground">{entries.length} pagos agrupados</p>
        </div>
        <span className={`text-sm font-bold ${hasProcessing ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
          {formatCurrency(total)}
        </span>
      </div>
      {/* Pagos individuales */}
      {entries.map((entry, i) => (
        <div key={entry.payment.id} className={i > 0 ? 'border-t border-border/50' : ''}>
          <ClosureRow entry={entry} organizationId={organizationId} hideIdentity />
        </div>
      ))}
    </div>
  );
}

function ClosureContentTable({ contentIds, userId }: { contentIds: string[]; userId: string }) {
  const { data: items = [], isLoading } = useClosureContentDetails(contentIds, true);

  if (isLoading) {
    return (
      <div className="border-t border-border px-4 py-3 bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando proyectos…
      </div>
    );
  }

  // Expande cada item en una fila por rol del usuario (evita sumar creator + editor)
  const rows: Array<ClosureContentDetail & { role: 'creator' | 'editor'; roleAmount: number }> = [];
  for (const item of items) {
    const isCreator = item.creator_id === userId;
    const isEditor  = item.editor_id  === userId;
    if (isCreator && (item.creator_payment ?? 0) > 0)
      rows.push({ ...item, role: 'creator', roleAmount: item.creator_payment! });
    if (isEditor && (item.editor_payment ?? 0) > 0)
      rows.push({ ...item, role: 'editor', roleAmount: item.editor_payment! });
    // Fallback: usuario no identificado como creator/editor (pago manual sin content_ids limpios)
    if (!isCreator && !isEditor)
      rows.push({ ...item, role: 'creator', roleAmount: (item.creator_payment ?? 0) + (item.editor_payment ?? 0) });
  }

  return (
    <div className="border-t border-border bg-muted/10">
      {/* Cabecera */}
      <div className="grid grid-cols-[auto_1fr_1.5fr_1fr_auto] gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
        <span>Rol</span>
        <span>Proyecto</span>
        <span>Cliente</span>
        <span>Aprobado</span>
        <span className="text-right">Monto</span>
      </div>
      {rows.map((item, idx) => (
        <div
          key={`${item.id}-${item.role}-${idx}`}
          className="grid grid-cols-[auto_1fr_1.5fr_1fr_auto] gap-2 px-4 py-2 text-xs border-b border-border/30 last:border-0 items-center"
        >
          {/* Rol */}
          <Badge variant="outline" className="text-[10px] shrink-0 w-fit">
            {item.role === 'creator' ? 'Creador' : 'Editor'}
          </Badge>

          {/* Proyecto */}
          <div className="min-w-0">
            {item.sequence_number && (
              <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{item.sequence_number}</span>
            )}
            <span className="truncate">{item.title}</span>
          </div>

          {/* Cliente */}
          <span className="truncate text-muted-foreground">
            {item.client_name ?? <span className="italic opacity-50">Sin cliente</span>}
          </span>

          {/* Fecha aprobado */}
          <span className="text-muted-foreground whitespace-nowrap">
            {item.approved_at
              ? format(new Date(item.approved_at), "d MMM yyyy", { locale: es })
              : <span className="italic opacity-50">—</span>}
          </span>

          {/* Monto — solo la parte del usuario en este rol */}
          <span className="font-semibold text-right whitespace-nowrap">
            {formatCurrency(item.roleAmount)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Tabla de proyectos sin liquidar (con cliente y fecha aprobado) ──────────

function UnpaidContentTable({ items }: { items: PayrollEntry['items'] }) {
  const contentIds = items.map((i) => i.id);
  const { data: details = [], isLoading } = useClosureContentDetails(contentIds, true);

  const detailMap = new Map(details.map((d) => [d.id, d]));

  if (isLoading) {
    return (
      <div className="border-t border-border px-4 py-3 bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando proyectos…
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/10">
      {/* Cabecera */}
      <div className="grid grid-cols-[auto_1fr_1.2fr_1fr_auto] gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
        <span>Rol</span>
        <span>Proyecto</span>
        <span>Cliente</span>
        <span>Aprobado</span>
        <span className="text-right">Monto</span>
      </div>
      {items.map((item) => {
        const d = detailMap.get(item.id);
        return (
          <div
            key={item.id}
            className="grid grid-cols-[auto_1fr_1.2fr_1fr_auto] gap-2 px-4 py-2 text-xs border-b border-border/30 last:border-0 items-center"
          >
            {/* Rol */}
            <Badge variant="outline" className="text-[10px] shrink-0 w-fit">
              {item.role === 'creator' ? 'Creador' : 'Editor'}
            </Badge>

            {/* Proyecto */}
            <div className="min-w-0 flex items-center gap-1.5">
              {(d?.sequence_number ?? item.sequence_number) && (
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {d?.sequence_number ?? item.sequence_number}
                </span>
              )}
              <span className="truncate">{d?.title ?? item.title}</span>
            </div>

            {/* Cliente */}
            <span className="truncate text-muted-foreground">
              {d?.client_name ?? <span className="italic opacity-50">Sin cliente</span>}
            </span>

            {/* Aprobado */}
            <span className="text-muted-foreground whitespace-nowrap">
              {d?.approved_at
                ? format(new Date(d.approved_at), "d MMM yyyy", { locale: es })
                : <span className="italic opacity-50">—</span>}
            </span>

            {/* Monto */}
            <span className="font-semibold text-green-600 dark:text-green-400 text-right whitespace-nowrap">
              {formatCurrency(item.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Fila de Fillmaker con "Pagar ya" ────────────────────────────────────────

function FillmakerPayRow({
  item,
  organizationId,
}: {
  item: FillmakerPayrollItem;
  organizationId: string;
}) {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(String(item.amount));
  const [currency, setCurrency] = useState(item.currency ?? 'COP');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: accounts = [] } = usePaymentAccounts(organizationId, item.user_id);
  const updatePayment = useUpdatePayment(organizationId);
  const qc = useQueryClient();
  const { toast } = useToast();

  async function handlePay() {
    try {
      await updatePayment.mutateAsync({
        id: item.id,
        userId: item.user_id,
        status: 'processing',
        payment_account_id: accountId || null,
        payment_date: new Date(date).toISOString(),
        description: item.description ?? `Fillmaker — ${format(new Date(), 'dd/MM/yyyy')}`,
      });
      qc.invalidateQueries({ queryKey: ['fillmaker-payroll', organizationId] });
      setPaying(false);
      toast({ title: 'Pago registrado', description: 'La grabación pasó a transferencia.' });
    } catch {
      // useUpdatePayment ya muestra el toast de error
    }
  }

  const initials = (item.full_name ?? 'ED').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="rounded-lg border border-violet-500/20 bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {item.avatar_url ? (
          <img src={item.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.full_name ?? 'Editor'}</p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Camera className="h-3 w-3 text-violet-400 shrink-0" />
            {item.description ?? 'Grabación Fillmaker'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-violet-300">
            {formatCurrency(item.amount, item.currency)}
          </span>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setPaying(v => !v)}>
            <DollarSign className="h-3 w-3" />
            Pagar ya
          </Button>
        </div>
      </div>

      {paying && (
        <div className="border-t border-violet-500/20 bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">Monto</Label>
              <Input type="number" className="h-8 text-xs" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" className="h-8 text-xs" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cuenta destino</Label>
            <Select value={accountId || 'none'} onValueChange={v => setAccountId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                    {a.account_number ? ` · ${a.account_number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPaying(false)}>Cancelar</Button>
            <Button size="sm" className="gap-1" onClick={handlePay} disabled={!amount || updatePayment.isPending}>
              {updatePayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Registrar pago
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fila de talento sin liquidar ────────────────────────────────────────────

function UnpaidRow({
  entry,
  organizationId,
}: {
  entry: PayrollEntry;
  organizationId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState(false);
  const createPayment = useCreatePayment(organizationId);
  const { data: accounts = [] } = usePaymentAccounts(organizationId, entry.user_id);
  const qc = useQueryClient();

  const [amount, setAmount] = useState(String(entry.total_pending));
  const [currency, setCurrency] = useState('COP');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  async function handlePay() {
    await createPayment.mutateAsync({
      user_id: entry.user_id,
      amount: parseFloat(amount) || 0,
      currency,
      status: 'pending',
      description: `Liquidación manual — ${format(new Date(), 'dd/MM/yyyy')}`,
      payment_account_id: accountId || null,
      payment_date: new Date(date).toISOString(),
      notes: null,
      receipt_url: null,
      content_ids: entry.items.map((i) => i.id),
      created_by: null,
    });
    qc.invalidateQueries({ queryKey: ['payroll-summary', organizationId] });
    qc.invalidateQueries({ queryKey: ['monthly-closures', organizationId] });
    setPaying(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {entry.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {entry.project_count} proyecto{entry.project_count > 1 ? 's' : ''} sin liquidar
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
            {formatCurrency(entry.total_pending)}
          </span>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setPaying((v) => !v)}>
            <DollarSign className="h-3 w-3" />
            Pagar ya
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Form de pago manual */}
      {paying && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">Monto</Label>
              <Input type="number" className="h-8 text-xs" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cuenta destino</Label>
            <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                    {a.account_number ? ` · ${a.account_number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPaying(false)}>Cancelar</Button>
            <Button size="sm" className="gap-1" onClick={handlePay} disabled={!amount || createPayment.isPending}>
              {createPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Registrar pago
            </Button>
          </div>
        </div>
      )}

      {/* Proyectos */}
      {expanded && (
        <UnpaidContentTable items={entry.items} />
      )}
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export function TalentPayrollView() {
  const { currentOrgId } = useOrgOwner();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrgId ?? '';

  const { data: closures = [], isLoading: loadingClosures } = useMonthlyClosures(orgId);
  const { data: unpaid = [], isLoading: loadingUnpaid } = usePayrollSummary(orgId);
  const { data: overdue = [] } = useOverduePayments(orgId);
  const { data: paidByMonth = [], isLoading: loadingHistory } = usePaidClosuresByMonth(orgId);
  const { data: fillmakerItems = [] } = useFillmakerPayroll(orgId);
  const [runningClose, setRunningClose] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ─── Filtros locales ─────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'overdue'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'editor'>('all');
  const [search, setSearch] = useState('');

  // ─── KPIs del período global ─────────────────────────────────────────────
  const { startDate, endDate } = useFinanceFilters();
  const { data: payrollOverview } = useOrgPayrollOverview(orgId, startDate, endDate);

  useTalentFinanceRealtime(orgId);

  // ─── Filtrar closures + unpaid ───────────────────────────────────────────
  const filteredClosures = useMemo(() => {
    return closures.filter(e => {
      const s = e.payment.status;
      const due = e.payment.payment_date ? new Date(e.payment.payment_date) : null;
      const isOverdue = due && due < new Date() && s !== 'paid';

      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'processing' && s !== 'processing') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;

      if (search) {
        const q = search.toLowerCase();
        if (!e.full_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [closures, statusFilter, search]);

  const filteredUnpaid = useMemo(() => {
    return unpaid
      .map(entry => {
        let items = entry.items;
        if (roleFilter !== 'all') items = items.filter(i => i.role === roleFilter);
        const total_pending = items.reduce((s, i) => s + i.amount, 0);
        const project_count = items.length;
        return { ...entry, items, total_pending, project_count };
      })
      .filter(e => e.items.length > 0)
      .filter(e => {
        if (!search) return true;
        return e.full_name.toLowerCase().includes(search.toLowerCase());
      });
  }, [unpaid, roleFilter, search]);

  const totalClosures = useMemo(() => filteredClosures.reduce((s, e) => s + e.payment.amount, 0), [filteredClosures]);
  const totalUnpaid = useMemo(() => filteredUnpaid.reduce((s, e) => s + e.total_pending, 0), [filteredUnpaid]);

  // Agrupar cierres filtrados por usuario
  const closureGroups = useMemo(() => {
    const map = new Map<string, MonthlyClosureEntry[]>();
    for (const entry of filteredClosures) {
      const uid = entry.payment.user_id;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(entry);
    }
    return [...map.values()];
  }, [filteredClosures]);

  async function handleRunMonthlyClose() {
    setRunningClose(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-talent-payroll', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      const created = (data as any)?.payments_created ?? 0;
      toast({
        title: created > 0
          ? `Cierre ejecutado — ${created} liquidación${created > 1 ? 'es' : ''} creada${created > 1 ? 's' : ''}`
          : 'Sin proyectos nuevos para liquidar',
      });
      qc.invalidateQueries({ queryKey: ['monthly-closures', orgId] });
      qc.invalidateQueries({ queryKey: ['payroll-summary', orgId] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error al ejecutar cierre', description: msg, variant: 'destructive' });
    } finally {
      setRunningClose(false);
    }
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">

      {/* ─── Intro ─────────────────────────────────────────────── */}
      <TabIntro
        emoji="👥"
        title="¿A quién le tengo que pagar?"
        subtitle="Aquí está lo que la agencia le debe a creadores y editores: a quién, cuánto y cuándo."
        accent="orange"
        bullets={[
          'Cada mes, el día 20, se cierra la nómina automáticamente con los proyectos aprobados.',
          'El pago se hace entre el 1 y el 5 del mes siguiente.',
          'Botón azul "Transferir" → marca un pago como en proceso. Botón verde "Confirmar pago" → marca como pagado (necesita comprobante).',
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Nómina</h2>
          <p className="text-sm text-muted-foreground">
            Ciclo mensual: cierre el día 20 · pago 1–5 del mes siguiente
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(closures.length > 0 || unpaid.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await exportDetailedPayrollToCSV(closures, unpaid);
                } finally {
                  setExporting(false);
                }
              }}
              title="Exportar nómina con detalles completos de cada proyecto"
            >
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              {exporting ? 'Generando...' : 'CSV detallado'}
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleRunMonthlyClose}
              disabled={runningClose}
            >
              {runningClose
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              Ejecutar cierre
            </Button>
          )}
        </div>
      </div>

      {/* ─── Hero KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-yellow-500/15 to-yellow-600/10 border-yellow-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <BadgeDollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">Por liquidar</span>
            <HelpTip text="Total que la agencia debe a creadores y editores. Suma de pagos pendientes + en transferencia." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.to_settle ?? 0)}
          </p>
          <p className="text-yellow-400 text-[11px] mt-0.5">pendiente + en transferencia</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/15 to-blue-600/10 border-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">En proceso</span>
            <HelpTip text="Pagos que ya iniciaste pero que aún no confirmas con comprobante." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.in_transfer ?? 0)}
          </p>
          <p className="text-blue-400 text-[11px] mt-0.5">transferencias iniciadas</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/15 to-green-600/10 border-green-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">Pagado en período</span>
            <HelpTip text="TODO el dinero que salió a creadores y editores en el rango. Incluye pagos formales (talent_payments) Y los marcados directamente en cada proyecto (creator_paid/editor_paid). Sin doble conteo." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.paid_in_period ?? 0)}
          </p>
          <p className="text-green-400 text-[11px] mt-0.5">
            {payrollOverview?.talents_paid ?? 0} talento{(payrollOverview?.talents_paid ?? 0) !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/15 to-purple-600/10 border-purple-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">Pago promedio</span>
            <HelpTip text="Pagado en el período ÷ número de talentos que recibieron pago." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.avg_payment ?? 0)}
          </p>
          <p className="text-purple-400 text-[11px] mt-0.5">por talento en período</p>
        </Card>
      </div>

      {/* ─── Filtros locales ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-md bg-white/[0.02] border border-white/5">
        <span className="text-white/40 text-xs">Filtros:</span>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
        >
          <option value="all" className="bg-[#111]">Todos los estados</option>
          <option value="pending" className="bg-[#111]">Pendientes</option>
          <option value="processing" className="bg-[#111]">En transferencia</option>
          <option value="overdue" className="bg-[#111]">Vencidos</option>
        </select>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
          className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
        >
          <option value="all" className="bg-[#111]">Todos los roles</option>
          <option value="creator" className="bg-[#111]">Solo creadores</option>
          <option value="editor" className="bg-[#111]">Solo editores</option>
        </select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <Input
            placeholder="Buscar talento"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white text-xs h-7 pl-7 w-44"
          />
        </div>

        {(statusFilter !== 'all' || roleFilter !== 'all' || search) && (
          <button
            onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearch(''); }}
            className="text-xs text-white/40 hover:text-white px-2 py-1"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Próximas fechas */}
      <NextPaymentBadge />

      {/* Alerta: pagos vencidos */}
      {overdue.length > 0 && (
        <div className="rounded-lg border border-red-400/30 bg-red-50 dark:bg-red-900/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">
              {overdue.length} pago{overdue.length > 1 ? 's' : ''} vencido{overdue.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {overdue.map((op: OverduePayment) => (
              <div key={op.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{op.full_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{op.days_overdue} día{op.days_overdue !== 1 ? 's' : ''} de retraso</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(op.amount, op.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección A: Cierres pendientes de pago */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            Pendientes y en transferencia
            {filteredClosures.length > 0 && (
              <Badge className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-400/30">
                {filteredClosures.length}
              </Badge>
            )}
          </h3>
          {filteredClosures.length > 0 && (
            <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(totalClosures)}
            </span>
          )}
        </div>

        {loadingClosures ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filteredClosures.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">
              {closures.length === 0
                ? 'Sin cierres pendientes de pago'
                : 'Sin cierres con esos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {closureGroups.map((group) =>
              group.length === 1
                ? <ClosureRow key={group[0].payment.id} entry={group[0]} organizationId={orgId} />
                : <ClosureGroup key={group[0].payment.user_id} entries={group} organizationId={orgId} />
            )}
          </div>
        )}
      </div>

      {/* Sección B: Proyectos sin liquidar (para el próximo cierre) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Proyectos para el próximo cierre
            {filteredUnpaid.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {filteredUnpaid.reduce((s, e) => s + e.project_count, 0)} proy.
              </Badge>
            )}
          </h3>
          {filteredUnpaid.length > 0 && (
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(totalUnpaid)}
            </span>
          )}
        </div>

        {loadingUnpaid ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filteredUnpaid.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">
              {unpaid.length === 0
                ? 'Sin proyectos pendientes de liquidar'
                : 'Sin proyectos con esos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              Proyectos en estado <strong>Aprobado</strong> sin liquidar · Se incluyen en el cierre del día 20
            </p>
            {filteredUnpaid.map((entry) => (
              <UnpaidRow key={entry.user_id} entry={entry} organizationId={orgId} />
            ))}
          </div>
        )}

        {/* ─── Grabaciones Fillmaker (pagar ya) ── */}
        {fillmakerItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-violet-400" />
              Grabaciones Fillmaker por liquidar
            </p>
            {fillmakerItems.map((item: FillmakerPayrollItem) => (
              <FillmakerPayRow key={item.id} item={item} organizationId={orgId} />
            ))}
          </div>
        )}
      </div>

      {/* Sección C: Historial de pagos por mes */}
      <div className="space-y-3">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setHistoryExpanded((v) => !v)}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Historial de pagos
            {paidByMonth.length > 0 && (
              <Badge variant="outline" className="text-xs">{paidByMonth.length} mes{paidByMonth.length !== 1 ? 'es' : ''}</Badge>
            )}
          </h3>
          {historyExpanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {historyExpanded && (
          loadingHistory ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : paidByMonth.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <History className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
              <p className="text-sm text-muted-foreground">Sin pagos confirmados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paidByMonth.map((group: MonthlyClosureGroup) => (
                <div key={group.month} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                    <span className="text-sm font-semibold">{group.label}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{group.payment_count} pago{group.payment_count !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(group.total_paid)}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {group.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.description ?? 'Pago'}</p>
                          {p.payment_date && (
                            <p className="text-muted-foreground">
                              {format(new Date(p.payment_date), "d 'de' MMM yyyy", { locale: es })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.receipt_url && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                              <FileText className="h-2.5 w-2.5" />
                              Comprobante
                            </span>
                          )}
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(p.amount, p.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
}
