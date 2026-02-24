import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ImagePlus, Loader2, Package, Image, Coins } from 'lucide-react';
import { useAdProducts } from '../hooks/useAdProducts';
import { useGeneratedBanners } from '../hooks/useGeneratedBanners';
import { ProductGrid } from '../components/ProductGrid';
import { CreateProductDialog } from '../components/CreateProductDialog';
import { useToast } from '@/hooks/use-toast';
import { AD_GENERATOR_TOKEN_COST } from '../config';
import { UnderConstructionGuard } from '@/components/layout/UnderConstructionGuard';

export default function AdGeneratorPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { products, isLoading, deleteProduct } = useAdProducts();
  const { toast } = useToast();

  const totalBanners = products.reduce((sum, p) => sum + p.banners_count, 0);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto y todos sus banners generados?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Producto eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <UnderConstructionGuard moduleName="Generador de Anuncios" description="Crea banners profesionales con IA. Este modulo estara disponible pronto para todos los usuarios.">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <ImagePlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Generador de Anuncios</h1>
              <p className="text-sm text-muted-foreground">
                Crea banners profesionales con Flux AI
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Stats bar */}
      {!isLoading && products.length > 0 && (
        <div className="flex items-center gap-6 px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{products.length}</span>
            <span className="text-muted-foreground">{products.length === 1 ? 'producto' : 'productos'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{totalBanners}</span>
            <span className="text-muted-foreground">{totalBanners === 1 ? 'banner' : 'banners'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{AD_GENERATOR_TOKEN_COST} coins/banner</span>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ProductGrid products={products} onDelete={handleDelete} />
      )}

      <CreateProductDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
    </UnderConstructionGuard>
  );
}
