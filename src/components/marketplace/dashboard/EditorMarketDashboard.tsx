import { useNavigate } from 'react-router-dom';
import { Film, Clapperboard, CheckCircle2, DollarSign, FolderKanban, ArrowRight, Loader2 } from 'lucide-react';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import type { ProjectStatus } from '../types/marketplace';

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
  in_progress: 'Por Editar',
  revision: 'Entregado',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card/80 border border-white/10 rounded-sm p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-gray-500 text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function EditorMarketDashboard() {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useMarketplaceProjects({ role: 'editor' });
  const { stats, loading: statsLoading } = useMarketplaceStats({ role: 'editor' });

  if (projectsLoading || statsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const editorProjects = projects;

  return (
    <div className="bg-background pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Editor</h1>
          <p className="text-gray-500 text-sm mt-1">Proyectos de edicion del marketplace</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Film} label="Por editar" value={stats.pendingEdits} color="bg-yellow-500/20 text-yellow-400" />
          <KpiCard icon={Clapperboard} label="Entregados" value={stats.delivered} color="bg-pink-500/20 text-pink-400" />
          <KpiCard icon={CheckCircle2} label="Aprobados" value={stats.completedProjects} color="bg-green-500/20 text-green-400" />
          <KpiCard icon={DollarSign} label="Ganancias" value={`$${stats.editorEarnings.toLocaleString()}`} color="bg-cyan-500/20 text-cyan-400" />
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/board?view=marketplace')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-foreground font-semibold px-5 py-2.5 rounded-sm text-sm transition-colors"
          >
            <FolderKanban className="h-4 w-4" />
            Proyectos por Editar
          </button>
        </div>

        {/* Recent projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Proyectos asignados</h2>
            <button
              onClick={() => navigate('/board?view=marketplace')}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {editorProjects.slice(0, 5).map(project => (
              <div
                key={project.id}
                onClick={() => navigate('/board?view=marketplace')}
                className="w-full bg-card/60 border border-white/5 rounded-sm p-4 flex items-center gap-4 hover:border-purple-500/30 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center text-cyan-300 flex-shrink-0">
                  <Film className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium truncate">{project.brief.product_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs truncate">
                    Creador: {project.creator.display_name} — {project.brand_name}
                  </p>
                </div>
                {project.deadline && (
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {new Date(project.deadline).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
