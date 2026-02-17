import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceProjects, BRAND_COLUMNS, CREATOR_COLUMNS, EDITOR_COLUMNS } from '@/hooks/useMarketplaceProjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, DollarSign, Calendar, User, Package, Plus } from 'lucide-react';
import { ProjectTypeSelector } from '@/components/projects/ProjectTypeSelector';
import type { MarketplaceProject, ProjectStatus, KanbanColumnConfig } from '@/components/marketplace/types/marketplace';
import type { ProjectType } from '@/types/unifiedProject.types';

const UnifiedProjectModal = lazy(() => import('@/components/projects/UnifiedProjectModal'));

// ── Status styling ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<ProjectStatus, string> = {
  pending: 'bg-purple-500/20 text-purple-300',
  briefing: 'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-yellow-500/20 text-yellow-300',
  revision: 'bg-pink-500/20 text-pink-300',
  approved: 'bg-green-500/20 text-green-300',
  completed: 'bg-cyan-500/20 text-cyan-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: 'Pendiente',
  briefing: 'En Brief',
  in_progress: 'En Producción',
  revision: 'En Revisión',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

// ── Project Card ───────────────────────────────────────────────────────

function MarketplaceProjectCard({
  project,
  onDragStart,
  isDragging,
}: {
  project: MarketplaceProject;
  onDragStart: (e: React.DragEvent, project: MarketplaceProject) => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, project)}
      className={`bg-[#1a1a2e]/80 border border-white/10 rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all hover:border-purple-500/30 ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
    >
      {/* Header: title + status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-medium text-white truncate flex-1">
          {project.brief?.product_name || project.package_name || 'Proyecto'}
        </h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-2 mb-2">
        {project.creator.avatar_url ? (
          <img src={project.creator.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">
            {project.creator.display_name.charAt(0)}
          </div>
        )}
        <span className="text-gray-400 text-xs truncate">{project.creator.display_name}</span>
      </div>

      {/* Brand + package */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <Briefcase className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{project.brand_name}</span>
        {project.package_name && (
          <>
            <span>•</span>
            <Package className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{project.package_name}</span>
          </>
        )}
      </div>

      {/* Footer: price + deadline */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1">
          {project.payment_method === 'payment' ? (
            <span className="text-white text-xs font-semibold flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-400" />
              {project.total_price.toLocaleString()} {project.currency}
            </span>
          ) : (
            <span className="text-green-400 text-xs font-medium">Canje</span>
          )}
        </div>
        {project.deadline && (
          <span className="text-gray-500 text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(project.deadline).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Deliverables progress */}
      {project.deliverables_count > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Entregables</span>
            <span>{project.deliverables_approved}/{project.deliverables_count}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${(project.deliverables_approved / project.deliverables_count) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Board View ────────────────────────────────────────────────────

export function MarketplaceBoardView() {
  const { isCreator, isEditor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const role = isCreator ? 'creator' : isEditor ? 'editor' : 'brand';
  const { projects, loading, refetch, updateProjectStatus } = useMarketplaceProjects({ role });

  const columns: KanbanColumnConfig[] = useMemo(() => {
    if (isCreator) return CREATOR_COLUMNS;
    if (isEditor) return EDITOR_COLUMNS;
    return BRAND_COLUMNS;
  }, [isCreator, isEditor]);

  const [draggingProject, setDraggingProject] = useState<MarketplaceProject | null>(null);
  const [dropTarget, setDropTarget] = useState<ProjectStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createProjectType, setCreateProjectType] = useState<ProjectType | null>(null);

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const q = searchTerm.toLowerCase();
    return projects.filter(
      p =>
        p.brief?.product_name?.toLowerCase().includes(q) ||
        p.brand_name.toLowerCase().includes(q) ||
        p.creator.display_name.toLowerCase().includes(q) ||
        p.package_name?.toLowerCase().includes(q),
    );
  }, [projects, searchTerm]);

  const getProjectsByStatus = useCallback(
    (status: ProjectStatus) => filteredProjects.filter(p => p.status === status),
    [filteredProjects],
  );

  const handleDragStart = useCallback((e: React.DragEvent, project: MarketplaceProject) => {
    setDraggingProject(project);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatus: ProjectStatus) => {
      e.preventDefault();
      setDropTarget(null);

      if (!draggingProject || draggingProject.status === targetStatus) {
        setDraggingProject(null);
        return;
      }

      // Check if transition is allowed
      const currentColumn = columns.find(c => c.id === draggingProject.status);
      if (currentColumn && !currentColumn.allowedTransitions.includes(targetStatus)) {
        setDraggingProject(null);
        return;
      }

      await updateProjectStatus(draggingProject.id, targetStatus);
      setDraggingProject(null);
    },
    [draggingProject, columns, updateProjectStatus],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl border border-white/10 bg-[hsl(250,20%,6%)] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all placeholder:text-gray-500"
          />
        </div>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {filteredProjects.length} proyectos
        </Badge>
        {isAdmin && (
          <Button
            variant="glow"
            size="sm"
            className="gap-1.5 text-xs md:text-sm ml-auto"
            onClick={() => setShowTypeSelector(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Proyecto</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        )}
      </div>

      {/* Kanban columns */}
      <div
        className="flex overflow-x-auto gap-4 p-5 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, #0a0118 0%, #0d0220 100%)',
          height: 'calc(100vh - 280px)',
        }}
      >
        {columns.map(col => {
          const colProjects = getProjectsByStatus(col.id);
          const isOver = dropTarget === col.id;
          const canDrop = draggingProject
            ? columns.find(c => c.id === draggingProject.status)?.allowedTransitions.includes(col.id) ?? false
            : false;

          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-72 rounded-xl border transition-all ${
                isOver && canDrop
                  ? 'border-purple-500/50 bg-purple-500/5'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
              onDragOver={(e) => {
                handleDragOver(e);
                setDropTarget(col.id);
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="p-3 border-b border-white/5 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-medium text-white">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto h-5 px-1.5">
                  {colProjects.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 48px)' }}>
                {colProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-xs">Sin proyectos</div>
                ) : (
                  colProjects.map(project => (
                    <MarketplaceProjectCard
                      key={project.id}
                      project={project}
                      onDragStart={handleDragStart}
                      isDragging={draggingProject?.id === project.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Project type selector */}
      <ProjectTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={(type) => {
          setCreateProjectType(type);
          setShowCreateDialog(true);
        }}
      />

      {/* Create marketplace project dialog */}
      {showCreateDialog && createProjectType && (
        <Suspense fallback={null}>
          <UnifiedProjectModal
            source="marketplace"
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) setCreateProjectType(null);
            }}
            onUpdate={refetch}
            mode="create"
            createProjectType={createProjectType}
          />
        </Suspense>
      )}
    </div>
  );
}
