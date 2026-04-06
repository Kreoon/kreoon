// =====================================================
// Template Library — Tipos TypeScript
// Refleja la estructura de profile_templates y las
// respuestas de las funciones RPC de Supabase.
// =====================================================

// ─── Enums / Union types ──────────────────────────────────────────────────────

/** Categorías válidas de plantillas (espeja el CHECK de BD). */
export type TemplateCategory =
  | 'ugc'
  | 'freelancer'
  | 'agency'
  | 'influencer'
  | 'portfolio'
  | 'services'
  | 'general';

/** Visibilidad de una plantilla (espeja el CHECK de BD). */
export type TemplateVisibility = 'draft' | 'unlisted' | 'public' | 'featured';

/** Estado de moderación de una plantilla. */
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

/** Tipo de interacción permitida en toggle (solo like y save). */
export type TemplateInteractionType = 'like' | 'save';

/** Tier mínimo requerido para usar una plantilla. */
export type MinTierRequired = 'creator_free' | 'creator_pro' | 'creator_premium';

/** Criterio de ordenamiento para la exploración pública. */
export type TemplateSortBy = 'popular' | 'newest' | 'most_used';

// ─── Sub-tipos ────────────────────────────────────────────────────────────────

/**
 * Autor de una plantilla.
 * Corresponde al jsonb_build_object('id', cp.id, ...) en get_public_templates.
 */
export interface TemplateAuthor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
}

/**
 * Autor extendido devuelto por get_template_by_slug,
 * que incluye user_id adicional.
 */
export interface TemplateAuthorDetail extends TemplateAuthor {
  user_id: string;
}

/**
 * Colores de preview almacenados en preview_colors jsonb.
 */
export interface TemplatePreviewColors {
  accentColor?: string;
  theme?: 'dark' | 'light' | string;
}

// ─── Entidad principal ────────────────────────────────────────────────────────

/**
 * Plantilla pública tal como la devuelve get_public_templates.
 * No incluye builder_config ni blocks (datos pesados).
 */
export interface PublicTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: TemplateCategory;
  tags: string[];
  thumbnail_url: string | null;
  preview_colors: TemplatePreviewColors | null;
  use_count: number;
  like_count: number;
  view_count: number;
  save_count: number;
  visibility: TemplateVisibility;
  min_tier_required: MinTierRequired;
  is_official: boolean;
  created_at: string;
  published_at: string | null;
  /** Autor enriquecido con datos del creator_profile. */
  author: TemplateAuthor;
  /** true si el usuario autenticado dio like a esta plantilla. */
  user_liked: boolean;
  /** true si el usuario autenticado guardó esta plantilla. */
  user_saved: boolean;
}

/**
 * Detalle completo de una plantilla devuelto por get_template_by_slug.
 * Incluye builder_config, blocks y datos de moderación.
 */
export interface TemplateDetail extends Omit<PublicTemplate, 'author'> {
  builder_config: Record<string, unknown>;
  blocks: TemplateBlock[];
  moderation_status: ModerationStatus;
  author: TemplateAuthorDetail;
  /** true si el usuario autenticado es el autor de la plantilla. */
  is_owner: boolean;
}

/**
 * Bloque individual dentro del snapshot de una plantilla.
 * Refleja la estructura guardada por save_profile_as_template.
 */
export interface TemplateBlock {
  type: string;
  orderIndex: number;
  isVisible: boolean;
  config: Record<string, unknown>;
  styles: Record<string, unknown>;
  content: Record<string, unknown>;
}

/**
 * Plantilla propia del usuario, devuelta por get_my_templates.
 * Subset de campos (sin author ni user_liked/user_saved).
 */
export interface MyTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: TemplateCategory;
  tags: string[];
  thumbnail_url: string | null;
  preview_colors: TemplatePreviewColors | null;
  use_count: number;
  like_count: number;
  view_count: number;
  visibility: TemplateVisibility;
  moderation_status: ModerationStatus;
  created_at: string;
  published_at: string | null;
}

// ─── Filtros y opciones ───────────────────────────────────────────────────────

/** Filtros activos en la exploración de plantillas públicas. */
export interface TemplateFilters {
  category?: TemplateCategory;
  search?: string;
  sortBy?: TemplateSortBy;
}

/** Input para guardar el perfil actual como plantilla. */
export interface SaveTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  tags?: string[];
  visibility: TemplateVisibility;
}

/** Opciones para clonar una plantilla al perfil del usuario. */
export interface CloneTemplateOptions {
  /** Si true, copia también el contenido de los bloques (textos, imágenes). */
  cloneContent: boolean;
  /** 'replace' elimina bloques existentes; 'merge' los conserva y agrega al final. */
  mergeMode: 'replace' | 'merge';
}

// ─── Respuesta paginada ───────────────────────────────────────────────────────

/**
 * Respuesta de get_public_templates con metadatos de paginación.
 * Corresponde al jsonb_build_object('templates', ..., 'hasMore', ...) de la RPC.
 */
export interface TemplateListResponse {
  templates: PublicTemplate[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
