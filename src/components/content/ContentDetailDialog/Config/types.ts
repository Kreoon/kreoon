// Content Block Configuration Types

export type BlockKey = 
  | 'ia' 
  | 'script' 
  | 'editor' 
  | 'strategist' 
  | 'designer' 
  | 'trafficker' 
  | 'admin'
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

// Block metadata for UI
export const BLOCK_METADATA: Record<BlockKey, { label: string; icon: string; description: string }> = {
  ia: { label: 'IA', icon: '🤖', description: 'Asistente de inteligencia artificial' },
  script: { label: 'Guión', icon: '📝', description: 'Contenido del guión principal' },
  editor: { label: 'Editor', icon: '🎬', description: 'Instrucciones para el editor' },
  strategist: { label: 'Estratega', icon: '🧠', description: 'Estrategia de contenido' },
  designer: { label: 'Diseñador', icon: '🎨', description: 'Lineamientos gráficos' },
  trafficker: { label: 'Trafficker', icon: '💰', description: 'Indicaciones de pauta' },
  admin: { label: 'Admin', icon: '📋', description: 'Cronograma y responsables' },
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
  'ia', 'script', 'editor', 'strategist', 'designer', 
  'trafficker', 'admin', 'material', 'video', 'team', 
  'dates', 'payments', 'comments'
];
