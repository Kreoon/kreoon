import { Skill, SkillType, SkillContext } from './types.ts';
// Skills originales
import { hooksSpecialist } from './hooks-specialist.ts';
import { culturalAdapter } from './cultural-adapter.ts';
import { storytellingSpecialist } from './storytelling-specialist.ts';
import { ctaSpecialist } from './cta-specialist.ts';
import { viralityOptimizer } from './virality-optimizer.ts';
// Tier 1: Críticos
import { trendInjector } from './trend-injector.ts';
import { neuroPersuader } from './neuro-persuader.ts';
import { aiHumanizer } from './ai-humanizer.ts';
// Tier 2: Alto Valor
import { emotionArchitect } from './emotion-architect.ts';
import { retentionEngineer } from './retention-engineer.ts';
import { avatarMirrorer } from './avatar-mirrorer.ts';
import { objectionCrusher } from './objection-crusher.ts';
import { copySharpener } from './copy-sharpener.ts';
// Tier 3: Especializados
import { socialProofWeaver } from './social-proof-weaver.ts';
import { platformOptimizer } from './platform-optimizer.ts';
import { seoDiscoverer } from './seo-discoverer.ts';
import { adComplianceChecker } from './ad-compliance-checker.ts';
// Output Structurers
import { sceneDirector } from './scene-director.ts';
import { brollGenerator } from './broll-generator.ts';
import { captionGenerator } from './caption-generator.ts';
// Método C·O·N·V·E·R·T (Kreoon)
import { consciousnessMapper } from './consciousness-mapper.ts';
import { storybrandArchitect } from './storybrand-architect.ts';
import { offerEngineer } from './offer-engineer.ts';
import { socialFunnelBuilder } from './social-funnel-builder.ts';
import { productionDirector } from './production-director.ts';
import { landingPageArchitect } from './landing-page-architect.ts';
import { whatsappCloser } from './whatsapp-closer.ts';
import { paidAdsArchitect } from './paid-ads-architect.ts';
import { emailSequenceBuilder } from './email-sequence-builder.ts';
import { durationAdjuster } from './duration-adjuster.ts';
// Skills fusionados v2 — mayor velocidad sin perder calidad
import { contextIntelligence } from './context-intelligence.ts';
import { hookNarrativeEngine } from './hook-narrative-engine.ts';
import { persuasionMaster } from './persuasion-master.ts';
import { scriptPolisher } from './script-polisher.ts';

/**
 * Registro de Skills disponibles (20 skills)
 *
 * Cadena de ejecución por prioridad (mayor a menor):
 * 1.  trend_injector (10.5) - Inyecta contexto trending
 * 2.  hooks_specialist (10) - Genera hooks virales
 * 3.  avatar_mirrorer (9.8) - Refleja lenguaje del avatar
 * 4.  emotion_architect (9.5) - Diseña arco emocional
 * 5.  cultural_adapter (9) - Adapta jerga al país
 * 6.  retention_engineer (8.8) - Optimiza retención
 * 7.  neuro_persuader (8.5) - Neuromarketing
 * 8.  storytelling_specialist (8) - Construye narrativa
 * 9.  social_proof_weaver (7.8) - Prueba social natural
 * 10. objection_crusher (7.5) - Maneja objeciones
 * 11. cta_specialist (7) - Genera CTA optimizado
 * 12. copy_sharpener (6.5) - Pulido de copy
 * 13. virality_optimizer (6) - Optimizaciones finales
 * 14. ai_humanizer (5) - Humaniza contenido
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
  // Método C·O·N·V·E·R·T (Kreoon)
  consciousness_mapper: consciousnessMapper,
  storybrand_architect: storybrandArchitect,
  offer_engineer: offerEngineer,
  social_funnel_builder: socialFunnelBuilder,
  production_director: productionDirector,
  landing_page_architect: landingPageArchitect,
  whatsapp_closer: whatsappCloser,
  paid_ads_architect: paidAdsArchitect,
  email_sequence_builder: emailSequenceBuilder,
  duration_adjuster: durationAdjuster,
  // Skills fusionados v2 — 4 fases, ~50% menos tiempo
  context_intelligence: contextIntelligence,
  hook_narrative_engine: hookNarrativeEngine,
  persuasion_master: persuasionMaster,
  script_polisher: scriptPolisher,
};

// Fases por tipo de bloque. Dentro de cada fase los skills corren en PARALELO;
// las fases corren en SECUENCIA pasando el output acumulado a la siguiente.
// v2: 4 fases fusionadas (~7 llamadas vs 17 anteriores) ≈ 30-40s para "script".
const SKILL_PHASES_BY_GENERATION_TYPE: Partial<Record<string, SkillType[][]>> = {
  script: [
    // Fase 1 — Análisis de contexto (1 llamada: consciencia + avatar + tendencias)
    ['context_intelligence'],
    // Fase 2 — Generación del guión completo (2 llamadas paralelas)
    ['hook_narrative_engine', 'persuasion_master'],
    // Fase 3 — Versión definitiva: copy + humanización + CTA + duración (1 llamada)
    ['script_polisher'],
  ],
  director: [
    ['scene_director', 'production_director'],
  ],
  broll: [
    ['broll_generator'],
  ],
  captions: [
    ['caption_generator'],
  ],
  marketing: [
    ['paid_ads_architect', 'social_funnel_builder'],
    ['offer_engineer'],
  ],
};

/**
 * Obtiene todos los skills implementados
 */
