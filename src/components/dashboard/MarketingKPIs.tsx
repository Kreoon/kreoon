import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Megaphone, Target, TrendingUp, DollarSign, 
  Eye, MousePointer, ShoppingCart, BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MarketingKPIsProps {
  organizationId: string;
  className?: string;
}

interface MarketingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number;
  totalRevenue: number;
  avgCTR: number;
  avgCPA: number;
  avgROAS: number;
}

export function MarketingKPIs({ organizationId, className }: MarketingKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MarketingStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalSpend: 0,
    totalRevenue: 0,
    avgCTR: 0,
    avgCPA: 0,
    avgROAS: 0,
  });

  useEffect(() => {
    if (!organizationId) return;
    fetchStats();
  }, [organizationId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch clients for this org
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', organizationId);

      const clientIds = clients?.map(c => c.id) || [];

      // Fetch campaigns
      let totalCampaigns = 0;
      let activeCampaigns = 0;
      let completedCampaigns = 0;

      if (clientIds.length > 0) {
        const { data: campaigns } = await supabase
          .from('marketing_campaigns')
          .select('id, status')
          .in('client_id', clientIds);

        totalCampaigns = campaigns?.length || 0;
        activeCampaigns = campaigns?.filter(c => c.status === 'active')?.length || 0;
        completedCampaigns = campaigns?.filter(c => c.status === 'completed')?.length || 0;
      }

      // Note: marketing_traffic table doesn't exist yet, so we'll show zeros
      // These metrics would come from campaign tracking integration
      const totalImpressions = 0;
      const totalClicks = 0;
      const totalConversions = 0;
      const totalSpend = 0;
      const totalRevenue = 0;

      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      setStats({
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        totalRevenue,
        avgCTR,
        avgCPA,
        avgROAS,
      });
    } catch (error) {
      console.error('Error fetching marketing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-2", className)}>
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Campañas',
      value: stats.totalCampaigns,
      icon: Megaphone,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      subtitle: `${stats.activeCampaigns} activas`,
    },
    {
      label: 'Impresiones',
      value: stats.totalImpressions > 1000000 
        ? `${(stats.totalImpressions / 1000000).toFixed(1)}M` 
        : stats.totalImpressions > 1000 
          ? `${(stats.totalImpressions / 1000).toFixed(1)}K`
          : stats.totalImpressions,
      icon: Eye,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      subtitle: 'alcance total',
    },
    {
      label: 'Clicks',
      value: stats.totalClicks > 1000 
        ? `${(stats.totalClicks / 1000).toFixed(1)}K`
        : stats.totalClicks,
      icon: MousePointer,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
      subtitle: `${stats.avgCTR.toFixed(2)}% CTR`,
    },
    {
      label: 'Conversiones',
      value: stats.totalConversions,
      icon: ShoppingCart,
      color: 'text-green-500 bg-green-500/10 border-green-500/20',
      subtitle: `$${stats.avgCPA.toFixed(2)} CPA`,
    },
    {
      label: 'Inversión',
      value: `$${stats.totalSpend > 1000 ? `${(stats.totalSpend / 1000).toFixed(1)}K` : stats.totalSpend.toFixed(0)}`,
      icon: DollarSign,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      subtitle: 'total gastado',
    },
    {
      label: 'Ingresos',
      value: `$${stats.totalRevenue > 1000 ? `${(stats.totalRevenue / 1000).toFixed(1)}K` : stats.totalRevenue.toFixed(0)}`,
      icon: TrendingUp,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      subtitle: 'generados',
    },
    {
      label: 'ROAS',
      value: `${stats.avgROAS.toFixed(2)}x`,
      icon: BarChart3,
      color: stats.avgROAS >= 3 
        ? 'text-green-500 bg-green-500/10 border-green-500/20'
        : stats.avgROAS >= 1 
          ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
          : 'text-red-500 bg-red-500/10 border-red-500/20',
      subtitle: 'retorno inversión',
      progress: Math.min(stats.avgROAS * 20, 100),
    },
    {
      label: 'Campañas Activas',
      value: stats.activeCampaigns,
      icon: Target,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      subtitle: `${stats.completedCampaigns} completadas`,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-2", className)}>
      {kpis.map((kpi, idx) => (
        <div 
          key={idx}
          className={cn(
            "p-3 rounded-lg border transition-all hover:shadow-md",
            kpi.color
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <kpi.icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium opacity-80">{kpi.label}</span>
          </div>
          <p className="text-xl font-bold">
            {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
          </p>
          {kpi.subtitle && (
            <p className="text-[10px] opacity-70">{kpi.subtitle}</p>
          )}
          {kpi.progress !== undefined && (
            <Progress value={kpi.progress} className="h-1 mt-1" />
          )}
        </div>
      ))}
    </div>
  );
}
