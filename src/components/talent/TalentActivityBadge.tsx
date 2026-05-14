import { Activity, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TalentActivityMetrics } from '@/types/talentActivity.types';

interface TalentActivityBadgeProps {
  metrics: TalentActivityMetrics | undefined;
  showDetail?: boolean;
}

export function TalentActivityBadge({ metrics, showDetail = true }: TalentActivityBadgeProps) {
  if (!metrics) return null;

  const isActive = metrics.activity_status === 'active';
  const hasPending = metrics.pending_payment_count > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Estado activo/inactivo */}
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        isActive
          ? 'bg-green-500/15 text-green-400 border-green-500/30'
          : 'bg-muted text-muted-foreground border-border',
      )}>
        <Activity className="h-2.5 w-2.5" />
        {isActive ? (
          showDetail ? `Activo · ${metrics.active_content_count} en proceso` : 'Activo'
        ) : (
          'Inactivo'
        )}
      </span>

      {/* Pendiente de pago */}
      {hasPending && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-warning/15 text-warning border-warning/30">
          <AlertCircle className="h-2.5 w-2.5" />
          {showDetail
            ? `${metrics.pending_payment_count} sin pagar`
            : `$${metrics.pending_payment_amount.toLocaleString('es-CO')}`}
        </span>
      )}

      {/* Última entrega */}
      {showDetail && metrics.days_since_last_delivery !== null && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-muted text-muted-foreground border-border">
          <Clock className="h-2.5 w-2.5" />
          {metrics.days_since_last_delivery === 0
            ? 'Entregó hoy'
            : `Última entrega hace ${metrics.days_since_last_delivery}d`}
        </span>
      )}
    </div>
  );
}
