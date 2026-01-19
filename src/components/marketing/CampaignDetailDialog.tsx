import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  DollarSign, 
  Target, 
  TrendingUp, 
  MousePointerClick,
  Eye,
  Users,
  BarChart3,
  Zap,
  Lightbulb,
  RefreshCw,
  Heart,
  Trash2,
  Pencil,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MarketingCampaign, CAMPAIGN_STATUSES, PLATFORMS, SPHERE_PHASES, SpherePhase } from "./types";
import { toast } from "sonner";

interface CampaignDetailDialogProps {
  campaign: MarketingCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  isAdmin?: boolean;
}

export function CampaignDetailDialog({ campaign, open, onOpenChange, onDelete, onUpdate, isAdmin }: CampaignDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    budget: 0,
    start_date: '',
    end_date: '',
  });

  if (!campaign) return null;

  const handleEdit = () => {
    setEditData({
      name: campaign.name,
      description: campaign.description || '',
      budget: campaign.budget,
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({
          name: editData.name,
          description: editData.description || null,
          budget: editData.budget,
          start_date: editData.start_date || null,
          end_date: editData.end_date || null,
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast.success('Campaña actualizada');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Error al actualizar campaña');
    } finally {
      setSaving(false);
    }
  };

  const spherePhase = SPHERE_PHASES.find(p => p.value === (campaign.sphere_phase || campaign.campaign_type));
  const statusInfo = CAMPAIGN_STATUSES.find(s => s.value === campaign.status);
  
  const getSphereIcon = (phase: SpherePhase) => {
    switch (phase) {
      case 'engage': return <Zap className="h-4 w-4" />;
      case 'solution': return <Lightbulb className="h-4 w-4" />;
      case 'remarketing': return <RefreshCw className="h-4 w-4" />;
      case 'fidelize': return <Heart className="h-4 w-4" />;
      default: return null;
    }
  };
  
  const budgetProgress = campaign.budget > 0 
    ? (campaign.spent / campaign.budget) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: campaign.currency || 'COP',
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {(campaign.marketing_client as any)?.client?.name}
              </p>
            </div>
            <div className="flex gap-2">
              {spherePhase && (
                <Badge className={`${spherePhase.bgColor} ${spherePhase.color} gap-1`}>
                  {getSphereIcon(spherePhase.value)}
                  {spherePhase.label}
                </Badge>
              )}
              {statusInfo && (
                <Badge variant="outline" className="gap-1">
                  <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                  {statusInfo.label}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-6 pr-4">
            {/* Edit Mode Form */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={editData.name} 
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea 
                    value={editData.description} 
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Presupuesto</Label>
                    <Input 
                      type="number"
                      value={editData.budget} 
                      onChange={(e) => setEditData({ ...editData, budget: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha inicio</Label>
                    <Input 
                      type="date"
                      value={editData.start_date} 
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha fin</Label>
                    <Input 
                      type="date"
                      value={editData.end_date} 
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Description */}
                {campaign.description && (
                  <div>
                    <h4 className="font-medium mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  </div>
                )}

                <Separator />

                {/* Dates & Budget */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Periodo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {campaign.start_date || campaign.end_date ? (
                        <p className="text-lg font-semibold">
                          {campaign.start_date && format(new Date(campaign.start_date), "d MMM", { locale: es })}
                          {campaign.start_date && campaign.end_date && ' - '}
                          {campaign.end_date && format(new Date(campaign.end_date), "d MMM yyyy", { locale: es })}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Sin fechas definidas</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Presupuesto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                      </p>
                      <Progress value={budgetProgress} className="h-2 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {budgetProgress.toFixed(1)}% ejecutado
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Metrics */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Métricas de Rendimiento
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <Eye className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-2xl font-bold">
                          {campaign.metrics?.impressions?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Impresiones</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <MousePointerClick className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                        <p className="text-2xl font-bold">
                          {campaign.metrics?.clicks?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <Users className="h-6 w-6 mx-auto text-green-500 mb-1" />
                        <p className="text-2xl font-bold">
                          {campaign.metrics?.conversions?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Conversiones</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <TrendingUp className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                        <p className="text-2xl font-bold">
                          {campaign.metrics?.ctr ? `${campaign.metrics.ctr.toFixed(2)}%` : '0%'}
                        </p>
                        <p className="text-xs text-muted-foreground">CTR</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Cost Metrics */}
                {(campaign.metrics?.cpc || campaign.metrics?.cost_per_conversion) && (
                  <div className="grid grid-cols-2 gap-4">
                    {campaign.metrics.cpc && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Costo por Click</p>
                          <p className="text-xl font-bold">{formatCurrency(campaign.metrics.cpc)}</p>
                        </CardContent>
                      </Card>
                    )}
                    {campaign.metrics.cost_per_conversion && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Costo por Conversión</p>
                          <p className="text-xl font-bold">{formatCurrency(campaign.metrics.cost_per_conversion)}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Platforms */}
                {campaign.platforms && campaign.platforms.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Plataformas</h4>
                    <div className="flex flex-wrap gap-2">
                      {campaign.platforms.map((platform) => {
                        const p = PLATFORMS.find(pl => pl.value === platform);
                        return (
                          <Badge key={platform} variant="secondary">
                            {p?.label || platform}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Objectives */}
                {campaign.objectives && campaign.objectives.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Objetivos
                    </h4>
                    <div className="space-y-2">
                      {campaign.objectives.map((obj, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="capitalize">{obj.type}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {obj.current || 0} / {obj.target}
                            </span>
                            <Progress 
                              value={obj.target > 0 ? ((obj.current || 0) / obj.target) * 100 : 0} 
                              className="w-24 h-2" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {isAdmin && onDelete && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onDelete(campaign.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              onOpenChange(false);
            }}>
              Cerrar
            </Button>
            {isAdmin && !isEditing && (
              <Button onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {isEditing && (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
