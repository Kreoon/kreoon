import { AgingSection } from './AgingSection';
import { ProfitabilitySection } from './ProfitabilitySection';
import { CashFlowSection } from './CashFlowSection';
import { TabIntro } from './FinanceHelp';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';

interface Props {
  orgId: string;
}

export function AnalysisTab({ orgId }: Props) {
  const { currency } = useFinanceFilters();

  return (
    <div className="space-y-6">
      <TabIntro
        emoji="🔬"
        title="¿Qué dice la salud financiera de la agencia?"
        subtitle="Análisis avanzado para tomar decisiones: quién te debe hace tiempo, qué campañas dejan plata y cuánto vas a cobrar las próximas semanas."
        accent="cyan"
        bullets={[
          'Aging de Cartera: ordena las deudas de tus clientes por antigüedad. Mientras más vieja la deuda, más difícil de cobrar.',
          'Rentabilidad por Paquete: muestra cuánto dinero te dejó cada campaña después de pagar a creadores y editores. Verde = ganancia, rojo = pérdida.',
          'Flujo de Caja: predicción de cuánto dinero vas a recibir y gastar las próximas 12 semanas. Te ayuda a planear pagos grandes.',
        ]}
      />

      <AgingSection orgId={orgId} selectedCurrency={currency} />
      <ProfitabilitySection orgId={orgId} selectedCurrency={currency} />
      <CashFlowSection orgId={orgId} selectedCurrency={currency} />
    </div>
  );
}
