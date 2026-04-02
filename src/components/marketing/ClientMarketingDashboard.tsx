import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Target,
  FileVideo,
  CheckCircle,
  DollarSign,
  Megaphone
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientMarketingDashboardProps {
  organizationId: string | null | undefined;
  clientId: string | null | undefined;
}

interface DashboardStats {
  activeObjective: string | null;
  totalContent: number;
  approvedContent: number;
  rejectedContent: number;
  pendingContent: number;
  inCampaignContent: number;
  activeCampaigns: number;
  totalInvestment: number;
}

export function ClientMarketingDashboard({ organizationId, clientId }: ClientMarketingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (organizationId && clientId) {
      fetchStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [organizationId, clientId]);

  const fetchStats = async () => {
    if (!organizationId || !clientId) return;
    setLoading(true);

    try {
      // Fetch strategy
      const { data: strategy } = await supabase
        .from('marketing_strategies')
        .select('business_objective')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch content stats
      const { data: contentData } = await supabase
        .from('content')
        .select('id, strategy_status, sphere_phase')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId);

      const content = contentData || [];
      
      // Count by status
      const approved = content.filter(c => c.strategy_status === 'aprobado_estrategia').length;
      const rejected = content.filter(c => c.strategy_status === 'rechazado_estrategia').length;
      const pending = content.filter(c => c.strategy_status === 'pendiente_validacion').length;
      const inCampaign = content.filter(c => c.strategy_status === 'en_campaña').length;

      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, status, spent')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId);

      const activeCampaigns = (campaigns || []).filter(c => c.status === 'active').length;
      const totalInvestment = (campaigns || []).reduce((sum, c) => sum + (Number(c.spent) || 0), 0);

      setStats({
        activeObjective: strategy?.business_objective || null,
        totalContent: content.length,
        approvedContent: approved,
        rejectedContent: rejected,
        pendingContent: pending,
        inCampaignContent: inCampaign,
        activeCampaigns,
        totalInvestment,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!clientId) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Selecciona un cliente</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Selecciona un cliente para ver su dashboard de marketing
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Objective Card */}
      {stats.activeObjective && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-sm bg-primary/20">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objetivo Activo</p>
                <p className="text-lg font-semibold mt-1">{stats.activeObjective}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-blue-100 dark:bg-blue-900">
                <FileVideo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContent}</p>
                <p className="text-sm text-muted-foreground">Total Contenidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approvedContent}</p>
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-600 font-medium">{stats.rejectedContent}</p>
                <p className="text-xs text-muted-foreground">Rechazados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-purple-100 dark:bg-purple-900">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
                <p className="text-sm text-muted-foreground">Campañas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-amber-100 dark:bg-amber-900">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('es-CO', { 
                    style: 'currency', 
                    currency: 'COP',
                    minimumFractionDigits: 0 
                  }).format(stats.totalInvestment)}
                </p>
                <p className="text-sm text-muted-foreground">Inversión Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}