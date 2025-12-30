import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LiveHourPurchase, LiveHourAssignment, LiveUsageLog, KreoonLiveStats } from '@/hooks/useKreoonLive';

interface KreoonBillingTabProps {
  stats: KreoonLiveStats;
  purchases: LiveHourPurchase[];
  assignments: LiveHourAssignment[];
  usageLogs: LiveUsageLog[];
  isAdmin: boolean;
}

export function KreoonBillingTab({ 
  stats, 
  purchases, 
  assignments, 
  usageLogs,
  isAdmin 
}: KreoonBillingTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-green-500" />
              Horas Compradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.organizationHours.total.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Total adquirido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
              Horas Asignadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.organizationHours.used.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">A clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Por ventas de paquetes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Compras ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Asignaciones ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <History className="h-4 w-4" />
            Consumo ({usageLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Historial de Compras
              </CardTitle>
              <CardDescription>
                Compras de horas realizadas a KREOON
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay compras registradas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {format(new Date(purchase.purchased_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{purchase.hours_purchased}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {purchase.currency} ${purchase.price_paid.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {purchase.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Asignaciones a Clientes
              </CardTitle>
              <CardDescription>
                Horas asignadas de la organización a clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay asignaciones registradas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Horas Asignadas</TableHead>
                      <TableHead>Restantes</TableHead>
                      <TableHead>Expira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          {format(new Date(assignment.assigned_at), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {assignment.client?.name || 'Cliente'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {assignment.hours_assigned}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={assignment.hours_remaining <= 1 ? 'text-destructive font-medium' : ''}>
                            {assignment.hours_remaining}h
                          </span>
                        </TableCell>
                        <TableCell>
                          {assignment.expires_at 
                            ? format(new Date(assignment.expires_at), "dd/MM/yyyy", { locale: es })
                            : 'Sin expiración'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Logs de Consumo
              </CardTitle>
              <CardDescription>
                Registro de horas consumidas por eventos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay registros de consumo
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Horas Consumidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.logged_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.event_id}
                        </TableCell>
                        <TableCell>
                          {log.duration_minutes} min
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {log.hours_consumed.toFixed(2)}h
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
