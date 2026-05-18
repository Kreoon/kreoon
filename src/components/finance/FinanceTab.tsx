import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  TrendingUp, DollarSign, Clock, Activity,
  AlertTriangle, PlusCircle, Search, ChevronDown, ChevronUp, Gift,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useActiveClientPackages,
  useBarterPackages,
  useClientPackagesRevenue,
} from '@/hooks/useFinance';
import { useOrgFinanceOverview } from '@/hooks/useFinanceOverview';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { AbonoDialog } from './AbonoDialog';
import { InstallmentsDialog } from './InstallmentsDialog';
import { TabIntro, HelpTip, HealthBadge } from './FinanceHelp';
import { FinanceAuditPanel } from './FinanceAuditPanel';
import { FinanceHealthCard } from './FinanceHealthCard';
import { FinanceAIChat } from './FinanceAIChat';
import { Calendar } from 'lucide-react';
import {
  formatCurrency,
  PAYMENT_STATUS_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_PRIORITY,
  DueDateBadge,
} from '@/lib/finance-format';

type PendingFilter = 'todos' | 'sin_pagar' | 'parcial' | 'vencidos';

interface Props {
  orgId: string;
}

export function FinanceTab({ orgId }: Props) {
  const { startDate, endDate, currency } = useFinanceFilters();

  const { data: overview, isLoading: loadingOverview } = useOrgFinanceOverview(
    orgId, startDate, endDate, currency,
  );

  const { data: activePackages = [], refetch: refetchPackages, isLoading: loadingPackages } =
    useActiveClientPackages(orgId);
  const { data: clientRevenue = [] } = useClientPackagesRevenue(orgId);
  const { data: barterPackages = [], isLoading: loadingBarter } = useBarterPackages(orgId);

  const [pendingFilter, setPendingFilter] = useState<PendingFilter>('todos');
  const [search, setSearch] = useState('');
  const [showBarters, setShowBarters] = useState(false);
  const [abonoTarget, setAbonoTarget] = useState<{
    packageId: string;
    packageName: string;
    clientName: string;
    currency: string;
    pendingAmount: number;
  } | null>(null);

  const [installmentsTarget, setInstallmentsTarget] = useState<{
    packageId: string;
    packageName: string;
    totalValue: number;
    paidAmount: number;
    currency: string;
  } | null>(null);

  const pendingPackages = useMemo(() => {
    const now = new Date();
    return activePackages
      .filter(p => p.currency === currency)
      .filter(p => p.payment_status !== 'paid')
      .filter(p => {
        const isOverdue = p.payment_due_date && new Date(p.payment_due_date) < now;
        switch (pendingFilter) {
          case 'sin_pagar': return p.payment_status === 'pending';
          case 'parcial': return p.payment_status === 'partial';
          case 'vencidos': return isOverdue;
          default: return true;
        }
      })
      .filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q)
          || p.client_name.toLowerCase().includes(q)
          || String(p.campaign_number).includes(q);
      })
      .sort((a, b) => {
        const pa = PAYMENT_STATUS_PRIORITY[a.payment_status] ?? 9;
        const pb = PAYMENT_STATUS_PRIORITY[b.payment_status] ?? 9;
        if (pa !== pb) return pa - pb;
        if (a.payment_due_date && b.payment_due_date) {
          return new Date(a.payment_due_date).getTime() - new Date(b.payment_due_date).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activePackages, currency, pendingFilter, search]);

  const filteredRevenue = useMemo(
    () => clientRevenue
      .filter(r => r.currency === currency)
      .sort((a, b) => b.total_sold - a.total_sold),
    [clientRevenue, currency],
  );

  return (
    <div className="space-y-6">
      {/* ─── Intro ─────────────────────────────────────────────────── */}
      <TabIntro
        emoji="💰"
        title="¿Cuánto dinero entró a la agencia?"
        subtitle="Aquí ves lo que vendiste, lo que ya cobraste y lo que te falta cobrar."
        accent="blue"
        bullets={[
          'Las 4 tarjetas de arriba responden las preguntas básicas: cuánto vendiste, cuánto te pagaron, cuánto te deben y cuánto te quedó.',
          'La tabla "Cobros pendientes" te dice a quién debes cobrarle y cuándo vence.',
          'El botón verde "+Abono" registra un pago que te acaban de hacer.',
        ]}
      />

      {/* ─── Hero KPIs UNIFICADOS (agencia + marketplace) ─────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          label="Ingresos totales"
          help="Cobrado de paquetes de la agencia + ingresos de proyectos del marketplace. Es todo lo que entró a la organización en el período."
          accent="green"
          value={overview ? formatCurrency(overview.total_revenue, currency) : '—'}
          subtitle={overview
            ? `Agencia: ${formatCurrency(overview.agency_collected, currency)} · MP: ${formatCurrency(overview.mp_revenue, currency)}`
            : ''}
          loading={loadingOverview}
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-blue-400" />}
          label="Vendido"
          help="Valor de paquetes nuevos creados en el período. Es el compromiso futuro de pago de tus clientes."
          accent="blue"
          value={overview ? formatCurrency(overview.agency_sold, currency) : '—'}
          subtitle={overview ? `${overview.packages_sold} paquete${overview.packages_sold !== 1 ? 's' : ''} nuevo${overview.packages_sold !== 1 ? 's' : ''}` : ''}
          loading={loadingOverview}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-orange-400" />}
          label="Por cobrar"
          help="Deuda total acumulada de tus clientes. Es la plata que te tienen que pagar pero no lo han hecho aún."
          accent="orange"
          value={overview ? formatCurrency(overview.agency_pending, currency) : '—'}
          subtitle={overview && overview.overdue_count > 0
            ? `${overview.overdue_count} vencido${overview.overdue_count !== 1 ? 's' : ''}: ${formatCurrency(overview.overdue_amount, currency)}`
            : 'Sin vencidos'}
          loading={loadingOverview}
        />
        <KpiCard
          icon={<Activity className={`w-5 h-5 ${(overview?.net_profit ?? 0) >= 0 ? 'text-purple-400' : 'text-red-400'}`} />}
          label="Utilidad neta"
          help={currency === 'COP'
            ? "Ingresos totales − Costos − Nómina. Incluye TODOS los pagos a creadores/editores (siempre en COP, aunque el paquete sea USD)."
            : `Ingresos ${currency} − Costos ${currency}. La nómina NO se descuenta aquí porque se paga en COP (mira la caja COP).`
          }
          accent={(overview?.net_profit ?? 0) >= 0 ? 'purple' : 'red'}
          value={overview ? formatCurrency(overview.net_profit, currency) : '—'}
          subtitle={overview ? `${overview.margin_pct}% margen` : ''}
          badge={overview ? (
            (overview.net_profit > 0 && overview.margin_pct >= 20)
              ? <HealthBadge level="good" label="Sano" />
              : (overview.net_profit > 0 && overview.margin_pct >= 5)
                ? <HealthBadge level="warn" label="Margen bajo" />
                : <HealthBadge level="bad" label="En rojo" />
          ) : undefined}
          loading={loadingOverview}
        />
      </div>

      {/* ─── Health Score + Anomalías IA ────────────────────────── */}
      <FinanceHealthCard orgId={orgId} />

      {/* ─── Marketplace sub-KPIs (solo si hay actividad) ─────────── */}
      {overview && overview.mp_projects_count > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              🛍️ Marketplace
              <span className="text-xs font-normal text-white/40">
                {overview.mp_projects_count} proyecto{overview.mp_projects_count !== 1 ? 's' : ''} completado{overview.mp_projects_count !== 1 ? 's' : ''}
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-white/40 text-xs">Ingresos MP</p>
              <p className="font-semibold text-green-400">{formatCurrency(overview.mp_revenue, currency)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Pagado a creators</p>
              <p className="font-semibold text-orange-400">−{formatCurrency(overview.mp_creator_cost, currency)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Pagado a editors</p>
              <p className="font-semibold text-orange-300">−{formatCurrency(overview.mp_editor_cost, currency)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Comisión KREOON</p>
              <p className="font-semibold text-purple-400">−{formatCurrency(overview.mp_platform_fee, currency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nota informativa cuando se ve moneda extranjera */}
      {currency !== 'COP' && (
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-md px-4 py-3 text-xs text-blue-200">
          <span className="text-base leading-none mt-0.5">ℹ️</span>
          <div>
            <p className="font-medium mb-0.5">Estás viendo la caja {currency}</p>
            <p className="text-blue-200/80">
              Los pagos a creadores y editores se hacen en COP, por eso no aparecen descontados aquí.
              Para ver la utilidad real de nómina cambia el selector a COP.
            </p>
          </div>
        </div>
      )}

      {/* Panel de auditoría — transparencia total del cálculo */}
      <FinanceAuditPanel orgId={orgId} />

      {/* ─── Banner urgente ────────────────────────────────────────── */}
      {overview && overview.overdue_count > 0 && (
        <button
          onClick={() => setPendingFilter('vencidos')}
          className="w-full flex items-center gap-3 bg-red-500/15 border border-red-500/30 rounded-md px-4 py-3 hover:bg-red-500/20 transition-colors text-left"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-medium">
              {overview.overdue_count} paquete{overview.overdue_count > 1 ? 's' : ''} vencido{overview.overdue_count > 1 ? 's' : ''} · {formatCurrency(overview.overdue_amount, currency)} por recuperar
            </p>
            <p className="text-red-400/70 text-xs">Click para filtrar la tabla por vencidos</p>
          </div>
        </button>
      )}

      {/* ─── Cobros pendientes ─────────────────────────────────────── */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white">Cobros pendientes</h3>
            <p className="text-white/40 text-xs">{pendingPackages.length} paquete{pendingPackages.length !== 1 ? 's' : ''} en {currency}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip active={pendingFilter === 'todos'}    onClick={() => setPendingFilter('todos')}>Todos</FilterChip>
            <FilterChip active={pendingFilter === 'sin_pagar'} onClick={() => setPendingFilter('sin_pagar')}>Sin pagar</FilterChip>
            <FilterChip active={pendingFilter === 'parcial'}  onClick={() => setPendingFilter('parcial')}>Parciales</FilterChip>
            <FilterChip active={pendingFilter === 'vencidos'} onClick={() => setPendingFilter('vencidos')} variant="red">Vencidos</FilterChip>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <Input
                placeholder="Buscar cliente / campaña"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs h-7 pl-7 w-48"
              />
            </div>
          </div>
        </div>

        {loadingPackages ? (
          <div className="px-5 pb-5 text-white/40 text-sm">Cargando paquetes...</div>
        ) : pendingPackages.length === 0 ? (
          <div className="px-5 pb-5 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-md mx-5 mb-5 px-4 py-3">
            <DollarSign className="w-4 h-4 text-green-400" />
            <p className="text-green-300 text-sm">
              {search || pendingFilter !== 'todos'
                ? 'No hay resultados con esos filtros'
                : 'Todos los paquetes están al día'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/60 text-xs">Paquete</TableHead>
                <TableHead className="text-white/60 text-xs">Cliente</TableHead>
                <TableHead className="text-white/60 text-xs text-right">Valor</TableHead>
                <TableHead className="text-white/60 text-xs text-right">Cobrado</TableHead>
                <TableHead className="text-white/60 text-xs text-right">Pendiente</TableHead>
                <TableHead className="text-white/60 text-xs">Estado</TableHead>
                <TableHead className="text-white/60 text-xs">Fecha límite</TableHead>
                <TableHead className="text-white/60 text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingPackages.map(pkg => (
                <TableRow key={pkg.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-medium opacity-50 shrink-0">
                        #{String(pkg.campaign_number).padStart(4, '0')}
                      </span>
                      {pkg.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-white/70 text-sm">{pkg.client_name}</TableCell>
                  <TableCell className="text-white text-right text-sm">
                    {formatCurrency(pkg.total_value, pkg.currency)}
                  </TableCell>
                  <TableCell className="text-green-400 text-right text-sm">
                    {formatCurrency(pkg.paid_amount, pkg.currency)}
                  </TableCell>
                  <TableCell className="text-orange-400 text-right font-semibold text-sm">
                    {formatCurrency(pkg.total_value - pkg.paid_amount, pkg.currency)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${PAYMENT_STATUS_STYLES[pkg.payment_status] || 'bg-white/10 text-white/50'}`}>
                      {PAYMENT_STATUS_LABELS[pkg.payment_status] || pkg.payment_status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DueDateBadge dueDate={pkg.payment_due_date} paid={false} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAbonoTarget({
                          packageId: pkg.id,
                          packageName: `#${String(pkg.campaign_number).padStart(4, '0')} ${pkg.name}`,
                          clientName: pkg.client_name,
                          currency: pkg.currency,
                          pendingAmount: pkg.total_value - pkg.paid_amount,
                        })}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/20"
                        title="Registrar abono recibido"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Abono
                      </button>
                      <button
                        onClick={() => setInstallmentsTarget({
                          packageId: pkg.id,
                          packageName: `#${String(pkg.campaign_number).padStart(4, '0')} ${pkg.name}`,
                          totalValue: pkg.total_value,
                          paidAmount: pkg.paid_amount,
                          currency: pkg.currency,
                        })}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/20"
                        title="Programar plan de pagos en cuotas"
                      >
                        <Calendar className="w-3 h-3" />
                        Cuotas
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ─── Ingresos por cliente ──────────────────────────────────── */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-5 pb-3">
          <h3 className="text-base font-semibold text-white">Ingresos por cliente</h3>
          <p className="text-white/40 text-xs">Ordenado por mayor venta en {currency}</p>
        </div>

        {filteredRevenue.length === 0 ? (
          <div className="px-5 pb-5 text-white/30 text-sm">Sin clientes con ingresos en {currency}</div>
        ) : (
          <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60 text-xs">Cliente</TableHead>
                  <TableHead className="text-white/60 text-xs text-center">Paquetes</TableHead>
                  <TableHead className="text-white/60 text-xs text-right">Vendido</TableHead>
                  <TableHead className="text-white/60 text-xs text-right">Cobrado</TableHead>
                  <TableHead className="text-white/60 text-xs text-right">% Cobrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRevenue.map((c, idx) => {
                  const pct = c.total_sold > 0
                    ? Math.round((c.total_collected / c.total_sold) * 100)
                    : 0;
                  const isZero = c.total_sold === 0;
                  return (
                    <TableRow key={`${c.client_id}-${idx}`} className={`border-white/10 hover:bg-white/5 ${isZero ? 'opacity-40' : ''}`}>
                      <TableCell className="text-white font-medium text-sm">{c.client_name}</TableCell>
                      <TableCell className="text-white/70 text-center text-sm">{c.packages_count}</TableCell>
                      <TableCell className="text-white text-right text-sm">
                        {isZero ? '—' : formatCurrency(c.total_sold, c.currency)}
                      </TableCell>
                      <TableCell className="text-green-400 text-right text-sm">
                        {isZero ? '—' : formatCurrency(c.total_collected, c.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isZero ? (
                          <span className="text-white/30 text-xs">—</span>
                        ) : (
                          <span className="text-white/70 text-xs font-medium">{pct}%</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        )}
      </Card>

      {/* ─── Canjes (colapsable) ───────────────────────────────────── */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <button
          onClick={() => setShowBarters(v => !v)}
          className="w-full p-5 flex items-center justify-between gap-3 hover:bg-purple-500/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="text-left">
              <h3 className="text-base font-semibold text-white">
                Canjes
                <span className="ml-2 text-xs font-normal text-purple-300/70 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  {barterPackages.length} paquete{barterPackages.length !== 1 ? 's' : ''}
                </span>
              </h3>
              <p className="text-purple-300/60 text-xs">No generan ingreso monetario · excluidos de KPIs</p>
            </div>
          </div>
          {showBarters ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </button>

        {showBarters && (
          loadingBarter ? (
            <div className="px-5 pb-5 text-white/40 text-sm">Cargando canjes...</div>
          ) : barterPackages.length === 0 ? (
            <div className="px-5 pb-5 text-purple-300/30 text-sm">No hay paquetes de canje registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/15">
                  <TableHead className="text-purple-300/60 text-xs">Paquete</TableHead>
                  <TableHead className="text-purple-300/60 text-xs">Cliente</TableHead>
                  <TableHead className="text-purple-300/60 text-xs text-center">Videos</TableHead>
                  <TableHead className="text-purple-300/60 text-xs">Estado</TableHead>
                  <TableHead className="text-purple-300/60 text-xs">Inicio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barterPackages.map(pkg => (
                  <TableRow key={pkg.id} className="border-purple-500/10 hover:bg-purple-500/5">
                    <TableCell className="text-white/80 font-medium text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-medium opacity-50 shrink-0">
                          #{String(pkg.campaign_number).padStart(4, '0')}
                        </span>
                        {pkg.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/60 text-sm">{pkg.client_name}</TableCell>
                    <TableCell className="text-white/60 text-center text-sm">{pkg.content_quantity}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        pkg.is_active ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/30'
                      }`}>
                        {pkg.is_active ? 'Activo' : 'Cerrado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/40 text-xs">
                      {format(new Date(pkg.created_at), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </Card>

      {/* Dialog abono */}
      {abonoTarget && (
        <AbonoDialog
          orgId={orgId}
          packageId={abonoTarget.packageId}
          packageName={abonoTarget.packageName}
          clientName={abonoTarget.clientName}
          currency={abonoTarget.currency}
          pendingAmount={abonoTarget.pendingAmount}
          open={!!abonoTarget}
          onClose={() => setAbonoTarget(null)}
          onSuccess={() => void refetchPackages()}
        />
      )}

      {installmentsTarget && (
        <InstallmentsDialog
          open={!!installmentsTarget}
          onClose={() => setInstallmentsTarget(null)}
          orgId={orgId}
          packageId={installmentsTarget.packageId}
          packageName={installmentsTarget.packageName}
          totalValue={installmentsTarget.totalValue}
          paidAmount={installmentsTarget.paidAmount}
          currency={installmentsTarget.currency}
        />
      )}

      {/* Chat de IA financiero — flotante */}
      <FinanceAIChat orgId={orgId} />
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

const ACCENT_GRADIENTS: Record<string, string> = {
  green: 'from-green-500/20 to-green-600/10 border-green-500/20',
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
  red: 'from-red-500/20 to-red-600/10 border-red-500/20',
};

const ACCENT_TEXT: Record<string, string> = {
  green: 'text-green-400',
  blue: 'text-blue-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  red: 'text-red-400',
};

function KpiCard({
  icon, label, value, subtitle, accent, loading, help, badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  accent: 'green' | 'blue' | 'orange' | 'purple' | 'red';
  loading?: boolean;
  help?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card className={`bg-gradient-to-br ${ACCENT_GRADIENTS[accent]} p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded ${accent === 'green' ? 'bg-green-500/20' : accent === 'blue' ? 'bg-blue-500/20' : accent === 'orange' ? 'bg-orange-500/20' : accent === 'purple' ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
          {icon}
        </div>
        <span className="text-white/60 text-xs uppercase tracking-wide">{label}</span>
        {help && <HelpTip text={help} />}
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-white/5 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
      <div className="flex items-center justify-between gap-2 mt-1">
        {subtitle && (
          <p className={`text-xs ${ACCENT_TEXT[accent]}`}>{subtitle}</p>
        )}
        {badge}
      </div>
    </Card>
  );
}

function FilterChip({
  active, onClick, variant = 'default', children,
}: {
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'red';
  children: React.ReactNode;
}) {
  const colors = variant === 'red'
    ? active
      ? 'bg-red-500/20 text-red-300 border-red-500/30'
      : 'text-red-400/60 hover:bg-red-500/10 border-transparent'
    : active
      ? 'bg-white/15 text-white border-white/20'
      : 'text-white/50 hover:bg-white/5 border-transparent';
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${colors}`}
    >
      {children}
    </button>
  );
}
