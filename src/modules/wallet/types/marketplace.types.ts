// Marketplace Types - Contratación directa usuario ↔ creador/editor

export type MarketplaceProviderType = 'creator' | 'editor';

export type MarketplaceContractStatus =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'delivered'
  | 'revision'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'refunded';

export type DeliverableStatus = 'pending' | 'delivered' | 'approved' | 'rejected';

// Contrato de marketplace
export interface MarketplaceContract {
  id: string;
  client_user_id: string;
  provider_user_id: string;
  provider_type: MarketplaceProviderType;
  title: string;
  description: string | null;
  deliverables: ContractDeliverableInput[];
  total_amount: number;
  currency: string;
  platform_fee_percentage: number;
  platform_fee_amount: number;
  provider_amount: number;
  status: MarketplaceContractStatus;
  escrow_id: string | null;
  deadline: string | null;
  max_revisions: number;
  revisions_used: number;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  client_rating: number | null;
  client_review: string | null;
  provider_rating: number | null;
  provider_review: string | null;
}

// Input para crear deliverable
export interface ContractDeliverableInput {
  title: string;
  description?: string;
}

// Deliverable del contrato
export interface MarketplaceContractDeliverable {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  files: DeliverableFile[];
  status: DeliverableStatus;
  delivered_at: string | null;
  reviewed_at: string | null;
  feedback: string | null;
  created_at: string;
}

export interface DeliverableFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

// Mensaje del contrato
export interface MarketplaceContractMessage {
  id: string;
  contract_id: string;
  sender_id: string;
  message: string;
  attachments: DeliverableFile[];
  created_at: string;
}

// Display types con relaciones
export interface MarketplaceContractDisplay extends MarketplaceContract {
  client?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
  provider?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    rating?: number;
    total_contracts?: number;
  };
  escrow?: {
    id: string;
    status: string;
  };
  deliverables_list?: MarketplaceContractDeliverable[];
  formattedAmount: string;
  formattedProviderAmount: string;
  formattedFee: string;
  statusLabel: string;
  statusColor: string;
  statusIcon: string;
  progressPercentage: number;
}

// Input para crear contrato
export interface CreateContractInput {
  providerUserId: string;
  providerType: MarketplaceProviderType;
  title: string;
  description?: string;
  deliverables: ContractDeliverableInput[];
  totalAmount: number;
  currency?: string;
  deadline?: string;
  maxRevisions?: number;
}

// Input para enviar entrega
export interface SubmitDeliveryInput {
  contractId: string;
  deliverableId: string;
  files: DeliverableFile[];
  message?: string;
}

// Input para solicitar revisión
export interface RequestRevisionInput {
  contractId: string;
  deliverableId: string;
  feedback: string;
}

// Labels
export const CONTRACT_STATUS_LABELS: Record<MarketplaceContractStatus, string> = {
  draft: 'Borrador',
  pending_payment: 'Pendiente de Pago',
  active: 'En Progreso',
  delivered: 'Entregado',
  revision: 'En Revisión',
  completed: 'Completado',
  disputed: 'En Disputa',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

export const CONTRACT_STATUS_COLORS: Record<MarketplaceContractStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400',
  pending_payment: 'bg-amber-500/10 text-amber-500',
  active: 'bg-blue-500/10 text-blue-500',
  delivered: 'bg-purple-500/10 text-purple-500',
  revision: 'bg-orange-500/10 text-orange-500',
  completed: 'bg-emerald-500/10 text-emerald-500',
  disputed: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
  refunded: 'bg-pink-500/10 text-pink-500',
};

export const CONTRACT_STATUS_ICONS: Record<MarketplaceContractStatus, string> = {
  draft: 'FileEdit',
  pending_payment: 'CreditCard',
  active: 'Play',
  delivered: 'Package',
  revision: 'RefreshCw',
  completed: 'CheckCircle',
  disputed: 'AlertTriangle',
  cancelled: 'XCircle',
  refunded: 'RotateCcw',
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending: 'Pendiente',
  delivered: 'Entregado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  pending: 'bg-gray-500/10 text-gray-400',
  delivered: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
};

import { COMMISSION_RATES } from '@/lib/finance/constants';

// Platform fee — from single source of truth
export const MARKETPLACE_PLATFORM_FEE_PERCENTAGE = COMMISSION_RATES.marketplace_direct.base;

// Calcular fee y montos
export function calculateMarketplaceFee(totalAmount: number): {
  totalAmount: number;
  platformFee: number;
  providerAmount: number;
  feePercentage: number;
} {
  const platformFee = Math.round(totalAmount * (MARKETPLACE_PLATFORM_FEE_PERCENTAGE / 100) * 100) / 100;
  const providerAmount = Math.round((totalAmount - platformFee) * 100) / 100;

  return {
    totalAmount,
    platformFee,
    providerAmount,
    feePercentage: MARKETPLACE_PLATFORM_FEE_PERCENTAGE,
  };
}

// Calcular progreso del contrato
export function calculateContractProgress(contract: MarketplaceContract): number {
  switch (contract.status) {
    case 'draft': return 0;
    case 'pending_payment': return 10;
    case 'active': return 30;
    case 'delivered': return 70;
    case 'revision': return 50;
    case 'completed': return 100;
    case 'disputed': return 50;
    case 'cancelled': return 0;
    case 'refunded': return 0;
    default: return 0;
  }
}
