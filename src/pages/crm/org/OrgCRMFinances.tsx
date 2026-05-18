import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useRealtimeFinanceSync } from '@/hooks/realtime/useRealtimeFinanceSync';
import {
  useAgencyPackageStats,
  useActiveClientPackages,
} from '@/hooks/useFinance';
import type { PackageCurrency } from '@/hooks/useFinance';
import { FinanceFiltersProvider, useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { FinanceFiltersBar } from '@/components/finance/FinanceFiltersBar';
import { FinanceTab } from '@/components/finance/FinanceTab';
import { CostsTab } from '@/components/finance/CostsTab';
import { ClosingsTab } from '@/components/finance/ClosingsTab';
import { AnalysisTab } from '@/components/finance/AnalysisTab';
import { TalentPayrollView } from '@/components/talent/TalentPayrollView';

type TabKey = 'finanzas' | 'nomina' | 'costos' | 'cierres' | 'analisis';

const OrgCRMFinances = () => {
  const { currentOrgId } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="text-center py-16">
          <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
          <p className="text-sm text-white/40">Selecciona una organización para acceder</p>
        </div>
      </div>
    );
  }

  return (
    <FinanceFiltersProvider orgId={currentOrgId}>
      <FinancesShell orgId={currentOrgId} />
    </FinanceFiltersProvider>
  );
};

function FinancesShell({ orgId }: { orgId: string }) {
  const { data: stats } = useAgencyPackageStats(orgId);
  const { data: activePackages = [] } = useActiveClientPackages(orgId);
  const { connected, lastUpdated } = useRealtimeFinanceSync({ orgId });
  const { currency, setCurrency } = useFinanceFilters();

  const [activeTab, setActiveTab] = useState<TabKey>('finanzas');

  const availableCurrencies = useMemo<PackageCurrency[]>(
    () => stats?.currencies?.map(c => c.currency) ?? ['COP'],
    [stats],
  );

  // Si la moneda del contexto no existe en stats, ajustar a la primera disponible
  useMemo(() => {
    if (availableCurrencies.length > 0 && !availableCurrencies.includes(currency)) {
      setCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, currency, setCurrency]);

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Finanzas</h1>
            <p className="text-white/50 text-sm">
              Panel financiero de la agencia · ingresos, nómina, costos y cierres
            </p>
          </div>
        </div>

        {/* Barra de filtros globales */}
        <FinanceFiltersBar
          availableCurrencies={availableCurrencies}
          connected={connected}
          lastUpdated={lastUpdated}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)}>
          <TabsList className="bg-white/5 border border-white/10 mb-4">
            <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
            <TabsTrigger value="nomina">Nómina</TabsTrigger>
            <TabsTrigger value="costos">Costos</TabsTrigger>
            <TabsTrigger value="cierres">Cierres</TabsTrigger>
            <TabsTrigger value="analisis">Análisis</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab content */}
        {activeTab === 'finanzas' && <FinanceTab orgId={orgId} />}
        {activeTab === 'nomina' && <TalentPayrollView />}
        {activeTab === 'costos' && <CostsTab orgId={orgId} packages={activePackages ?? []} />}
        {activeTab === 'cierres' && <ClosingsTab orgId={orgId} />}
        {activeTab === 'analisis' && <AnalysisTab orgId={orgId} />}
      </div>
    </div>
  );
}

export default OrgCRMFinances;
