import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, PenLine, FlaskConical, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedClients } from '@/hooks/useUnifiedClients';
import { useAdProducts } from '../hooks/useAdProducts';
import { useToast } from '@/hooks/use-toast';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = 'crm' | 'manual';

export function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const [mode, setMode] = useState<Mode>('crm');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const { createProduct } = useAdProducts();
  const { toast } = useToast();
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  const { data: clients = [], isLoading: loadingClients } = useUnifiedClients(orgId);
  // Filter to only "empresa" type clients
  const companyClients = clients.filter(c => c.entity_type === 'empresa');

  // Fetch products for selected client
  const { data: crmProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['crm-products-for-client', selectedClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, research_generated_at')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClientId,
    staleTime: 2 * 60 * 1000,
  });

  const selectedCrmProduct = crmProducts.find(p => p.id === selectedProductId);

  // Auto-fill name/description when CRM product is selected
  useEffect(() => {
    if (mode === 'crm' && selectedCrmProduct) {
      setName(selectedCrmProduct.name || '');
      setDescription(selectedCrmProduct.description || '');
    }
  }, [mode, selectedCrmProduct]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode('crm');
      setName('');
      setDescription('');
      setSelectedClientId('');
      setSelectedProductId('');
    }
  }, [open]);

  // Reset product when client changes
  useEffect(() => {
    setSelectedProductId('');
  }, [selectedClientId]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        client_id: mode === 'crm' && selectedClientId ? selectedClientId : null,
        crm_product_id: mode === 'crm' && selectedProductId ? selectedProductId : null,
      });
      toast({ title: 'Producto creado', description: `"${name.trim()}" creado exitosamente.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo crear el producto.', variant: 'destructive' });
    }
  };

  const canCreate = name.trim().length > 0 && !createProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Producto para Anuncios</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'crm' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setMode('crm')}
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Vincular con CRM
            </Button>
            <Button
              type="button"
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setMode('manual')}
            >
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              Crear manualmente
            </Button>
          </div>

          {mode === 'crm' ? (
            <>
              {/* Client selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cliente / Marca</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClients ? 'Cargando...' : 'Selecciona un cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {companyClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{client.name}</span>
                          {client.is_internal_brand && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Marca interna</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product selector */}
              {selectedClientId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Producto del CRM</Label>
                  {loadingProducts ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cargando productos...
                    </div>
                  ) : crmProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Este cliente no tiene productos en el CRM. Puedes crear uno manualmente.
                    </p>
                  ) : (
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {crmProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center gap-2">
                              <span>{product.name}</span>
                              {product.research_generated_at && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-500/50 text-green-600">
                                  <FlaskConical className="h-2.5 w-2.5 mr-0.5" />
                                  Investigación
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Auto-filled preview */}
              {selectedCrmProduct && (
                <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{selectedCrmProduct.name}</span>
                    {selectedCrmProduct.research_generated_at && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-500/50 text-green-600">
                        <FlaskConical className="h-2.5 w-2.5 mr-0.5" />
                        Investigación disponible
                      </Badge>
                    )}
                  </div>
                  {selectedCrmProduct.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {selectedCrmProduct.description}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Manual mode */}
              <div className="space-y-2">
                <Label htmlFor="product-name">Nombre del producto *</Label>
                <Input
                  id="product-name"
                  placeholder="Ej: Crema Hidratante Premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-desc">Descripción (opcional)</Label>
                <Textarea
                  id="product-desc"
                  placeholder="Describe tu producto para mejores resultados de IA..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {createProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear Producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
