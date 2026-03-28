import { Lock, Unlock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { EscrowTimelineEnhanced } from './EscrowTimelineEnhanced';
import { EscrowDistribution } from './EscrowDistribution';
import type { EscrowDisplay } from '../../types';

interface EscrowCardProps {
  escrow: EscrowDisplay;
  onViewDetail?: () => void;
  showTimeline?: boolean;
  showDistribution?: boolean;
  className?: string;
}

export function EscrowCard({
  escrow,
  onViewDetail,
  showTimeline = true,
  showDistribution = true,
  className,
}: EscrowCardProps) {
  const isLocked = !['released', 'refunded', 'cancelled'].includes(escrow.status);
  const LockIcon = isLocked ? Lock : Unlock;

  // Border color based on status
  const borderColor = {
    active: 'border-amber-500/30',
    pending_editor: 'border-blue-500/30',
    pending_approval: 'border-[hsl(270,100%,60%,0.3)]',
    released: 'border-emerald-500/30',
    partially_released: 'border-emerald-500/20',
    refunded: 'border-orange-500/30',
    disputed: 'border-red-500/30',
    cancelled: 'border-gray-500/30',
  }[escrow.status];

  // Background gradient based on status
  const bgGradient = {
    active: 'from-amber-500/5 to-transparent',
    pending_editor: 'from-blue-500/5 to-transparent',
    pending_approval: 'from-[hsl(270,100%,60%,0.05)] to-transparent',
    released: 'from-emerald-500/5 to-transparent',
    partially_released: 'from-emerald-500/3 to-transparent',
    refunded: 'from-orange-500/5 to-transparent',
    disputed: 'from-red-500/5 to-transparent',
    cancelled: 'from-gray-500/5 to-transparent',
  }[escrow.status];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2',
        borderColor,
        className
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br pointer-events-none',
          bgGradient
        )}
      />

      {/* Confetti effect for released status */}
      {escrow.status === 'released' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4],
                top: `${Math.random() * 30}%`,
                left: `${10 + i * 15}%`,
                opacity: 0.3,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-sm',
                isLocked ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              )}
            >
              <LockIcon
                className={cn(
                  'h-5 w-5',
                  isLocked ? 'text-amber-400' : 'text-emerald-400'
                )}
              />
            </div>
            <div>
              <CardTitle className="text-base">
                {isLocked ? 'Fondos en Garantía' : 'Fondos Liberados'}
              </CardTitle>
              <EscrowStatusBadge status={escrow.status} size="sm" className="mt-1" />
            </div>
          </div>

          {onViewDetail && (
            <Button variant="ghost" size="sm" onClick={onViewDetail}>
              <Eye className="h-4 w-4 mr-1" />
              Ver detalle
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Total amount */}
        <div className="text-center p-4 rounded-sm bg-[hsl(270,100%,60%,0.05)]">
          <p className="text-sm text-muted-foreground">Total bloqueado</p>
          <p className="text-2xl font-bold text-white mt-1">{escrow.formattedTotal}</p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Progreso</span>
            <span className="text-white">{escrow.progress}%</span>
          </div>
          <Progress value={escrow.progress} className="h-1.5" />
        </div>

        {/* Horizontal timeline */}
        {showTimeline && escrow.timelineSteps && (
          <EscrowTimelineEnhanced
            steps={escrow.timelineSteps}
            orientation="horizontal"
            size="sm"
          />
        )}

        {/* Distribution summary */}
        {showDistribution && (
          <EscrowDistribution escrow={escrow} size="compact" />
        )}
      </CardContent>
    </Card>
  );
}
