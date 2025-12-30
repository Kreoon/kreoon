import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, DollarSign, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

interface AdminPlatformHoursPanelProps {
  onAddHours: (orgId: string, hours: number, price: number, currency: string, notes?: string) => Promise<void>;
  purchases: Array<{
    id: string;
    buyer_id: string;
    hours_purchased: number;
    price_paid: number;
    currency: string;
    purchased_at: string;
    notes: string | null;
  }>;
}

export function AdminPlatformHoursPanel({ onAddHours, purchases }: AdminPlatformHoursPanelProps) {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [selectedOrg, setSelectedOrg] = useState('');
  const [hours, setHours] = useState('10');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [notes, setNotes] = useState('');

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

  const handleSubmit = async () => {
    if (!selectedOrg || !hours || !price) {
      toast({
        title: 'Campos requeridos',
        description: 'Selecciona una organización y completa horas y precio',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await onAddHours(
        selectedOrg,
        parseFloat(hours),
        parseFloat(price),
        currency,
        notes || undefined
      );
      setDialogOpen(false);
      setSelectedOrg('');
      setHours('10');
      setPrice('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  // Get org name by id
  const getOrgName = (orgId: string) => {
    return organizations.find(o => o.id === orgId)?.name || orgId;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Venta de Horas a Organizaciones
            </CardTitle>
            <CardDescription>
              Administra la venta de horas de live streaming desde la plataforma
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Vender Horas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vender Horas a Organización</DialogTitle>
                <DialogDescription>
                  Asigna horas de live streaming a una organización
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Organización</Label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona organización" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horas</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        step="0.5"
                        value={hours}
                        onChange={e => setHours(e.target.value)}
                        className="pl-9"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Precio</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="pl-9"
                        placeholder="500000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">COP (Peso Colombiano)</SelectItem>
                      <SelectItem value="USD">USD (Dólar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Notas adicionales sobre esta venta..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Venta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay ventas registradas aún</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.slice(0, 10).map(purchase => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">
                    {getOrgName(purchase.buyer_id)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {purchase.hours_purchased}h
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ${purchase.price_paid.toLocaleString()} {purchase.currency}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(purchase.purchased_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {purchase.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
