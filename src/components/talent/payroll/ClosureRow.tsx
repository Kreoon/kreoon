import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown, ChevronUp, Loader2, CheckCircle,
  Clock, Upload, X, FileText, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentAccounts, useUpdatePayment, useUploadReceipt } from '@/hooks/useTalentPayments';
import type { PaymentStatus } from '@/types/talentPayments.types';
import { PAYMENT_ACCOUNT_LABELS } from '@/types/talentPayments.types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from './formatCurrency';
import { ClosureContentTable } from './ClosureContentTable';
import type { MonthlyClosureEntry } from './types';

export function ClosureRow({
  entry,
  organizationId,
  hideIdentity = false,
}: {
  entry: MonthlyClosureEntry;
  organizationId: string;
  hideIdentity?: boolean;
}) {
  const qc = useQueryClient();
  const { data: accounts = [] } = usePaymentAccounts(organizationId, entry.payment.user_id);
  const updatePayment = useUpdatePayment(organizationId);
  const uploadReceipt = useUploadReceipt(organizationId);
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(false);
  // step: 'idle' | 'initiate' (confirmar iniciar transferencia) | 'confirm' (subir comprobante)
  const [step, setStep] = useState<'idle' | 'initiate' | 'confirm'>('idle');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const p = entry.payment;
  const contentCount = (p.content_ids ?? []).length;
  const payDate = p.payment_date ? new Date(p.payment_date) : null;
  const isPending    = p.status === 'pending';
  const isProcessing = p.status === 'processing';

  async function handleInitiateTransfer() {
    await updatePayment.mutateAsync({
      id: p.id,
      userId: p.user_id,
      status: 'processing' as PaymentStatus,
      payment_account_id: accountId || undefined,
    });
    qc.invalidateQueries({ queryKey: ['monthly-closures', organizationId] });
    toast({ title: `Transferencia iniciada — ${entry.full_name}` });
    setStep('idle');
  }

  async function handleConfirmPaid() {
    if (!receipt) return;
    const { path } = await uploadReceipt.mutateAsync({ file: receipt, userId: p.user_id });
    await updatePayment.mutateAsync({
      id: p.id,
      userId: p.user_id,
      status: 'paid' as PaymentStatus,
      receipt_url: path,
      payment_date: new Date(date).toISOString(),
      payment_account_id: accountId || undefined,
    });
    qc.invalidateQueries({ queryKey: ['monthly-closures', organizationId] });
    qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, p.user_id] });
    qc.invalidateQueries({ queryKey: ['content-financial-summary', organizationId, p.user_id] });
    toast({ title: `Pago confirmado — ${entry.full_name}` });
    setStep('idle');
    setReceipt(null);
  }

  const borderClass = isProcessing
    ? 'border-blue-400/40'
    : 'border-yellow-400/30';

  const amountClass = isProcessing
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div className={`rounded-lg border ${borderClass} bg-card overflow-hidden`}>
      <div className="flex items-center gap-3 p-3">
        {/* Avatar — oculto cuando va dentro de un grupo de usuario */}
        {!hideIdentity && (
          entry.avatar_url ? (
            <img src={entry.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {entry.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!hideIdentity && <p className="text-sm font-semibold truncate">{entry.full_name}</p>}
            {isProcessing && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium shrink-0">
                En transferencia
              </span>
            )}
            {!isProcessing && hideIdentity && isPending && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 font-medium shrink-0">
                Pendiente
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {p.description ?? 'Cierre mensual'}
            </p>
            {payDate && (
              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                Pagar antes del {format(payDate, "d 'de' MMM", { locale: es })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${amountClass}`}>
            {formatCurrency(p.amount, p.currency)}
          </span>

          {isPending && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => setStep(step === 'initiate' ? 'idle' : 'initiate')}
            >
              <Zap className="h-3 w-3" />
              Transferir
            </Button>
          )}

          {isProcessing && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
              onClick={() => setStep(step === 'confirm' ? 'idle' : 'confirm')}
            >
              <CheckCircle className="h-3 w-3" />
              Confirmar pago
            </Button>
          )}

          {contentCount > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Paso 1: Iniciar transferencia */}
      {step === 'initiate' && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Selecciona la cuenta destino y confirma que iniciaste la transferencia.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Cuenta destino</Label>
            <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                    {a.account_number ? ` · ${a.account_number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setStep('idle')}>Cancelar</Button>
            <Button
              size="sm"
              className="gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleInitiateTransfer}
              disabled={updatePayment.isPending}
            >
              {updatePayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Marcar en transferencia
            </Button>
          </div>
        </div>
      )}

      {/* Paso 2: Confirmar pago con comprobante */}
      {step === 'confirm' && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Sube el comprobante de transferencia para marcar el pago como confirmado.
          </p>

          {/* Comprobante — obligatorio */}
          <div className="space-y-1">
            <Label className="text-xs">
              Comprobante de transferencia <span className="text-destructive">*</span>
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                receipt ? 'border-green-400/50 bg-green-50 dark:bg-green-900/10' : 'border-border'
              }`}
            >
              {receipt ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <FileText className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="truncate text-green-700 dark:text-green-400">{receipt.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReceipt(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground mb-1.5">Imagen o PDF del comprobante</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>
                    Seleccionar archivo
                  </Button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cuenta usada</Label>
              <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                      {a.account_number ? ` · ${a.account_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha de pago</Label>
              <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setReceipt(null); }}>Cancelar</Button>
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700"
              onClick={handleConfirmPaid}
              disabled={!receipt || updatePayment.isPending || uploadReceipt.isPending}
            >
              {(updatePayment.isPending || uploadReceipt.isPending)
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle className="h-3.5 w-3.5" />}
              Confirmar pago
            </Button>
          </div>
        </div>
      )}

      {/* Proyectos del cierre — tabla con cliente y fecha de aprobación */}
      {expanded && contentCount > 0 && (
        <ClosureContentTable contentIds={p.content_ids ?? []} userId={p.user_id} />
      )}
    </div>
  );
}
