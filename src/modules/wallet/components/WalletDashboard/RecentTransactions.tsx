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
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface RecentTransactionsProps {
  transactions: TransactionDisplay[];
  isLoading?: boolean;
  onViewAll?: () => void;
  onViewTransaction?: (transaction: TransactionDisplay) => void;
  className?: string;
}

export function RecentTransactions({
  transactions,
  isLoading,
  onViewAll,
  onViewTransaction,
  className,
}: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(270,100%,60%,0.05)]">
                <div className="h-10 w-10 rounded-full bg-[hsl(270,100%,60%,0.1)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[hsl(270,100%,60%,0.1)] rounded animate-pulse" />
                  <div className="h-3 w-24 bg-[hsl(270,100%,60%,0.05)] rounded animate-pulse" />
                </div>
                <div className="h-5 w-20 bg-[hsl(270,100%,60%,0.1)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Transacciones Recientes</CardTitle>
          {onViewAll && transactions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Ver todas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[hsl(270,30%,60%)]">
            <DollarSign className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No hay transacciones todavía</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction, index) => {
              const Icon = TRANSACTION_ICONS[transaction.transaction_type];

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.08)]',
                    'border border-transparent hover:border-[hsl(270,100%,60%,0.1)]',
                    'cursor-pointer'
                  )}
                  onClick={() => onViewTransaction?.(transaction)}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center h-10 w-10 rounded-full',
                      transaction.isCredit
                        ? 'bg-emerald-500/10'
                        : 'bg-[hsl(270,100%,60%,0.1)]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        transaction.isCredit
                          ? 'text-emerald-400'
                          : 'text-[hsl(270,100%,70%)]'
                      )}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {transaction.typeLabel}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] py-0 h-5',
                          transaction.statusColor
                        )}
                      >
                        {transaction.statusLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-[hsl(270,30%,60%)] truncate">
                      {transaction.description || transaction.formattedDate}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        transaction.isCredit ? 'text-emerald-400' : 'text-white'
                      )}
                    >
                      {transaction.isCredit ? '+' : '-'}
                      {transaction.formattedAmount}
                    </p>
                    {transaction.fee > 0 && (
                      <p className="text-xs text-[hsl(270,30%,50%)]">
                        Fee: {transaction.formattedFee}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
