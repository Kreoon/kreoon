import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, Clock, CheckCircle, Loader2, ChevronDown, ChevronUp,
  FileText, Wallet, TrendingUp, AlertCircle, ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useContentFinancialSummary,
  useTalentPayments,
  useSignedReceiptUrl,
} from '@/hooks/useTalentPayments';
import type { ContentFinancialItem } from '@/hooks/useTalentPayments';
import type { TalentPayment } from '@/types/talentPayments.types';
import { PAYMENT_STATUS_LABELS } from '@/types/talentPayments.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendiente',      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  processing: { label: 'En transferencia', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  paid:       { label: 'Pagado',         className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelled:  { label: 'Cancelado',      className: 'bg-muted text-muted-foreground' },
};

// ─── Card de resumen ──────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  amount,
  count,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  amount: number;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${colorClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{formatCOP(amount)}</p>
      <p className="text-[11px] opacity-70">{count} proyecto{count !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Fila de pago ─────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: TalentPayment }) {
  const [showReceipt, setShowReceipt] = useState(false);
  const { data: receiptUrl } = useSignedReceiptUrl(showReceipt ? payment.receipt_url : null);

  const badge = STATUS_BADGE[payment.status] ?? { label: payment.status, className: 'bg-muted text-muted-foreground' };

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium truncate">{payment.description ?? 'Pago'}</p>
        {payment.payment_date && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(payment.payment_date), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
          {badge.label}
        </span>
        {payment.receipt_url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Ver comprobante"
            onClick={() => {
              setShowReceipt(true);
              if (receiptUrl) window.open(receiptUrl, '_blank');
            }}
          >
            {receiptUrl
              ? <ExternalLink className="h-3 w-3" onClick={() => window.open(receiptUrl, '_blank')} />
              : <FileText className="h-3 w-3" />}
          </Button>
        )}
        <span className="font-bold text-sm">
          {formatCOP(payment.amount)}
        </span>
      </div>
    </div>
  );
}

// ─── Tabla de proyectos ───────────────────────────────────────────────────────

function ContentTable({
  items,
  title,
  emptyText,
  colorClass,
}: {
  items: ContentFinancialItem[];
  title: string;
  emptyText: string;
  colorClass?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`${colorClass}`}>{title}</span>
        <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {expanded && (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {item.role === 'creator' ? 'Creador' : item.role === 'editor' ? 'Editor' : 'Ambos'}
                </Badge>
                {item.sequence_number && (
                  <span className="font-mono text-muted-foreground shrink-0">{item.sequence_number}</span>
                )}
                <span className="truncate">{item.title}</span>
              </div>
              <span className="font-semibold shrink-0">{formatCOP(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

interface TalentWalletViewProps {
  userId: string;
  organizationId: string;
}

export function TalentWalletView({ userId, organizationId }: TalentWalletViewProps) {
  const qc = useQueryClient();
  const { data: summary, isLoading: loadingSummary } = useContentFinancialSummary(organizationId, userId);
  const { data: payments = [], isLoading: loadingPayments } = useTalentPayments(organizationId, userId);

  useEffect(() => {
    if (!organizationId || !userId) return;
    const channel = supabase
      .channel(`wallet-realtime-${organizationId}-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'content', filter: `organization_id=eq.${organizationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['content-financial-summary', organizationId, userId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'talent_payments', filter: `organization_id=eq.${organizationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, userId] });
          qc.invalidateQueries({ queryKey: ['content-financial-summary', organizationId, userId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organizationId, userId, qc]);

  const isLoading = loadingSummary || loadingPayments;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando finanzas...</span>
      </div>
    );
  }

  const s = summary ?? {
    total_en_proceso: 0, total_pendiente: 0, total_pagado: 0,
    count_en_proceso: 0, count_pendiente: 0, count_pagado: 0,
    items_pagado: [], items_pendiente: [], items_en_proceso: [],
  };

  return (
    <div className="space-y-6">

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={CheckCircle}
          label="Total cobrado"
          amount={s.total_pagado}
          count={s.count_pagado}
          colorClass="border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10"
        />
        <SummaryCard
          icon={DollarSign}
          label="Por cobrar"
          amount={s.total_pendiente}
          count={s.count_pendiente}
          colorClass="border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10"
        />
        <SummaryCard
          icon={Clock}
          label="En proceso"
          amount={s.total_en_proceso}
          count={s.count_en_proceso}
          colorClass="border-border text-muted-foreground bg-muted/30"
        />
      </div>

      {/* Proyectos pendientes de cobro */}
      {s.total_pendiente > 0 && (
        <div className="rounded-lg border border-yellow-300/40 bg-yellow-50/50 dark:bg-yellow-900/5 p-3">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-3">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">
              Tienes {formatCOP(s.total_pendiente)} aprobados pendientes de pago
            </span>
          </div>
          <ContentTable
            items={s.items_pendiente}
            title="Proyectos aprobados"
            emptyText=""
            colorClass="text-yellow-600 dark:text-yellow-400"
          />
        </div>
      )}

      {/* Proyectos en proceso */}
      <ContentTable
        items={s.items_en_proceso}
        title="En producción"
        emptyText="Sin proyectos en curso"
      />

      {/* Historial de pagos */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Historial de cobros</h3>
          {payments.length > 0 && (
            <Badge variant="outline" className="text-xs">{payments.length}</Badge>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <TrendingUp className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">Aún no hay cobros registrados</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </div>
        )}
      </div>

      {/* Proyectos cobrados */}
      <ContentTable
        items={s.items_pagado}
        title="Proyectos cobrados"
        emptyText="Sin proyectos pagados"
        colorClass="text-green-600 dark:text-green-400"
      />

    </div>
  );
}
