/**
 * Sistema de Skills (Especialistas) para Edge Functions
 * Versión Deno compatible
 */

export type SkillType =
  // Existentes
  | 'hooks_specialist'
  | 'storytelling_specialist'
  | 'cultural_adapter'
  | 'cta_specialist'
  | 'virality_optimizer'
  // Tier 1: Críticos
  | 'ai_humanizer'
  | 'neuro_persuader'
  | 'trend_injector'
  // Tier 2: Alto Valor
  | 'emotion_architect'
  | 'retention_engineer'
  | 'avatar_mirrorer'
  | 'objection_crusher'
  | 'copy_sharpener'
  // Tier 3: Especializados
  | 'social_proof_weaver'
  | 'platform_optimizer'
  | 'seo_discoverer'
  | 'ad_compliance_checker'
  // Output Structurers (post-generación)
  | 'scene_director'
  | 'broll_generator'
  | 'caption_generator';

export interface SkillTriggers {
  sphere_phase?: string[];
  consciousness_level?: string[];
  narrative_structure?: string[];
  always?: boolean;
}

export interface Skill {
  id: SkillType;
  name: string;
  description: string;
  systemPrompt: string;
  triggers: SkillTriggers;
  priority: number;
}

export interface SkillExecution {
  skillId: SkillType;
  input: string;
  output: string;
  confidence: number;
  executedAt: Date;
  durationMs?: number;
}

export interface SkillContext {
  product: {
    name: string;
    description?: string;
    strategy?: string;
    market_research?: string;
    ideal_avatar?: string;
    sales_angles?: string[];
  };
  formData: {
    sales_angle?: string;
    cta?: string;
    hooks_count?: number;
    target_country?: string;
    narrative_structure?: string;
    sphere_phase?: string;
    consciousness_level?: string;
    additional_context?: string;
  };
  previousSkillsOutput?: SkillExecution[];
  perplexityResearch?: string;
}

export interface SkillResult {
  success: boolean;
  output: string;
  execution: SkillExecution;
  error?: string;
}

export interface SkillChainResult {
  success: boolean;
  finalOutput: string;
  executions: SkillExecution[];
  totalDurationMs: number;
  errors?: string[];
}
