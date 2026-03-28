import { motion } from 'framer-motion';
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Ban,
  ExternalLink,
  Copy,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WithdrawalDisplay, WithdrawalStatus as WStatus } from '../../types';

const STATUS_ICONS: Record<WStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  rejected: XCircle,
  cancelled: Ban,
};

interface WithdrawalStatusProps {
  withdrawal: WithdrawalDisplay;
  onCancel?: () => void;
  isCancelling?: boolean;
  className?: string;
}

export function WithdrawalStatusCard({
  withdrawal,
  onCancel,
  isCancelling,
  className,
}: WithdrawalStatusProps) {
  const Icon = STATUS_ICONS[withdrawal.status];
  const canCancel = withdrawal.status === 'pending';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const statusConfig: Record<WStatus, { color: string; bgColor: string; label: string }> = {
    pending: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: 'Esperando revisión del equipo de pagos',
    },
    processing: {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      label: 'Tu pago está siendo procesado',
    },
    completed: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      label: 'El pago ha sido enviado exitosamente',
    },
    rejected: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'La solicitud fue rechazada',
    },
    cancelled: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      label: 'Solicitud cancelada',
    },
  };

  const config = statusConfig[withdrawal.status];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Status banner */}
      <div className={cn('p-4 border-b border-[hsl(270,100%,60%,0.1)]', config.bgColor)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full', config.bgColor)}>
            <Icon
              className={cn(
                'h-5 w-5',
                config.color,
                withdrawal.status === 'processing' && 'animate-spin'
              )}
            />
          </div>
          <div>
            <p className={cn('font-semibold', config.color)}>
              {withdrawal.statusLabel}
            </p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
      </div>

      <CardContent className="pt-6 space-y-6">
        {/* Amount summary */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Monto a recibir</p>
          <p className="text-3xl font-bold text-white">{withdrawal.formattedNetAmount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Solicitado: {withdrawal.formattedAmount} (Fee: {withdrawal.formattedFee})
          </p>
        </div>

        <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

        {/* Details */}
        <div className="space-y-3">
          <DetailRow
            label="ID de solicitud"
            value={withdrawal.id.slice(0, 8) + '...'}
            copyValue={withdrawal.id}
            onCopy={copyToClipboard}
          />
          <DetailRow label="Método de pago" value={withdrawal.methodLabel} />
          <DetailRow label="Detalles" value={withdrawal.paymentSummary} />
          <DetailRow label="Fecha de solicitud" value={withdrawal.formattedDate} />
          {withdrawal.formattedProcessedDate && (
            <DetailRow label="Fecha de proceso" value={withdrawal.formattedProcessedDate} />
          )}
          {withdrawal.external_reference && (
            <DetailRow
              label="Referencia externa"
              value={withdrawal.external_reference}
              copyValue={withdrawal.external_reference}
              onCopy={copyToClipboard}
            />
          )}
        </div>

        {/* Rejection reason */}
        {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
          <div className="p-4 rounded-sm bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 font-medium mb-1">Motivo del rechazo:</p>
            <p className="text-sm text-[hsl(270,30%,70%)]">{withdrawal.rejection_reason}</p>
          </div>
        )}

        {/* Payment proof */}
        {withdrawal.payment_proof_url && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(withdrawal.payment_proof_url!, '_blank')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver comprobante de pago
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        )}

        {/* Cancel button */}
        {canCancel && onCancel && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelando...' : 'Cancelar Solicitud'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  copyValue,
  onCopy,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (text: string, label: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">{value}</span>
        {copyValue && onCopy && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCopy(copyValue, label)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// List component for multiple withdrawals
interface WithdrawalListProps {
  withdrawals: WithdrawalDisplay[];
  isLoading?: boolean;
  onSelect?: (withdrawal: WithdrawalDisplay) => void;
  className?: string;
}

export function WithdrawalList({
  withdrawals,
  isLoading,
  onSelect,
  className,
}: WithdrawalListProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="p-4 rounded-sm bg-[hsl(270,100%,60%,0.05)] animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[hsl(270,100%,60%,0.1)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[hsl(270,100%,60%,0.1)] rounded" />
                <div className="h-3 w-24 bg-[hsl(270,100%,60%,0.05)] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Clock className="h-10 w-10 text-[hsl(270,100%,60%,0.2)] mb-3" />
        <p className="text-muted-foreground">No hay solicitudes de retiro</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {withdrawals.map((withdrawal, index) => {
        const Icon = STATUS_ICONS[withdrawal.status];

        return (
          <motion.div
            key={withdrawal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect?.(withdrawal)}
            className={cn(
              'p-4 rounded-sm cursor-pointer transition-all',
              'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.08)]',
              'border border-transparent hover:border-[hsl(270,100%,60%,0.1)]'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-full', withdrawal.statusColor.replace('text-', 'bg-').replace('/10', '/20'))}>
                <Icon
                  className={cn(
                    'h-5 w-5',
                    withdrawal.statusColor.split(' ')[1],
                    withdrawal.status === 'processing' && 'animate-spin'
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{withdrawal.formattedNetAmount}</p>
                  <Badge variant="outline" className={cn('text-[10px]', withdrawal.statusColor)}>
                    {withdrawal.statusLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {withdrawal.methodLabel} • {withdrawal.paymentSummary}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{withdrawal.formattedDate}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
