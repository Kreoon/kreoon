// Wallet Types - Sistema de billeteras de Kreoon

export type WalletType =
  | 'creator'      // Creadores individuales
  | 'editor'       // Editores
  | 'brand'        // Marcas
  | 'agency'       // Agencias (wallet principal)
  | 'agency_pool'  // Pool de agencia para pagar a su equipo
  | 'platform';    // Wallet de la plataforma para fees

export type WalletStatus = 'active' | 'frozen' | 'suspended';

export type Currency = 'USD' | 'COP' | 'EUR' | 'MXN';

export interface WalletSettings {
  auto_withdraw_threshold: number | null;
  preferred_payment_method: string | null;
  notifications: boolean;
}

export interface Wallet {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  wallet_type: WalletType;
  available_balance: number;
  pending_balance: number;
  reserved_balance: number;
  currency: Currency;
  status: WalletStatus;
  settings: WalletSettings;
  stripe_customer_id?: string;
  stripe_connect_account_id?: string;
  stripe_connect_status?: 'not_connected' | 'pending' | 'active' | 'restricted';
  created_at: string;
  updated_at: string;
}

// Balance total calculado
export interface WalletBalance {
  available: number;
  pending: number;
  reserved: number;
  total: number;
  currency: Currency;
}

// Para mostrar en UI con formato
export interface WalletDisplay extends Wallet {
  balance: WalletBalance;
  formattedAvailable: string;
  formattedPending: string;
  formattedReserved: string;
  formattedTotal: string;
  ownerName?: string;
  ownerType: 'user' | 'organization';
}

// Wallet type labels en español
export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  creator: 'Creador',
  editor: 'Editor',
  brand: 'Marca',
  agency: 'Agencia',
  agency_pool: 'Pool de Agencia',
  platform: 'Plataforma',
};

export const WALLET_STATUS_LABELS: Record<WalletStatus, string> = {
  active: 'Activo',
  frozen: 'Congelado',
  suspended: 'Suspendido',
};

export const WALLET_STATUS_COLORS: Record<WalletStatus, string> = {
  active: 'bg-success/10 text-success',
  frozen: 'bg-warning/10 text-warning',
  suspended: 'bg-destructive/10 text-destructive',
};

// Helper para formatear moneda
export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const formatters: Record<Currency, Intl.NumberFormat> = {
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    COP: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
    EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
    MXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }),
  };
  return formatters[currency].format(amount);
}

// Calcular balance total
export function calculateTotalBalance(wallet: Wallet): number {
  return wallet.available_balance + wallet.pending_balance + wallet.reserved_balance;
}

// Convertir Wallet a WalletDisplay
export function toWalletDisplay(wallet: Wallet, ownerName?: string): WalletDisplay {
  const total = calculateTotalBalance(wallet);
  return {
    ...wallet,
    balance: {
      available: wallet.available_balance,
      pending: wallet.pending_balance,
      reserved: wallet.reserved_balance,
      total,
      currency: wallet.currency,
    },
    formattedAvailable: formatCurrency(wallet.available_balance, wallet.currency),
    formattedPending: formatCurrency(wallet.pending_balance, wallet.currency),
    formattedReserved: formatCurrency(wallet.reserved_balance, wallet.currency),
    formattedTotal: formatCurrency(total, wallet.currency),
    ownerName,
    ownerType: wallet.user_id ? 'user' : 'organization',
  };
}
