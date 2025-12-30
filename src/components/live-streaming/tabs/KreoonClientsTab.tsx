import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Clock, Plus, Video, Calendar } from 'lucide-react';
import { ClientWithWallet, LivePackage } from '@/hooks/useKreoonLive';

interface KreoonClientsTabProps {
  clients: ClientWithWallet[];
  packages: LivePackage[];
  onToggleClientLive: (clientId: string, enabled: boolean) => Promise<void>;
  onAssignHours: (clientId: string, hours: number, packageId?: string, expiresAt?: string) => Promise<void>;
}

export function KreoonClientsTab({ 
  clients, 
  packages, 
  onToggleClientLive, 
  onAssignHours 
}: KreoonClientsTabProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithWallet | null>(null);
  const [assignForm, setAssignForm] = useState({
    packageId: '',
    customHours: 0,
    usePackage: true,
  });

  const openAssignDialog = (client: ClientWithWallet) => {
    setSelectedClient(client);
    setAssignForm({
      packageId: packages[0]?.id || '',
      customHours: 5,
      usePackage: true,
    });
    setShowAssignDialog(true);
  };

  const handleAssign = async () => {
    if (!selectedClient) return;

    const selectedPackage = packages.find(p => p.id === assignForm.packageId);
    const hours = assignForm.usePackage && selectedPackage 
      ? selectedPackage.hours_included 
      : assignForm.customHours;

    const expiresAt = assignForm.usePackage && selectedPackage
      ? new Date(Date.now() + selectedPackage.validity_days * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    await onAssignHours(
      selectedClient.id, 
      hours,
      assignForm.usePackage ? assignForm.packageId : undefined,
      expiresAt
    );
    setShowAssignDialog(false);
  };

  const activePackages = packages.filter(p => p.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes con Live
              </CardTitle>
              <CardDescription>
                Gestiona el acceso de clientes al módulo Live Streaming
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin clientes</h3>
              <p className="text-sm text-muted-foreground">
                No hay clientes en esta organización
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Horas Disponibles</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Live Habilitado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const availableHours = client.wallet?.available_hours || 0;
                  const totalHours = client.wallet?.total_hours || 0;
                  const hoursPercent = totalHours > 0 ? (availableHours / totalHours) * 100 : 0;

                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={client.logo_url || undefined} />
                            <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.wallet ? (
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{availableHours.toFixed(1)}h</span>
                              <span className="text-xs text-muted-foreground">
                                / {totalHours.toFixed(1)}h
                              </span>
                            </div>
                            <Progress value={hoursPercent} className="h-1.5" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin horas</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {client.total_events}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={client.live_enabled}
                          onCheckedChange={(checked) => onToggleClientLive(client.id, checked)}
                          disabled={!client.wallet || availableHours <= 0}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openAssignDialog(client)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Asignar Horas
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Hours Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Horas de Live</DialogTitle>
            <DialogDescription>
              Asignar horas a: {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={assignForm.usePackage}
                onCheckedChange={(checked) => setAssignForm({ ...assignForm, usePackage: checked })}
              />
              <Label>Usar paquete predefinido</Label>
            </div>

            {assignForm.usePackage ? (
              <div className="space-y-2">
                <Label>Seleccionar Paquete</Label>
                {activePackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay paquetes activos. Crea uno en la pestaña "Paquetes".
                  </p>
                ) : (
                  <Select
                    value={assignForm.packageId}
                    onValueChange={(value) => setAssignForm({ ...assignForm, packageId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un paquete" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          <div className="flex items-center gap-2">
                            <span>{pkg.name}</span>
                            <Badge variant="outline">{pkg.hours_included}h</Badge>
                            <span className="text-muted-foreground">
                              ${pkg.price.toLocaleString()} {pkg.currency}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Horas a asignar</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={assignForm.customHours}
                  onChange={(e) => setAssignForm({ ...assignForm, customHours: Number(e.target.value) })}
                />
              </div>
            )}

            {selectedClient?.wallet && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">
                  <strong>Horas actuales del cliente:</strong>{' '}
                  {selectedClient.wallet.available_hours.toFixed(1)}h disponibles
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={assignForm.usePackage && !assignForm.packageId}
            >
              Asignar Horas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
