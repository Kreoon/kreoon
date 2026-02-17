import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoMetrics } from '@/analytics/types/dashboard';

interface GeoMapProps {
  data: GeoMetrics[];
}

// Top bar color by rank
const BAR_COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export function GeoMap({ data }: GeoMapProps) {
  const maxVisitors = data[0]?.visitors || 1;

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Top Países</h3>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          Sin datos de geolocalización
        </div>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 10).map((geo, index) => {
            const widthPct = Math.max((geo.visitors / maxVisitors) * 100, 8);
            return (
              <div key={geo.country}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4 text-right">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-300">{geo.country}</span>
                  </div>
                  <span className="text-sm text-white font-medium tabular-nums">
                    {geo.visitors.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
