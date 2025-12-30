import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Clock, Plus, Calendar, ChevronDown, ChevronRight, Link2, Trash2, Youtube, Tv } from 'lucide-react';
import { ClientWithWallet, LivePackage } from '@/hooks/useKreoonLive';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreamingAccountClient {
  id: string;
  platform_type: string;
  account_name: string;
  status: string;
  created_at: string;
}

interface KreoonClientsTabProps {
  clients: ClientWithWallet[];
  packages: LivePackage[];
  onToggleClientLive: (clientId: string, enabled: boolean) => Promise<void>;
  onAssignHours: (clientId: string, hours: number, packageId?: string, expiresAt?: string) => Promise<void>;
}

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; color: string; name: string }> = {
  youtube: { icon: Youtube, color: 'text-red-500', name: 'YouTube' },
  twitch: { icon: Tv, color: 'text-purple-500', name: 'Twitch' },
  facebook: { icon: Tv, color: 'text-blue-600', name: 'Facebook' },
  instagram: { icon: Tv, color: 'text-pink-500', name: 'Instagram' },
  tiktok: { icon: Tv, color: 'text-foreground', name: 'TikTok' },
  linkedin: { icon: Tv, color: 'text-blue-700', name: 'LinkedIn' },
  custom_rtmp: { icon: Link2, color: 'text-gray-500', name: 'RTMP Personalizado' },
};

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'facebook', label: 'Facebook Live' },
  { value: 'instagram', label: 'Instagram Live' },
  { value: 'tiktok', label: 'TikTok Live' },
  { value: 'linkedin', label: 'LinkedIn Live' },
  { value: 'custom_rtmp', label: 'RTMP Personalizado' },
];

