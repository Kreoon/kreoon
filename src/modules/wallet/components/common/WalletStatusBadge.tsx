import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Snowflake, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WALLET_STATUS_LABELS, type WalletStatus } from '../../types';

interface WalletStatusBadgeProps {
  status: WalletStatus;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<WalletStatus, {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  dotColor: string;
}> = {
  active: {
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dotColor: 'bg-emerald-400',
  },
  frozen: {
    icon: Snowflake,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dotColor: 'bg-blue-400',
  },
  suspended: {
    icon: Ban,
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    dotColor: 'bg-red-400',
  },
};

export function WalletStatusBadge({ status, className, showIcon = true }: WalletStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {WALLET_STATUS_LABELS[status]}
    </Badge>
  );
}

// Simple dot indicator for compact spaces
export function WalletStatusDot({ status, className }: { status: WalletStatus; className?: string }) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className={cn('h-2 w-2 rounded-full', config.dotColor)} />
      <span className="text-xs text-muted-foreground">{WALLET_STATUS_LABELS[status]}</span>
    </div>
  );
}
