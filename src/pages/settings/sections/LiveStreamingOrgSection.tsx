import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Video, Package, Users, Clock, Loader2, Building2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Hooks
import { useKreoonLive } from '@/hooks/useKreoonLive';

// Tab Components
import { KreoonPackagesTab } from '@/components/live-streaming/tabs/KreoonPackagesTab';
import { KreoonClientsTab } from '@/components/live-streaming/tabs/KreoonClientsTab';
import { KreoonBillingTab } from '@/components/live-streaming/tabs/KreoonBillingTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LiveStreamingOrgSection() {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    loading,
    stats,
    packages,
    clientsWithWallets,
    purchases,
    assignments,
    usageLogs,
    isOrgEnabled,
    organizationId,
    toggleFeatureFlag,
    savePackage,
    deletePackage,
    assignHoursToClient,
  } = useKreoonLive();

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

  const orgHoursPercent = stats.organizationHours.total > 0 
    ? ((stats.organizationHours.available / stats.organizationHours.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            KREOON Live - Configuración Organización
          </h2>
          <p className="text-muted-foreground">
            Gestiona paquetes y asigna horas a tus clientes
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

      {/* Organization Hours Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horas Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.organizationHours.available.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.organizationHours.total.toFixed(1)}h compradas
            </p>
            <Progress value={orgHoursPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Paquetes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {packages.filter(p => p.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {packages.length} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes con Live
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.activeClients}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.totalClients} clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Horas Asignadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {assignments.reduce((sum, a) => sum + a.hours_assigned, 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              a clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="h-4 w-4" />
            Paquetes
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <Clock className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

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

        {/* Billing Tab */}
        <TabsContent value="billing">
          <KreoonBillingTab
            stats={stats}
            purchases={purchases}
            assignments={assignments}
            usageLogs={usageLogs}
            isAdmin={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
