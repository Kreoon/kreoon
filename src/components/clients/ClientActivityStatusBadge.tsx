import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClientActivityMetrics } from '@/types/clientActivity.types';
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_COLORS } from '@/types/clientActivity.types';

interface ClientActivityStatusBadgeProps {
  metrics: ClientActivityMetrics | undefined;
  size?: 'sm' | 'md';
  showDetail?: boolean;
}

export function ClientActivityStatusBadge({
  metrics,
  size = 'sm',
  showDetail = true,
}: ClientActivityStatusBadgeProps) {
  if (!metrics) return null;

  const { activity_status, pending_content_count, days_inactive } = metrics;
  const label = ACTIVITY_STATUS_LABELS[activity_status];
  const colorClass = ACTIVITY_STATUS_COLORS[activity_status];

  const detail =
    activity_status === 'active' && showDetail && pending_content_count > 0
      ? ` · ${pending_content_count} pend.`
      : activity_status === 'inactive' && showDetail && days_inactive !== null
        ? ` · ${days_inactive}d`
        : '';

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium shrink-0',
        size === 'sm' ? 'text-[10px] h-4 px-1.5' : 'text-xs h-5 px-2',
        colorClass,
      )}
    >
      {label}{detail}
    </Badge>
  );
}
