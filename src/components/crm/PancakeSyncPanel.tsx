import { useState } from 'react';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  ArrowRight,
  ArrowLeft,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { PancakeDashboardStats, PancakeSyncActivityEntry } from '@/types/crm.types';

// =====================================================
// SUB-COMPONENTES
// =====================================================

function SyncKpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-sm bg-white/5 border border-white/[0.08]">
      <div className={cn('p-2 rounded-sm', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-white leading-none">{value}</p>
        <p className="text-[11px] text-white/50 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SyncProgressBar({
  label,
  synced,
  pending,
  errors,
  total,
}: {
  label: string;
  synced: number;
  pending: number;
  errors: number;
  total: number;
}) {
  const syncedPct = total > 0 ? (synced / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const errorPct = total > 0 ? (errors / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs text-white/40">
          {synced}/{total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${syncedPct}%` }}
        />
        <div
          className="bg-yellow-500 transition-all duration-500"
          style={{ width: `${pendingPct}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${errorPct}%` }}
        />
      </div>
      <div className="flex gap-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {synced} sync
        </span>
        {pending > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            {pending} pendiente
          </span>
        )}
        {errors > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {errors} error
          </span>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ entry }: { entry: PancakeSyncActivityEntry }) {
  const isSuccess = entry.status === 'success';
  const isOutgoing = entry.direction === 'kreoon_to_pancake';

  const time = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
      <div
        className={cn(
          'p-1.5 rounded-full shrink-0',
          isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        )}
      >
        {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white/80 capitalize">{entry.action}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-white/10 text-white/40 h-4"
          >
            {entry.entity_type}
          </Badge>
          {isOutgoing ? (
            <ArrowRight className="h-3 w-3 text-blue-400/60 shrink-0" />
          ) : (
            <ArrowLeft className="h-3 w-3 text-purple-400/60 shrink-0" />
          )}
          <span className="text-[10px] text-white/30">
            {isOutgoing ? 'Pancake' : 'Kreoon'}
          </span>
        </div>
        {entry.error_message && (
          <p className="text-[10px] text-red-400/80 truncate mt-0.5">{entry.error_message}</p>
        )}
      </div>

      <span className="text-[10px] text-white/30 shrink-0">{time}</span>
    </div>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

interface PancakeSyncPanelProps {
  data: PancakeDashboardStats | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  onSync: () => void;
}

export function PancakeSyncPanel({ data, isLoading, isSyncing, onSync }: PancakeSyncPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const health = data?.sync_health;
  const activity = data?.recent_activity ?? [];
  const config = data?.config;
  const pancakeTotal = data?.pancake_contact_count;

  const totalInMap = health?.total_in_map ?? 0;
  const totalUsers = (health?.synced_users ?? 0) + (health?.pending_users ?? 0) + (health?.error_users ?? 0);
  const totalOrgs = (health?.synced_orgs ?? 0) + (health?.pending_orgs ?? 0) + (health?.error_orgs ?? 0);

  const errorRate = health?.error_rate_pct ?? 0;
  const syncStatus: 'ok' | 'warn' | 'error' =
    !health || totalInMap === 0 ? 'warn'
    : errorRate > 20 ? 'error'
    : errorRate > 5 ? 'warn'
    : 'ok';

  const statusConfig = {
    ok: { color: 'bg-green-500', label: 'Sync OK', text: 'text-green-400' },
    warn: { color: 'bg-yellow-500', label: 'Atención', text: 'text-yellow-400' },
    error: { color: 'bg-red-500', label: 'Errores', text: 'text-red-400' },
  }[syncStatus];

  const lastSyncText = health?.last_sync_at
    ? formatDistanceToNow(new Date(health.last_sync_at), { addSuffix: true, locale: es })
    : 'Nunca';

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
          <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header colapsable */}
      <button
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', statusConfig.color)} />
            <span className="text-sm font-semibold text-white">Pancake CRM</span>
          </div>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-2 border-current', statusConfig.text)}
          >
            {statusConfig.label}
          </Badge>
          {pancakeTotal !== null && (
            <Badge variant="outline" className="text-[10px] px-2 border-white/10 text-white/50">
              {pancakeTotal.toLocaleString('es-CO')} contactos
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white/40">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{lastSyncText}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-white/50 hover:text-white hover:bg-white/5"
            onClick={(e) => {
              e.stopPropagation();
              onSync();
            }}
            disabled={isSyncing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            <span className="ml-1.5 text-xs">Sincronizar</span>
          </Button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-white/30" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/30" />
          )}
        </div>
      </button>

      {/* Cuerpo expandible */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 space-y-5">
          {/* KPIs de sync */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <SyncKpiCard
              label="Sincronizados"
              value={health?.total_synced ?? 0}
              icon={CheckCircle}
              color="bg-green-500/15 text-green-400"
            />
            <SyncKpiCard
              label="Pendientes"
              value={health?.total_pending ?? 0}
              icon={Clock}
              color="bg-yellow-500/15 text-yellow-400"
            />
            <SyncKpiCard
              label="Con error"
              value={health?.total_errors ?? 0}
              icon={AlertTriangle}
              color="bg-red-500/15 text-red-400"
            />
            <SyncKpiCard
              label={pancakeTotal !== null ? 'En Pancake' : 'Total mapeados'}
              value={pancakeTotal ?? totalInMap}
              icon={pancakeTotal !== null ? Wifi : WifiOff}
              color="bg-blue-500/15 text-blue-400"
            />
          </div>

          {/* Barras de progreso por tipo */}
          {totalInMap > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Progreso por tipo
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SyncProgressBar
                  label="Usuarios"
                  synced={health?.synced_users ?? 0}
                  pending={health?.pending_users ?? 0}
                  errors={health?.error_users ?? 0}
                  total={totalUsers}
                />
                <SyncProgressBar
                  label="Organizaciones"
                  synced={health?.synced_orgs ?? 0}
                  pending={health?.pending_orgs ?? 0}
                  errors={health?.error_orgs ?? 0}
                  total={totalOrgs}
                />
              </div>
            </div>
          )}

          {/* Estado de la integración */}
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Sync usuarios: {config?.sync_users_enabled ? (
                <span className="text-green-400">Activo</span>
              ) : (
                <span className="text-white/30">Inactivo</span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              Sync orgs: {config?.sync_organizations_enabled ? (
                <span className="text-green-400">Activo</span>
              ) : (
                <span className="text-white/30">Inactivo</span>
              )}
            </span>
          </div>

          {/* Log de actividad reciente */}
          {activity.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Actividad reciente
              </h4>
              <div>
                {activity.slice(0, 8).map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {activity.length === 0 && !isLoading && (
            <div className="py-6 text-center">
              <RefreshCw className="h-6 w-6 text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/30">Sin actividad de sync registrada</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
