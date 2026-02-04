// Wallet Module - Main exports

// Types
export * from './types';

// Hooks
export * from './hooks';

// Services
export * from './services';

// Styles
export { walletStyles, animationVariants, transitions } from './styles';

// Common Components
export {
  MoneyDisplay,
  MoneyText,
  TransactionIcon,
  getTransactionIconComponent,
  getTransactionColors,
  WalletStatusBadge,
  WalletStatusDot,
  WalletDashboardSkeleton,
  TransactionListSkeleton,
  WithdrawalListSkeleton,
  EscrowTimelineSkeleton,
  NoWalletState,
  NoTransactionsState,
  NoWithdrawalsState,
  NoEscrowsState,
  NoPaymentMethodsState,
  WalletErrorState,
  InsufficientBalanceState,
} from './components/common';

// Dashboard Components
export {
  WalletDashboard,
  BalanceCard,
  BalanceBreakdown,
  QuickActions,
  QuickActionsCompact,
  RecentTransactions,
} from './components/WalletDashboard';

// Transaction Components
export {
  TransactionHistory,
  TransactionList,
  TransactionFilters,
  TransactionDetail,
} from './components/TransactionHistory';

// Withdrawal Components
export {
  WithdrawalForm,
  WithdrawalFormDrawer,
  PaymentMethodForm,
  PaymentMethodSelector,
  WithdrawalConfirmation,
  WithdrawalHistory,
  WithdrawalStatusTimeline,
  WithdrawalStatusCard,
  WithdrawalList,
} from './components/Withdrawals';

// Payment Methods Components
export {
  PaymentMethodList,
  PaymentMethodCard,
  PaymentMethodDrawer,
} from './components/PaymentMethods';

// Escrow Components
export {
  EscrowStatusCard,
  EscrowListItem,
  EscrowTimeline,
} from './components/Escrow';

// Admin Components
export {
  PendingWithdrawals,
  ProcessWithdrawalDialog,
} from './components/Admin';

// Pages
export {
  WalletPage,
  TransactionsPage,
  WithdrawPage,
  AdminWalletsPage,
} from './pages';
