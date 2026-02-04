// TransactionHistory Components
export { TransactionFilters } from './TransactionFilters';
export { TransactionList } from './TransactionList';
export { TransactionDetail } from './TransactionDetail';

// Main TransactionHistory component
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TransactionFilters } from './TransactionFilters';
import { TransactionList } from './TransactionList';
import { TransactionDetail } from './TransactionDetail';
import { useTransactions } from '../../hooks';
import { cn } from '@/lib/utils';
import type { TransactionFilters as TFilters, TransactionDisplay, Currency } from '../../types';
import { toTransactionDisplay } from '../../types';

interface TransactionHistoryProps {
  walletId: string;
  currency?: Currency;
  className?: string;
}

export function TransactionHistory({
  walletId,
  currency = 'USD',
  className,
}: TransactionHistoryProps) {
  const [filters, setFilters] = useState<TFilters>({});
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDisplay | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    transactions,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTransactions({ walletId, filters });

  // Convert to display format and filter by search
  const displayTransactions = transactions
    .map(t => toTransactionDisplay(t, currency))
    .filter(t => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.typeLabel.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
    });

  return (
    <div className={cn('flex gap-6', className)}>
      {/* Main list */}
      <Card className="flex-1">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Historial de Transacciones</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(270,30%,50%)]" />
                <Input
                  placeholder="Buscar transacciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <TransactionFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={displayTransactions}
            isLoading={isLoading}
            hasMore={hasNextPage}
            isFetchingMore={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            onSelectTransaction={setSelectedTransaction}
            selectedId={selectedTransaction?.id}
          />
        </CardContent>
      </Card>

      {/* Detail panel (desktop) */}
      {selectedTransaction && (
        <div className="hidden lg:block w-96 sticky top-4 h-fit">
          <TransactionDetail
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        </div>
      )}
    </div>
  );
}
