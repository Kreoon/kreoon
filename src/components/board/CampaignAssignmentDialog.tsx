import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Zap, Lightbulb, RefreshCw, Heart, Target, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Content, ContentStatus } from "@/types/database";
import { SPHERE_PHASES, SpherePhase } from "@/components/marketing/types";

interface CampaignAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: Content | null;
  organizationId: string | null;
  onSuccess: () => void;
}

interface Campaign {
  id: string;
  name: string;
  marketing_client_id: string | null;
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-3 w-3" />,
  solution: <Lightbulb className="h-3 w-3" />,
  remarketing: <RefreshCw className="h-3 w-3" />,
  fidelize: <Heart className="h-3 w-3" />,
};

export function CampaignAssignmentDialog({
  open,
  onOpenChange,
  content,
  organizationId,
  onSuccess,
}: CampaignAssignmentDialogProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    campaign_id: "",
    sphere_phase: "" as SpherePhase | "",
    strategist_guidelines: "",
    trafficker_guidelines: "",
  });

  // Fetch campaigns when dialog opens
  useEffect(() => {
    if (open && organizationId && content?.client_id) {
      fetchCampaigns();
    }
  }, [open, organizationId, content?.client_id]);

  // Reset form when content changes
  useEffect(() => {
    if (content) {
      setFormData({
        campaign_id: "",
        sphere_phase: (content.sphere_phase as SpherePhase) || "",
        strategist_guidelines: content.strategist_guidelines || "",
        trafficker_guidelines: content.trafficker_guidelines || "",
      });
    }
  }, [content]);

  const fetchCampaigns = async () => {
    if (!organizationId || !content?.client_id) return;
    
    setLoading(true);
    try {
      // First get the marketing_client_id for this client
      const { data: mcData } = await supabase
        .from('marketing_clients')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('client_id', content.client_id)
        .single();

      let query = supabase
        .from('marketing_campaigns')
        .select('id, name, marketing_client_id')
        .eq('organization_id', organizationId)
        .in('status', ['planning', 'active'])
        .order('name');

      // Filter by client's marketing_client_id if available
      if (mcData?.id) {
        query = query.eq('marketing_client_id', mcData.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Error al cargar campañas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content || !formData.campaign_id) {
      toast.error('Selecciona una campaña');
      return;
    }

    setSaving(true);
    try {
      // Get the 'en_campaa' status id for the organization
      const { data: statusData } = await supabase
        .from('organization_statuses')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status_key', 'en_campaa')
        .single();

      const updateData: Record<string, unknown> = {
        marketing_campaign_id: formData.campaign_id,
        sphere_phase: formData.sphere_phase || null,
        strategist_guidelines: formData.strategist_guidelines || null,
        trafficker_guidelines: formData.trafficker_guidelines || null,
        strategy_status: 'en_campaña',
        status: 'en_campaa' as ContentStatus,
      };

      // If the status exists, also update the custom_status_id for Kanban sync
      if (statusData?.id) {
        updateData.custom_status_id = statusData.id;
      }

      const { error } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', content.id);

      if (error) throw error;

      toast.success('Contenido asignado a campaña');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error assigning content:', error);
      toast.error('Error al asignar contenido');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Asignar a Campaña
          </DialogTitle>
          <DialogDescription>
            Configura el contenido "{content?.title}" para usarlo en una campaña de marketing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Select */}
          <div className="space-y-2">
            <Label>Campaña de Destino *</Label>
            {loading ? (
              <div className="flex items-center gap-2 p-3 border rounded-md text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando campañas...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-3 border rounded-md text-muted-foreground text-sm">
                No hay campañas activas para este cliente. Crea una campaña primero en el módulo de Marketing.
              </div>
            ) : (
              <Select 
                value={formData.campaign_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, campaign_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una campaña" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sphere Phase */}
          <div className="space-y-2">
            <Label>Fase Esfera</Label>
            <Select 
              value={formData.sphere_phase} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, sphere_phase: v as SpherePhase }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Asignar fase del Método Esfera" />
              </SelectTrigger>
              <SelectContent>
                {SPHERE_PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>
                    <span className="flex items-center gap-2">
                      {SPHERE_ICONS[phase.value]}
                      {phase.label} - {phase.objective}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strategist Guidelines */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              Indicaciones para Estratega
            </Label>
            <Textarea
              value={formData.strategist_guidelines}
              onChange={(e) => setFormData(prev => ({ ...prev, strategist_guidelines: e.target.value }))}
              placeholder="Ángulo de venta, emoción principal, objetivo estratégico..."
              rows={3}
            />
          </div>

          {/* Trafficker Guidelines */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              Indicaciones para Trafficker
            </Label>
            <Textarea
              value={formData.trafficker_guidelines}
              onChange={(e) => setFormData(prev => ({ ...prev, trafficker_guidelines: e.target.value }))}
              placeholder="Audiencia target, presupuesto sugerido, objetivos de campaña..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving || !formData.campaign_id}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Asignar a Campaña
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
