// Withdrawal Types - Sistema de retiros

import { Currency, formatCurrency } from './wallet.types';

export type WithdrawalStatus =
  | 'pending'      // Esperando revisión
  | 'processing'   // En proceso de pago
  | 'completed'    // Pagado
  | 'rejected'     // Rechazado
  | 'cancelled';   // Cancelado por el usuario

export type PaymentMethodType =
  | 'bank_transfer_colombia'
  | 'bank_transfer_international'
  | 'paypal'
  | 'payoneer'
  | 'nequi'
  | 'daviplata'
  | 'crypto'
  | 'zelle'
  | 'wise';

export interface BankTransferColombiaDetails {
  bank_name: string;
  account_type: 'ahorro' | 'corriente';
  account_number: string;
  document_type: 'CC' | 'NIT' | 'CE' | 'PP';
  document_number: string;
  holder_name: string;
}

export interface BankTransferInternationalDetails {
  bank_name: string;
  swift_code: string;
  iban?: string;
  account_number: string;
  routing_number?: string;
  holder_name: string;
  holder_address: string;
  country: string;
}

export interface PaypalDetails {
  email: string;
}

export interface PayoneerDetails {
  email: string;
}

export interface NequiDetails {
  phone_number: string;
}

export interface DaviplataDetails {
  phone_number: string;
}

export interface CryptoDetails {
  network: 'bitcoin' | 'ethereum' | 'usdt_trc20' | 'usdt_erc20' | 'usdc';
  wallet_address: string;
}

export interface ZelleDetails {
  email_or_phone: string;
  holder_name: string;
}

export interface WiseDetails {
  email: string;
  currency: string;
}

export type PaymentDetails =
  | BankTransferColombiaDetails
  | BankTransferInternationalDetails
  | PaypalDetails
  | PayoneerDetails
  | NequiDetails
  | DaviplataDetails
  | CryptoDetails
  | ZelleDetails
  | WiseDetails;

export interface WithdrawalRequest {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: Currency;
  payment_method: PaymentMethodType;
  payment_details: PaymentDetails;
  status: WithdrawalStatus;
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  payment_proof_url: string | null;
  external_reference: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

// Para mostrar en UI
export interface WithdrawalDisplay extends WithdrawalRequest {
  formattedAmount: string;
  formattedFee: string;
  formattedNetAmount: string;
  statusLabel: string;
  statusColor: string;
  statusIcon: string;
  methodLabel: string;
  methodIcon: string;
  formattedDate: string;
  formattedProcessedDate: string | null;
  paymentSummary: string; // Resumen del método (ej: "Bancolombia ***1234")
}

// Labels en español
export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
};

export const WITHDRAWAL_STATUS_COLORS: Record<WithdrawalStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  processing: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

export const WITHDRAWAL_STATUS_ICONS: Record<WithdrawalStatus, string> = {
  pending: 'Clock',
  processing: 'Loader2',
  completed: 'CheckCircle',
  rejected: 'XCircle',
  cancelled: 'Ban',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer_colombia: 'Transferencia Bancaria (Colombia)',
  bank_transfer_international: 'Transferencia Internacional',
  paypal: 'PayPal',
  payoneer: 'Payoneer',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  crypto: 'Criptomoneda',
  zelle: 'Zelle',
  wise: 'Wise',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethodType, string> = {
  bank_transfer_colombia: 'Building2',
  bank_transfer_international: 'Globe',
  paypal: 'CreditCard',
  payoneer: 'Wallet',
  nequi: 'Smartphone',
  daviplata: 'Smartphone',
  crypto: 'Bitcoin',
  zelle: 'Zap',
  wise: 'Send',
};

// Tarifas de retiro por método
export const WITHDRAWAL_FEES: Record<PaymentMethodType, { fixed: number; percentage: number; min: number }> = {
  bank_transfer_colombia: { fixed: 0, percentage: 0, min: 50000 }, // COP
  bank_transfer_international: { fixed: 25, percentage: 0, min: 100 }, // USD
  paypal: { fixed: 0, percentage: 2.5, min: 10 },
  payoneer: { fixed: 3, percentage: 0, min: 50 },
  nequi: { fixed: 0, percentage: 0, min: 10000 }, // COP
  daviplata: { fixed: 0, percentage: 0, min: 10000 }, // COP
  crypto: { fixed: 5, percentage: 0, min: 50 },
  zelle: { fixed: 0, percentage: 0, min: 10 },
  wise: { fixed: 1, percentage: 0.5, min: 20 },
};

// Generar resumen del método de pago
export function getPaymentSummary(method: PaymentMethodType, details: PaymentDetails): string {
  switch (method) {
    case 'bank_transfer_colombia': {
      const d = details as BankTransferColombiaDetails;
      const lastDigits = d.account_number.slice(-4);
      return `${d.bank_name} ***${lastDigits}`;
    }
    case 'bank_transfer_international': {
      const d = details as BankTransferInternationalDetails;
      return `${d.bank_name} - ${d.country}`;
    }
    case 'paypal':
    case 'payoneer': {
      const d = details as PaypalDetails;
      return d.email;
    }
    case 'nequi':
    case 'daviplata': {
      const d = details as NequiDetails;
      return `***${d.phone_number.slice(-4)}`;
    }
    case 'crypto': {
      const d = details as CryptoDetails;
      return `${d.network.toUpperCase()} - ${d.wallet_address.slice(0, 6)}...${d.wallet_address.slice(-4)}`;
    }
    case 'zelle': {
      const d = details as ZelleDetails;
      return d.email_or_phone;
    }
    case 'wise': {
      const d = details as WiseDetails;
      return `${d.email} (${d.currency})`;
    }
    default:
      return 'N/A';
  }
}

// Calcular tarifa de retiro
export function calculateWithdrawalFee(method: PaymentMethodType, amount: number): number {
  const fee = WITHDRAWAL_FEES[method];
  return fee.fixed + (amount * fee.percentage / 100);
}

export function toWithdrawalDisplay(withdrawal: WithdrawalRequest): WithdrawalDisplay {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    ...withdrawal,
    formattedAmount: formatCurrency(withdrawal.amount, withdrawal.currency),
    formattedFee: formatCurrency(withdrawal.fee, withdrawal.currency),
    formattedNetAmount: formatCurrency(withdrawal.net_amount, withdrawal.currency),
    statusLabel: WITHDRAWAL_STATUS_LABELS[withdrawal.status],
    statusColor: WITHDRAWAL_STATUS_COLORS[withdrawal.status],
    statusIcon: WITHDRAWAL_STATUS_ICONS[withdrawal.status],
    methodLabel: PAYMENT_METHOD_LABELS[withdrawal.payment_method],
    methodIcon: PAYMENT_METHOD_ICONS[withdrawal.payment_method],
    formattedDate: formatDate(withdrawal.created_at),
    formattedProcessedDate: withdrawal.processed_at ? formatDate(withdrawal.processed_at) : null,
    paymentSummary: getPaymentSummary(withdrawal.payment_method, withdrawal.payment_details),
  };
}

// Input para crear solicitud de retiro
export interface CreateWithdrawalInput {
  wallet_id: string;
  amount: number;
  payment_method: PaymentMethodType;
  payment_details: PaymentDetails;
}

// Input para procesar retiro (admin)
export interface ProcessWithdrawalInput {
  withdrawal_id: string;
  status: 'completed' | 'rejected';
  external_reference?: string;
  payment_proof_url?: string;
  rejection_reason?: string;
}
