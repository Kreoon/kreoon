import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoMetrics } from '@/analytics/types/dashboard';

interface GeoMapProps {
  data: GeoMetrics[];
}

// Top bar color by rank - usando CSS variables
const BAR_COLORS = [
  'var(--nova-accent-primary)',
  'var(--nova-accent-primary-hover)',
  'var(--nova-accent-glow)',
  'var(--nova-text-secondary)',
  'var(--nova-text-muted)'
];

export function GeoMap({ data }: GeoMapProps) {
  const maxVisitors = data[0]?.visitors || 1;

  return (
    <div className="bg-[var(--nova-bg-elevated)] rounded-sm p-6 border border-[var(--nova-border-default)]">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-[var(--nova-accent-secondary)]" />
        <h3 className="text-lg font-semibold text-foreground">Top Países</h3>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
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
                    <span className="text-xs text-muted-foreground w-4 text-right">
                      {index + 1}
                    </span>
                    <span className="text-sm text-foreground/80">{geo.country}</span>
                  </div>
                  <span className="text-sm text-foreground font-medium tabular-nums">
                    {geo.visitors.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
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
