import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Megaphone, 
  Zap, 
  Lightbulb, 
  RefreshCw, 
  Heart, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target,
  ExternalLink,
  Calendar,
  User,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Content } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MarketingInfoPanelProps {
  content: Content | null;
  open: boolean;
  onClose: () => void;
}

interface CampaignInfo {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
}

const SPHERE_PHASES = {
  engage: { 
    label: 'Enganchar', 
    icon: Zap, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/50',
    description: 'Captar atención con contenido llamativo'
  },
  solution: { 
    label: 'Solución', 
    icon: Lightbulb, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
    description: 'Mostrar cómo resolver el problema'
  },
  remarketing: { 
    label: 'Remarketing', 
    icon: RefreshCw, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    description: 'Reconectar con audiencia interesada'
  },
  fidelize: { 
    label: 'Fidelizar', 
    icon: Heart, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/50',
    description: 'Crear relación a largo plazo'
  },
};

export function MarketingInfoPanel({ content, open, onClose }: MarketingInfoPanelProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [approver, setApprover] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!content || !open) {
      setCampaign(null);
      setApprover(null);
      return;
    }

    const fetchMarketingData = async () => {
      setLoading(true);
      try {
        // Fetch campaign if assigned
        if (content.marketing_campaign_id) {
          const { data: campaignData } = await supabase
            .from('marketing_campaigns')
            .select('id, name, status, start_date, end_date, budget')
            .eq('id', content.marketing_campaign_id)
            .single();
          
          setCampaign(campaignData);
        }

        // Fetch approver info if approved
        if (content.marketing_approved_by) {
          const { data: approverData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', content.marketing_approved_by)
            .single();
          
          setApprover(approverData);
        }
      } catch (error) {
        console.error('Error fetching marketing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketingData();
  }, [content, open]);

  const getMarketingStatus = () => {
    if (content?.marketing_approved_at) {
      return { 
        label: 'Aprobado para Marketing', 
        icon: CheckCircle, 
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/50'
      };
    }
    if (content?.marketing_rejected_at) {
      return { 
        label: 'Rechazado', 
        icon: XCircle, 
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/50'
      };
    }
    if (content?.marketing_campaign_id) {
      return { 
        label: 'En Campaña', 
        icon: Megaphone, 
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/50'
      };
    }
    return { 
      label: 'Pendiente de asignación', 
      icon: Clock, 
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    };
  };

  const status = getMarketingStatus();
  const StatusIcon = status.icon;
  const spherePhase = content?.sphere_phase ? SPHERE_PHASES[content.sphere_phase as keyof typeof SPHERE_PHASES] : null;
  const SphereIcon = spherePhase?.icon;

  const handleGoToMarketing = () => {
    onClose();
    navigate('/marketing');
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Información de Marketing
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : content ? (
          <div className="space-y-6 mt-6">
            {/* Content Title */}
            <div>
              <h3 className="font-semibold text-lg line-clamp-2">{content.title}</h3>
              {content.client?.name && (
                <p className="text-sm text-muted-foreground">{content.client.name}</p>
              )}
            </div>

            <Separator />

            {/* Marketing Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Estado de Marketing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  status.bgColor
                )}>
                  <StatusIcon className={cn("h-5 w-5", status.color)} />
                  <span className={cn("font-medium", status.color)}>{status.label}</span>
                </div>

                {content.marketing_approved_at && approver && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Aprobado por {approver.full_name}</span>
                    <span>•</span>
                    <span>{format(new Date(content.marketing_approved_at), "dd MMM yyyy", { locale: es })}</span>
                  </div>
                )}

                {content.marketing_rejection_reason && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-700 dark:text-red-400">
                    <strong>Razón:</strong> {content.marketing_rejection_reason}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sphere Phase */}
            {spherePhase && SphereIcon && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Fase Esfera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg",
                    spherePhase.bgColor
                  )}>
                    <SphereIcon className={cn("h-5 w-5", spherePhase.color)} />
                    <div>
                      <span className={cn("font-medium", spherePhase.color)}>{spherePhase.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{spherePhase.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaign Info */}
            {campaign ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Campaña Asignada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{campaign.name}</span>
                    <Badge variant="outline">{campaign.status}</Badge>
                  </div>
                  
                  {(campaign.start_date || campaign.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {campaign.start_date && format(new Date(campaign.start_date), "dd MMM", { locale: es })}
                      {campaign.start_date && campaign.end_date && " - "}
                      {campaign.end_date && format(new Date(campaign.end_date), "dd MMM yyyy", { locale: es })}
                    </div>
                  )}

                  {campaign.budget !== null && campaign.budget > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Presupuesto: </span>
                      <span className="font-medium">${campaign.budget.toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin campaña asignada</p>
                  <p className="text-xs">Asigna este contenido a una campaña desde Marketing</p>
                </CardContent>
              </Card>
            )}

            {/* Strategy Guidelines */}
            {(content.strategist_guidelines || content.trafficker_guidelines) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Directrices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {content.strategist_guidelines && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Estratega:</p>
                      <p className="text-sm">{content.strategist_guidelines}</p>
                    </div>
                  )}
                  {content.trafficker_guidelines && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Trafficker:</p>
                      <p className="text-sm">{content.trafficker_guidelines}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            <Button onClick={handleGoToMarketing} className="w-full gap-2">
              <span>Ir a Marketing</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Selecciona un contenido para ver su información de marketing
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
