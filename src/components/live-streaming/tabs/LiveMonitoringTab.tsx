import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, Users, Radio, Wifi, WifiOff, Clock, 
  TrendingUp, AlertTriangle, RefreshCw, Eye,
  Youtube, Facebook, Twitch
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StreamingEvent } from '@/hooks/useLiveStreaming';
import { cn } from '@/lib/utils';

interface EventMonitoring {
  id: string;
  event_id: string;
  current_viewers: number;
  peak_viewers: number;
  total_unique_viewers: number;
  bitrate_kbps: number | null;
  fps: number | null;
  resolution: string | null;
  destination_statuses: Array<{ platform: string; status: string; viewers: number }>;
  last_heartbeat_at: string | null;
  stream_started_at: string | null;
  total_duration_seconds: number;
}

interface LiveMonitoringTabProps {
  events: StreamingEvent[];
  onRefresh: () => Promise<void>;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  facebook: <Facebook className="h-4 w-4 text-blue-600" />,
  twitch: <Twitch className="h-4 w-4 text-purple-500" />,
};

export function LiveMonitoringTab({ events, onRefresh }: LiveMonitoringTabProps) {
  const [monitoring, setMonitoring] = useState<Map<string, EventMonitoring>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const liveEvents = events.filter(e => e.status === 'live');

  const fetchMonitoring = useCallback(async () => {
    if (liveEvents.length === 0) return;

    try {
      const { data } = await (supabase as any)
        .from('live_event_monitoring')
        .select('*')
        .in('event_id', liveEvents.map(e => e.id));

      if (data) {
        const monitoringMap = new Map<string, EventMonitoring>();
        data.forEach((m: EventMonitoring) => {
          monitoringMap.set(m.event_id, m);
        });
        setMonitoring(monitoringMap);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    }
  }, [liveEvents]);

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchMonitoring]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([onRefresh(), fetchMonitoring()]);
    setRefreshing(false);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBitrateStatus = (kbps: number | null) => {
    if (!kbps) return { status: 'unknown', color: 'bg-muted' };
    if (kbps >= 4000) return { status: 'excellent', color: 'bg-green-500' };
    if (kbps >= 2500) return { status: 'good', color: 'bg-blue-500' };
    if (kbps >= 1500) return { status: 'fair', color: 'bg-yellow-500' };
    return { status: 'poor', color: 'bg-red-500' };
  };

  if (liveEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Radio className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No hay transmisiones en vivo</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cuando haya eventos en vivo, podrás monitorearlos aquí.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Actualizar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="animate-pulse">
            <Radio className="h-3 w-3 mr-1" />
            {liveEvents.length} EN VIVO
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Live Events Grid */}
      <div className="grid gap-6">
        {liveEvents.map((event) => {
          const mon = monitoring.get(event.id);
          const bitrateInfo = getBitrateStatus(mon?.bitrate_kbps || null);

          return (
            <Card key={event.id} className="border-red-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                      {event.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {event.client?.name || 'Sin cliente'}
                    </CardDescription>
                  </div>
                  <Badge variant="destructive" className="animate-pulse">
                    EN VIVO
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Eye className="h-4 w-4" />
                      Espectadores
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {mon?.current_viewers || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pico: {mon?.peak_viewers || 0}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      Duración
                    </div>
                    <p className="text-2xl font-bold mt-1 font-mono">
                      {formatDuration(mon?.total_duration_seconds || 0)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <TrendingUp className="h-4 w-4" />
                      Bitrate
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">
                        {mon?.bitrate_kbps ? `${(mon.bitrate_kbps / 1000).toFixed(1)}` : '—'}
                      </p>
                      <span className="text-sm text-muted-foreground">Mbps</span>
                    </div>
                    <div className={cn("h-1 w-full rounded-full mt-2", bitrateInfo.color)} />
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Activity className="h-4 w-4" />
                      Calidad
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {mon?.resolution || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mon?.fps ? `${mon.fps} FPS` : '—'}
                    </p>
                  </div>
                </div>

                {/* Destination Status */}
                {mon?.destination_statuses && mon.destination_statuses.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Destinos</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {mon.destination_statuses.map((dest, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border",
                            dest.status === 'connected' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                          )}
                        >
                          {PLATFORM_ICONS[dest.platform.toLowerCase()] || <Radio className="h-4 w-4" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate capitalize">{dest.platform}</p>
                            <p className="text-xs text-muted-foreground">{dest.viewers} viewers</p>
                          </div>
                          {dest.status === 'connected' ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Heartbeat Status */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Última señal: {mon?.last_heartbeat_at ? new Date(mon.last_heartbeat_at).toLocaleTimeString() : 'N/A'}
                  </div>
                  {mon?.last_heartbeat_at && (
                    <Badge 
                      variant={
                        Date.now() - new Date(mon.last_heartbeat_at).getTime() < 30000 
                          ? 'default' 
                          : 'destructive'
                      }
                    >
                      {Date.now() - new Date(mon.last_heartbeat_at).getTime() < 30000 
                        ? 'Conectado' 
                        : 'Sin respuesta'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Scheduled Events Preview */}
      {events.filter(e => e.status === 'scheduled').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.filter(e => e.status === 'scheduled').slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.scheduled_at ? new Date(event.scheduled_at).toLocaleString() : 'Sin fecha'}
                    </p>
                  </div>
                  <Badge variant="outline">Programado</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Label component for internal use
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm font-medium", className)}>{children}</p>;
}
