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
import { PLATFORMS, CONTENT_TYPES, MarketingClient, MarketingCampaign, SPHERE_PHASES, SpherePhase } from "./types";
import { useAuth } from "@/hooks/useAuth";

interface AddCalendarItemDialogProps {
  organizationId: string | null | undefined;
  onSuccess: () => void;
  defaultDate?: string;
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-4 w-4" />,
  solution: <Lightbulb className="h-4 w-4" />,
  remarketing: <RefreshCw className="h-4 w-4" />,
  fidelize: <Heart className="h-4 w-4" />,
};

export function AddCalendarItemDialog({ organizationId, onSuccess, defaultDate }: AddCalendarItemDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<MarketingClient[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  
  const [formData, setFormData] = useState({
    marketing_client_id: "",
    campaign_id: "",
    title: "",
    description: "",
    content_type: "post",
    platform: "instagram",
    sphere_phase: "engage" as SpherePhase,
    scheduled_date: defaultDate || "",
    scheduled_time: "",
    copy_text: "",
    hashtags: "",
  });

  useEffect(() => {
    if (open && organizationId) {
      fetchClients();
    }
  }, [open, organizationId]);

  useEffect(() => {
    if (formData.marketing_client_id) {
      fetchCampaigns();
    }
  }, [formData.marketing_client_id]);

  const fetchClients = async () => {
    if (!organizationId) return;

    const { data, error } = await supabase
      .from('marketing_clients')
      .select(`
        *,
        client:clients(id, name, logo_url)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (!error && data) {
      setClients(data as unknown as MarketingClient[]);
    }
  };

  const fetchCampaigns = async () => {
    if (!organizationId || !formData.marketing_client_id) return;

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('marketing_client_id', formData.marketing_client_id)
      .in('status', ['planning', 'active']);

    if (!error && data) {
      setCampaigns(data as unknown as MarketingCampaign[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user) return;

    if (!formData.marketing_client_id || !formData.title || !formData.scheduled_date) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('marketing_content_calendar')
        .insert({
          organization_id: organizationId,
          marketing_client_id: formData.marketing_client_id,
          campaign_id: formData.campaign_id || null,
          title: formData.title,
          description: formData.description || null,
          content_type: formData.content_type,
          platform: formData.platform,
          sphere_phase: formData.sphere_phase,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time || null,
          status: 'planned',
          copy_text: formData.copy_text || null,
          hashtags: formData.hashtags ? formData.hashtags.split(' ').filter(h => h.startsWith('#')) : [],
          media_urls: [],
          performance: {},
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Contenido agregado al calendario');
      setOpen(false);
      setFormData({
        marketing_client_id: "",
        campaign_id: "",
        title: "",
        description: "",
        content_type: "post",
        platform: "instagram",
        sphere_phase: "engage",
        scheduled_date: defaultDate || "",
        scheduled_time: "",
        copy_text: "",
        hashtags: "",
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating calendar item:', error);
      toast.error('Error al agregar contenido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Contenido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Contenido</DialogTitle>
          <DialogDescription>
            Agenda contenido en el calendario de marketing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select
                value={formData.marketing_client_id}
                onValueChange={(value) => setFormData({ ...formData, marketing_client_id: value, campaign_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
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
              <Label htmlFor="campaign">Campaña (opcional)</Label>
              <Select
                value={formData.campaign_id}
                onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
                disabled={!formData.marketing_client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguna</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Promo de Año Nuevo"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="content_type">Tipo</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Plataforma</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData({ ...formData, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
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
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copy">Texto / Copy</Label>
            <Textarea
              id="copy"
              value={formData.copy_text}
              onChange={(e) => setFormData({ ...formData, copy_text: e.target.value })}
              placeholder="El texto que acompañará la publicación"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              value={formData.hashtags}
              onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
              placeholder="#marketing #promo #oferta"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}