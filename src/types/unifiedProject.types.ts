import type { Content } from './database';
import type { RoleId, RoleGroup } from './roles';

// Re-export for convenience (consumers don't need to import from two files)
export type { RoleId, RoleGroup };

// ============================================================
// PROJECT TYPES
// ============================================================

/** Mirrors DB enum project_type */
export type ProjectType =
  | 'content_creation'
  | 'post_production'
  | 'strategy_marketing'
  | 'technology'
  | 'education';

/** What kind of workspace editor each type uses */
export type WorkspaceType = 'script' | 'checklist' | 'document' | 'technical' | 'curriculum';

/** Superset of all possible tab/section keys */
export type UnifiedSectionKey =
  | 'workspace'
  | 'brief'
  | 'video'
  | 'deliverables'
  | 'materials'
  | 'review'
  | 'thumbnail'
  | 'team'
  | 'dates'
  | 'payments'
  | 'reference';

// ============================================================
// BRIEF CONFIG
// ============================================================

export type BriefFieldType = 'text' | 'textarea' | 'tags' | 'select' | 'url' | 'number' | 'date';

export interface BriefFieldConfig {
  key: string;
  label: string;
  type: BriefFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];   // For select type
  group?: string;       // Visual grouping
}

export interface BriefConfig {
  fields: BriefFieldConfig[];
  /** Content-creation: has script authoring (ScriptsTabContainer) */
  hasScript: boolean;
  /** Content-creation: has hooks count field */
  hasHooks: boolean;
  /** Content-creation: has Esfera sphere_phase selector */
  hasSpherePhase: boolean;
  /** Show Project DNA section (audio + written questions) */
  hasProjectDNA: boolean;
}

// ============================================================
// WORKSPACE CONFIG
// ============================================================

export interface WorkspaceBlock {
  key: string;
  label: string;
  /** Which role this block belongs to (e.g., 'creator', 'editor') */
  role?: string;
}

export interface WorkspaceConfig {
  type: WorkspaceType;
  blocks: WorkspaceBlock[];
  /** Show teleprompter toggle in script workspace */
  hasTeleprompter: boolean;
  /** Show inline code editor in technical workspace */
  hasCodeEditor: boolean;
}

// ============================================================
// MATERIALS CONFIG
// ============================================================

export type MaterialAcceptType = 'video' | 'image' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code';

export interface MaterialsConfig {
  accepts: MaterialAcceptType[];
  hasRawVideos: boolean;
  hasProjectFiles: boolean;
  hasAnalytics: boolean;
  hasCompetitorData: boolean;
  hasSlides: boolean;
  hasWorksheets: boolean;
  hasRepository: boolean;
  hasFigmaLink: boolean;
}

// ============================================================
// DELIVERABLES CONFIG
// ============================================================

export type DeliverablePrimaryType = 'video' | 'document' | 'code' | 'design' | 'report' | 'course' | 'campaign';

export interface DeliverablesConfig {
  primaryType: DeliverablePrimaryType;
  hasVariants: boolean;
  hasThumbnails: boolean;
  hasPreview: boolean;
  hasReports: boolean;
  hasDashboard: boolean;
  hasDemo: boolean;
  hasDocumentation: boolean;
  hasScreenshots: boolean;
  hasModules: boolean;
  hasCertificate: boolean;
  hasQuizzes: boolean;
}

// ============================================================
// REVIEW CONFIG
// ============================================================

export interface ReviewConfig {
  hasApproval: boolean;
  hasComments: boolean;
  hasFeedbackRounds: boolean;
}

// ============================================================
// WORKFLOW CONFIG
// ============================================================

export interface WorkflowState {
  key: string;
  label: string;
  color: string;
}

export interface WorkflowConfig {
  states: WorkflowState[];
}

// ============================================================
// ROLES CONFIG
// ============================================================

export interface RolesConfig {
  primary: RoleId[];
  support: RoleId[];
  reviewer: RoleId[];
}

// ============================================================
// PROJECT TYPE CONFIG (rich, per-type declarative config)
// ============================================================

export interface ProjectTypeConfig {
  type: ProjectType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  sections: {
    brief: BriefConfig;
    workspace: WorkspaceConfig;
    materials: MaterialsConfig;
    deliverables: DeliverablesConfig;
    review: ReviewConfig;
  };
  workflow: WorkflowConfig;
  roles: RolesConfig;
  /** Which tab keys are visible for this project type */
  visibleTabs: UnifiedSectionKey[];
}

// ============================================================
// PROJECT TYPE REGISTRY (default configs for all 5 types)
// ============================================================

