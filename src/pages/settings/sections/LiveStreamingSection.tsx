import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Video, Settings2, Link2, Calendar, DollarSign, FileText, 
  Youtube, Facebook, Instagram, Twitch, Plus, Loader2, 
  CheckCircle2, XCircle, AlertTriangle, Play, Square, Trash2,
  RefreshCw, ExternalLink, Eye, Edit, MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
interface StreamingProvider {
  id: string;
  provider: string;
  is_enabled: boolean;
  mode: string;
  api_key_encrypted?: string;
  client_id?: string;
  webhook_url?: string;
}

interface StreamingAccount {
  id: string;
  platform_type: string;
  account_name: string;
  status: string;
  created_at: string;
  last_sync_at?: string;
  error_message?: string;
}

interface StreamingEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  status: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  peak_viewers: number;
  total_views: number;
  is_shopping_enabled: boolean;
  client?: { name: string };
}

interface StreamingSale {
  id: string;
  sale_type: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  quoted_at: string;
  client?: { name: string };
  event?: { title: string };
}

interface StreamingLog {
  id: string;
  log_type: string;
  message: string;
  severity: string;
  created_at: string;
  provider?: string;
  platform_type?: string;
}

// Platform icons
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  facebook: <Facebook className="h-4 w-4 text-blue-600" />,
  instagram: <Instagram className="h-4 w-4 text-pink-500" />,
  twitch: <Twitch className="h-4 w-4 text-purple-500" />,
  tiktok: <Video className="h-4 w-4" />,
  linkedin: <Link2 className="h-4 w-4 text-blue-700" />,
  custom_rtmp: <Video className="h-4 w-4 text-gray-500" />,
};

// Status badges
const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
  disconnected: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  draft: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  live: 'bg-red-500/10 text-red-600 border-red-500/20 animate-pulse',
  ended: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  quoted: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  sold: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  executed: 'bg-green-500/10 text-green-600 border-green-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-600',
  warning: 'bg-yellow-500/10 text-yellow-600',
  error: 'bg-red-500/10 text-red-600',
  critical: 'bg-red-600/20 text-red-700',
};

