import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { usePaymentMethods, usePaymentMethodMutations } from '../../hooks/usePaymentMethods';
import { useWithdrawalMutations, usePendingWithdrawal } from '../../hooks/useWithdrawals';
import type {
  WalletDisplay,
  PaymentMethodType,
  PAYMENT_METHOD_LABELS,
  WITHDRAWAL_FEES,
  calculateWithdrawalFee,
  formatCurrency,
} from '../../types';
import { PaymentMethodForm } from './PaymentMethodForm';

const withdrawalSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  payment_method_id: z.string().min(1, 'Selecciona un método de pago'),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface WithdrawalFormProps {
  wallet: WalletDisplay;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function WithdrawalForm({
  wallet,
  onSuccess,
  onCancel,
  className,
}: WithdrawalFormProps) {
  const [showNewMethodForm, setShowNewMethodForm] = useState(false);

  const { methods, isLoading: isLoadingMethods } = usePaymentMethods();
  const { createWithdrawal, isCreating } = useWithdrawalMutations();
  const { hasPendingWithdrawal, isLoading: isCheckingPending } = usePendingWithdrawal(wallet.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 0,
      payment_method_id: '',
    },
  });

  const amount = watch('amount');
  const selectedMethodId = watch('payment_method_id');

  const selectedMethod = methods.find(m => m.id === selectedMethodId);
  const fee = selectedMethod ? calculateWithdrawalFee(selectedMethod.method_type, amount || 0) : 0;
  const netAmount = (amount || 0) - fee;
  const minAmount = selectedMethod ? WITHDRAWAL_FEES[selectedMethod.method_type].min : 0;

  // Validation
  const canSubmit =
    !hasPendingWithdrawal &&
    amount > 0 &&
    amount <= wallet.available_balance &&
    amount >= minAmount &&
    netAmount > 0 &&
    selectedMethodId;

  const onSubmit = async (data: WithdrawalFormData) => {
    if (!selectedMethod) return;

    createWithdrawal(
      {
        wallet_id: wallet.id,
        amount: data.amount,
        payment_method: selectedMethod.method_type,
        payment_details: selectedMethod.details,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  if (showNewMethodForm) {
    return (
      <PaymentMethodForm
        onSuccess={() => setShowNewMethodForm(false)}
        onCancel={() => setShowNewMethodForm(false)}
        className={className}
      />
    );
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Decorative gradient */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[hsl(270,100%,60%,0.1)] rounded-full blur-3xl pointer-events-none" />

      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
            <ArrowUpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Solicitar Retiro</CardTitle>
            <CardDescription>
              Balance disponible: {wallet.formattedAvailable}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Pending withdrawal warning */}
        {hasPendingWithdrawal && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Retiro pendiente</AlertTitle>
            <AlertDescription>
              Ya tienes una solicitud de retiro en proceso. Espera a que sea procesada
              antes de solicitar otro retiro.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a retirar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={wallet.available_balance}
                {...register('amount', { valueAsNumber: true })}
                className="pl-8 text-lg h-12"
                placeholder="0.00"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
                onClick={() => setValue('amount', wallet.available_balance)}
              >
                Máx
              </Button>
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Método de pago</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setShowNewMethodForm(true)}
              >
                + Agregar nuevo
              </Button>
            </div>
            {isLoadingMethods ? (
              <div className="h-12 bg-[hsl(270,100%,60%,0.05)] rounded-lg animate-pulse" />
            ) : methods.length === 0 ? (
              <div className="p-4 rounded-lg bg-[hsl(270,100%,60%,0.05)] text-center">
                <p className="text-sm text-muted-foreground">
                  No tienes métodos de pago configurados
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowNewMethodForm(true)}
                >
                  Agregar método de pago
                </Button>
              </div>
            ) : (
              <Select
                value={selectedMethodId}
                onValueChange={(value) => setValue('payment_method_id', value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecciona un método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {methods.map(method => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <span>{method.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({method.typeLabel})
                        </span>
                        {method.is_default && (
                          <span className="text-xs text-primary">
                            • Default
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.payment_method_id && (
              <p className="text-xs text-destructive">{errors.payment_method_id.message}</p>
            )}
          </div>

          {/* Summary */}
          {selectedMethod && amount > 0 && (
            <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monto solicitado</span>
                <span className="text-white">{formatCurrency(amount, wallet.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Comisión ({selectedMethod.typeLabel})</span>
                <span className="text-amber-400">-{formatCurrency(fee, wallet.currency)}</span>
              </div>
              <div className="h-px bg-[hsl(270,100%,60%,0.1)]" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Recibirás</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(netAmount, wallet.currency)}
                </span>
              </div>

              {/* Minimum warning */}
              {amount < minAmount && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    El monto mínimo para {selectedMethod.typeLabel} es{' '}
                    {formatCurrency(minAmount, wallet.currency)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Las solicitudes de retiro son procesadas manualmente. El tiempo de procesamiento
              puede variar según el método de pago seleccionado (1-3 días hábiles).
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canSubmit || isCreating}
              className="flex-1"
            >
              {isCreating ? 'Procesando...' : 'Solicitar Retiro'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
