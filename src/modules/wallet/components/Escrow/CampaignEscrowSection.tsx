import { useState } from 'react';
import { DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EscrowCard } from './EscrowCard';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { EscrowTimelineEnhanced } from './EscrowTimelineEnhanced';
import { EscrowDetailDrawer } from './EscrowDetailDrawer';
import { useProjectEscrow, useEscrowMutations } from '../../hooks/useEscrow';
import type { EscrowDisplay } from '../../types';
import { formatCurrency } from '../../types';

type ViewMode = 'brand' | 'creator' | 'editor';

interface CampaignEscrowSectionProps {
  campaignId: string;
  viewMode?: ViewMode;
  className?: string;
}

export function CampaignEscrowSection({
  campaignId,
  viewMode = 'brand',
  className,
}: CampaignEscrowSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { escrow, isLoading, error } = useProjectEscrow(campaignId);
  const {
    releaseEscrow,
    refundEscrow,
    isReleasing,
    isRefunding,
  } = useEscrowMutations();

  if (isLoading) {
    return <EscrowSectionSkeleton viewMode={viewMode} className={className} />;
  }

  if (error || !escrow) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-400/50 mb-3" />
          <p className="text-muted-foreground">
            No hay información de escrow disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  // Brand view - full EscrowCard with actions
  if (viewMode === 'brand') {
    return (
      <>
        <Card className={cn('', className)}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Estado del Pago</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <EscrowCard
              escrow={escrow}
              onViewDetail={() => setDrawerOpen(true)}
              showTimeline
              showDistribution
            />
          </CardContent>
        </Card>

        <EscrowDetailDrawer
          escrow={escrow}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userRole="brand"
          onApprove={() => {
            releaseEscrow({ escrowId: escrow.id });
          }}
          onRefund={() => {
            refundEscrow({ escrowId: escrow.id });
          }}
          isProcessing={isReleasing || isRefunding}
        />
      </>
    );
  }

  // Creator/Editor view - simplified payment status
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <CardTitle>Tu Pago por esta Campaña</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {escrow.status === 'released' ? 'Recibiste' : 'Recibirás'}
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(
                  viewMode === 'creator' ? escrow.creator_amount : escrow.editor_amount,
                  escrow.currency
                )}
              </p>
            </div>
            <EscrowStatusBadge status={escrow.status} size="sm" />
          </div>
        </div>

        {/* Status message */}
        <div className="flex items-start gap-3 p-3 rounded-sm bg-[hsl(270,100%,60%,0.03)]">
          {escrow.status === 'released' ? (
            <>
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Pago completado</p>
                <p className="text-xs text-muted-foreground">
                  Los fondos han sido transferidos a tu wallet
                </p>
              </div>
            </>
          ) : escrow.status === 'pending_approval' ? (
            <>
              <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Esperando aprobación</p>
                <p className="text-xs text-muted-foreground">
                  El cliente está revisando tu entrega
                </p>
              </div>
            </>
          ) : escrow.status === 'disputed' ? (
            <>
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Disputa abierta</p>
                <p className="text-xs text-muted-foreground">
                  El pago está congelado mientras se resuelve
                </p>
              </div>
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">Fondos en garantía</p>
                <p className="text-xs text-muted-foreground">
                  Se liberarán cuando la campaña sea completada
                </p>
              </div>
            </>
          )}
        </div>

        {/* Simplified timeline */}
        {escrow.timelineSteps && (
          <EscrowTimelineEnhanced
            steps={escrow.timelineSteps}
            orientation="horizontal"
            size="sm"
          />
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton loader
function EscrowSectionSkeleton({
  viewMode,
  className,
}: {
  viewMode: ViewMode;
  className?: string;
}) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-sm" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-sm bg-[hsl(270,100%,60%,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {viewMode === 'brand' && (
          <>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 p-3 rounded-sm bg-[hsl(270,100%,60%,0.03)]">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
