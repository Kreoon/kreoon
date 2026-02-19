import { cn } from '@/lib/utils';
import { Circle, Clock, Play, Pause, CheckCircle2, XCircle, Archive } from 'lucide-react';
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from '../../config';
import type { AdCampaignStatus } from '../../types/marketing.types';

const statusIcons: Record<AdCampaignStatus, React.ComponentType<{ className?: string }>> = {
  draft: Circle,
  pending_review: Clock,
  active: Play,
  paused: Pause,
  completed: CheckCircle2,
  rejected: XCircle,
  archived: Archive,
};

interface CampaignStatusBadgeProps {
  status: AdCampaignStatus;
  className?: string;
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const Icon = statusIcons[status] || Circle;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
      CAMPAIGN_STATUS_COLORS[status],
      className
    )}>
      <Icon className="w-3 h-3" />
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}