export const PROJECT_TYPE_REGISTRY: Record<ProjectType, ProjectTypeConfig> = {
  // -------------------------------------------------------
  // CONTENT CREATION
  // -------------------------------------------------------
  content_creation: {
    type: 'content_creation',
    label: 'Creacion de Contenido',
    icon: 'Video',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    sections: {
      brief: {
        fields: [
          { key: 'product_name', label: 'Producto', type: 'text', placeholder: 'Nombre del producto...', required: true },
          { key: 'product_url', label: 'URL del producto', type: 'url', placeholder: 'https://...' },
          { key: 'objective', label: 'Objetivo', type: 'textarea', placeholder: 'Objetivo principal del contenido...', required: true },
          { key: 'target_audience', label: 'Audiencia objetivo', type: 'textarea', placeholder: 'Descripcion de la audiencia...' },
          { key: 'key_messages', label: 'Mensajes clave', type: 'tags', placeholder: 'Agregar mensaje...' },
          { key: 'tone', label: 'Tono', type: 'select', options: ['Profesional', 'Casual', 'Divertido', 'Inspiracional', 'Educativo', 'Urgente'] },
          { key: 'references', label: 'Referencias', type: 'tags', placeholder: 'URL de referencia...' },
          { key: 'dos', label: 'Lo que SI hacer', type: 'tags', placeholder: 'Agregar indicacion...' },
          { key: 'donts', label: 'Lo que NO hacer', type: 'tags', placeholder: 'Agregar restriccion...' },
        ],
        hasScript: true,
        hasHooks: true,
        hasSpherePhase: true,
        hasProjectDNA: true,
      },
      workspace: {
        type: 'script',
        blocks: [
          { key: 'creator_script', label: 'Guion del Creador', role: 'creator' },
          { key: 'editor_guidelines', label: 'Indicaciones del Editor', role: 'editor' },
          { key: 'strategist_guidelines', label: 'Indicaciones del Estratega', role: 'strategist' },
          { key: 'trafficker_guidelines', label: 'Indicaciones del Trafficker', role: 'trafficker' },
          { key: 'designer_guidelines', label: 'Indicaciones del Disenador', role: 'designer' },
          { key: 'admin_guidelines', label: 'Notas Admin', role: 'admin' },
        ],
        hasTeleprompter: true,
        hasCodeEditor: false,
      },
      materials: {
        accepts: ['video', 'image', 'audio', 'document'],
        hasRawVideos: true,
        hasProjectFiles: true,
        hasAnalytics: false,
        hasCompetitorData: false,
        hasSlides: false,
        hasWorksheets: false,
        hasRepository: false,
        hasFigmaLink: false,
      },
      deliverables: {
        primaryType: 'video',
        hasVariants: true,
        hasThumbnails: true,
        hasPreview: true,
        hasReports: false,
        hasDashboard: false,
        hasDemo: false,
        hasDocumentation: false,
        hasScreenshots: false,
        hasModules: false,
        hasCertificate: false,
        hasQuizzes: false,
      },
      review: {
        hasApproval: true,
        hasComments: true,
        hasFeedbackRounds: true,
      },
    },
    workflow: {
      states: [
        { key: 'draft', label: 'Borrador', color: 'gray' },
        { key: 'script_pending', label: 'Guion Pendiente', color: 'yellow' },
        { key: 'script_approved', label: 'Guion Aprobado', color: 'blue' },
        { key: 'assigned', label: 'Asignado', color: 'indigo' },
        { key: 'recording', label: 'Grabacion', color: 'purple' },
        { key: 'recorded', label: 'Grabado', color: 'violet' },
        { key: 'editing', label: 'Edicion', color: 'pink' },
        { key: 'delivered', label: 'Entregado', color: 'cyan' },
        { key: 'issue', label: 'Problema', color: 'red' },
        { key: 'corrected', label: 'Corregido', color: 'orange' },
        { key: 'review', label: 'Revision', color: 'amber' },
        { key: 'approved', label: 'Aprobado', color: 'green' },
      ],
    },
    roles: {
      primary: ['ugc_creator', 'lifestyle_creator', 'micro_influencer', 'nano_influencer', 'macro_influencer', 'brand_ambassador', 'live_streamer', 'podcast_host', 'photographer', 'copywriter', 'graphic_designer', 'voice_artist'],
      support: ['video_editor', 'motion_graphics', 'sound_designer'],
      reviewer: ['content_strategist', 'brand_ambassador'],
    },
    visibleTabs: ['workspace', 'brief', 'video', 'materials', 'review', 'thumbnail', 'team', 'dates'],
  },

  // -------------------------------------------------------
  // POST-PRODUCTION
  // -------------------------------------------------------
  post_production: {
    type: 'post_production',
    label: 'Post-Produccion',
    icon: 'Film',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    sections: {
      brief: {
        fields: [
          { key: 'source_material', label: 'Material fuente', type: 'textarea', placeholder: 'Descripcion del material a editar...', required: true },
          { key: 'editing_style', label: 'Estilo de edicion', type: 'select', options: ['Cinematografico', 'Dinamico/TikTok', 'Corporativo', 'Documental', 'Musical', 'Minimalista'] },
          { key: 'software_required', label: 'Software requerido', type: 'tags', placeholder: 'Ej: Premiere, After Effects...' },
          { key: 'color_palette', label: 'Paleta de color', type: 'text', placeholder: 'Ej: Tonos calidos, alta saturacion...' },
          { key: 'audio_specs', label: 'Especificaciones de audio', type: 'textarea', placeholder: 'Musica, efectos, voz en off...' },
          { key: 'output_format', label: 'Formato de salida', type: 'select', options: ['9:16 (Vertical)', '16:9 (Horizontal)', '1:1 (Cuadrado)', '4:5 (Feed)', 'Multiple'] },
          { key: 'duration', label: 'Duracion estimada (seg)', type: 'number', placeholder: '60' },
        ],
        hasScript: false,
        hasHooks: false,
        hasSpherePhase: false,
        hasProjectDNA: true,
      },
      workspace: {
        type: 'checklist',
        blocks: [
          { key: 'editing_tasks', label: 'Tareas de Edicion', role: 'editor' },
          { key: 'vfx_tasks', label: 'Efectos Visuales', role: 'motion_graphics' },
          { key: 'audio_tasks', label: 'Audio y Sonido', role: 'sound_designer' },
          { key: 'color_tasks', label: 'Colorimetria', role: 'colorist' },
        ],
        hasTeleprompter: false,
        hasCodeEditor: false,
      },
      materials: {
        accepts: ['video', 'audio', 'image'],
        hasRawVideos: true,
        hasProjectFiles: true,
        hasAnalytics: false,
        hasCompetitorData: false,
        hasSlides: false,
        hasWorksheets: false,
        hasRepository: false,
        hasFigmaLink: false,
      },
      deliverables: {
        primaryType: 'video',
        hasVariants: true,
        hasThumbnails: true,
        hasPreview: true,
        hasReports: false,
        hasDashboard: false,
        hasDemo: false,
        hasDocumentation: false,
        hasScreenshots: false,
        hasModules: false,
        hasCertificate: false,
        hasQuizzes: false,
      },
      review: {
        hasApproval: true,
        hasComments: true,
        hasFeedbackRounds: true,
      },
    },
    workflow: {
      states: [
        { key: 'pending', label: 'Pendiente', color: 'gray' },
        { key: 'briefing', label: 'Briefing', color: 'yellow' },
        { key: 'in_progress', label: 'En Progreso', color: 'blue' },
        { key: 'revision', label: 'Revision', color: 'orange' },
        { key: 'approved', label: 'Aprobado', color: 'green' },
        { key: 'completed', label: 'Completado', color: 'emerald' },
        { key: 'cancelled', label: 'Cancelado', color: 'red' },
      ],
    },
    roles: {
      primary: ['video_editor', 'motion_graphics', 'animator_2d3d'],
      support: ['sound_designer', 'colorist'],
      reviewer: ['director', 'producer'],
    },
    visibleTabs: ['workspace', 'brief', 'deliverables', 'materials', 'review', 'thumbnail', 'team', 'dates'],
  },

  // -------------------------------------------------------
  // STRATEGY & MARKETING
  // -------------------------------------------------------
  strategy_marketing: {
    type: 'strategy_marketing',
    label: 'Estrategia & Marketing',
    icon: 'Target',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    sections: {
      brief: {
        fields: [
          { key: 'business_objective', label: 'Objetivo de negocio', type: 'textarea', placeholder: 'Que se quiere lograr...', required: true },
          { key: 'kpis', label: 'KPIs', type: 'tags', placeholder: 'Agregar KPI...' },
          { key: 'target_audience', label: 'Audiencia objetivo', type: 'textarea', placeholder: 'Segmento, demografia...' },
          { key: 'channels', label: 'Canales', type: 'tags', placeholder: 'Ej: Instagram, TikTok, Google Ads...' },
          { key: 'budget', label: 'Presupuesto', type: 'number', placeholder: '0' },
          { key: 'competitors', label: 'Competidores', type: 'tags', placeholder: 'Agregar competidor...' },
          { key: 'timeline', label: 'Timeline esperado', type: 'text', placeholder: 'Ej: 3 meses' },
        ],
        hasScript: false,
        hasHooks: false,
        hasSpherePhase: false,
        hasProjectDNA: true,
      },
      workspace: {
        type: 'document',
        blocks: [
          { key: 'market_analysis', label: 'Analisis de Mercado' },
          { key: 'strategy', label: 'Estrategia' },
          { key: 'action_plan', label: 'Plan de Accion' },
          { key: 'metrics', label: 'Metricas y KPIs' },
        ],
        hasTeleprompter: false,
        hasCodeEditor: false,
      },
      materials: {
        accepts: ['document', 'spreadsheet', 'presentation', 'image'],
        hasRawVideos: false,
        hasProjectFiles: false,
        hasAnalytics: true,
        hasCompetitorData: true,
        hasSlides: true,
        hasWorksheets: false,
        hasRepository: false,
        hasFigmaLink: false,
      },
      deliverables: {
        primaryType: 'report',
        hasVariants: false,
        hasThumbnails: false,
        hasPreview: false,
        hasReports: true,
        hasDashboard: true,
        hasDemo: false,
        hasDocumentation: false,
        hasScreenshots: false,
        hasModules: false,
        hasCertificate: false,
        hasQuizzes: false,
      },
      review: {
        hasApproval: true,
        hasComments: true,
        hasFeedbackRounds: false,
      },
    },
    workflow: {
      states: [
        { key: 'pending', label: 'Pendiente', color: 'gray' },
        { key: 'briefing', label: 'Briefing', color: 'yellow' },
        { key: 'research', label: 'Investigacion', color: 'cyan' },
        { key: 'in_progress', label: 'En Progreso', color: 'blue' },
        { key: 'review', label: 'Revision', color: 'orange' },
        { key: 'approved', label: 'Aprobado', color: 'green' },
        { key: 'completed', label: 'Completado', color: 'emerald' },
      ],
    },
    roles: {
      primary: ['content_strategist', 'social_media_manager', 'digital_strategist', 'growth_hacker'],
      support: ['community_manager', 'trafficker', 'seo_specialist', 'email_marketer', 'crm_specialist', 'conversion_optimizer'],
      reviewer: ['digital_strategist', 'content_strategist'],
    },
    visibleTabs: ['workspace', 'brief', 'materials', 'review', 'thumbnail', 'team', 'dates'],
  },

  // -------------------------------------------------------
  // TECHNOLOGY
  // -------------------------------------------------------
  technology: {
    type: 'technology',
    label: 'Tecnologia',
    icon: 'Code',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    sections: {
      brief: {
        fields: [
          { key: 'tech_stack', label: 'Tech stack', type: 'tags', placeholder: 'Ej: React, Node.js, PostgreSQL...', required: true },
          { key: 'repository_url', label: 'Repositorio', type: 'url', placeholder: 'https://github.com/...' },
          { key: 'specifications', label: 'Especificaciones tecnicas', type: 'textarea', placeholder: 'Requisitos funcionales y no funcionales...', required: true },
          { key: 'acceptance_criteria', label: 'Criterios de aceptacion', type: 'textarea', placeholder: 'Condiciones para aprobar el entregable...' },
          { key: 'hosting', label: 'Hosting / Infraestructura', type: 'text', placeholder: 'Ej: Vercel, AWS, GCP...' },
          { key: 'design_url', label: 'Diseno (Figma, etc)', type: 'url', placeholder: 'https://figma.com/...' },
        ],
        hasScript: false,
        hasHooks: false,
        hasSpherePhase: false,
        hasProjectDNA: true,
      },
      workspace: {
        type: 'technical',
        blocks: [
          { key: 'requirements', label: 'Requisitos' },
          { key: 'architecture', label: 'Arquitectura' },
          { key: 'implementation', label: 'Implementacion' },
          { key: 'testing', label: 'Testing y QA' },
        ],
        hasTeleprompter: false,
        hasCodeEditor: true,
      },
      materials: {
        accepts: ['document', 'code', 'image'],
        hasRawVideos: false,
        hasProjectFiles: true,
        hasAnalytics: false,
        hasCompetitorData: false,
        hasSlides: false,
        hasWorksheets: false,
        hasRepository: true,
        hasFigmaLink: true,
      },
      deliverables: {
        primaryType: 'code',
        hasVariants: false,
        hasThumbnails: false,
        hasPreview: false,
        hasReports: false,
        hasDashboard: false,
        hasDemo: true,
        hasDocumentation: true,
        hasScreenshots: true,
        hasModules: false,
        hasCertificate: false,
        hasQuizzes: false,
      },
      review: {
        hasApproval: true,
        hasComments: true,
        hasFeedbackRounds: true,
      },
    },
    workflow: {
      states: [
        { key: 'pending', label: 'Pendiente', color: 'gray' },
        { key: 'briefing', label: 'Briefing', color: 'yellow' },
        { key: 'design', label: 'Diseno', color: 'purple' },
        { key: 'development', label: 'Desarrollo', color: 'blue' },
        { key: 'testing', label: 'Testing', color: 'cyan' },
        { key: 'review', label: 'Revision', color: 'orange' },
        { key: 'deployed', label: 'Desplegado', color: 'green' },
        { key: 'completed', label: 'Completado', color: 'emerald' },
      ],
    },
    roles: {
      primary: ['web_developer', 'app_developer', 'ai_specialist'],
      support: [],
      reviewer: [],
    },
    visibleTabs: ['workspace', 'brief', 'deliverables', 'materials', 'review', 'thumbnail', 'team', 'dates'],
  },

  // -------------------------------------------------------
  // EDUCATION
  // -------------------------------------------------------
  education: {
    type: 'education',
    label: 'Educacion',
    icon: 'GraduationCap',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    sections: {
      brief: {
        fields: [
          { key: 'course_topic', label: 'Tema del curso', type: 'text', placeholder: 'Tema principal...', required: true },
          { key: 'learning_objectives', label: 'Objetivos de aprendizaje', type: 'tags', placeholder: 'Agregar objetivo...' },
          { key: 'target_level', label: 'Nivel del publico', type: 'select', options: ['Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles'] },
          { key: 'modules', label: 'Modulos / Lecciones', type: 'textarea', placeholder: 'Estructura del curso...' },
          { key: 'assessment_method', label: 'Metodo de evaluacion', type: 'select', options: ['Quiz', 'Proyecto final', 'Ejercicios practicos', 'Certificacion', 'Sin evaluacion'] },
          { key: 'platform', label: 'Plataforma', type: 'select', options: ['Kreoon Academy', 'YouTube', 'Udemy', 'Otra'] },
          { key: 'estimated_hours', label: 'Horas estimadas', type: 'number', placeholder: '10' },
        ],
        hasScript: false,
        hasHooks: false,
        hasSpherePhase: false,
        hasProjectDNA: true,
      },
      workspace: {
        type: 'curriculum',
        blocks: [
          { key: 'course_outline', label: 'Estructura del Curso' },
          { key: 'lesson_content', label: 'Contenido de Lecciones' },
          { key: 'assessments', label: 'Evaluaciones' },
          { key: 'resources', label: 'Recursos' },
        ],
        hasTeleprompter: false,
        hasCodeEditor: false,
      },
      materials: {
        accepts: ['video', 'document', 'presentation', 'image'],
        hasRawVideos: false,
        hasProjectFiles: false,
        hasAnalytics: false,
        hasCompetitorData: false,
        hasSlides: true,
        hasWorksheets: true,
        hasRepository: false,
        hasFigmaLink: false,
      },
      deliverables: {
        primaryType: 'course',
        hasVariants: false,
        hasThumbnails: false,
        hasPreview: false,
        hasReports: false,
        hasDashboard: false,
        hasDemo: false,
        hasDocumentation: false,
        hasScreenshots: false,
        hasModules: true,
        hasCertificate: true,
        hasQuizzes: true,
      },
      review: {
        hasApproval: true,
        hasComments: true,
        hasFeedbackRounds: false,
      },
    },
    workflow: {
      states: [
        { key: 'pending', label: 'Pendiente', color: 'gray' },
        { key: 'planning', label: 'Planificacion', color: 'yellow' },
        { key: 'content_creation', label: 'Creacion de Contenido', color: 'blue' },
        { key: 'review', label: 'Revision', color: 'orange' },
        { key: 'published', label: 'Publicado', color: 'green' },
        { key: 'completed', label: 'Completado', color: 'emerald' },
      ],
    },
    roles: {
      primary: ['online_instructor', 'workshop_facilitator'],
      support: [],
      reviewer: [],
    },
    visibleTabs: ['workspace', 'brief', 'deliverables', 'materials', 'review', 'thumbnail', 'team', 'dates'],
  },
};

