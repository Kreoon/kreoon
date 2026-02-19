import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Inbox, Briefcase, Clapperboard, CheckCircle2, DollarSign,
  Film, FolderKanban, ArrowRight, Megaphone, Search, Loader2,
  AlertTriangle, Calendar, CalendarPlus,
} from 'lucide-react';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import type { MarketplaceProject, ProjectStatus } from '../types/marketplace';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  pending: 'bg-purple-500/20 text-purple-300',
  briefing: 'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-yellow-500/20 text-yellow-300',
  revision: 'bg-pink-500/20 text-pink-300',
  approved: 'bg-green-500/20 text-green-300',
  completed: 'bg-cyan-500/20 text-cyan-300',
  cancelled: 'bg-red-500/20 text-red-300',
  overdue: 'bg-red-500/20 text-red-300',
};

interface MarketplaceDashboardTabProps {
  role: 'creator' | 'editor' | 'brand' | 'admin';
}

const ROLE_CONFIG = {
  creator: {
    title: 'Marketplace — Creador',
    subtitle: 'Gestiona tus proyectos del marketplace',
    statusLabels: {
      pending: 'Nueva Oferta', briefing: 'Revisando Brief', in_progress: 'Produciendo',
      revision: 'Entregado', approved: 'Aprobado', completed: 'Completado', cancelled: 'Cancelado', overdue: 'Vencido',
    } as Record<ProjectStatus, string>,
    kpis: (stats: any) => [
      { icon: Inbox, label: 'Nuevas ofertas', value: stats.pendingOffers, color: 'bg-purple-500/20 text-purple-400' },
      { icon: Megaphone, label: 'Campanas disponibles', value: stats.availableCampaigns, color: 'bg-blue-500/20 text-blue-400' },
      { icon: Clapperboard, label: 'En produccion', value: stats.inProgress, color: 'bg-yellow-500/20 text-yellow-400' },
      { icon: CheckCircle2, label: 'Completados', value: stats.completedProjects, color: 'bg-green-500/20 text-green-400' },
      { icon: DollarSign, label: 'Ganancias', value: `$${stats.creatorEarnings.toLocaleString()}`, color: 'bg-cyan-500/20 text-cyan-400' },
    ],
    quickActions: (navigate: any) => [
      { label: 'Ver Ofertas', icon: FolderKanban, onClick: () => navigate('/board?view=marketplace'), primary: true },
      { label: 'Explorar Campanas', icon: Search, onClick: () => navigate('/marketplace/campaigns'), primary: false },
    ],
  },
  editor: {
    title: 'Marketplace — Editor',
    subtitle: 'Proyectos de edicion del marketplace',
    statusLabels: {
      pending: 'Pendiente', briefing: 'En Brief', in_progress: 'Por Editar',
      revision: 'Entregado', approved: 'Aprobado', completed: 'Completado', cancelled: 'Cancelado', overdue: 'Vencido',
    } as Record<ProjectStatus, string>,
    kpis: (stats: any) => [
      { icon: Film, label: 'Por editar', value: stats.pendingEdits, color: 'bg-yellow-500/20 text-yellow-400' },
      { icon: Clapperboard, label: 'Entregados', value: stats.delivered, color: 'bg-pink-500/20 text-pink-400' },
      { icon: CheckCircle2, label: 'Aprobados', value: stats.completedProjects, color: 'bg-green-500/20 text-green-400' },
      { icon: DollarSign, label: 'Ganancias', value: `$${stats.editorEarnings.toLocaleString()}`, color: 'bg-cyan-500/20 text-cyan-400' },
    ],
    quickActions: (navigate: any) => [
      { label: 'Proyectos por Editar', icon: FolderKanban, onClick: () => navigate('/board?view=marketplace'), primary: true },
    ],
  },
  brand: {
    title: 'Marketplace — Marca',
    subtitle: 'Gestiona tus proyectos con creadores',
    statusLabels: {
      pending: 'Enviado', briefing: 'En Brief', in_progress: 'En Produccion',
      revision: 'En Revision', approved: 'Aprobado', completed: 'Completado', cancelled: 'Cancelado', overdue: 'Vencido',
    } as Record<ProjectStatus, string>,
    kpis: (stats: any) => [
      { icon: Briefcase, label: 'Proyectos activos', value: stats.activeProjects, color: 'bg-purple-500/20 text-purple-400' },
      { icon: Megaphone, label: 'Campanas activas', value: stats.activeCampaigns, color: 'bg-blue-500/20 text-blue-400' },
      { icon: Clapperboard, label: 'En revision', value: stats.inRevision, color: 'bg-pink-500/20 text-pink-400' },
      { icon: CheckCircle2, label: 'Completados', value: stats.completedProjects, color: 'bg-green-500/20 text-green-400' },
      { icon: DollarSign, label: 'Total invertido', value: `$${stats.totalInvested.toLocaleString()}`, color: 'bg-cyan-500/20 text-cyan-400' },
    ],
    quickActions: (navigate: any) => [
      { label: 'Buscar Creadores', icon: Search, onClick: () => navigate('/marketplace'), primary: true },
      { label: 'Ver Proyectos', icon: FolderKanban, onClick: () => navigate('/board?view=marketplace'), primary: false },
    ],
  },
  admin: {
    title: 'Marketplace — Overview',
    subtitle: 'Vista general de la actividad del marketplace',
    statusLabels: {
      pending: 'Pendiente', briefing: 'En Brief', in_progress: 'En Produccion',
      revision: 'En Revision', approved: 'Aprobado', completed: 'Completado', cancelled: 'Cancelado', overdue: 'Vencido',
    } as Record<ProjectStatus, string>,
    kpis: (stats: any) => [
      { icon: Briefcase, label: 'Proyectos activos', value: stats.activeProjects, color: 'bg-purple-500/20 text-purple-400' },
      { icon: Megaphone, label: 'Campanas activas', value: stats.activeCampaigns, color: 'bg-blue-500/20 text-blue-400' },
      { icon: Clapperboard, label: 'En revision', value: stats.inRevision, color: 'bg-pink-500/20 text-pink-400' },
      { icon: CheckCircle2, label: 'Completados', value: stats.completedProjects, color: 'bg-green-500/20 text-green-400' },
      { icon: DollarSign, label: 'Total invertido', value: `$${stats.totalInvested.toLocaleString()}`, color: 'bg-cyan-500/20 text-cyan-400' },
    ],
    quickActions: (navigate: any) => [
      { label: 'Buscar Creadores', icon: Search, onClick: () => navigate('/marketplace'), primary: true },
      { label: 'Ver Proyectos', icon: FolderKanban, onClick: () => navigate('/board?view=marketplace'), primary: false },
    ],
  },
};

