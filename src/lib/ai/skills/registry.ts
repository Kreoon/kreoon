import { Skill, SkillType, SkillContext } from './types';
// Skills originales
import { hooksSpecialist } from './hooks-specialist';
import { culturalAdapter } from './cultural-adapter';
import { storytellingSpecialist } from './storytelling-specialist';
import { ctaSpecialist } from './cta-specialist';
import { viralityOptimizer } from './virality-optimizer';
// Tier 1: Críticos
import { trendInjector } from './trend-injector';
import { neuroPersuader } from './neuro-persuader';
import { aiHumanizer } from './ai-humanizer';
// Tier 2: Alto Valor
import { emotionArchitect } from './emotion-architect';
import { retentionEngineer } from './retention-engineer';
import { avatarMirrorer } from './avatar-mirrorer';
import { objectionCrusher } from './objection-crusher';
import { copySharpener } from './copy-sharpener';
// Tier 3: Especializados
import { socialProofWeaver } from './social-proof-weaver';
import { platformOptimizer } from './platform-optimizer';
import { seoDiscoverer } from './seo-discoverer';
import { adComplianceChecker } from './ad-compliance-checker';
// Output Structurers
import { sceneDirector } from './scene-director';
import { brollGenerator } from './broll-generator';
import { captionGenerator } from './caption-generator';

/**
 * Registro centralizado de todos los Skills disponibles (20 skills)
 *
 * Cadena de ejecución por prioridad (mayor a menor):
 * 1.  trend_injector (10.5) - Inyecta contexto trending
 * 2.  hooks_specialist (10) - Genera hooks virales
 * 3.  avatar_mirrorer (9.8) - Refleja lenguaje del avatar
 * 4.  emotion_architect (9.5) - Diseña arco emocional
 * 5.  cultural_adapter (9) - Adapta jerga al país
 * 6.  retention_engineer (8.8) - Optimiza retención
 * 7.  neuro_persuader (8.5) - Neuromarketing y persuasión
 * 8.  storytelling_specialist (8) - Construye narrativa
 * 9.  social_proof_weaver (7.8) - Prueba social natural
 * 10. objection_crusher (7.5) - Maneja objeciones
 * 11. cta_specialist (7) - Genera CTA optimizado
 * 12. copy_sharpener (6.5) - Pulido de copy
 * 13. virality_optimizer (6) - Optimizaciones de viralidad
 * 14. ai_humanizer (5) - Humaniza y elimina patrones IA
 * 15. seo_discoverer (4.5) - SEO para plataformas
 * 16. platform_optimizer (4) - Ajuste por plataforma
 * 17. scene_director (3.5) - Tabla de producción por escenas
 * 18. ad_compliance_checker (3) - Compliance de ads
 * 19. caption_generator (2.5) - 4 variaciones de captions
 * 20. broll_generator (1.5) - Ideas de B-Roll para video
 */
export const skillsRegistry: Partial<Record<SkillType, Skill>> = {
  // Tier 1: Críticos + Originales
  trend_injector: trendInjector,
  hooks_specialist: hooksSpecialist,
  avatar_mirrorer: avatarMirrorer,
  emotion_architect: emotionArchitect,
  cultural_adapter: culturalAdapter,
  retention_engineer: retentionEngineer,
  neuro_persuader: neuroPersuader,
  storytelling_specialist: storytellingSpecialist,
  // Tier 2: Alto Valor
  social_proof_weaver: socialProofWeaver,
  objection_crusher: objectionCrusher,
  cta_specialist: ctaSpecialist,
  copy_sharpener: copySharpener,
  virality_optimizer: viralityOptimizer,
  ai_humanizer: aiHumanizer,
  // Tier 3: Especializados
  seo_discoverer: seoDiscoverer,
  platform_optimizer: platformOptimizer,
  ad_compliance_checker: adComplianceChecker,
  // Output Structurers
  scene_director: sceneDirector,
  broll_generator: brollGenerator,
  caption_generator: captionGenerator,
};