// ============================================================
// UNIFIED PROJECT (adapter output)
// ============================================================

export type UnifiedProjectSource = 'content' | 'marketplace';

export interface UnifiedProject {
  id: string;
  source: UnifiedProjectSource;
  projectType: ProjectType;
  title: string;
  status: string;
  organizationId: string;

  // Common fields
  clientId?: string;
  clientName?: string;
  creatorId?: string;
  creatorName?: string;
  editorId?: string;
  editorName?: string;
  strategistId?: string;

  brief: Record<string, any>;
  deadline?: string;
  startDate?: string;
  createdAt: string;
  updatedAt: string;

  // Financial
  totalPrice?: number;
  currency?: string;
  creatorPayment?: number;
  editorPayment?: number;
  platformFee?: number;

  // Progress
  deliverablesCount?: number;
  deliverablesApproved?: number;

  // Source-specific raw data (for hooks that need original shape)
  contentData?: Content;
  marketplaceData?: any; // MarketplaceProject from marketplace.ts

  // Multi-talent assignments (loaded separately, may be empty for legacy projects)
  assignments?: ProjectAssignment[];
}

// ============================================================
// GRANULAR ROLE PERMISSIONS
// ============================================================

export type Permission = 'none' | 'view' | 'edit' | 'approve';

export interface RolePermissions {
  header: { status: Permission; title: Permission; dates: Permission };
  brief: { view: Permission; edit: Permission };
  workspace: {
    own_block: Permission;
    other_blocks: Permission;
  };
  video: {
    view: Permission;
    upload: Permission;
    comments: Permission;
    publish: Permission;
  };
  materials: {
    view: Permission;
    upload: Permission;
  };
  deliverables: {
    view: Permission;
    upload: Permission;
    approve: Permission;
  };
  team: Permission;
  payments: { view_own: boolean; view_all: boolean; edit: boolean };
  delete: Permission;
}