function ProjectRow({ project, statusLabels }: { project: MarketplaceProject; statusLabels: Record<ProjectStatus, string> }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/board?view=marketplace')}
      className="w-full bg-card/60 border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/30 transition-all text-left"
    >
      {project.creator.avatar_url ? (
        <img src={project.creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm flex-shrink-0">
          {project.creator.display_name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">{project.brief.product_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
            {statusLabels[project.status]}
          </span>
        </div>
        <p className="text-gray-500 text-xs truncate">
          {project.creator.display_name} — {project.brand_name}
        </p>
      </div>
      {project.payment_method === 'payment' ? (
        <p className="text-white text-sm font-semibold flex-shrink-0">${project.total_price.toLocaleString()}</p>
      ) : (
        <span className="text-green-400 text-xs font-medium flex-shrink-0">Canje</span>
      )}
    </button>
  );
}

export function MarketplaceDashboardTab({ role }: MarketplaceDashboardTabProps) {
  const navigate = useNavigate();
  const hookRole = role === 'admin' ? 'brand' : role;
  const { projects, loading: projectsLoading } = useMarketplaceProjects({ role: hookRole });
  const { stats, loading: statsLoading } = useMarketplaceStats({ role: hookRole });

  const config = ROLE_CONFIG[role];
  const recentProjects = projects.slice(0, 5);

  // Novedades: overdue or near-deadline projects
  const overdueProjects = useMemo(() => {
    const now = Date.now();
    return projects.filter(p => {
      if (p.status === 'completed' || p.status === 'cancelled') return false;
      if (p.status === 'overdue') return true;
      if (!p.deadline) return false;
      return new Date(p.deadline).getTime() < now;
    });
  }, [projects]);

  const urgentProjects = useMemo(() => {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return projects.filter(p => {
      if (p.status === 'completed' || p.status === 'cancelled' || p.status === 'overdue') return false;
      if (!p.deadline) return false;
      const dl = new Date(p.deadline).getTime();
      return dl >= now && dl - now <= threeDays;
    });
  }, [projects]);

  if (projectsLoading || statsLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const kpis = config.kpis(stats);
  const quickActions = config.quickActions(navigate);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className={`grid grid-cols-2 ${kpis.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{kpi.value}</p>
                <p className="text-gray-500 text-xs">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors ${
              action.primary
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'border border-white/20 text-white hover:bg-white/5'
            }`}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Novedades: Overdue & Urgent */}
      {(overdueProjects.length > 0 || urgentProjects.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Novedades
          </h3>

          {overdueProjects.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 space-y-3">
              <p className="text-red-300 text-xs font-semibold uppercase tracking-wide">
                Vencidos ({overdueProjects.length})
              </p>
              {overdueProjects.map(project => {
                const daysOverdue = project.deadline
                  ? Math.abs(Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate('/board?view=marketplace')}
                    className="w-full flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{project.brief.product_name}</p>
                      <p className="text-gray-500 text-xs truncate">{project.creator.display_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-red-400 text-xs font-semibold">{daysOverdue}d vencido</p>
                      {project.overdue_action && (
                        <p className="text-gray-500 text-[10px]">
                          {project.overdue_action === 'extend' ? 'Extendido' :
                           project.overdue_action === 'reassign' ? 'Reasignando' : 'Cancelando'}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {urgentProjects.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide">
                Proximos a vencer ({urgentProjects.length})
              </p>
              {urgentProjects.map(project => {
                const daysLeft = project.deadline
                  ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate('/board?view=marketplace')}
                    className="w-full flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{project.brief.product_name}</p>
                      <p className="text-gray-500 text-xs truncate">{project.creator.display_name}</p>
                    </div>
                    <p className="text-amber-400 text-xs font-semibold flex-shrink-0">
                      {daysLeft === 0 ? 'Hoy' : `${daysLeft}d restantes`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Proyectos recientes</h3>
          <button
            onClick={() => navigate('/board?view=marketplace')}
            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="bg-card/40 border border-white/5 rounded-xl p-8 text-center">
            <FolderKanban className="h-10 w-10 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">Sin proyectos activos en el marketplace</p>
            <button
              onClick={() => navigate('/marketplace')}
              className="mt-3 text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              Explorar marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map(project => (
              <ProjectRow key={project.id} project={project} statusLabels={config.statusLabels} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
