import { Package } from 'lucide-react';
import type { AdProduct } from '../types/ad-generator.types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: AdProduct[];
  onDelete?: (id: string) => void;
}

export function ProductGrid({ products, onDelete }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Package className="h-6 w-6 text-primary/60" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">No hay productos todavia</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Crea tu primer producto para empezar a generar anuncios.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onDelete={onDelete} />
      ))}
    </div>
  );
}
