import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, Trash2, Link2, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AdProduct } from '../types/ad-generator.types';

interface ProductCardProps {
  product: AdProduct;
  onDelete?: (id: string) => void;
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const navigate = useNavigate();
  const thumbnailUrl = product.product_images?.[0];
  const isCrm = !!product.crm_product_id;

  return (
    <Card
      className="group cursor-pointer hover:border-primary/30 transition-all duration-200 overflow-hidden"
      onClick={() => navigate(`/ad-generator/${product.id}`)}
    >
      {/* Thumbnail area */}
      <div className="relative h-36 bg-muted/30 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {/* Badges row */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isCrm ? (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-blue-500/10 text-blue-600 border-blue-500/30">
              <Link2 className="h-2.5 w-2.5 mr-0.5" />
              CRM
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              <PenLine className="h-2.5 w-2.5 mr-0.5" />
              Manual
            </Badge>
          )}
          <div className="px-2 py-0.5 rounded-full bg-background/80 border border-border/50 text-[11px] font-medium">
            {product.banners_count} {product.banners_count === 1 ? 'banner' : 'banners'}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">
            {new Date(product.updated_at).toLocaleDateString()}
          </span>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
