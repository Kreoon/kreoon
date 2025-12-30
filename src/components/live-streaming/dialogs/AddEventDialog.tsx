import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles } from 'lucide-react';
import { EVENT_TYPE_OPTIONS, PLATFORM_ICONS } from '../LiveStreamingConstants';
import type { StreamingEvent, StreamingAccount } from '@/hooks/useLiveStreaming';
import { supabase } from '@/integrations/supabase/client';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Partial<StreamingEvent> & { title: string }) => Promise<boolean>;
  editingEvent?: StreamingEvent | null;
  accounts: StreamingAccount[];
}

interface Client {
  id: string;
  name: string;
}

export function AddEventDialog({ open, onOpenChange, onSave, editingEvent, accounts }: AddEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    event_type: 'informative' | 'shopping' | 'webinar' | 'interview';
    scheduled_at: string;
    is_shopping_enabled: boolean;
    client_id: string;
    target_accounts: string[];
  }>({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    event_type: editingEvent?.event_type || 'informative',
    scheduled_at: editingEvent?.scheduled_at ? new Date(editingEvent.scheduled_at).toISOString().slice(0, 16) : '',
    is_shopping_enabled: editingEvent?.is_shopping_enabled || false,
    client_id: editingEvent?.client_id || '',
    target_accounts: editingEvent?.target_accounts || [],
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
    if (!formData.title) return;

    setLoading(true);
    const payload: Partial<StreamingEvent> & { title: string } = {
      title: formData.title,
      description: formData.description || undefined,
      event_type: formData.event_type,
      scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : undefined,
      is_shopping_enabled: formData.is_shopping_enabled,
      client_id: formData.client_id || undefined,
      target_accounts: formData.target_accounts.length > 0 ? formData.target_accounts : undefined,
    };

    if (editingEvent?.id) {
      payload.id = editingEvent.id;
    }

    const success = await onSave(payload);
    setLoading(false);

    if (success) {
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'informative',
        scheduled_at: '',
        is_shopping_enabled: false,
        client_id: '',
        target_accounts: [],
      });
    }
  };

  const toggleAccount = (accountId: string) => {
    setFormData(prev => ({
      ...prev,
      target_accounts: prev.target_accounts.includes(accountId)
        ? prev.target_accounts.filter(id => id !== accountId)
        : [...prev.target_accounts, accountId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingEvent ? 'Editar Evento' : 'Crear Evento Live'}</DialogTitle>
          <DialogDescription>
            Configura los detalles del evento de streaming
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Título del Evento</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled>
                <Sparkles className="h-3 w-3" />
                Generar con IA
              </Button>
            </div>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nombre del evento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del evento (opcional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value as typeof formData.event_type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha y Hora</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin cliente asociado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin cliente</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Canales de Destino</Label>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay canales conectados. Conecta un canal primero.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {accounts.filter(a => a.status === 'connected').map((account) => (
                  <Button
                    key={account.id}
                    type="button"
                    variant={formData.target_accounts.includes(account.id) ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => toggleAccount(account.id)}
                  >
                    {PLATFORM_ICONS[account.platform_type]}
                    <span className="truncate">{account.account_name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label>Live Shopping</Label>
              <p className="text-xs text-muted-foreground">Habilitar productos en el live</p>
            </div>
            <Switch
              checked={formData.is_shopping_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, is_shopping_enabled: checked })}
            />
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.title}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEvent ? 'Guardar Cambios' : 'Crear Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
