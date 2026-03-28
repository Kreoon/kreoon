import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, Wallet, FileText, Download,
  MoreHorizontal, Check, Send,
} from 'lucide-react';
import {
  LazyBarChart,
  LazyPieChart,
  LazyChartContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Pie,
  Cell,
  ResponsiveContainer,
} from '@/components/ui/lazy-charts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  usePlatformFinanceStats,
  useRevenueByMonth,
  useAllSubscriptions,
  useAllTransactions,
  useAllInvoices,
  useAllPayouts,
  useApprovePayout,
  useProcessPayout,
} from '@/hooks/useFinance';
import { useAuth } from '@/hooks/useAuth';
import {
  SUBSCRIPTION_PLAN_LABELS,
  SUBSCRIPTION_PLAN_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  PAYOUT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/types/finance.types';
import type {
  SubscriptionPlan,
  TransactionType,
  TransactionStatus,
  InvoiceStatus,
  PayoutStatus,
  PaymentMethod,
} from '@/types/finance.types';

// ============================================
// HELPERS
// ============================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const PLAN_COLORS: Record<string, string> = {
  free: '#6B7280',
  starter: '#3B82F6',
  pro: '#A855F7',
  enterprise: '#EC4899',
};

// ============================================
// COMPONENT
// ============================================

