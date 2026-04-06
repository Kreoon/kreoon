import { useRef, useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import { TemplateCardSkeleton } from './TemplateCardSkeleton';
import { TemplateFilters } from './TemplateFilters';
import { TemplateCategoryTabs } from './TemplateCategoryTabs';
import type { PublicTemplate } from './TemplateCard';
import type { TemplateFiltersState } from './TemplateFilters';

// Hook stub — el hook real sera provisto por el otro agente
// cuando exista, este import funcionara directamente
interface UsePublicTemplatesResult {
  templates: PublicTemplate[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

function usePublicTemplatesStub(filters: TemplateFiltersState): UsePublicTemplatesResult {
  // Stub temporal hasta que el hook real este disponible
  return {
    templates: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
  };
}

interface TemplateExplorerProps {
  onSelect: (template: PublicTemplate) => void;
  /**
   * Hook inyectable para facilitar la integracion cuando el hook real exista.
   * Si no se provee, usa el stub interno.
   */
  useTemplatesHook?: (filters: TemplateFiltersState) => UsePublicTemplatesResult;
}

const SKELETON_COUNT = 6;

export function TemplateExplorer({ onSelect, useTemplatesHook }: TemplateExplorerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filters, setFilters] = useState<TemplateFiltersState>({
    search: '',
    category: 'all',
    sortBy: 'popular',
  });

  const resolvedHook = useTemplatesHook ?? usePublicTemplatesStub;
  const { templates, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    resolvedHook(filters);

  // Sincronizar categoria activa con los filtros
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: TemplateFiltersState) => {
    setFilters(newFilters);
    setActiveCategory(newFilters.category);
  }, []);

  // Infinite scroll con IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handlers de like y save — el consumidor puede extenderlos mediante onSelect
  const handleLike = useCallback((templateId: string) => {
    // Implementado por el hook real; aqui es no-op hasta integracion
    console.debug('[TemplateExplorer] like:', templateId);
  }, []);

  const handleSave = useCallback((templateId: string) => {
    console.debug('[TemplateExplorer] save:', templateId);
  }, []);

  const isEmpty = !isLoading && templates.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros de busqueda */}
      <TemplateFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Tabs de categoria */}
      <TemplateCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        templates={templates}
      />

      {/* Grid de plantillas */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-live="polite"
        aria-label="Biblioteca de plantillas"
      >
        {/* Skeletons de carga inicial */}
        {isLoading &&
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <TemplateCardSkeleton key={`skeleton-${i}`} />
          ))}

        {/* Cards de plantillas */}
        {!isLoading &&
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelect}
              onLike={handleLike}
              onSave={handleSave}
            />
          ))}

        {/* Skeletons de pagina siguiente */}
        {isFetchingNextPage &&
          Array.from({ length: 3 }).map((_, i) => (
            <TemplateCardSkeleton key={`next-skeleton-${i}`} />
          ))}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">
            No se encontraron plantillas
          </h3>
          <p className="text-gray-400 text-sm max-w-xs">
            Intenta cambiar los filtros o la categoria para ver mas resultados.
          </p>
        </div>
      )}

      {/* Sentinel para infinite scroll */}
      {hasNextPage && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
    </div>
  );
}
