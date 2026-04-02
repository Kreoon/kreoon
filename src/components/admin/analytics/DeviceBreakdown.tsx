import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeviceData } from '@/analytics/types/dashboard';

// Usamos CSS variables para dark/light mode
const DEVICE_CONFIG: Record<string, { icon: typeof Monitor; color: string }> = {
  desktop:  { icon: Monitor, color: 'var(--nova-accent-primary)' },
  mobile:   { icon: Smartphone, color: 'var(--nova-aurora-2)' },
  tablet:   { icon: Tablet, color: 'var(--nova-info)' },
  unknown:  { icon: Monitor, color: 'var(--nova-text-muted)' },
};

interface DeviceBreakdownProps {
  data: DeviceData[];
}

export function DeviceBreakdown({ data }: DeviceBreakdownProps) {
  return (
    <div className="bg-[var(--nova-bg-elevated)] dark:bg-[var(--nova-bg-elevated)] rounded-sm p-6 border border-[var(--nova-border-default)]">
      <h3 className="text-lg font-semibold text-foreground mb-4">Dispositivos</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Sin datos
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(d => {
            const config = DEVICE_CONFIG[d.device] || DEVICE_CONFIG.unknown;
            const Icon = config.icon;
            return (
              <div key={d.device}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                    <span className="text-sm text-foreground/80 capitalize">{d.device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium tabular-nums">
                      {d.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                      {d.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.percentage}%`, backgroundColor: config.color }}
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
