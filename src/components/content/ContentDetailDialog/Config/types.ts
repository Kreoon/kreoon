// Content Block Configuration Types

// Nueva estructura: 5 bloques principales de scripts
export type BlockKey =
  | 'ia'
  | 'script'
  | 'director'
  | 'broll'
  | 'marketing'
  | 'captions'
  | 'material'
  | 'video'
  | 'team'
  | 'dates'
  | 'payments'
  | 'comments';

export type BlockAction = 'view' | 'create' | 'edit' | 'approve' | 'lock';

export type LayoutType = 'tab' | 'accordion' | 'section';

export interface BlockConfig {
  id: string;
  organization_id: string;
  block_key: BlockKey;
  is_visible: boolean;
  sort_order: number;
  layout_type: LayoutType;
}

export interface BlockPermission {
  id: string;
  organization_id: string;
  block_key: BlockKey;
  role: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_lock: boolean;
}

export interface BlockStateRule {
  id: string;
  organization_id: string;
  status_id: string | null;
  block_key: BlockKey;
  is_locked: boolean;
  is_hidden: boolean;
  editable_roles: string[];
}

export interface AdvancedConfig {
  id: string;
  organization_id: string;
  enable_comments: boolean;
  require_approval_before_advance: boolean;
  client_read_only_mode: boolean;
  enable_custom_fields: boolean;
  content_types: string[];
  text_editor_features: TextEditorFeatures;
}

export interface TextEditorFeatures {
  headings: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  lists: boolean;
  quotes: boolean;
  code: boolean;
  highlight: boolean;
  emojis: boolean;
  comments: boolean;
  history: boolean;
  links: boolean;
  tables: boolean;
  checklist: boolean;
  images: boolean;
}

export interface ContentConfigState {
  blocks: BlockConfig[];
  permissions: BlockPermission[];
  stateRules: BlockStateRule[];
  advanced: AdvancedConfig | null;
  loading: boolean;
}

// Block metadata for UI - Nueva estructura 5 bloques
export const BLOCK_METADATA: Record<BlockKey, { label: string; icon: string; description: string }> = {
  ia: { label: 'IA', icon: '🤖', description: 'Generación de guiones con IA' },
  script: { label: 'Guión', icon: '🎬', description: 'Guión completo para el creador' },
  director: { label: 'Director', icon: '🎥', description: 'Tabla de producción por escenas' },
  broll: { label: 'B-Roll', icon: '🎬', description: 'Ideas de tomas de cobertura' },
  marketing: { label: 'Marketing', icon: '📊', description: 'Estrategia + Tráfico combinado' },
  captions: { label: 'Captions', icon: '📱', description: '4 variaciones: 2 orgánico + 2 ads' },
  material: { label: 'Material', icon: '📦', description: 'Archivos y recursos' },
  video: { label: 'Video', icon: '🎥', description: 'Video final y miniaturas' },
  team: { label: 'Equipo', icon: '👥', description: 'Asignación de equipo' },
  dates: { label: 'Fechas', icon: '📅', description: 'Cronograma y deadlines' },
  payments: { label: 'Pagos', icon: '💳', description: 'Información de pagos' },
  comments: { label: 'Comentarios', icon: '💬', description: 'Comentarios y feedback' },
};

export const AVAILABLE_ROLES = [
  'admin',
  'creator',
  'editor',
  'strategist',
  'designer',
  'trafficker',
  'client',
] as const;

export const DEFAULT_BLOCKS: BlockKey[] = [
  'ia', 'script', 'director', 'broll', 'marketing', 'captions',
  'material', 'video', 'team', 'dates', 'payments', 'comments'
];
