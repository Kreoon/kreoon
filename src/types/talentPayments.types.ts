export type PaymentAccountType =
  | 'nequi'
  | 'daviplata'
  | 'bancolombia'
  | 'otros_banco'
  | 'paypal'
  | 'transferencia_internacional'
  | 'efectivo';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'cancelled';

export interface TalentPaymentAccount {
  id: string;
  organization_id: string;
  user_id: string;
  account_type: PaymentAccountType;
  label: string | null;
  account_number: string | null;
  bank_name: string | null;
  account_holder: string | null;
  document_id: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TalentPayment {
  id: string;
  organization_id: string;
  user_id: string;
  payment_account_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  content_ids: string[] | null;
  receipt_url: string | null;
  payment_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  payment_account?: TalentPaymentAccount;
}

export interface PaymentSummary {
  total_paid: number;
  total_pending: number;
  total_processing: number;
  payment_count: number;
}

export const PAYMENT_ACCOUNT_LABELS: Record<PaymentAccountType, string> = {
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
  otros_banco: 'Otro banco',
  paypal: 'PayPal',
  transferencia_internacional: 'Transferencia internacional',
  efectivo: 'Efectivo',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};
