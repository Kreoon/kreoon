import { motion } from 'framer-motion';
import {
  Wallet,
  FileText,
  ArrowUpCircle,
  Lock,
  AlertCircle,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  onAction?: () => void;
}

// No Wallet State
export function NoWalletState({ className, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[hsl(270,100%,60%,0.2)] rounded-full blur-xl" />
        <div className="relative p-4 rounded-full bg-[hsl(270,100%,60%,0.1)] border border-[hsl(270,100%,60%,0.2)]">
          <Wallet className="h-12 w-12 text-[hsl(270,100%,70%)]" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Tu billetera está siendo creada
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs mb-6">
        Estamos configurando tu billetera. Esto solo toma un momento.
      </p>
      {onAction && (
        <Button
          variant="outline"
          onClick={onAction}
          className="border-[hsl(270,100%,60%,0.3)]"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      )}
    </motion.div>
  );
}

// No Transactions State
export function NoTransactionsState({ className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="p-4 rounded-full bg-[hsl(270,100%,60%,0.1)] border border-[hsl(270,100%,60%,0.1)] mb-4">
        <FileText className="h-10 w-10 text-[hsl(270,100%,70%,0.5)]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Sin movimientos todavía
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs">
        Cuando realices transacciones, aparecerán aquí para que puedas
        llevar un control de tu actividad.
      </p>
    </motion.div>
  );
}

// No Withdrawals State
export function NoWithdrawalsState({ className, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="p-4 rounded-full bg-[hsl(270,100%,60%,0.1)] border border-[hsl(270,100%,60%,0.1)] mb-4">
        <ArrowUpCircle className="h-10 w-10 text-[hsl(270,100%,70%,0.5)]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Sin solicitudes de retiro
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs mb-6">
        Aún no has solicitado ningún retiro. Cuando tengas fondos disponibles,
        podrás retirarlos a tu cuenta bancaria o método de pago preferido.
      </p>
      {onAction && (
        <Button onClick={onAction}>
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Solicitar Retiro
        </Button>
      )}
    </motion.div>
  );
}

// No Escrows State
export function NoEscrowsState({ className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="p-4 rounded-full bg-[hsl(270,100%,60%,0.1)] border border-[hsl(270,100%,60%,0.1)] mb-4">
        <Lock className="h-10 w-10 text-[hsl(270,100%,70%,0.5)]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Sin escrows activos
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs">
        Los escrows se crean automáticamente cuando se asignan campañas o
        contenido. Protegen los pagos hasta que el trabajo sea aprobado.
      </p>
    </motion.div>
  );
}

// No Payment Methods State
export function NoPaymentMethodsState({ className, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="p-4 rounded-full bg-[hsl(270,100%,60%,0.1)] border border-[hsl(270,100%,60%,0.1)] mb-4">
        <CreditCard className="h-10 w-10 text-[hsl(270,100%,70%,0.5)]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Sin métodos de pago
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs mb-6">
        Agrega un método de pago para poder retirar tus fondos de forma rápida
        y segura.
      </p>
      {onAction && (
        <Button onClick={onAction}>
          <CreditCard className="h-4 w-4 mr-2" />
          Agregar Método de Pago
        </Button>
      )}
    </motion.div>
  );
}

// Error State
export function WalletErrorState({
  className,
  onAction,
  message = 'No pudimos cargar la información',
}: EmptyStateProps & { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Algo salió mal
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs mb-6">{message}</p>
      {onAction && (
        <Button
          variant="outline"
          onClick={onAction}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      )}
    </motion.div>
  );
}

// Insufficient Balance State
export function InsufficientBalanceState({
  className,
  requiredAmount,
  availableAmount,
}: EmptyStateProps & { requiredAmount?: string; availableAmount?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        className
      )}
    >
      <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
        <Wallet className="h-8 w-8 text-amber-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">
        Fondos insuficientes
      </h3>
      <p className="text-sm text-[hsl(270,30%,60%)] max-w-xs">
        {requiredAmount && availableAmount ? (
          <>
            Necesitas <span className="text-white font-medium">{requiredAmount}</span>{' '}
            pero solo tienes{' '}
            <span className="text-white font-medium">{availableAmount}</span> disponibles.
          </>
        ) : (
          'No tienes suficiente balance disponible para esta operación.'
        )}
      </p>
    </motion.div>
  );
}
