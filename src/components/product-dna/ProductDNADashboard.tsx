// ============================================
// ProductDNADashboard - Dashboard para gestión de Product DNAs
// Adaptado al schema real de product_dna table
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Filter,
  Plus,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Dna,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useProductDNAList } from '@/hooks/use-product-dna';
import { SERVICE_GROUP_LABELS } from '@/types/product-dna';
import type { ProductDNARecord } from '@/components/product-dna/ProductDNADisplay';

// ============================================
// STATUS CONFIG (matches actual DB statuses)
// ============================================

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  draft: {
    label: 'Borrador',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  analyzing: {
    label: 'Analizando',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  ready: {
    label: 'Completado',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  in_progress: {
    label: 'En Progreso',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  completed: {
    label: 'Finalizado',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

// ============================================
// PROPS
// ============================================

interface ProductDNADashboardProps {
  clientId?: string;
  onSelect?: (dna: ProductDNARecord) => void;
  onCreate?: () => void;
  onDelete?: (id: string) => Promise<boolean>;
  onDuplicate?: (id: string) => Promise<void>;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function ProductDNADashboard({
  clientId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
  className,
}: ProductDNADashboardProps) {
  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [serviceGroupFilter, setServiceGroupFilter] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<'created_at' | 'updated_at'>('created_at');

  // ---- List hook ----
  const {
    items,
    totalCount,
    isLoading,
    error,
    page,
    pageSize,
    totalPages,
    nextPage,
    prevPage,
    setFilters,
    refresh,
    removeItem,
  } = useProductDNAList({
    clientId,
    status: statusFilter,
    serviceGroup: serviceGroupFilter,
    pageSize: 12,
  });

  // ---- Stats computed from items ----
  const stats = useMemo(() => {
    const total = totalCount;
    const byStatus: Record<string, number> = {};
    const byServiceGroup: Record<string, number> = {};
    let withAnalysis = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    items.forEach((item) => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byServiceGroup[item.service_group] = (byServiceGroup[item.service_group] || 0) + 1;

      const hasAny = !!(item.market_research || item.competitor_analysis ||
        item.strategy_recommendations || item.content_brief);
      if (hasAny) withAnalysis++;

      if (item.ai_confidence_score != null) {
        totalConfidence += item.ai_confidence_score;
        confidenceCount++;
      }
    });

    return {
      total,
      byStatus,
      byServiceGroup,
      withAnalysis,
      avgConfidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0,
    };
  }, [items, totalCount]);

  // ---- Filtered + sorted items (local search) ----
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const serviceLabel = SERVICE_GROUP_LABELS[item.service_group as keyof typeof SERVICE_GROUP_LABELS] || item.service_group;
        return (
          serviceLabel.toLowerCase().includes(q) ||
          (item.service_types || []).some((t: string) => t.toLowerCase().includes(q)) ||
          item.status.toLowerCase().includes(q)
        );
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a[sortField] || a.created_at).getTime();
      const dateB = new Date(b[sortField] || b.created_at).getTime();
      return dateB - dateA;
    });

    return result;
  }, [items, searchQuery, sortField]);

  // ---- Handlers ----
  const handleDelete = useCallback(async (id: string) => {
    if (onDelete) {
      await onDelete(id);
    } else {
      await removeItem(id);
    }
  }, [onDelete, removeItem]);

  const handleStatusFilter = useCallback((status: string | undefined) => {
    setStatusFilter(status);
    setFilters({ status });
  }, [setFilters]);

  const handleServiceGroupFilter = useCallback((group: string | undefined) => {
    setServiceGroupFilter(group);
    setFilters({ serviceGroup: group });
  }, [setFilters]);

  // ---- Status badge helper ----
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', config.color, config.bgColor)}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn('space-y-6', className)}>
      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total DNAs"
          value={stats.total}
          icon={<Dna className="w-5 h-5 text-purple-500" />}
        />
        <StatsCard
          label="Con Análisis"
          value={stats.withAnalysis}
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
        />
        <StatsCard
          label="En Proceso"
          value={stats.byStatus['analyzing'] || 0}
          icon={<Loader2 className="w-5 h-5 text-blue-500" />}
        />
        <StatsCard
          label="Confianza Prom."
          value={stats.avgConfidence > 0 ? `${stats.avgConfidence}%` : '—'}
          icon={<BarChart3 className="w-5 h-5 text-green-500" />}
        />
      </div>

      {/* ---- Toolbar ---- */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por servicio o tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter || ''}
            onChange={(e) => handleStatusFilter(e.target.value || undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Service Group Filter */}
          <select
            value={serviceGroupFilter || ''}
            onChange={(e) => handleServiceGroupFilter(e.target.value || undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Todos los servicios</option>
            {Object.entries(SERVICE_GROUP_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Sort */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortField((f) => f === 'created_at' ? 'updated_at' : 'created_at')}
            className="gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortField === 'created_at' ? 'Creación' : 'Actualización'}
          </Button>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>

          {/* Create */}
          {onCreate && (
            <Button size="sm" onClick={onCreate} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Nuevo DNA
            </Button>
          )}
        </div>
      </div>

      {/* ---- Error ---- */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ---- Loading ---- */}
      {isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Cargando Product DNAs...</p>
        </div>
      )}

      {/* ---- Empty State ---- */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
          <Dna className="w-12 h-12 opacity-40" />
          <div className="text-center">
            <p className="font-medium text-foreground">No hay Product DNAs</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter || serviceGroupFilter
                ? 'Intenta cambiar los filtros de búsqueda.'
                : 'Crea tu primer Product DNA para comenzar el análisis.'}
            </p>
          </div>
          {onCreate && !searchQuery && !statusFilter && !serviceGroupFilter && (
            <Button onClick={onCreate} className="gap-1.5 mt-2">
              <Plus className="w-4 h-4" />
              Crear Product DNA
            </Button>
          )}
        </div>
      )}

      {/* ---- Grid ---- */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <DNACard
                  item={item}
                  onSelect={onSelect}
                  onDelete={handleDelete}
                  onDuplicate={onDuplicate}
                  getStatusBadge={getStatusBadge}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ---- Pagination ---- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} de {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatsCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface DNACardProps {
  item: ProductDNARecord;
  onSelect?: (dna: ProductDNARecord) => void;
  onDelete?: (id: string) => Promise<void>;
  onDuplicate?: (id: string) => Promise<void>;
  getStatusBadge: (status: string) => React.ReactNode;
}

function DNACard({ item, onSelect, onDelete, onDuplicate, getStatusBadge }: DNACardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const serviceLabel = SERVICE_GROUP_LABELS[item.service_group as keyof typeof SERVICE_GROUP_LABELS] || item.service_group;

  const hasAnalysis = !!(item.market_research || item.competitor_analysis ||
    item.strategy_recommendations || item.content_brief);

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(item.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }, [item.created_at]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(item.id);
  };

  return (
    <div
      onClick={() => onSelect?.(item)}
      className={cn(
        'group relative rounded-xl border bg-card p-4 transition-all duration-200',
        onSelect && 'cursor-pointer hover:shadow-md hover:border-primary/30',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {serviceLabel}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {(item.service_types || []).slice(0, 2).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                {t.replace(/_/g, ' ')}
              </Badge>
            ))}
            {(item.service_types || []).length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{item.service_types.length - 2}
              </span>
            )}
          </div>
        </div>
        {getStatusBadge(item.status)}
      </div>

      {/* Analysis indicator */}
      <div className="flex items-center gap-3 mb-3">
        {hasAnalysis ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Análisis disponible</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Sin análisis</span>
          </div>
        )}

        {item.ai_confidence_score != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <BarChart3 className="w-3 h-3" />
            <span>{item.ai_confidence_score}%</span>
          </div>
        )}
      </div>

      {/* Confidence bar */}
      {item.ai_confidence_score != null && (
        <div className="w-full h-1.5 rounded-full bg-muted mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              item.ai_confidence_score >= 80
                ? 'bg-green-500'
                : item.ai_confidence_score >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500',
            )}
            style={{ width: `${Math.min(item.ai_confidence_score, 100)}%` }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
          {item.version > 1 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
              v{item.version}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSelect && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onSelect(item); }}
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDuplicate && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDNADashboard;
