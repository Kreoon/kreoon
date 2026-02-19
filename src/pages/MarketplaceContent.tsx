import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Film, Search, FolderOpen, ArrowRight, Download, Eye, Play, Gift, DollarSign } from 'lucide-react';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import type { MarketplaceProject, ProjectStatus } from '@/components/marketplace/types/marketplace';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-purple-500/20 text-purple-300',
  briefing: 'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-yellow-500/20 text-yellow-300',
  revision: 'bg-pink-500/20 text-pink-300',
  approved: 'bg-green-500/20 text-green-300',
  completed: 'bg-cyan-500/20 text-cyan-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  briefing: 'En Brief',
  in_progress: 'En Produccion',
  revision: 'En Revision',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

type ContentFilter = 'all' | 'in_progress' | 'delivered' | 'approved';

export default function MarketplaceContent() {
  const { activeRole, isCreator, isEditor } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [search, setSearch] = useState('');

  const { projects } = useMarketplaceProjects();

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (filter === 'in_progress') {
      result = result.filter(p => ['briefing', 'in_progress'].includes(p.status));
    } else if (filter === 'delivered') {
      result = result.filter(p => p.status === 'revision');
    } else if (filter === 'approved') {
      result = result.filter(p => ['approved', 'completed'].includes(p.status));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.brief.product_name.toLowerCase().includes(q) ||
        p.creator.display_name.toLowerCase().includes(q) ||
        p.brand_name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [projects, filter, search]);

  const filterTabs: { key: ContentFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: projects.length },
    { key: 'in_progress', label: 'En Progreso', count: projects.filter(p => ['briefing', 'in_progress'].includes(p.status)).length },
    { key: 'delivered', label: 'Entregados', count: projects.filter(p => p.status === 'revision').length },
    { key: 'approved', label: 'Aprobados', count: projects.filter(p => ['approved', 'completed'].includes(p.status)).length },
  ];

  const pageTitle = isCreator ? 'Mi Portafolio & Entregas' : isEditor ? 'Mis Ediciones' : 'Mi Biblioteca de Contenido';
  const pageSubtitle = isCreator
    ? 'Tu portafolio publico y entregas de proyectos'
    : isEditor
    ? 'Tus ediciones y entregas por proyecto'
    : 'Contenido recibido de tus proyectos con creadores';

  return (
    <div className="bg-background pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">{pageSubtitle}</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por proyecto, creador o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-primary text-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Content Grid — optimized for 9:16 */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {filter === 'all' ? 'Aun no tienes contenido' : 'Sin resultados'}
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              {filter === 'all'
                ? isCreator
                  ? 'Explora campanas y acepta ofertas para comenzar a crear contenido'
                  : 'Contrata creadores o publica campanas para recibir contenido'
                : 'No hay contenido con este filtro'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate(isCreator ? '/marketplace/campaigns' : '/marketplace')}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-foreground font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                {isCreator ? 'Explorar Campanas' : 'Buscar Creadores'}
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
                {/* Vertical thumbnail 9:16 */}
                <div className="aspect-[9/16] bg-gradient-to-br from-purple-900/40 via-[#1a1a2e] to-blue-900/40 flex items-center justify-center relative">
                  <div className="flex flex-col items-center gap-2">
                    <Film className="h-8 w-8 text-gray-700" />
                    <span className="text-[10px] text-gray-600 font-medium">{project.package_name}</span>
                  </div>

                  {/* Play button overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                      <Play className="h-5 w-5 text-foreground ml-0.5" />
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[project.status] || 'bg-gray-500/20 text-foreground/80'}`}>
                      {STATUS_LABELS[project.status] || project.status}
                    </span>
                  </div>

                  {/* Action buttons for approved/completed */}
                  {['approved', 'completed'].includes(project.status) && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <Download className="h-3 w-3 text-foreground" />
                      </button>
                      <button className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <Eye className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Bottom overlay with info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
                    {/* Creator/brand avatar + name */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {project.creator.avatar_url ? (
                        <img src={project.creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-[8px] font-bold flex-shrink-0">
                          {(isCreator ? project.brand_name : project.creator.display_name).charAt(0)}
                        </div>
                      )}
                      <span className="text-foreground text-[11px] font-medium truncate">
                        {isCreator ? project.brand_name : `@${project.creator.display_name}`}
                      </span>
                    </div>

                    {/* Product name */}
                    <p className="text-foreground text-xs font-medium leading-tight line-clamp-2">
                      {project.brief.product_name}
                    </p>

                    {/* Payment info */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {project.payment_method === 'exchange' ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                          <Gift className="h-2.5 w-2.5" /> Canje
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
    </div>
  );
}
