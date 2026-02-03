import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Calendar, DollarSign, TrendingUp, MoreHorizontal, Play, Pause, CheckCircle, Eye, Zap, Lightbulb, RefreshCw, Heart, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MarketingCampaign, CAMPAIGN_STATUSES, PLATFORMS, SPHERE_PHASES, getSpherePhaseConfig, SpherePhase } from "./types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddCampaignDialog } from "./AddCampaignDialog";
import { CampaignDetailDialog } from "./CampaignDetailDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface MarketingCampaignsProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

export function MarketingCampaigns({ organizationId, selectedClientId }: MarketingCampaignsProps) {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'admin';
  
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchCampaigns();
    }
  }, [organizationId, selectedClientId]);

  const fetchCampaigns = async () => {
    if (!organizationId) return;

    try {
      // If filtering by client, first get the marketing_client_id for that client
      let marketingClientId: string | null = null;
      
      if (selectedClientId) {
        const { data: mcData } = await supabase
          .from('marketing_clients')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('client_id', selectedClientId)
          .maybeSingle();
        
        marketingClientId = mcData?.id || null;
      }

      let query = supabase.from('marketing_campaigns').select('*').eq('organization_id', organizationId);
      if (selectedClientId && marketingClientId) {
        query = query.eq('marketing_client_id', marketingClientId);
      }
      const { data: raw, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const campaignsData = (raw || []) as any[];
      if (campaignsData.length > 0) {
        const mcIds = [...new Set(campaignsData.map((c) => c.marketing_client_id).filter(Boolean))];
        const { data: mcList } = mcIds.length > 0 ? await supabase.from('marketing_clients').select('id, client_id').in('id', mcIds) : { data: [] };
        const clientIds = [...new Set((mcList ?? []).map((m) => m.client_id).filter(Boolean))];
        const { data: clientsList } = clientIds.length > 0 ? await supabase.from('clients').select('id, name, logo_url').in('id', clientIds) : { data: [] };
        const clientMap = new Map((clientsList ?? []).map((c) => [c.id, c]));
        const mcMap = new Map((mcList ?? []).map((m) => [m.id, { id: m.id, client_id: m.client_id, client: m.client_id ? clientMap.get(m.client_id) : null }]));
        campaignsData.forEach((c) => {
          c.marketing_client = c.marketing_client_id ? mcMap.get(c.marketing_client_id) ?? null : null;
        });
      }

      setCampaigns(campaignsData.map(item => ({
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

  const deleteCampaign = async (id: string) => {
    try {
      // First, remove campaign reference from content
      await supabase
        .from('content')
        .update({ marketing_campaign_id: null, strategy_status: null })
        .eq('marketing_campaign_id', id);

      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Campaña eliminada');
      setDeleteId(null);
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error al eliminar campaña');
    }
  };

  const getSphereIcon = (phase: SpherePhase) => {
    switch (phase) {
      case 'engage': return <Zap className="h-3 w-3" />;
      case 'solution': return <Lightbulb className="h-3 w-3" />;
      case 'remarketing': return <RefreshCw className="h-3 w-3" />;
      case 'fidelize': return <Heart className="h-3 w-3" />;
      default: return null;
    }
  };

  const getCampaignTypeInfo = (type: string) => {
    const phase = SPHERE_PHASES.find(p => p.value === type);
    if (phase) {
      return { label: phase.label, color: phase.bgColor.replace('bg-', 'bg-').replace('-100', '-500').replace('-900', '-500') };
    }
    return { label: type, color: 'bg-gray-500' };
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
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
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
            {campaigns.filter(c => c.status === 'active').length} campañas activas de {campaigns.length} totales
          </p>
        </div>
        <AddCampaignDialog organizationId={organizationId} onSuccess={fetchCampaigns} />
      </div>

      {/* Status Summary */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_STATUSES.map(status => {
            const count = campaigns.filter(c => c.status === status.value).length;
            if (count === 0) return null;
            return (
              <Badge key={status.value} variant="outline" className="gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status.color}`} />
                {status.label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

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
              <Card 
                key={campaign.id} 
                className="relative hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setShowDetail(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <CardDescription>
                        {(campaign.marketing_client as any)?.client?.name || 'Cliente'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaign(campaign);
                          setShowDetail(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {campaign.status === 'planning' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(campaign.id, 'active');
                          }}>
                            <Play className="h-4 w-4 mr-2" />
                            Activar
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'active' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(campaign.id, 'paused');
                          }}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'paused' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(campaign.id, 'active');
                          }}>
                            <Play className="h-4 w-4 mr-2" />
                            Reanudar
                          </DropdownMenuItem>
                        )}
                        {['active', 'paused'].includes(campaign.status) && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(campaign.id, 'completed');
                          }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completar
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(campaign.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`${typeInfo.color} text-white gap-1`}>
                      {getSphereIcon(campaign.sphere_phase || campaign.campaign_type as SpherePhase)}
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
                      {campaign.platforms.slice(0, 3).map((platform) => {
                        const p = PLATFORMS.find(pl => pl.value === platform);
                        return (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {p?.label || platform}
                          </Badge>
                        );
                      })}
                      {campaign.platforms.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{campaign.platforms.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Quick Metrics */}
                  {campaign.metrics && Object.keys(campaign.metrics).length > 0 && (
                    <div className="flex items-center gap-4 text-sm border-t pt-3">
                      {campaign.metrics.impressions !== undefined && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{campaign.metrics.impressions.toLocaleString()} imp.</span>
                        </div>
                      )}
                      {campaign.metrics.clicks !== undefined && (
                        <div>
                          <span>{campaign.metrics.clicks.toLocaleString()} clicks</span>
                        </div>
                      )}
                      {campaign.metrics.conversions !== undefined && (
                        <div className="text-green-600">
                          <span>{campaign.metrics.conversions} conv.</span>
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

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog 
        campaign={selectedCampaign}
        open={showDetail}
        onOpenChange={setShowDetail}
        onDelete={isAdmin ? (id) => {
          setShowDetail(false);
          setDeleteId(id);
        } : undefined}
        onUpdate={fetchCampaigns}
        isAdmin={isAdmin}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la campaña y se desvinculará el contenido asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteCampaign(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
