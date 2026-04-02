/**
 * StreamingHubPage - Página principal del módulo Streaming V2
 * Hub profesional de Live Streaming + Live Shopping
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Radio,
  Calendar,
  Settings,
  BarChart3,
  Plus,
  Tv,
  ShoppingBag,
} from 'lucide-react';

// Streaming V2 hooks
import { useStreamingSession } from '@/hooks/useStreamingSession';
import { useStreamingChannels } from '@/hooks/useStreamingChannels';

// Streaming V2 components
import {
  StreamingSessionList,
  CreateSessionWizard,
  LiveAnalyticsDashboard,
} from '@/components/streaming-v2';

type TabValue = 'sessions' | 'analytics' | 'channels';

export function StreamingHubPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('sessions');
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  // Organization ID
  const organizationId = profile?.current_organization_id;

  // Hooks
  const {
    sessions,
    isLoading: sessionsLoading,
    createSession,
    startSession,
    pauseSession,
    stopSession,
    deleteSession,
  } = useStreamingSession(organizationId || '');

  const {
    channels,
    isLoading: channelsLoading,
  } = useStreamingChannels(organizationId || '');

  // Handle session creation
  const handleCreateSession = useCallback(async (data: Parameters<typeof createSession>[0]) => {
    try {
      const session = await createSession(data);
      toast({
        title: 'Sesión creada',
        description: data.scheduled_at
          ? 'Tu live ha sido programado'
          : 'Tu live está listo para iniciar',
      });
      // If not scheduled, navigate to live studio
      if (!data.scheduled_at && session) {
        navigate(`/streaming/studio/${session.id}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la sesión',
        variant: 'destructive',
      });
    }
  }, [createSession, toast, navigate]);

  // Handle session actions
  const handleStartSession = useCallback(async (sessionId: string) => {
    try {
      await startSession(sessionId);
      navigate(`/streaming/studio/${sessionId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la sesión',
        variant: 'destructive',
      });
    }
  }, [startSession, navigate, toast]);

  const handleStopSession = useCallback(async (sessionId: string) => {
    try {
      await stopSession(sessionId);
      toast({
        title: 'Sesión finalizada',
        description: 'Tu live ha terminado',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo detener la sesión',
        variant: 'destructive',
      });
    }
  }, [stopSession, toast]);

  const handleSelectSession = useCallback((session: { id: string; status: string }) => {
    if (session.status === 'live' || session.status === 'paused') {
      navigate(`/streaming/studio/${session.id}`);
    } else if (session.status === 'ended') {
      navigate(`/streaming/recap/${session.id}`);
    } else {
      // For draft/scheduled, go to edit
      navigate(`/streaming/studio/${session.id}`);
    }
  }, [navigate]);

  // Calculate stats for analytics
  const analyticsData = useMemo(() => {
    const endedSessions = sessions.filter((s) => s.status === 'ended');
    return {
      totalSessions: endedSessions.length,
      totalRevenue: endedSessions.reduce((sum, s) => sum + (s.total_revenue_usd || 0), 0),
      totalViewers: endedSessions.reduce((sum, s) => sum + (s.peak_viewers || 0), 0),
      totalMessages: endedSessions.reduce((sum, s) => sum + (s.total_messages || 0), 0),
    };
  }, [sessions]);

  // Find active live session
  const liveSession = sessions.find((s) => s.status === 'live');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tv className="h-8 w-8 text-primary" />
            Streaming Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus transmisiones en vivo y live shopping
          </p>
        </div>

        <div className="flex items-center gap-3">
          {liveSession && (
            <Button
              variant="destructive"
              onClick={() => navigate(`/streaming/studio/${liveSession.id}`)}
              className="animate-pulse"
            >
              <Radio className="mr-2 h-4 w-4" />
              EN VIVO
            </Button>
          )}
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Live
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      {!liveSession && sessions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickStat
            label="Sesiones totales"
            value={analyticsData.totalSessions}
            icon={Calendar}
            color="blue"
          />
          <QuickStat
            label="Viewers acumulados"
            value={analyticsData.totalViewers}
            icon={Radio}
            color="purple"
          />
          <QuickStat
            label="Mensajes recibidos"
            value={analyticsData.totalMessages}
            icon={Settings}
            color="green"
          />
          <QuickStat
            label="Ventas totales"
            value={`$${analyticsData.totalRevenue.toFixed(0)}`}
            icon={ShoppingBag}
            color="yellow"
          />
        </div>
      )}

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="sessions" className="gap-2">
            <Radio className="h-4 w-4" />
            Sesiones
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Settings className="h-4 w-4" />
            Canales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <StreamingSessionList
            sessions={sessions}
            isLoading={sessionsLoading}
            onCreateSession={() => setShowCreateWizard(true)}
            onStartSession={handleStartSession}
            onPauseSession={pauseSession}
            onStopSession={handleStopSession}
            onDeleteSession={deleteSession}
            onSelectSession={handleSelectSession}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Sin datos de analytics</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Realiza tu primer live para ver estadísticas
              </p>
            </div>
          ) : (
            <LiveAnalyticsDashboard
              analytics={[]}
              currentViewers={liveSession?.total_viewers || 0}
              peakViewers={analyticsData.totalViewers}
              totalMessages={analyticsData.totalMessages}
              totalRevenue={analyticsData.totalRevenue}
            />
          )}
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channelsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 rounded-sm bg-muted animate-pulse" />
              ))
            ) : channels.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Sin canales configurados</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configura tus canales de transmisión para empezar
                </p>
                <Button className="mt-4" onClick={() => navigate('/streaming/settings')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Configurar Canales
                </Button>
              </div>
            ) : (
              channels.map((channel) => (
                <div
                  key={channel.id}
                  className="rounded-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate('/streaming/settings')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center">
                      <Tv className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {channel.platform_display_name || channel.platform}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {channel.platform}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {channel.max_resolution} • {channel.max_bitrate} kbps
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create session wizard */}
      <CreateSessionWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        onSubmit={handleCreateSession}
        channels={channels}
        isLoading={false}
      />
    </div>
  );
}

// Quick stat component
interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'yellow';
}

function QuickStat({ label, value, icon: Icon, color }: QuickStatProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <div className="rounded-sm border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={cn('rounded-sm p-2', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default StreamingHubPage;
