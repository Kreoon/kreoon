import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Loader2,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '../../types';

interface WithdrawalStatsData {
  pending_count: number;
  processing_count: number;
  today_processed_count: number;
  total_pending_amount: number;
  week_processed_amount: number;
  avg_processing_hours: number;
  // Comparisons
  pending_change: number;
  processed_change: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  change?: number;
  changeLabel?: string;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  change,
  changeLabel,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative gradient */}
      <div
        className={cn(
          'absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20',
          iconBg
        )}
      />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-400" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    change >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {change >= 0 ? '+' : ''}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-muted-foreground">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-sm', iconBg)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WithdrawalStatsProps {
  className?: string;
}

export function WithdrawalStats({ className }: WithdrawalStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'withdrawal-stats'],
    queryFn: async (): Promise<WithdrawalStatsData> => {
      // Get current stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekStart = new Date(weekAgo);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      // Pending and processing counts
      const { data: pendingData } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, net_amount, status')
        .in('status', ['pending', 'processing']);

      const pending = pendingData || [];
      const pending_count = pending.filter(w => w.status === 'pending').length;
      const processing_count = pending.filter(w => w.status === 'processing').length;
      const total_pending_amount = pending.reduce((sum, w) => sum + (w.net_amount || 0), 0);

      // Today's processed
      const { data: todayData } = await supabase
        .from('withdrawal_requests')
        .select('id')
        .eq('status', 'completed')
        .gte('processed_at', today.toISOString());

      const today_processed_count = todayData?.length || 0;

      // This week's processed amount
      const { data: weekData } = await supabase
        .from('withdrawal_requests')
        .select('net_amount')
        .eq('status', 'completed')
        .gte('processed_at', weekAgo.toISOString());

      const week_processed_amount = (weekData || []).reduce(
        (sum, w) => sum + (w.net_amount || 0),
        0
      );

      // Calculate average processing time (in hours)
      const { data: processedData } = await supabase
        .from('withdrawal_requests')
        .select('created_at, processed_at')
        .eq('status', 'completed')
        .not('processed_at', 'is', null)
        .order('processed_at', { ascending: false })
        .limit(50);

      let avg_processing_hours = 24; // Default
      if (processedData && processedData.length > 0) {
        const totalHours = processedData.reduce((sum, w) => {
          const created = new Date(w.created_at).getTime();
          const processed = new Date(w.processed_at!).getTime();
          return sum + (processed - created) / (1000 * 60 * 60);
        }, 0);
        avg_processing_hours = Math.round(totalHours / processedData.length);
      }

      // Last week comparison for pending
      const { data: lastWeekPending } = await supabase
        .from('withdrawal_requests')
        .select('id')
        .eq('status', 'pending')
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', weekAgo.toISOString());

      const lastWeekPendingCount = lastWeekPending?.length || 1;
      const pending_change = Math.round(
        ((pending_count - lastWeekPendingCount) / lastWeekPendingCount) * 100
      );

      // Last week processed comparison
      const { data: lastWeekProcessed } = await supabase
        .from('withdrawal_requests')
        .select('net_amount')
        .eq('status', 'completed')
        .gte('processed_at', lastWeekStart.toISOString())
        .lt('processed_at', weekAgo.toISOString());

      const lastWeekProcessedAmount = (lastWeekProcessed || []).reduce(
        (sum, w) => sum + (w.net_amount || 0),
        0
      ) || 1;
      const processed_change = Math.round(
        ((week_processed_amount - lastWeekProcessedAmount) / lastWeekProcessedAmount) * 100
      );

      return {
        pending_count,
        processing_count,
        today_processed_count,
        total_pending_amount,
        week_processed_amount,
        avg_processing_hours,
        pending_change,
        processed_change,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  });

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4', className)}>
      <StatCard
        title="Pendientes"
        value={stats?.pending_count ?? 0}
        icon={Clock}
        iconBg="bg-amber-500/10"
        iconColor="text-amber-400"
        change={stats?.pending_change}
        changeLabel="vs semana pasada"
        isLoading={isLoading}
      />
      <StatCard
        title="En Proceso"
        value={stats?.processing_count ?? 0}
        icon={Loader2}
        iconBg="bg-blue-500/10"
        iconColor="text-blue-400"
        isLoading={isLoading}
      />
      <StatCard
        title="Procesados Hoy"
        value={stats?.today_processed_count ?? 0}
        icon={CheckCircle}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-400"
        isLoading={isLoading}
      />
      <StatCard
        title="Total Pendiente"
        value={formatCurrency(stats?.total_pending_amount ?? 0, 'USD')}
        icon={DollarSign}
        iconBg="bg-[hsl(270,100%,60%,0.1)]"
        iconColor="text-primary"
        isLoading={isLoading}
      />
      <StatCard
        title="Procesado (Semana)"
        value={formatCurrency(stats?.week_processed_amount ?? 0, 'USD')}
        icon={TrendingUp}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-400"
        change={stats?.processed_change}
        changeLabel="vs semana pasada"
        isLoading={isLoading}
      />
      <StatCard
        title="Tiempo Promedio"
        value={`${stats?.avg_processing_hours ?? 24}h`}
        icon={Timer}
        iconBg="bg-cyan-500/10"
        iconColor="text-cyan-400"
        isLoading={isLoading}
      />
    </div>
  );
}
