import { Image } from 'lucide-react';
import type { GeneratedBanner } from '../types/ad-generator.types';
import { GeneratedBannerCard } from './GeneratedBannerCard';

interface GeneratedBannersGridProps {
  banners: GeneratedBanner[];
  onDelete?: (id: string) => void;
}

export function GeneratedBannersGrid({ banners, onDelete }: GeneratedBannersGridProps) {
  if (banners.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-sm">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Image className="h-5 w-5 text-primary/60" />
        </div>
        <p className="text-sm text-muted-foreground">No hay banners generados todavia</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Genera tu primer anuncio profesional arriba.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {banners.map((banner) => (
        <GeneratedBannerCard key={banner.id} banner={banner} onDelete={onDelete} />
      ))}
    </div>
  );
}
