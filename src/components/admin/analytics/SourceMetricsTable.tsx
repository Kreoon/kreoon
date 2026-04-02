import { cn } from '@/lib/utils';
import type { SourceMetrics } from '@/analytics/types/dashboard';

// CSS variables para dark/light mode
const COLORS = [
  'var(--nova-accent-primary)',
  'var(--nova-aurora-2)',
  'var(--nova-info)',
  'var(--nova-success)',
  'var(--nova-warning)',
  'var(--nova-accent-secondary)',
  'var(--nova-error)',
];

interface SourceMetricsTableProps {
  data: SourceMetrics[];
}

function RateBadge({ value }: { value: number }) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-xs font-medium tabular-nums',
      value > 5   ? 'bg-[var(--nova-success-bg)] text-[var(--nova-success)]' :
      value > 2   ? 'bg-[var(--nova-warning-bg)] text-[var(--nova-warning)]' :
      value > 0   ? 'bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                     'bg-muted text-muted-foreground'
    )}>
      {value.toFixed(2)}%
    </span>
  );
}

export function SourceMetricsTable({ data }: SourceMetricsTableProps) {
  return (
    <div className="bg-[var(--nova-bg-elevated)] rounded-sm p-6 border border-[var(--nova-border-default)]">
      <h3 className="text-lg font-semibold text-foreground mb-4">Métricas por Fuente</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Sin datos en este periodo
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-muted-foreground text-xs border-b border-border">
                <th className="pb-3 font-medium">Fuente</th>
                <th className="pb-3 text-right font-medium">Visitantes</th>
                <th className="pb-3 text-right font-medium">Signups</th>
                <th className="pb-3 text-right font-medium">Trials</th>
                <th className="pb-3 text-right font-medium">Suscripciones</th>
                <th className="pb-3 text-right font-medium">Revenue</th>
                <th className="pb-3 text-right font-medium">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="text-foreground text-sm">
              {data.map((source, index) => (
                <tr key={source.source} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="capitalize">{source.source}</span>
                  </td>
                  <td className="py-3 text-right tabular-nums">{source.visitors.toLocaleString()}</td>
                  <td className="py-3 text-right tabular-nums">{source.signups.toLocaleString()}</td>
                  <td className="py-3 text-right tabular-nums">{source.trials.toLocaleString()}</td>
                  <td className="py-3 text-right tabular-nums">{source.subscriptions.toLocaleString()}</td>
                  <td className="py-3 text-right tabular-nums font-medium text-[var(--nova-success)]">
                    ${source.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <RateBadge value={source.conversionRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
