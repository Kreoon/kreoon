import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet, ArrowDownUp, ArrowUpRight, CreditCard, Plus, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WalletDashboard } from '../components/WalletDashboard';
import { TransactionHistory } from '../components/TransactionHistory';
import { WithdrawalHistory, WithdrawalFormDrawer } from '../components/Withdrawals';
import { PaymentMethodList, PaymentMethodDrawer } from '../components/PaymentMethods';
import { useWallet, usePaymentMethods } from '../hooks';

type TabValue = 'dashboard' | 'transactions' | 'withdrawals' | 'payment-methods';

const TABS = [
  { value: 'dashboard' as const, label: 'Dashboard', icon: Wallet },
  { value: 'transactions' as const, label: 'Movimientos', icon: ArrowDownUp },
  { value: 'withdrawals' as const, label: 'Retiros', icon: ArrowUpRight },
  { value: 'payment-methods' as const, label: 'Métodos de Pago', icon: CreditCard },
];

export function WalletPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as TabValue) || 'dashboard';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const [withdrawalDrawerOpen, setWithdrawalDrawerOpen] = useState(false);
  const [paymentMethodDrawerOpen, setPaymentMethodDrawerOpen] = useState(false);

  const { walletDisplay, isLoading: isWalletLoading } = useWallet();
  const { paymentMethods, isLoading: isPaymentMethodsLoading } = usePaymentMethods();

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setSearchParams({ tab: value });
  };

  // Render action button based on active tab
  const renderActionButton = () => {
    switch (activeTab) {
      case 'withdrawals':
        return (
          <Button
            onClick={() => setWithdrawalDrawerOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            disabled={!walletDisplay || (walletDisplay.available_balance <= 0)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Retiro
          </Button>
        );
      case 'payment-methods':
        return (
          <Button
            onClick={() => setPaymentMethodDrawerOpen(true)}
            className="bg-gradient-to-r from-[hsl(270,100%,50%)] to-[hsl(280,100%,45%)] hover:from-[hsl(270,100%,45%)] hover:to-[hsl(280,100%,40%)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Método
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
            <Wallet className="h-8 w-8 text-[hsl(270,100%,70%)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
              Mi Wallet
            </h1>
            <p className="text-[hsl(270,30%,60%)] mt-1">
              Gestiona tu balance, retiros y transacciones
            </p>
          </div>
        </div>
        {renderActionButton()}
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.1)] p-1 h-auto flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-[hsl(270,100%,60%,0.15)] data-[state=active]:text-white',
                  'text-[hsl(270,30%,60%)] hover:text-white transition-colors'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <WalletDashboard />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          {walletDisplay ? (
            <TransactionHistory
              walletId={walletDisplay.id}
              currency={walletDisplay.currency}
            />
          ) : isWalletLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 w-full bg-[hsl(270,100%,60%,0.1)] rounded-xl" />
              <div className="h-[400px] bg-[hsl(270,100%,60%,0.05)] rounded-2xl" />
            </div>
          ) : (
            <div className="text-center py-12 text-[hsl(270,30%,60%)]">
              No tienes un wallet activo
            </div>
          )}
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="mt-6">
          {walletDisplay ? (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.1)]">
                  <p className="text-sm text-[hsl(270,30%,60%)]">Balance Disponible</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {walletDisplay.formattedAvailable}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.1)]">
                  <p className="text-sm text-[hsl(270,30%,60%)]">Pendiente de Retiro</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {walletDisplay.formattedPending}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.1)]">
                  <p className="text-sm text-[hsl(270,30%,60%)]">Mínimo de Retiro</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    $50.000 COP
                  </p>
                </div>
              </div>

              {/* Withdrawal History */}
              <WithdrawalHistory walletId={walletDisplay.id} currency={walletDisplay.currency} />
            </div>
          ) : isWalletLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-[hsl(270,100%,60%,0.05)] rounded-xl" />
                ))}
              </div>
              <div className="h-[400px] bg-[hsl(270,100%,60%,0.05)] rounded-2xl" />
            </div>
          ) : (
            <div className="text-center py-12 text-[hsl(270,30%,60%)]">
              No tienes un wallet activo
            </div>
          )}
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="mt-6">
          <PaymentMethodList
            paymentMethods={paymentMethods || []}
            isLoading={isPaymentMethodsLoading}
            onAddNew={() => setPaymentMethodDrawerOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Withdrawal Drawer */}
      {walletDisplay && (
        <WithdrawalFormDrawer
          wallet={walletDisplay}
          open={withdrawalDrawerOpen}
          onClose={() => setWithdrawalDrawerOpen(false)}
          onSuccess={() => {
            setWithdrawalDrawerOpen(false);
            // Refresh data
          }}
        />
      )}

      {/* Payment Method Drawer */}
      <PaymentMethodDrawer
        open={paymentMethodDrawerOpen}
        onClose={() => setPaymentMethodDrawerOpen(false)}
        onSuccess={() => {
          setPaymentMethodDrawerOpen(false);
        }}
      />
    </div>
  );
}
