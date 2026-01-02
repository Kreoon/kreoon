import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AddReportDialogProps {
  organizationId: string | null | undefined;
  onSuccess: () => void;
}

interface MarketingClient {
  id: string;
  client: {
    id: string;
    name: string;
  };
}

export function AddReportDialog({ organizationId, onSuccess }: AddReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<MarketingClient[]>([]);

  const [formData, setFormData] = useState({
    marketing_client_id: "",
    title: "",
    report_type: "monthly",
    period_start: "",
    period_end: "",
    highlights: "",
    recommendations: "",
  });

  useEffect(() => {
    if (open && organizationId) {
      fetchClients();
      // Set default dates
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFormData(prev => ({
        ...prev,
        period_start: firstDay.toISOString().split('T')[0],
        period_end: lastDay.toISOString().split('T')[0],
      }));
    }
  }, [open, organizationId]);

  const fetchClients = async () => {
    if (!organizationId) return;
    
    try {
      // @ts-ignore - Supabase types causing deep instantiation
      const { data } = await supabase
        .from('marketing_clients')
        .select('id, client:clients(id, name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (data) {
        setClients(data as MarketingClient[]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async () => {
    if (!organizationId || !formData.marketing_client_id || !formData.title) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      // Fetch metrics for the period from sync logs
      const { data: syncLogs } = await supabase
        .from('traffic_sync_logs')
        .select('investment, leads, sales, clicks, impressions')
        .eq('organization_id', organizationId)
        .gte('sync_date', formData.period_start)
        .lte('sync_date', formData.period_end);

      const metrics = {
        impressions: syncLogs?.reduce((sum, l) => sum + (Number(l.impressions) || 0), 0) || 0,
        clicks: syncLogs?.reduce((sum, l) => sum + (Number(l.clicks) || 0), 0) || 0,
        leads: syncLogs?.reduce((sum, l) => sum + (Number(l.leads) || 0), 0) || 0,
        conversions: syncLogs?.reduce((sum, l) => sum + (Number(l.sales) || 0), 0) || 0,
        spend: syncLogs?.reduce((sum, l) => sum + (Number(l.investment) || 0), 0) || 0,
      };

      const { error } = await supabase
        .from('marketing_reports')
        .insert({
          organization_id: organizationId,
          marketing_client_id: formData.marketing_client_id,
          title: formData.title,
          report_type: formData.report_type,
          period_start: formData.period_start,
          period_end: formData.period_end,
          highlights: formData.highlights ? formData.highlights.split('\n').filter(Boolean) : [],
          recommendations: formData.recommendations,
          metrics,
          status: 'draft',
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Reporte creado exitosamente');
      setOpen(false);
      setFormData({
        marketing_client_id: "",
        title: "",
        report_type: "monthly",
        period_start: "",
        period_end: "",
        highlights: "",
        recommendations: "",
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Error al crear reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Reporte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Crear Nuevo Reporte
          </DialogTitle>
          <DialogDescription>
            Genera un reporte de rendimiento para tu cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.marketing_client_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, marketing_client_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label>Título del Reporte *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Reporte Mensual Enero 2025"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Reporte</Label>
            <Select
              value={formData.report_type}
              onValueChange={(v) => setFormData(prev => ({ ...prev, report_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="campaign">Por Campaña</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
              />
            </div>
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            <Label>Highlights (uno por línea)</Label>
            <Textarea
              value={formData.highlights}
              onChange={(e) => setFormData(prev => ({ ...prev, highlights: e.target.value }))}
              placeholder="Incremento de 25% en leads&#10;Reducción de CPL en 15%&#10;Nueva campaña lanzada"
              rows={3}
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <Label>Recomendaciones</Label>
            <Textarea
              value={formData.recommendations}
              onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
              placeholder="Recomendaciones estratégicas para el próximo periodo..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Reporte'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
