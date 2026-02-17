// Escrow Types - Sistema de Escrow para campañas

import { Currency, formatCurrency } from './wallet.types';

export type EscrowStatus =
  | 'active'            // Fondos congelados
  | 'pending_editor'    // Esperando asignación de editor
  | 'pending_approval'  // Contenido entregado, esperando aprobación
  | 'released'          // Liberado (aprobado)
  | 'partially_released' // Liberación parcial
  | 'refunded'          // Devuelto al pagador
  | 'disputed'          // En disputa
  | 'cancelled';        // Cancelado

export interface EscrowMetadata {
  [key: string]: unknown;
  content_title?: string;
  campaign_name?: string;
  creator_name?: string;
  editor_name?: string;
  dispute_reason?: string;
}

export type EscrowProjectType = 'marketplace_direct' | 'campaign_managed' | 'live_shopping' | 'professional_service' | 'corporate_package';

export interface EscrowDistribution {
  user_id: string;
  role: 'creator' | 'editor' | 'organization';
  percentage: number;
  wallet_id?: string;
  amount?: number;
}

export interface EscrowMilestone {
  id: string;
  title: string;
  percentage: number;
  due_date?: string;
  completed_at?: string;
  status: 'pending' | 'completed';
}

export interface EscrowHold {
  id: string;
  project_id: string | null;
  project_type: EscrowProjectType;
  organization_id: string;
  client_wallet_id: string;
  total_amount: number;
  currency: string;
  distributions: EscrowDistribution[];
  milestones: EscrowMilestone[];
  platform_fee: number | null;
  platform_percentage: number;
  status: EscrowStatus;
  created_at: string;
  updated_at: string;
  funded_at: string | null;
  content_delivered_at: string | null;
  released_at: string | null;
  notes: string | null;
  metadata: EscrowMetadata;
  stripe_payment_intent_id: string | null;
  // Legacy compat (may be null in new schema)
  creator_amount: number | null;
  editor_amount: number | null;
  creator_percentage: number | null;
  editor_percentage: number | null;
}

// Para mostrar en UI con información adicional
export interface EscrowDisplay extends EscrowHold {
  formattedTotal: string;
  formattedCreatorAmount: string;
  formattedEditorAmount: string;
  formattedPlatformFee: string;
  statusLabel: string;
  statusColor: string;
  statusIcon: string;
  progress: number; // 0-100
  timelineSteps: EscrowTimelineStep[];
  currency: Currency;
}

export interface EscrowTimelineStep {
  key: string;
  label: string;
  description?: string;
  timestamp: string | null;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  icon: string;
}

// Labels en español
export const ESCROW_STATUS_LABELS: Record<EscrowStatus, string> = {
  active: 'Activo',
  pending_editor: 'Esperando Editor',
  pending_approval: 'Pendiente Aprobación',
  released: 'Liberado',
  partially_released: 'Liberación Parcial',
  refunded: 'Reembolsado',
  disputed: 'En Disputa',
  cancelled: 'Cancelado',
};

