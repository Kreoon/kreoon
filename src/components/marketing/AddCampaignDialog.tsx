import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Zap, Lightbulb, RefreshCw, Heart } from "lucide-react";
import { toast } from "sonner";
import { CAMPAIGN_TYPES, PLATFORMS, MarketingClient, SPHERE_PHASES, SpherePhase } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { ContentSelector } from "./ContentSelector";

interface AddCampaignDialogProps {
  organizationId: string | null | undefined;
  onSuccess: () => void;
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-4 w-4" />,
  solution: <Lightbulb className="h-4 w-4" />,
  remarketing: <RefreshCw className="h-4 w-4" />,
  fidelize: <Heart className="h-4 w-4" />,
};

export function AddCampaignDialog({ organizationId, onSuccess }: AddCampaignDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<MarketingClient[]>([]);
  
  const [formData, setFormData] = useState({
    marketing_client_id: "",
    name: "",
    description: "",
    campaign_type: "awareness",
    sphere_phase: "engage" as SpherePhase,
    budget: "",
    currency: "COP",
    start_date: "",
    end_date: "",
    platforms: [] as string[],
    content_ids: [] as string[],
  });

  useEffect(() => {
    if (open && organizationId) {
      fetchClients();
    }
  }, [open, organizationId]);

  const fetchClients = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('marketing_clients')
        .select(`
          *,
          client:clients(id, name, logo_url)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }
      
      if (data) {
        setClients(data as unknown as MarketingClient[]);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user) return;

    if (!formData.marketing_client_id || !formData.name) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          organization_id: organizationId,
          marketing_client_id: formData.marketing_client_id,
          name: formData.name,
          description: formData.description || null,
          campaign_type: formData.campaign_type,
          sphere_phase: formData.sphere_phase,
          status: 'planning',
          budget: parseFloat(formData.budget) || 0,
          spent: 0,
          currency: formData.currency,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          platforms: formData.platforms,
          content_ids: formData.content_ids,
          objectives: [],
          metrics: {},
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Campaña creada');
      setOpen(false);
      setFormData({
        marketing_client_id: "",
        name: "",
        description: "",
        campaign_type: "awareness",
        sphere_phase: "engage",
        budget: "",
        currency: "COP",
        start_date: "",
        end_date: "",
        platforms: [],
        content_ids: [],
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Error al crear campaña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Campaña
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Campaña</DialogTitle>
          <DialogDescription>
            Crea una campaña para gestionar publicidad
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select
              value={formData.marketing_client_id}
              onValueChange={(value) => setFormData({ ...formData, marketing_client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((mc) => (
                  <SelectItem key={mc.id} value={mc.id}>
                    {mc.client?.name || 'Cliente'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre de campaña *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Black Friday 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Objetivos y detalles de la campaña"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de campaña</Label>
              <Select
                value={formData.campaign_type}
                onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sphere">Fase Esfera *</Label>
              <Select
                value={formData.sphere_phase}
                onValueChange={(value) => setFormData({ ...formData, sphere_phase: value as SpherePhase })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPHERE_PHASES.map((phase) => (
                    <SelectItem key={phase.value} value={phase.value}>
                      <span className="flex items-center gap-2">
                        {SPHERE_ICONS[phase.value]}
                        {phase.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Presupuesto</Label>
              <div className="flex gap-2">
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0"
                  className="flex-1"
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Fecha inicio</Label>
              <Input
                id="start"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">Fecha fin</Label>
            <Input
              id="end"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Plataformas</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <Button
                  key={platform.value}
                  type="button"
                  variant={formData.platforms.includes(platform.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlatform(platform.value)}
                >
                  {platform.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content Selector */}
          <div className="space-y-2">
            <Label>Contenido Aprobado (opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Vincula contenido ya aprobado para usar en esta campaña
            </p>
            <ContentSelector
              organizationId={organizationId}
              clientId={clients.find(c => c.id === formData.marketing_client_id)?.client_id}
              selectedContentIds={formData.content_ids}
              onSelectionChange={(ids) => setFormData({ ...formData, content_ids: ids })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Campaña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}