import { useState } from 'react';
import { format, addDays, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Banknote,
  CalendarClock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTalentPayroll, useConfirmTalentPayment } from '@/hooks/useTalentPayroll';
import type { EnrichedTalentPayment, TalentPaymentRole } from '@/hooks/useTalentPayroll';

// ============================================
// HELPERS
// ============================================

function formatPaymentCurrency(amount: number, currency: string): string {
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
}

function isDueSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  const threshold = addDays(new Date(), 3);
  return due <= threshold;
}

function isDueOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  return isPast(due) && !isToday(due);
}

function getTalentInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ============================================
// ROLE BADGE
// ============================================

const ROLE_LABELS: Record<TalentPaymentRole, string> = {
  creator: 'Creador',
  editor: 'Editor',
  mixed: 'Mixto',
  manual: 'Manual',
  fillmaker: 'Fillmaker',
  legacy: 'Legacy',
};

const ROLE_COLORS: Record<TalentPaymentRole, string> = {
  creator: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  editor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  mixed: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  manual: 'bg-white/10 text-white/60 border-white/10',
  fillmaker: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  legacy: 'bg-white/10 text-white/40 border-white/10',
};

function RoleBadge({ role }: { role: TalentPaymentRole | null }) {
  const key = (role ?? 'manual') as TalentPaymentRole;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[key]}`}
    >
      {ROLE_LABELS[key]}
    </span>
  );
}

// ============================================
// KPI CARD
// ============================================

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  alert?: boolean;
}

function KpiCard({ icon, label, value, sub, alert }: KpiCardProps) {
  return (
    <Card
      className={`bg-white/5 border-white/10 p-5 ${alert ? 'border-red-500/40 bg-red-500/5' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={alert ? 'text-red-400' : 'text-white/50'}>{icon}</span>
        <span className="text-white/60 text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${alert ? 'text-red-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </Card>
  );
}

// ============================================
// PAYMENT ROW
// ============================================

interface PaymentRowProps {
  payment: EnrichedTalentPayment;
  orgId: string;
}

