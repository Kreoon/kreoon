import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Users, UserPlus, Star, Award, 
  DollarSign, TrendingUp, Target, Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AmbassadorKPIsProps {
  organizationId: string;
  className?: string;
}

interface AmbassadorStats {
  totalAmbassadors: number;
  activeAmbassadors: number;
  totalReferrals: number;
  pendingReferrals: number;
  activatedReferrals: number;
  totalCommissions: number;
  upBonusEarned: number;
  avgRetentionRate: number;
  topLevel: string;
  topLevelCount: number;
}

export function AmbassadorKPIs({ organizationId, className }: AmbassadorKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AmbassadorStats>({
    totalAmbassadors: 0,
    activeAmbassadors: 0,
    totalReferrals: 0,
    pendingReferrals: 0,
    activatedReferrals: 0,
    totalCommissions: 0,
    upBonusEarned: 0,
    avgRetentionRate: 0,
    topLevel: 'N/A',
    topLevelCount: 0,
  });

  useEffect(() => {
    if (!organizationId) return;
    fetchStats();
  }, [organizationId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch referrals
      const { data: referrals } = await supabase
        .from('ambassador_referrals')
        .select('ambassador_id, status')
        .eq('organization_id', organizationId);

      const uniqueAmbassadors = new Set(referrals?.map(r => r.ambassador_id) || []);
      const totalReferrals = referrals?.length || 0;
      const pendingReferrals = referrals?.filter(r => r.status === 'pending')?.length || 0;
      const activatedReferrals = referrals?.filter(r => r.status === 'activated')?.length || 0;

      // Fetch network stats
      const { data: networkStats } = await supabase
        .from('ambassador_network_stats')
        .select('ambassador_id, commission_earned, up_bonus_earned, retention_rate, active_referrals_count')
        .eq('organization_id', organizationId);

      const totalCommissions = networkStats?.reduce((sum, s) => sum + (s.commission_earned || 0), 0) || 0;
      const upBonusEarned = networkStats?.reduce((sum, s) => sum + (s.up_bonus_earned || 0), 0) || 0;
      const activeAmbassadors = networkStats?.filter(s => (s.active_referrals_count || 0) > 0)?.length || 0;
      const avgRetentionRate = networkStats?.length 
        ? networkStats.reduce((sum, s) => sum + (s.retention_rate || 0), 0) / networkStats.length 
        : 0;

      // Fetch ambassador commission config for levels
      const ambassadorIds = Array.from(uniqueAmbassadors);
      let topLevel = 'N/A';
      let topLevelCount = 0;

      if (ambassadorIds.length > 0) {
        // Count ambassadors - since we don't have ambassador_level in profiles,
        // we'll use the is_ambassador flag and show total count
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, is_ambassador')
          .in('id', ambassadorIds)
          .eq('is_ambassador', true);

        if (profiles?.length) {
          topLevelCount = profiles.length;
          topLevel = 'Activos';
        }
      }

      setStats({
        totalAmbassadors: uniqueAmbassadors.size,
        activeAmbassadors,
        totalReferrals,
        pendingReferrals,
        activatedReferrals,
        totalCommissions,
        upBonusEarned,
        avgRetentionRate,
        topLevel,
        topLevelCount,
      });
    } catch (error) {
      console.error('Error fetching ambassador stats:', error);
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

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'diamond': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'platinum': return 'text-slate-300 bg-slate-300/10 border-slate-300/20';
      case 'gold': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'silver': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      case 'bronze': return 'text-orange-600 bg-orange-600/10 border-orange-600/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const kpis = [
    {
      label: 'Embajadores',
      value: stats.totalAmbassadors,
      icon: Users,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      subtitle: `${stats.activeAmbassadors} activos`,
    },
    {
      label: 'Referidos',
      value: stats.totalReferrals,
      icon: UserPlus,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      subtitle: `${stats.pendingReferrals} pendientes`,
    },
    {
      label: 'Activados',
      value: stats.activatedReferrals,
      icon: Star,
      color: 'text-green-500 bg-green-500/10 border-green-500/20',
      subtitle: `${stats.totalReferrals > 0 ? Math.round((stats.activatedReferrals / stats.totalReferrals) * 100) : 0}% conversión`,
    },
    {
      label: 'Comisiones',
      value: `$${stats.totalCommissions > 1000 ? `${(stats.totalCommissions / 1000).toFixed(1)}K` : stats.totalCommissions.toFixed(0)}`,
      icon: DollarSign,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      subtitle: 'total ganado',
    },
    {
      label: 'Bonus UP',
      value: `$${stats.upBonusEarned > 1000 ? `${(stats.upBonusEarned / 1000).toFixed(1)}K` : stats.upBonusEarned.toFixed(0)}`,
      icon: Award,
      color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      subtitle: 'por sistema UP',
    },
    {
      label: 'Retención',
      value: `${stats.avgRetentionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: stats.avgRetentionRate >= 80 
        ? 'text-green-500 bg-green-500/10 border-green-500/20'
        : stats.avgRetentionRate >= 50 
          ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
          : 'text-red-500 bg-red-500/10 border-red-500/20',
      progress: stats.avgRetentionRate,
    },
    {
      label: 'Top Nivel',
      value: stats.topLevel.charAt(0).toUpperCase() + stats.topLevel.slice(1),
      icon: Crown,
      color: getLevelColor(stats.topLevel),
      subtitle: `${stats.topLevelCount} embajadores`,
    },
    {
      label: 'Tasa Activación',
      value: `${stats.totalReferrals > 0 ? Math.round((stats.activatedReferrals / stats.totalReferrals) * 100) : 0}%`,
      icon: Target,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      progress: stats.totalReferrals > 0 ? (stats.activatedReferrals / stats.totalReferrals) * 100 : 0,
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
