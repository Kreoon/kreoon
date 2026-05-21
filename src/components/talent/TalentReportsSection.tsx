import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfYear, subDays, subMonths,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Download, FileText, BarChart3, CheckCircle, Clock, TrendingUp,
  AlertCircle, Gift, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTalentReports } from '@/hooks/useTalentReports';
import type { TalentReportFilters, TalentContentStatus, TalentReportItem } from '@/hooks/useTalentReports';
import { generateTalentReportPDF, downloadTalentReportCSV } from '@/lib/talent-report-pdf';

// ─── Constantes UI ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TalentContentStatus, {
  label: string;
  chipClass: string;
  badgeClass: string;
  icon: React.ElementType;
}> = {
  paid: {
    label: 'Pagado',
    chipClass: 'border-green-400 bg-green-500/10 text-green-600 dark:text-green-400',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    icon: CheckCircle,
  },
  processing: {
    label: 'En proceso',
    chipClass: 'border-blue-400 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: ArrowRight,
  },
  pending_payment: {
    label: 'Aprobado · Por cobrar',
    chipClass: 'border-yellow-400 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: Clock,
  },
  not_approved: {
    label: 'En producción',
    chipClass: 'border-zinc-400 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    badgeClass: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    icon: AlertCircle,
  },
  barter: {
    label: 'Canje / $0',
    chipClass: 'border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Gift,
  },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  commercial:          'Comercial',
  ugc:                 'UGC',
  ambassador_internal: 'Embajador',
  organic:             'Orgánico',
};

// Etiqueta del estado de producción (content.status enum) para mostrar en "Sin aprobar"
const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  draft:           'Borrador',
  assigned:        'Asignado',
  script_pending:  'Guion pendiente',
  script_approved: 'Guion aprobado',
  recording:       'Grabando',
  recorded:        'Grabado',
  editing:         'En edición',
  delivered:       'Entregado',
  approved:        'Aprobado',
  archived:        'Archivado',
  issue:           'Con problema',
};

const STATUS_FILTERS: { key: 'all' | TalentContentStatus; label: string }[] = [
  { key: 'all',             label: 'Todos' },
  { key: 'not_approved',    label: 'En producción' },
  { key: 'pending_payment', label: 'Aprobado · Por cobrar' },
  { key: 'processing',      label: 'En proceso' },
  { key: 'paid',            label: 'Pagado' },
  { key: 'barter',          label: 'Canje / $0' },
];

type DateShortcut = 'mes_actual' | 'mes_anterior' | 'tres_meses' | 'este_anio' | 'todo';

