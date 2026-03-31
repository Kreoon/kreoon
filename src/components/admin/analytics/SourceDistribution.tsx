import {
  LazyPieChart,
  LazyChartContainer,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from '@/components/ui/lazy-charts';
import type { SourceMetrics } from '@/analytics/types/dashboard';

// Usamos CSS variables para compatibilidad con dark/light mode
const COLORS = [
  'var(--nova-accent-primary)',     // Violeta
  'var(--nova-aurora-2)',           // Rosa
  'var(--nova-info)',               // Azul
  'var(--nova-success)',            // Verde
  'var(--nova-warning)',            // Amarillo
  'var(--nova-accent-secondary)',   // Cyan
  'var(--nova-error)',              // Rojo
];

interface SourceDistributionProps {
  data: SourceMetrics[];
}

export function SourceDistribution({ data }: SourceDistributionProps) {
  const chartData = data
    .filter(s => s.revenue > 0 || s.visitors > 0)
    .slice(0, 7)
    .map(s => ({
      name: s.source,
      value: s.revenue > 0 ? s.revenue : s.visitors,
      type: s.revenue > 0 ? 'revenue' : 'visitors',
    }));

  const hasRevenue = data.some(s => s.revenue > 0);

  return (
    <div className="bg-[var(--nova-bg-elevated)] dark:bg-[var(--nova-bg-elevated)] rounded-sm p-6 border border-[var(--nova-border-default)]">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {hasRevenue ? 'Revenue por Fuente' : 'Visitantes por Fuente'}
      </h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
          Sin datos en este periodo
        </div>
      ) : (
        <LazyChartContainer height={250}>
          <ResponsiveContainer width="100%" height={250}>
            <LazyPieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                label={({ name, value }) =>
                  hasRevenue ? `${name}: $${value.toLocaleString()}` : `${name}: ${value.toLocaleString()}`
                }
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => hasRevenue ? `$${value.toLocaleString()}` : value.toLocaleString()}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
              />
            </LazyPieChart>
          </ResponsiveContainer>
        </LazyChartContainer>
      )}
    </div>
  );
}
