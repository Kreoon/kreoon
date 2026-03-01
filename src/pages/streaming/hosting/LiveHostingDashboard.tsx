import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Store,
  Briefcase,
  Building2,
  Video,
  Calendar,
  DollarSign,
  Users,
  Loader2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  useLiveHostingRequests,
  useOrgLiveManagement,
  useMarketplaceHostingFeed,
} from '@/hooks/useLiveHosting';
import { useAuth } from '@/hooks/useAuth';
import { RequestCard } from '@/components/streaming/hosting';
import type { HostingChannel } from '@/types/live-hosting.types';
import {
  HOSTING_CHANNEL_LABELS,
  HOSTING_REQUEST_STATUS_LABELS,
} from '@/types/live-hosting.types';

export default function LiveHostingDashboard() {
  const navigate = useNavigate();
  const { user, profile, organizationId, roles } = useAuth();
  const [activeTab, setActiveTab] = useState<'brand' | 'host'>('brand');

  const isCreator = roles?.includes('creator');
  const isBrand = roles?.includes('admin') || roles?.includes('team_leader') || roles?.includes('client');

  // Brand/Org view
  const { requests, isLoading: requestsLoading } = useLiveHostingRequests(organizationId || undefined);
  const { orgRequests, isLoading: orgLoading } = useOrgLiveManagement(organizationId || undefined);

  // Host view
  const { requests: myHostings, isLoading: myHostingsLoading } = useLiveHostingRequests(undefined, {
    asHost: true,
  });
  const { openRequests, isLoading: feedLoading } = useMarketplaceHostingFeed();

  // Stats
  const stats = {
    total: requests.length,
    active: requests.filter((r) => ['open', 'reviewing', 'negotiating', 'confirmed', 'in_progress'].includes(r.status)).length,
    completed: requests.filter((r) => r.status === 'completed').length,
    totalRevenue: requests
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + (r.actual_revenue_usd || 0), 0),
  };

  const handleNewRequest = (channel?: HostingChannel) => {
    const path = channel ? `/streaming/hosting/new?channel=${channel}` : '/streaming/hosting/new';
    navigate(path);
  };

  const handleViewRequest = (requestId: string) => {
    navigate(`/streaming/hosting/${requestId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Live Hosting</h1>
          <p className="text-muted-foreground">
            Contrata hosts para tus transmisiones en vivo
          </p>
        </div>

        {isBrand && (
          <Button onClick={() => handleNewRequest()}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Button>
        )}
      </div>

      {/* View toggle for users with both roles */}
      {isCreator && isBrand && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'brand' | 'host')}>
          <TabsList>
            <TabsTrigger value="brand">
              <Building2 className="h-4 w-4 mr-2" />
              Vista Marca/Org
            </TabsTrigger>
            <TabsTrigger value="host">
              <Video className="h-4 w-4 mr-2" />
              Vista Host
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Brand/Org View */}
      {(activeTab === 'brand' || !isCreator) && isBrand && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Solicitudes</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Activas</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </div>
                  <Video className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completadas</p>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue Total</p>
                    <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleNewRequest('marketplace')}
            >
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Store className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Marketplace</h3>
                  <p className="text-sm text-muted-foreground">Publica y recibe aplicaciones</p>
                </div>
                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleNewRequest('direct')}
            >
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Invitación Directa</h3>
                  <p className="text-sm text-muted-foreground">Invita a un creador específico</p>
                </div>
                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleNewRequest('org_managed')}
            >
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Gestión Interna</h3>
                  <p className="text-sm text-muted-foreground">Asigna un creador de tu equipo</p>
                </div>
                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Request list */}
          <Card>
            <CardHeader>
              <CardTitle>Mis Solicitudes</CardTitle>
              <CardDescription>
                Todas las solicitudes de hosting de tu organización
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No tienes solicitudes</h3>
                  <p className="text-muted-foreground mb-4">
                    Crea tu primera solicitud de hosting para contratar un host
                  </p>
                  <Button onClick={() => handleNewRequest()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Solicitud
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {requests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onClick={() => handleViewRequest(request.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Host View */}
      {(activeTab === 'host' || !isBrand) && isCreator && (
        <>
          {/* My hostings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mis Trabajos como Host
              </CardTitle>
              <CardDescription>
                Lives donde has sido contratado como host
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myHostingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : myHostings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aún no has sido contratado como host
                </p>
              ) : (
                <div className="space-y-3">
                  {myHostings.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      compact
                      onClick={() => handleViewRequest(request.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketplace feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Oportunidades de Hosting
              </CardTitle>
              <CardDescription>
                Solicitudes abiertas donde puedes aplicar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : openRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay solicitudes abiertas en este momento
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {openRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onClick={() => handleViewRequest(request.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
