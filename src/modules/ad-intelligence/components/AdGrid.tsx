import { Loader2 } from "lucide-react";
import { AdCard } from "./AdCard";
import type { AdLibraryAd, AdLibraryCollection } from "../types/ad-intelligence.types";

interface AdGridProps {
  ads: AdLibraryAd[];
  collections?: AdLibraryCollection[];
  isLoading?: boolean;
  onViewDetail: (ad: AdLibraryAd) => void;
  onAnalyze: (adId: string) => void;
  onAddToCollection: (collectionId: string, adId: string) => void;
  analyzingAdId?: string | null;
  emptyMessage?: string;
}

export function AdGrid({
  ads,
  collections = [],
  isLoading,
  onViewDetail,
  onAnalyze,
  onAddToCollection,
  analyzingAdId,
  emptyMessage = "No se encontraron anuncios",
}: AdGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ads.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg">{emptyMessage}</p>
        <p className="text-sm mt-1">Usa la barra de búsqueda para encontrar anuncios</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ads.map((ad) => (
        <AdCard
          key={ad.id}
          ad={ad}
          collections={collections}
          onViewDetail={onViewDetail}
          onAnalyze={onAnalyze}
          onAddToCollection={onAddToCollection}
          isAnalyzing={analyzingAdId === ad.id}
        />
      ))}
    </div>
  );
}
