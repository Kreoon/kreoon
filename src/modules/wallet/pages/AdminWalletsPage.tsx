import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Shield,
  Clock,
  BarChart3,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  PendingWithdrawals,
  WithdrawalStats,
  WalletOverview,
} from '../components/Admin';

type TabValue = 'withdrawals' | 'wallets' | 'stats';

const TABS = [
  { value: 'withdrawals' as const, label: 'Retiros Pendientes', icon: Clock },
  { value: 'wallets' as const, label: 'Wallets', icon: Users },
  { value: 'stats' as const, label: 'Estadísticas', icon: BarChart3 },
];

export function AdminWalletsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const initialTab = (searchParams.get('tab') as TabValue) || 'withdrawals';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setSearchParams({ tab: value });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger data refresh - components will use React Query which handles this
    // We just simulate a visual refresh indicator
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-16">
          <Shield className="h-16 w-16 text-destructive/30 mb-4" />
          <h2 className="text-xl font-semibold text-white">Acceso Denegado</h2>
          <p className="text-muted-foreground mt-2">
            No tienes permisos para acceder a esta sección
          </p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Ir al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Admin
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
                Gestión de Wallets
              </h1>
              <p className="text-muted-foreground mt-1">
                Administra retiros, wallets y transacciones de la plataforma
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-[hsl(270,100%,60%,0.2)] hover:bg-[hsl(270,100%,60%,0.1)]"
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
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
                  'text-muted-foreground hover:text-white transition-colors'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="mt-6">
          <PendingWithdrawals />
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="mt-6">
          <WalletOverview />
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          <WithdrawalStats />
        </TabsContent>
      </Tabs>

    </div>
  );
}
