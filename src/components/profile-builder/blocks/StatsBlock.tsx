import { memo } from 'react';
import {
  Users,
  Star,
  Briefcase,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  CheckCircle2,
  UserCheck,
  Calendar,
  PlayCircle,
  BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { useCreatorPublicProfile, type CreatorTrustStats } from '@/hooks/useCreatorPublicProfile';
import { useCreatorSocialStats } from '@/hooks/useCreatorSocialStats';

interface StatsConfig {
  layout: 'row' | 'grid' | 'cards';
  columns: '2' | '3' | '4' | '5' | '6';
  dataSource: 'auto' | 'manual';
  // Plataforma
  showProjects: boolean;
  showRating: boolean;
  showClients: boolean;
  showResponseTime: boolean;
  showDeliveryRate: boolean;
  showExperience: boolean;
  // Social
  showFollowers: boolean;
  showEngagement: boolean;
  showReach: boolean;
  showVideoViews: boolean;
  // Portfolio
  showPortfolioViews: boolean;
  showPortfolioLikes: boolean;
}

interface ManualStatItem {
  id: string;
  label: string;
  value: string;
  icon: string;
}

interface StatsContent {
  manualItems?: ManualStatItem[];
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

const COLUMNS_CLASSES: Record<string, string> = {
  '2': 'grid-cols-2',
  '3': 'grid-cols-2 md:grid-cols-3',
  '4': 'grid-cols-2 md:grid-cols-4',
  '5': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  '6': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

// Formateador de números grandes
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Formateador de tiempo
function formatResponseTime(hours: number): string {
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

interface StatItemDisplay {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  suffix?: string;
  isVerified?: boolean;
}

// Construir stats desde datos reales
function buildStatsFromData(
  config: StatsConfig,
  trustStats: CreatorTrustStats | null,
  socialStats: {
    total_followers: number;
    total_reach: number;
    total_video_views: number;
    avg_engagement_rate: number;
    platforms_count: number;
  } | null
): StatItemDisplay[] {
  const stats: StatItemDisplay[] = [];

  // KPIs de Plataforma (siempre mostrar si la opcion esta activa)
  if (config.showProjects) {
    const projects = trustStats?.completed_projects || 0;
    stats.push({
      id: 'projects',
      label: 'Proyectos',
      value: projects,
      icon: <Briefcase className="h-5 w-5" />,
      isVerified: true,
    });
  }

  if (config.showRating) {
    const ratingAvg = trustStats?.rating_avg || 0;
    const ratingCount = trustStats?.rating_count || 0;
    stats.push({
      id: 'rating',
      label: 'Rating',
      value: ratingCount > 0 ? ratingAvg.toFixed(1) : '-',
      icon: <Star className="h-5 w-5" />,
      suffix: ratingCount > 0 ? `(${ratingCount})` : undefined,
      isVerified: true,
    });
  }

  if (config.showClients) {
    const clients = trustStats?.unique_clients || 0;
    stats.push({
      id: 'clients',
      label: 'Clientes',
      value: clients,
      icon: <UserCheck className="h-5 w-5" />,
      isVerified: true,
    });
  }

  if (config.showResponseTime) {
    const responseTime = trustStats?.response_time_hours || 24;
    stats.push({
      id: 'response',
      label: 'Respuesta',
      value: formatResponseTime(responseTime),
      icon: <Clock className="h-5 w-5" />,
      isVerified: true,
    });
  }

  if (config.showDeliveryRate) {
    const deliveryRate = trustStats?.on_time_delivery_pct || 100;
    stats.push({
      id: 'delivery',
      label: 'A tiempo',
      value: `${deliveryRate}%`,
      icon: <CheckCircle2 className="h-5 w-5" />,
      isVerified: true,
    });
  }

  if (config.showExperience) {
    const days = trustStats?.days_on_platform || 0;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    stats.push({
      id: 'experience',
      label: 'En plataforma',
      value: days > 0 ? (years > 0 ? `${years}+ años` : `${months} meses`) : 'Nuevo',
      icon: <Calendar className="h-5 w-5" />,
      isVerified: true,
    });
  }

  // Social Media (desde Social Hub - siempre mostrar si la opcion esta activa)
  if (config.showFollowers) {
    const followers = socialStats?.total_followers || 0;
    const platformsCount = socialStats?.platforms_count || 0;
    stats.push({
      id: 'followers',
      label: 'Seguidores',
      value: formatNumber(followers),
      icon: <Users className="h-5 w-5" />,
      suffix: platformsCount > 1 ? `(${platformsCount} redes)` : platformsCount === 0 ? '(sin conectar)' : undefined,
    });
  }

  if (config.showEngagement) {
    const engagement = socialStats?.avg_engagement_rate || 0;
    stats.push({
      id: 'engagement',
      label: 'Engagement',
      value: `${engagement.toFixed(1)}%`,
      icon: <Heart className="h-5 w-5" />,
    });
  }

  if (config.showReach) {
    const reach = socialStats?.total_reach || 0;
    stats.push({
      id: 'reach',
      label: 'Alcance',
      value: formatNumber(reach),
      icon: <Eye className="h-5 w-5" />,
    });
  }

  if (config.showVideoViews) {
    const views = socialStats?.total_video_views || 0;
    stats.push({
      id: 'videoViews',
      label: 'Reproducciones',
      value: formatNumber(views),
      icon: <PlayCircle className="h-5 w-5" />,
    });
  }

  // Portfolio
  if (config.showPortfolioViews) {
    const portfolioViews = trustStats?.portfolio_views || 0;
    stats.push({
      id: 'portfolioViews',
      label: 'Vistas portfolio',
      value: formatNumber(portfolioViews),
      icon: <Eye className="h-5 w-5" />,
      isVerified: true,
    });
  }

  if (config.showPortfolioLikes) {
    const portfolioLikes = trustStats?.portfolio_likes || 0;
    stats.push({
      id: 'portfolioLikes',
      label: 'Likes portfolio',
      value: formatNumber(portfolioLikes),
      icon: <Heart className="h-5 w-5" />,
      isVerified: true,
    });
  }

  return stats;
}

// Stat card individual
function StatCard({
  stat,
  layout,
}: {
  stat: StatItemDisplay;
  layout: 'row' | 'grid' | 'cards';
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center gap-2 transition-all',
        layout === 'cards' && 'bg-card/50 rounded-xl border border-border/30 p-4 hover:border-primary/30 hover:bg-card/70',
        layout === 'grid' && 'bg-background/50 rounded-lg p-4',
        layout === 'row' && 'p-3',
      )}
    >
      <div className={cn(
        'rounded-full flex items-center justify-center',
        layout === 'cards' ? 'w-14 h-14 bg-primary/10' : 'w-12 h-12 bg-primary/10',
      )}>
        <span className="text-primary">{stat.icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          'font-bold text-foreground',
          layout === 'cards' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
        )}>
          {stat.value}
        </span>
        {stat.suffix && (
          <span className="text-xs text-muted-foreground">{stat.suffix}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">{stat.label}</span>
        {stat.isVerified && (
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </div>
    </div>
  );
}

// Componente principal
function StatsBlockComponent({ block, isEditing, isSelected, onUpdate, creatorProfileId }: BlockProps) {
  const config = {
    layout: 'cards',
    columns: '4',
    dataSource: 'auto',
    showProjects: true,
    showRating: true,
    showClients: true,
    showResponseTime: false,
    showDeliveryRate: false,
    showExperience: true,
    showFollowers: true,
    showEngagement: false,
    showReach: false,
    showVideoViews: false,
    showPortfolioViews: false,
    showPortfolioLikes: false,
    ...block.config,
  } as StatsConfig;

  const content = block.content as StatsContent;
  const styles = block.styles;

  // Obtener datos reales del creador específico
  const { data: profileData } = useCreatorPublicProfile(creatorProfileId || '');
  const { data: socialStats, isLoading: socialLoading } = useCreatorSocialStats(creatorProfileId);

  const trustStats = profileData?.trustStats || null;

  // Construir stats según configuración
  const displayStats = config.dataSource === 'auto'
    ? buildStatsFromData(config, trustStats, socialStats || null)
    : (content.manualItems || []).map(item => ({
        id: item.id,
        label: item.label,
        value: item.value,
        icon: <TrendingUp className="h-5 w-5" />,
      }));

  // Handler para edición manual
  const handleUpdateManualStat = (id: string, updates: Partial<ManualStatItem>) => {
    const items = content.manualItems || [];
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate({ content: { ...content, manualItems: newItems } });
  };

  const handleAddManualStat = () => {
    const items = content.manualItems || [];
    const newItem: ManualStatItem = {
      id: crypto.randomUUID(),
      label: 'Nueva métrica',
      value: '0',
      icon: 'trending',
    };
    onUpdate({ content: { ...content, manualItems: [...items, newItem] } });
  };

  // Loading state
  if (config.dataSource === 'auto' && !trustStats && !socialLoading) {
    return (
      <div className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}>
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Las estadísticas se cargarán con tus datos reales</p>
          {isEditing && (
            <p className="text-xs mt-2">
              Configura qué métricas mostrar en el panel de ajustes
            </p>
          )}
        </div>
      </div>
    );
  }

  // Sin stats configuradas
  if (displayStats.length === 0) {
    return (
      <div className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}>
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay estadísticas para mostrar</p>
          {isEditing && (
            <p className="text-xs mt-2">
              Activa las métricas que quieras mostrar en el panel de configuración
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg',
        paddingClasses[styles.padding || 'md'],
        !styles.backgroundColor && 'bg-card/30',
      )}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
      }}
    >
      {/* Aviso en modo edición */}
      {isEditing && isSelected && config.dataSource === 'auto' && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            <strong>Datos verificados:</strong> Estas estadísticas vienen de tu actividad real en la plataforma
            y tus redes sociales conectadas. No se pueden editar manualmente.
          </p>
        </div>
      )}

      {/* Stats grid/row */}
      <div
        className={cn(
          config.layout === 'row'
            ? 'flex flex-wrap justify-center gap-6 md:gap-10'
            : cn('grid gap-4', COLUMNS_CLASSES[config.columns] || COLUMNS_CLASSES['4']),
        )}
      >
        {displayStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} layout={config.layout} />
        ))}
      </div>

      {/* Nota de datos verificados */}
      {config.dataSource === 'auto' && displayStats.some(s => s.isVerified) && !isEditing && (
        <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
          <BadgeCheck className="h-3 w-3 text-emerald-500" />
          Datos verificados por la plataforma
        </p>
      )}
    </div>
  );
}

export const StatsBlock = memo(StatsBlockComponent);
