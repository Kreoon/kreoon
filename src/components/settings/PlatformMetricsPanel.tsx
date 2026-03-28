import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Package, Sparkles, TrendingUp,
  Users, Building2, Activity, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlatformStats {
  // AI Usage (all orgs)
  aiRequests: number;
  aiSuccessRate: number;
  tokensUsed: number;
  
  // Products & Strategy (all orgs)
  totalProducts: number;
  productsWithStrategy: number;
  
  // Global counts
  totalOrganizations: number;
  totalUsers: number;
  totalClients: number;
  totalContent: number;
}

export function PlatformMetricsPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    aiRequests: 0,
    aiSuccessRate: 0,
    tokensUsed: 0,
    totalProducts: 0,
    productsWithStrategy: 0,
    totalOrganizations: 0,
    totalUsers: 0,
    totalClients: 0,
    totalContent: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch AI usage (global)
      const { data: aiLogs } = await supabase
        .from('ai_usage_logs')
        .select('success, tokens_input, tokens_output');

      const aiSuccessRate = aiLogs?.length 
        ? Math.round((aiLogs.filter(l => l.success).length / aiLogs.length) * 100)
        : 0;
      const tokensUsed = aiLogs?.reduce((sum, l) => sum + (l.tokens_input || 0) + (l.tokens_output || 0), 0) || 0;

      // Fetch products (global)
      const { data: products } = await supabase
        .from('products')
        .select('id, strategy');
      
      const productsCount = products?.length || 0;
      const productsWithStrategy = products?.filter(p => p.strategy)?.length || 0;

      // Fetch global counts
      const { count: orgsCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const { count: contentCount } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true });

      setStats({
        aiRequests: aiLogs?.length || 0,
        aiSuccessRate,
        tokensUsed,
        totalProducts: productsCount,
        productsWithStrategy,
        totalOrganizations: orgsCount || 0,
        totalUsers: usersCount || 0,
        totalClients: clientsCount || 0,
        totalContent: contentCount || 0,
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-sm" />)}
        </div>
      </div>
    );
  }

  const globalKpis = [
    {
      label: 'Organizaciones',
      value: stats.totalOrganizations,
      icon: Building2,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    },
    {
      label: 'Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Clientes',
      value: stats.totalClients,
      icon: Database,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'Contenidos',
      value: stats.totalContent,
      icon: Activity,
      color: 'text-green-500 bg-green-500/10 border-green-500/20',
    },
  ];

  const platformKpis = [
    {
      label: 'Peticiones IA',
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
      value: stats.tokensUsed > 1000000 
        ? `${(stats.tokensUsed / 1000000).toFixed(2)}M` 
        : stats.tokensUsed > 1000 
          ? `${(stats.tokensUsed / 1000).toFixed(1)}K` 
          : stats.tokensUsed,
      icon: Sparkles,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      subtitle: 'consumidos',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Estadísticas Globales
          </CardTitle>
          <CardDescription>
            Métricas generales de toda la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {globalKpis.map((kpi, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-sm border transition-all hover:shadow-md",
                  kpi.color
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className="h-4 w-4" />
                  <span className="text-sm font-medium opacity-80">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold">
                  {kpi.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Uso de Plataforma
          </CardTitle>
          <CardDescription>
            Métricas de IA y productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platformKpis.map((kpi, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-sm border transition-all hover:shadow-md",
                  kpi.color
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className="h-4 w-4" />
                  <span className="text-sm font-medium opacity-80">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </p>
                {kpi.subtitle && (
                  <p className="text-xs opacity-70 mt-1">{kpi.subtitle}</p>
                )}
              </div>
            ))}
          </div>

          {/* AI Success Rate */}
          <div className="mt-6 p-4 rounded-sm border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Tasa de Éxito IA</span>
              </div>
              <Badge variant={stats.aiSuccessRate >= 90 ? "default" : stats.aiSuccessRate >= 70 ? "secondary" : "destructive"}>
                {stats.aiSuccessRate}%
              </Badge>
            </div>
            <Progress value={stats.aiSuccessRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
