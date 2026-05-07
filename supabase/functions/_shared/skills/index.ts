/**
 * Sistema de Skills para Edge Functions (Deno)
 * 19 Skills especializados para generación de contenido UGC
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
} from './types.ts';

// Registry
export {
  skillsRegistry,
  getImplementedSkills,
  getSkillById,
  getActiveSkills,
  getSkillsForGeneration,
  interpolateSkillPrompt,
  buildCombinedSystemPrompt,
} from './registry.ts';

// Executor
export {
  executeSkillChain,
  executeSingleSkill,
  buildSkillInput,
  callAIWithSkill,
} from './executor.ts';

// Skills - Originales
export { hooksSpecialist } from './hooks-specialist.ts';
export { culturalAdapter } from './cultural-adapter.ts';
export { storytellingSpecialist } from './storytelling-specialist.ts';
export { ctaSpecialist } from './cta-specialist.ts';
export { viralityOptimizer } from './virality-optimizer.ts';
// Tier 1 - Críticos
export { trendInjector } from './trend-injector.ts';
export { neuroPersuader } from './neuro-persuader.ts';
export { aiHumanizer } from './ai-humanizer.ts';
// Tier 2 - Alto Valor
export { emotionArchitect } from './emotion-architect.ts';
export { retentionEngineer } from './retention-engineer.ts';
export { avatarMirrorer } from './avatar-mirrorer.ts';
export { objectionCrusher } from './objection-crusher.ts';
export { copySharpener } from './copy-sharpener.ts';
// Tier 3 - Especializados
export { socialProofWeaver } from './social-proof-weaver.ts';
export { platformOptimizer } from './platform-optimizer.ts';
export { seoDiscoverer } from './seo-discoverer.ts';
export { adComplianceChecker } from './ad-compliance-checker.ts';
// Output Structurers
export { sceneDirector } from './scene-director.ts';
export { brollGenerator } from './broll-generator.ts';
export { captionGenerator } from './caption-generator.ts';
