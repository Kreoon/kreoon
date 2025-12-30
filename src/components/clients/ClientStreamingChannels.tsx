import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type StreamingPlatform = Database['public']['Enums']['streaming_platform'];
type StreamingProvider = Database['public']['Enums']['streaming_provider'];
import { Plus, Trash2, Youtube, Twitch, Radio, Loader2, Facebook, Instagram, Twitter } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StreamingChannel {
  id: string;
  platform_type: string;
  account_name: string;
  account_external_id: string | null;
  status: string | null;
}

interface ClientStreamingChannelsProps {
  clientId: string;
  clientName: string;
}

const PLATFORM_CONFIG: Record<string, { icon: typeof Youtube; color: string; label: string }> = {
  youtube: { icon: Youtube, color: 'text-red-500', label: 'YouTube' },
  facebook: { icon: Facebook, color: 'text-blue-600', label: 'Facebook' },
  instagram: { icon: Instagram, color: 'text-pink-500', label: 'Instagram' },
  tiktok: { icon: Radio, color: 'text-foreground', label: 'TikTok' },
  twitch: { icon: Twitch, color: 'text-purple-500', label: 'Twitch' },
  linkedin: { icon: Radio, color: 'text-blue-700', label: 'LinkedIn' },
  twitter: { icon: Twitter, color: 'text-sky-500', label: 'X (Twitter)' },
  custom_rtmp: { icon: Radio, color: 'text-orange-500', label: 'RTMP' },
};

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook Live' },
  { value: 'instagram', label: 'Instagram Live' },
  { value: 'tiktok', label: 'TikTok Live' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'linkedin', label: 'LinkedIn Live' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'custom_rtmp', label: 'RTMP Personalizado' },
];

export function ClientStreamingChannels({ clientId, clientName }: ClientStreamingChannelsProps) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<StreamingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    platform_type: '',
    account_name: '',
    account_external_id: '',
  });

  const fetchChannels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('streaming_accounts')
      .select('id, platform_type, account_name, account_external_id, status')
      .eq('owner_type', 'client')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChannels();
  }, [clientId]);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform_type || !formData.account_name) return;

    setSaving(true);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) {
      toast({ title: 'Error', description: 'Usuario no autenticado', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Get organization ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', userId)
      .single();

    const organizationId = profile?.current_organization_id;

    const insertData: Database['public']['Tables']['streaming_accounts']['Insert'] = {
      owner_type: 'client',
      owner_id: clientId,
      client_id: clientId,
      platform_type: formData.platform_type as StreamingPlatform,
      provider: 'custom_rtmp' as StreamingProvider,
      account_name: formData.account_name,
      account_external_id: formData.account_external_id || null,
      status: 'active',
      connected_by: userId,
    };

    const { error } = await supabase.from('streaming_accounts').insert(insertData);

    if (error) {
      console.error('Error adding channel:', error);
      toast({ title: 'Error', description: 'No se pudo agregar el canal', variant: 'destructive' });
    } else {
      toast({ title: 'Canal agregado', description: `${formData.account_name} fue agregado correctamente` });
      fetchChannels();
      setShowAddDialog(false);
      setFormData({ platform_type: '', account_name: '', account_external_id: '' });
    }
    setSaving(false);
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    const { error } = await supabase
      .from('streaming_accounts')
      .delete()
      .eq('id', channelToDelete);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el canal', variant: 'destructive' });
    } else {
      toast({ title: 'Canal eliminado' });
      fetchChannels();
    }
    setChannelToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Canales de Streaming</h3>
          <p className="text-sm text-muted-foreground">
            Configura los canales donde {clientName} puede transmitir
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Canal
        </Button>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay canales configurados</p>
            <p className="text-sm">Agrega un canal de YouTube, Twitch o RTMP personalizado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {channels.map((channel) => {
            const config = PLATFORM_CONFIG[channel.platform_type] || PLATFORM_CONFIG.custom_rtmp;
            const IconComponent = config.icon;

            return (
              <Card key={channel.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <p className="font-medium">{channel.account_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {channel.account_external_id && (
                          <span className="text-xs text-muted-foreground">
                            ID: {channel.account_external_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setChannelToDelete(channel.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Channel Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Canal</DialogTitle>
            <DialogDescription>
              Conecta un nuevo canal de streaming para {clientName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddChannel} className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={formData.platform_type}
                onValueChange={(value) => setFormData({ ...formData, platform_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving || !formData.platform_type || !formData.account_name}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agregar Canal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!channelToDelete} onOpenChange={() => setChannelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El canal será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChannel}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
