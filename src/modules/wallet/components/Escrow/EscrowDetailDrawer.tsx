import { useState } from 'react';
import {
  Lock,
  X,
  DollarSign,
  Calendar,
  Users,
  FileText,
  Building2,
  User,
  Film,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { EscrowTimelineEnhanced } from './EscrowTimelineEnhanced';
import { EscrowDistribution } from './EscrowDistribution';
import { EscrowActions, type UserRole } from './EscrowActions';
import {
  ApproveContentModal,
  RequestChangesModal,
  OpenDisputeModal,
} from './EscrowModals';
import type { EscrowDisplay } from '../../types';
import { formatCurrency } from '../../types';

interface EscrowDetailDrawerProps {
  escrow: EscrowDisplay | null;
  open: boolean;
  onClose: () => void;
  userRole?: UserRole;
  onApprove?: (data: { rating: number; comment?: string }) => void;
  onRequestChanges?: (data: { changes: string }) => void;
  onOpenDispute?: (data: { reason: string; description: string }) => void;
  onRefund?: () => void;
  onManualRelease?: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function EscrowDetailDrawer({
  escrow,
  open,
  onClose,
  userRole = 'brand',
  onApprove,
  onRequestChanges,
  onOpenDispute,
  onRefund,
  onManualRelease,
  isProcessing,
  className,
}: EscrowDetailDrawerProps) {
  const [activeModal, setActiveModal] = useState<
    'approve' | 'request_changes' | 'open_dispute' | null
  >(null);
  const [notes, setNotes] = useState('');

  if (!escrow) return null;

  // Get participants data (would come from escrow relation in real app)
  const payer = (escrow as any).payer || { name: 'Cliente', type: 'brand' };
  const creator = (escrow as any).creator;
  const editor = (escrow as any).editor;

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'approve':
        setActiveModal('approve');
        break;
      case 'request_changes':
        setActiveModal('request_changes');
        break;
      case 'open_dispute':
        setActiveModal('open_dispute');
        break;
      case 'refund':
        onRefund?.();
        break;
      case 'manual_release':
        onManualRelease?.();
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className={cn('w-full sm:max-w-lg overflow-y-auto', className)}
        >
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <SheetTitle>Detalle del Escrow</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: {escrow.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <EscrowStatusBadge status={escrow.status} size="md" />
              <span className="text-xs text-muted-foreground">
                {new Date(escrow.created_at).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

            {/* Financial Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-white">Resumen Financiero</h3>
              </div>
              <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] text-center">
                <p className="text-sm text-muted-foreground">Total bloqueado</p>
                <p className="text-3xl font-bold text-white mt-1">{escrow.formattedTotal}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Moneda: {escrow.currency}
                </p>
              </div>
            </div>

            {/* Distribution */}
            <EscrowDistribution escrow={escrow} size="full" />

            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

            {/* Timeline */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-white">Timeline</h3>
              </div>
              {escrow.timelineSteps && (
                <EscrowTimelineEnhanced
                  steps={escrow.timelineSteps}
                  orientation="vertical"
                  size="md"
                />
              )}
            </div>

            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

            {/* Participants */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-white">Participantes</h3>
              </div>

              <div className="space-y-3">
                {/* Payer (Brand) */}
                <div className="p-3 rounded-xl bg-[hsl(270,100%,60%,0.03)]">
                  <p className="text-xs text-muted-foreground mb-2">Pagador (Marca)</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[hsl(270,100%,60%,0.1)]">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{payer.name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        Balance después: {formatCurrency(payer.balanceAfter || 0, escrow.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Creator */}
                <div className="p-3 rounded-xl bg-[hsl(270,100%,60%,0.03)]">
                  <p className="text-xs text-emerald-400 mb-2">Creador</p>
                  <div className="flex items-center gap-3">
                    {creator ? (
                      <>
                        <Avatar className="h-10 w-10">
                          {creator.avatar_url && <AvatarImage src={creator.avatar_url} />}
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">
                            {creator.full_name || `@${creator.username}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Recibirá: {escrow.formattedCreatorAmount}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Por asignar</p>
                    )}
                  </div>
                </div>

                {/* Editor */}
                {escrow.editor_percentage > 0 && (
                  <div className="p-3 rounded-xl bg-[hsl(270,100%,60%,0.03)]">
                    <p className="text-xs text-blue-400 mb-2">Editor</p>
                    <div className="flex items-center gap-3">
                      {editor ? (
                        <>
                          <Avatar className="h-10 w-10">
                            {editor.avatar_url && <AvatarImage src={editor.avatar_url} />}
                            <AvatarFallback>
                              <Film className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">
                              {editor.full_name || `@${editor.username}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recibirá: {escrow.formattedEditorAmount}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Por asignar</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

            {/* Actions */}
            <EscrowActions
              escrow={escrow}
              userRole={userRole}
              onAction={handleAction}
              isLoading={isProcessing}
              showCard={false}
            />

            {/* Admin notes */}
            {userRole === 'admin' && (
              <>
                <Separator className="bg-[hsl(270,100%,60%,0.1)]" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-white">Notas (Admin)</h3>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agregar notas internas sobre este escrow..."
                    rows={3}
                  />
                  {escrow.notes && (
                    <div className="p-3 rounded-lg bg-[hsl(270,100%,60%,0.03)]">
                      <p className="text-xs text-muted-foreground mb-1">Notas previas:</p>
                      <p className="text-sm text-[hsl(270,30%,70%)]">{escrow.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <ApproveContentModal
        escrow={escrow}
        open={activeModal === 'approve'}
        onClose={() => setActiveModal(null)}
        onApprove={(data) => {
          onApprove?.(data);
          setActiveModal(null);
        }}
        isLoading={isProcessing}
      />

      <RequestChangesModal
        escrow={escrow}
        open={activeModal === 'request_changes'}
        onClose={() => setActiveModal(null)}
        onRequest={(data) => {
          onRequestChanges?.(data);
          setActiveModal(null);
        }}
        isLoading={isProcessing}
      />

      <OpenDisputeModal
        escrow={escrow}
        open={activeModal === 'open_dispute'}
        onClose={() => setActiveModal(null)}
        onDispute={(data) => {
          onOpenDispute?.(data);
          setActiveModal(null);
        }}
        isLoading={isProcessing}
      />
    </>
  );
}
