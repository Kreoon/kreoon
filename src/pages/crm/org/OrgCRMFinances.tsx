import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CreditCard, DollarSign, Users, AlertCircle, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, Download, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useOrgFinanceStats,
  useOrgSubscription,
  useOrgTransactions,
  useOrgInvoices,
} from '@/hooks/useFinance';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import {
  SUBSCRIPTION_PLAN_LABELS,
  SUBSCRIPTION_PLAN_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
} from '@/types/finance.types';
import type {
  TransactionType,
  TransactionStatus,
  InvoiceStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/types/finance.types';

// ============================================
// HELPERS
// ============================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

// ============================================
// MAIN COMPONENT
// ============================================

const OrgCRMFinances = () => {
  const { currentOrgId } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="text-center py-16">
          <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
          <p className="text-sm text-white/40">Selecciona una organización para acceder al CRM</p>
        </div>
      </div>
    );
  }

  return <FinancesContent orgId={currentOrgId} />;
};

// ============================================
// CONTENT
// ============================================

function FinancesContent({ orgId }: { orgId: string }) {
  const { data: stats } = useOrgFinanceStats(orgId);
  const { data: subscription } = useOrgSubscription(orgId);
  const { data: transactions = [] } = useOrgTransactions(orgId, 20);
  const { data: invoices = [] } = useOrgInvoices(orgId);

  const daysUntilRenewal = subscription?.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Finanzas</h1>
          <p className="text-white/60">Gestiona tus pagos, suscripción y facturas</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <span className="text-white/60 text-sm">Plan Actual</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {SUBSCRIPTION_PLAN_LABELS[(subscription?.plan || 'free') as SubscriptionPlan]}
            </p>
            {daysUntilRenewal !== null && daysUntilRenewal > 0 && (
              <p className="text-white/50 text-sm mt-1">
                Renueva en {daysUntilRenewal} días
              </p>
            )}
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-white/60 text-sm">Gastado Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats?.total_spent || 0)}</p>
            <p className="text-green-400 text-sm mt-1">
              {formatCurrency(stats?.spent_period || 0)} este mes
            </p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-pink-400" />
              <span className="text-white/60 text-sm">Pagado a Talento</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats?.total_paid_creators || 0)}</p>
            <p className="text-pink-400 text-sm mt-1">
              {stats?.campaigns_paid_count || 0} campañas
            </p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <span className="text-white/60 text-sm">Por Pagar</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats?.invoices_pending || 0)}</p>
            <p className="text-orange-400 text-sm mt-1">
              {stats?.invoices_pending_count || 0} facturas pendientes
            </p>
          </Card>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Subscription */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tu Suscripción</h3>

              {subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${SUBSCRIPTION_PLAN_COLORS[subscription.plan as SubscriptionPlan]}`}>
                        {SUBSCRIPTION_PLAN_LABELS[subscription.plan as SubscriptionPlan]}
                      </span>
                      <p className="text-white/50 text-sm mt-2">
                        {subscription.billing_cycle === 'monthly' ? 'Facturación mensual' : 'Facturación anual'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{formatCurrency(subscription.amount_monthly)}</p>
                      <p className="text-white/50 text-sm">/mes</p>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Estado</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      subscription.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {SUBSCRIPTION_STATUS_LABELS[subscription.status as SubscriptionStatus]}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Próximo cobro</span>
                    <span className="text-white">
                      {subscription.current_period_end
                        ? format(new Date(subscription.current_period_end), 'dd MMM yyyy', { locale: es })
                        : '-'
                      }
                    </span>
                  </div>

                  {subscription.payment_method_last4 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Método de pago</span>
                      <span className="text-white">
                        {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1 border-white/10">
                      Cambiar plan
                    </Button>
                    <Button variant="ghost" className="text-white/50">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/50 mb-4">Actualmente estás en el plan gratuito</p>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Upgrade a Pro
                  </Button>
                </div>
              )}
            </Card>

            {/* Transaction history */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Historial de Transacciones</h3>
              <div className="space-y-3">
                {transactions.slice(0, 10).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-sm ${
                        tx.transaction_type.includes('payment') ? 'bg-red-500/20' : 'bg-green-500/20'
                      }`}>
                        {tx.transaction_type.includes('payment') ? (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          {TRANSACTION_TYPE_LABELS[tx.transaction_type as TransactionType] || tx.transaction_type}
                        </p>
                        <p className="text-white/40 text-xs">
                          {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TRANSACTION_STATUS_COLORS[tx.status as TransactionStatus] || 'bg-white/10 text-white/50'}`}>
                        {TRANSACTION_STATUS_LABELS[tx.status as TransactionStatus] || tx.status}
                      </span>
                    </div>
                  </div>
                ))}

                {transactions.length === 0 && (
                  <p className="text-white/40 text-center py-8">No hay transacciones aún</p>
                )}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Invoices */}
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Facturas</h3>
                <Button variant="ghost" size="sm" className="text-purple-400">
                  Ver todas
                </Button>
              </div>

              <div className="space-y-3">
                {invoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-white/5 rounded-sm">
                    <div>
                      <p className="text-white text-sm font-mono">{invoice.invoice_number}</p>
                      <p className="text-white/40 text-xs">
                        Vence: {format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(invoice.total)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${INVOICE_STATUS_COLORS[invoice.status as InvoiceStatus] || 'bg-white/10 text-white/50'}`}>
                          {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus] || invoice.status}
                        </span>
                      </div>
                      {invoice.pdf_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {invoices.length === 0 && (
                  <p className="text-white/40 text-center py-8">No hay facturas</p>
                )}
              </div>
            </Card>

            {/* Payment methods */}
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Métodos de Pago</h3>
                <Button variant="ghost" size="sm" className="text-purple-400">
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>

              {subscription?.payment_method_last4 ? (
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-sm">
                      <CreditCard className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <p className="text-white">{subscription.payment_method_brand}</p>
                      <p className="text-white/50 text-sm">•••• {subscription.payment_method_last4}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                    Principal
                  </span>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 mb-4">No tienes métodos de pago configurados</p>
                  <Button variant="outline" className="border-white/10">
                    Agregar tarjeta
                  </Button>
                </div>
              )}
            </Card>

            {/* Creator payments summary */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pagos a Talento</h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-white/50">Total histórico</span>
                  <span className="text-white font-medium">{formatCurrency(stats?.total_paid_creators || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Este mes</span>
                  <span className="text-green-400">{formatCurrency(stats?.spent_period || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Campañas pagadas</span>
                  <span className="text-white">{stats?.campaigns_paid_count || 0}</span>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button asChild variant="ghost" className="w-full justify-start text-white/70">
                    <Link to="/talent?tab=externo">
                      <Users className="w-4 h-4 mr-2" /> Ver talento con el que has trabajado
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrgCRMFinances;
