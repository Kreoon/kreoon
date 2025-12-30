import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Video, Eye, Package, Users, Link2, Calendar, UserCheck, CreditCard, Loader2 } from 'lucide-react';

// Hooks
import { useKreoonLive } from '@/hooks/useKreoonLive';
import { useLiveStreaming } from '@/hooks/useLiveStreaming';
import { supabase } from '@/integrations/supabase/client';

// Tab Components
import { KreoonOverviewTab } from '@/components/live-streaming/tabs/KreoonOverviewTab';
import { KreoonPackagesTab } from '@/components/live-streaming/tabs/KreoonPackagesTab';
import { KreoonClientsTab } from '@/components/live-streaming/tabs/KreoonClientsTab';
import { KreoonChannelsTab } from '@/components/live-streaming/tabs/KreoonChannelsTab';
import { KreoonEventsTab } from '@/components/live-streaming/tabs/KreoonEventsTab';
import { KreoonCreatorsTab } from '@/components/live-streaming/tabs/KreoonCreatorsTab';
import { KreoonBillingTab } from '@/components/live-streaming/tabs/KreoonBillingTab';

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function LiveStreamingSection() {
  const [activeTab, setActiveTab] = useState('overview');
  const [creators, setCreators] = useState<Creator[]>([]);

  // KREOON Live hook (new system)
  const {
    loading: kreoonLoading,
    stats,
    packages,
    clientsWithWallets,
    purchases,
    assignments,
    usageLogs,
    eventCreators,
    isPlatformEnabled,
    isOrgEnabled,
    isAdmin,
    organizationId,
    toggleFeatureFlag,
    savePackage,
    deletePackage,
    assignHoursToClient,
    addPlatformHoursToOrg,
    assignCreatorToEvent,
    updateCreatorStatus,
    removeCreatorFromEvent,
    canClientStartLive,
    consumeLiveHours,
    fetchData: fetchKreoonData,
  } = useKreoonLive();

  // Legacy streaming hook (for events, accounts, etc.)
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
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleToggleOrgLive = async (enabled: boolean) => {
    if (organizationId) {
      await toggleFeatureFlag('organization', organizationId, enabled);
    }
  };

  const handleToggleClientLive = async (clientId: string, enabled: boolean) => {
    await toggleFeatureFlag('client', clientId, enabled);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            KREOON Live Streaming
          </h2>
          <p className="text-muted-foreground">
            Gestiona transmisiones en vivo con sistema de horas prepagadas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Habilitar Live:</span>
            <Switch checked={isOrgEnabled} onCheckedChange={handleToggleOrgLive} />
          </div>
          <Badge variant={isOrgEnabled ? 'default' : 'secondary'}>
            {isOrgEnabled ? 'Activo' : 'Inactivo'}
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="gap-2 text-xs">
            <Eye className="h-3 w-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2 text-xs">
            <Package className="h-3 w-3" />
            Paquetes
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2 text-xs">
            <Users className="h-3 w-3" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2 text-xs">
            <Link2 className="h-3 w-3" />
            Canales
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-2 text-xs">
            <UserCheck className="h-3 w-3" />
            Creadores
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 text-xs">
            <CreditCard className="h-3 w-3" />
            Facturación
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
            isPlatformEnabled={isPlatformEnabled}
            isOrgEnabled={isOrgEnabled}
            isAdmin={isAdmin || false}
            purchases={purchases}
            onAddPlatformHours={addPlatformHoursToOrg}
          />
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <KreoonPackagesTab
            packages={packages}
            onSave={savePackage}
            onDelete={deletePackage}
          />
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <KreoonClientsTab
            clients={clientsWithWallets}
            packages={packages}
            onToggleClientLive={handleToggleClientLive}
            onAssignHours={assignHoursToClient}
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

        {/* Billing Tab */}
        <TabsContent value="billing">
          <KreoonBillingTab
            stats={stats}
            purchases={purchases}
            assignments={assignments}
            usageLogs={usageLogs}
            isAdmin={isAdmin || false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
