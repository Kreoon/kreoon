// WalletDashboard Components
export { BalanceCard } from './BalanceCard';
export { BalanceBreakdown } from './BalanceBreakdown';
export { QuickActions, QuickActionsCompact } from './QuickActions';
export { RecentTransactions } from './RecentTransactions';

// Main WalletDashboard component that combines all pieces
import { useNavigate } from 'react-router-dom';
import { BalanceCard } from './BalanceCard';
import { BalanceBreakdown } from './BalanceBreakdown';
import { QuickActions } from './QuickActions';
import { RecentTransactions } from './RecentTransactions';
import { useWallet, useRecentTransactions } from '../../hooks';
import { WalletDashboardSkeleton, NoWalletState } from '../common';
import { cn } from '@/lib/utils';

interface WalletDashboardProps {
  className?: string;
}

export function WalletDashboard({ className }: WalletDashboardProps) {
  const navigate = useNavigate();
  const { walletDisplay, isLoading: isWalletLoading, ensureWallet } = useWallet();
  const { transactions, isLoading: isTransactionsLoading } = useRecentTransactions(
    walletDisplay?.id || null,
    5,
    walletDisplay?.currency
  );

  // Show skeleton while loading
  if (isWalletLoading) {
    return <WalletDashboardSkeleton />;
  }

  // Show empty state if no wallet
  if (!walletDisplay) {
    return <NoWalletState onAction={() => ensureWallet('creator')} />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Hero Balance Card */}
      <BalanceCard
        wallet={walletDisplay}
        isLoading={isWalletLoading}
        showBreakdown={true}
      />

      {/* Two Column Layout: Breakdown + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BalanceBreakdown wallet={walletDisplay} />
        <QuickActions
          wallet={walletDisplay}
          onWithdraw={() => navigate('/wallet?tab=withdrawals')}
          onHistory={() => navigate('/wallet?tab=transactions')}
          onPaymentMethods={() => navigate('/wallet?tab=payment-methods')}
          onSettings={() => navigate('/wallet')}
        />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions
        transactions={transactions}
        isLoading={isTransactionsLoading}
        onViewAll={() => navigate('/wallet?tab=transactions')}
        onViewTransaction={(t) => navigate('/wallet?tab=transactions')}
      />
    </div>
  );
}