/** Participant role in the context of a project (not org role) */
export type ProjectParticipantRole =
  | 'brand_owner'
  | 'admin'
  | 'assigned_creator'
  | 'assigned_editor'
  | 'assigned_strategist'
  | 'assigned_talent'
  | 'reviewer'
  | 'viewer';

// ---- Role preset for full-access (brand owner / admin) ----
const FULL_ACCESS: RolePermissions = {
  header: { status: 'edit', title: 'edit', dates: 'edit' },
  brief: { view: 'view', edit: 'edit' },
  workspace: { own_block: 'edit', other_blocks: 'edit' },
  video: { view: 'view', upload: 'edit', comments: 'edit', publish: 'edit' },
  materials: { view: 'view', upload: 'edit' },
  deliverables: { view: 'view', upload: 'edit', approve: 'approve' },
  team: 'edit',
  payments: { view_own: true, view_all: true, edit: true },
  delete: 'edit',
};

// ---- Role preset for generic talent (own workspace, materials, deliverables) ----
const TALENT_ACCESS: RolePermissions = {
  header: { status: 'view', title: 'view', dates: 'view' },
  brief: { view: 'view', edit: 'none' },
  workspace: { own_block: 'edit', other_blocks: 'none' },
  video: { view: 'view', upload: 'none', comments: 'edit', publish: 'none' },
  materials: { view: 'view', upload: 'edit' },
  deliverables: { view: 'view', upload: 'edit', approve: 'none' },
  team: 'none',
  payments: { view_own: true, view_all: false, edit: false },
  delete: 'none',
};

