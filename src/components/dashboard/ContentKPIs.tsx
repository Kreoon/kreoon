import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Video, FileCheck, Clock, AlertTriangle, 
  Play, CheckCircle, Edit, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContentKPIsProps {
  organizationId: string;
  className?: string;
}

interface ContentStats {
  totalContent: number;
  inProduction: number;
  inReview: number;
  approved: number;
  delivered: number;
  withIssues: number;
  avgDaysToComplete: number;
  completionRate: number;
  thisMonthCreated: number;
  thisMonthDelivered: number;
}

export function ContentKPIs({ organizationId, className }: ContentKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ContentStats>({
    totalContent: 0,
    inProduction: 0,
    inReview: 0,
    approved: 0,
    delivered: 0,
    withIssues: 0,
    avgDaysToComplete: 0,
    completionRate: 0,
    thisMonthCreated: 0,
    thisMonthDelivered: 0,
  });

  useEffect(() => {
    if (!organizationId) return;
    fetchStats();
  }, [organizationId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch all content for org
      const { data: content } = await supabase
        .from('content')
        .select('id, status, created_at, delivered_at')
        .eq('organization_id', organizationId);

      if (!content) {
        setLoading(false);
        return;
      }

      const totalContent = content.length;
      
      // Status counts
      const inProduction = content.filter(c => 
        ['draft', 'script_pending', 'recording', 'editing'].includes(c.status || '')
      ).length;
      
      const inReview = content.filter(c => 
        ['review', 'script_approved'].includes(c.status || '')
      ).length;
      
      const approved = content.filter(c => c.status === 'approved').length;
      const delivered = content.filter(c => c.status === 'delivered').length;
      const withIssues = content.filter(c => c.status === 'issue').length;

      // Calculate average days to complete
      const completedContent = content.filter(c => c.delivered_at && c.created_at);
      let avgDaysToComplete = 0;
      if (completedContent.length > 0) {
        const totalDays = completedContent.reduce((sum, c) => {
          const created = new Date(c.created_at!);
          const delivered = new Date(c.delivered_at!);
          return sum + Math.ceil((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDaysToComplete = Math.round(totalDays / completedContent.length);
      }

      // Completion rate
      const completionRate = totalContent > 0 ? (delivered / totalContent) * 100 : 0;

      // This month stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthCreated = content.filter(c => 
        c.created_at && new Date(c.created_at) >= startOfMonth
      ).length;
      
      const thisMonthDelivered = content.filter(c => 
        c.delivered_at && new Date(c.delivered_at) >= startOfMonth
      ).length;

      setStats({
        totalContent,
        inProduction,
        inReview,
        approved,
        delivered,
        withIssues,
        avgDaysToComplete,
        completionRate,
        thisMonthCreated,
        thisMonthDelivered,
      });
    } catch (error) {
      console.error('Error fetching content stats:', error);
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
      label: 'Total Contenido',
      value: stats.totalContent,
      icon: Video,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      subtitle: `${stats.thisMonthCreated} este mes`,
    },
    {
      label: 'En Producción',
      value: stats.inProduction,
      icon: Edit,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      subtitle: 'actualmente',
    },
    {
      label: 'En Revisión',
      value: stats.inReview,
      icon: Clock,
      color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      subtitle: 'pendiente aprobación',
    },
    {
      label: 'Aprobados',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-500 bg-green-500/10 border-green-500/20',
      subtitle: 'listos para entregar',
    },
    {
      label: 'Entregados',
      value: stats.delivered,
      icon: Send,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      subtitle: `${stats.thisMonthDelivered} este mes`,
    },
    {
      label: 'Con Problemas',
      value: stats.withIssues,
      icon: AlertTriangle,
      color: stats.withIssues > 0 
        ? 'text-red-500 bg-red-500/10 border-red-500/20'
        : 'text-gray-500 bg-gray-500/10 border-gray-500/20',
      subtitle: 'requieren atención',
    },
    {
      label: 'Días Promedio',
      value: stats.avgDaysToComplete,
      icon: Play,
      color: stats.avgDaysToComplete <= 7 
        ? 'text-green-500 bg-green-500/10 border-green-500/20'
        : stats.avgDaysToComplete <= 14 
          ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
          : 'text-red-500 bg-red-500/10 border-red-500/20',
      subtitle: 'para completar',
    },
    {
      label: 'Tasa Completado',
      value: `${stats.completionRate.toFixed(1)}%`,
      icon: FileCheck,
      color: stats.completionRate >= 80 
        ? 'text-green-500 bg-green-500/10 border-green-500/20'
        : stats.completionRate >= 50 
          ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
          : 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      progress: stats.completionRate,
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