const PlatformCRMFinances = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [txFilter, setTxFilter] = useState('all');

  const days = parseInt(period, 10);

  // Queries
  const { data: stats, isLoading: statsLoading } = usePlatformFinanceStats(days);
  const { data: revenueData } = useRevenueByMonth(12);
  const { data: subscriptions = [] } = useAllSubscriptions();
  const { data: transactions = [] } = useAllTransactions({ limit: 100 });
  const { data: invoices = [] } = useAllInvoices();
  const { data: payouts = [] } = useAllPayouts();

  // Mutations
  const approvePayout = useApprovePayout();
  const processPayout = useProcessPayout();

  // Computed
  const revenueGrowth = useMemo(() => {
    if (!stats || !stats.revenue_previous) return 0;
    return ((stats.revenue_period - stats.revenue_previous) / stats.revenue_previous) * 100;
  }, [stats]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  const filteredPayouts = useMemo(() => {
    if (payoutFilter === 'all') return payouts;
    return payouts.filter(p => p.status === payoutFilter);
  }, [payouts, payoutFilter]);

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'all') return invoices;
    return invoices.filter(i => i.status === invoiceFilter);
  }, [invoices, invoiceFilter]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter(t => t.transaction_type === txFilter);
  }, [transactions, txFilter]);

  // Handlers
  const handleApprovePayout = (payoutId: string) => {
    if (!user?.id) return;
    approvePayout.mutate({ payoutId, approvedBy: user.id });
  };

  const handleProcessPayout = (payoutId: string) => {
    processPayout.mutate({ payoutId, reference: '' });
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-48 bg-white/10 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-sm" />)}
          </div>
          <div className="h-96 bg-white/5 rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Finanzas</h1>
            <p className="text-white/60">Ingresos, suscripciones y pagos de la plataforma</p>
          </div>
          <div className="flex gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
                <SelectItem value="365">Último año</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-white/10">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-sm">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-white/60 text-sm">MRR</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats?.mrr || 0)}</p>
            <p className="text-green-400 text-sm mt-1">
              ARR: {formatCurrency(stats?.arr || 0)}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-sm">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-white/60 text-sm">Ingresos ({period}d)</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats?.revenue_period || 0)}</p>
            <p className={`text-sm mt-1 ${revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs período anterior
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-sm">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-white/60 text-sm">Pagos a Talento</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats?.payouts_period || 0)}</p>
            <p className="text-purple-400 text-sm mt-1">
              Pendientes: {formatCurrency(stats?.payouts_pending || 0)}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-sm">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-white/60 text-sm">Por Cobrar</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats?.invoices_pending_amount || 0)}</p>
            <p className="text-orange-400 text-sm mt-1">
              {stats?.invoices_pending_count || 0} facturas · {stats?.invoices_overdue_count || 0} vencidas
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
            <TabsTrigger value="invoices">Facturas</TabsTrigger>
            <TabsTrigger value="payouts">Pagos a Talento</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue chart */}
            <Card className="lg:col-span-2 bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Ingresos vs Pagos (12 meses)</h3>
              <LazyChartContainer height={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyBarChart data={revenueData || []}>
                    <XAxis dataKey="month" stroke="#ffffff60" fontSize={12} />
                    <YAxis stroke="#ffffff60" fontSize={12} tickFormatter={(v: number) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Ingresos" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payouts" name="Pagos" fill="#A855F7" radius={[4, 4, 0, 0]} />
                  </LazyBarChart>
                </ResponsiveContainer>
              </LazyChartContainer>
            </Card>

            {/* Subscriptions by plan */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Suscripciones por Plan</h3>
              <div className="space-y-4">
                {(stats?.subscriptions_by_plan || []).map(item => (
                  <div key={item.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${SUBSCRIPTION_PLAN_COLORS[item.plan]}`}>
                        {SUBSCRIPTION_PLAN_LABELS[item.plan]}
                      </span>
                      <span className="text-white/50">{item.count} orgs</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(item.mrr)}/mo</span>
                  </div>
                ))}
                {(!stats?.subscriptions_by_plan || stats.subscriptions_by_plan.length === 0) && (
                  <p className="text-white/30 text-sm text-center py-4">Sin suscripciones activas</p>
                )}
              </div>

              {(stats?.subscriptions_by_plan?.length || 0) > 0 && (
                <div className="mt-6">
                  <LazyChartContainer height={150}>
                    <ResponsiveContainer width="100%" height={150}>
                      <LazyPieChart>
                        <Pie
                          data={stats?.subscriptions_by_plan || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="mrr"
                          nameKey="plan"
                        >
                          {(stats?.subscriptions_by_plan || []).map((entry, index) => (
                            <Cell key={index} fill={PLAN_COLORS[entry.plan] || '#6B7280'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </LazyPieChart>
                    </ResponsiveContainer>
                  </LazyChartContainer>
                </div>
              )}
            </Card>

            {/* Recent transactions */}
            <Card className="lg:col-span-3 bg-white/5 border-white/10 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Transacciones Recientes</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                  Ver todas
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Fecha</TableHead>
                    <TableHead className="text-white/70">Tipo</TableHead>
                    <TableHead className="text-white/70">Descripción</TableHead>
                    <TableHead className="text-white/70">Monto</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-white/30 py-8">
                        Sin transacciones recientes
                      </TableCell>
                    </TableRow>
                  )}
                  {recentTransactions.map(tx => (
                    <TableRow key={tx.id} className="border-white/10">
                      <TableCell className="text-white/50">
                        {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <span className="text-white/70">
                          {TRANSACTION_TYPE_LABELS[tx.transaction_type as TransactionType] || tx.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-white/70">{tx.description || '-'}</TableCell>
                      <TableCell className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${TRANSACTION_STATUS_COLORS[tx.status as TransactionStatus] || 'bg-white/10 text-white/50'}`}>
                          {TRANSACTION_STATUS_LABELS[tx.status as TransactionStatus] || tx.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Tab: Subscriptions */}
        {activeTab === 'subscriptions' && (
          <Card className="bg-white/5 border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/70">Organización</TableHead>
                  <TableHead className="text-white/70">Plan</TableHead>
                  <TableHead className="text-white/70">Ciclo</TableHead>
                  <TableHead className="text-white/70">Monto/mes</TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                  <TableHead className="text-white/70">Próximo cobro</TableHead>
                  <TableHead className="text-white/70"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-white/30 py-8">
                      Sin suscripciones registradas
                    </TableCell>
                  </TableRow>
                )}
                {subscriptions.map(sub => (
                  <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white">{sub.organization_id}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${SUBSCRIPTION_PLAN_COLORS[sub.plan]}`}>
                        {SUBSCRIPTION_PLAN_LABELS[sub.plan]}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/70">
                      {sub.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
                    </TableCell>
                    <TableCell className="text-green-400">{formatCurrency(sub.amount_monthly)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        sub.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        sub.status === 'past_due' ? 'bg-red-500/20 text-red-300' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/50">
                      {sub.current_period_end
                        ? format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: es })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Tab: Transactions */}
        {activeTab === 'transactions' && (
          <>
            <div className="flex gap-3 mb-4">
              <Select value={txFilter} onValueChange={setTxFilter}>
                <SelectTrigger className="w-52 bg-white/5 border-white/10">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="subscription_payment">Pago suscripción</SelectItem>
                  <SelectItem value="campaign_payment">Pago campaña</SelectItem>
                  <SelectItem value="creator_payout">Pago a talento</SelectItem>
                  <SelectItem value="platform_fee">Comisión</SelectItem>
                  <SelectItem value="refund">Reembolso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="bg-white/5 border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Fecha</TableHead>
                    <TableHead className="text-white/70">Tipo</TableHead>
                    <TableHead className="text-white/70">Descripción</TableHead>
                    <TableHead className="text-white/70">Monto</TableHead>
                    <TableHead className="text-white/70">Comisión</TableHead>
                    <TableHead className="text-white/70">Neto</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-white/30 py-8">
                        Sin transacciones
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTransactions.map(tx => (
                    <TableRow key={tx.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white/50">
                        {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <span className="text-white/70">
                          {TRANSACTION_TYPE_LABELS[tx.transaction_type as TransactionType] || tx.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-white/70 max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-white/50">
                        {tx.fee_amount ? formatCurrency(tx.fee_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formatCurrency(tx.net_amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${TRANSACTION_STATUS_COLORS[tx.status as TransactionStatus] || 'bg-white/10 text-white/50'}`}>
                          {TRANSACTION_STATUS_LABELS[tx.status as TransactionStatus] || tx.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Tab: Invoices */}
        {activeTab === 'invoices' && (
          <>
            <div className="flex gap-3 mb-4">
              <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="bg-white/5 border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">N° Factura</TableHead>
                    <TableHead className="text-white/70">Organización</TableHead>
                    <TableHead className="text-white/70">Subtotal</TableHead>
                    <TableHead className="text-white/70">Impuesto</TableHead>
                    <TableHead className="text-white/70">Total</TableHead>
                    <TableHead className="text-white/70">Vencimiento</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                    <TableHead className="text-white/70"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-white/30 py-8">
                        Sin facturas
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredInvoices.map(inv => (
                    <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell className="text-white/70">{inv.billing_name || inv.organization_id}</TableCell>
                      <TableCell className="text-white/70">{formatCurrency(inv.subtotal)}</TableCell>
                      <TableCell className="text-white/50">{formatCurrency(inv.tax_amount)}</TableCell>
                      <TableCell className="text-white font-medium">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="text-white/50">
                        {format(new Date(inv.due_date), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] || 'bg-white/10 text-white/50'}`}>
                          {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] || inv.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Tab: Payouts */}
        {activeTab === 'payouts' && (
          <>
            {/* Payout stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white/5 border-white/10 p-4">
                <p className="text-white/50 text-sm">Pendientes de aprobar</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {payouts.filter(p => p.status === 'pending').length}
                </p>
              </Card>
              <Card className="bg-white/5 border-white/10 p-4">
                <p className="text-white/50 text-sm">En proceso</p>
                <p className="text-2xl font-bold text-blue-400">
                  {payouts.filter(p => p.status === 'processing').length}
                </p>
              </Card>
              <Card className="bg-white/5 border-white/10 p-4">
                <p className="text-white/50 text-sm">Monto pendiente</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(
                    payouts
                      .filter(p => ['pending', 'approved', 'processing'].includes(p.status))
                      .reduce((sum, p) => sum + p.net_amount, 0)
                  )}
                </p>
              </Card>
              <Card className="bg-white/5 border-white/10 p-4">
                <p className="text-white/50 text-sm">Pagado este período</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(stats?.payouts_period || 0)}
                </p>
              </Card>
            </div>

            {/* Filter */}
            <div className="flex gap-3 mb-4">
              <Select value={payoutFilter} onValueChange={setPayoutFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="processing">En proceso</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payouts table */}
            <Card className="bg-white/5 border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Talento</TableHead>
                    <TableHead className="text-white/70">Monto bruto</TableHead>
                    <TableHead className="text-white/70">Comisión</TableHead>
                    <TableHead className="text-white/70">Neto</TableHead>
                    <TableHead className="text-white/70">Método</TableHead>
                    <TableHead className="text-white/70">Solicitado</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                    <TableHead className="text-white/70">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-white/30 py-8">
                        Sin pagos registrados
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredPayouts.map(payout => (
                    <TableRow key={payout.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300 text-sm font-medium">
                            {payout.creator_id?.charAt(0) || '?'}
                          </div>
                          <span className="text-white">{payout.creator_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{formatCurrency(payout.gross_amount)}</TableCell>
                      <TableCell className="text-white/50">{formatCurrency(payout.platform_fee)}</TableCell>
                      <TableCell className="text-green-400 font-medium">{formatCurrency(payout.net_amount)}</TableCell>
                      <TableCell className="text-white/70">
                        {payout.payment_method
                          ? PAYMENT_METHOD_LABELS[payout.payment_method as PaymentMethod] || payout.payment_method
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-white/50">
                        {formatDistanceToNow(new Date(payout.requested_at), { locale: es, addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          payout.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          payout.status === 'approved' ? 'bg-blue-500/20 text-blue-300' :
                          payout.status === 'processing' ? 'bg-purple-500/20 text-purple-300' :
                          payout.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {PAYOUT_STATUS_LABELS[payout.status as PayoutStatus] || payout.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payout.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300"
                              onClick={() => handleApprovePayout(payout.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {payout.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() => handleProcessPayout(payout.id)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformCRMFinances;
