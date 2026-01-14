import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, Brain, Package, Sparkles, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlatformKPIsProps {
  organizationId: string;
  className?: string;
}

interface PlatformStats {
  // Chat & Collaboration
  totalConversations: number;
  totalMessages: number;
  
  // AI Usage
  aiRequests: number;
  aiSuccessRate: number;
  tokensUsed: number;
  
  // Products & Strategy
  totalProducts: number;
  productsWithStrategy: number;
}

export function PlatformKPIs({ organizationId, className }: PlatformKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    totalConversations: 0,
    totalMessages: 0,
    aiRequests: 0,
    aiSuccessRate: 0,
    tokensUsed: 0,
    totalProducts: 0,
    productsWithStrategy: 0,
  });

  useEffect(() => {
    if (!organizationId) return;
    fetchStats();
  }, [organizationId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch chat stats
      const { count: conversationsCount } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*, chat_conversations!inner(organization_id)', { count: 'exact', head: true })
        .eq('chat_conversations.organization_id', organizationId);

      // Fetch AI usage
      const { data: aiLogs } = await supabase
        .from('ai_usage_logs')
        .select('success, tokens_input, tokens_output')
        .eq('organization_id', organizationId);

      const aiSuccessRate = aiLogs?.length 
        ? Math.round((aiLogs.filter(l => l.success).length / aiLogs.length) * 100)
        : 0;
      const tokensUsed = aiLogs?.reduce((sum, l) => sum + (l.tokens_input || 0) + (l.tokens_output || 0), 0) || 0;

      // Fetch products
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', organizationId);

      const clientIds = clients?.map(c => c.id) || [];
      
      let productsCount = 0;
      let productsWithStrategy = 0;
      if (clientIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, strategy')
          .in('client_id', clientIds);
        
        productsCount = products?.length || 0;
        productsWithStrategy = products?.filter(p => p.strategy)?.length || 0;
      }

      setStats({
        totalConversations: conversationsCount || 0,
        totalMessages: messagesCount || 0,
        aiRequests: aiLogs?.length || 0,
        aiSuccessRate,
        tokensUsed,
        totalProducts: productsCount,
        productsWithStrategy,
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-5 gap-2", className)}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Conversaciones',
      value: stats.totalConversations,
      icon: MessageSquare,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      subtitle: `${stats.totalMessages} mensajes`,
    },
    {
      label: 'Uso de IA',
      value: stats.aiRequests,
      icon: Brain,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      subtitle: `${stats.aiSuccessRate}% éxito`,
    },
    {
      label: 'Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-green-500 bg-green-500/10 border-green-500/20',
      subtitle: `${stats.productsWithStrategy} con estrategia`,
    },
    {
      label: 'Tokens IA',
      value: stats.tokensUsed > 1000 ? `${(stats.tokensUsed / 1000).toFixed(1)}K` : stats.tokensUsed,
      icon: Sparkles,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      subtitle: 'consumidos',
    },
    {
      label: 'Tasa Éxito IA',
      value: `${stats.aiSuccessRate}%`,
      icon: TrendingUp,
      color: stats.aiSuccessRate >= 90 
        ? 'text-green-500 bg-green-500/10 border-green-500/20'
        : stats.aiSuccessRate >= 70 
          ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
          : 'text-red-500 bg-red-500/10 border-red-500/20',
      progress: stats.aiSuccessRate,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-5 gap-2", className)}>
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
