// src/types/talent-dna.ts

// ── Emotional Analysis (reutilizado de client-dna) ─────────────────

export interface EmotionalAnalysis {
  overall_mood: 'enthusiastic' | 'confident' | 'uncertain' | 'stressed' | 'calm' | 'passionate';
  confidence_level: number; // 0-100

  emotional_segments: {
    question_number: number;
    emotion: string;
    intensity: 'low' | 'medium' | 'high';
    notes: string;
  }[];

  communication_style: {
    pace: 'slow' | 'moderate' | 'fast';
    clarity: 'very_clear' | 'clear' | 'somewhat_unclear';
    energy: 'low' | 'moderate' | 'high';
  };

  notable_hesitations: string[];
  passion_topics: string[];
  concern_areas: string[];

  content_recommendations: {
    suggested_tone: string;
    avoid_topics: string[];
    emphasize_topics: string[];
  };
}

// ── Talent DNA Data Structure ───────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CreatorIdentity {
  tagline: string;           // → bio (100-150 chars)
  bio_full: string;          // → bio_full (hasta 1000 chars)
  experience_level: ExperienceLevel;
  unique_factor: string;     // Lo que lo hace único/diferente
  years_creating: string;    // "2 años", "5+ años"
  achievements: string[];    // Logros destacados
}

export interface Specialization {
  niches: string[];          // → categories (nichos/industrias)
  production_skills: string[]; // Habilidades de producción
  content_formats: string[]; // → content_types (Reels, TikTok, YouTube, etc.)
  specialized_services: string[]; // Servicios especializados
}

export interface ContentStyle {
  primary_style: string;     // Estilo principal (minimalista, energético, etc.)
  tone_descriptors: string[]; // Descriptores del tono
  visual_aesthetic: string;  // Estética visual preferida
  editing_style: string;     // Estilo de edición
}

export interface IdealCollaborations {
  brand_types: string[];     // Tipos de marcas ideales
  industries: string[];      // Industrias preferidas
  project_types: string[];   // Tipos de proyectos
  avoid_categories: string[]; // Categorías a evitar
}

export interface CreativeProcess {
  workflow_description: string;
  turnaround_typical: string;
  collaboration_style: string;
  tools_used: string[];
}

export interface ProfessionalGoals {
  short_term: string[];
  long_term: string[];
  dream_brands: string[];
}

export interface TalentDNAData {
  creator_identity: CreatorIdentity;
  specialization: Specialization;
  marketplace_roles: string[]; // → marketplace_roles (max 5)
  content_style: ContentStyle;
  platforms: string[];         // → platforms
  languages: string[];         // → languages
  ideal_collaborations: IdealCollaborations;
  creative_process: CreativeProcess;
  professional_goals: ProfessionalGoals;

  // Metadata
  metadata?: {
    generated_at: string;
    ai_model: string;
    language: string;
    emotional_context_used: boolean;
  };
}

// ── Talent DNA Record ───────────────────────────────────────────────

export interface TalentDNA {
  id: string;
  user_id: string;
  transcription: string | null;
  emotional_analysis: EmotionalAnalysis | Record<string, unknown>;
  dna_data: TalentDNAData | null;
  version: number;
  status: 'processing' | 'completed' | 'error';
  is_active: boolean;
  applied_to_profile: boolean;
  created_at: string;
  updated_at: string;
}

// ── Mapeo de campos a creator_profiles ──────────────────────────────

export interface TalentDNAProfileMapping {
  bio: string;                    // ← creator_identity.tagline
  bio_full: string;               // ← creator_identity.bio_full
  experience_level: ExperienceLevel; // ← creator_identity.experience_level
  unique_factor: string;          // ← creator_identity.unique_factor
  primary_category: string;       // ← specialization.niches[0]
  secondary_categories: string[]; // ← specialization.niches[1:]
  content_types: string[];        // ← specialization.content_formats
  content_style: string[];        // ← content_style.tone_descriptors
  marketplace_roles: string[];    // ← marketplace_roles (max 5)
  platforms: string[];            // ← platforms
  languages: string[];            // ← languages
  specialization_tags: string[];  // ← specialization.specialized_services
}
