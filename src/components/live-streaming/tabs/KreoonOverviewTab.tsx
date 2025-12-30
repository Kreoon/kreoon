import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Calendar, TrendingUp, Activity, Wallet } from 'lucide-react';
import { KreoonLiveStats } from '@/hooks/useKreoonLive';

interface KreoonOverviewTabProps {
  stats: KreoonLiveStats;
  isPlatformEnabled: boolean;
  isOrgEnabled: boolean;
  isAdmin: boolean;
}

export function KreoonOverviewTab({ stats, isPlatformEnabled, isOrgEnabled, isAdmin }: KreoonOverviewTabProps) {
  const orgHoursPercent = stats.organizationHours.total > 0 
    ? ((stats.organizationHours.available / stats.organizationHours.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Status Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={isPlatformEnabled ? 'default' : 'secondary'}>
          Plataforma: {isPlatformEnabled ? 'Activo' : 'Inactivo'}
        </Badge>
        <Badge variant={isOrgEnabled ? 'default' : 'secondary'}>
          Organización: {isOrgEnabled ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organization Hours */}
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
              de {stats.organizationHours.total.toFixed(1)}h totales
            </p>
            <Progress value={orgHoursPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Used Hours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Horas Usadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.organizationHours.used.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.organizationHours.total > 0 
                ? `${((stats.organizationHours.used / stats.organizationHours.total) * 100).toFixed(0)}% consumido`
                : 'Sin horas asignadas'}
            </p>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.activeClients}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.totalClients} clientes totales
            </p>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.upcomingEvents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              próximos programados
            </p>
            {stats.liveNow > 0 && (
              <Badge variant="destructive" className="mt-2">
                {stats.liveNow} EN VIVO
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Estadísticas de Plataforma
            </CardTitle>
            <CardDescription>Vista global para administradores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Horas Totales (Plataforma)</p>
                <p className="text-2xl font-bold">{stats.platformHours.total.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Vendidas</p>
                <p className="text-2xl font-bold">{stats.platformHours.used.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumen Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.totalClients}</p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.activeClients}</p>
              <p className="text-xs text-muted-foreground">Con Live Activo</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
              <p className="text-xs text-muted-foreground">Eventos Próximos</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 text-red-600">
              <p className="text-2xl font-bold">{stats.liveNow}</p>
              <p className="text-xs">En Vivo Ahora</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
