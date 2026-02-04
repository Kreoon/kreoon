// Transaction Types - Historial de transacciones

import { Currency, formatCurrency } from './wallet.types';

export type TransactionType =
  | 'deposit'           // Depósito externo
  | 'withdrawal'        // Retiro
  | 'transfer_in'       // Transferencia recibida
  | 'transfer_out'      // Transferencia enviada
  | 'escrow_hold'       // Fondos congelados para campaña
  | 'escrow_release'    // Liberación de escrow (aprobación)
  | 'escrow_refund'     // Devolución de escrow (rechazo/cancelación)
  | 'payment_received'  // Pago recibido por trabajo
  | 'platform_fee'      // Comisión de plataforma
  | 'adjustment';       // Ajuste manual por admin

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';

export type ReferenceType = 'campaign' | 'content' | 'transfer' | 'withdrawal' | 'escrow';

export interface TransactionMetadata {
  [key: string]: unknown;
  content_title?: string;
  campaign_name?: string;
  payment_method?: string;
  admin_note?: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_type: TransactionType;
  amount: number;
  fee: number;
  net_amount: number;
  balance_after: number;
  reference_type: ReferenceType | null;
  reference_id: string | null;
  counterpart_wallet_id: string | null;
  counterpart_transaction_id: string | null;
  description: string | null;
  metadata: TransactionMetadata;
  status: TransactionStatus;
  created_at: string;
  processed_at: string | null;
}

// Para mostrar en UI
export interface TransactionDisplay extends WalletTransaction {
  formattedAmount: string;
  formattedFee: string;
  formattedNetAmount: string;
  formattedBalanceAfter: string;
  isCredit: boolean;
  typeLabel: string;
  typeIcon: string;
  statusLabel: string;
  statusColor: string;
  formattedDate: string;
  currency: Currency;
}

// Labels en español
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Depósito',
  withdrawal: 'Retiro',
  transfer_in: 'Transferencia Recibida',
  transfer_out: 'Transferencia Enviada',
  escrow_hold: 'Reserva de Escrow',
  escrow_release: 'Liberación de Escrow',
  escrow_refund: 'Reembolso de Escrow',
  payment_received: 'Pago Recibido',
  platform_fee: 'Comisión de Plataforma',
  adjustment: 'Ajuste',
};

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  deposit: 'ArrowDownCircle',
  withdrawal: 'ArrowUpCircle',
  transfer_in: 'ArrowLeftCircle',
  transfer_out: 'ArrowRightCircle',
  escrow_hold: 'Lock',
  escrow_release: 'Unlock',
  escrow_refund: 'RefreshCw',
  payment_received: 'DollarSign',
  platform_fee: 'Percent',
  adjustment: 'Wrench',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  reversed: 'Reversada',
};

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  reversed: 'bg-orange-500/10 text-orange-500',
};

// Tipos que suman al balance (créditos)
export const CREDIT_TYPES: TransactionType[] = [
  'deposit',
  'transfer_in',
  'escrow_release',
  'escrow_refund',
  'payment_received',
];

// Tipos que restan del balance (débitos)
export const DEBIT_TYPES: TransactionType[] = [
  'withdrawal',
  'transfer_out',
  'escrow_hold',
  'platform_fee',
];

export function isCredit(type: TransactionType): boolean {
  return CREDIT_TYPES.includes(type);
}

export function toTransactionDisplay(
  transaction: WalletTransaction,
  currency: Currency = 'USD'
): TransactionDisplay {
  const isCreditType = isCredit(transaction.transaction_type);

  return {
    ...transaction,
    formattedAmount: formatCurrency(transaction.amount, currency),
    formattedFee: formatCurrency(transaction.fee, currency),
    formattedNetAmount: formatCurrency(transaction.net_amount, currency),
    formattedBalanceAfter: formatCurrency(transaction.balance_after, currency),
    isCredit: isCreditType,
    typeLabel: TRANSACTION_TYPE_LABELS[transaction.transaction_type],
    typeIcon: TRANSACTION_TYPE_ICONS[transaction.transaction_type],
    statusLabel: TRANSACTION_STATUS_LABELS[transaction.status],
    statusColor: TRANSACTION_STATUS_COLORS[transaction.status],
    formattedDate: new Date(transaction.created_at).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    currency,
  };
}

// Filtros para historial de transacciones
export interface TransactionFilters {
  types?: TransactionType[];
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  referenceType?: ReferenceType;
}
