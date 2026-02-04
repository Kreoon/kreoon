// WalletDashboard Components
export { BalanceCard } from './BalanceCard';
export { QuickActions, QuickActionsCompact } from './QuickActions';
export { RecentTransactions } from './RecentTransactions';

// Main WalletDashboard component that combines all pieces
import { useNavigate } from 'react-router-dom';
import { BalanceCard } from './BalanceCard';
import { QuickActions } from './QuickActions';
import { RecentTransactions } from './RecentTransactions';
import { useWallet, useRecentTransactions } from '../../hooks';
import { cn } from '@/lib/utils';

interface WalletDashboardProps {
  className?: string;
}

export function WalletDashboard({ className }: WalletDashboardProps) {
  const navigate = useNavigate();
  const { walletDisplay, isLoading: isWalletLoading } = useWallet();
  const { transactions, isLoading: isTransactionsLoading } = useRecentTransactions(
    walletDisplay?.id || null,
    5,
    walletDisplay?.currency
  );

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card - Takes up more space */}
        <div className="lg:col-span-2">
          <BalanceCard
            wallet={walletDisplay}
            isLoading={isWalletLoading}
            showBreakdown={true}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions
            wallet={walletDisplay}
            onWithdraw={() => navigate('/wallet/withdraw')}
            onHistory={() => navigate('/wallet/transactions')}
            onPaymentMethods={() => navigate('/wallet/payment-methods')}
            onSettings={() => navigate('/wallet/settings')}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions
        transactions={transactions}
        isLoading={isTransactionsLoading}
        onViewAll={() => navigate('/wallet/transactions')}
        onViewTransaction={(t) => navigate(`/wallet/transactions/${t.id}`)}
      />
    </div>
  );
}
