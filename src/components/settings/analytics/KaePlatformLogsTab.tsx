import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useKaeConfig } from '@/hooks/useKaeConfig';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  tiktok: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  google: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  linkedin: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
};

export function KaePlatformLogsTab() {
  const { logs, fetchLogs } = useKaeConfig();
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs(100).then(() => setLoading(false));
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchLogs(100);
    setLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    if (platformFilter !== 'all' && log.platform !== platformFilter) return false;
    if (statusFilter === 'success' && !log.success) return false;
    if (statusFilter === 'error' && log.success) return false;
    return true;
  });

  const successCount = logs.filter((l) => l.success).length;
  const errorCount = logs.filter((l) => !l.success).length;
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / logs.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <div className="text-xs text-muted-foreground">Exitosos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-xs text-muted-foreground">Errores</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{avgLatency}ms</div>
            <div className="text-xs text-muted-foreground">Latencia promedio</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Logs de API</CardTitle>
              <CardDescription>\u00daltimas {logs.length} llamadas a plataformas de ads</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <div className="flex gap-2 pt-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="google">Google Analytics 4</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Exitosos</SelectItem>
                <SelectItem value="error">Errores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay logs disponibles
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-sm border bg-card hover:bg-accent/50 transition-colors"
                >
                  {log.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}

                  <Badge className={PLATFORM_COLORS[log.platform] || ''} variant="secondary">
                    {log.platform}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {log.response_status ? `HTTP ${log.response_status}` : 'Sin respuesta'}
                      {log.error_message && (
                        <span className="text-red-500 ml-2 font-normal">{log.error_message}</span>
                      )}
                    </div>
                  </div>

                  {log.latency_ms != null && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {log.latency_ms}ms
                    </span>
                  )}

                  <span className="text-xs text-muted-foreground shrink-0" title={format(new Date(log.created_at), 'PPpp', { locale: es })}>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