// ---- Role preset for viewer (no edit, see everything) ----
const VIEWER_ACCESS: RolePermissions = {
  header: { status: 'view', title: 'view', dates: 'view' },
  brief: { view: 'view', edit: 'none' },
  workspace: { own_block: 'view', other_blocks: 'view' },
  video: { view: 'view', upload: 'none', comments: 'view', publish: 'none' },
  materials: { view: 'view', upload: 'none' },
  deliverables: { view: 'view', upload: 'none', approve: 'none' },
  team: 'view',
  payments: { view_own: false, view_all: false, edit: false },
  delete: 'none',
};

// ============================================================
// ROLE PERMISSION PRESETS (per project type × participant role)
// ============================================================

export const ROLE_PERMISSION_PRESETS: Record<ProjectType, Record<ProjectParticipantRole, RolePermissions>> = {
  // ---- CONTENT CREATION ----
  content_creation: {
    brand_owner: FULL_ACCESS,
    admin: FULL_ACCESS,
    assigned_creator: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'edit', other_blocks: 'none' },
      video: { view: 'view', upload: 'edit', comments: 'edit', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_editor: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'edit', other_blocks: 'none' },
      video: { view: 'view', upload: 'edit', comments: 'edit', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_strategist: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'edit' },
      workspace: { own_block: 'edit', other_blocks: 'view' },
      video: { view: 'view', upload: 'none', comments: 'edit', publish: 'none' },
      materials: { view: 'view', upload: 'none' },
      deliverables: { view: 'view', upload: 'none', approve: 'none' },
      team: 'view',
      payments: { view_own: false, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_talent: TALENT_ACCESS,
    reviewer: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'view', other_blocks: 'view' },
      video: { view: 'view', upload: 'none', comments: 'view', publish: 'none' },
      materials: { view: 'view', upload: 'none' },
      deliverables: { view: 'view', upload: 'none', approve: 'approve' },
      team: 'view',
      payments: { view_own: false, view_all: false, edit: false },
      delete: 'none',
    },
    viewer: VIEWER_ACCESS,
  },

  // ---- POST-PRODUCTION ----
  post_production: {
    brand_owner: FULL_ACCESS,
    admin: FULL_ACCESS,
    assigned_creator: { // In post-prod, "creator" is the person who provided raw footage
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'view', other_blocks: 'none' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'none', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_editor: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'edit', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_strategist: VIEWER_ACCESS,
    assigned_talent: TALENT_ACCESS,
    reviewer: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'view', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'none' },
      deliverables: { view: 'view', upload: 'none', approve: 'approve' },
      team: 'view',
      payments: { view_own: false, view_all: false, edit: false },
      delete: 'none',
    },
    viewer: VIEWER_ACCESS,
  },

  // ---- STRATEGY & MARKETING ----
  strategy_marketing: {
    brand_owner: FULL_ACCESS,
    admin: FULL_ACCESS,
    assigned_creator: { // Strategist is the main worker here
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'edit', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_editor: VIEWER_ACCESS,
    assigned_strategist: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'edit' },
      workspace: { own_block: 'edit', other_blocks: 'edit' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'view',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_talent: TALENT_ACCESS,
    reviewer: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'view', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'none' },
      deliverables: { view: 'view', upload: 'none', approve: 'approve' },
      team: 'view',
      payments: { view_own: false, view_all: false, edit: false },
      delete: 'none',
    },
    viewer: VIEWER_ACCESS,
  },

  // ---- TECHNOLOGY ----
  technology: {
    brand_owner: FULL_ACCESS,
    admin: FULL_ACCESS,
    assigned_creator: { // Developer is the main worker
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'edit', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_editor: VIEWER_ACCESS,
    assigned_strategist: VIEWER_ACCESS,
    assigned_talent: TALENT_ACCESS,
    reviewer: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'view', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'none' },
      deliverables: { view: 'view', upload: 'none', approve: 'approve' },
      team: 'view',
      payments: { view_own: false, view_all: false, edit: false },
      delete: 'none',
    },
    viewer: VIEWER_ACCESS,
  },

  // ---- EDUCATION ----
  education: {
    brand_owner: FULL_ACCESS,
    admin: FULL_ACCESS,
    assigned_creator: { // Instructor is the main worker
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'edit' },
      workspace: { own_block: 'edit', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'edit' },
      deliverables: { view: 'view', upload: 'edit', approve: 'none' },
      team: 'none',
      payments: { view_own: true, view_all: false, edit: false },
      delete: 'none',
    },
    assigned_editor: VIEWER_ACCESS,
    assigned_strategist: VIEWER_ACCESS,
    assigned_talent: TALENT_ACCESS,
    reviewer: {
      header: { status: 'view', title: 'view', dates: 'view' },
      brief: { view: 'view', edit: 'none' },
      workspace: { own_block: 'view', other_blocks: 'view' },
      video: { view: 'none', upload: 'none', comments: 'none', publish: 'none' },
      materials: { view: 'view', upload: 'none' },
      deliverables: { view: 'view', upload: 'none', approve: 'approve' },
      team: 'view',
      payments: { view_own: false, view_all: false, edit: false },
      delete: 'none',
    },
    viewer: VIEWER_ACCESS,
  },
};

