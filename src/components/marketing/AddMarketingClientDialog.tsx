import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SERVICE_TYPES, PLATFORMS } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AddMarketingClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null | undefined;
  onSuccess: () => void;
}

interface Client {
  id: string;
  name: string;
}

interface Strategist {
  id: string;
  full_name: string;
}

export function AddMarketingClientDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: AddMarketingClientDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [strategists, setStrategists] = useState<Strategist[]>([]);
  
  const [formData, setFormData] = useState({
    client_id: '',
    strategist_id: '',
    service_type: 'full_service',
    monthly_budget: '',
    budget_currency: 'COP',
    platforms: [] as string[],
    notes: '',
  });

  useEffect(() => {
    if (open && organizationId) {
      fetchClients();
      fetchStrategists();
    }
  }, [open, organizationId]);

  const fetchClients = async () => {
    if (!organizationId) return;
    
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name');
    
    setClients(data || []);
  };

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
    
    if (!formData.client_id) {
      toast.error('Selecciona un cliente');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('marketing_clients')
        .insert({
          organization_id: organizationId,
          client_id: formData.client_id,
          strategist_id: formData.strategist_id || null,
          service_type: formData.service_type,
          monthly_budget: parseFloat(formData.monthly_budget) || 0,
          budget_currency: formData.budget_currency,
          platforms: formData.platforms,
          notes: formData.notes || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Cliente de marketing agregado');
      onSuccess();
      onOpenChange(false);
      setFormData({
        client_id: '',
        strategist_id: '',
        service_type: 'full_service',
        monthly_budget: '',
        budget_currency: 'COP',
        platforms: [],
        notes: '',
      });
    } catch (error: any) {
      console.error('Error adding marketing client:', error);
      if (error.code === '23505') {
        toast.error('Este cliente ya está en el módulo de marketing');
      } else {
        toast.error('Error al agregar cliente');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Cliente de Marketing</DialogTitle>
          <DialogDescription>
            Selecciona un cliente existente para gestionar su marketing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    id={platform.value}
                    checked={formData.platforms.includes(platform.value)}
                    onCheckedChange={() => handlePlatformToggle(platform.value)}
                  />
                  <label
                    htmlFor={platform.value}
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
              Agregar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