export const ESCROW_STATUS_COLORS: Record<EscrowStatus, string> = {
  active: 'bg-info/10 text-info',
  pending_editor: 'bg-purple-500/10 text-purple-500',
  pending_approval: 'bg-warning/10 text-warning',
  released: 'bg-success/10 text-success',
  partially_released: 'bg-emerald-500/10 text-emerald-500',
  refunded: 'bg-orange-500/10 text-orange-500',
  disputed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

export const ESCROW_STATUS_ICONS: Record<EscrowStatus, string> = {
  active: 'Lock',
  pending_editor: 'UserPlus',
  pending_approval: 'Clock',
  released: 'CheckCircle',
  partially_released: 'CircleDot',
  refunded: 'RefreshCw',
  disputed: 'AlertTriangle',
  cancelled: 'XCircle',
};

// Calcular progreso del escrow (0-100)
export function calculateEscrowProgress(escrow: EscrowHold): number {
  switch (escrow.status) {
    case 'cancelled':
    case 'refunded':
      return 0;
    case 'active':
      return escrow.funded_at ? 25 : 15;
    case 'pending_editor':
      return 40;
    case 'pending_approval':
      return 75;
    case 'partially_released':
      return 90;
    case 'released':
      return 100;
    case 'disputed':
      return 75;
    default:
      return 0;
  }
}

// Generar timeline del escrow
export function generateEscrowTimeline(escrow: EscrowHold): EscrowTimelineStep[] {
  const steps: EscrowTimelineStep[] = [];

  // Paso 1: Escrow creado
  steps.push({
    key: 'created',
    label: 'Escrow Creado',
    description: 'Fondos reservados',
    timestamp: escrow.created_at,
    status: 'completed',
    icon: 'Lock',
  });

  // Paso 2: Fondos depositados
  const isFunded = escrow.funded_at !== null;
  steps.push({
    key: 'funded',
    label: 'Fondos Depositados',
    description: isFunded ? 'Pago confirmado' : 'Esperando pago',
    timestamp: escrow.funded_at,
    status: isFunded ? 'completed' :
            escrow.status === 'active' ? 'current' : 'pending',
    icon: 'CreditCard',
  });

  // Paso 4: Contenido entregado
  const contentDelivered = escrow.content_delivered_at !== null;
  steps.push({
    key: 'content_delivered',
    label: 'Contenido Entregado',
    description: contentDelivered ? 'Esperando aprobación' : 'Pendiente entrega',
    timestamp: escrow.content_delivered_at,
    status: contentDelivered ? 'completed' :
            escrow.status === 'pending_approval' ? 'current' : 'pending',
    icon: 'Upload',
  });

  // Paso 5: Liberación
  const isReleased = ['released', 'partially_released'].includes(escrow.status);
  const isRefunded = escrow.status === 'refunded';
  const isCancelled = escrow.status === 'cancelled';
  const isDisputed = escrow.status === 'disputed';

  if (isDisputed) {
    steps.push({
      key: 'disputed',
      label: 'En Disputa',
      description: 'Requiere resolución',
      timestamp: escrow.updated_at,
      status: 'current',
      icon: 'AlertTriangle',
    });
  } else if (isCancelled || isRefunded) {
    steps.push({
      key: 'refunded',
      label: isRefunded ? 'Reembolsado' : 'Cancelado',
      description: 'Fondos devueltos',
      timestamp: escrow.updated_at,
      status: 'completed',
      icon: 'RefreshCw',
    });
  } else {
    steps.push({
      key: 'released',
      label: 'Pagos Liberados',
      description: isReleased ? 'Transferencias completadas' : 'Pendiente liberación',
      timestamp: escrow.released_at,
      status: isReleased ? 'completed' : 'pending',
      icon: 'CheckCircle',
    });
  }

  return steps;
}

export function toEscrowDisplay(escrow: EscrowHold, currency: Currency = 'USD'): EscrowDisplay {
  return {
    ...escrow,
    formattedTotal: formatCurrency(escrow.total_amount, currency),
    formattedCreatorAmount: escrow.creator_amount ? formatCurrency(escrow.creator_amount, currency) : '-',
    formattedEditorAmount: escrow.editor_amount ? formatCurrency(escrow.editor_amount, currency) : '-',
    formattedPlatformFee: escrow.platform_fee ? formatCurrency(escrow.platform_fee, currency) : '-',
    statusLabel: ESCROW_STATUS_LABELS[escrow.status],
    statusColor: ESCROW_STATUS_COLORS[escrow.status],
    statusIcon: ESCROW_STATUS_ICONS[escrow.status],
    progress: calculateEscrowProgress(escrow),
    timelineSteps: generateEscrowTimeline(escrow),
    currency,
  };
}

// Para crear un nuevo escrow (matches escrow-service edge function API)
export interface CreateEscrowInput {
  project_type: EscrowProjectType;
  project_id?: string;
  project_title: string;
  total_amount: number;
  currency?: string;
  distributions: {
    user_id: string;
    role: 'creator' | 'editor' | 'organization';
    percentage: number;
  }[];
  milestones?: {
    title: string;
    percentage: number;
    due_date?: string;
  }[];
  referral_code?: string;
}