/** Resolve which participant role the current user has in a project */
export function resolveParticipantRole(
  project: { creatorId?: string; editorId?: string; strategistId?: string; marketplaceData?: any; assignments?: ProjectAssignment[] },
  userId: string,
  isAdmin: boolean,
  isBrandOwner: boolean,
): ProjectParticipantRole {
  if (isAdmin) return 'admin';
  if (isBrandOwner) return 'brand_owner';

  // Check assignments first (new multi-talent system takes priority)
  if (project.assignments?.length) {
    const match = project.assignments.find(
      a => a.userId === userId && a.status !== 'cancelled',
    );
    if (match) {
      switch (match.roleGroup) {
        case 'creator': return 'assigned_creator';
        case 'editor': return 'assigned_editor';
        case 'strategist': return 'assigned_strategist';
        default: return 'assigned_talent';
      }
    }
  }

  // Fall back to legacy scalar fields
  if (project.creatorId === userId) return 'assigned_creator';
  if (project.editorId === userId) return 'assigned_editor';
  if (project.strategistId === userId) return 'assigned_strategist';
  return 'viewer';
}

/** Get role permissions for a project type + participant role */
export function getRolePermissions(
  projectType: ProjectType,
  participantRole: ProjectParticipantRole,
): RolePermissions {
  return ROLE_PERMISSION_PRESETS[projectType][participantRole];
}

