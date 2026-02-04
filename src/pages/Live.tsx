import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Video, Calendar, Users, Activity, Loader2 } from 'lucide-react';

// Hooks
import { useKreoonLive } from '@/hooks/useKreoonLive';
import { useLiveStreaming } from '@/hooks/useLiveStreaming';
import { supabase } from '@/integrations/supabase/client';

// Tab Components
import { KreoonOverviewTab } from '@/components/live-streaming/tabs/KreoonOverviewTab';
import { KreoonEventsTab } from '@/components/live-streaming/tabs/KreoonEventsTab';
import { KreoonCreatorsTab } from '@/components/live-streaming/tabs/KreoonCreatorsTab';

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
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Page Header - Kreoon Tech */}
        <PageHeader
          icon={Video}
          title="Kreoon Live"
          subtitle="Gestiona tus transmisiones en vivo"
          badge={stats.organizationHours.available > 0 ? {
            text: `${stats.organizationHours.available.toFixed(1)}h disponibles`,
            variant: 'glow'
          } : undefined}
          action={
            <Badge variant="default" className="gap-1">
              <Activity className="h-3 w-3" />
              Activo
            </Badge>
          }
        />

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
      </Tabs>
      </div>
    </div>
  );
}
