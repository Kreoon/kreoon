// ============================================
// FASE 3: TypeScript Types - Product DNA
// src/types/product-dna.ts
// ============================================

// ============================================
// ENUMS Y CONSTANTES
// ============================================

export const SERVICE_GROUP_LABELS = {
  technology: 'Tecnología & Desarrollo',
  content_creation: 'Creación de Contenido',
  post_production: 'Post-Producción',
  strategy_marketing: 'Estrategia & Marketing',
  education_training: 'Educación & Formación',
  general_services: 'Servicios Generales'
} as const;

export type ServiceGroup = keyof typeof SERVICE_GROUP_LABELS;

export const PRODUCT_DNA_STATUS = {
  draft: 'Borrador',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Error',
  archived: 'Archivado'
} as const;

export type ProductDNAStatus = keyof typeof PRODUCT_DNA_STATUS;

// Backward compat: ServiceType used by service-catalog.ts and ProductDNADisplay.tsx
export type ServiceType =
  // Content Creation
  | 'video_ugc' | 'photo_ugc' | 'carousel_ugc' | 'photography'
  | 'live_streaming' | 'voice_over' | 'scriptwriting' | 'podcast_production'
  | 'influencer_post' | 'graphic_design'
  // Post-Production
  | 'video_editing' | 'motion_graphics' | 'thumbnail_design'
  | 'sound_design' | 'color_grading' | 'animation_2d_3d'
  | 'creative_direction' | 'audiovisual_production'
  // Strategy & Marketing
  | 'social_media_management' | 'content_strategy' | 'community_management'
  | 'digital_strategy' | 'media_buying' | 'seo_sem'
  | 'email_marketing' | 'growth_hacking' | 'crm_management' | 'cro'
  // Technology
  | 'web_development' | 'app_development' | 'ai_automation'
  // Education
  | 'online_courses' | 'workshops'
  // General
  | 'consulting' | 'custom';

// ============================================
// TIPOS PRINCIPALES
// ============================================

export interface ProductDNA {
  id: string;

  // Relaciones
  client_id: string | null;
  project_id: string | null;
  created_by: string | null;
  organization_id: string;

  // Información del wizard
  service_group: ServiceGroup;
  selected_services: string[];
  selected_goal: string;

  // Respuestas del usuario
  responses: Record<string, any>;

  // Audio
  audio_url: string | null;
  audio_duration: number | null;
  audio_transcript: string | null;

  // Referencias
  product_links: string[];
  competitor_links: string[];
  inspiration_links: string[];

  // Análisis AI
  ai_analysis: AIAnalysis | null;

  // Metadatos de análisis
  analysis_model: string | null;
  analysis_version: number;
  analysis_generated_at: string | null;
  analysis_tokens_used: number | null;

  // Estado
  status: ProductDNAStatus;
  error_message: string | null;

  // Scores
  completeness_score: number;
  confidence_score: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

// ============================================
// TIPOS DE ANÁLISIS AI
// ============================================

export interface AIAnalysis {
  executive_summary: string;
  market_analysis: MarketAnalysis;
  target_audience: TargetAudience;
  creative_brief: CreativeBrief;
  recommendations: Recommendations;
  creator_profile: CreatorProfile;
  budget_estimation: BudgetEstimation;
  timeline_suggestion: TimelineSuggestion;
  kiro_insights: string[];
}

export interface MarketAnalysis {
  trends: string[];
  competitors: CompetitorInfo[];
  opportunities: string[];
  threats: string[];
  market_size_estimation: string;
}

export interface CompetitorInfo {
  name: string;
  strengths: string[];
  weaknesses: string[];
  differentiator: string;
}

export interface TargetAudience {
  primary: AudienceProfile;
  secondary?: AudienceProfile;
  pain_points: string[];
  desires: string[];
  buying_triggers: string[];
}

export interface AudienceProfile {
  demographic: string;
  psychographic: string;
  behaviors: string[];
  channels: string[];
}

export interface CreativeBrief {
  tone: string;
  style: string;
  key_messages: string[];
  visual_direction: string;
  content_pillars: string[];
  hooks_suggestions: string[];
  cta_recommendations: string[];
}

export interface Recommendations {
  immediate_actions: ActionItem[];
  short_term: ActionItem[];
  long_term: ActionItem[];
}

export interface ActionItem {
  action: string;
  priority: 'alta' | 'media' | 'baja';
  estimated_impact: string;
}

export interface CreatorProfile {
  ideal_traits: string[];
  content_types: string[];
  platforms: string[];
  collaboration_format: string;
}

export interface BudgetEstimation {
  range: {
    min: number;
    max: number;
    currency: string;
  };
  breakdown: BudgetItem[];
}

export interface BudgetItem {
  category: string;
  percentage: number;
  description: string;
}

export interface TimelineSuggestion {
  total_duration: string;
  phases: TimelinePhase[];
}

export interface TimelinePhase {
  name: string;
  duration: string;
  deliverables: string[];
}

// ============================================
// TIPOS PARA EL WIZARD
// ============================================

export interface WizardState {
  currentStep: number;
  serviceGroup: ServiceGroup | null;
  selectedServices: string[];
  selectedGoal: string | null;
  responses: Record<string, any>;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioDuration: number | null;
  productLinks: string[];
  competitorLinks: string[];
  inspirationLinks: string[];
  isSubmitting: boolean;
  error: string | null;
}

export interface WizardQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'range' | 'boolean' | 'chips';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  conditionalOn?: {
    questionId: string;
    value: any;
  };
}

