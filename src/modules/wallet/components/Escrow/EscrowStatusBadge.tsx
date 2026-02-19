import {
  Lock,
  UserPlus,
  Eye,
  CheckCircle,
  Unlock,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EscrowStatus } from '../../types';

const STATUS_CONFIG: Record<
  EscrowStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  active: {
    icon: Lock,
    label: 'Fondos Bloqueados',
    description: 'Los fondos están asegurados en escrow esperando que se complete la campaña.',
    color: 'text-amber-400 border-amber-500/30',
    bgColor: 'bg-amber-500/10',
  },
  pending_editor: {
    icon: UserPlus,
    label: 'Esperando Editor',
    description: 'La campaña necesita un editor asignado antes de continuar.',
    color: 'text-blue-400 border-blue-500/30',
    bgColor: 'bg-blue-500/10',
  },
  pending_approval: {
    icon: Eye,
    label: 'En Revisión',
    description: 'El contenido fue entregado y está esperando aprobación del cliente.',
    color: 'text-primary border-[hsl(270,100%,60%,0.3)]',
    bgColor: 'bg-[hsl(270,100%,60%,0.1)]',
  },
  released: {
    icon: CheckCircle,
    label: 'Liberado',
    description: 'Los fondos han sido liberados a los participantes de la campaña.',
    color: 'text-emerald-400 border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
  },
  partially_released: {
    icon: Unlock,
    label: 'Parcialmente Liberado',
    description: 'Parte de los fondos ha sido liberada. El resto sigue en escrow.',
    color: 'text-emerald-400/80 border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
  },
  refunded: {
    icon: RefreshCw,
    label: 'Reembolsado',
    description: 'Los fondos fueron devueltos al pagador original.',
    color: 'text-orange-400 border-orange-500/30',
    bgColor: 'bg-orange-500/10',
  },
  disputed: {
    icon: AlertTriangle,
    label: 'En Disputa',
    description: 'Hay una disputa activa. Los fondos permanecen bloqueados hasta resolución.',
    color: 'text-red-400 border-red-500/30',
    bgColor: 'bg-red-500/10',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelado',
    description: 'El escrow fue cancelado y los fondos fueron devueltos.',
    color: 'text-gray-400 border-gray-500/30',
    bgColor: 'bg-gray-500/10',
  },
};

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}

export function EscrowStatusBadge({
  status,
  size = 'md',
  showTooltip = true,
  className,
}: EscrowStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5',
        config.color,
        config.bgColor,
        size === 'sm' && 'text-[10px] px-2 py-0.5',
        size === 'md' && 'text-xs px-2.5 py-1',
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper function to get just the colors for external use
export function getEscrowStatusColors(status: EscrowStatus) {
  return STATUS_CONFIG[status];
}
