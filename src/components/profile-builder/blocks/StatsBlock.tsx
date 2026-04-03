/**
 * Stats Block - Profile Builder
 *
 * Bloque de estadísticas conectado a datos reales de la plataforma:
 * - Proyectos completados, activos
 * - Rating y reseñas
 * - Métricas de portfolio (vistas, likes)
 * - Seguidores de redes sociales
 * - Tiempos de respuesta y entrega
 */

import { memo, useMemo } from 'react';
import {
  Users,
  Star,
  Briefcase,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreatorStats,
  STAT_METRICS,
  formatStatValue,
  getStatValue,
  type StatMetricKey,
  type CreatorUnifiedStats,
} from '@/hooks/useCreatorStats';
import type { BlockProps } from '../types/profile-builder';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface StatDisplayItem {
  key: StatMetricKey;
  customLabel?: string; // Override del label
  customIcon?: string;
}

interface StatsConfig {
  /** Métricas seleccionadas para mostrar */
  selectedMetrics: StatMetricKey[];
  /** Layout de visualización */
  layout: 'row' | 'grid' | 'compact';
  /** Mostrar iconos */
  showIcons: boolean;
  /** Mostrar skeleton mientras carga */
  showLoading: boolean;
  /** Usar datos mock (para preview sin datos reales) */
  useMockData: boolean;
  /** Labels personalizados por métrica */
  customLabels?: Record<StatMetricKey, string>;
}

interface StatsContent {
  /** Items legacy (para compatibilidad hacia atrás) */
  items?: Array<{
    id: string;
    label: string;
    value: string | number;
    icon: string;
  }>;
}

// ─── Iconos ─────────────────────────────────────────────────────────────────

const ICON_MAP = {
  users: Users,
  star: Star,
  briefcase: Briefcase,
  eye: Eye,
  heart: Heart,
  trending: TrendingUp,
  clock: Clock,
  check: CheckCircle,
  calendar: Calendar,
};

// ─── Mock data para preview ─────────────────────────────────────────────────

const MOCK_STATS: Partial<CreatorUnifiedStats> = {
  completedProjects: 47,
  activeProjects: 3,
  ratingAvg: 4.9,
  ratingCount: 32,
  uniqueClients: 28,
  portfolioViews: 12500,
  portfolioLikes: 890,
  portfolioItems: 24,
  onTimeDeliveryPct: 98,
  responseTimeHours: 2,
  repeatClientsPct: 45,
  daysOnPlatform: 365,
  invitationResponseRate: 85,
  social: {
    totalFollowers: 45200,
    platforms: [],
  },
};

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_METRICS: StatMetricKey[] = [
  'completedProjects',
  'ratingAvg',
  'portfolioViews',
  'socialTotalFollowers',
];

// ─── Componente ─────────────────────────────────────────────────────────────

function StatsBlockComponent({
  block,
  isEditing,
  isSelected,
  onUpdate,
  userId,
  creatorProfileId,
}: BlockProps) {
  const config = (block.config || {}) as StatsConfig;
  const styles = block.styles;

  const selectedMetrics = config.selectedMetrics || DEFAULT_METRICS;
  const layout = config.layout || 'row';
  const showIcons = config.showIcons !== false;
  const useMockData = config.useMockData || isEditing;
  const customLabels = config.customLabels || {};

  // Obtener stats reales solo si no estamos en modo mock
  const {
    data: realStats,
    isLoading,
    error,
  } = useCreatorStats({
    userId,
    creatorProfileId,
    enabled: !useMockData && !!(userId || creatorProfileId),
  });

  // Usar mock o datos reales
  const stats = useMockData ? (MOCK_STATS as CreatorUnifiedStats) : realStats;

  // Filtrar métricas seleccionadas con sus definiciones
  const displayMetrics = useMemo(() => {
    return selectedMetrics
      .map((key) => {
        const definition = STAT_METRICS.find((m) => m.key === key);
        if (!definition) return null;
        return {
          ...definition,
          label: customLabels[key] || definition.label,
        };
      })
      .filter(Boolean) as typeof STAT_METRICS;
  }, [selectedMetrics, customLabels]);

  // Clases de padding
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  // Clases de layout
  const layoutClasses = {
    row: 'flex flex-wrap justify-center gap-8 md:gap-12',
    grid: 'grid grid-cols-2 md:grid-cols-4 gap-4',
    compact: 'flex flex-wrap justify-center gap-4',
  };

  // Loading state
  if (isLoading && !useMockData) {
    return (
      <div
        className={cn(
          'rounded-lg flex items-center justify-center',
          paddingClasses[styles.padding || 'md'],
          'min-h-[120px]'
        )}
        style={{ backgroundColor: styles.backgroundColor }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && !useMockData) {
    return (
      <div
        className={cn(
          'rounded-lg flex items-center justify-center gap-2',
          paddingClasses[styles.padding || 'md'],
          'min-h-[120px] text-muted-foreground'
        )}
        style={{ backgroundColor: styles.backgroundColor }}
      >
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">No se pudieron cargar las estadísticas</span>
      </div>
    );
  }

  // No stats available
  if (!stats) {
    return (
      <div
        className={cn(
          'rounded-lg flex flex-col items-center justify-center gap-2',
          paddingClasses[styles.padding || 'md'],
          'min-h-[120px]'
        )}
        style={{ backgroundColor: styles.backgroundColor }}
      >
        <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {isEditing ? 'Selecciona métricas en configuración' : 'Sin estadísticas disponibles'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg',
        paddingClasses[styles.padding || 'md'],
        !styles.backgroundColor && 'bg-card/50'
      )}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
      }}
    >
      {/* Indicador de datos mock en edición */}
      {isEditing && useMockData && (
        <p className="text-[10px] text-amber-500/80 text-center mb-3">
          Datos de ejemplo — se mostrarán tus métricas reales al publicar
        </p>
      )}

      <div className={cn(layoutClasses[layout])}>
        {displayMetrics.map((metric) => {
          const Icon = ICON_MAP[metric.icon] || TrendingUp;
          const rawValue = getStatValue(stats, metric.key);
          const formattedValue = formatStatValue(rawValue, metric.format);

          return (
            <div
              key={metric.key}
              className={cn(
                'flex flex-col items-center text-center gap-2',
                layout === 'grid' && 'bg-background/50 rounded-lg p-4',
                layout === 'compact' && 'min-w-[80px]',
                layout === 'row' && 'p-4'
              )}
            >
              {showIcons && (
                <div
                  className={cn(
                    'rounded-full flex items-center justify-center',
                    layout === 'compact' ? 'w-10 h-10' : 'w-12 h-12',
                    'bg-primary/10'
                  )}
                >
                  <Icon
                    className={cn(
                      'text-primary',
                      layout === 'compact' ? 'h-5 w-5' : 'h-6 w-6'
                    )}
                  />
                </div>
              )}

              <span
                className={cn(
                  'font-bold text-foreground',
                  layout === 'compact' ? 'text-xl' : 'text-2xl md:text-3xl'
                )}
              >
                {formattedValue}
              </span>

              <span
                className={cn(
                  'text-muted-foreground',
                  layout === 'compact' ? 'text-xs' : 'text-sm'
                )}
              >
                {metric.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hint para seleccionar más métricas */}
      {isEditing && isSelected && displayMetrics.length < 6 && (
        <p className="text-[10px] text-muted-foreground/60 text-center mt-4 border-t border-border/30 pt-3">
          Configura qué métricas mostrar en el panel derecho
        </p>
      )}
    </div>
  );
}

export const StatsBlock = memo(StatsBlockComponent);