export interface ServiceGoal {
  id: string;
  label: string;
  description: string;
  icon: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
}

// ============================================
// TIPOS PARA API RESPONSES
// ============================================

export interface CreateProductDNARequest {
  client_id?: string;
  project_id?: string;
  service_group: ServiceGroup;
  selected_services: string[];
  selected_goal: string;
  responses: Record<string, any>;
  audio_url?: string;
  audio_duration?: number;
  product_links: string[];
  competitor_links: string[];
  inspiration_links: string[];
}

export interface CreateProductDNAResponse {
  success: boolean;
  data?: ProductDNA;
  error?: string;
}

export interface AnalyzeProductDNARequest {
  product_dna_id: string;
}

export interface AnalyzeProductDNAResponse {
  success: boolean;
  product_dna_id: string;
  analysis?: AIAnalysis;
  completeness_score?: number;
  confidence_score?: number;
  error?: string;
}

export interface ProductDNAListResponse {
  data: ProductDNA[];
  count: number;
  page: number;
  pageSize: number;
}

// ============================================
// TIPOS PARA FEEDBACK
// ============================================

export interface ProductDNAFeedback {
  id: string;
  product_dna_id: string;
  accuracy_rating: number;
  usefulness_rating: number;
  feedback_text: string | null;
  suggestions: string | null;
  section_feedback: Record<string, SectionFeedback>;
  created_by: string;
  created_at: string;
}

export interface SectionFeedback {
  rating: number;
  comment?: string;
}

// ============================================
// TIPOS PARA VERSIONES
// ============================================

export interface ProductDNAVersion {
  id: string;
  product_dna_id: string;
  version_number: number;
  responses: Record<string, any>;
  ai_analysis: AIAnalysis | null;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

// ============================================
// HELPERS / UTILITY TYPES
// ============================================

export type ProductDNAWithRelations = ProductDNA & {
  client_name?: string;
  client_contact?: string;
  client_email?: string;
  project_name?: string;
  project_status?: string;
  created_by_email?: string;
  calculated_completeness?: number;
};

export interface ProductDNASummary {
  id: string;
  client_name: string | null;
  project_name: string | null;
  service_group: ServiceGroup;
  selected_goal: string;
  status: ProductDNAStatus;
  completeness_score: number;
  has_audio: boolean;
  has_analysis: boolean;
  total_references: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isProductDNA(obj: any): obj is ProductDNA {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.service_group === 'string' &&
    typeof obj.selected_goal === 'string' &&
    typeof obj.status === 'string'
  );
}

export function hasAIAnalysis(dna: ProductDNA): dna is ProductDNA & { ai_analysis: AIAnalysis } {
  return dna.ai_analysis !== null && typeof dna.ai_analysis === 'object';
}

export function isCompleted(dna: ProductDNA): boolean {
  return dna.status === 'completed' && dna.ai_analysis !== null;
}
