import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Video, Settings2, Wallet, Loader2, Shield } from 'lucide-react';
import { useKreoonLive } from '@/hooks/useKreoonLive';
import { AdminPlatformHoursPanel } from '@/components/live-streaming/tabs/AdminPlatformHoursPanel';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function LiveStreamingPlatformSection() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  const {
    loading,
    stats,
    purchases,
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

      {/* Admin Panel for Selling Hours */}
      <AdminPlatformHoursPanel 
        onAddHours={addPlatformHoursToOrg}
        purchases={purchases}
      />

      {/* API Configuration Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración de Proveedores
          </CardTitle>
          <CardDescription>
            Configura las APIs de streaming (Restream, Watchity, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Configuración de proveedores próximamente</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seguridad y Límites
          </CardTitle>
          <CardDescription>
            Configura límites y políticas de uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Máx. horas por evento</p>
              <p className="text-xl font-bold">4h</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Eventos simultáneos por org</p>
              <p className="text-xl font-bold">3</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
