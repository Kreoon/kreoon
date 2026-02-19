import { motion } from 'framer-motion';
import {
  Lock,
  UserPlus,
  Clock,
  CheckCircle,
  CircleDot,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EscrowTimeline } from './EscrowTimeline';
import type { EscrowDisplay, EscrowStatus as EStatus } from '../../types';

const STATUS_ICONS: Record<EStatus, React.ComponentType<{ className?: string }>> = {
  active: Lock,
  pending_editor: UserPlus,
  pending_approval: Clock,
  released: CheckCircle,
  partially_released: CircleDot,
  refunded: RefreshCw,
  disputed: AlertTriangle,
  cancelled: XCircle,
};

interface EscrowStatusProps {
  escrow: EscrowDisplay;
  onRelease?: () => void;
  onRefund?: () => void;
  onDispute?: () => void;
  isReleasing?: boolean;
  isRefunding?: boolean;
  className?: string;
}

export function EscrowStatusCard({
  escrow,
  onRelease,
  onRefund,
  onDispute,
  isReleasing,
  isRefunding,
  className,
}: EscrowStatusProps) {
  const Icon = STATUS_ICONS[escrow.status];
  const canRelease = escrow.status === 'pending_approval';
  const canRefund = ['active', 'pending_editor', 'pending_approval'].includes(escrow.status);
  const canDispute = escrow.status === 'pending_approval';

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Decorative gradient based on status */}
      <div
        className={cn(
          'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none',
          escrow.status === 'released' && 'bg-emerald-500/10',
          escrow.status === 'disputed' && 'bg-red-500/10',
          escrow.status === 'refunded' && 'bg-amber-500/10',
          !['released', 'disputed', 'refunded'].includes(escrow.status) && 'bg-[hsl(270,100%,60%,0.1)]'
        )}
      />

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', escrow.statusColor.replace('text-', 'bg-').replace('/10', '/20'))}>
              <Icon className={cn('h-6 w-6', escrow.statusColor.split(' ')[1])} />
            </div>
            <div>
              <CardTitle className="text-lg">Estado del Escrow</CardTitle>
              <Badge variant="outline" className={cn('mt-1', escrow.statusColor)}>
                {escrow.statusLabel}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso</span>
            <span className="text-white">{escrow.progress}%</span>
          </div>
          <Progress value={escrow.progress} className="h-2" />
        </div>

        {/* Amount breakdown */}
        <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total en Escrow</span>
            <span className="text-lg font-bold text-white">{escrow.formattedTotal}</span>
          </div>
          <Separator className="bg-[hsl(270,100%,60%,0.1)]" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Creador ({escrow.creator_percentage}%)</p>
              <p className="text-sm font-medium text-emerald-400">{escrow.formattedCreatorAmount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Editor ({escrow.editor_percentage}%)</p>
              <p className="text-sm font-medium text-blue-400">{escrow.formattedEditorAmount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plataforma ({escrow.platform_percentage}%)</p>
              <p className="text-sm font-medium text-primary">{escrow.formattedPlatformFee}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="text-sm font-medium text-white mb-4">Timeline</h4>
          <EscrowTimeline steps={escrow.timelineSteps} />
        </div>

        {/* Actions */}
        {(canRelease || canRefund || canDispute) && (
          <>
            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />
            <div className="flex gap-3">
              {canRelease && onRelease && (
                <Button
                  onClick={onRelease}
                  disabled={isReleasing}
                  className="flex-1"
                >
                  {isReleasing ? 'Liberando...' : 'Aprobar y Liberar'}
                </Button>
              )}
              {canDispute && onDispute && (
                <Button
                  variant="outline"
                  onClick={onDispute}
                  className="flex-1"
                >
                  Abrir Disputa
                </Button>
              )}
              {canRefund && onRefund && (
                <Button
                  variant="destructive"
                  onClick={onRefund}
                  disabled={isRefunding}
                  className="flex-1"
                >
                  {isRefunding ? 'Reembolsando...' : 'Reembolsar'}
                </Button>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        {escrow.notes && (
          <div className="p-3 rounded-lg bg-[hsl(270,100%,60%,0.05)]">
            <p className="text-xs text-muted-foreground mb-1">Notas:</p>
            <p className="text-sm text-[hsl(270,30%,70%)]">{escrow.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for lists
interface EscrowListItemProps {
  escrow: EscrowDisplay;
  onClick?: () => void;
  className?: string;
}

export function EscrowListItem({ escrow, onClick, className }: EscrowListItemProps) {
  const Icon = STATUS_ICONS[escrow.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl cursor-pointer transition-all',
        'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.08)]',
        'border border-transparent hover:border-[hsl(270,100%,60%,0.1)]',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn('p-2 rounded-full', escrow.statusColor.replace('text-', 'bg-').replace('/10', '/20'))}>
          <Icon className={cn('h-5 w-5', escrow.statusColor.split(' ')[1])} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">
              {escrow.formattedTotal}
            </p>
            <Badge variant="outline" className={cn('text-[10px]', escrow.statusColor)}>
              {escrow.statusLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            ID: {escrow.id.slice(0, 8)}... • {new Date(escrow.created_at).toLocaleDateString('es-CO')}
          </p>
        </div>
        <div className="text-right">
          <Progress value={escrow.progress} className="w-16 h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">{escrow.progress}%</p>
        </div>
      </div>
    </motion.div>
  );
}
