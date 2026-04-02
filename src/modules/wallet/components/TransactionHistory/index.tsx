// TransactionHistory Components
export { TransactionFilters } from './TransactionFilters';
export { TransactionList } from './TransactionList';
export { TransactionDetail } from './TransactionDetail';
export { TransactionDetailDrawer } from './TransactionDetailDrawer';
export { ExportButton } from './ExportButton';

// Main TransactionHistory component
import { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TransactionFilters } from './TransactionFilters';
import { TransactionList } from './TransactionList';
import { TransactionDetail } from './TransactionDetail';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';
import { ExportButton } from './ExportButton';
import { useTransactions } from '../../hooks';
import { cn } from '@/lib/utils';
import type { TransactionFilters as TFilters, TransactionDisplay, Currency } from '../../types';
import { toTransactionDisplay, formatCurrency } from '../../types';

interface TransactionHistoryProps {
  walletId: string;
  currency?: Currency;
  className?: string;
  showSummary?: boolean;
}

export function TransactionHistory({
  walletId,
  currency = 'USD',
  className,
  showSummary = true,
}: TransactionHistoryProps) {
  const [filters, setFilters] = useState<TFilters>({});
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDisplay | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    transactions,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTransactions({ walletId, filters });

  // Convert to display format and filter by search
  const displayTransactions = useMemo(() => {
    return transactions
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
  }, [transactions, currency, searchQuery]);

  // Calculate summary for the filtered period
  const summary = useMemo(() => {
    return displayTransactions.reduce(
      (acc, t) => {
        if (t.isCredit) {
          acc.income += t.amount;
        } else {
          acc.expenses += t.amount;
        }
        return acc;
      },
      { income: 0, expenses: 0 }
    );
  }, [displayTransactions]);

  const handleSelectTransaction = (transaction: TransactionDisplay) => {
    setSelectedTransaction(transaction);
    // Open drawer on mobile
    if (window.innerWidth < 1024) {
      setDrawerOpen(true);
    }
  };

  const handleCloseDetail = () => {
    setSelectedTransaction(null);
    setDrawerOpen(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      {showSummary && displayTransactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-lg font-semibold text-emerald-400">
                  +{formatCurrency(summary.income, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Egresos</p>
                <p className="text-lg font-semibold text-red-400">
                  -{formatCurrency(summary.expenses, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(270,100%,60%,0.05)] border-[hsl(270,100%,60%,0.1)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-[hsl(270,100%,60%,0.1)]">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance Neto</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    summary.income - summary.expenses >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  )}
                >
                  {summary.income - summary.expenses >= 0 ? '+' : ''}
                  {formatCurrency(summary.income - summary.expenses, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-6">
        {/* Main list */}
        <Card className="flex-1">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle>Historial de Transacciones</CardTitle>
                <ExportButton
                  walletId={walletId}
                  filters={filters}
                  currency={currency}
                  className="hidden sm:flex"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar transacciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <TransactionFilters filters={filters} onFiltersChange={setFilters} />
                  <ExportButton
                    walletId={walletId}
                    filters={filters}
                    currency={currency}
                    className="sm:hidden"
                  />
                </div>
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
              onSelectTransaction={handleSelectTransaction}
              selectedId={selectedTransaction?.id}
            />
          </CardContent>
        </Card>

        {/* Detail panel (desktop) */}
        {selectedTransaction && (
          <div className="hidden lg:block w-96 sticky top-4 h-fit">
            <TransactionDetail
              transaction={selectedTransaction}
              onClose={handleCloseDetail}
            />
          </div>
        )}
      </div>

      {/* Detail drawer (mobile) */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={drawerOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