function PaymentRow({ payment, orgId }: PaymentRowProps) {
  const confirm = useConfirmTalentPayment();

  const handleConfirm = () => {
    const talentName = payment.talent?.full_name ?? 'este talento';
    const amountStr = formatPaymentCurrency(payment.amount, payment.currency);
    const ok = window.confirm(
      `¿Confirmar pago a ${talentName} por ${amountStr}?\n\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;
    confirm.mutate({ paymentId: payment.id, orgId });
  };

  const contentCount = payment.content_ids?.length ?? 0;

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 bg-white/[0.03] rounded-lg border border-white/5 hover:bg-white/[0.06] transition-colors">
      {/* Talent info */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={payment.talent?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-white/10 text-white/70 text-xs">
            {getTalentInitials(payment.talent?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {payment.talent?.full_name ?? 'Talento desconocido'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <RoleBadge role={payment.role} />
            {contentCount > 0 && (
              <span className="text-white/40 text-xs">{contentCount} contenido{contentCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Amount + action */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-white font-semibold text-sm">
          {formatPaymentCurrency(payment.amount, payment.currency)}
        </span>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={confirm.isPending}
          className="bg-green-600/80 hover:bg-green-600 text-white border-0 h-8 px-3 text-xs"
        >
          {confirm.isPending ? 'Procesando…' : 'Marcar pagado'}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// PAID HISTORY ROW
// ============================================

function PaidHistoryRow({ payment }: { payment: EnrichedTalentPayment }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-4 bg-white/[0.02] rounded-lg border border-white/5">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={payment.talent?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-white/10 text-white/60 text-xs">
            {getTalentInitials(payment.talent?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-white/80 text-sm truncate">
            {payment.talent?.full_name ?? 'Talento desconocido'}
          </p>
          {payment.cycle_label && (
            <p className="text-white/40 text-xs truncate">{payment.cycle_label}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-right">
        <div>
          <RoleBadge role={payment.role} />
        </div>
        <div>
          <p className="text-green-400 text-sm font-medium">
            {formatPaymentCurrency(payment.amount, payment.currency)}
          </p>
          {payment.payment_date && (
            <p className="text-white/40 text-xs">{formatDate(payment.payment_date)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface TalentPayrollPanelProps {
  orgId: string;
}

export function TalentPayrollPanel({ orgId }: TalentPayrollPanelProps) {
  const { data, isLoading, error } = useTalentPayroll(orgId);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-red-300 text-sm">Error al cargar la nómina: {(error as Error).message}</p>
      </div>
    );
  }

  const { payments = [], kpis } = data ?? {
    payments: [],
    kpis: {
      totalPending: 0,
      totalPaidThisMonth: 0,
      nextDueDate: null,
      pendingCount: 0,
      talentsPending: 0,
    },
  };

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const paidPayments = payments
    .filter((p) => p.status === 'paid')
    .sort((a, b) => (b.payment_date ?? '').localeCompare(a.payment_date ?? ''))
    .slice(0, 10);

  // Group pending by cycle_label
  const groupedPending = pendingPayments.reduce<Record<string, EnrichedTalentPayment[]>>(
    (acc, payment) => {
      const key = payment.cycle_label ?? 'Sin corte asignado';
      if (!acc[key]) acc[key] = [];
      acc[key].push(payment);
      return acc;
    },
    {}
  );

  const isNextDueSoon = isDueSoon(kpis.nextDueDate);
  const isNextDueOverdue = isDueOverdue(kpis.nextDueDate);
  const nextDueAlert = isNextDueSoon || isNextDueOverdue;

  return (
    <div className="space-y-6">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          icon={<Banknote className="w-4 h-4" />}
          label="Por liquidar"
          value={formatPaymentCurrency(kpis.totalPending, 'COP')}
          sub={
            kpis.pendingCount > 0
              ? `${kpis.pendingCount} pago${kpis.pendingCount !== 1 ? 's' : ''} · ${kpis.talentsPending} talento${kpis.talentsPending !== 1 ? 's' : ''}`
              : 'Sin pagos pendientes'
          }
        />

        <KpiCard
          icon={<CalendarClock className="w-4 h-4" />}
          label="Próximo vencimiento"
          value={
            kpis.nextDueDate ? (
              <span className={nextDueAlert ? 'text-red-300' : 'text-white'}>
                {formatDate(kpis.nextDueDate)}
              </span>
            ) : (
              <span className="text-white/40 text-base font-normal">Sin fecha</span>
            )
          }
          sub={
            isNextDueOverdue
              ? 'Vencido'
              : isNextDueSoon
              ? 'Vence pronto'
              : undefined
          }
          alert={nextDueAlert}
        />

        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Pagado este mes"
          value={formatPaymentCurrency(kpis.totalPaidThisMonth, 'COP')}
        />
      </div>

      {/* ── Pendientes agrupados por corte ── */}
      <div className="space-y-5">
        {pendingPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white/[0.02] rounded-xl border border-white/5">
            <CheckCircle2 className="w-10 h-10 text-green-400/40 mb-3" />
            <p className="text-white/60 font-medium">No hay pagos pendientes</p>
            <p className="text-white/30 text-sm mt-1">
              El próximo corte es el 15 o el último día del mes.
            </p>
          </div>
        ) : (
          Object.entries(groupedPending).map(([cycleLabel, group]) => {
            // Use the due_payment_date of the first item in the group
            const dueDate = group[0]?.due_payment_date ?? null;
            const groupTotal = group.reduce((sum, p) => sum + (p.amount ?? 0), 0);
            const groupAlert = isDueSoon(dueDate) || isDueOverdue(dueDate);

            return (
              <div key={cycleLabel} className="space-y-2">
                {/* Group header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${groupAlert ? 'text-red-400' : 'text-white/40'}`} />
                    <span className={`text-sm font-semibold ${groupAlert ? 'text-red-300' : 'text-white/80'}`}>
                      {cycleLabel}
                    </span>
                    {dueDate && (
                      <Badge
                        className={`text-xs px-2 py-0 ${
                          groupAlert
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-white/10 text-white/50 border-white/10'
                        }`}
                        variant="outline"
                      >
                        Vence {formatDate(dueDate)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-white/50 text-xs">
                    Total: {formatPaymentCurrency(groupTotal, 'COP')}
                  </span>
                </div>

                {/* Payment rows */}
                <div className="space-y-2">
                  {group.map((payment) => (
                    <PaymentRow key={payment.id} payment={payment} orgId={orgId} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Historial pagados ── */}
      {paidPayments.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm w-full"
          >
            {historyOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <Users className="w-4 h-4" />
            <span>Historial de pagos recientes ({paidPayments.length})</span>
          </button>

          {historyOpen && (
            <div className="mt-3 space-y-2">
              {paidPayments.map((payment) => (
                <PaidHistoryRow key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TalentPayrollPanel;
