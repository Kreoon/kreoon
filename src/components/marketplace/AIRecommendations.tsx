import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreatorMatching, useIndustries, useSavedSearches } from '@/hooks/useCreatorMatching';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { CreatorMatchingGrid } from './CreatorMatchingCard';
import type { MatchingCriteria, IndustryId, CreatorMatch } from '@/types/ai-matching';
import { INDUSTRY_DATA, CONTENT_STYLE_LABELS, BUDGET_RANGE_LABELS } from '@/types/ai-matching';
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_CATEGORIES } from '@/types/marketplace';

interface AIRecommendationsProps {
  onCreatorSelect?: (match: CreatorMatch) => void;
  onContactCreator?: (match: CreatorMatch) => void;
  initialIndustry?: IndustryId;
  className?: string;
}

export function AIRecommendations({
  onCreatorSelect,
  onContactCreator,
  initialIndustry,
  className,
}: AIRecommendationsProps) {
  const { searchCreators, isSearching } = useCreatorMatching();
  const { companyProfile, hasProfile } = useCompanyProfile();
  const { data: industries = [] } = useIndustries();
  const { savedSearches, saveSearch, isSaving } = useSavedSearches();

  const [criteria, setCriteria] = useState<MatchingCriteria>({
    industry: initialIndustry || companyProfile?.industry,
    niche_tags: companyProfile?.niche_tags,
    content_types: companyProfile?.preferred_content_types,
    content_styles: companyProfile?.preferred_creator_styles as any,
    budget_range: companyProfile?.typical_budget_range as any,
    limit: 20,
  });

  const [results, setResults] = useState<{
    matches: CreatorMatch[];
    total: number;
    aiSummary?: string;
  } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Ejecutar búsqueda
  const handleSearch = async () => {
    const response = await searchCreators(criteria);
    setResults({
      matches: response.matches,
      total: response.total_found,
      aiSummary: response.ai_summary,
    });
  };

  // Actualizar criterio
  const updateCriteria = <K extends keyof MatchingCriteria>(
    key: K,
    value: MatchingCriteria[K]
  ) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  // Guardar búsqueda
  const handleSaveSearch = async () => {
    if (!searchName.trim()) return;

    await saveSearch({
      search_name: searchName,
      industry: criteria.industry as IndustryId,
      content_types: criteria.content_types || [],
      budget_range: criteria.budget_range as any,
      min_rating: criteria.min_rating || null,
      tags: criteria.niche_tags || [],
      notify_new_matches: true,
      notify_frequency: 'daily',
    });

    setSearchName('');
  };

  // Clear filters
  const clearFilters = () => {
    setCriteria({
      industry: companyProfile?.industry,
      limit: 20,
    });
  };

  const activeFiltersCount = [
    criteria.industry,
    criteria.content_types?.length,
    criteria.content_styles?.length,
    criteria.budget_range,
    criteria.min_rating,
    criteria.niche_tags?.length,
  ].filter(Boolean).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-sm bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Creadores recomendados
            </h2>
            <p className="text-sm text-muted-foreground">
              Encuentra el creador perfecto para tu marca
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Filter button */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card border-border">
              <SheetHeader>
                <SheetTitle className="text-foreground">
                  Filtrar creadores
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                <div className="space-y-6 py-4">
                  {/* Industry */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Industria
                    </label>
                    <Select
                      value={criteria.industry}
                      onValueChange={(v) => updateCriteria('industry', v as IndustryId)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecciona industria" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind.id} value={ind.id}>
                            <span className="flex items-center gap-2">
                              <span>{ind.icon}</span>
                              {ind.name_es}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Content types */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Tipo de contenido
                    </label>
                    <div className="space-y-2">
                      {Object.entries(SERVICE_TYPE_CATEGORIES).map(([catKey, category]) => (
                        <div key={catKey}>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">{category.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {category.types.map(type => (
                              <Badge
                                key={type}
                                variant={criteria.content_types?.includes(type) ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => {
                                  const current = criteria.content_types || [];
                                  const updated = current.includes(type)
                                    ? current.filter((t) => t !== type)
                                    : [...current, type];
                                  updateCriteria('content_types', updated);
                                }}
                              >
                                {SERVICE_TYPE_LABELS[type]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content styles */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Estilo de contenido
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CONTENT_STYLE_LABELS).map(([key, label]) => (
                        <Badge
                          key={key}
                          variant={criteria.content_styles?.includes(key as any) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const current = criteria.content_styles || [];
                            const updated = current.includes(key as any)
                              ? current.filter((s) => s !== key)
                              : [...current, key as any];
                            updateCriteria('content_styles', updated);
                          }}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Rango de presupuesto
                    </label>
                    <Select
                      value={criteria.budget_range}
                      onValueChange={(v) => updateCriteria('budget_range', v as any)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Cualquier presupuesto" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BUDGET_RANGE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Min rating */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Rating mínimo
                    </label>
                    <Select
                      value={criteria.min_rating?.toString()}
                      onValueChange={(v) => updateCriteria('min_rating', parseFloat(v))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Cualquier rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.5">4.5+ estrellas</SelectItem>
                        <SelectItem value="4">4+ estrellas</SelectItem>
                        <SelectItem value="3.5">3.5+ estrellas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear & Apply buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Limpiar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleSearch();
                        setShowFilters(false);
                      }}
                    >
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Search button */}
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="gap-2 bg-gradient-to-r from-primary to-purple-600"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>
        </div>
      </div>

      {/* Quick filters */}
      {hasProfile && companyProfile && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={criteria.industry === companyProfile.industry ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => updateCriteria('industry', companyProfile.industry as IndustryId)}
          >
            {INDUSTRY_DATA[companyProfile.industry as IndustryId]?.icon}{' '}
            Mi industria
          </Badge>
          {companyProfile.niche_tags?.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant={criteria.niche_tags?.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                const current = criteria.niche_tags || [];
                const updated = current.includes(tag)
                  ? current.filter((t) => t !== tag)
                  : [...current, tag];
                updateCriteria('niche_tags', updated);
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* AI Summary */}
      {results?.aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-sm bg-gradient-to-r from-secondary to-purple-500/10 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-foreground">{results.aiSummary}</p>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.total} creadores encontrados
            </p>

            {/* Save search */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nombre de búsqueda..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-40 h-8 text-sm bg-background border-border"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSearch}
                disabled={!searchName.trim() || isSaving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <CreatorMatchingGrid
            matches={results.matches}
            onCreatorClick={onCreatorSelect}
            onContact={onContactCreator}
            showFeatured
          />
        </div>
      )}

      {/* Empty state */}
      {!results && !isSearching && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Encuentra tu creador ideal
          </h3>
          <p className="text-muted-foreground mb-4">
            Usa los filtros o haz clic en "Buscar" para ver recomendaciones
            {hasProfile && ' basadas en tu perfil de empresa'}
          </p>
          <Button onClick={handleSearch} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Ver recomendaciones
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            Buscando los mejores creadores para ti...
          </p>
        </div>
      )}
    </div>
  );
}
