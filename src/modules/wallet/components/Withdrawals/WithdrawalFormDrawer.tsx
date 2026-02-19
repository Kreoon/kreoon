import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  X,
  Percent,
  AlertCircle,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { WithdrawalConfirmation } from './WithdrawalConfirmation';
import { usePaymentMethods, type PaymentMethodDisplay } from '../../hooks/usePaymentMethods';
import { useWithdrawalMutations, usePendingWithdrawal } from '../../hooks/useWithdrawals';
import type { WalletDisplay } from '../../types';
import { formatCurrency, calculateWithdrawalFee, WITHDRAWAL_FEES } from '../../types';

type WithdrawalStep = 'amount' | 'method' | 'confirmation' | 'success';

interface WithdrawalFormDrawerProps {
  open: boolean;
  onClose: () => void;
  wallet: WalletDisplay;
}

const QUICK_PERCENTAGES = [25, 50, 75, 100] as const;

export function WithdrawalFormDrawer({
  open,
  onClose,
  wallet,
}: WithdrawalFormDrawerProps) {
  const [step, setStep] = useState<WithdrawalStep>('amount');
  const [amount, setAmount] = useState<number>(0);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);

  const { methods, isLoading: isLoadingMethods } = usePaymentMethods();
  const { createWithdrawal, isCreating } = useWithdrawalMutations();
  const { hasPendingWithdrawal } = usePendingWithdrawal(wallet.id);

  const selectedMethod = methods.find(m => m.id === selectedMethodId) || null;
  const minAmount = selectedMethod ? WITHDRAWAL_FEES[selectedMethod.method_type].min : 50;
  const fee = selectedMethod ? calculateWithdrawalFee(selectedMethod.method_type, amount) : 0;
  const netAmount = amount - fee;

  // Validation
  const isAmountValid = amount >= minAmount && amount <= wallet.available_balance;
  const canProceedToMethod = isAmountValid && !hasPendingWithdrawal;
  const canProceedToConfirm = canProceedToMethod && selectedMethod !== null;

  const handleQuickAmount = useCallback((percentage: number) => {
    const calculated = (wallet.available_balance * percentage) / 100;
    setAmount(Math.floor(calculated * 100) / 100); // Round to 2 decimals
  }, [wallet.available_balance]);

  const handleNext = () => {
    if (step === 'amount' && canProceedToMethod) {
      setStep('method');
    } else if (step === 'method' && canProceedToConfirm) {
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    if (step === 'method') {
      setStep('amount');
    } else if (step === 'confirmation') {
      setStep('method');
    }
  };

  const handleConfirm = () => {
    if (!selectedMethod) return;

    createWithdrawal(
      {
        wallet_id: wallet.id,
        amount,
        payment_method: selectedMethod.method_type,
        payment_details: selectedMethod.details,
      },
      {
        onSuccess: () => {
          setStep('success');
        },
      }
    );
  };

  const handleClose = () => {
    // Reset state on close
    setStep('amount');
    setAmount(0);
    setSelectedMethodId(null);
    setShowAddMethod(false);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'amount':
        return (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Available balance */}
            <div className="text-center p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)]">
              <p className="text-sm text-muted-foreground mb-1">Disponible para retiro</p>
              <p className="text-2xl font-bold text-white">{wallet.formattedAvailable}</p>
            </div>

            {/* Pending warning */}
            {hasPendingWithdrawal && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ya tienes una solicitud de retiro pendiente. Espera a que sea procesada.
                </AlertDescription>
              </Alert>
            )}

            {/* Amount input */}
            <div className="space-y-2">
              <Label>¿Cuánto deseas retirar?</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={wallet.available_balance}
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="pl-8 pr-16 text-xl h-14 text-center font-semibold"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {wallet.currency}
                </span>
              </div>
            </div>

            {/* Quick percentages */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Monto rápido:</Label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_PERCENTAGES.map((pct) => (
                  <Button
                    key={pct}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(pct)}
                    className={cn(
                      'h-10',
                      amount === (wallet.available_balance * pct) / 100 &&
                        'border-[hsl(270,100%,60%)] bg-[hsl(270,100%,60%,0.1)]'
                    )}
                  >
                    <Percent className="h-3 w-3 mr-1" />
                    {pct === 100 ? 'Todo' : `${pct}%`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Limits info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mínimo: {formatCurrency(minAmount, wallet.currency)}</span>
              <span>Máximo: {wallet.formattedAvailable}</span>
            </div>

            {/* Summary preview */}
            {amount > 0 && selectedMethod && (
              <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comisión estimada</span>
                  <span className="text-amber-400">-{formatCurrency(fee, wallet.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recibirás</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(netAmount, wallet.currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Amount validation error */}
            {amount > 0 && amount < minAmount && (
              <p className="text-xs text-destructive">
                El monto mínimo es {formatCurrency(minAmount, wallet.currency)}
              </p>
            )}
            {amount > wallet.available_balance && (
              <p className="text-xs text-destructive">
                El monto excede tu balance disponible
              </p>
            )}

            {/* Next button */}
            <Button
              onClick={handleNext}
              disabled={!canProceedToMethod}
              className="w-full h-12"
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        );

      case 'method':
        return (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <PaymentMethodSelector
              selectedId={selectedMethodId}
              onChange={setSelectedMethodId}
              onAddNew={() => setShowAddMethod(true)}
              methods={methods}
              isLoading={isLoadingMethods}
              currency={wallet.currency}
            />

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedToConfirm}
                className="flex-1"
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 'confirmation':
        return (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <WithdrawalConfirmation
              amount={amount}
              fee={fee}
              netAmount={netAmount}
              currency={wallet.currency}
              paymentMethod={selectedMethod!}
            />

            {/* Large amount warning */}
            {amount > 1000 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este es un retiro por un monto considerable. Por favor verifica que todos
                  los datos sean correctos antes de confirmar.
                </AlertDescription>
              </Alert>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isCreating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isCreating ? 'Procesando...' : 'Confirmar Retiro'}
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center py-8"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                ¡Solicitud Enviada!
              </h3>
              <p className="text-muted-foreground">
                Tu solicitud de retiro por{' '}
                <span className="text-white font-medium">
                  {formatCurrency(netAmount, wallet.currency)}
                </span>{' '}
                ha sido recibida.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] text-left space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="text-white">¿Qué sigue?</span>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Nuestro equipo revisará tu solicitud</li>
                <li>• Tiempo estimado de procesamiento: 1-3 días hábiles</li>
                <li>• Te notificaremos cuando el pago sea enviado</li>
              </ul>
            </div>

            <Button onClick={handleClose} className="w-full h-12">
              Entendido
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
              <ArrowUpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle>Solicitar Retiro</SheetTitle>
              {step !== 'success' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Paso {step === 'amount' ? '1' : step === 'method' ? '2' : '3'} de 3
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          {step !== 'success' && (
            <div className="flex gap-2 mt-4">
              {['amount', 'method', 'confirmation'].map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    ['amount', 'method', 'confirmation'].indexOf(step) >= i
                      ? 'bg-[hsl(270,100%,60%)]'
                      : 'bg-[hsl(270,100%,60%,0.2)]'
                  )}
                />
              ))}
            </div>
          )}
        </SheetHeader>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
