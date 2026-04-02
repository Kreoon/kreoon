import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  CheckCircle2,
  X,
  RefreshCw,
  Loader2,
  Zap,
  Heart
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPHERE_PHASES, SpherePhase } from "./types";

interface MarketingInsightsProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

interface Insight {
  id: string;
  insight_type: string;
  category: string | null;
  title: string;
  description: string;
  severity: string;
  is_read: boolean;
  is_dismissed: boolean;
  is_actionable: boolean;
  action_taken: string | null;
  created_at: string;
  related_channel?: { channel_name: string } | null;
  related_campaign?: { name: string } | null;
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="h-5 w-5" />,
  recommendation: <Lightbulb className="h-5 w-5" />,
  trend: <TrendingUp className="h-5 w-5" />,
  anomaly: <TrendingDown className="h-5 w-5" />,
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  info: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950' },
  critical: { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  success: { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
};

export function MarketingInsights({ organizationId, selectedClientId }: MarketingInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (organizationId) {
      fetchInsights();
    }
  }, [organizationId, selectedClientId]);

  const fetchInsights = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('marketing_ai_insights')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_dismissed', false);
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      const { data: raw, error } = await query.order('created_at', { ascending: false }).limit(20);

      if (error) throw error;

      const data = raw || [];
      if (data.length > 0) {
        const channelIds = [...new Set(data.map((i: any) => i.related_channel_id).filter(Boolean))];
        const campaignIds = [...new Set(data.map((i: any) => i.related_campaign_id).filter(Boolean))];
        const [chRes, campRes] = await Promise.all([
          channelIds.length > 0 ? supabase.from('traffic_channels').select('id, channel_name').in('id', channelIds) : { data: [] },
          campaignIds.length > 0 ? supabase.from('marketing_campaigns').select('id, name').in('id', campaignIds) : { data: [] },
        ]);
        const channelMap = new Map((chRes.data ?? []).map((c) => [c.id, { channel_name: c.channel_name }]));
        const campaignMap = new Map((campRes.data ?? []).map((c) => [c.id, { name: c.name }]));
        data.forEach((i: any) => {
          i.related_channel = i.related_channel_id ? channelMap.get(i.related_channel_id) ?? null : null;
          i.related_campaign = i.related_campaign_id ? campaignMap.get(i.related_campaign_id) ?? null : null;
        });
      }
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast.error('Error al cargar insights');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!organizationId) return;
    setGenerating(true);

    try {
      // Fetch data for analysis
      const [channelsRes, syncLogsRes, campaignsRes] = await Promise.all([
        supabase.from('traffic_channels').select('*').eq('organization_id', organizationId),
        supabase.from('traffic_sync_logs').select('*').eq('organization_id', organizationId).order('sync_date', { ascending: false }).limit(50),
        supabase.from('marketing_campaigns').select('*').eq('organization_id', organizationId),
      ]);

      const channels = channelsRes.data || [];
      const syncLogs = syncLogsRes.data || [];
      const campaigns = campaignsRes.data || [];

      // Generate insights based on data analysis
      const newInsights: Omit<Insight, 'id' | 'created_at' | 'related_channel' | 'related_campaign'>[] = [];

      // Analyze budget distribution
      const totalBudget = channels.reduce((sum, c) => sum + (Number(c.monthly_budget) || 0), 0);
      const totalInvestment = syncLogs.reduce((sum, l) => sum + (Number(l.investment) || 0), 0);

      if (totalBudget > 0 && totalInvestment / totalBudget > 0.8) {
        newInsights.push({
          insight_type: 'alert',
          category: 'budget',
          title: 'Presupuesto casi agotado',
          description: `Has utilizado el ${Math.round((totalInvestment / totalBudget) * 100)}% del presupuesto mensual. Considera ajustar la distribución o incrementar el presupuesto.`,
          severity: 'warning',
          is_read: false,
          is_dismissed: false,
          is_actionable: true,
          action_taken: null,
        });
      }

      // Analyze channel performance
      const channelPerformance = channels.map(channel => {
        const channelLogs = syncLogs.filter(l => l.channel_id === channel.id);
        const investment = channelLogs.reduce((sum, l) => sum + (Number(l.investment) || 0), 0);
        const leads = channelLogs.reduce((sum, l) => sum + (Number(l.leads) || 0), 0);
        const sales = channelLogs.reduce((sum, l) => sum + (Number(l.sales) || 0), 0);
        return { channel, investment, leads, sales, cpl: leads > 0 ? investment / leads : 0 };
      });

      // Find underperforming channels
      channelPerformance.forEach(perf => {
        if (perf.investment > 0 && perf.leads === 0 && perf.sales === 0) {
          newInsights.push({
            insight_type: 'alert',
            category: 'performance',
            title: `${perf.channel.channel_name} sin resultados`,
            description: `Has invertido ${perf.investment.toLocaleString()} en este canal pero no has registrado leads ni ventas. Revisa la configuración de las campañas o considera pausar este canal.`,
            severity: 'critical',
            is_read: false,
            is_dismissed: false,
            is_actionable: true,
            action_taken: null,
          });
        }
      });

      // Channels without recent sync
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      channels.forEach(channel => {
        if (!channel.last_sync_at || new Date(channel.last_sync_at) < weekAgo) {
          newInsights.push({
            insight_type: 'recommendation',
            category: 'data',
            title: `Actualiza datos de ${channel.channel_name}`,
            description: `Este canal no ha sido sincronizado en más de 7 días. Mantén los datos actualizados para tener insights precisos.`,
            severity: 'info',
            is_read: false,
            is_dismissed: false,
            is_actionable: true,
            action_taken: null,
          });
        }
      });

      // Positive insights
      const topPerformer = channelPerformance.find(p => p.leads > 10 && p.cpl > 0);
      if (topPerformer) {
        newInsights.push({
          insight_type: 'trend',
          category: 'performance',
          title: `${topPerformer.channel.channel_name} es tu canal estrella`,
          description: `Este canal ha generado ${topPerformer.leads} leads con un CPL de ${topPerformer.cpl.toFixed(2)}. Considera aumentar la inversión aquí.`,
          severity: 'success',
          is_read: false,
          is_dismissed: false,
          is_actionable: true,
          action_taken: null,
        });
      }

      // Campaign insights
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      if (activeCampaigns.length === 0 && channels.length > 0) {
        newInsights.push({
          insight_type: 'recommendation',
          category: 'campaigns',
          title: 'Sin campañas activas',
          description: 'Tienes canales de tráfico configurados pero ninguna campaña activa. Crea campañas para organizar mejor tus esfuerzos de marketing.',
          severity: 'info',
          is_read: false,
          is_dismissed: false,
          is_actionable: true,
          action_taken: null,
        });
      }

      // Insert new insights
      if (newInsights.length > 0) {
        const { error } = await supabase
          .from('marketing_ai_insights')
          .insert(newInsights.map(i => ({ ...i, organization_id: organizationId })));

        if (error) throw error;
        toast.success(`Se generaron ${newInsights.length} nuevos insights`);
        fetchInsights();
      } else {
        toast.info('No se encontraron nuevos insights para generar');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Error al generar insights');
    } finally {
      setGenerating(false);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId);

      if (error) throw error;
      setInsights(prev => prev.filter(i => i.id !== insightId));
    } catch (error) {
      console.error('Error dismissing insight:', error);
      toast.error('Error al descartar insight');
    }
  };

  const markAsActioned = async (insightId: string, action: string) => {
    try {
      const { error } = await supabase
        .from('marketing_ai_insights')
        .update({ action_taken: action, is_read: true })
        .eq('id', insightId);

      if (error) throw error;
      toast.success('Acción registrada');
      fetchInsights();
    } catch (error) {
      console.error('Error updating insight:', error);
      toast.error('Error al actualizar');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights Método Esfera
          </h3>
          <p className="text-sm text-muted-foreground">
            Análisis inteligente basado en las 4 fases: Enganchar, Solución, Remarketing, Fidelizar
          </p>
        </div>
        <Button onClick={generateInsights} disabled={generating} className="gap-2">
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Generar Insights
            </>
          )}
        </Button>
      </div>

      {/* Insights List */}
      {insights.length === 0 ? (
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin insights disponibles</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Agrega canales de tráfico y sincroniza datos para que la IA pueda analizar tu rendimiento
          </p>
          <Button onClick={generateInsights} disabled={generating}>
            Generar Primer Análisis
          </Button>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {insights.map((insight) => {
              const severityConfig = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
              
              return (
                <Card key={insight.id} className={`relative overflow-hidden ${severityConfig.bg}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-sm ${severityConfig.bg} ${severityConfig.color}`}>
                        {INSIGHT_ICONS[insight.insight_type] || <Lightbulb className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {insight.category && (
                                <Badge variant="outline" className="text-xs">
                                  {insight.category}
                                </Badge>
                              )}
                              {insight.related_channel && (
                                <Badge variant="secondary" className="text-xs">
                                  {insight.related_channel.channel_name}
                                </Badge>
                              )}
                              {insight.action_taken && (
                                <Badge variant="default" className="text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Acción tomada
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => dismissInsight(insight.id)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {insight.is_actionable && !insight.action_taken && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsActioned(insight.id, 'acknowledged')}
                            >
                              Entendido
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => markAsActioned(insight.id, 'actioned')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Acción Tomada
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
