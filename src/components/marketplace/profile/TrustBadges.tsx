import {
  Shield,
  CheckCircle,
  Mail,
  FileCheck,
  CreditCard,
  Clock,
  Award,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  Heart,
  Bookmark,
  Building2,
  MessageSquare,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export interface CreatorTrustStats {
  // Proyectos
  completed_projects: number;
  marketplace_projects: number;
  org_projects: number;
  active_projects: number;
  cancelled_projects: number;
  cancellation_rate: number;

  // Ratings
  rating_avg: number;
  rating_count: number;

  // Tiempos
  response_time_hours: number;
  on_time_delivery_pct: number;
  avg_delivery_days: number;
  last_delivery_days: number;

  // Clientes
  unique_clients: number;
  repeat_clients: number;
  repeat_clients_pct: number;

  // Financiero
  total_earned: number;

  // Antigüedad
  member_since: string | null;
  days_on_platform: number;

  // Verificaciones
  identity_verified: boolean;
  email_verified: boolean;
  legal_docs_signed: number;
  payment_verified: boolean;
  onboarding_completed: boolean;

  // Portfolio
  portfolio_views: number;
  portfolio_likes: number;
  portfolio_saves: number;
  portfolio_items: number;

  // Experiencia
  industries: string[];
  organizations_worked: number;

  // Comunicación
  invitation_response_rate: number;
  invitations_received: number;
}

interface TrustBadgesProps {
  stats: CreatorTrustStats;
  compact?: boolean;
}

export function TrustBadges({ stats, compact = false }: TrustBadgesProps) {
  const verificationBadges = [
    {
      label: 'Identidad verificada',
      verified: stats.identity_verified,
      icon: Shield,
    },
    {
      label: 'Email verificado',
      verified: stats.email_verified,
      icon: Mail,
    },
    {
      label: 'Documentos legales',
      verified: stats.legal_docs_signed > 0,
      icon: FileCheck,
      count: stats.legal_docs_signed,
    },
    {
      label: 'Pagos verificados',
      verified: stats.payment_verified,
      icon: CreditCard,
    },
  ];

  const achievementBadges = [];

  // Badge de antigüedad
  if (stats.days_on_platform >= 365) {
    const years = Math.floor(stats.days_on_platform / 365);
    achievementBadges.push({
      label: `${years}+ año${years > 1 ? 's' : ''} en plataforma`,
      icon: Award,
      color: 'text-yellow-400 bg-yellow-500/20',
    });
  } else if (stats.days_on_platform >= 180) {
    achievementBadges.push({
      label: '6+ meses en plataforma',
      icon: Clock,
      color: 'text-blue-400 bg-blue-500/20',
    });
  }

  // Badge de proyectos
  if (stats.completed_projects >= 100) {
    achievementBadges.push({
      label: '100+ proyectos',
      icon: Zap,
      color: 'text-purple-400 bg-purple-500/20',
    });
  } else if (stats.completed_projects >= 50) {
    achievementBadges.push({
      label: '50+ proyectos',
      icon: TrendingUp,
      color: 'text-green-400 bg-green-500/20',
    });
  } else if (stats.completed_projects >= 10) {
    achievementBadges.push({
      label: '10+ proyectos',
      icon: CheckCircle,
      color: 'text-blue-400 bg-blue-500/20',
    });
  }

  // Badge de rating
  if (stats.rating_avg >= 4.8 && stats.rating_count >= 5) {
    achievementBadges.push({
      label: 'Top Rated',
      icon: Star,
      color: 'text-yellow-400 bg-yellow-500/20',
    });
  }

  // Badge de respuesta rápida
  if (stats.response_time_hours <= 1) {
    achievementBadges.push({
      label: 'Respuesta rápida',
      icon: MessageSquare,
      color: 'text-green-400 bg-green-500/20',
    });
  }

  // Badge de entrega puntual
  if (stats.on_time_delivery_pct >= 95 && stats.completed_projects >= 5) {
    achievementBadges.push({
      label: 'Siempre puntual',
      icon: Clock,
      color: 'text-emerald-400 bg-emerald-500/20',
    });
  }

  // Badge de clientes recurrentes
  if (stats.repeat_clients_pct >= 30 && stats.unique_clients >= 3) {
    achievementBadges.push({
      label: 'Clientes fieles',
      icon: Users,
      color: 'text-pink-400 bg-pink-500/20',
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {verificationBadges.filter(b => b.verified).map((badge, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs"
            title={badge.label}
          >
            <badge.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{badge.label}</span>
          </div>
        ))}
        {achievementBadges.map((badge, i) => (
          <div
            key={`ach-${i}`}
            className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs", badge.color)}
            title={badge.label}
          >
            <badge.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{badge.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verificaciones */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Verificaciones
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {verificationBadges.map((badge, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                badge.verified
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              <badge.icon className="w-4 h-4" />
              <span>{badge.label}</span>
              {badge.verified && <CheckCircle className="w-3 h-3 ml-auto" />}
            </div>
          ))}
        </div>
      </div>

      {/* Logros */}
      {achievementBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Logros
          </h3>
          <div className="flex flex-wrap gap-2">
            {achievementBadges.map((badge, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm",
                  badge.color
                )}
              >
                <badge.icon className="w-4 h-4" />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CreatorMetricsProps {
  stats: CreatorTrustStats;
}

export function CreatorMetrics({ stats }: CreatorMetricsProps) {
  const memberSince = stats.member_since
    ? format(new Date(stats.member_since), "MMMM yyyy", { locale: es })
    : null;

  const lastDelivery = stats.last_delivery_days > 0
    ? stats.last_delivery_days <= 1
      ? 'Ayer'
      : stats.last_delivery_days <= 7
        ? `Hace ${stats.last_delivery_days} días`
        : stats.last_delivery_days <= 30
          ? `Hace ${Math.round(stats.last_delivery_days / 7)} semanas`
          : `Hace ${Math.round(stats.last_delivery_days / 30)} meses`
    : null;

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={CheckCircle}
          value={stats.completed_projects}
          label="Proyectos completados"
          sublabel={stats.org_projects > 0 ? `${stats.marketplace_projects} marketplace + ${stats.org_projects} org` : undefined}
        />
        <MetricCard
          icon={Star}
          value={stats.rating_avg > 0 ? stats.rating_avg.toFixed(1) : 'N/A'}
          label="Rating promedio"
          sublabel={stats.rating_count > 0 ? `${stats.rating_count} reseñas` : undefined}
        />
        <MetricCard
          icon={Clock}
          value={stats.response_time_hours < 1
            ? `< ${Math.round(stats.response_time_hours * 60)} min`
            : `< ${stats.response_time_hours} hrs`}
          label="Tiempo de respuesta"
        />
        <MetricCard
          icon={TrendingUp}
          value={`${stats.on_time_delivery_pct}%`}
          label="Entrega a tiempo"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <MiniMetric
          icon={Users}
          value={stats.unique_clients}
          label="Clientes"
        />
        <MiniMetric
          icon={Heart}
          value={`${stats.repeat_clients_pct}%`}
          label="Recontratación"
        />
        <MiniMetric
          icon={Building2}
          value={stats.organizations_worked}
          label="Organizaciones"
        />
        <MiniMetric
          icon={Eye}
          value={formatNumber(stats.portfolio_views)}
          label="Vistas"
        />
        <MiniMetric
          icon={Heart}
          value={formatNumber(stats.portfolio_likes)}
          label="Likes"
        />
        <MiniMetric
          icon={Bookmark}
          value={stats.portfolio_saves}
          label="Guardados"
        />
      </div>

      {/* Info adicional */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
        {memberSince && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Miembro desde {memberSince}</span>
          </div>
        )}
        {lastDelivery && (
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            <span>Última entrega: {lastDelivery}</span>
          </div>
        )}
        {stats.active_projects > 0 && (
          <div className="flex items-center gap-1.5 text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>{stats.active_projects} proyecto{stats.active_projects > 1 ? 's' : ''} activo{stats.active_projects > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">
        <Icon className="w-5 h-5 text-purple-400" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
      {sublabel && <div className="text-[10px] text-white/30 mt-0.5">{sublabel}</div>}
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-white/40" />
        <span className="text-lg font-semibold text-white">{value}</span>
      </div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default TrustBadges;
