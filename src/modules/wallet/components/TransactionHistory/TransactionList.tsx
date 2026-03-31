import { useRef, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface TransactionListProps {
  transactions: TransactionDisplay[];
  isLoading?: boolean;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  onSelectTransaction?: (transaction: TransactionDisplay) => void;
  selectedId?: string;
  className?: string;
}

export function TransactionList({
  transactions,
  isLoading,
  hasMore,
  isFetchingMore,
  onLoadMore,
  onSelectTransaction,
  selectedId,
  className,
}: TransactionListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Infinite scroll observer
  const lastTransactionRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore && onLoadMore) {
          onLoadMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, hasMore, onLoadMore]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-sm bg-[hsl(270,100%,60%,0.05)]"
          >
            <div className="h-10 w-10 rounded-full bg-[hsl(270,100%,60%,0.1)] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-[hsl(270,100%,60%,0.1)] rounded animate-pulse" />
              <div className="h-3 w-28 bg-[hsl(270,100%,60%,0.05)] rounded animate-pulse" />
            </div>
            <div className="h-5 w-24 bg-[hsl(270,100%,60%,0.1)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <DollarSign className="h-12 w-12 text-[hsl(270,100%,60%,0.2)] mb-4" />
        <p className="text-muted-foreground text-lg">No hay transacciones</p>
        <p className="text-muted-foreground text-sm mt-1">
          Las transacciones aparecerán aquí
        </p>
      </div>
    );
  }

  // Group transactions by date
  const groupedTransactions = transactions.reduce<Record<string, TransactionDisplay[]>>(
    (groups, transaction) => {
      const date = new Date(transaction.created_at).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {}
  );

  return (
    <div className={cn('space-y-6', className)}>
      {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/80 py-2">
            {date}
          </h3>
          <div className="space-y-2">
            {dayTransactions.map((transaction, index) => {
              const Icon = TRANSACTION_ICONS[transaction.transaction_type];
              const isLast = index === dayTransactions.length - 1;
              const isSelected = selectedId === transaction.id;

              return (
                <motion.div
                  key={transaction.id}
                  ref={isLast ? lastTransactionRef : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onSelectTransaction?.(transaction)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-sm transition-all cursor-pointer',
                    'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.08)]',
                    'border border-transparent',
                    isSelected && 'border-[hsl(270,100%,60%,0.3)] bg-[hsl(270,100%,60%,0.1)]'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center h-12 w-12 rounded-full shrink-0',
                      transaction.isCredit
                        ? 'bg-emerald-500/10'
                        : 'bg-[hsl(270,100%,60%,0.1)]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        transaction.isCredit
                          ? 'text-emerald-400'
                          : 'text-primary'
                      )}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">
                        {transaction.typeLabel}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] py-0 h-5', transaction.statusColor)}
                      >
                        {transaction.statusLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {transaction.description || 'Sin descripción'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(transaction.created_at).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        'text-lg font-semibold',
                        transaction.isCredit ? 'text-emerald-400' : 'text-white'
                      )}
                    >
                      {transaction.isCredit ? '+' : '-'}
                      {transaction.formattedAmount}
                    </p>
                    {transaction.fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Fee: {transaction.formattedFee}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Balance: {transaction.formattedBalanceAfter}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Load more indicator */}
      {isFetchingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(270,100%,60%)]" />
        </div>
      )}

      {hasMore && !isFetchingMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={onLoadMore}>
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}