const DATE_SHORTCUTS: { key: DateShortcut; label: string }[] = [
  { key: 'mes_actual',   label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'tres_meses',   label: 'Últimos 3 meses' },
  { key: 'este_anio',    label: 'Este año' },
  { key: 'todo',         label: 'Todo el tiempo' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildFiltersFromShortcut(
  shortcut: DateShortcut,
  status: TalentReportFilters['status'],
): TalentReportFilters {
  const now = new Date();
  switch (shortcut) {
    case 'mes_actual':
      return { dateFrom: isoDate(startOfMonth(now)), dateTo: isoDate(now), status };
    case 'mes_anterior': {
      const prev = subMonths(now, 1);
      return { dateFrom: isoDate(startOfMonth(prev)), dateTo: isoDate(endOfMonth(prev)), status };
    }
    case 'tres_meses':
      return { dateFrom: isoDate(subDays(now, 89)), dateTo: isoDate(now), status };
    case 'este_anio':
      return { dateFrom: isoDate(startOfYear(now)), dateTo: isoDate(now), status };
    case 'todo':
      return { dateFrom: '2020-01-01', dateTo: isoDate(now), status };
  }
}

function formatCOP(amount: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDateShort(dateStr: string) {
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface TalentReportsSectionProps {
  organizationId: string;
  userId: string;
  talentName: string;
}

export function TalentReportsSection({ organizationId, userId, talentName }: TalentReportsSectionProps) {
  const [activeShortcut, setActiveShortcut] = useState<DateShortcut>('este_anio');
  const [statusFilter, setStatusFilter] = useState<TalentReportFilters['status']>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const filters = useMemo(
    () => buildFiltersFromShortcut(activeShortcut, statusFilter),
    [activeShortcut, statusFilter],
  );

  const { items, totals, isLoading } = useTalentReports(organizationId, userId, filters);

  // Clientes únicos para el filtro secundario
  const clientNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.client_name) names.add(item.client_name);
    }
    return [...names].sort();
  }, [items]);

  // Filtro adicional por cliente (client-side, sobre los items ya filtrados por estado)
  const filteredItems = useMemo(
    () => clientFilter === 'all' ? items : items.filter((i) => i.client_name === clientFilter),
    [items, clientFilter],
  );

  function handleShortcut(key: DateShortcut) {
    setActiveShortcut(key);
    setClientFilter('all');
  }

  function handleStatusFilter(key: TalentReportFilters['status']) {
    setStatusFilter(key);
    setClientFilter('all');
  }

  return (
    <div className="space-y-5">

      {/* ── Header + Descargas ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Mis Proyectos y Pagos</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => downloadTalentReportCSV(filteredItems, totals, talentName, filters)}
            disabled={isLoading || filteredItems.length === 0}
            className="h-7 text-xs gap-1"
          >
            <Download className="h-3 w-3" /> CSV
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => generateTalentReportPDF(filteredItems, totals, talentName, filters)}
            disabled={isLoading || filteredItems.length === 0}
            className="h-7 text-xs gap-1"
          >
            <FileText className="h-3 w-3" /> PDF
          </Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-200 dark:border-green-800/40 p-3 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Total cobrado</span>
          </div>
          <p className="text-lg font-bold">{formatCOP(totals.total_pagado)}</p>
          <p className="text-[11px] opacity-70">{totals.count_by_status.paid} pagos</p>
        </div>
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-800/40 p-3 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400 space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Por cobrar</span>
          </div>
          <p className="text-lg font-bold">{formatCOP(totals.total_pendiente)}</p>
          <p className="text-[11px] opacity-70">
            {totals.count_by_status.pending_payment + totals.count_by_status.processing} pendientes
          </p>
        </div>
        <div className="rounded-xl border border-border p-3 bg-muted/30 text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Total proyectos</span>
          </div>
          <p className="text-lg font-bold text-foreground">{totals.count_by_status.all}</p>
          <p className="text-[11px] opacity-70">en el período seleccionado</p>
        </div>
      </div>

      {/* ── Filtros de período ── */}
      <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
        <div className="flex flex-wrap gap-2">
          {DATE_SHORTCUTS.map((s) => (
            <button
              key={s.key}
              onClick={() => handleShortcut(s.key)}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-colors border ${
                activeShortcut === s.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {clientNames.length > 0 && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-7 text-xs w-44">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clientNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Chips de estado (con conteos) ── */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((sf) => {
          const count = sf.key === 'all'
            ? totals.count_by_status.all
            : totals.count_by_status[sf.key as TalentContentStatus];
          const cfg = sf.key !== 'all' ? STATUS_CONFIG[sf.key as TalentContentStatus] : null;
          const isActive = statusFilter === sf.key;
          return (
            <button
              key={sf.key}
              onClick={() => handleStatusFilter(sf.key)}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${
                isActive
                  ? (cfg?.chipClass ?? 'bg-primary text-primary-foreground border-primary')
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {sf.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${
                  isActive ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tabla unificada ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
          Cargando proyectos...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-8 w-8 opacity-30" />
          <p className="text-xs">No hay proyectos para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Proyecto</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Rol</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Monto</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => <ContentRow key={item.id} item={item} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer totales ── */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-muted/20 text-sm">
          <span className="text-muted-foreground font-medium">
            {filteredItems.length} proyecto{filteredItems.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` · ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label}`}
          </span>
          <div className="flex items-center gap-4">
            {totals.total_pendiente > 0 && statusFilter === 'all' && (
              <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                {formatCOP(totals.total_pendiente)} por cobrar
              </span>
            )}
            <span className="font-bold text-base">
              {formatCOP(filteredItems.reduce((s, i) => s + i.amount, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fila de contenido ────────────────────────────────────────────────────────

function ContentRow({ item }: { item: TalentReportItem }) {
  const cfg = STATUS_CONFIG[item.status];
  const StatusIcon = cfg.icon;
  const typeLabel = CONTENT_TYPE_LABELS[item.content_type ?? ''] ?? (item.content_type ?? '—');

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
        {fmtDateShort(item.date)}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground max-w-[100px]">
        <span className="truncate block">{item.client_name ?? '—'}</span>
      </td>
      <td className="px-3 py-2.5 max-w-[200px]">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground truncate block">{item.project_title}</span>
          {item.sequence_number && (
            <span className="font-mono text-[10px] text-muted-foreground">{item.sequence_number}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
        <span className="text-[10px]">{typeLabel}</span>
      </td>
      <td className="px-3 py-2.5 text-center text-muted-foreground hidden sm:table-cell">
        <span className="text-[10px]">{item.role}</span>
      </td>
      <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
        {item.status === 'barter'
          ? <span className="text-amber-600 dark:text-amber-400">$0</span>
          : formatCOP(item.amount, item.currency)
        }
      </td>
      <td className="px-3 py-2.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badgeClass}`}>
            <StatusIcon className="h-2.5 w-2.5" />
            {cfg.label}
          </span>
          {item.status === 'not_approved' && item.content_status && (
            <span className="text-[9px] text-muted-foreground">
              {PRODUCTION_STATUS_LABELS[item.content_status] ?? item.content_status}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
