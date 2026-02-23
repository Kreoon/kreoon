import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOCIAL_PLATFORM_CONFIG, CONTENT_TYPE_LABELS } from "../config";
import type { SocialPlatform } from "../types/social-scraper.types";

interface ContentFiltersProps {
  platformFilter: SocialPlatform | "all";
  setPlatformFilter: (p: SocialPlatform | "all") => void;
  contentTypeFilter: string;
  setContentTypeFilter: (f: string) => void;
  hasAnalysis: "all" | "analyzed" | "not_analyzed";
  setHasAnalysis: (f: "all" | "analyzed" | "not_analyzed") => void;
  onClearFilters: () => void;
  totalItems: number;
}

export function ContentFilters({
  platformFilter,
  setPlatformFilter,
  contentTypeFilter,
  setContentTypeFilter,
  hasAnalysis,
  setHasAnalysis,
  onClearFilters,
  totalItems,
}: ContentFiltersProps) {
  const hasActiveFilters = platformFilter !== "all" || contentTypeFilter !== "all" || hasAnalysis !== "all";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">{totalItems} contenidos</span>

      <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as SocialPlatform | "all")}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Plataforma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {(Object.keys(SOCIAL_PLATFORM_CONFIG) as SocialPlatform[]).map((p) => (
            <SelectItem key={p} value={p}>{SOCIAL_PLATFORM_CONFIG[p].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={hasAnalysis} onValueChange={(v) => setHasAnalysis(v as typeof hasAnalysis)}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Analisis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="analyzed">Con analisis AI</SelectItem>
          <SelectItem value="not_analyzed">Sin analisis</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
