import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  XCircle,
  Copy,
  User,
  X,
  Upload,
  Building2,
  Calendar,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RejectWithdrawalModal } from './RejectWithdrawalModal';
import type { WithdrawalDisplay, ProcessWithdrawalInput } from '../../types';

const approveSchema = z.object({
  external_reference: z.string().min(1, 'Ingresa la referencia del pago'),
  payment_proof_url: z.string().optional(),
});

type ApproveFormData = z.infer<typeof approveSchema>;

interface ProcessWithdrawalDrawerProps {
  withdrawal: WithdrawalDisplay | null;
  open: boolean;
  onClose: () => void;
  onProcess: (input: ProcessWithdrawalInput) => void;
  isProcessing?: boolean;
}

export function ProcessWithdrawalDrawer({
  withdrawal,
  open,
  onClose,
  onProcess,
  isProcessing,
}: ProcessWithdrawalDrawerProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const profile = withdrawal ? (withdrawal as any).profiles : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      external_reference: '',
      payment_proof_url: '',
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const copyAllDetails = () => {
    if (!withdrawal) return;

    const details = Object.entries(withdrawal.payment_details)
      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
      .join('\n');

    const fullText = `
Retiro #${withdrawal.id.slice(0, 8)}
Usuario: ${profile?.full_name || 'N/A'}
Email: ${profile?.email || 'N/A'}
Monto a pagar: ${withdrawal.formattedNetAmount}

${withdrawal.methodLabel}
${details}
    `.trim();

    navigator.clipboard.writeText(fullText);
    toast.success('Datos copiados al portapapeles');
  };

  const handleApprove = (data: ApproveFormData) => {
    if (!withdrawal) return;

    onProcess({
      withdrawal_id: withdrawal.id,
      status: 'completed',
      external_reference: data.external_reference,
      payment_proof_url: data.payment_proof_url || undefined,
    });
    reset();
  };

  const handleReject = (reason: string) => {
    if (!withdrawal) return;

    onProcess({
      withdrawal_id: withdrawal.id,
      status: 'rejected',
      rejection_reason: reason,
    });
    setShowRejectModal(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!withdrawal) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <SheetTitle>Procesar Retiro</SheetTitle>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* User info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)]">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  <User className="h-7 w-7" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-lg truncate">
                  {profile?.full_name || 'Usuario'}
                </p>
                <p className="text-sm text-[hsl(270,30%,60%)] truncate">{profile?.email}</p>
                <div className="flex items-center gap-1 text-xs text-[hsl(270,30%,50%)] mt-1">
                  <Calendar className="h-3 w-3" />
                  Solicitado: {withdrawal.formattedDate}
                </div>
              </div>
            </div>

            {/* Amount summary */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-center">
                <p className="text-sm text-[hsl(270,30%,60%)]">Monto a pagar</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">
                  {withdrawal.formattedNetAmount}
                </p>
                <p className="text-xs text-[hsl(270,30%,50%)] mt-1">
                  Solicitado: {withdrawal.formattedAmount} • Fee: {withdrawal.formattedFee}
                </p>
              </div>
            </div>

            {/* Payment details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[hsl(270,100%,70%)]" />
                  <span className="text-sm font-medium text-white">Destino del pago</span>
                </div>
                <Button variant="ghost" size="sm" onClick={copyAllDetails}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar todo
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(270,30%,60%)]">Método</span>
                  <Badge variant="outline">{withdrawal.methodLabel}</Badge>
                </div>
                <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

                {Object.entries(withdrawal.payment_details).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between group">
                    <span className="text-sm text-[hsl(270,30%,60%)] capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-mono">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          copyToClipboard(
                            typeof value === 'string' ? value : JSON.stringify(value),
                            key
                          )
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

            {/* Approve form */}
            <form onSubmit={handleSubmit(handleApprove)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="external_reference">
                  Referencia del Pago <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="external_reference"
                  {...register('external_reference')}
                  placeholder="Número de transferencia, ID de PayPal, hash, etc."
                />
                {errors.external_reference && (
                  <p className="text-xs text-destructive">
                    {errors.external_reference.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_proof_url">
                  Comprobante de pago (URL)
                </Label>
                <Input
                  id="payment_proof_url"
                  {...register('payment_proof_url')}
                  placeholder="https://... (opcional)"
                />
                <p className="text-xs text-[hsl(270,30%,50%)]">
                  URL de imagen o PDF del comprobante de pago
                </p>
              </div>

              {/* Warning for large amounts */}
              {withdrawal.net_amount > 1000 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[hsl(270,30%,70%)]">
                    <p className="font-medium text-amber-400">Monto considerable</p>
                    <p className="text-xs mt-1">
                      Verifica cuidadosamente los datos antes de procesar este pago.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    'Procesando...'
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar Pago
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Request info */}
            <div className="text-xs text-[hsl(270,30%,50%)] space-y-1 pt-4">
              <p>ID: {withdrawal.id}</p>
              <p>Status: {withdrawal.statusLabel}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject Modal */}
      <RejectWithdrawalModal
        withdrawal={withdrawal}
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={handleReject}
        isProcessing={isProcessing}
      />
    </>
  );
}
