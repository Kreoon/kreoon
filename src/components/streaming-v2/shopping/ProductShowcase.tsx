/**
 * ProductShowcase - Panel de productos para Live Shopping
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ShoppingBag,
  Star,
  Zap,
  Clock,
  Plus,
  Minus,
  DollarSign,
  Package,
  TrendingUp,
  Eye,
  Search,
} from 'lucide-react';
import type { StreamingProduct } from '@/types/streaming.types';

interface ProductShowcaseProps {
  products: StreamingProduct[];
  onFeature?: (productId: string) => void;
  onUnfeature?: (productId: string) => void;
  onCreateFlashOffer?: (productId: string, price: number, stock: number, durationSeconds: number) => void;
  onEndFlashOffer?: (productId: string) => void;
  onAddProduct?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ProductShowcase({
  products,
  onFeature,
  onUnfeature,
  onCreateFlashOffer,
  onEndFlashOffer,
  onAddProduct,
  isLoading,
  className,
}: ProductShowcaseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [flashOfferDialog, setFlashOfferDialog] = useState<StreamingProduct | null>(null);
  const [flashPrice, setFlashPrice] = useState('');
  const [flashStock, setFlashStock] = useState('10');
  const [flashDuration, setFlashDuration] = useState('300');

  // Filter products
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Featured product
  const featuredProduct = products.find((p) => p.is_featured);

  // Calculate totals
  const totalRevenue = products.reduce((sum, p) => sum + (p.revenue_usd || 0), 0);
  const totalSold = products.reduce((sum, p) => sum + (p.sold_count || 0), 0);

  // Handle flash offer creation
  const handleCreateFlashOffer = () => {
    if (!flashOfferDialog || !onCreateFlashOffer) return;
    onCreateFlashOffer(
      flashOfferDialog.id,
      parseFloat(flashPrice) || flashOfferDialog.live_price_usd * 0.7,
      parseInt(flashStock) || 10,
      parseInt(flashDuration) || 300
    );
    setFlashOfferDialog(null);
  };

  return (
    <>
      <Card className={cn('flex flex-col h-full', className)}>
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <CardTitle className="text-lg">Productos</CardTitle>
              <Badge variant="secondary">{products.length}</Badge>
            </div>
            {onAddProduct && (
              <Button size="sm" onClick={onAddProduct}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="rounded-sm bg-green-500/10 p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-green-400 mb-1" />
              <p className="text-lg font-bold text-green-400">${totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Ventas totales</p>
            </div>
            <div className="rounded-sm bg-blue-500/10 p-3 text-center">
              <Package className="h-4 w-4 mx-auto text-blue-400 mb-1" />
              <p className="text-lg font-bold text-blue-400">{totalSold}</p>
              <p className="text-xs text-muted-foreground">Unidades vendidas</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full px-4 pb-4">
            <div className="space-y-3">
              {/* Featured product highlight */}
              {featuredProduct && (
                <div className="rounded-sm border-2 border-yellow-500/50 bg-yellow-500/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">Producto Destacado</span>
                  </div>
                  <ProductCard
                    product={featuredProduct}
                    onFeature={onUnfeature}
                    onFlashOffer={() => setFlashOfferDialog(featuredProduct)}
                    onEndFlashOffer={onEndFlashOffer}
                    isFeatured
                  />
                </div>
              )}

              {/* Product list */}
              {filteredProducts
                .filter((p) => p.id !== featuredProduct?.id)
                .map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onFeature={onFeature}
                    onFlashOffer={() => setFlashOfferDialog(product)}
                    onEndFlashOffer={onEndFlashOffer}
                  />
                ))}

              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {products.length === 0
                      ? 'No hay productos agregados'
                      : 'No se encontraron productos'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Flash offer dialog */}
      <Dialog open={!!flashOfferDialog} onOpenChange={() => setFlashOfferDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Crear Flash Offer
            </DialogTitle>
            <DialogDescription>
              Crea una oferta por tiempo limitado para "{flashOfferDialog?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Precio original</Label>
              <p className="text-2xl font-bold">${flashOfferDialog?.live_price_usd.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flash-price">Precio flash</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="flash-price"
                  type="number"
                  placeholder={(flashOfferDialog?.live_price_usd || 0) * 0.7 + ''}
                  value={flashPrice}
                  onChange={(e) => setFlashPrice(e.target.value)}
                  className="pl-9"
                />
              </div>
              {flashOfferDialog && flashPrice && (
                <p className="text-sm text-green-400">
                  {Math.round(
                    ((flashOfferDialog.live_price_usd - parseFloat(flashPrice)) /
                      flashOfferDialog.live_price_usd) *
                      100
                  )}
                  % de descuento
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="flash-stock">Stock limitado</Label>
              <Input
                id="flash-stock"
                type="number"
                value={flashStock}
                onChange={(e) => setFlashStock(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flash-duration">Duración (segundos)</Label>
              <div className="flex gap-2">
                {[60, 120, 300, 600].map((seconds) => (
                  <Button
                    key={seconds}
                    type="button"
                    variant={flashDuration === seconds.toString() ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setFlashDuration(seconds.toString())}
                  >
                    {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFlashOfferDialog(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={handleCreateFlashOffer}
            >
              <Zap className="mr-2 h-4 w-4" />
              Activar Flash Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Individual product card
interface ProductCardProps {
  product: StreamingProduct;
  onFeature?: (productId: string) => void;
  onFlashOffer?: () => void;
  onEndFlashOffer?: (productId: string) => void;
  isFeatured?: boolean;
}

function ProductCard({
  product,
  onFeature,
  onFlashOffer,
  onEndFlashOffer,
  isFeatured,
}: ProductCardProps) {
  const hasFlashOffer = product.is_flash_active && product.flash_expires_at;
  const stockPercentage =
    product.stock_for_live > 0
      ? ((product.stock_for_live - product.sold_count) / product.stock_for_live) * 100
      : 100;

  return (
    <div className="flex gap-3 rounded-sm border p-3">
      {/* Product image */}
      <div className="h-16 w-16 shrink-0 rounded-sm bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{product.name}</h4>

        <div className="flex items-center gap-2 mt-1">
          {hasFlashOffer ? (
            <>
              <span className="text-lg font-bold text-yellow-400">
                ${product.flash_price_usd?.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                ${product.live_price_usd.toFixed(2)}
              </span>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                <Zap className="mr-1 h-3 w-3" />
                FLASH
              </Badge>
            </>
          ) : (
            <span className="text-lg font-bold">${product.live_price_usd.toFixed(2)}</span>
          )}
        </div>

        {/* Flash timer */}
        {hasFlashOffer && product.flash_expires_at && (
          <FlashTimer expiresAt={product.flash_expires_at} />
        )}

        {/* Stock indicator */}
        {product.stock_for_live > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Stock</span>
              <span>
                {product.stock_for_live - product.sold_count} / {product.stock_for_live}
              </span>
            </div>
            <Progress
              value={stockPercentage}
              className={cn(
                'h-1.5',
                stockPercentage < 20 && '[&>div]:bg-red-500',
                stockPercentage < 50 && stockPercentage >= 20 && '[&>div]:bg-yellow-500'
              )}
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {product.sold_count} vendidos
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${product.revenue_usd?.toFixed(0) || 0}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 shrink-0">
        {!isFeatured && onFeature && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onFeature(product.id)}
          >
            <Star className="mr-1 h-3 w-3" />
            Destacar
          </Button>
        )}
        {isFeatured && onFeature && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs bg-yellow-500/20 text-yellow-400"
            onClick={() => onFeature(product.id)}
          >
            <Star className="mr-1 h-3 w-3 fill-yellow-400" />
            Destacado
          </Button>
        )}
        {!hasFlashOffer && onFlashOffer && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onFlashOffer}
          >
            <Zap className="mr-1 h-3 w-3" />
            Flash
          </Button>
        )}
        {hasFlashOffer && onEndFlashOffer && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEndFlashOffer(product.id)}
          >
            Terminar Flash
          </Button>
        )}
      </div>
    </div>
  );
}

// Flash offer timer
function FlashTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  // Update timer
  useState(() => {
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  });

  if (timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-1 mt-1 text-xs text-yellow-400">
      <Clock className="h-3 w-3" />
      <span className="font-mono">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

export default ProductShowcase;