export default function LiveStreamingSection() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  
  // Data states
  const [providers, setProviders] = useState<StreamingProvider[]>([]);
  const [accounts, setAccounts] = useState<StreamingAccount[]>([]);
  const [events, setEvents] = useState<StreamingEvent[]>([]);
  const [sales, setSales] = useState<StreamingSale[]>([]);
  const [logs, setLogs] = useState<StreamingLog[]>([]);

  // Dialog states
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);

  // Fetch feature flag
  useEffect(() => {
    const fetchFeatureFlag = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'live_streaming_enabled')
          .single();
        
        if (data) {
          setFeatureEnabled(data.value === 'true');
        }
      } catch (error) {
        console.error('Error fetching feature flag:', error);
      }
    };

    fetchFeatureFlag();
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch providers
        const { data: providersData } = await supabase
          .from('streaming_providers_config')
          .select('*')
          .eq('owner_type', 'platform')
          .order('provider');
        setProviders((providersData as StreamingProvider[]) || []);

        // Fetch accounts
        const { data: accountsData } = await supabase
          .from('streaming_accounts')
          .select('*')
          .eq('owner_type', 'platform')
          .order('created_at', { ascending: false });
        setAccounts((accountsData as StreamingAccount[]) || []);

        // Fetch events
        const { data: eventsData } = await supabase
          .from('streaming_events')
          .select('*, client:clients(name)')
          .eq('owner_type', 'platform')
          .order('scheduled_at', { ascending: false })
          .limit(50);
        setEvents((eventsData as StreamingEvent[]) || []);

        // Fetch sales
        const { data: salesData } = await supabase
          .from('streaming_sales')
          .select('*, client:clients(name), event:streaming_events(title)')
          .eq('owner_type', 'platform')
          .order('created_at', { ascending: false })
          .limit(50);
        setSales((salesData as StreamingSale[]) || []);

        // Fetch logs
        const { data: logsData } = await supabase
          .from('streaming_logs')
          .select('*')
          .eq('owner_type', 'platform')
          .order('created_at', { ascending: false })
          .limit(100);
        setLogs((logsData as StreamingLog[]) || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Toggle feature flag
  const toggleFeatureFlag = async () => {
    try {
      const newValue = !featureEnabled;
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newValue.toString(), updated_at: new Date().toISOString() })
        .eq('key', 'live_streaming_enabled');

      if (error) throw error;

      setFeatureEnabled(newValue);
      toast({
        title: 'Actualizado',
        description: newValue 
          ? 'Live Streaming habilitado para organizaciones'
          : 'Live Streaming deshabilitado para organizaciones',
      });
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    }
  };

  // Stats for overview
  const stats = useMemo(() => ({
    totalAccounts: accounts.length,
    connectedAccounts: accounts.filter(a => a.status === 'connected').length,
    totalEvents: events.length,
    liveEvents: events.filter(e => e.status === 'live').length,
    scheduledEvents: events.filter(e => e.status === 'scheduled').length,
    totalSales: sales.length,
    totalRevenue: sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0),
    pendingRevenue: sales.filter(s => ['quoted', 'sold', 'executed'].includes(s.status)).reduce((sum, s) => sum + s.amount, 0),
  }), [accounts, events, sales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            Live Streaming Multiplataforma
          </h2>
          <p className="text-muted-foreground">
            Gestiona transmisiones en vivo a múltiples plataformas simultáneamente
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Habilitar para Orgs:</span>
            <Switch checked={featureEnabled} onCheckedChange={toggleFeatureFlag} />
          </div>
          <Badge variant={featureEnabled ? 'default' : 'secondary'}>
            {featureEnabled ? 'Activo' : 'Solo Admin'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="gap-2 text-xs">
            <Eye className="h-3 w-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2 text-xs">
            <Settings2 className="h-3 w-3" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2 text-xs">
            <Link2 className="h-3 w-3" />
            Canales
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2 text-xs">
            <DollarSign className="h-3 w-3" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2 text-xs">
            <Settings2 className="h-3 w-3" />
            Config
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs">
            <FileText className="h-3 w-3" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Canales Conectados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.connectedAccounts}</div>
                <p className="text-xs text-muted-foreground">{stats.totalAccounts} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Eventos Live</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.liveEvents}</div>
                <p className="text-xs text-muted-foreground">{stats.scheduledEvents} programados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">${stats.pendingRevenue.toLocaleString()} pendiente</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSales}</div>
                <p className="text-xs text-muted-foreground">{events.length} eventos</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimos eventos y acciones del módulo</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay actividad reciente</p>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Badge className={SEVERITY_COLORS[log.severity]}>{log.severity}</Badge>
                      <span className="flex-1 text-sm">{log.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: es })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Proveedores de Streaming</CardTitle>
                  <CardDescription>Configura los servicios de streaming disponibles</CardDescription>
                </div>
                <Button onClick={() => setShowAddProvider(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Proveedor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {['restream', 'watchity', 'custom_rtmp'].map((providerKey) => {
                  const provider = providers.find(p => p.provider === providerKey);
                  return (
                    <div key={providerKey} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Video className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{providerKey.replace('_', ' ')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {provider?.is_enabled ? 'Configurado y activo' : 'No configurado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {provider && (
                          <Badge variant={provider.mode === 'production' ? 'default' : 'secondary'}>
                            {provider.mode}
                          </Badge>
                        )}
                        <Switch 
                          checked={provider?.is_enabled || false} 
                          disabled={!provider}
                        />
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Canales Conectados</CardTitle>
                  <CardDescription>Administra tus cuentas de streaming</CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Conectar Canal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No hay canales conectados</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecta tu primer canal para empezar a transmitir
                  </p>
                  <Button>Conectar Canal</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Última Sincronización</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {PLATFORM_ICONS[account.platform_type]}
                            <span className="capitalize">{account.platform_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{account.account_name}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[account.status]}>
                            {account.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {account.last_sync_at 
                            ? format(new Date(account.last_sync_at), 'dd/MM/yyyy HH:mm', { locale: es })
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Eventos Live</CardTitle>
                  <CardDescription>Programa y gestiona transmisiones en vivo</CardDescription>
                </div>
                <Button onClick={() => setShowAddEvent(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Evento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No hay eventos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crea tu primer evento de streaming
                  </p>
                  <Button onClick={() => setShowAddEvent(true)}>Crear Evento</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Viewers</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.title}</div>
                            {event.client && (
                              <div className="text-xs text-muted-foreground">{event.client.name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{event.event_type}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[event.status]}>
                            {event.status === 'live' && <span className="mr-1">●</span>}
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.scheduled_at
                            ? format(new Date(event.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: es })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{event.peak_viewers}</span>
                            <span className="text-muted-foreground"> peak</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {event.status === 'scheduled' && (
                              <Button variant="default" size="sm" className="gap-1">
                                <Play className="h-3 w-3" />
                                Iniciar
                              </Button>
                            )}
                            {event.status === 'live' && (
                              <Button variant="destructive" size="sm" className="gap-1">
                                <Square className="h-3 w-3" />
                                Detener
                              </Button>
                            )}
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ventas & Monetización</CardTitle>
                  <CardDescription>Gestiona la venta del servicio de live streaming</CardDescription>
                </div>
                <Button onClick={() => setShowAddSale(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Venta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No hay ventas registradas</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Registra tu primera venta de servicio de live
                  </p>
                  <Button onClick={() => setShowAddSale(true)}>Nueva Venta</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.client?.name || 'Sin cliente'}
                        </TableCell>
                        <TableCell className="capitalize">{sale.sale_type.replace('_', ' ')}</TableCell>
                        <TableCell>{sale.event?.title || '-'}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ${sale.amount.toLocaleString()} {sale.currency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[sale.status]}>
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(sale.quoted_at), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes globales del módulo de Live Streaming</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Habilitar para Organizaciones</h4>
                  <p className="text-sm text-muted-foreground">
                    Cuando está activo, las organizaciones pueden usar el módulo según sus permisos
                  </p>
                </div>
                <Switch checked={featureEnabled} onCheckedChange={toggleFeatureFlag} />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Límites por Defecto para Organizaciones</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máx. Canales por Org</Label>
                    <Input type="number" defaultValue={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. Streams Simultáneos</Label>
                    <Input type="number" defaultValue={1} />
                  </div>
                  <div className="space-y-2">
                    <Label>Minutos Mensuales</Label>
                    <Input type="number" placeholder="Sin límite" />
                  </div>
                  <div className="space-y-2">
                    <Label>Día de Facturación</Label>
                    <Input type="number" defaultValue={1} min={1} max={28} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Logs del Sistema</CardTitle>
                  <CardDescription>Historial de eventos y errores</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay logs registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead>Mensaje</TableHead>
                      <TableHead>Plataforma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.log_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={SEVERITY_COLORS[log.severity]}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                        <TableCell>
                          {log.platform_type && (
                            <div className="flex items-center gap-1">
                              {PLATFORM_ICONS[log.platform_type]}
                              <span className="text-xs capitalize">{log.platform_type}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}