/**
 * Obtiene todos los skills implementados (no null)
 */
export function getImplementedSkills(): Skill[] {
  return Object.values(skillsRegistry).filter(
    (skill): skill is Skill => skill !== null
  );
}

/**
 * Obtiene un skill por su ID
 */
export function getSkillById(id: SkillType): Skill | null {
  return skillsRegistry[id] || null;
}

/**
 * Determina qué skills deben activarse según el contexto
 *
 * @param context - Contexto con sphere_phase, consciousness_level, narrative_structure
 * @returns Array de skills ordenados por prioridad (mayor a menor)
 */
export function getActiveSkills(context: {
  sphere_phase?: string;
  consciousness_level?: string;
  narrative_structure?: string;
}): Skill[] {
  const implementedSkills = getImplementedSkills();

  return implementedSkills
    .filter((skill) => {
      const { triggers } = skill;

      // Si always = true, siempre incluir
      if (triggers.always) return true;

      // Verificar triggers por sphere_phase
      if (
        triggers.sphere_phase &&
        context.sphere_phase &&
        triggers.sphere_phase.includes(context.sphere_phase)
      ) {
        return true;
      }

      // Verificar triggers por consciousness_level
      if (
        triggers.consciousness_level &&
        context.consciousness_level &&
        triggers.consciousness_level.includes(context.consciousness_level)
      ) {
        return true;
      }

      // Verificar triggers por narrative_structure
      if (
        triggers.narrative_structure &&
        context.narrative_structure &&
        triggers.narrative_structure.includes(context.narrative_structure)
      ) {
        return true;
      }

      return false;
    })
    .sort((a, b) => b.priority - a.priority); // Ordenar por prioridad descendente
}

/**
 * Obtiene los skills activos para un contexto completo de generación
 */
export function getSkillsForGeneration(context: SkillContext): Skill[] {
  return getActiveSkills({
    sphere_phase: context.formData.sphere_phase,
    consciousness_level: context.formData.consciousness_level,
    narrative_structure: context.formData.narrative_structure,
  });
}

/**
 * Valida que todos los skills requeridos estén disponibles
 */
export function validateRequiredSkills(requiredIds: SkillType[]): {
  valid: boolean;
  missing: SkillType[];
} {
  const missing = requiredIds.filter((id) => !skillsRegistry[id]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Obtiene metadatos de todos los skills para UI
 */
export function getSkillsMetadata(): Array<{
  id: SkillType;
  name: string;
  description: string;
  priority: number;
  implemented: boolean;
}> {
  return (Object.entries(skillsRegistry) as [SkillType, Skill | null][]).map(
    ([id, skill]) => ({
      id,
      name: skill?.name || `${id} (no implementado)`,
      description: skill?.description || 'Pendiente de implementación',
      priority: skill?.priority || 0,
      implemented: skill !== null,
    })
  );
}

/**
 * Construye el prompt del sistema combinando múltiples skills
 *
 * @param skills - Array de skills a combinar
 * @param basePrompt - Prompt base opcional para incluir antes
 * @returns Prompt combinado
 */
export function buildCombinedSystemPrompt(
  skills: Skill[],
  basePrompt?: string
): string {
  const skillPrompts = skills
    .map((skill) => {
      return `
# ══════════════════════════════════════════════════════════════
# SKILL: ${skill.name.toUpperCase()}
# Prioridad: ${skill.priority}/10
# ══════════════════════════════════════════════════════════════

${skill.systemPrompt}
`;
    })
    .join('\n\n');

  if (basePrompt) {
    return `${basePrompt}\n\n# SKILLS ACTIVOS\n\n${skillPrompts}`;
  }

  return skillPrompts;
}

/**
 * Interpola variables en un prompt de skill
 *
 * @param prompt - Prompt con placeholders {variable}
 * @param variables - Objeto con valores para reemplazar
 * @returns Prompt con variables interpoladas
 */
export function interpolateSkillPrompt(
  prompt: string,
  variables: Record<string, string | number | undefined>
): string {
  return prompt.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}
