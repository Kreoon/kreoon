import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, ImagePlus, Building2, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAdProducts } from '../hooks/useAdProducts';
import { useGeneratedBanners } from '../hooks/useGeneratedBanners';
import { BannerGenerationForm } from '../components/BannerGenerationForm';
import { GeneratedBannersGrid } from '../components/GeneratedBannersGrid';

export default function ProductBannersPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { products, isLoading: loadingProducts } = useAdProducts();
  const { banners, isLoading: loadingBanners, deleteBanner } = useGeneratedBanners(productId);

  const orgId = profile?.current_organization_id;
  const product = products.find((p) => p.id === productId);

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    try {
      await deleteBanner.mutateAsync(bannerId);
      toast({ title: 'Banner eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Producto no encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/ad-generator')}>
          Volver
        </Button>
      </div>
    );
  }

  const thumbnailUrl = product.product_images?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 text-muted-foreground"
          onClick={() => navigate('/ad-generator')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div className="flex items-center gap-3">
          {thumbnailUrl ? (
            <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-border/50">
              <img src={thumbnailUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <ImagePlus className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{product.name}</h1>
              {product.crm_product_id && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/50 text-blue-600">
                  <Link2 className="h-2.5 w-2.5 mr-0.5" />
                  CRM
                </Badge>
              )}
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{product.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Generation form */}
      {orgId && (
        <BannerGenerationForm
          productId={product.id}
          organizationId={orgId}
          clientId={product.client_id}
          crmProductId={product.crm_product_id}
        />
      )}

      {/* Generated banners */}
      <div>
        <h2 className="font-semibold text-sm mb-3">
          Anuncios Generados {banners.length > 0 && `(${banners.length})`}
        </h2>
        {loadingBanners ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GeneratedBannersGrid banners={banners} onDelete={handleDeleteBanner} />
        )}
      </div>
    </div>
  );
}
