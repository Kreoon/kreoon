import type { FunnelStage } from '@/analytics/types/dashboard';

interface ConversionFunnelProps {
  data: FunnelStage[];
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const maxCount = data[0]?.count || 1;

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-6">Funnel de Conversión</h3>
      <div className="space-y-5">
        {data.map((stage, index) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 4);
          return (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-400">{stage.stage}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-semibold tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                  {index > 0 && (
                    <span className="text-xs text-gray-500 tabular-nums w-16 text-right">
                      {stage.conversionRate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-9 bg-gray-800/80 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}60 100%)`,
                  }}
                />
              </div>
              {index > 0 && index < data.length && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full opacity-30"
                  style={{ backgroundColor: stage.color }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      {data.length >= 2 && (
        <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">Conversión total</span>
          <span className="text-sm font-semibold text-purple-400 tabular-nums">
            {data[0].count > 0
              ? ((data[data.length - 1].count / data[0].count) * 100).toFixed(2)
              : '0.00'}%
          </span>
        </div>
      )}
    </div>
  );
}
