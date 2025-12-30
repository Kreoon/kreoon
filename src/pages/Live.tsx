import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar, Users, Link2, Activity, Loader2 } from 'lucide-react';

// Hooks
import { useKreoonLive } from '@/hooks/useKreoonLive';
import { useLiveStreaming } from '@/hooks/useLiveStreaming';
import { supabase } from '@/integrations/supabase/client';

// Tab Components
import { KreoonOverviewTab } from '@/components/live-streaming/tabs/KreoonOverviewTab';
import { KreoonEventsTab } from '@/components/live-streaming/tabs/KreoonEventsTab';
import { KreoonCreatorsTab } from '@/components/live-streaming/tabs/KreoonCreatorsTab';
import { KreoonChannelsTab } from '@/components/live-streaming/tabs/KreoonChannelsTab';

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function Live() {
  const [activeTab, setActiveTab] = useState('overview');
  const [creators, setCreators] = useState<Creator[]>([]);

  // KREOON Live hook
  const {
    loading: kreoonLoading,
    stats,
    eventCreators,
    isOrgEnabled,
    organizationId,
    assignCreatorToEvent,
    updateCreatorStatus,
    removeCreatorFromEvent,
    canClientStartLive,
    consumeLiveHours,
  } = useKreoonLive();

  // Legacy streaming hook
  const {
    loading: streamingLoading,
    accounts,
    events,
    fetchData: fetchStreamingData,
    saveAccount,
    deleteAccount,
    saveEvent,
    updateEventStatus,
    deleteEvent,
  } = useLiveStreaming();

  // Fetch creators
  useEffect(() => {
    const fetchCreators = async () => {
      if (!organizationId) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(100);
      
      if (data) {
        setCreators(data as Creator[]);
      }
    };
    
    fetchCreators();
  }, [organizationId]);

  const loading = kreoonLoading || streamingLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOrgEnabled) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[60vh]">
        <Video className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">KREOON Live no está habilitado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Tu organización no tiene acceso a KREOON Live Streaming. 
          Contacta al administrador de la plataforma para habilitarlo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            KREOON Live
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus transmisiones en vivo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="gap-1">
            <Activity className="h-3 w-3" />
            Activo
          </Badge>
          {stats.organizationHours.available > 0 && (
            <Badge variant="outline" className="gap-1">
              {stats.organizationHours.available.toFixed(1)}h disponibles
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-2">
            <Users className="h-4 w-4" />
            Creadores
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Link2 className="h-4 w-4" />
            Canales
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <KreoonOverviewTab 
            stats={{
              ...stats,
              upcomingEvents: events.filter(e => e.status === 'scheduled').length,
              liveNow: events.filter(e => e.status === 'live').length,
            }}
            isPlatformEnabled={true}
            isOrgEnabled={isOrgEnabled}
            isAdmin={false}
          />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <KreoonEventsTab
            events={events}
            accounts={accounts}
            onSave={saveEvent}
            onUpdateStatus={updateEventStatus}
            onDelete={deleteEvent}
            canClientStartLive={canClientStartLive}
            onConsumeHours={consumeLiveHours}
          />
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators">
          <KreoonCreatorsTab
            events={events}
            eventCreators={eventCreators}
            availableCreators={creators}
            onAssign={assignCreatorToEvent}
            onConfirm={updateCreatorStatus}
            onRemove={removeCreatorFromEvent}
          />
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <KreoonChannelsTab
            accounts={accounts}
            onRefresh={fetchStreamingData}
            onDelete={deleteAccount}
            onSave={saveAccount}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
