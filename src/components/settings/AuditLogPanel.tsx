import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Filter, User, FileText, Building2, Package, Clock, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: unknown;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

const ACTION_LABELS: Record<string, string> = {
  'content_created': 'Contenido creado',
  'content_status_changed': 'Estado cambiado',
  'content_deleted': 'Contenido eliminado',
  'editor_assigned': 'Editor asignado',
  'creator_assigned': 'Creador asignado',
  'client_created': 'Cliente creado',
  'client_updated': 'Cliente actualizado',
  'client_deleted': 'Cliente eliminado',
  'product_created': 'Producto creado',
  'product_updated': 'Producto actualizado',
  'product_deleted': 'Producto eliminado',
  'user_login': 'Inicio de sesión',
  'user_logout': 'Cierre de sesión',
};

const ACTION_COLORS: Record<string, string> = {
  'content_created': 'bg-green-500/10 text-green-500 border-green-500/20',
  'content_status_changed': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'content_deleted': 'bg-red-500/10 text-red-500 border-red-500/20',
  'editor_assigned': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'creator_assigned': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'client_created': 'bg-green-500/10 text-green-500 border-green-500/20',
  'client_updated': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'client_deleted': 'bg-red-500/10 text-red-500 border-red-500/20',
  'product_created': 'bg-green-500/10 text-green-500 border-green-500/20',
  'product_updated': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'product_deleted': 'bg-red-500/10 text-red-500 border-red-500/20',
  'user_login': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'user_logout': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  'content': <FileText className="w-4 h-4" />,
  'client': <Building2 className="w-4 h-4" />,
  'product': <Package className="w-4 h-4" />,
  'user': <User className="w-4 h-4" />,
};

export function AuditLogPanel() {
  const { isAdmin } = useAuth();
  const { isPlatformRoot, currentOrgId, isOrgOwner } = useOrgOwner();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [orgMemberIds, setOrgMemberIds] = useState<string[]>([]);

  // Fetch org member IDs for filtering (only for org owners, not platform root)
  useEffect(() => {
    const fetchOrgMembers = async () => {
      if (!isPlatformRoot && currentOrgId) {
        const { data } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', currentOrgId);
        
        if (data) {
          setOrgMemberIds(data.map(m => m.user_id));
        }
      }
    };
    
    fetchOrgMembers();
  }, [isPlatformRoot, currentOrgId]);

  useEffect(() => {
    if (isAdmin || isOrgOwner) {
      fetchLogs();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('audit-logs-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs'
          },
          (payload) => {
            // Fetch user info for the new log
            fetchUserForLog(payload.new as AuditLog);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, isOrgOwner]);

  const fetchUserForLog = async (log: AuditLog) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', log.user_id)
      .maybeSingle();
    
    const enrichedLog = {
      ...log,
      user_name: profile?.full_name || 'Usuario desconocido',
      user_email: profile?.email || '',
    };
    
    setLogs(prev => [enrichedLog, ...prev]);
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch logs
      const { data: logsData, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(logsData.map(log => log.user_id))];
      
      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Enrich logs with user info
      const enrichedLogs: AuditLog[] = logsData.map(log => ({
        ...log,
        details: log.details as unknown,
        user_name: profileMap.get(log.user_id)?.full_name || 'Usuario desconocido',
        user_email: profileMap.get(log.user_id)?.email || '',
      }));

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    // For org owners (not platform root), filter by org members
    if (!isPlatformRoot && orgMemberIds.length > 0) {
      if (!orgMemberIds.includes(log.user_id)) {
        return false;
      }
    }

    const matchesSearch = 
      searchTerm === '' ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesEntity && matchesAction;
  });

  // Check access - allow both admins and org owners
  if (!isAdmin && !isOrgOwner) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive" />
            <p>Solo los administradores pueden ver el historial de actividad</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueEntities = [...new Set(logs.map(log => log.entity_type))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Historial de Actividad
        </CardTitle>
        <CardDescription>
          Registro de todas las acciones realizadas en la plataforma (últimos 30 días)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario, acción o entidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo de entidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las entidades</SelectItem>
              {uniqueEntities.map(entity => (
                <SelectItem key={entity} value={entity}>
                  {entity.charAt(0).toUpperCase() + entity.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo de acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {ACTION_LABELS[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Total registros</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{logs.filter(l => l.entity_type === 'content').length}</p>
            <p className="text-xs text-muted-foreground">En contenido</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{logs.filter(l => l.entity_type === 'client').length}</p>
            <p className="text-xs text-muted-foreground">En clientes</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{new Set(logs.map(l => l.user_id)).size}</p>
            <p className="text-xs text-muted-foreground">Usuarios activos</p>
          </div>
        </div>

        {/* Logs list */}
        <ScrollArea className="h-[500px] pr-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No hay registros de actividad</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {ENTITY_ICONS[log.entity_type] || <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.user_name}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${ACTION_COLORS[log.action] || 'bg-muted'}`}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {log.entity_name && (
                        <span className="font-medium text-foreground">{log.entity_name}</span>
                      )}
                      {log.details && log.action === 'content_status_changed' && (
                        <span className="ml-1">
                          ({(log.details as { old_status?: string }).old_status} → {(log.details as { new_status?: string }).new_status})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                      <span className="mx-1">•</span>
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
