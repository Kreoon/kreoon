import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CreditCard, History, Plus, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  WithdrawalHistory,
  WithdrawalFormDrawer,
  WithdrawalStatusTimeline,
} from '../components/Withdrawals';
import { PaymentMethodList, PaymentMethodDrawer } from '../components/PaymentMethods';
import { useWallet, useWithdrawals, usePaymentMethods } from '../hooks';

type TabValue = 'history' | 'payment-methods';

export function WithdrawalsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as TabValue) || 'history';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const [withdrawalDrawerOpen, setWithdrawalDrawerOpen] = useState(false);
  const [paymentMethodDrawerOpen, setPaymentMethodDrawerOpen] = useState(false);

  const { walletDisplay, isLoading: isWalletLoading } = useWallet();
  const { withdrawals, isLoading: isWithdrawalsLoading } = useWithdrawals({
    walletId: walletDisplay?.id,
  });
  const { methods: paymentMethods, isLoading: isPaymentMethodsLoading } = usePaymentMethods();

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setSearchParams({ tab: value });
  };

  // Get active withdrawal (most recent pending/processing)
  const activeWithdrawal = withdrawals.find(
    (w) => w.status === 'pending' || w.status === 'processing'
  );

  // Check if user can withdraw
  const canWithdraw =
    walletDisplay &&
    walletDisplay.available_balance >= 50000 &&
    paymentMethods &&
    paymentMethods.length > 0;

  if (isWalletLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[hsl(270,100%,60%,0.1)] rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[hsl(270,100%,60%,0.05)] rounded-xl" />
            ))}
          </div>
          <div className="h-[400px] bg-[hsl(270,100%,60%,0.05)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!walletDisplay) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tienes un wallet activo</p>
          <Button className="mt-4" onClick={() => navigate('/wallet')}>
            Ir a Wallet
          </Button>
        </div>
      </div>
    );
  }

  const withdrawButton = (
    <Button
      onClick={() => setWithdrawalDrawerOpen(true)}
      disabled={!canWithdraw}
      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuevo Retiro
    </Button>
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/wallet')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Wallet
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
              <ArrowUpRight className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
                Retiros
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestiona tus retiros y métodos de pago
              </p>
            </div>
          </div>

          {withdrawButton}
        </div>
      </div>

      {/* Warning Alerts */}
      {!paymentMethods || paymentMethods.length === 0 ? (
        <Alert className="mb-6 bg-amber-500/5 border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            Debes agregar al menos un método de pago antes de solicitar retiros.{' '}
            <button
              onClick={() => {
                setActiveTab('payment-methods');
                setSearchParams({ tab: 'payment-methods' });
              }}
              className="underline hover:text-amber-100"
            >
              Agregar método de pago
            </button>
          </AlertDescription>
        </Alert>
      ) : walletDisplay.available_balance < 50000 ? (
        <Alert className="mb-6 bg-[hsl(270,100%,60%,0.05)] border-[hsl(270,100%,60%,0.2)]">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription>
            El monto mínimo de retiro es $50.000 COP. Tu balance disponible actual es{' '}
            <span className="font-medium text-white">{walletDisplay.formattedAvailable}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-[hsl(270,100%,60%,0.03)] border-[hsl(270,100%,60%,0.1)]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Balance Disponible</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {walletDisplay.formattedAvailable}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(270,100%,60%,0.03)] border-[hsl(270,100%,60%,0.1)]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendiente de Retiro</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {walletDisplay.formattedPending}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(270,100%,60%,0.03)] border-[hsl(270,100%,60%,0.1)]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Métodos de Pago</p>
            <p className="text-2xl font-bold text-white mt-1">
              {paymentMethods?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Withdrawal Timeline */}
      {activeWithdrawal && (
        <Card className="mb-6 bg-[hsl(270,100%,60%,0.03)] border-[hsl(270,100%,60%,0.1)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Retiro Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawalStatusTimeline withdrawal={activeWithdrawal} />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">
                  {activeWithdrawal.formattedNetAmount || activeWithdrawal.formattedAmount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicitado: {new Date(activeWithdrawal.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {activeWithdrawal.methodLabel}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.1)] p-1">
          <TabsTrigger
            value="history"
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-[hsl(270,100%,60%,0.15)] data-[state=active]:text-white',
              'text-muted-foreground hover:text-white transition-colors'
            )}
          >
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger
            value="payment-methods"
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-[hsl(270,100%,60%,0.15)] data-[state=active]:text-white',
              'text-muted-foreground hover:text-white transition-colors'
            )}
          >
            <CreditCard className="h-4 w-4" />
            Métodos de Pago
            {(!paymentMethods || paymentMethods.length === 0) && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <WithdrawalHistory
            walletId={walletDisplay.id}
            currency={walletDisplay.currency}
          />
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="mt-6">
          <PaymentMethodList />
        </TabsContent>
      </Tabs>

      {/* Withdrawal Drawer */}
      <WithdrawalFormDrawer
        wallet={walletDisplay}
        open={withdrawalDrawerOpen}
        onClose={() => setWithdrawalDrawerOpen(false)}
      />

      {/* Payment Method Drawer */}
      <PaymentMethodDrawer
        open={paymentMethodDrawerOpen}
        onClose={() => setPaymentMethodDrawerOpen(false)}
      />
    </div>
  );
}
