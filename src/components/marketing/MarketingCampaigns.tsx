import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Megaphone, Calendar, DollarSign, TrendingUp, MoreHorizontal, Play, Pause, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { MarketingCampaign, CAMPAIGN_TYPES, CAMPAIGN_STATUSES, PLATFORMS } from "./types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddCampaignDialog } from "./AddCampaignDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MarketingCampaignsProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

export function MarketingCampaigns({ organizationId, selectedClientId }: MarketingCampaignsProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchCampaigns();
    }
  }, [organizationId, selectedClientId]);

  const fetchCampaigns = async () => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from('marketing_campaigns')
        .select(`
          *,
          marketing_client:marketing_clients(
            id,
            client:clients(id, name, logo_url)
          )
        `)
        .eq('organization_id', organizationId);
      
      // Filter by selected client if strategist has one selected
      if (selectedClientId) {
        query = query.eq('marketing_client.client_id', selectedClientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      setCampaigns((data || []).map(item => ({
        ...item,
        platforms: item.platforms || [],
        objectives: item.objectives || [],
        metrics: item.metrics || {},
      })) as unknown as MarketingCampaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Error al cargar campañas');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Estado actualizado');
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Error al actualizar campaña');
    }
  };

  const getCampaignTypeInfo = (type: string) => {
    return CAMPAIGN_TYPES.find(t => t.value === type) || { label: type, color: 'bg-gray-500' };
  };

  const getStatusInfo = (status: string) => {
    return CAMPAIGN_STATUSES.find(s => s.value === status) || { label: status, color: 'bg-gray-500' };
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetProgress = (spent: number, budget: number) => {
    if (budget === 0) return 0;
    return Math.min((spent / budget) * 100, 100);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campañas</h2>
          <p className="text-sm text-muted-foreground">
            {campaigns.filter(c => c.status === 'active').length} campañas activas
          </p>
        </div>
        <AddCampaignDialog organizationId={organizationId} onSuccess={fetchCampaigns} />
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Sin campañas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea campañas para gestionar la publicidad de tus clientes
            </p>
            <AddCampaignDialog organizationId={organizationId} onSuccess={fetchCampaigns} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const typeInfo = getCampaignTypeInfo(campaign.campaign_type);
            const statusInfo = getStatusInfo(campaign.status);
            const budgetProgress = getBudgetProgress(campaign.spent, campaign.budget);

            return (
              <Card key={campaign.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <CardDescription>
                        {(campaign.marketing_client as any)?.client?.name || 'Cliente'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {campaign.status === 'planning' && (
                          <DropdownMenuItem onClick={() => updateStatus(campaign.id, 'active')}>
                            <Play className="h-4 w-4 mr-2" />
                            Activar
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'active' && (
                          <DropdownMenuItem onClick={() => updateStatus(campaign.id, 'paused')}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'paused' && (
                          <DropdownMenuItem onClick={() => updateStatus(campaign.id, 'active')}>
                            <Play className="h-4 w-4 mr-2" />
                            Reanudar
                          </DropdownMenuItem>
                        )}
                        {['active', 'paused'].includes(campaign.status) && (
                          <DropdownMenuItem onClick={() => updateStatus(campaign.id, 'completed')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`${typeInfo.color} text-white`}>
                      {typeInfo.label}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dates */}
                  {(campaign.start_date || campaign.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {campaign.start_date && format(new Date(campaign.start_date), "d MMM", { locale: es })}
                        {campaign.start_date && campaign.end_date && ' - '}
                        {campaign.end_date && format(new Date(campaign.end_date), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                  )}

                  {/* Budget Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Presupuesto
                      </span>
                      <span className="font-medium">
                        {formatCurrency(campaign.spent, campaign.currency)} / {formatCurrency(campaign.budget, campaign.currency)}
                      </span>
                    </div>
                    <Progress value={budgetProgress} className="h-2" />
                  </div>

                  {/* Platforms */}
                  {campaign.platforms && campaign.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {campaign.platforms.map((platform) => {
                        const p = PLATFORMS.find(pl => pl.value === platform);
                        return (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {p?.label || platform}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Metrics */}
                  {campaign.metrics && Object.keys(campaign.metrics).length > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      {campaign.metrics.impressions && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{campaign.metrics.impressions.toLocaleString()} imp.</span>
                        </div>
                      )}
                      {campaign.metrics.clicks && (
                        <div>
                          <span>{campaign.metrics.clicks.toLocaleString()} clicks</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
