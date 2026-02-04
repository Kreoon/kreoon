import { memo, useState, useCallback, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { ContentCard, CardVariant } from './ContentCard';
import { UnifiedContentItem, ContentFilterStatus } from '@/hooks/unified/useUnifiedContent';
import { STATUS_LABELS, ContentStatus } from '@/types/database';
import { useDownload } from '@/hooks/unified/useDownload';

interface ContentGridProps {
  items: UnifiedContentItem[];
  loading?: boolean;
  onItemClick?: (item: UnifiedContentItem, index: number) => void;

  // View options
  variant?: CardVariant;
  onVariantChange?: (variant: CardVariant) => void;
  columns?: 2 | 3 | 4 | 5;

  // Filtering
  filterStatus?: ContentFilterStatus;
  onFilterChange?: (status: ContentFilterStatus) => void;
  availableStatuses?: ContentStatus[];

  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  // Selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // Batch actions
  showBatchDownload?: boolean;
  onBatchDownload?: (items: UnifiedContentItem[]) => void;

  // Display options
  showStatus?: boolean;
  showStats?: boolean;
  showCreator?: boolean;
  showClient?: boolean;
  showVariantCount?: boolean;
  showEmptyState?: boolean;
  emptyStateMessage?: string;

  // Refresh
  onRefresh?: () => void;
  isRefreshing?: boolean;

  // Custom header content
  headerContent?: React.ReactNode;
  className?: string;
}

const DEFAULT_STATUSES: ContentStatus[] = [
  'draft',
  'script_approved',
  'delivered',
  'issue',
  'corrected',
  'approved',
  'published'
];

export const ContentGrid = memo(function ContentGrid({
  items,
  loading = false,
  onItemClick,
  variant = 'grid',
  onVariantChange,
  columns = 3,
  filterStatus = 'all',
  onFilterChange,
  availableStatuses = DEFAULT_STATUSES,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Buscar contenido...',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  showBatchDownload = false,
  onBatchDownload,
  showStatus = true,
  showStats = true,
  showCreator = true,
  showClient = false,
  showVariantCount = true,
  showEmptyState = true,
  emptyStateMessage = 'No hay contenido disponible',
  onRefresh,
  isRefreshing = false,
  headerContent,
  className
}: ContentGridProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const { downloadBatch, isDownloading, canDownload } = useDownload();

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    // Debounce the actual search
    const timeout = setTimeout(() => {
      onSearchChange?.(value);
    }, 300);
    return () => clearTimeout(timeout);
  }, [onSearchChange]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === items.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(items.map(item => item.id));
    }
  }, [items, selectedIds, onSelectionChange]);

  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    if (selected) {
      onSelectionChange?.([...selectedIds, itemId]);
    } else {
      onSelectionChange?.(selectedIds.filter(id => id !== itemId));
    }
  }, [selectedIds, onSelectionChange]);

  // Batch download handler
  const handleBatchDownload = useCallback(() => {
    const selectedItems = items.filter(item =>
      selectedIds.includes(item.id) && canDownload(item.status || '', item.is_published)
    );

    if (selectedItems.length === 0) {
      return;
    }

    if (onBatchDownload) {
      onBatchDownload(selectedItems);
    } else {
      downloadBatch(selectedItems.map(item => ({
        contentId: item.id,
        videoUrl: item.media_url,
        videoUrls: item.video_urls,
        title: item.title || item.caption
      })));
    }
  }, [items, selectedIds, canDownload, onBatchDownload, downloadBatch]);

  // Count downloadable selected items
  const downloadableCount = useMemo(() => {
    return items.filter(item =>
      selectedIds.includes(item.id) && canDownload(item.status || '', item.is_published)
    ).length;
  }, [items, selectedIds, canDownload]);

  // Grid columns class
  const gridColumnsClass = useMemo(() => {
    switch (columns) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-2 sm:grid-cols-3';
      case 4: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
      case 5: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      default: return 'grid-cols-2 sm:grid-cols-3';
    }
  }, [columns]);

  // Status tabs for filtering
  const statusTabs = useMemo(() => {
    return [
      { value: 'all', label: 'Todos' },
      ...availableStatuses.map(status => ({
        value: status,
        label: STATUS_LABELS[status] || status
      }))
    ];
  }, [availableStatuses]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Search and actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          {onSearchChange && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 pr-8"
              />
              {localSearch && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Custom header content */}
          {headerContent}

          <div className="flex items-center gap-2 ml-auto">
            {/* Selection controls */}
            {selectable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  {selectedIds.length === items.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedIds.length > 0 ? `${selectedIds.length} seleccionados` : 'Seleccionar'}
                </Button>

                {selectedIds.length > 0 && showBatchDownload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDownload}
                    disabled={isDownloading || downloadableCount === 0}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar ({downloadableCount})
                  </Button>
                )}
              </>
            )}

            {/* View toggle */}
            {onVariantChange && (
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={variant === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onVariantChange('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={variant === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onVariantChange('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Filter dropdown */}
            {onFilterChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtrar
                    {filterStatus !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        {STATUS_LABELS[filterStatus as ContentStatus] || filterStatus}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {statusTabs.map((tab, index) => (
                    <DropdownMenuItem
                      key={tab.value}
                      onClick={() => onFilterChange(tab.value as ContentFilterStatus)}
                      className={cn(
                        filterStatus === tab.value && "bg-accent"
                      )}
                    >
                      {tab.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Refresh */}
            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>

        {/* Status tabs (alternative to dropdown) */}
        {onFilterChange && availableStatuses.length <= 6 && (
          <Tabs value={filterStatus} onValueChange={(v) => onFilterChange(v as ContentFilterStatus)}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              {statusTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Content count */}
      <div className="text-sm text-muted-foreground">
        {items.length} {items.length === 1 ? 'video' : 'videos'} en total
      </div>

      {/* Grid/List content */}
      {loading ? (
        <div className={cn(
          variant === 'list' ? 'space-y-2' : `grid ${gridColumnsClass} gap-2`
        )}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={i}
              className={variant === 'list' ? 'h-16' : 'aspect-[4/5]'}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        showEmptyState && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Grid3X3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{emptyStateMessage}</p>
          </div>
        )
      ) : (
        <div className={cn(
          variant === 'list' ? 'space-y-2' : `grid ${gridColumnsClass} gap-2`
        )}>
          {items.map((item, index) => (
            <ContentCard
              key={item.id}
              item={item}
              variant={variant}
              onClick={() => onItemClick?.(item, index)}
              showStatus={showStatus}
              showStats={showStats}
              showCreator={showCreator}
              showClient={showClient}
              showVariantCount={showVariantCount}
              selectable={selectable}
              selected={selectedIds.includes(item.id)}
              onSelect={(selected) => handleItemSelect(item.id, selected)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
