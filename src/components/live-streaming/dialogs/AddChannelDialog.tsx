import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { PLATFORM_OPTIONS, PLATFORM_ICONS } from '../LiveStreamingConstants';
import type { StreamingAccount } from '@/hooks/useLiveStreaming';

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: Partial<StreamingAccount> & { platform_type: string; account_name: string }) => Promise<boolean>;
  editingAccount?: StreamingAccount | null;
}

export function AddChannelDialog({ open, onOpenChange, onSave, editingAccount }: AddChannelDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<{
    platform_type: 'youtube' | 'facebook' | 'instagram' | 'twitch' | 'tiktok' | 'linkedin' | 'custom_rtmp' | '';
    account_name: string;
    account_external_id: string;
  }>({
    platform_type: editingAccount?.platform_type || '',
    account_name: editingAccount?.account_name || '',
    account_external_id: editingAccount?.account_external_id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform_type || !formData.account_name) return;

    setLoading(true);
    const payload: Partial<StreamingAccount> & { platform_type: string; account_name: string } = {
      platform_type: formData.platform_type,
      account_name: formData.account_name,
      account_external_id: formData.account_external_id || undefined,
    };

    if (editingAccount?.id) {
      payload.id = editingAccount.id;
    }

    const success = await onSave(payload);
    setLoading(false);

    if (success) {
      onOpenChange(false);
      setFormData({
        platform_type: '',
        account_name: '',
        account_external_id: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingAccount ? 'Editar Canal' : 'Conectar Canal'}</DialogTitle>
          <DialogDescription>
            {editingAccount 
              ? 'Actualiza la información del canal' 
              : 'Agrega un nuevo canal de streaming'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select
              value={formData.platform_type}
              onValueChange={(value) => setFormData({ ...formData, platform_type: value as typeof formData.platform_type })}
              disabled={!!editingAccount}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una plataforma" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {PLATFORM_ICONS[option.value]}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nombre del Canal</Label>
            <Input
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="Ej: Mi Canal de YouTube"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>ID Externo (opcional)</Label>
            <Input
              value={formData.account_external_id}
              onChange={(e) => setFormData({ ...formData, account_external_id: e.target.value })}
              placeholder="ID del canal en la plataforma"
            />
            <p className="text-xs text-muted-foreground">
              Este campo se llena automáticamente al conectar vía OAuth
            </p>
          </div>

          {/* OAuth buttons - placeholder for future implementation */}
          {!editingAccount && formData.platform_type && formData.platform_type !== 'custom_rtmp' && (
            <div className="p-4 rounded-lg border border-dashed bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Conexión OAuth disponible próximamente
              </p>
              <Button type="button" variant="outline" size="sm" disabled>
                Conectar con {PLATFORM_OPTIONS.find(p => p.value === formData.platform_type)?.label}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.platform_type || !formData.account_name}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAccount ? 'Guardar Cambios' : 'Agregar Canal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
