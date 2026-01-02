import { Content, ContentStatus } from "@/types/database";

// ============= FORM DATA =============
export interface ContentFormData {
  title: string;
  product: string;
  product_id: string;
  sales_angle: string;
  client_id: string;
  creator_id: string;
  editor_id: string;
  strategist_id: string;
  deadline: string;
  start_date: string;
  campaign_week: string;
  reference_url: string;
  video_url: string;
  video_urls: string[];
  raw_video_urls: string[];
  hooks_count: number;
  drive_url: string;
  script: string;
  description: string;
  notes: string;
  creator_payment: number;
  editor_payment: number;
  creator_paid: boolean;
  editor_paid: boolean;
  invoiced: boolean;
  is_published: boolean;
  editor_guidelines: string;
  strategist_guidelines: string;
  trafficker_guidelines: string;
  designer_guidelines: string;
  admin_guidelines: string;
  // Ambassador content fields
  is_ambassador_content?: boolean;
  content_type?: 'commercial' | 'ambassador_internal';
  is_paid?: boolean;
  reward_type?: 'money' | 'UP';
  // Método Esfera
  sphere_phase?: string;
}

// ============= PERMISSIONS =============
export type ContentResource = 
  | 'content.title'
  | 'content.status'
  | 'content.scripts'
  | 'content.scripts.creator'
  | 'content.scripts.editor'
  | 'content.scripts.trafficker'
  | 'content.scripts.strategist'
  | 'content.scripts.designer'
  | 'content.scripts.admin'
  | 'content.video'
  | 'content.video.upload'
  | 'content.video.download'
  | 'content.video.thumbnail'
  | 'content.material'
  | 'content.material.raw_videos'
  | 'content.material.drive'
  | 'content.general'
  | 'content.team'
  | 'content.dates'
  | 'content.payments'
  | 'content.comments'
  | 'content.delete';

export type ContentAction = 'view' | 'edit' | 'approve';

export type TabKey = 'scripts' | 'video' | 'material' | 'general' | 'team' | 'dates' | 'payments';

export interface ContentPermissions {
  can: (resource: ContentResource, action: ContentAction) => boolean;
  visibleTabs: TabKey[];
  isReadOnly: (resource: ContentResource) => boolean;
  canEnterEditMode: boolean;
}

// ============= TAB PROPS =============
export interface TabProps {
  content: Content;
  formData: ContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContentFormData>>;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  permissions: ContentPermissions;
  onUpdate?: () => void;
  /** 
   * When true, the tab is in read-only mode regardless of editMode.
   * This is set by blockConfig.canEditBlock() returning false.
   */
  readOnly?: boolean;
}

// ============= DIALOG PROPS =============
export type DialogMode = 'view' | 'create';

export interface ContentDetailDialogProps {
  content: Content | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: (contentId: string) => void;
  /** 
   * Dialog mode: 'view' for viewing/editing existing content, 'create' for new content.
   * Defaults to 'view'.
   */
  mode?: DialogMode;
}

// ============= HELPERS =============
export interface SelectOption {
  id: string;
  name: string;
  is_internal_brand?: boolean;
}

export interface ContentCommentWithProfile {
  id: string;
  content_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  section?: string | null;
  section_index?: number | null;
  comment_type?: string | null;
  profile?: { full_name: string };
}

// ============= SCRIPT BLOCK CONFIG =============
export interface ScriptBlockConfig {
  key: string;
  icon: string;
  title: string;
  fieldKey: keyof ContentFormData;
  placeholder: string;
  resourceKey: ContentResource;
}

export const SCRIPT_BLOCKS: ScriptBlockConfig[] = [
  {
    key: 'creator',
    icon: '🧍‍♂️',
    title: 'Bloque Creador (Guión)',
    fieldKey: 'script',
    placeholder: 'Escribe el guión aquí...',
    resourceKey: 'content.scripts.creator'
  },
  {
    key: 'editor',
    icon: '🎬',
    title: 'Bloque Editor',
    fieldKey: 'editor_guidelines',
    placeholder: 'Instrucciones para el editor: estilo, música, ritmo, efectos...',
    resourceKey: 'content.scripts.editor'
  },
  {
    key: 'trafficker',
    icon: '💰',
    title: 'Bloque Trafficker',
    fieldKey: 'trafficker_guidelines',
    placeholder: 'Indicaciones de pauta: público objetivo, presupuesto, plataformas...',
    resourceKey: 'content.scripts.trafficker'
  },
  {
    key: 'strategist',
    icon: '🧠',
    title: 'Bloque Estratega',
    fieldKey: 'strategist_guidelines',
    placeholder: 'Estrategia de contenido, objetivos, métricas...',
    resourceKey: 'content.scripts.strategist'
  },
  {
    key: 'designer',
    icon: '🎨',
    title: 'Bloque Diseñador',
    fieldKey: 'designer_guidelines',
    placeholder: 'Lineamiento gráfico, look & feel, branding...',
    resourceKey: 'content.scripts.designer'
  },
  {
    key: 'admin',
    icon: '📋',
    title: 'Bloque Admin / PM',
    fieldKey: 'admin_guidelines',
    placeholder: 'Cronograma, responsables, entregables, checklist...',
    resourceKey: 'content.scripts.admin'
  }
];
