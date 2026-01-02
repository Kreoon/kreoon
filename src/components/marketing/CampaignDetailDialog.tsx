import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  DollarSign, 
  Target, 
  TrendingUp, 
  MousePointerClick,
  Eye,
  Users,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MarketingCampaign, CAMPAIGN_TYPES, CAMPAIGN_STATUSES, PLATFORMS } from "./types";

interface CampaignDetailDialogProps {
  campaign: MarketingCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailDialog({ campaign, open, onOpenChange }: CampaignDetailDialogProps) {
  if (!campaign) return null;

  const typeInfo = CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type);
  const statusInfo = CAMPAIGN_STATUSES.find(s => s.value === campaign.status);
  
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
              {typeInfo && (
                <Badge className={`${typeInfo.color} text-white`}>
                  {typeInfo.label}
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
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button>
            Editar Campaña
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
