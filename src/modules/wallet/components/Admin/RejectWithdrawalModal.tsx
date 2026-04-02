import { useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WithdrawalDisplay } from '../../types';

const REJECTION_REASONS = [
  { value: 'invalid_payment_data', label: 'Datos de pago incorrectos' },
  { value: 'unverified_account', label: 'Cuenta no verificada' },
  { value: 'suspicious_activity', label: 'Actividad sospechosa' },
  { value: 'insufficient_documentation', label: 'Documentación insuficiente' },
  { value: 'policy_violation', label: 'Violación de políticas' },
  { value: 'other', label: 'Otro (especificar)' },
] as const;

interface RejectWithdrawalModalProps {
  withdrawal: WithdrawalDisplay | null;
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  isProcessing?: boolean;
}

export function RejectWithdrawalModal({
  withdrawal,
  open,
  onClose,
  onReject,
  isProcessing,
}: RejectWithdrawalModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const selectedReasonLabel = REJECTION_REASONS.find(r => r.value === selectedReason)?.label || '';
  const isOther = selectedReason === 'other';

  const finalReason = isOther
    ? customReason
    : selectedReasonLabel + (customReason ? `: ${customReason}` : '');

  const canSubmit = selectedReason && (isOther ? customReason.length >= 10 : true);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onReject(finalReason);
    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  if (!withdrawal) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <AlertDialogTitle>Rechazar Retiro</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-3 p-3 rounded-sm bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[hsl(270,30%,70%)]">
                  <p>
                    Esta acción devolverá <strong>{withdrawal.formattedNetAmount}</strong> al
                    balance disponible del usuario.
                  </p>
                </div>
              </div>

              {/* Reason selector */}
              <div className="space-y-2">
                <Label>Motivo del rechazo *</Label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional comment */}
              <div className="space-y-2">
                <Label>
                  {isOther ? 'Razón específica *' : 'Comentario adicional (opcional)'}
                </Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={
                    isOther
                      ? 'Explica el motivo del rechazo (mín. 10 caracteres)...'
                      : 'Agrega más detalles si es necesario...'
                  }
                  rows={3}
                  className={cn(
                    isOther && customReason.length > 0 && customReason.length < 10 &&
                    'border-destructive'
                  )}
                />
                {isOther && customReason.length > 0 && customReason.length < 10 && (
                  <p className="text-xs text-destructive">
                    Mínimo 10 caracteres ({customReason.length}/10)
                  </p>
                )}
              </div>

              {/* Preview */}
              {selectedReason && (
                <div className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.05)]">
                  <p className="text-xs text-muted-foreground mb-1">
                    El usuario verá este mensaje:
                  </p>
                  <p className="text-sm text-white">{finalReason || '...'}</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Rechazo'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