// ============================================================
// UNIFIED PERMISSIONS (public API consumed by components)
// ============================================================

export type UnifiedResource =
  | 'project.title'
  | 'project.status'
  | 'project.workspace'
  | 'project.workspace.own_block'
  | 'project.workspace.other_blocks'
  | 'project.brief'
  | 'project.video'
  | 'project.video.upload'
  | 'project.video.comments'
  | 'project.video.publish'
  | 'project.deliverables'
  | 'project.deliverables.upload'
  | 'project.deliverables.approve'
  | 'project.materials'
  | 'project.materials.upload'
  | 'project.review'
  | 'project.team'
  | 'project.dates'
  | 'project.payments'
  | 'project.delete';

export type UnifiedAction = 'view' | 'edit' | 'approve';

export interface UnifiedPermissions {
  can: (resource: UnifiedResource, action: UnifiedAction) => boolean;
  visibleSections: UnifiedSectionKey[];
  isReadOnly: (resource: UnifiedResource) => boolean;
  canEnterEditMode: boolean;
  /** The resolved granular permissions for the current user */
  rolePermissions: RolePermissions;
  /** The resolved participant role */
  participantRole: ProjectParticipantRole;
}

// ============================================================
// TAB CONFIG (UI rendering)
// ============================================================

export interface UnifiedTabConfig {
  key: UnifiedSectionKey;
  label: string;
  icon: string;
}

