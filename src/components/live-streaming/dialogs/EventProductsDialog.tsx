import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, ShoppingCart, ExternalLink, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EventProduct {
  id: string;
  event_id: string;
  product_name: string;
  product_url?: string;
  product_image_url?: string;
  price: number;
  currency: string;
  cta_text?: string;
  cta_url?: string;
  display_order: number;
  is_featured: boolean;
  clicks_count: number;
  conversions_count: number;
}

interface EventProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function EventProductsDialog({ open, onOpenChange, eventId, eventTitle }: EventProductsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<EventProduct[]>([]);
  
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    product_url: '',
    price: '',
    currency: 'USD',
    cta_text: 'Comprar ahora',
  });

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!eventId || !open) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('streaming_event_products')
          .select('*')
          .eq('event_id', eventId)
          .order('display_order');
        
        if (error) throw error;
        setProducts((data as EventProduct[]) || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [eventId, open]);

  const addProduct = async () => {
    if (!newProduct.product_name || !newProduct.price) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('streaming_event_products')
        .insert({
          event_id: eventId,
          product_name: newProduct.product_name,
          cta_url: newProduct.product_url || null,
          price: parseFloat(newProduct.price),
          currency: newProduct.currency,
          cta_text: newProduct.cta_text || 'Comprar ahora',
          display_order: products.length,
          is_featured: false,
        } as never);

      if (error) throw error;

      toast({ title: 'Producto agregado' });
      
      // Refresh products
      const { data } = await supabase
        .from('streaming_event_products')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order');
      setProducts((data as EventProduct[]) || []);

      // Reset form
      setNewProduct({
        product_name: '',
        product_url: '',
        price: '',
        currency: 'USD',
        cta_text: 'Comprar ahora',
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el producto',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (productId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('streaming_event_products')
        .update({ is_featured: !isFeatured } as never)
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.map(p => 
        p.id === productId ? { ...p, is_featured: !isFeatured } : p
      ));
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('streaming_event_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      toast({ title: 'Producto eliminado' });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Live Shopping
          </DialogTitle>
          <DialogDescription>
            Productos para el evento: {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Add Product Form */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar Producto
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre del Producto</Label>
                <Input
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  placeholder="Ej: Curso Premium"
                />
              </div>
              <div className="space-y-2">
                <Label>URL del Producto</Label>
                <Input
                  value={newProduct.product_url}
                  onChange={(e) => setNewProduct({ ...newProduct, product_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Precio</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Input
                    value={newProduct.currency}
                    onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                    placeholder="USD"
                    className="w-20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Texto del CTA</Label>
                <Input
                  value={newProduct.cta_text}
                  onChange={(e) => setNewProduct({ ...newProduct, cta_text: e.target.value })}
                  placeholder="Comprar ahora"
                />
              </div>
            </div>
            <Button 
              onClick={addProduct} 
              disabled={saving || !newProduct.product_name || !newProduct.price}
              className="w-full"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agregar Producto
            </Button>
          </div>

          {/* Products List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay productos para este evento</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>CTA</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.product_name}</span>
                        {product.product_url && (
                          <a 
                            href={product.product_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      ${product.price.toLocaleString()} {product.currency}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.cta_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.clicks_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.is_featured ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleProduct(product.id, product.is_featured)}
                      >
                        {product.is_featured ? 'Destacado' : 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
