import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Radio, 
  RefreshCw, 
  TrendingUp, 
  DollarSign,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(value);
};
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MarketingTrafficProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

interface TrafficChannel {
  id: string;
  channel_type: string;
  channel_name: string;
  status: string;
  monthly_budget: number;
  currency: string;
  objective: string | null;
  responsible_id: string | null;
  responsible_type: string;
  agency_name: string | null;
  api_connected: boolean;
  last_sync_at: string | null;
  sync_status: string;
  responsible?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface SyncLog {
  investment: number;
  leads: number;
  sales: number;
  clicks: number;
  impressions: number;
  cpa: number | null;
  roas: number | null;
}

const CHANNEL_TYPES = [
  { value: 'meta_ads', label: 'Meta Ads', icon: '📘' },
  { value: 'google_ads', label: 'Google Ads', icon: '🔍' },
  { value: 'tiktok_ads', label: 'TikTok Ads', icon: '🎵' },
  { value: 'youtube_ads', label: 'YouTube Ads', icon: '▶️' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads', icon: '💼' },
  { value: 'organic', label: 'Tráfico Orgánico', icon: '🌱' },
  { value: 'email', label: 'Email Marketing', icon: '📧' },
  { value: 'other', label: 'Otro', icon: '📊' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Activo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'secondary' },
  inactive: { label: 'Inactivo', variant: 'outline' },
};

export function MarketingTraffic({ organizationId, selectedClientId }: MarketingTrafficProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<TrafficChannel[]>([]);
  const [channelMetrics, setChannelMetrics] = useState<Record<string, SyncLog>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<TrafficChannel | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    channel_type: '',
    channel_name: '',
    monthly_budget: '',
    currency: 'COP',
    objective: '',
    responsible_type: 'internal',
    agency_name: '',
  });

  const [syncData, setSyncData] = useState({
    sync_date: new Date().toISOString().split('T')[0],
    investment: '',
    leads: '',
    sales: '',
    clicks: '',
    impressions: '',
    cpa: '',
    roas: '',
    notes: '',
  });

  useEffect(() => {
    if (organizationId) {
      fetchChannels();
    }
  }, [organizationId, selectedClientId]);

  const fetchChannels = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('traffic_channels')
        .select(`
          *,
          responsible:profiles!traffic_channels_responsible_id_fkey(id, full_name, avatar_url)
        `)
        .eq('organization_id', organizationId);
      