export const SECTION_TAB_CONFIG: Record<UnifiedSectionKey, UnifiedTabConfig> = {
  workspace: { key: 'workspace', label: 'Workspace', icon: 'PenTool' },
  brief: { key: 'brief', label: 'Brief', icon: 'FileText' },
  video: { key: 'video', label: 'Video', icon: 'Video' },
  deliverables: { key: 'deliverables', label: 'Entregables', icon: 'Package' },
  materials: { key: 'materials', label: 'Material', icon: 'FolderOpen' },
  review: { key: 'review', label: 'Revision', icon: 'CheckSquare' },
  thumbnail: { key: 'thumbnail', label: 'Miniatura', icon: 'Image' },
  team: { key: 'team', label: 'Equipo', icon: 'Users' },
  dates: { key: 'dates', label: 'Fechas', icon: 'Calendar' },
  payments: { key: 'payments', label: 'Finanzas', icon: 'DollarSign' }, // Merged into team tab; kept for backward compat
  reference: { key: 'reference', label: 'Referencia', icon: 'Video' },
};

// ============================================================
// HELPERS
// ============================================================

export function getProjectTypeConfig(type: ProjectType): ProjectTypeConfig {
  return PROJECT_TYPE_REGISTRY[type];
}

export function getProjectTypeLabel(type: ProjectType): string {
  return PROJECT_TYPE_REGISTRY[type].label;
}

/** Get workflow states for a project type (used for status selectors) */
export function getWorkflowStates(type: ProjectType): WorkflowState[] {
  return PROJECT_TYPE_REGISTRY[type].workflow.states;
}

/** Get all roles (primary + support + reviewer) flattened */
export function getAllRoles(type: ProjectType): RoleId[] {
  const { primary, support, reviewer } = PROJECT_TYPE_REGISTRY[type].roles;
  return [...new Set([...primary, ...support, ...reviewer])];
}

export const PROJECT_TYPE_OPTIONS = Object.values(PROJECT_TYPE_REGISTRY).map(config => ({
  value: config.type,
  label: config.label,
  icon: config.icon,
  color: config.color,
}));

// ============================================================
// PROJECT ASSIGNMENTS (Multi-Talent)
// ============================================================

export type AssignmentStatus =
  | 'pending'
  | 'invited'
  | 'accepted'
  | 'in_progress'
  | 'delivered'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'paid'
  | 'cancelled';

export interface ProjectAssignment {
  id: string;
  projectSource: 'content' | 'marketplace';
  contentId?: string;
  marketplaceProjectId?: string;
  userId: string;
  roleId: RoleId;
  roleGroup: RoleGroup;
  phase: number;
  dependsOn: string[];
  status: AssignmentStatus;
  paymentAmount?: number;
  paymentCurrency: string;
  paymentMethod?: 'payment' | 'exchange';
  isPaid: boolean;
  paidAt?: string;
  workspaceBlockType?: string;
  invitedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined profile data
  user?: { full_name: string; avatar_url: string | null };
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  invited: 'Invitado',
  accepted: 'Aceptado',
  in_progress: 'En Progreso',
  delivered: 'Entregado',
  in_review: 'En Revision',
  changes_requested: 'Cambios Solicitados',
  approved: 'Aprobado',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  invited: 'bg-blue-100 text-blue-700',
  accepted: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-cyan-100 text-cyan-700',
  in_review: 'bg-orange-100 text-orange-700',
  changes_requested: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-200 text-gray-500',
};
