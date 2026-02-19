import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Lock,
  Unlock,
  RotateCcw,
  DollarSign,
  Percent,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransactionType } from '../../types';

interface TransactionIconProps {
  type: TransactionType;
  size?: number;
  className?: string;
  showBackground?: boolean;
}

const ICON_CONFIG: Record<TransactionType, { icon: LucideIcon; color: string; bgColor: string }> = {
  deposit: {
    icon: ArrowDownCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  withdrawal: {
    icon: ArrowUpCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  transfer_in: {
    icon: ArrowLeftRight,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  transfer_out: {
    icon: ArrowLeftRight,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  escrow_hold: {
    icon: Lock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  escrow_release: {
    icon: Unlock,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  escrow_refund: {
    icon: RotateCcw,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  payment_received: {
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  platform_fee: {
    icon: Percent,
    color: 'text-muted-foreground',
    bgColor: 'bg-[hsl(270,100%,60%,0.1)]',
  },
  adjustment: {
    icon: Settings,
    color: 'text-muted-foreground',
    bgColor: 'bg-[hsl(270,100%,60%,0.1)]',
  },
};

export function TransactionIcon({
  type,
  size = 20,
  className,
  showBackground = false,
}: TransactionIconProps) {
  const config = ICON_CONFIG[type];
  const Icon = config.icon;

  if (showBackground) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          config.bgColor,
          className
        )}
        style={{ width: size * 2, height: size * 2 }}
      >
        <Icon className={config.color} style={{ width: size, height: size }} />
      </div>
    );
  }

  return <Icon className={cn(config.color, className)} style={{ width: size, height: size }} />;
}

// Get icon component for custom rendering
export function getTransactionIconComponent(type: TransactionType): LucideIcon {
  return ICON_CONFIG[type].icon;
}

// Get colors for custom styling
export function getTransactionColors(type: TransactionType) {
  return {
    color: ICON_CONFIG[type].color,
    bgColor: ICON_CONFIG[type].bgColor,
  };
}