      // Filter by client if selected
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);

      // Fetch metrics for each channel
      const metrics: Record<string, SyncLog> = {};
      for (const channel of data || []) {
        const { data: logs } = await supabase
          .from('traffic_sync_logs')
          .select('investment, leads, sales, clicks, impressions, cpa, roas')
          .eq('channel_id', channel.id)
          .gte('sync_date', new Date(new Date().setDate(1)).toISOString().split('T')[0])
          .order('sync_date', { ascending: false });

        if (logs && logs.length > 0) {
          metrics[channel.id] = {
            investment: logs.reduce((sum, l) => sum + (Number(l.investment) || 0), 0),
            leads: logs.reduce((sum, l) => sum + (Number(l.leads) || 0), 0),
            sales: logs.reduce((sum, l) => sum + (Number(l.sales) || 0), 0),
            clicks: logs.reduce((sum, l) => sum + (Number(l.clicks) || 0), 0),
            impressions: logs.reduce((sum, l) => sum + (Number(l.impressions) || 0), 0),
            cpa: logs[0].cpa,
            roas: logs[0].roas,
          };
        }
      }
      setChannelMetrics(metrics);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error('Error al cargar canales');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!organizationId || !formData.channel_type || !formData.channel_name) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('traffic_channels')
        .insert({
          organization_id: organizationId,
          channel_type: formData.channel_type,
          channel_name: formData.channel_name,
          monthly_budget: parseFloat(formData.monthly_budget) || 0,
          currency: formData.currency,
          objective: formData.objective || null,
          responsible_type: formData.responsible_type,
          agency_name: formData.responsible_type === 'agency' ? formData.agency_name : null,
        });

      if (error) throw error;

      toast.success('Canal creado');
      setShowAddDialog(false);
      setFormData({
        channel_type: '',
        channel_name: '',
        monthly_budget: '',
        currency: 'COP',
        objective: '',
        responsible_type: 'internal',
        agency_name: '',
      });
      fetchChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
      toast.error('Error al crear canal');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncData = async () => {
    if (!organizationId || !selectedChannel) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('traffic_sync_logs')
        .insert({
          organization_id: organizationId,
          channel_id: selectedChannel.id,
          sync_type: 'manual',
          sync_date: syncData.sync_date,
          investment: parseFloat(syncData.investment) || 0,
          leads: parseInt(syncData.leads) || 0,
          sales: parseInt(syncData.sales) || 0,
          clicks: parseInt(syncData.clicks) || 0,
          impressions: parseInt(syncData.impressions) || 0,
          cpa: syncData.cpa ? parseFloat(syncData.cpa) : null,
          roas: syncData.roas ? parseFloat(syncData.roas) : null,
          notes: syncData.notes || null,
          synced_by: user?.id,
        });

      if (error) throw error;

      // Update last_sync_at on channel
      await supabase
        .from('traffic_channels')
        .update({ last_sync_at: new Date().toISOString(), sync_status: 'synced' })
        .eq('id', selectedChannel.id);

      toast.success('Datos sincronizados');
      setShowSyncDialog(false);
      setSyncData({
        sync_date: new Date().toISOString().split('T')[0],
        investment: '',
        leads: '',
        sales: '',
        clicks: '',
        impressions: '',
        cpa: '',
        roas: '',
        notes: '',
      });
      fetchChannels();
    } catch (error) {
      console.error('Error syncing data:', error);
      toast.error('Error al sincronizar');
    } finally {
      setSaving(false);
    }
  };

  const updateChannelStatus = async (channelId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('traffic_channels')
        .update({ status })
        .eq('id', channelId);

      if (error) throw error;
      toast.success('Estado actualizado');
      fetchChannels();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar');
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm('¿Eliminar este canal?')) return;

    try {
      const { error } = await supabase
        .from('traffic_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
      toast.success('Canal eliminado');
      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error('Error al eliminar');
    }
  };

  const getChannelIcon = (type: string) => {
    return CHANNEL_TYPES.find(c => c.value === type)?.icon || '📊';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Canales de Tráfico</h3>
          <p className="text-sm text-muted-foreground">Gestiona tus fuentes de tráfico digital</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Canal
        </Button>
      </div>

      {/* Channels Grid */}
      {channels.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin canales de tráfico</h3>
          <p className="text-muted-foreground mb-4">
            Agrega tus canales de publicidad y tráfico para comenzar a registrar métricas
          </p>
          <Button onClick={() => setShowAddDialog(true)}>Agregar primer canal</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => {
            const metrics = channelMetrics[channel.id];
            const statusConfig = STATUS_CONFIG[channel.status] || STATUS_CONFIG.inactive;

            return (
              <Card key={channel.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getChannelIcon(channel.channel_type)}</span>
                      <div>
                        <CardTitle className="text-base">{channel.channel_name}</CardTitle>
                        <CardDescription>
                          {CHANNEL_TYPES.find(c => c.value === channel.channel_type)?.label}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedChannel(channel);
                          setShowSyncDialog(true);
                        }}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sincronizar Data
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateChannelStatus(channel.id, channel.status === 'active' ? 'paused' : 'active')}>
                          {channel.status === 'active' ? 'Pausar' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteChannel(channel.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Badge variant={statusConfig.variant} className="w-fit mt-2">
                    {statusConfig.label}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Budget */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Presupuesto
                    </span>
                    <span className="font-medium">
                      {formatCurrency(channel.monthly_budget, channel.currency)}/mes
                    </span>
                  </div>

                  {/* Metrics */}
                  {metrics && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{metrics.leads}</div>
                        <div className="text-xs text-muted-foreground">Leads</div>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{metrics.sales}</div>
                        <div className="text-xs text-muted-foreground">Ventas</div>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{formatCurrency(metrics.investment, channel.currency)}</div>
                        <div className="text-xs text-muted-foreground">Invertido</div>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{metrics.roas ? `${metrics.roas}x` : '-'}</div>
                        <div className="text-xs text-muted-foreground">ROAS</div>
                      </div>
                    </div>
                  )}

                  {/* Sync Status */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground flex items-center gap-1">
                      {channel.last_sync_at ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Última sync: {new Date(channel.last_sync_at).toLocaleDateString()}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          Sin sincronizar
                        </>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedChannel(channel);
                        setShowSyncDialog(true);
                      }}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Channel Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Canal de Tráfico</DialogTitle>
            <DialogDescription>
              Configura un nuevo canal de publicidad o tráfico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Canal</Label>
              <Select value={formData.channel_type} onValueChange={(v) => setFormData(prev => ({ ...prev, channel_type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre del Canal</Label>
              <Input
                value={formData.channel_name}
                onChange={(e) => setFormData(prev => ({ ...prev, channel_name: e.target.value }))}
                placeholder="Ej: Campañas de Conversión FB"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presupuesto Mensual</Label>
                <Input
                  type="number"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_budget: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
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
            <div className="space-y-2">
              <Label>Objetivo del Canal</Label>
              <Textarea
                value={formData.objective}
                onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                placeholder="Ej: Generar leads calificados para el producto X..."
              />
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={formData.responsible_type} onValueChange={(v) => setFormData(prev => ({ ...prev, responsible_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Equipo Interno</SelectItem>
                  <SelectItem value="agency">Agencia Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.responsible_type === 'agency' && (
              <div className="space-y-2">
                <Label>Nombre de la Agencia</Label>
                <Input
                  value={formData.agency_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, agency_name: e.target.value }))}
                  placeholder="Nombre de la agencia"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddChannel} disabled={saving}>
              {saving ? 'Creando...' : 'Crear Canal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Data Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sincronizar Data - {selectedChannel?.channel_name}</DialogTitle>
            <DialogDescription>
              Ingresa los datos de rendimiento del canal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de los Datos</Label>
              <Input
                type="date"
                value={syncData.sync_date}
                onChange={(e) => setSyncData(prev => ({ ...prev, sync_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inversión</Label>
                <Input
                  type="number"
                  value={syncData.investment}
                  onChange={(e) => setSyncData(prev => ({ ...prev, investment: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Leads</Label>
                <Input
                  type="number"
                  value={syncData.leads}
                  onChange={(e) => setSyncData(prev => ({ ...prev, leads: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Ventas</Label>
                <Input
                  type="number"
                  value={syncData.sales}
                  onChange={(e) => setSyncData(prev => ({ ...prev, sales: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Clicks</Label>
                <Input
                  type="number"
                  value={syncData.clicks}
                  onChange={(e) => setSyncData(prev => ({ ...prev, clicks: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Impresiones</Label>
                <Input
                  type="number"
                  value={syncData.impressions}
                  onChange={(e) => setSyncData(prev => ({ ...prev, impressions: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>CPA</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={syncData.cpa}
                  onChange={(e) => setSyncData(prev => ({ ...prev, cpa: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>ROAS</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={syncData.roas}
                  onChange={(e) => setSyncData(prev => ({ ...prev, roas: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={syncData.notes}
                onChange={(e) => setSyncData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>Cancelar</Button>
            <Button onClick={handleSyncData} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Datos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
