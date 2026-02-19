import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  XCircle,
  Upload,
  ExternalLink,
  Copy,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WithdrawalDisplay, ProcessWithdrawalInput } from '../../types';

const approveSchema = z.object({
  external_reference: z.string().min(1, 'Ingresa la referencia del pago'),
  payment_proof_url: z.string().optional(),
});

const rejectSchema = z.object({
  rejection_reason: z.string().min(10, 'Proporciona una razón detallada (mín. 10 caracteres)'),
});

interface ProcessWithdrawalDialogProps {
  withdrawal: WithdrawalDisplay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (input: ProcessWithdrawalInput) => void;
  isProcessing?: boolean;
}

export function ProcessWithdrawalDialog({
  withdrawal,
  open,
  onOpenChange,
  onProcess,
  isProcessing,
}: ProcessWithdrawalDialogProps) {
  const [activeTab, setActiveTab] = useState<'approve' | 'reject'>('approve');
  const profile = (withdrawal as any).profiles;

  const approveForm = useForm({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      external_reference: '',
      payment_proof_url: '',
    },
  });

  const rejectForm = useForm({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      rejection_reason: '',
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const handleApprove = (data: z.infer<typeof approveSchema>) => {
    onProcess({
      withdrawal_id: withdrawal.id,
      status: 'completed',
      external_reference: data.external_reference,
      payment_proof_url: data.payment_proof_url || undefined,
    });
  };

  const handleReject = (data: z.infer<typeof rejectSchema>) => {
    onProcess({
      withdrawal_id: withdrawal.id,
      status: 'rejected',
      rejection_reason: data.rejection_reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Procesar Solicitud de Retiro</DialogTitle>
          <DialogDescription>
            Revisa los detalles y procesa esta solicitud
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User info */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)]">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                <User className="h-7 w-7" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-white text-lg">{profile?.full_name || 'Usuario'}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">{withdrawal.formattedNetAmount}</p>
              <p className="text-xs text-muted-foreground">
                Solicitado: {withdrawal.formattedAmount} (Fee: {withdrawal.formattedFee})
              </p>
            </div>
          </div>

          {/* Payment details */}
          <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Método de Pago</span>
              <Badge variant="outline">{withdrawal.methodLabel}</Badge>
            </div>
            <Separator className="bg-[hsl(270,100%,60%,0.1)]" />

            {/* Payment details based on method */}
            {Object.entries(withdrawal.payment_details).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-mono">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
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

          <Separator />

          {/* Approve/Reject tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="approve" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Aprobar
              </TabsTrigger>
              <TabsTrigger value="reject" className="gap-2">
                <XCircle className="h-4 w-4" />
                Rechazar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approve" className="space-y-4 mt-4">
              <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="external_reference">
                    Referencia del Pago <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="external_reference"
                    {...approveForm.register('external_reference')}
                    placeholder="Número de transferencia, ID de PayPal, etc."
                  />
                  {approveForm.formState.errors.external_reference && (
                    <p className="text-xs text-destructive">
                      {approveForm.formState.errors.external_reference.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_proof_url">URL del Comprobante (opcional)</Label>
                  <Input
                    id="payment_proof_url"
                    {...approveForm.register('payment_proof_url')}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    URL de imagen o PDF del comprobante de pago
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Aprobar y Completar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reject" className="space-y-4 mt-4">
              <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rejection_reason">
                    Motivo del Rechazo <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="rejection_reason"
                    {...rejectForm.register('rejection_reason')}
                    placeholder="Explica por qué se rechaza esta solicitud..."
                    rows={4}
                  />
                  {rejectForm.formState.errors.rejection_reason && (
                    <p className="text-xs text-destructive">
                      {rejectForm.formState.errors.rejection_reason.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    El usuario recibirá este mensaje. Los fondos serán devueltos a su wallet.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Rechazar Solicitud'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Request info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>ID: {withdrawal.id}</p>
            <p>Solicitado: {withdrawal.formattedDate}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
