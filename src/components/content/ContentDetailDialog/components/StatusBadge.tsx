import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { CheckCircle, Clock, AlertCircle, Play, Video, Eye, Send, DollarSign } from 'lucide-react';

interface StatusBadgeProps {
  status: ContentStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_ICONS: Partial<Record<ContentStatus, React.ReactNode>> = {
  draft: <Clock className="h-3 w-3" />,
  script_pending: <Clock className="h-3 w-3" />,
  script_approved: <CheckCircle className="h-3 w-3" />,
  assigned: <Play className="h-3 w-3" />,
  recorded: <Video className="h-3 w-3" />,
  recording: <Video className="h-3 w-3" />,
  editing: <Video className="h-3 w-3" />,
  review: <Eye className="h-3 w-3" />,
  delivered: <Send className="h-3 w-3" />,
  corrected: <AlertCircle className="h-3 w-3" />,
  issue: <AlertCircle className="h-3 w-3" />,
  rejected: <AlertCircle className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  paid: <DollarSign className="h-3 w-3" />,
};

export function StatusBadge({ status, className, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge 
      className={cn(
        STATUS_COLORS[status], 
        sizeClasses[size],
        'font-medium',
        className
      )}
    >
      {showIcon && STATUS_ICONS[status] && (
        <span className="mr-1">{STATUS_ICONS[status]}</span>
      )}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

interface PaymentStatusBadgeProps {
  isPaid: boolean;
  className?: string;
}

export function PaymentStatusBadge({ isPaid, className }: PaymentStatusBadgeProps) {
  return (
    <Badge 
      variant={isPaid ? 'default' : 'secondary'}
      className={className}
    >
      {isPaid ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Pagado
        </>
      ) : (
        'Pendiente'
      )}
    </Badge>
  );
}

interface ApprovalBadgeProps {
  approvedAt: string | null;
  className?: string;
}

export function ApprovalBadge({ approvedAt, className }: ApprovalBadgeProps) {
  if (!approvedAt) return null;
  
  return (
    <Badge 
      variant="secondary" 
      className={cn('bg-success/10 text-success border-success/20', className)}
    >
      <CheckCircle className="h-3 w-3 mr-1" />
      Aprobado
    </Badge>
  );
}
