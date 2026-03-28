import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  format?: 'number' | 'currency' | 'percentage' | 'decimal';
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

function formatValue(value: string | number, format?: string): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency':
      return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` :
             value >= 1000 ? `$${(value / 1000).toFixed(1)}K` :
             `$${value.toFixed(2)}`;
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'decimal':
      return value.toFixed(2);
    default:
      return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` :
             value >= 1000 ? `${(value / 1000).toFixed(1)}K` :
             value.toString();
  }
}

export function MetricCard({ label, value, change, format, icon: Icon, className }: MetricCardProps) {
  const TrendIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : Minus;
  const trendColor = change && change > 0 ? 'text-green-400' : change && change < 0 ? 'text-red-400' : 'text-muted-foreground';

  return (
    <div className={cn('p-4 rounded-sm bg-card/50 border space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold">{formatValue(value, format)}</p>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
          <TrendIcon className="w-3 h-3" />
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
