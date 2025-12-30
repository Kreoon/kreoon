import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Video, Settings2, Wallet, Loader2, Shield, Activity, CreditCard } from 'lucide-react';
import { useKreoonLive } from '@/hooks/useKreoonLive';
import { AdminPlatformHoursPanel } from '@/components/live-streaming/tabs/AdminPlatformHoursPanel';
import { LivePlatformConfigTab } from '@/components/live-streaming/tabs/LivePlatformConfigTab';
import { KreoonBillingTab } from '@/components/live-streaming/tabs/KreoonBillingTab';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function LiveStreamingPlatformSection() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  const [activeTab, setActiveTab] = useState('overview');

  const {
    loading,
    stats,
    purchases,
    assignments,
    usageLogs,
    isPlatformEnabled,
    toggleFeatureFlag,
    addPlatformHoursToOrg,
  } = useKreoonLive();

  // Fetch all organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .order('name');
      
      if (data) {
        setOrganizations(data);
      }
    };
    
    fetchOrganizations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleTogglePlatform = async (enabled: boolean) => {
    await toggleFeatureFlag('platform', 'global', enabled);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            KREOON Live - Configuración Plataforma
          </h2>
          <p className="text-muted-foreground">
            Configuración global y venta de horas a organizaciones
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Habilitar Globalmente:</span>
            <Switch checked={isPlatformEnabled} onCheckedChange={handleTogglePlatform} />
          </div>
          <Badge variant={isPlatformEnabled ? 'default' : 'secondary'}>
            {isPlatformEnabled ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Horas Vendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.platformHours.used.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizaciones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {organizations.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {purchases.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Wallet className="h-4 w-4" />
            Venta de Horas
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuración API
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <Activity className="h-4 w-4" />
            Monitoreo
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Facturación
          </TabsTrigger>
        </TabsList>

        {/* Overview - Admin Panel for Selling Hours */}
        <TabsContent value="overview">
          <AdminPlatformHoursPanel 
            onAddHours={addPlatformHoursToOrg}
            purchases={purchases}
          />
        </TabsContent>

        {/* Config Tab - Restream API Configuration */}
        <TabsContent value="config">
          <LivePlatformConfigTab />
        </TabsContent>

        {/* Monitoring Tab - placeholder in settings, actual monitoring is in Live page */}
        <TabsContent value="monitoring">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Monitoreo Global</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ve a la sección Live para monitorear eventos en tiempo real.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <KreoonBillingTab
            stats={stats}
            purchases={purchases}
            assignments={assignments}
            usageLogs={usageLogs}
            isAdmin={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
