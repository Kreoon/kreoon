import { useState } from 'react';
import { ArrowUpCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminWithdrawals } from '../../hooks/useWithdrawals';
import { WithdrawalStats } from './WithdrawalStats';
import { PendingWithdrawalsList } from './PendingWithdrawalsList';
import type { WithdrawalStatus } from '../../types';

interface AdminWithdrawalsPageProps {
  className?: string;
}

export function AdminWithdrawalsPage({ className }: AdminWithdrawalsPageProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('pending');

  // Get counts for tab badges
  const { withdrawals: allPending } = useAdminWithdrawals({
    status: ['pending', 'processing'],
    limit: 1000,
  });

  const pendingCount = allPending.filter(w => w.status === 'pending').length;
  const processingCount = allPending.filter(w => w.status === 'processing').length;

  const getStatusForTab = (tab: string): WithdrawalStatus[] => {
    switch (tab) {
      case 'pending':
        return ['pending'];
      case 'processing':
        return ['processing'];
      case 'history':
        return ['completed', 'rejected', 'cancelled'];
      default:
        return ['pending'];
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Retiros</h1>
          <p className="text-muted-foreground">
            Administración de solicitudes de retiro
          </p>
        </div>
      </div>

      {/* Stats */}
      <WithdrawalStats />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            Pendientes
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            En proceso
            {processingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                {processingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingWithdrawalsList status={['pending']} />
        </TabsContent>

        <TabsContent value="processing" className="mt-6">
          <PendingWithdrawalsList status={['processing']} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PendingWithdrawalsList status={['completed', 'rejected', 'cancelled']} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
