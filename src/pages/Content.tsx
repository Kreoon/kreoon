import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Film, ShoppingBag, FolderOpen, Search, ArrowRight, Play, Gift, DollarSign, Download, Eye } from "lucide-react";
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { UnifiedContentModule } from "@/components/content/unified";
import { useMarketplaceProjects } from "@/hooks/useMarketplaceProjects";
import { cn } from "@/lib/utils";

const MKT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-purple-500/20 text-purple-300',
  briefing: 'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-yellow-500/20 text-yellow-300',
  revision: 'bg-pink-500/20 text-pink-300',
  approved: 'bg-green-500/20 text-green-300',
  completed: 'bg-cyan-500/20 text-cyan-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

const MKT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  briefing: 'En Brief',
  in_progress: 'En Produccion',
  revision: 'En Revision',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

type ContentFilter = 'all' | 'in_progress' | 'delivered' | 'approved';

const Content = () => {
  const { user, roles, isCreator, isEditor } = useAuth();
  const { currentOrgId, loading: orgLoading } = useOrgOwner();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = roles.includes('admin');

  // View mode from URL: ?view=marketplace
  const [viewMode, setViewMode] = useState<'portafolio' | 'marketplace'>(() => {
    return searchParams.get('view') === 'marketplace' ? 'marketplace' : 'portafolio';
  });

  const handleViewChange = (mode: 'portafolio' | 'marketplace') => {
    setViewMode(mode);
    if (mode === 'marketplace') {
      setSearchParams({ view: 'marketplace' });
    } else {
      setSearchParams({});
    }
  };

  // Portafolio state
  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Marketplace state
  const [mktFilter, setMktFilter] = useState<ContentFilter>('all');
  const [mktSearch, setMktSearch] = useState('');
  const { projects } = useMarketplaceProjects();

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (mktFilter === 'in_progress') {
      result = result.filter(p => ['briefing', 'in_progress'].includes(p.status));
    } else if (mktFilter === 'delivered') {
      result = result.filter(p => p.status === 'revision');
    } else if (mktFilter === 'approved') {
      result = result.filter(p => ['approved', 'completed'].includes(p.status));
    }
    if (mktSearch.trim()) {
      const q = mktSearch.toLowerCase();
      result = result.filter(p =>
        p.brief.product_name.toLowerCase().includes(q) ||
        p.creator.display_name.toLowerCase().includes(q) ||
        p.brand_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, mktFilter, mktSearch]);

  const mktFilterTabs: { key: ContentFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: projects.length },
    { key: 'in_progress', label: 'En Progreso', count: projects.filter(p => ['briefing', 'in_progress'].includes(p.status)).length },
    { key: 'delivered', label: 'Entregados', count: projects.filter(p => p.status === 'revision').length },
    { key: 'approved', label: 'Aprobados', count: projects.filter(p => ['approved', 'completed'].includes(p.status)).length },
  ];

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim() || !newVideoTitle.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content')
        .insert({
          title: newVideoTitle,
          video_url: newVideoUrl,
          video_urls: [newVideoUrl],
          is_published: true,
          status: 'delivered',
          organization_id: currentOrgId
        });

      if (error) throw error;

      toast.success('Video agregado al portafolio');
      setNewVideoOpen(false);
      setNewVideoUrl("");
      setNewVideoTitle("");
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Error al agregar video');
    } finally {
      setSubmitting(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <VideoPlayerProvider>
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          {/* Page Header */}
          <PageHeader
            icon={Film}
            title="Mi Contenido"
            subtitle="Portafolio y entregas del marketplace en un solo lugar"
            action={
              viewMode === 'portafolio' && isAdmin ? (
                <Dialog open={newVideoOpen} onOpenChange={setNewVideoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nueva Pieza</span>
                      <span className="sm:hidden">Nueva</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md" aria-describedby="add-portfolio-video-desc">
                    <DialogHeader>
                      <DialogTitle>Agregar Video al Portafolio</DialogTitle>
                      <DialogDescription id="add-portfolio-video-desc" className="sr-only">Agregar un video al portafolio</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título del video</Label>
                        <Input
                          id="title"
                          placeholder="Ej: Testimonial Cliente X"
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url">URL del video (Bunny)</Label>
                        <Input
                          id="url"
                          placeholder="https://iframe.mediadelivery.net/embed/..."
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Soporta URLs de Bunny Stream embed o CDN directo
                        </p>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setNewVideoOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddVideo} disabled={submitting}>
                          {submitting ? 'Agregando...' : 'Agregar y Publicar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : undefined
            }
          />

          {/* View Mode Toggle: Portafolio | Marketplace */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit border border-white/5">
            <button
              onClick={() => handleViewChange('portafolio')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'portafolio'
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-gray-500 hover:text-foreground"
              )}
            >
              <Film className="h-4 w-4" />
              Portafolio
            </button>
            <button
              onClick={() => handleViewChange('marketplace')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'marketplace'
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-gray-500 hover:text-foreground"
              )}
            >
              <ShoppingBag className="h-4 w-4" />
              Marketplace
            </button>
          </div>
        </div>

        {/* Portafolio View */}
        {viewMode === 'portafolio' && (
          <UnifiedContentModule
            key={refreshKey}
            organizationId={currentOrgId || undefined}
            mode={isAdmin ? 'admin' : isCreator ? 'creator' : isEditor ? 'creator' : 'admin'}
            creatorId={isCreator && !isAdmin ? user?.id : undefined}
            editorId={isEditor && !isAdmin && !isCreator ? user?.id : undefined}
            showMetrics={isAdmin}
            showKreoonToggle={true}
            onContentUpdate={() => setRefreshKey(prev => prev + 1)}
          />
        )}

        {/* Marketplace View */}
        {viewMode === 'marketplace' && (
          <div className="px-4 md:px-6 pb-24 lg:pb-8 space-y-6">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por proyecto, creador o marca..."
                  value={mktSearch}
                  onChange={(e) => setMktSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {mktFilterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setMktFilter(tab.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      mktFilter === tab.key
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Marketplace Project Grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {mktFilter === 'all' ? 'Aún no tienes contenido' : 'Sin resultados'}
                </h3>
                <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                  {mktFilter === 'all'
                    ? isCreator
                      ? 'Explora campañas y acepta ofertas para comenzar a crear contenido'
                      : 'Contrata creadores o publica campañas para recibir contenido'
                    : 'No hay contenido con este filtro'}
                </p>
                {mktFilter === 'all' && (
                  <button
                    onClick={() => navigate(isCreator ? '/marketplace/campaigns' : '/marketplace')}
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {isCreator ? 'Explorar Campañas' : 'Buscar Creadores'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProjects.map(project => (
                  <div
                    key={project.id}
                    className="group relative rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all"
                    onClick={() => navigate('/board?view=marketplace')}
                  >
                    <div className="aspect-[9/16] bg-gradient-to-br from-purple-900/40 via-[#1a1a2e] to-blue-900/40 flex items-center justify-center relative">
                      <div className="flex flex-col items-center gap-2">
                        <Film className="h-8 w-8 text-gray-700" />
                        <span className="text-[10px] text-gray-600 font-medium">{project.package_name}</span>
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute top-2 left-2">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${MKT_STATUS_COLORS[project.status] || 'bg-gray-500/20 text-foreground/80'}`}>
                          {MKT_STATUS_LABELS[project.status] || project.status}
                        </span>
                      </div>

                      {['approved', 'completed'].includes(project.status) && (
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Download className="h-3 w-3 text-white" />
                          </button>
                          <button className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Eye className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
                        <div className="flex items-center gap-2 mb-1.5">
                          {project.creator.avatar_url ? (
                            <img src={project.creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-[8px] font-bold flex-shrink-0">
                              {(isCreator ? project.brand_name : project.creator.display_name).charAt(0)}
                            </div>
                          )}
                          <span className="text-white text-[11px] font-medium truncate">
                            {isCreator ? project.brand_name : `@${project.creator.display_name}`}
                          </span>
                        </div>
                        <p className="text-white text-xs font-medium leading-tight line-clamp-2">
                          {project.brief.product_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {project.payment_method === 'exchange' ? (
                            <span className="flex items-center gap-1 text-[10px] text-green-400">
                              <Gift className="h-2.5 w-2.5" /> Canje
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                              <DollarSign className="h-2.5 w-2.5" />
                              {project.total_price.toLocaleString()}
                              <span className={project.payment_status === 'released' ? 'text-green-400' : 'text-yellow-400'}>
                                {project.payment_status === 'released' ? 'Pagado' : ''}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </VideoPlayerProvider>
  );
};

export default Content;
