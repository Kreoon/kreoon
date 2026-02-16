import { cn } from '@/lib/utils';
import type { SourceMetrics } from '@/analytics/types/dashboard';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'];

interface SourceMetricsTableProps {
  data: SourceMetrics[];
}

function RateBadge({ value }: { value: number }) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-xs font-medium tabular-nums',
      value > 5   ? 'bg-green-500/20 text-green-400' :
      value > 2   ? 'bg-yellow-500/20 text-yellow-400' :
      value > 0   ? 'bg-orange-500/20 text-orange-400' :
                     'bg-gray-500/20 text-gray-400'
    )}>
      {value.toFixed(2)}%
    </span>
  );
}

export function SourceMetricsTable({ data }: SourceMetricsTableProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">Métricas por Fuente</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          Sin datos en este periodo
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b border-gray-800">
                <th className="pb-3 font-medium">Fuente</th>
                <th className="pb-3 text-right font-medium">Visitantes</th>
                <th className="pb-3 text-right font-medium">Signups</th>
                <th className="pb-3 text-right font-medium">Trials</th>
                <th className="pb-3 text-right font-medium">Suscripciones</th>
                <th className="pb-3 text-right font-medium">Revenue</th>
                <th className="pb-3 text-right font-medium">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="text-white text-sm">
              {data.map((source, index) => (
                <tr key={source.source} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
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
                  <td className="py-3 text-right tabular-nums font-medium text-green-400">
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
