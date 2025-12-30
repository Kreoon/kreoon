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

      {/* Restream Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-500" />
            Configuración de Restream
          </CardTitle>
          <CardDescription>
            Configura la API de Restream para el MVP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Ingresa tu Restream API Key"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled
                />
                <Badge variant="secondary">Pendiente</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtén tu API Key en{' '}
                <a 
                  href="https://developers.restream.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  developers.restream.io
                </a>
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de Conexión</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm">No configurado</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Funcionalidades disponibles con Restream:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Multi-streaming a múltiples plataformas</li>
              <li>• Gestión de canales desde la plataforma</li>
              <li>• Monitoreo de streams en tiempo real</li>
              <li>• Programación de eventos</li>
            </ul>
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
