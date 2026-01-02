import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SERVICE_TYPES, PLATFORMS, MarketingClient } from "./types";
import { Loader2 } from "lucide-react";

interface EditMarketingClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: MarketingClient | null;
  organizationId: string | null | undefined;
  onSuccess: () => void;
}

interface Strategist {
  id: string;
  full_name: string;
}

export function EditMarketingClientDialog({
  open,
  onOpenChange,
  client,
  organizationId,
  onSuccess,
}: EditMarketingClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [strategists, setStrategists] = useState<Strategist[]>([]);
  
  const [formData, setFormData] = useState({
    strategist_id: '',
    service_type: 'full_service',
    monthly_budget: '',
    budget_currency: 'COP',
    platforms: [] as string[],
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (open && client) {
      setFormData({
        strategist_id: client.strategist_id || '',
        service_type: client.service_type || 'full_service',
        monthly_budget: client.monthly_budget?.toString() || '',
        budget_currency: client.budget_currency || 'COP',
        platforms: client.platforms || [],
        notes: client.notes || '',
        is_active: client.is_active ?? true,
      });
      fetchStrategists();
    }
  }, [open, client]);

  const fetchStrategists = async () => {
    if (!organizationId) return;
    
    const { data } = await supabase
      .from('organization_members')
      .select('user_id, profiles:user_id(id, full_name)')
      .eq('organization_id', organizationId)
      .in('role', ['admin', 'strategist']);
    
    const strategistList = data?.map(d => ({
      id: (d.profiles as any)?.id,
      full_name: (d.profiles as any)?.full_name || 'Sin nombre',
    })).filter(s => s.id) || [];
    
    setStrategists(strategistList);
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('marketing_clients')
        .update({
          strategist_id: formData.strategist_id || null,
          service_type: formData.service_type,
          monthly_budget: parseFloat(formData.monthly_budget) || 0,
          budget_currency: formData.budget_currency,
          platforms: formData.platforms,
          notes: formData.notes || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      if (error) throw error;

      toast.success('Cliente actualizado');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating marketing client:', error);
      toast.error('Error al actualizar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Cliente de Marketing</DialogTitle>
          <DialogDescription>
            {client.client?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Active Status */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Estado del Cliente</Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_active ? 'Cliente activo en el módulo' : 'Cliente pausado'}
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>Tipo de Servicio</Label>
            <Select
              value={formData.service_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strategist */}
          <div className="space-y-2">
            <Label>Estratega Asignado</Label>
            <Select
              value={formData.strategist_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, strategist_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estratega" />
              </SelectTrigger>
              <SelectContent>
                {strategists.map((strategist) => (
                  <SelectItem key={strategist.id} value={strategist.id}>
                    {strategist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Presupuesto Mensual</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.monthly_budget}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_budget: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={formData.budget_currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, budget_currency: value }))}
              >
                <SelectTrigger>
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

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Plataformas</Label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((platform) => (
                <div key={platform.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${platform.value}`}
                    checked={formData.platforms.includes(platform.value)}
                    onCheckedChange={() => handlePlatformToggle(platform.value)}
                  />
                  <label
                    htmlFor={`edit-${platform.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {platform.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Notas adicionales sobre el cliente..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
