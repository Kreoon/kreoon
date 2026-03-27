/**
 * Board Fields Configuration
 * Unified field definitions for Kanban, List, Calendar, and Table views
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Content } from '@/types/database';

export type BoardViewType = 'kanban' | 'list' | 'calendar' | 'table';

export interface FieldConfig {
  key: string;
  label: string;
  shortLabel?: string;
  sortable: boolean;
  defaultVisible: Record<BoardViewType, boolean>;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  renderType: 'text' | 'badge' | 'avatar' | 'date' | 'progress' | 'indicator' | 'thumbnail';
}

// All available fields for board views
export const BOARD_FIELDS: Record<string, FieldConfig> = {
  title: {
    key: 'title',
    label: 'Título',
    shortLabel: 'Título',
    sortable: true,
    defaultVisible: { kanban: true, list: true, calendar: true, table: true },
    minWidth: 200,
    align: 'left',
    renderType: 'text',
  },
  thumbnail: {
    key: 'thumbnail_url',
    label: 'Miniatura',
    shortLabel: 'Thumb',
    sortable: false,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 80,
    maxWidth: 120,
    align: 'center',
    renderType: 'thumbnail',
  },
  status: {
    key: 'status',
    label: 'Estado',
    shortLabel: 'Estado',
    sortable: true,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 100,
    align: 'left',
    renderType: 'badge',
  },
  client: {
    key: 'client',
    label: 'Cliente',
    shortLabel: 'Cliente',
    sortable: true,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 120,
    align: 'left',
    renderType: 'text',
  },
  creator: {
    key: 'creator_id',
    label: 'Creador',
    shortLabel: 'Creador',
    sortable: true,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 120,
    align: 'left',
    renderType: 'avatar',
  },
  editor: {
    key: 'editor_id',
    label: 'Editor',
    shortLabel: 'Editor',
    sortable: true,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 120,
    align: 'left',
    renderType: 'avatar',
  },
  responsible: {
    key: 'responsible',
    label: 'Responsable',
    shortLabel: 'Resp.',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: true, table: false },
    minWidth: 120,
    align: 'left',
    renderType: 'avatar',
  },
  deadline: {
    key: 'deadline',
    label: 'Fecha límite',
    shortLabel: 'Deadline',
    sortable: true,
    defaultVisible: { kanban: true, list: true, calendar: true, table: true },
    minWidth: 100,
    align: 'left',
    renderType: 'date',
  },
  created_at: {
    key: 'created_at',
    label: 'Creado',
    shortLabel: 'Creado',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: true },
    minWidth: 100,
    align: 'left',
    renderType: 'date',
  },
  progress: {
    key: 'progress',
    label: 'Progreso',
    shortLabel: 'Prog.',
    sortable: false,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 80,
    maxWidth: 120,
    align: 'center',
    renderType: 'progress',
  },
  sphere_phase: {
    key: 'sphere_phase',
    label: 'Fase Esfera',
    shortLabel: 'Fase',
    sortable: true,
    defaultVisible: { kanban: true, list: false, calendar: false, table: true },
    minWidth: 100,
    align: 'left',
    renderType: 'badge',
  },
  campaign_week: {
    key: 'campaign_week',
    label: 'Semana Campaña',
    shortLabel: 'Semana',
    sortable: true,
    defaultVisible: { kanban: true, list: false, calendar: false, table: true },
    minWidth: 80,
    align: 'center',
    renderType: 'badge',
  },
  marketing_status: {
    key: 'marketing_approved_at',
    label: 'Estado MKT',
    shortLabel: 'MKT',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: true },
    minWidth: 100,
    align: 'center',
    renderType: 'badge',
  },
  points: {
    key: 'points',
    label: 'Puntos',
    shortLabel: 'Pts',
    sortable: false,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 60,
    align: 'center',
    renderType: 'text',
  },
  indicators: {
    key: 'indicators',
    label: 'Indicadores',
    shortLabel: 'Ind.',
    sortable: false,
    defaultVisible: { kanban: true, list: true, calendar: false, table: true },
    minWidth: 80,
    align: 'center',
    renderType: 'indicator',
  },
  video: {
    key: 'video_url',
    label: 'Video',
    shortLabel: 'Video',
    sortable: false,
    defaultVisible: { kanban: true, list: false, calendar: false, table: false },
    minWidth: 60,
    align: 'center',
    renderType: 'indicator',
  },
  tags: {
    key: 'tags',
    label: 'Etiquetas',
    shortLabel: 'Tags',
    sortable: false,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 120,
    align: 'left',
    renderType: 'badge',
  },
  // === Nuevos campos de proyecto ===
  start_date: {
    key: 'start_date',
    label: 'Fecha Inicio',
    shortLabel: 'Inicio',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 100,
    align: 'left',
    renderType: 'date',
  },
  creator_payment: {
    key: 'creator_payment',
    label: 'Pago Creador',
    shortLabel: 'Pago C',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 100,
    align: 'right',
    renderType: 'text',
  },
  editor_payment: {
    key: 'editor_payment',
    label: 'Pago Editor',
    shortLabel: 'Pago E',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 100,
    align: 'right',
    renderType: 'text',
  },
  payment_status: {
    key: 'payment_status',
    label: 'Estado Pago',
    shortLabel: 'Pago',
    sortable: false,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 80,
    align: 'center',
    renderType: 'indicator',
  },
  invoiced: {
    key: 'invoiced',
    label: 'Facturado',
    shortLabel: 'Fact.',
    sortable: false,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 60,
    align: 'center',
    renderType: 'indicator',
  },
  product: {
    key: 'product',
    label: 'Producto',
    shortLabel: 'Prod.',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 120,
    align: 'left',
    renderType: 'text',
  },
  sales_angle: {
    key: 'sales_angle',
    label: 'Ángulo Ventas',
    shortLabel: 'Ángulo',
    sortable: false,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 120,
    align: 'left',
    renderType: 'text',
  },
  views_count: {
    key: 'views_count',
    label: 'Vistas',
    shortLabel: 'Vistas',
    sortable: true,
    defaultVisible: { kanban: false, list: false, calendar: false, table: false },
    minWidth: 80,
    align: 'right',
    renderType: 'text',
  },
};

// Type para las keys de campos del board
export type BoardFieldKey = keyof typeof BOARD_FIELDS;

// Alias para compatibilidad
export const BOARD_FIELDS_CONFIG = BOARD_FIELDS;

// Get default visible fields for a view type
export function getDefaultVisibleFields(viewType: BoardViewType): string[] {
  return Object.entries(BOARD_FIELDS)
    .filter(([_, config]) => config.defaultVisible[viewType])
    .map(([key]) => key);
}

// Get all available field keys
export function getAllFieldKeys(): string[] {
  return Object.keys(BOARD_FIELDS);
}

// Get field config by key
export function getFieldConfig(key: string): FieldConfig | undefined {
  return BOARD_FIELDS[key];
}

// Helper to format date fields
export function formatFieldValue(
  content: Content,
  fieldKey: string,
  compact: boolean = false
): string {
  switch (fieldKey) {
    case 'deadline':
    case 'created_at':
      const dateValue = content[fieldKey as keyof Content] as string | null;
      if (!dateValue) return '-';
      return format(
        new Date(dateValue),
        compact ? 'dd/MM' : 'dd MMM yyyy',
        { locale: es }
      );

    case 'client':
      return (content.client as { name?: string } | null)?.name || '-';

    case 'creator':
      return (content.creator as { full_name?: string } | null)?.full_name || '-';

    case 'editor':
      return (content.editor as { full_name?: string } | null)?.full_name || '-';

    case 'campaign_week':
      return content.campaign_week ? `S${content.campaign_week}` : '-';

    default:
      const value = content[fieldKey as keyof Content];
      return value?.toString() || '-';
  }
}

// Sphere phase display config
export const SPHERE_PHASE_CONFIG = {
  engage: { label: 'Enganchar', shortLabel: 'ENG', color: '#22d3ee' },
  solution: { label: 'Solución', shortLabel: 'SOL', color: '#34d399' },
  remarketing: { label: 'Remarketing', shortLabel: 'RMK', color: '#fbbf24' },
  fidelize: { label: 'Fidelizar', shortLabel: 'FID', color: '#c084fc' },
} as const;

// Status progress mapping (fallback when no org statuses)
export const STATUS_PROGRESS: Record<string, number> = {
  draft: 5,
  script_pending: 15,
  script_approved: 25,
  assigned: 35,
  recording: 45,
  recorded: 55,
  editing: 65,
  review: 75,
  issue: 70,
  delivered: 80,
  corrected: 85,
  approved: 95,
  paid: 100,
};

export function getStatusProgress(status: string): number {
  return STATUS_PROGRESS[status] || 0;
}
