import { Loader2 } from "lucide-react";
import { ContentCard } from "./ContentCard";
import type { ScrapeItem } from "../types/social-scraper.types";

interface ContentGridProps {
  items: ScrapeItem[];
  isLoading?: boolean;
  onViewDetail: (item: ScrapeItem) => void;
  onAnalyze: (itemId: string) => void;
  analyzingItemId?: string | null;
  emptyMessage?: string;
}

export function ContentGrid({
  items,
  isLoading,
  onViewDetail,
  onAnalyze,
  analyzingItemId,
  emptyMessage = "No se encontraron contenidos",
}: ContentGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg">{emptyMessage}</p>
        <p className="text-sm mt-1">Configura un target y ejecuta un scraping para ver contenidos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          onViewDetail={onViewDetail}
          onAnalyze={onAnalyze}
          isAnalyzing={analyzingItemId === item.id}
        />
      ))}
    </div>
  );
}
