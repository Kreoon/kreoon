import {
  Building2,
  Globe,
  CreditCard,
  Wallet,
  Smartphone,
  Bitcoin,
  Zap,
  Send,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { PaymentMethodDisplay } from '../../hooks/usePaymentMethods';
import type { PaymentMethodType, Currency } from '../../types';
import { formatCurrency } from '../../types';

const METHOD_ICONS: Record<PaymentMethodType, React.ComponentType<{ className?: string }>> = {
  bank_transfer_colombia: Building2,
  bank_transfer_international: Globe,
  paypal: CreditCard,
  payoneer: Wallet,
  nequi: Smartphone,
  daviplata: Smartphone,
  crypto: Bitcoin,
  zelle: Zap,
  wise: Send,
};

// Estimated processing times by method
const PROCESSING_TIMES: Record<PaymentMethodType, string> = {
  bank_transfer_colombia: '1-2 días hábiles',
  bank_transfer_international: '3-5 días hábiles',
  paypal: '1-2 días hábiles',
  payoneer: '1-3 días hábiles',
  nequi: 'Mismo día',
  daviplata: 'Mismo día',
  crypto: '1-24 horas',
  zelle: '1-2 días hábiles',
  wise: '1-3 días hábiles',
};

interface WithdrawalConfirmationProps {
  amount: number;
  fee: number;
  netAmount: number;
  currency: Currency;
  paymentMethod: PaymentMethodDisplay;
  className?: string;
}

export function WithdrawalConfirmation({
  amount,
  fee,
  netAmount,
  currency,
  paymentMethod,
  className,
}: WithdrawalConfirmationProps) {
  const Icon = METHOD_ICONS[paymentMethod.method_type];
  const processingTime = PROCESSING_TIMES[paymentMethod.method_type];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Amount breakdown */}
      <Card className="bg-[hsl(270,100%,60%,0.05)] border-[hsl(270,100%,60%,0.1)]">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center pb-4 border-b border-[hsl(270,100%,60%,0.1)]">
            <p className="text-sm text-[hsl(270,30%,60%)] mb-1">Monto a recibir</p>
            <p className="text-4xl font-bold text-emerald-400">
              {formatCurrency(netAmount, currency)}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[hsl(270,30%,60%)]">Monto solicitado</span>
              <span className="text-sm text-white">{formatCurrency(amount, currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[hsl(270,30%,60%)]">Comisión</span>
              <span className="text-sm text-amber-400">-{formatCurrency(fee, currency)}</span>
            </div>
            <div className="h-px bg-[hsl(270,100%,60%,0.1)]" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-white">Recibirás</span>
              <span className="text-lg font-bold text-emerald-400">
                {formatCurrency(netAmount, currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment method details */}
      <div className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.03)] border border-[hsl(270,100%,60%,0.1)]">
        <p className="text-xs text-[hsl(270,30%,60%)] mb-3">Destino del pago:</p>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(270,100%,60%,0.1)]">
            <Icon className="h-5 w-5 text-[hsl(270,100%,70%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white">{paymentMethod.label}</p>
            <p className="text-sm text-[hsl(270,30%,60%)] truncate">
              {paymentMethod.summary}
            </p>
            <p className="text-xs text-[hsl(270,30%,50%)]">
              {paymentMethod.typeLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Processing time */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(270,100%,60%,0.03)]">
        <Clock className="h-4 w-4 text-[hsl(270,100%,70%)]" />
        <div>
          <p className="text-sm text-white">Tiempo estimado</p>
          <p className="text-xs text-[hsl(270,30%,60%)]">{processingTime}</p>
        </div>
      </div>

      {/* Warning */}
      <Alert className="bg-amber-500/5 border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="text-xs text-[hsl(270,30%,70%)]">
          Una vez solicitado, el monto quedará en estado "Pendiente" hasta que
          nuestro equipo procese el pago. Puedes cancelar la solicitud mientras
          esté pendiente.
        </AlertDescription>
      </Alert>
    </div>
  );
}
