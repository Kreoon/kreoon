import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_CONFIG } from "../config";
import type { AdPlatform } from "../types/ad-intelligence.types";

interface AdFiltersProps {
  platformFilter: AdPlatform | "all";
  setPlatformFilter: (p: AdPlatform | "all") => void;
  activeFilter: "all" | "active" | "inactive";
  setActiveFilter: (f: "all" | "active" | "inactive") => void;
  hasAnalysis: "all" | "analyzed" | "not_analyzed";
  setHasAnalysis: (f: "all" | "analyzed" | "not_analyzed") => void;
  onClearFilters: () => void;
  totalAds: number;
}

export function AdFilters({
  platformFilter,
  setPlatformFilter,
  activeFilter,
  setActiveFilter,
  hasAnalysis,
  setHasAnalysis,
  onClearFilters,
  totalAds,
}: AdFiltersProps) {
  const hasActiveFilters = platformFilter !== "all" || activeFilter !== "all" || hasAnalysis !== "all";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">{totalAds} anuncios</span>

      <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as AdPlatform | "all")}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Plataforma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {(Object.keys(PLATFORM_CONFIG) as AdPlatform[]).map((p) => (
            <SelectItem key={p} value={p}>{PLATFORM_CONFIG[p].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
        <SelectTrigger className="w-[120px] h-8">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      <Select value={hasAnalysis} onValueChange={(v) => setHasAnalysis(v as typeof hasAnalysis)}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Análisis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="analyzed">Con análisis AI</SelectItem>
          <SelectItem value="not_analyzed">Sin análisis</SelectItem>
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
