import { cn } from '@/lib/utils';
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from '../../config';
import type { ScheduledPostStatus } from '../../types/social.types';
import { Clock, CheckCircle2, AlertCircle, Loader2, XCircle, MinusCircle, Send } from 'lucide-react';

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: MinusCircle,
  scheduled: Clock,
  publishing: Loader2,
  published: CheckCircle2,
  partially_published: AlertCircle,
  failed: XCircle,
  cancelled: XCircle,
};

interface PostStatusBadgeProps {
  status: ScheduledPostStatus;
  className?: string;
}

export function PostStatusBadge({ status, className }: PostStatusBadgeProps) {
  const Icon = statusIcons[status] || Send;
  const label = POST_STATUS_LABELS[status] || status;
  const colorClass = POST_STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400';

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', colorClass, className)}>
      <Icon className={cn('w-3 h-3', status === 'publishing' && 'animate-spin')} />
      {label}
    </span>
  );
}
