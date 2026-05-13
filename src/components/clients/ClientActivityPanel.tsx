import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar, Clock, Package, Video, CheckCircle,
  AlertCircle, TrendingDown, UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientActivityMetrics } from '@/hooks/useClientActivityMetrics';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  type ClientActivityMetrics,
} from '@/types/clientActivity.types';

interface ClientActivityPanelProps {
  clientId: string;
}

function fmt(date: string | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), "d 'de' MMMM yyyy", { locale: es });
}

function ago(date: string | null | undefined): string {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true });
}

function DateRow({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: 'green' | 'red' | 'amber';
}) {
  const highlightClass =
    highlight === 'green'
      ? 'text-green-400'
      : highlight === 'red'
        ? 'text-red-400'
        : highlight === 'amber'
          ? 'text-amber-400'
          : 'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', highlightClass)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-medium', highlight ? highlightClass : 'text-foreground')}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActivityPanelContent({ metrics }: { metrics: ClientActivityMetrics }) {
  const { activity_status } = metrics;
  const statusLabel = ACTIVITY_STATUS_LABELS[activity_status];
  const statusColor = ACTIVITY_STATUS_COLORS[activity_status];

  return (
    <div className="space-y-5">
      {/* Clasificación */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Clasificación
        </h4>
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className={cn('text-sm h-7 px-3 border font-semibold', statusColor)}>
            {statusLabel}
          </Badge>
          {activity_status === 'active' && (
            <span className="text-sm text-muted-foreground">
              {metrics.pending_content_count} piezas pendientes de entrega
            </span>
          )}
          {activity_status === 'inactive' && metrics.days_inactive !== null && (
            <span className="text-sm text-red-400">
              {metrics.days_inactive} días sin actividad
            </span>
          )}
          {activity_status === 'prospect' && (
            <span className="text-sm text-muted-foreground">
              Sin paquetes comprados aún
            </span>
          )}
        </div>

        {/* Métricas de paquetes/contenido */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-foreground">{metrics.total_packages}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Paquetes</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-blue-400">{metrics.total_content_approved}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Aprobados</p>
            </CardContent>
          </Card>
          <Card className={cn('border-border/50', metrics.pending_content_count > 0 ? 'bg-green-500/5' : 'bg-card/50')}>
            <CardContent className="p-3 text-center">
              <p className={cn('text-xl font-bold', metrics.pending_content_count > 0 ? 'text-green-400' : 'text-muted-foreground')}>
                {metrics.pending_content_count}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pendientes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Línea de tiempo */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Línea de tiempo
        </h4>
        <div className="bg-card/30 rounded-md border border-border/40 px-4">
          <DateRow
            icon={UserCheck}
            label="Cliente desde"
            value={fmt(metrics.joined_at)}
            sub={`Hace ${metrics.days_as_client} días`}
            highlight="amber"
          />
          {metrics.first_package_at && (
            <DateRow
              icon={Package}
              label="Primer paquete comprado"
              value={fmt(metrics.first_package_at)}
              sub={ago(metrics.first_package_at)}
            />
          )}
          {metrics.last_package_at && metrics.last_package_at !== metrics.first_package_at && (
            <DateRow
              icon={Package}
              label="Último paquete comprado"
              value={fmt(metrics.last_package_at)}
              sub={ago(metrics.last_package_at)}
            />
          )}
          {metrics.first_content_created_at && (
            <DateRow
              icon={Video}
              label="Primer contenido creado"
              value={fmt(metrics.first_content_created_at)}
              sub={ago(metrics.first_content_created_at)}
            />
          )}
          {metrics.last_delivery_at && (
            <DateRow
              icon={Calendar}
              label="Última entrega"
              value={fmt(metrics.last_delivery_at)}
              sub={ago(metrics.last_delivery_at)}
              highlight="green"
            />
          )}
          {metrics.last_approved_at && (
            <DateRow
              icon={CheckCircle}
              label="Último contenido aprobado"
              value={fmt(metrics.last_approved_at)}
              sub={ago(metrics.last_approved_at)}
              highlight="green"
            />
          )}
        </div>
      </div>

      {/* Inactividad (solo si aplica) */}
      {activity_status === 'inactive' && metrics.inactive_since && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Inactividad
          </h4>
          <div className="bg-red-500/5 rounded-md border border-red-500/20 px-4">
            <DateRow
              icon={TrendingDown}
              label="Inactivo desde"
              value={fmt(metrics.inactive_since)}
              sub={`${metrics.days_inactive} días sin nueva actividad`}
              highlight="red"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Este cliente finalizó toda la producción contratada. Considera contactarlo para renovar.
          </p>
        </div>
      )}

      {/* Alerta si nunca hubo entrega */}
      {activity_status === 'active' && !metrics.last_delivery_at && metrics.total_packages > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Este cliente tiene paquetes activos pero aún no se ha registrado ninguna entrega.
          </p>
        </div>
      )}

      {/* Alerta de tiempo sin actividad para clientes activos */}
      {activity_status === 'active' && metrics.last_delivery_at && metrics.last_content_created_at && (
        (() => {
          const daysSinceContent = Math.floor(
            (Date.now() - new Date(metrics.last_content_created_at!).getTime()) / 86_400_000,
          );
          return daysSinceContent > 14 ? (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Hace {daysSinceContent} días sin nuevo contenido, aunque aún quedan {metrics.pending_content_count} piezas pendientes.
              </p>
            </div>
          ) : null;
        })()
      )}
    </div>
  );
}

export function ClientActivityPanel({ clientId }: ClientActivityPanelProps) {
  const { currentOrgId } = useOrgOwner();
  const { data: allMetrics, isLoading } = useClientActivityMetrics(currentOrgId);
  const metrics = allMetrics?.find(m => m.client_id === clientId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No se encontraron métricas de actividad para este cliente.
      </p>
    );
  }

  return <ActivityPanelContent metrics={metrics} />;
}
