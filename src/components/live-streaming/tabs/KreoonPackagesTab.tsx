import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Package, Clock } from 'lucide-react';
import { LivePackage } from '@/hooks/useKreoonLive';

interface KreoonPackagesTabProps {
  packages: LivePackage[];
  onSave: (pkg: Partial<LivePackage>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KreoonPackagesTab({ packages, onSave, onDelete }: KreoonPackagesTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<LivePackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hours_included: 5,
    price: 0,
    currency: 'COP',
    validity_days: 30,
    is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setFormData({
      name: '',
      description: '',
      hours_included: 5,
      price: 0,
      currency: 'COP',
      validity_days: 30,
      is_active: true,
    });
    setShowDialog(true);
  };

  const openEdit = (pkg: LivePackage) => {
    setEditing(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      hours_included: pkg.hours_included,
      price: pkg.price,
      currency: pkg.currency,
      validity_days: pkg.validity_days,
      is_active: pkg.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    await onSave({
      id: editing?.id,
      ...formData,
    });
    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este paquete?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Paquetes de Horas Live
              </CardTitle>
              <CardDescription>
                Define los paquetes de horas que puedes vender a tus clientes
              </CardDescription>
            </div>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Paquete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin paquetes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer paquete de horas para vender a clientes
              </p>
              <Button onClick={openNew}>Crear Paquete</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Validez</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pkg.name}</div>
                        {pkg.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {pkg.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {pkg.hours_included}h
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {pkg.currency} ${pkg.price.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>{pkg.validity_days} días</TableCell>
                    <TableCell>
                      <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                        {pkg.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Paquete' : 'Nuevo Paquete'}</DialogTitle>
            <DialogDescription>
              Define las características del paquete de horas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Paquete</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Paquete Básico"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del paquete..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas Incluidas</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.hours_included}
                  onChange={(e) => setFormData({ ...formData, hours_included: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Validez (días)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Paquete Activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              {editing ? 'Guardar Cambios' : 'Crear Paquete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
