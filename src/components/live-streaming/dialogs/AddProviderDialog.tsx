import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { PROVIDER_OPTIONS } from '../LiveStreamingConstants';
import type { StreamingProvider } from '@/hooks/useLiveStreaming';

interface AddProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (provider: Partial<StreamingProvider> & { provider: string }) => Promise<boolean>;
  editingProvider?: StreamingProvider | null;
}

export function AddProviderDialog({ open, onOpenChange, onSave, editingProvider }: AddProviderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  
  const [formData, setFormData] = useState<{
    provider: 'restream' | 'watchity' | 'custom_rtmp' | '';
    is_enabled: boolean;
    mode: string;
    api_key_encrypted: string;
    client_id: string;
    client_secret_encrypted: string;
    webhook_url: string;
  }>({
    provider: editingProvider?.provider || '',
    is_enabled: editingProvider?.is_enabled ?? true,
    mode: editingProvider?.mode || 'test',
    api_key_encrypted: '',
    client_id: editingProvider?.client_id || '',
    client_secret_encrypted: '',
    webhook_url: editingProvider?.webhook_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider) return;

    setLoading(true);
    const payload: Partial<StreamingProvider> & { provider: string } = {
      provider: formData.provider,
      is_enabled: formData.is_enabled,
      mode: formData.mode,
      client_id: formData.client_id || null,
      webhook_url: formData.webhook_url || null,
    };

    // Only include encrypted fields if they were changed
    if (formData.api_key_encrypted) {
      payload.api_key_encrypted = formData.api_key_encrypted;
    }
    if (formData.client_secret_encrypted) {
      payload.client_secret_encrypted = formData.client_secret_encrypted;
    }

    if (editingProvider?.id) {
      payload.id = editingProvider.id;
    }

    const success = await onSave(payload);
    setLoading(false);

    if (success) {
      onOpenChange(false);
      setFormData({
        provider: '',
        is_enabled: true,
        mode: 'test',
        api_key_encrypted: '',
        client_id: '',
        client_secret_encrypted: '',
        webhook_url: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingProvider ? 'Editar Proveedor' : 'Agregar Proveedor'}</DialogTitle>
          <DialogDescription>
            Configura las credenciales del proveedor de streaming
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData({ ...formData, provider: value })}
              disabled={!!editingProvider}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Modo</Label>
              <p className="text-xs text-muted-foreground">Test o Producción</p>
            </div>
            <Select
              value={formData.mode}
              onValueChange={(value) => setFormData({ ...formData, mode: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="production">Producción</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitado</Label>
              <p className="text-xs text-muted-foreground">Activar este proveedor</p>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={formData.api_key_encrypted}
                onChange={(e) => setFormData({ ...formData, api_key_encrypted: e.target.value })}
                placeholder={editingProvider?.api_key_encrypted ? '••••••••' : 'Ingresa la API Key'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              placeholder="Client ID (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label>Client Secret</Label>
            <div className="relative">
              <Input
                type={showClientSecret ? 'text' : 'password'}
                value={formData.client_secret_encrypted}
                onChange={(e) => setFormData({ ...formData, client_secret_encrypted: e.target.value })}
                placeholder={editingProvider?.client_secret_encrypted ? '••••••••' : 'Client Secret (opcional)'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowClientSecret(!showClientSecret)}
              >
                {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.provider}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProvider ? 'Guardar Cambios' : 'Agregar Proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
