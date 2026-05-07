/**
 * Sistema de Skills (Especialistas) para Kreoon
 *
 * Los Skills son agentes especializados que se activan según el tipo
 * de contenido a generar. Cada skill es un experto en un área específica.
 *
 * 20 Skills disponibles (ordenados por prioridad de ejecución):
 *
 * 1.  trend_injector (10.5) - Inyecta contexto trending
 * 2.  hooks_specialist (10) - Experto en hooks virales
 * 3.  avatar_mirrorer (9.8) - Refleja lenguaje del avatar
 * 4.  emotion_architect (9.5) - Diseña arco emocional
 * 5.  cultural_adapter (9) - Adaptación a jerga y cultura
 * 6.  retention_engineer (8.8) - Optimiza puntos de abandono
 * 7.  neuro_persuader (8.5) - Neuromarketing y persuasión
 * 8.  storytelling_specialist (8) - Narrativas y estructuras
 * 9.  social_proof_weaver (7.8) - Prueba social natural
 * 10. objection_crusher (7.5) - Maneja objeciones
 * 11. cta_specialist (7) - CTAs efectivos
 * 12. copy_sharpener (6.5) - Pulido de copy y power words
 * 13. virality_optimizer (6) - Optimización de viralidad
 * 14. ai_humanizer (5) - Humaniza contenido, elimina patrones IA
 * 15. seo_discoverer (4.5) - SEO para búsqueda en plataformas
 * 16. platform_optimizer (4) - Ajuste TikTok/Reels/Shorts
 * 17. scene_director (3.5) - Tabla de producción por escenas
 * 18. ad_compliance_checker (3) - Compliance políticas de ads
 * 19. caption_generator (2.5) - 4 variaciones de captions (2 org + 2 ads)
 * 20. broll_generator (1.5) - Ideas de B-Roll para video
 *
 * @example
 * ```typescript
 * import { getActiveSkills, buildCombinedSystemPrompt } from '@/lib/ai/skills';
 *
 * const skills = getActiveSkills({
 *   sphere_phase: 'solution',
 *   consciousness_level: 'problem_aware',
 * });
 *
 * const systemPrompt = buildCombinedSystemPrompt(skills);
 * ```
 */

// Types
export type {
  SkillType,
  Skill,
  SkillTriggers,
  SkillExecution,
  SkillContext,
  SkillResult,
  SkillChainResult,
} from './types';

// Registry functions
export {
  skillsRegistry,
  getImplementedSkills,
  getSkillById,
  getActiveSkills,
  getSkillsForGeneration,
  validateRequiredSkills,
  getSkillsMetadata,
  buildCombinedSystemPrompt,
  interpolateSkillPrompt,
} from './registry';

// Individual skills - Originales
export { hooksSpecialist } from './hooks-specialist';
export { culturalAdapter } from './cultural-adapter';
export { storytellingSpecialist } from './storytelling-specialist';
export { ctaSpecialist } from './cta-specialist';
export { viralityOptimizer } from './virality-optimizer';
// Tier 1 - Críticos
export { trendInjector } from './trend-injector';
export { neuroPersuader } from './neuro-persuader';
export { aiHumanizer } from './ai-humanizer';
// Tier 2 - Alto Valor
export { emotionArchitect } from './emotion-architect';
export { retentionEngineer } from './retention-engineer';
export { avatarMirrorer } from './avatar-mirrorer';
export { objectionCrusher } from './objection-crusher';
export { copySharpener } from './copy-sharpener';
// Tier 3 - Especializados
export { socialProofWeaver } from './social-proof-weaver';
export { platformOptimizer } from './platform-optimizer';
export { seoDiscoverer } from './seo-discoverer';
export { adComplianceChecker } from './ad-compliance-checker';
// Output Structurers
export { sceneDirector } from './scene-director';
export { brollGenerator } from './broll-generator';
export { captionGenerator } from './caption-generator';
