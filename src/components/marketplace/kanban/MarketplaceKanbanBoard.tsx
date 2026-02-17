import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, MessageSquare, Gift, DollarSign, Calendar, GripVertical, Film, Play, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import { ProjectDetailModal } from './ProjectDetailModal';
import type { MarketplaceProject, ProjectStatus, KanbanColumnConfig } from '../types/marketplace';

// ── Deadline indicator helper ────────────────────────────────────────
function DeadlineIndicator({ deadline, status }: { deadline: string; status: ProjectStatus }) {
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (status === 'completed' || status === 'cancelled') {
    return (
      <div className="flex items-center gap-0.5 text-gray-600 text-[10px]">
        <Calendar className="h-2.5 w-2.5" />
        {dl.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
      </div>
    );
  }

  if (diffDays < 0) {
    // Overdue
    return (
      <div className="flex items-center gap-0.5 text-red-400 text-[10px] font-medium">
        <AlertTriangle className="h-2.5 w-2.5" />
        Vencido {Math.abs(diffDays)}d
      </div>
    );
  }

  if (diffDays <= 3) {
    // Urgent
    return (
      <div className="flex items-center gap-0.5 text-amber-400 text-[10px] font-medium">
        <Calendar className="h-2.5 w-2.5" />
        {diffDays === 0 ? 'Hoy' : `${diffDays}d`}
      </div>
    );
  }

  // Normal
  return (
    <div className="flex items-center gap-0.5 text-gray-600 text-[10px]">
      <Calendar className="h-2.5 w-2.5" />
      {dl.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
    </div>
  );
}

interface MarketplaceKanbanBoardProps {
  columns: KanbanColumnConfig[];
  viewRole: 'brand' | 'creator' | 'editor';
}

export function MarketplaceKanbanBoard({ columns, viewRole }: MarketplaceKanbanBoardProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { projects: dbProjects, updateProjectStatus: dbUpdateStatus } = useMarketplaceProjects({ role: viewRole });
  const [localProjects, setLocalProjects] = useState<MarketplaceProject[]>([]);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Sync local state when DB projects load
  const projects = dbProjects.length > 0 ? dbProjects : localProjects;
  const setProjects = setLocalProjects;

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      p =>
        p.brief.product_name.toLowerCase().includes(q) ||
        p.creator.display_name.toLowerCase().includes(q) ||
        p.brand_name.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const projectsByStatus = useMemo(() => {
    const map: Record<string, MarketplaceProject[]> = {};
    for (const col of columns) {
      map[col.id] = filteredProjects.filter(p => p.status === col.id);
    }
    return map;
  }, [filteredProjects, columns]);

  const handleDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('text/plain', projectId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: ProjectStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      const projectId = e.dataTransfer.getData('text/plain');
      const project = projects.find(p => p.id === projectId);
      if (!project || project.status === targetStatus) return;

      // Check if transition is allowed
      const sourceColumn = columns.find(c => c.id === project.status);
      if (!sourceColumn?.allowedTransitions.includes(targetStatus)) return;

      // Optimistic local update
      setProjects(prev =>
        prev.map(p => (p.id === projectId ? { ...p, status: targetStatus, updated_at: new Date().toISOString() } : p)),
      );
      // Persist to DB
      dbUpdateStatus(projectId, targetStatus);
    },
    [projects, columns, dbUpdateStatus],
  );

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  const roleLabel = viewRole === 'brand' ? 'Marca' : viewRole === 'creator' ? 'Creador' : 'Editor';

  return (
    <div className="bg-[#0a0a0f] min-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/marketplace/dashboard')}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-gray-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Mis Proyectos</h1>
                <p className="text-gray-500 text-xs">Vista {roleLabel}</p>
              </div>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-24 lg:pb-8">
        <div className="flex gap-4 p-4 md:p-6 min-w-max max-w-[1600px] mx-auto">
          {columns.map(column => {
            const colProjects = projectsByStatus[column.id] || [];
            const isDropTarget = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={cn(
                  'w-[320px] flex-shrink-0 rounded-xl transition-all',
                  isDropTarget ? 'ring-2 ring-purple-500/50' : '',
                )}
                onDragOver={e => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, column.id)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                  <h3 className="text-sm font-semibold text-gray-300">{column.label}</h3>
                  <span className="bg-white/10 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">
                    {colProjects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 px-1 pb-4 min-h-[200px]">
                  {colProjects.map(project => (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={e => handleDragStart(e, project.id)}
                      onClick={() => setSelectedProjectId(project.id)}
                      className="bg-[#1a1a2e]/80 backdrop-blur border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/30 transition-all group"
                    >
                      {/* Vertical thumbnail preview */}
                      <div className="flex gap-3 p-3">
                        <div className="w-16 flex-shrink-0 aspect-[9/16] rounded-lg bg-gradient-to-br from-purple-900/40 to-blue-900/40 flex items-center justify-center relative overflow-hidden">
                          <Film className="h-4 w-4 text-gray-600" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Play className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                          </div>
                        </div>

                        {/* Card info */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* Header: avatar + name + drag */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {viewRole === 'brand' && project.creator.avatar_url ? (
                                <img src={project.creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                              ) : viewRole !== 'brand' && project.brand_logo ? (
                                <img src={project.brand_logo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-[9px] font-bold flex-shrink-0">
                                  {(viewRole === 'brand' ? project.creator.display_name : project.brand_name).charAt(0)}
                                </div>
                              )}
                              <span className="text-white text-xs font-medium truncate">
                                {viewRole === 'brand' ? project.creator.display_name : project.brand_name}
                              </span>
                            </div>
                            <GripVertical className="h-3.5 w-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>

                          <p className="text-gray-400 text-[11px] mb-0.5 truncate">{project.brief.product_name}</p>
                          <p className="text-gray-600 text-[10px] mb-2">{project.package_name}</p>

                          {/* Progress bar */}
                          {project.deliverables_count > 0 && (
                            <div className="mb-2">
                              <div className="w-full bg-white/5 rounded-full h-1">
                                <div
                                  className="bg-purple-500 h-full rounded-full transition-all"
                                  style={{ width: `${(project.deliverables_approved / project.deliverables_count) * 100}%` }}
                                />
                              </div>
                              <p className="text-gray-600 text-[10px] mt-0.5">
                                {project.deliverables_approved}/{project.deliverables_count} entregables
                              </p>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1">
                              {project.payment_method === 'exchange' ? (
                                <Gift className="h-3 w-3 text-green-400" />
                              ) : (
                                <DollarSign className="h-3 w-3 text-gray-500" />
                              )}
                              <span className="text-gray-500 text-[10px]">
                                {project.payment_method === 'exchange' ? 'Canje' : `$${project.total_price.toLocaleString()}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {project.deadline && (
                                <DeadlineIndicator deadline={project.deadline} status={project.status} />
                              )}
                              {project.unread_messages > 0 && (
                                <span className="flex items-center gap-0.5 bg-purple-500/20 text-purple-300 text-[10px] px-1 py-0.5 rounded-full">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {project.unread_messages}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {colProjects.length === 0 && (
                    <div className="text-center text-gray-600 text-xs py-8">
                      Sin proyectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project detail modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          viewRole={viewRole}
          onClose={() => setSelectedProjectId(null)}
          onStatusChange={(projectId, newStatus) => {
            // Optimistic local update
            setProjects(prev =>
              prev.map(p =>
                p.id === projectId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p,
              ),
            );
            // Persist to DB
            dbUpdateStatus(projectId, newStatus);
          }}
          columns={columns}
        />
      )}
    </div>
  );
}
