import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, Radio, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ClientServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

interface ClientServices {
  strategy_service_enabled: boolean;
  traffic_service_enabled: boolean;
  strategy_service_started_at: string | null;
  traffic_service_started_at: string | null;
}

export function ClientServicesDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: ClientServicesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ClientServices>({
    strategy_service_enabled: false,
    traffic_service_enabled: false,
    strategy_service_started_at: null,
    traffic_service_started_at: null,
  });

  useEffect(() => {
    if (open && clientId) {
      fetchServices();
    }
  }, [open, clientId]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('strategy_service_enabled, traffic_service_enabled, strategy_service_started_at, traffic_service_started_at')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      if (data) {
        setServices({
          strategy_service_enabled: data.strategy_service_enabled || false,
          traffic_service_enabled: data.traffic_service_enabled || false,
          strategy_service_started_at: data.strategy_service_started_at,
          traffic_service_started_at: data.traffic_service_started_at,
        });
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      const updateData: Partial<ClientServices> = {
        strategy_service_enabled: services.strategy_service_enabled,
        traffic_service_enabled: services.traffic_service_enabled,
      };

      // Set start dates when enabling services
      if (services.strategy_service_enabled && !services.strategy_service_started_at) {
        (updateData as any).strategy_service_started_at = now;
      }
      if (services.traffic_service_enabled && !services.traffic_service_started_at) {
        (updateData as any).traffic_service_started_at = now;
      }

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Servicios actualizados');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating services:', error);
      toast.error('Error al actualizar servicios');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "d 'de' MMM, yyyy", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Servicios</DialogTitle>
          <DialogDescription>
            Activa los servicios de marketing para <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Strategy Service */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-sm border bg-card">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-sm bg-orange-500/10">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="strategy-service" className="text-base font-medium">
                    Servicio de Estrategia
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Planificación de contenido, guiones y estrategia de marca
                  </p>
                  {services.strategy_service_started_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      Activo desde {formatDate(services.strategy_service_started_at)}
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="strategy-service"
                checked={services.strategy_service_enabled}
                onCheckedChange={(checked) =>
                  setServices({ ...services, strategy_service_enabled: checked })
                }
              />
            </div>

            {/* Traffic Service */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-sm border bg-card">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-sm bg-cyan-500/10">
                  <Radio className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="traffic-service" className="text-base font-medium">
                    Servicio de Tráfico
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gestión de campañas publicitarias y pauta digital
                  </p>
                  {services.traffic_service_started_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      Activo desde {formatDate(services.traffic_service_started_at)}
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="traffic-service"
                checked={services.traffic_service_enabled}
                onCheckedChange={(checked) =>
                  setServices({ ...services, traffic_service_enabled: checked })
                }
              />
            </div>

            {/* Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              {services.strategy_service_enabled && (
                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Estrategia
                </Badge>
              )}
              {services.traffic_service_enabled && (
                <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                  <Radio className="h-3 w-3 mr-1" />
                  Tráfico
                </Badge>
              )}
              {!services.strategy_service_enabled && !services.traffic_service_enabled && (
                <span className="text-sm text-muted-foreground">Sin servicios activos</span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
