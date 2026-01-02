import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface DashboardConfigDialogProps {
  organizationId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DashboardConfig {
  id?: string;
  main_objective_type: string;
  main_objective_value: number;
  main_objective_period: string;
  monthly_investment: number;
  currency: string;
  estimated_roi: number;
}

export function DashboardConfigDialog({ 
  organizationId, 
  open, 
  onOpenChange, 
  onSuccess 
}: DashboardConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>({
    main_objective_type: 'sales',
    main_objective_value: 0,
    main_objective_period: 'monthly',
    monthly_investment: 0,
    currency: 'COP',
    estimated_roi: 0,
  });

  useEffect(() => {
    if (open && organizationId) {
      fetchConfig();
    }
  }, [open, organizationId]);

  const fetchConfig = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('marketing_dashboard_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          main_objective_type: data.main_objective_type || 'sales',
          main_objective_value: data.main_objective_value || 0,
          main_objective_period: data.main_objective_period || 'monthly',
          monthly_investment: data.monthly_investment || 0,
          currency: data.currency || 'COP',
          estimated_roi: data.estimated_roi || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);

    try {
      if (config.id) {
        const { error } = await supabase
          .from('marketing_dashboard_config')
          .update({
            main_objective_type: config.main_objective_type,
            main_objective_value: config.main_objective_value,
            main_objective_period: config.main_objective_period,
            monthly_investment: config.monthly_investment,
            currency: config.currency,
            estimated_roi: config.estimated_roi,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_dashboard_config')
          .insert({
            organization_id: organizationId,
            main_objective_type: config.main_objective_type,
            main_objective_value: config.main_objective_value,
            main_objective_period: config.main_objective_period,
            monthly_investment: config.monthly_investment,
            currency: config.currency,
            estimated_roi: config.estimated_roi,
          });

        if (error) throw error;
      }

      toast.success('Configuración guardada');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurar Dashboard
          </DialogTitle>
          <DialogDescription>
            Define los objetivos y presupuestos de marketing
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Objetivo Principal */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Objetivo Principal</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select
                    value={config.main_objective_type}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, main_objective_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engage">Enganchar (CTR/Atención)</SelectItem>
                      <SelectItem value="solution">Solución (Leads)</SelectItem>
                      <SelectItem value="remarketing">Remarketing (Conversión)</SelectItem>
                      <SelectItem value="fidelize">Fidelizar (LTV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Periodo</Label>
                  <Select
                    value={config.main_objective_period}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, main_objective_period: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Meta</Label>
                <Input
                  type="number"
                  value={config.main_objective_value}
                  onChange={(e) => setConfig(prev => ({ ...prev, main_objective_value: Number(e.target.value) }))}
                  placeholder="Ej: 100"
                />
              </div>
            </div>

            {/* Presupuesto */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Presupuesto Mensual</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={config.monthly_investment}
                  onChange={(e) => setConfig(prev => ({ ...prev, monthly_investment: Number(e.target.value) }))}
                  placeholder="0"
                  className="flex-1"
                />
                <Select
                  value={config.currency}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROI Estimado */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ROI Esperado (x)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.estimated_roi}
                onChange={(e) => setConfig(prev => ({ ...prev, estimated_roi: Number(e.target.value) }))}
                placeholder="Ej: 3.5"
              />
              <p className="text-xs text-muted-foreground">
                Retorno esperado por cada peso invertido
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
