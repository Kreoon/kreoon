import { motion } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  Lock,
  Unlock,
  RefreshCw,
  DollarSign,
  Percent,
  Wrench,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TransactionDisplay, TransactionType } from '../../types';

const TRANSACTION_ICONS: Record<TransactionType, React.ComponentType<{ className?: string }>> = {
  deposit: ArrowDownCircle,
  withdrawal: ArrowUpCircle,
  transfer_in: ArrowLeftCircle,
  transfer_out: ArrowRightCircle,
  escrow_hold: Lock,
  escrow_release: Unlock,
  escrow_refund: RefreshCw,
  payment_received: DollarSign,
  platform_fee: Percent,
  adjustment: Wrench,
};

interface TransactionDetailProps {
  transaction: TransactionDisplay;
  onClose?: () => void;
  className?: string;
}

export function TransactionDetail({
  transaction,
  onClose,
  className,
}: TransactionDetailProps) {
  const Icon = TRANSACTION_ICONS[transaction.transaction_type];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const detailRows = [
    { label: 'ID de Transacción', value: transaction.id },
    { label: 'Tipo', value: transaction.typeLabel },
    { label: 'Estado', value: transaction.statusLabel, badge: true },
    { label: 'Monto', value: transaction.formattedAmount },
    { label: 'Comisión', value: transaction.formattedFee },
    { label: 'Monto Neto', value: transaction.formattedNetAmount },
    { label: 'Balance Después', value: transaction.formattedBalanceAfter },
    { label: 'Fecha', value: transaction.formattedDate },
    ...(transaction.reference_type
      ? [{ label: 'Tipo de Referencia', value: transaction.reference_type }]
      : []),
    ...(transaction.reference_id
      ? [{ label: 'ID de Referencia', value: transaction.reference_id }]
      : []),
    ...(transaction.processed_at
      ? [
          {
            label: 'Procesado',
            value: new Date(transaction.processed_at).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]
      : []),
  ];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Decorative gradient */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none',
          transaction.isCredit
            ? 'bg-emerald-500/10'
            : 'bg-[hsl(270,100%,60%,0.1)]'
        )}
      />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex items-center justify-center h-14 w-14 rounded-sm',
                transaction.isCredit
                  ? 'bg-emerald-500/10'
                  : 'bg-[hsl(270,100%,60%,0.1)]'
              )}
            >
              <Icon
                className={cn(
                  'h-7 w-7',
                  transaction.isCredit
                    ? 'text-emerald-400'
                    : 'text-primary'
                )}
              />
            </div>
            <div>
              <CardTitle className="text-xl">{transaction.typeLabel}</CardTitle>
              <Badge
                variant="outline"
                className={cn('mt-1', transaction.statusColor)}
              >
                {transaction.statusLabel}
              </Badge>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Amount highlight */}
        <div
          className={cn(
            'p-4 rounded-sm',
            transaction.isCredit
              ? 'bg-emerald-500/10'
              : 'bg-[hsl(270,100%,60%,0.05)]'
          )}
        >
          <p className="text-sm text-muted-foreground mb-1">Monto</p>
          <p
            className={cn(
              'text-3xl font-bold',
              transaction.isCredit ? 'text-emerald-400' : 'text-white'
            )}
          >
            {transaction.isCredit ? '+' : '-'}
            {transaction.formattedAmount}
          </p>
        </div>

        {/* Description */}
        {transaction.description && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Descripción</p>
            <p className="text-white">{transaction.description}</p>
          </div>
        )}

        <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

        {/* Details */}
        <div className="space-y-3">
          {detailRows.map((row, index) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                {row.badge ? (
                  <Badge variant="outline" className={transaction.statusColor}>
                    {row.value}
                  </Badge>
                ) : (
                  <span className="text-sm text-white font-medium">
                    {row.value}
                  </span>
                )}
                {(row.label.includes('ID') || row.label.includes('Referencia')) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(row.value, row.label)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Metadata */}
        {Object.keys(transaction.metadata).length > 0 && (
          <>
            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Información Adicional</p>
              <div className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.05)] text-xs font-mono text-[hsl(270,30%,70%)] overflow-auto">
                <pre>{JSON.stringify(transaction.metadata, null, 2)}</pre>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