export function KreoonClientsTab({ 
  clients, 
  packages, 
  onToggleClientLive, 
  onAssignHours 
}: KreoonClientsTabProps) {
  const { toast } = useToast();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithWallet | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientChannels, setClientChannels] = useState<Record<string, StreamingAccountClient[]>>({});
  const [loadingChannels, setLoadingChannels] = useState<Set<string>>(new Set());
  
  const [assignForm, setAssignForm] = useState({
    packageId: '',
    customHours: 0,
    usePackage: true,
  });

  const [channelForm, setChannelForm] = useState({
    platform_type: 'youtube',
    account_name: '',
  });

  const toggleExpanded = async (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      // Fetch channels if not loaded
      if (!clientChannels[clientId]) {
        await fetchClientChannels(clientId);
      }
    }
    setExpandedClients(newExpanded);
  };

  const fetchClientChannels = async (clientId: string) => {
    setLoadingChannels(prev => new Set(prev).add(clientId));
    try {
      const { data, error } = await (supabase as any)
        .from('streaming_accounts')
        .select('id, platform_type, account_name, status, created_at')
        .eq('client_id', clientId)
        .eq('owner_type', 'client')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientChannels(prev => ({ ...prev, [clientId]: data || [] }));
    } catch (error) {
      console.error('Error fetching client channels:', error);
    } finally {
      setLoadingChannels(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  const openAssignDialog = (client: ClientWithWallet) => {
    setSelectedClient(client);
    setAssignForm({
      packageId: packages[0]?.id || '',
      customHours: 5,
      usePackage: true,
    });
    setShowAssignDialog(true);
  };

  const openChannelDialog = (client: ClientWithWallet) => {
    setSelectedClient(client);
    setChannelForm({ platform_type: 'youtube', account_name: '' });
    setShowChannelDialog(true);
  };

  const handleAssign = async () => {
    if (!selectedClient) return;

    const selectedPackage = packages.find(p => p.id === assignForm.packageId);
    const hours = assignForm.usePackage && selectedPackage 
      ? selectedPackage.hours_included 
      : assignForm.customHours;

    const expiresAt = assignForm.usePackage && selectedPackage
      ? new Date(Date.now() + selectedPackage.validity_days * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    await onAssignHours(
      selectedClient.id, 
      hours,
      assignForm.usePackage ? assignForm.packageId : undefined,
      expiresAt
    );
    setShowAssignDialog(false);
  };

  const handleAddChannel = async () => {
    if (!selectedClient || !channelForm.account_name) return;

    try {
      const { error } = await (supabase as any)
        .from('streaming_accounts')
        .insert({
          owner_type: 'client',
          owner_id: null,
          client_id: selectedClient.id,
          provider: 'custom_rtmp', // Default provider
          platform_type: channelForm.platform_type,
          account_name: channelForm.account_name,
          status: 'connected',
        });

      if (error) throw error;

      toast({ title: 'Canal agregado', description: `${channelForm.account_name} conectado correctamente` });
      await fetchClientChannels(selectedClient.id);
      setShowChannelDialog(false);
    } catch (error) {
      console.error('Error adding channel:', error);
      toast({ title: 'Error', description: 'No se pudo agregar el canal', variant: 'destructive' });
    }
  };

  const handleDeleteChannel = async (clientId: string, channelId: string) => {
    try {
      const { error } = await supabase
        .from('streaming_accounts')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast({ title: 'Canal eliminado' });
      await fetchClientChannels(clientId);
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el canal', variant: 'destructive' });
    }
  };

  const activePackages = packages.filter(p => p.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes con Live
              </CardTitle>
              <CardDescription>
                Gestiona el acceso de clientes al módulo Live Streaming y sus canales de transmisión
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin clientes</h3>
              <p className="text-sm text-muted-foreground">
                No hay clientes en esta organización
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => {
                const availableHours = client.wallet?.available_hours || 0;
                const totalHours = client.wallet?.total_hours || 0;
                const hoursPercent = totalHours > 0 ? (availableHours / totalHours) * 100 : 0;
                const isExpanded = expandedClients.has(client.id);
                const channels = clientChannels[client.id] || [];
                const isLoading = loadingChannels.has(client.id);

                return (
                  <Collapsible key={client.id} open={isExpanded} onOpenChange={() => toggleExpanded(client.id)}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={client.logo_url || undefined} />
                              <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Link2 className="h-3 w-3" />
                                {channels.length} canales
                                <span className="mx-1">•</span>
                                <Calendar className="h-3 w-3" />
                                {client.total_events} eventos
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {client.wallet ? (
                              <div className="text-right min-w-[100px]">
                                <div className="flex items-center gap-2 justify-end">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{availableHours.toFixed(1)}h</span>
                                </div>
                                <Progress value={hoursPercent} className="h-1.5 mt-1" />
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin horas</span>
                            )}
                            
                            <Switch
                              checked={client.live_enabled}
                              onCheckedChange={(checked) => {
                                onToggleClientLive(client.id, checked);
                              }}
                              disabled={!client.wallet || availableHours <= 0}
                              onClick={(e) => e.stopPropagation()}
                            />
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignDialog(client);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Horas
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Canales de Transmisión</h4>
                            <Button size="sm" onClick={() => openChannelDialog(client)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar Canal
                            </Button>
                          </div>
                          
                          {isLoading ? (
                            <div className="text-center py-4 text-muted-foreground">
                              Cargando canales...
                            </div>
                          ) : channels.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Este cliente no tiene canales configurados</p>
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => openChannelDialog(client)}
                              >
                                Agregar primer canal
                              </Button>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Plataforma</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {channels.map((channel) => {
                                  const config = PLATFORM_CONFIG[channel.platform_type] || PLATFORM_CONFIG.custom_rtmp;
                                  const Icon = config.icon;
                                  return (
                                    <TableRow key={channel.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Icon className={`h-4 w-4 ${config.color}`} />
                                          <span>{config.name}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium">{channel.account_name}</TableCell>
                                      <TableCell>
                                        <Badge variant={channel.status === 'connected' ? 'default' : 'secondary'}>
                                          {channel.status === 'connected' ? 'Conectado' : channel.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive"
                                          onClick={() => handleDeleteChannel(client.id, channel.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Hours Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Horas de Live</DialogTitle>
            <DialogDescription>
              Asignar horas a: {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={assignForm.usePackage}
                onCheckedChange={(checked) => setAssignForm({ ...assignForm, usePackage: checked })}
              />
              <Label>Usar paquete predefinido</Label>
            </div>

            {assignForm.usePackage ? (
              <div className="space-y-2">
                <Label>Seleccionar Paquete</Label>
                {activePackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay paquetes activos. Crea uno en la pestaña "Paquetes".
                  </p>
                ) : (
                  <Select
                    value={assignForm.packageId}
                    onValueChange={(value) => setAssignForm({ ...assignForm, packageId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un paquete" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          <div className="flex items-center gap-2">
                            <span>{pkg.name}</span>
                            <Badge variant="outline">{pkg.hours_included}h</Badge>
                            <span className="text-muted-foreground">
                              ${pkg.price.toLocaleString()} {pkg.currency}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Horas a asignar</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={assignForm.customHours}
                  onChange={(e) => setAssignForm({ ...assignForm, customHours: Number(e.target.value) })}
                />
              </div>
            )}

            {selectedClient?.wallet && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">
                  <strong>Horas actuales del cliente:</strong>{' '}
                  {selectedClient.wallet.available_hours.toFixed(1)}h disponibles
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={assignForm.usePackage && !assignForm.packageId}
            >
              Asignar Horas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Channel Dialog */}
      <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Canal de Transmisión</DialogTitle>
            <DialogDescription>
              Agregar canal para: {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={channelForm.platform_type}
                onValueChange={(value) => setChannelForm({ ...channelForm, platform_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Nombre del canal / cuenta</Label>
              <Input
                placeholder="Ej: Mi Canal de YouTube"
                value={channelForm.account_name}
                onChange={(e) => setChannelForm({ ...channelForm, account_name: e.target.value })}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p><strong>Nota:</strong> El cliente deberá proporcionar sus credenciales de streaming (stream key, RTMP URL) al momento de configurar un evento.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddChannel}
              disabled={!channelForm.account_name}
            >
              Agregar Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
