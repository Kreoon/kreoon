import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { SALE_TYPE_OPTIONS } from '../LiveStreamingConstants';
import type { StreamingSale, StreamingEvent } from '@/hooks/useLiveStreaming';
import { supabase } from '@/integrations/supabase/client';

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sale: Partial<StreamingSale> & { sale_type: string; amount: number }) => Promise<boolean>;
  editingSale?: StreamingSale | null;
  events: StreamingEvent[];
}

interface Client {
  id: string;
  name: string;
}

export function AddSaleDialog({ open, onOpenChange, onSave, editingSale, events }: AddSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState({
    sale_type: editingSale?.sale_type || 'single_event',
    amount: editingSale?.amount?.toString() || '',
    currency: editingSale?.currency || 'USD',
    description: editingSale?.description || '',
    client_id: editingSale?.client_id || '',
    event_id: editingSale?.event_id || '',
  });

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      setClients(data || []);
    };
    if (open) {
      fetchClients();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sale_type || !formData.amount) return;

    setLoading(true);
    const payload: Partial<StreamingSale> & { sale_type: string; amount: number } = {
      sale_type: formData.sale_type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      description: formData.description || undefined,
      client_id: formData.client_id || undefined,
      event_id: formData.event_id || undefined,
    };

    if (editingSale?.id) {
      payload.id = editingSale.id;
    }

    const success = await onSave(payload);
    setLoading(false);

    if (success) {
      onOpenChange(false);
      setFormData({
        sale_type: 'single_event',
        amount: '',
        currency: 'USD',
        description: '',
        client_id: '',
        event_id: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingSale ? 'Editar Venta' : 'Nueva Venta'}</DialogTitle>
          <DialogDescription>
            Registra una venta del servicio de live streaming
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Venta</Label>
            <Select
              value={formData.sale_type}
              onValueChange={(value) => setFormData({ ...formData, sale_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
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

          {formData.sale_type === 'single_event' && (
            <div className="space-y-2">
              <Label>Evento Asociado (opcional)</Label>
              <Select
                value={formData.event_id}
                onValueChange={(value) => setFormData({ ...formData, event_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin evento asociado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin evento</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles adicionales de la venta"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.amount || !formData.sale_type}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSale ? 'Guardar Cambios' : 'Registrar Venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
