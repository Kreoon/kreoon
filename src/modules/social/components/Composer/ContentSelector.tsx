import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Film, Check, Building2, User, Loader2, X,
  CheckCircle2, Play, ChevronLeft, ChevronRight, ArrowRight,
  Filter, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getBunnyThumbnailUrl, getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { useApprovedContent, type ApprovedContent } from '../../hooks/useApprovedContent';

interface ContentSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: ApprovedContent, selectedVideoUrl: string | null) => void;
}

const PAGE_SIZES = [20, 50, 100] as const;

const SPHERE_COLORS: Record<string, string> = {
  engage: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  solution: 'bg-green-500/20 text-green-400 border-green-500/30',
  remarketing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  fidelize: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Aprobado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  paid: { label: 'Pagado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  en_campaa: { label: 'En Campaña', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const SPHERE_OPTIONS = [
  { value: 'engage', label: 'Engage' },
  { value: 'solution', label: 'Solution' },
  { value: 'remarketing', label: 'Remarketing' },
  { value: 'fidelize', label: 'Fidelize' },
];

function getContentThumbnail(content: ApprovedContent): string | null {
  if (content.thumbnail_url) return content.thumbnail_url;
  const videoUrl = content.video_urls?.[0] || content.video_url || content.bunny_embed_url;
  if (videoUrl) return getBunnyThumbnailUrl(videoUrl);
  return null;
}

function getVariantThumbnail(url: string): string | null {
  return getBunnyThumbnailUrl(url);
}

function getAllVideoUrls(content: ApprovedContent): string[] {
  const urls: string[] = [];
  if (content.video_urls?.length) {
    urls.push(...content.video_urls);
  }
  if (content.video_url && !urls.includes(content.video_url)) {
    urls.push(content.video_url);
  }
  if (content.bunny_embed_url && !urls.includes(content.bunny_embed_url)) {
    urls.push(content.bunny_embed_url);
  }
  return urls;
}

export function ContentSelector({ open, onClose, onSelect }: ContentSelectorProps) {
  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSphere, setFilterSphere] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(0);

  // Variant view
  const [expandedContent, setExpandedContent] = useState<ApprovedContent | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(0); }, [filterStatus, filterSphere, pageSize]);

  const { data: contents, totalCount, isLoading, isFetching } = useApprovedContent({
    search: debouncedSearch || undefined,
    status: filterStatus && filterStatus !== 'all' ? filterStatus : undefined,
    spherePhase: filterSphere && filterSphere !== 'all' ? filterSphere : undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Unique clients from current page (for display)
  const uniqueClients = useMemo(() => {
    const map = new Map<string, { id: string; name: string; logo: string | null }>();
    contents.forEach(c => {
      if (c.client_id && c.client_name && !map.has(c.client_id)) {
        map.set(c.client_id, { id: c.client_id, name: c.client_name, logo: c.client_logo_url });
      }
    });
    return Array.from(map.values());
  }, [contents]);

  const activeFilterCount = [filterStatus, filterSphere].filter(v => v && v !== 'all').length;

  const handleSelectContent = (content: ApprovedContent) => {
    const videos = getAllVideoUrls(content);
    if (videos.length > 1) {
      setExpandedContent(content);
      setSelectedVariantIdx(0);
    } else {
      onSelect(content, videos[0] || null);
      handleClose();
    }
  };

  const handleConfirmVariant = () => {
    if (!expandedContent) return;
    const videos = getAllVideoUrls(expandedContent);
    onSelect(expandedContent, videos[selectedVariantIdx] || null);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setExpandedContent(null);
    setSelectedVariantIdx(0);
    setSearchInput('');
    setDebouncedSearch('');
    setFilterStatus('all');
    setFilterSphere('all');
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterSphere('all');
    setSearchInput('');
    setDebouncedSearch('');
    setCurrentPage(0);
  };

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  // ── Variant detail view ──
  if (expandedContent) {
    const videos = getAllVideoUrls(expandedContent);
    const selectedUrl = videos[selectedVariantIdx];
    const bunnyUrls = selectedUrl ? getBunnyVideoUrls(selectedUrl) : null;
    const previewThumb = selectedUrl ? getVariantThumbnail(selectedUrl) : null;

    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 flex-row items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setExpandedContent(null)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base truncate">{expandedContent.title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {expandedContent.client_name || expandedContent.creator_name} — {videos.length} variante{videos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex border-t">
            {/* Variant list (left) */}
            <div className="w-48 sm:w-56 border-r overflow-y-auto bg-muted/20">
              <div className="p-2 space-y-1.5">
                {videos.map((url, idx) => {
                  const thumb = getVariantThumbnail(url);
                  const isActive = idx === selectedVariantIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedVariantIdx(idx)}
                      className={cn(
                        'w-full rounded-sm overflow-hidden border transition-all',
                        isActive
                          ? 'ring-2 ring-primary border-primary'
                          : 'border-border/50 hover:border-primary/40'
                      )}
                    >
                      <div className="aspect-[9/16] relative bg-muted">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={`Variante ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1">
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-black/60">
                            V{idx + 1}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview (right) */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
              <div className="w-full max-w-xs">
                <div className="aspect-[9/16] rounded-sm overflow-hidden bg-black relative shadow-2xl">
                  {bunnyUrls?.mp4 ? (
                    <video
                      key={selectedUrl}
                      src={bunnyUrls.mp4}
                      poster={previewThumb || undefined}
                      controls
                      className="w-full h-full object-contain"
                      playsInline
                    />
                  ) : previewThumb ? (
                    <>
                      <img
                        src={previewThumb}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                          <Play className="w-7 h-7 text-white ml-1" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  Variante {selectedVariantIdx + 1} de {videos.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expandedContent.sphere_phase && (
                    <span className="capitalize">{expandedContent.sphere_phase}</span>
                  )}
                  {expandedContent.sphere_phase && expandedContent.target_platform && ' · '}
                  {expandedContent.target_platform}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
            <Button variant="ghost" size="sm" onClick={() => setExpandedContent(null)}>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Volver
            </Button>
            <Button size="sm" onClick={handleConfirmVariant}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Usar variante {selectedVariantIdx + 1}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main grid view ──
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 flex-row items-center justify-between gap-4">
          <DialogTitle className="text-lg">Contenido Disponible</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {totalCount} contenidos
          </div>
        </DialogHeader>

        {/* Search + Filter bar */}
        <div className="px-6 pb-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo, cliente, creador, numero..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-9"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="en_campaa">En Campana</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSphere} onValueChange={setFilterSphere}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Esfera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {SPHERE_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                  <X className="w-3 h-3" />
                  Limpiar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content grid */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.3) 100%)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Film className="w-10 h-10 opacity-40" />
              <p className="text-sm">
                {totalCount === 0 && !debouncedSearch && filterStatus === 'all' && filterSphere === 'all'
                  ? 'No hay contenido disponible'
                  : 'Sin resultados para estos filtros'}
              </p>
              {(debouncedSearch || filterStatus !== 'all' || filterSphere !== 'all') && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {contents.map(content => {
                const thumb = getContentThumbnail(content);
                const videos = getAllVideoUrls(content);
                const statusInfo = STATUS_LABELS[content.status];

                return (
                  <button
                    key={content.id}
                    onClick={() => handleSelectContent(content)}
                    className={cn(
                      'group relative rounded-sm overflow-hidden border text-left transition-all',
                      'bg-card/50',
                      'border-border/50 hover:border-primary/40 hover:shadow-md'
                    )}
                  >
                    {/* Video thumbnail 9:16 */}
                    <div className="aspect-[9/16] relative bg-muted overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={content.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted to-muted/50">
                          <Film className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Play/select indicator on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center shadow-lg">
                          {videos.length > 1 ? (
                            <ArrowRight className="w-5 h-5 text-primary-foreground" />
                          ) : (
                            <Check className="w-5 h-5 text-primary-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Top-left: status */}
                      {statusInfo && (
                        <div className="absolute top-2 left-2">
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] h-4 px-1.5', statusInfo.color)}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                      )}

                      {/* Top-right: variant count */}
                      {videos.length > 1 && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-black/60">
                            {videos.length} var.
                          </Badge>
                        </div>
                      )}

                      {/* Sphere phase */}
                      {content.sphere_phase && (
                        <div className="absolute bottom-10 left-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[8px] h-3.5 px-1',
                              SPHERE_COLORS[content.sphere_phase] || 'bg-muted/50'
                            )}
                          >
                            {content.sphere_phase}
                          </Badge>
                        </div>
                      )}

                      {/* Bottom info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                          {content.title}
                        </p>
                        {content.sequence_number && (
                          <p className="text-[10px] text-white/60 mt-0.5">
                            #{content.sequence_number}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card footer info */}
                    <div className="p-2 space-y-1">
                      {content.client_name && (
                        <div className="flex items-center gap-1.5">
                          {content.client_logo_url ? (
                            <img src={content.client_logo_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                          ) : (
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="text-[10px] text-muted-foreground truncate">{content.client_name}</span>
                        </div>
                      )}
                      {content.creator_name && (
                        <div className="flex items-center gap-1.5">
                          {content.creator_avatar ? (
                            <img src={content.creator_avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                          ) : (
                            <User className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="text-[10px] text-muted-foreground truncate">{content.creator_name}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Loading overlay for page transitions */}
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-background/30-[1px] flex items-center justify-center pointer-events-none">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Footer: pagination + page size */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Por pagina:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[70px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(size => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page info */}
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {totalCount === 0
              ? '0 contenidos'
              : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, totalCount)} de ${totalCount}`}
          </p>

          {/* Pagination controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 0}
              onClick={() => goToPage(0)}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 0}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
              {currentPage + 1} / {totalPages}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages - 1}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages - 1}
              onClick={() => goToPage(totalPages - 1)}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
