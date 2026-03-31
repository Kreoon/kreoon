import { useNavigate } from 'react-router-dom';
import { Inbox, Clapperboard, CheckCircle2, DollarSign, FolderKanban, User, ArrowRight, Megaphone, Search, Loader2 } from 'lucide-react';
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
  pending: 'Nueva Oferta',
  briefing: 'Revisando Brief',
  in_progress: 'Produciendo',
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

export function CreatorMarketDashboard() {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useMarketplaceProjects({ role: 'creator' });
  const { stats, loading: statsLoading } = useMarketplaceStats({ role: 'creator' });

  const recentProjects = projects.slice(0, 5);

  if (projectsLoading || statsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Creador</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona tus proyectos del marketplace</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Inbox} label="Nuevas ofertas" value={stats.pendingOffers} color="bg-purple-500/20 text-purple-400" />
          <KpiCard icon={Megaphone} label="Campanas disponibles" value={stats.availableCampaigns} color="bg-blue-500/20 text-blue-400" />
          <KpiCard icon={Clapperboard} label="En produccion" value={stats.inProgress} color="bg-yellow-500/20 text-yellow-400" />
          <KpiCard icon={CheckCircle2} label="Completados" value={stats.completedProjects} color="bg-green-500/20 text-green-400" />
          <KpiCard icon={DollarSign} label="Ganancias" value={`$${stats.creatorEarnings.toLocaleString()}`} color="bg-cyan-500/20 text-cyan-400" />
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate('/board?view=marketplace')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-foreground font-semibold px-5 py-2.5 rounded-sm text-sm transition-colors"
          >
            <FolderKanban className="h-4 w-4" />
            Ver Ofertas
          </button>
          <button
            onClick={() => navigate('/marketplace/campaigns')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-foreground font-semibold px-5 py-2.5 rounded-sm text-sm transition-colors"
          >
            <Search className="h-4 w-4" />
            Explorar Campanas
          </button>
          <button
            onClick={() => navigate('/marketplace/creator-campaigns')}
            className="flex items-center gap-2 border border-white/20 text-foreground font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-white/5 transition-colors"
          >
            <Megaphone className="h-4 w-4" />
            Mis Aplicaciones
          </button>
          <button
            onClick={() => navigate('/settings?section=marketplace')}
            className="flex items-center gap-2 border border-white/20 text-foreground font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-white/5 transition-colors"
          >
            <User className="h-4 w-4" />
            Config Marketplace
          </button>
        </div>

        {/* Recent projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Proyectos recientes</h2>
            <button
              onClick={() => navigate('/board?view=marketplace')}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {recentProjects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate('/board?view=marketplace')}
                className="w-full bg-card/60 border border-white/5 rounded-sm p-4 flex items-center gap-4 hover:border-purple-500/30 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-sm bg-purple-500/10 flex items-center justify-center text-purple-300 flex-shrink-0">
                  <Clapperboard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium truncate">{project.brief.product_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs truncate">
                    {project.brand_name} — {project.package_name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {project.payment_method === 'payment' ? (
                    <p className="text-foreground text-sm font-semibold">${project.total_price.toLocaleString()}</p>
                  ) : (
                    <span className="text-green-400 text-xs font-medium">Canje</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
