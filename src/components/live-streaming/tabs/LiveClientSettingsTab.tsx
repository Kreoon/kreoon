import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, Users, Clock, DollarSign, Shield, Edit, Plus, 
  Video, Eye, Radio, Check, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientWithWallet } from '@/hooks/useKreoonLive';
import { cn } from '@/lib/utils';

interface ClientSettings {
  id?: string;
  client_id: string;
  organization_id: string;
  can_create_events: boolean;
  can_view_events: boolean;
  can_connect_own_channels: boolean;
  max_hours_per_event: number | null;
  max_events_per_month: number | null;
  internal_price_per_hour: number | null;
  internal_currency: string;
  default_event_type: string;
  require_approval: boolean;
}

interface LiveClientSettingsTabProps {
  clients: ClientWithWallet[];
  organizationId: string;
  onRefresh: () => Promise<void>;
}

export function LiveClientSettingsTab({ clients, organizationId, onRefresh }: LiveClientSettingsTabProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Map<string, ClientSettings>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<ClientWithWallet | null>(null);
  const [formData, setFormData] = useState<ClientSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [clients]);

  const fetchSettings = async () => {
    if (clients.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await (supabase as any)
        .from('live_client_settings')
        .select('*')
        .eq('organization_id', organizationId);

      if (data) {
        const settingsMap = new Map<string, ClientSettings>();
        data.forEach((s: ClientSettings) => {
          settingsMap.set(s.client_id, s);
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error('Error fetching client settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (client: ClientWithWallet) => {
    const existing = settings.get(client.id);
    setEditingClient(client);
    setFormData(existing || {
      client_id: client.id,
      organization_id: organizationId,
      can_create_events: false,
      can_view_events: true,
      can_connect_own_channels: false,
      max_hours_per_event: null,
      max_events_per_month: null,
      internal_price_per_hour: null,
      internal_currency: 'USD',
      default_event_type: 'informative',
      require_approval: true,
    });
  };

  const handleSave = async () => {
    if (!formData) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('live_client_settings')
        .upsert({
          ...formData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id' });

      if (error) throw error;

      toast({ title: 'Configuración guardada' });
      setEditingClient(null);
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getClientSettings = (clientId: string): ClientSettings | null => {
    return settings.get(clientId) || null;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Configuración de Clientes LIVE
          </CardTitle>
          <CardDescription>
            Define permisos, límites y precios internos para cada cliente con acceso a Live Streaming.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay clientes con Live Streaming habilitado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Límites</TableHead>
                  <TableHead>Precio Interno</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.filter(c => c.live_enabled).map((client) => {
                  const clientSettings = getClientSettings(client.id);
                  
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {client.logo_url ? (
                            <img src={client.logo_url} alt={client.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.wallet?.available_hours || 0}h disponibles
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {clientSettings?.can_create_events && (
                            <Badge variant="secondary" className="text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              Crear
                            </Badge>
                          )}
                          {clientSettings?.can_view_events && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Badge>
                          )}
                          {clientSettings?.can_connect_own_channels && (
                            <Badge variant="outline" className="text-xs">
                              <Radio className="h-3 w-3 mr-1" />
                              Canales
                            </Badge>
                          )}
                          {!clientSettings && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Sin configurar
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {clientSettings ? (
                          <div className="text-sm">
                            {clientSettings.max_hours_per_event && (
                              <p>{clientSettings.max_hours_per_event}h/evento</p>
                            )}
                            {clientSettings.max_events_per_month && (
                              <p>{clientSettings.max_events_per_month} eventos/mes</p>
                            )}
                            {!clientSettings.max_hours_per_event && !clientSettings.max_events_per_month && (
                              <span className="text-muted-foreground">Sin límites</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {clientSettings?.internal_price_per_hour ? (
                          <span className="font-medium">
                            ${clientSettings.internal_price_per_hour}/{clientSettings.internal_currency}/h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Precio org.</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(client)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de {editingClient?.name}
            </DialogTitle>
            <DialogDescription>
              Define los permisos y límites de este cliente para Live Streaming.
            </DialogDescription>
          </DialogHeader>

          {formData && (
            <div className="space-y-6 py-4">
              {/* Permissions */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Permisos</Label>
                
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Ver Eventos</p>
                    <p className="text-sm text-muted-foreground">Puede ver los eventos programados</p>
                  </div>
                  <Switch
                    checked={formData.can_view_events}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_view_events: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Crear Eventos</p>
                    <p className="text-sm text-muted-foreground">Puede solicitar nuevos eventos</p>
                  </div>
                  <Switch
                    checked={formData.can_create_events}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_create_events: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Conectar Canales Propios</p>
                    <p className="text-sm text-muted-foreground">Puede vincular sus cuentas de streaming</p>
                  </div>
                  <Switch
                    checked={formData.can_connect_own_channels}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_connect_own_channels: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Requiere Aprobación</p>
                    <p className="text-sm text-muted-foreground">Los eventos requieren aprobación antes de transmitir</p>
                  </div>
                  <Switch
                    checked={formData.require_approval}
                    onCheckedChange={(checked) => setFormData({ ...formData, require_approval: checked })}
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Límites</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Máx. Horas por Evento</Label>
                    <Input
                      type="number"
                      placeholder="Sin límite"
                      value={formData.max_hours_per_event || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_hours_per_event: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Máx. Eventos por Mes</Label>
                    <Input
                      type="number"
                      placeholder="Sin límite"
                      value={formData.max_events_per_month || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_events_per_month: e.target.value ? parseInt(e.target.value) : null 
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Precio Interno</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Precio por Hora</Label>
                    <Input
                      type="number"
                      placeholder="Usar precio org."
                      value={formData.internal_price_per_hour || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        internal_price_per_hour: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Moneda</Label>
                    <Select 
                      value={formData.internal_currency} 
                      onValueChange={(value) => setFormData({ ...formData, internal_currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="COP">COP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Default Event Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Evento Predeterminado</Label>
                <Select 
                  value={formData.default_event_type} 
                  onValueChange={(value) => setFormData({ ...formData, default_event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informative">Informativo</SelectItem>
                    <SelectItem value="shopping">Live Shopping</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="interview">Entrevista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
