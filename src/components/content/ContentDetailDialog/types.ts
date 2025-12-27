import { Content, ContentStatus, AppRole } from "@/types/database";

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
}

// ============= PERMISSIONS =============
export type ContentResource = 
  | 'content.scripts'
  | 'content.scripts.creador'
  | 'content.scripts.editor'
  | 'content.scripts.trafficker'
  | 'content.scripts.estratega'
  | 'content.scripts.disenador'
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
  | 'content.status'
  | 'content.delete';

export type ContentAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export type TabKey = 'scripts' | 'video' | 'material' | 'general' | 'equipo' | 'fechas' | 'pagos';

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
  loading: boolean;
  setLoading: (value: boolean) => void;
}

// ============= DIALOG PROPS =============
export interface ContentDetailDialogProps {
  content: Content | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: (contentId: string) => void;
}

// ============= SELECT OPTIONS =============
export interface SelectOption {
  id: string;
  name: string;
}

// ============= COMMENTS =============
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
  color: string;
}

export const SCRIPT_BLOCKS: ScriptBlockConfig[] = [
  {
    key: 'creador',
    icon: '🧍‍♂️',
    title: 'Bloque Creador (Guión)',
    fieldKey: 'script',
    placeholder: 'Escribe el guión aquí...',
    color: 'text-purple-500'
  },
  {
    key: 'editor',
    icon: '🎬',
    title: 'Bloque Editor',
    fieldKey: 'editor_guidelines',
    placeholder: 'Instrucciones específicas para el editor: estilo de edición, música, ritmo, efectos, etc.',
    color: 'text-blue-500'
  },
  {
    key: 'trafficker',
    icon: '💰',
    title: 'Bloque Trafficker',
    fieldKey: 'trafficker_guidelines',
    placeholder: 'Indicaciones de pauta: público objetivo, presupuesto sugerido, plataformas, segmentación, etc.',
    color: 'text-green-500'
  },
  {
    key: 'estratega',
    icon: '🧠',
    title: 'Bloque Estratega',
    fieldKey: 'strategist_guidelines',
    placeholder: 'Estrategia de contenido, objetivos, métricas a seguir, ajustes de copy, etc.',
    color: 'text-purple-500'
  },
  {
    key: 'disenador',
    icon: '🎨',
    title: 'Bloque Diseñador',
    fieldKey: 'designer_guidelines',
    placeholder: 'Lineamiento gráfico, look & feel, elementos visuales, branding, etc.',
    color: 'text-pink-500'
  },
  {
    key: 'admin',
    icon: '📋',
    title: 'Bloque Admin / PM',
    fieldKey: 'admin_guidelines',
    placeholder: 'Cronograma, responsables, entregables, checklist de revisión, etc.',
    color: 'text-orange-500'
  }
];
