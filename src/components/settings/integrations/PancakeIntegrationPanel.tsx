import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Users,
  Building2,
  Clock,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getPancakeConfig,
  updatePancakeConfig,
  getPancakeSyncStats,
  getPancakeSyncLog,
  runPancakeSetup,
  runBulkSync,
  type PancakeIntegrationConfig,
  type PancakeSyncLogEntry
} from '@/services/pancakeCrmService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-white/70'
}: {
  label: string;
  value: number;
  icon: typeof Users;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className={cn('p-2 rounded-lg bg-white/5', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

function LogEntry({ entry }: { entry: PancakeSyncLogEntry }) {
  const isSuccess = entry.status === 'success';
  const isOutgoing = entry.direction === 'kreoon_to_pancake';
  const time = new Date(entry.created_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className={cn(
        'p-1.5 rounded-full',
        isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      )}>
        {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/70 capitalize">{entry.action}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {entry.entity_type}
          </Badge>
          <span className={cn(
            'text-[10px]',
            isOutgoing ? 'text-blue-400' : 'text-purple-400'
          )}>
            {isOutgoing ? 'Kreoon → Pancake' : 'Pancake → Kreoon'}
          </span>
        </div>
        {entry.error_message && (
          <p className="text-[10px] text-red-400 truncate mt-0.5">{entry.error_message}</p>
        )}
      </div>
      <span className="text-[10px] text-white/30">{time}</span>
    </div>
  );
}

export function PancakeIntegrationPanel() {
  const queryClient = useQueryClient();
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [isBulkSyncRunning, setIsBulkSyncRunning] = useState(false);

  // Queries
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['pancake-config'],
    queryFn: getPancakeConfig,
    staleTime: 60_000
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['pancake-sync-stats'],
    queryFn: getPancakeSyncStats,
    staleTime: 30_000
  });

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['pancake-sync-log'],
    queryFn: () => getPancakeSyncLog(20),
    staleTime: 30_000
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: 'sync_users_enabled' | 'sync_organizations_enabled'; value: boolean }) =>
      updatePancakeConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pancake-config'] });
      toast.success('Configuracion actualizada');
    },
    onError: (err: Error) => {
      toast.error(`Error: ${err.message}`);
    }
  });

  const isConnected = !!config?.shop_id;
  const webhookUrl = `${SUPABASE_URL}/functions/v1/pancake-webhook-receiver`;

  const handleRunSetup = async () => {
    setIsSetupRunning(true);
    try {
      const result = await runPancakeSetup();
      toast.success(`Setup completado. Shop ID: ${result.shop_id}`);
      queryClient.invalidateQueries({ queryKey: ['pancake-config'] });
    } catch (err: any) {
      toast.error(`Error en setup: ${err.message}`);
    } finally {
      setIsSetupRunning(false);
    }
  };

  const handleBulkSync = async () => {
    setIsBulkSyncRunning(true);
    try {
      const result = await runBulkSync({ entity_type: 'both', batch_size: 50 });
      const { results } = result;
      toast.success(
        `Sincronizados: ${results.users.synced} usuarios, ${results.organizations.synced} orgs. ` +
        `Errores: ${results.users.errors + results.organizations.errors}`
      );
      queryClient.invalidateQueries({ queryKey: ['pancake-sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pancake-sync-log'] });
    } catch (err: any) {
      toast.error(`Error en sincronizacion: ${err.message}`);
    } finally {
      setIsBulkSyncRunning(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Pancake CRM</h3>
          <p className="text-sm text-white/50">
            Sincronizacion bidireccional de usuarios y organizaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              No configurado
            </Badge>
          )}
        </div>
      </div>

      {/* Setup Card */}
      {!isConnected && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-400">Configuracion inicial requerida</CardTitle>
            <CardDescription className="text-yellow-400/70">
              Ejecuta el setup para conectar con Pancake y crear las tablas CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRunSetup}
              disabled={isSetupRunning}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSetupRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Ejecutar Setup
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {isConnected && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Usuarios sincronizados"
            value={stats.total_synced_users}
            icon={Users}
            color="text-green-400"
          />
          <StatCard
            label="Orgs sincronizadas"
            value={stats.total_synced_orgs}
            icon={Building2}
            color="text-blue-400"
          />
          <StatCard
            label="Usuarios pendientes"
            value={stats.pending_users}
            icon={Clock}
            color="text-yellow-400"
          />
          <StatCard
            label="Con errores"
            value={stats.error_users + stats.error_orgs}
            icon={AlertTriangle}
            color="text-red-400"
          />
        </div>
      )}

      {/* Config */}
      {isConnected && config && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/70 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuracion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Sincronizar usuarios</p>
                <p className="text-xs text-white/40">Nuevos usuarios y actualizaciones de perfil</p>
              </div>
              <Switch
                checked={config.sync_users_enabled}
                onCheckedChange={(checked) =>
                  updateConfigMutation.mutate({ key: 'sync_users_enabled', value: checked })
                }
              />
            </div>
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Sincronizar organizaciones</p>
                <p className="text-xs text-white/40">Nuevas orgs y cambios de membresia</p>
              </div>
              <Switch
                checked={config.sync_organizations_enabled}
                onCheckedChange={(checked) =>
                  updateConfigMutation.mutate({ key: 'sync_organizations_enabled', value: checked })
                }
              />
            </div>
            <Separator className="bg-white/10" />
            <div>
              <p className="text-xs text-white/40 mb-1">Shop ID</p>
              <code className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                {config.shop_id}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Config */}
      {isConnected && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/70">Webhook de Pancake</CardTitle>
            <CardDescription className="text-white/40">
              Configura este webhook en Pancake para recibir cambios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-white/40 mb-1">URL del Webhook</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-1.5 rounded truncate">
                  {webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(webhookUrl, 'URL')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Header de autenticacion</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded">
                  x-pancake-secret: {config?.webhook_secret?.slice(0, 8)}...
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(config?.webhook_secret || '', 'Secret')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {isConnected && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleBulkSync}
            disabled={isBulkSyncRunning}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            {isBulkSyncRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizacion masiva
          </Button>
          <Button
            variant="ghost"
            onClick={() => refetchLogs()}
            className="text-white/50 hover:text-white/70"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar log
          </Button>
        </div>
      )}

      {/* Recent Logs */}
      {isConnected && logs && logs.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/70">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <LogEntry key={log.id} entry={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
