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

export interface EscrowHold {
  id: string;
  campaign_id: string | null;
  content_id: string | null;
  organization_id: string;
  payer_wallet_id: string;
  creator_wallet_id: string | null;
  editor_wallet_id: string | null;
  total_amount: number;
  creator_amount: number | null;
  editor_amount: number | null;
  platform_fee: number | null;
  creator_percentage: number | null;
  editor_percentage: number | null;
  platform_percentage: number;
  status: EscrowStatus;
  created_at: string;
  updated_at: string;
  editor_assigned_at: string | null;
  content_delivered_at: string | null;
  released_at: string | null;
  notes: string | null;
  metadata: EscrowMetadata;
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
      return escrow.creator_wallet_id ? 25 : 15;
    case 'pending_editor':
      return 40;
    case 'pending_approval':
      return 75;
    case 'partially_released':
      return 90;
    case 'released':
      return 100;
    case 'disputed':
      return 75; // Se queda donde estaba cuando inició disputa
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

  // Paso 2: Creador asignado
  const creatorAssigned = escrow.creator_wallet_id !== null;
  steps.push({
    key: 'creator_assigned',
    label: 'Creador Asignado',
    description: creatorAssigned ? 'Creador trabajando' : 'Esperando asignación',
    timestamp: creatorAssigned ? escrow.created_at : null, // No tenemos timestamp específico
    status: creatorAssigned ? 'completed' :
            escrow.status === 'active' ? 'current' : 'pending',
    icon: 'User',
  });

  // Paso 3: Editor asignado (si aplica)
  if (escrow.editor_percentage && escrow.editor_percentage > 0) {
    const editorAssigned = escrow.editor_wallet_id !== null;
    steps.push({
      key: 'editor_assigned',
      label: 'Editor Asignado',
      description: editorAssigned ? 'Editando contenido' : 'Esperando asignación',
      timestamp: escrow.editor_assigned_at,
      status: editorAssigned ? 'completed' :
              escrow.status === 'pending_editor' ? 'current' :
              escrow.status === 'active' ? 'pending' : 'pending',
      icon: 'Edit',
    });
  }

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

// Para crear un nuevo escrow
export interface CreateEscrowInput {
  organization_id: string;
  payer_wallet_id: string;
  content_id?: string;
  campaign_id?: string;
  total_amount: number;
  creator_percentage?: number;
  editor_percentage?: number;
  platform_percentage?: number;
}

// Para asignar editor a escrow
export interface AssignEditorInput {
  escrow_id: string;
  editor_wallet_id: string;
}