export function getImplementedSkills(): Skill[] {
  return Object.values(skillsRegistry).filter(
    (skill): skill is Skill => skill !== null && skill !== undefined
  );
}

/**
 * Obtiene un skill por ID
 */
export function getSkillById(id: SkillType): Skill | null {
  return skillsRegistry[id] || null;
}

/**
 * Devuelve las fases de skills para un tipo de generación.
 * Cada fase es un array de Skills que se ejecutan en paralelo.
 * Las fases son secuenciales entre sí.
 */
export function getSkillPhases(generation_type?: string): Skill[][] | null {
  if (!generation_type) return null;
  const phaseIds = SKILL_PHASES_BY_GENERATION_TYPE[generation_type];
  if (!phaseIds) return null;

  return phaseIds
    .map((phase) =>
      phase
        .map((id) => skillsRegistry[id])
        .filter((s): s is Skill => s !== null && s !== undefined)
    )
    .filter((phase) => phase.length > 0);
}

/**
 * Obtiene skills activos según contexto (lista plana, para uso sin fases).
 * Si se provee generation_type, deriva la lista de SKILL_PHASES_BY_GENERATION_TYPE.
 * Fallback: usa los triggers originales (always / sphere_phase / etc.).
 */
export function getActiveSkills(context: {
  sphere_phase?: string;
  consciousness_level?: string;
  narrative_structure?: string;
  generation_type?: string;
}): Skill[] {
  const implementedSkills = getImplementedSkills();

  if (context.generation_type && SKILL_PHASES_BY_GENERATION_TYPE[context.generation_type]) {
    const phaseIds = SKILL_PHASES_BY_GENERATION_TYPE[context.generation_type]!.flat();
    const allowedIds = new Set<string>(phaseIds);
    return implementedSkills
      .filter((skill) => allowedIds.has(skill.id))
      .sort((a, b) => b.priority - a.priority);
  }

  return implementedSkills
    .filter((skill) => {
      const { triggers } = skill;

      if (triggers.always) return true;

      if (
        triggers.sphere_phase &&
        context.sphere_phase &&
        triggers.sphere_phase.includes(context.sphere_phase)
      ) {
        return true;
      }

      if (
        triggers.consciousness_level &&
        context.consciousness_level &&
        triggers.consciousness_level.includes(context.consciousness_level)
      ) {
        return true;
      }

      if (
        triggers.narrative_structure &&
        context.narrative_structure &&
        triggers.narrative_structure.includes(context.narrative_structure)
      ) {
        return true;
      }

      return false;
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Obtiene skills para generación según el contexto completo (incluyendo generation_type)
 */
export function getSkillsForGeneration(context: SkillContext): Skill[] {
  return getActiveSkills({
    sphere_phase: context.formData.sphere_phase,
    consciousness_level: context.formData.consciousness_level,
    narrative_structure: context.formData.narrative_structure,
    generation_type: context.formData.generation_type,
  });
}

/**
 * Interpola variables en un prompt de skill
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

/**
 * Construye el prompt combinado de múltiples skills
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
 * Variante para modo research (ADN Recargado V2).
 * Strip-ea las secciones `# OUTPUT` de cada skill (que dictan HTML)
 * y agrega un override JSON-only al final.
 *
 * Las skills aportan PRINCIPIOS (cómo pensar), no formato de salida.
 * El formato lo dicta el schema en el user prompt.
 */
export function buildCombinedSystemPromptForResearch(
  skills: Skill[],
  basePrompt: string
): string {
  const skillPrompts = skills
    .map((skill) => {
      // Eliminar la seccion `# OUTPUT` y todo lo que sigue
      const trimmed = skill.systemPrompt.split(/^#\s*OUTPUT\b/im)[0].trim();
      return `
# ══════════════════════════════════════════════════════════════
# SKILL: ${skill.name.toUpperCase()}
# Prioridad: ${skill.priority}/10
# ══════════════════════════════════════════════════════════════

${trimmed}
`;
    })
    .join('\n\n');

  return `${basePrompt}

# SKILLS ACTIVOS (aplica sus PRINCIPIOS al generar el JSON)

${skillPrompts}

# ══════════════════════════════════════════════════════════════
# INSTRUCCIÓN FINAL DE OUTPUT (OVERRIDE)
# ══════════════════════════════════════════════════════════════

CRÍTICO: Ignora cualquier instrucción de output en HTML, markdown o texto que aparezca arriba.
Tu output DEBE ser ÚNICAMENTE JSON válido conforme al schema indicado en el user prompt.
- NO uses backticks ni \`\`\`json
- NO agregues explicaciones antes o después del JSON
- NO uses comentarios JSON
- Empieza tu respuesta DIRECTAMENTE con { y termínala con }
- Si un campo no tiene datos suficientes, usa string vacío "" o array vacío []`;
}
