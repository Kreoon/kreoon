import { ResearchStep, truncateContext, extractTopPhrases } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step08Copywriting: ResearchStep = {
  number: 8,
  stepId: 'step_08_copywriting',
  tabKey: 'copy_angles',
  name: 'Copywriting Completo',
  description: '30 hooks, 30 headlines, 25 CTAs, sales angles, frameworks de copy',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab5 = prev['psychology'] || {}
    const tab7 = prev['positioning'] || {}

    const vocabulary = (tab5 as Record<string, unknown>)?.client_vocabulary
      ? truncateContext((tab5 as Record<string, unknown>).client_vocabulary, 500)
      : ''
    const puv = ((tab7 as Record<string, unknown>)?.puv as Record<string, unknown>)?.statement || ''
    const archetype = ((tab7 as Record<string, unknown>)?.brand_archetype as Record<string, unknown>)?.communication_tone
    const archetypeTone = Array.isArray(archetype) ? archetype.join(', ') : ''
    const founderPassion = ctx.product.emotional_analysis?.passion_topics?.join(', ') || ''

    const painPhrases = ctx.social?.pain_phrases?.length
      ? `\nFrases de dolor del mercado:\n${extractTopPhrases(ctx.social.pain_phrases, 8)}`
      : ''

    const desirePhrases = ctx.social?.desire_phrases?.length
      ? `\nFrases de deseo del mercado:\n${extractTopPhrases(ctx.social.desire_phrases, 8)}`
      : ''

    const systemPrompt = `Eres el copywriter más efectivo de LATAM. Experto en direct response y copy emocional.
Dominas los frameworks de Gary Halbert, Eugene Schwartz, David Ogilvy, Joe Sugarman y Drew Eric Whitman.
Creas copy que VENDE, no copy que suena bonito.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin explicaciones.
Usa español LATAM.`

    const userPrompt = `Genera el banco de copy COMPLETO para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
${puv ? `PUV: ${puv}` : ''}
${archetypeTone ? `Tono de comunicación: ${archetypeTone}` : ''}
${vocabulary ? `Vocabulario del cliente: ${vocabulary}` : ''}
${founderPassion ? `Temas de pasión del fundador: ${founderPassion}` : ''}
${painPhrases}
${desirePhrases}

PSICOLOGÍA DEL CLIENTE:
${truncateContext(tab5, 600)}

IMPORTANTE: Genera EXACTAMENTE 30 hooks, 30 headlines y 25 CTAs como arrays de strings.

Devuelve este JSON exacto:
{
  "sales_angles": [
    {
      "angle_name": "nombre del ángulo",
      "description": "descripción del ángulo y cuándo usarlo",
      "best_for": "para qué audiencia o etapa del funnel",
      "example_hook": "hook de ejemplo para este ángulo",
      "example_body": "cuerpo de ejemplo (2-3 oraciones)",
      "example_cta": "CTA de ejemplo para este ángulo"
    }
  ],
  "copy_frameworks": {
    "pas": {
      "problem": "Problema: texto completo",
      "agitation": "Agitación: texto completo",
      "solution": "Solución: texto completo"
    },
    "aida": {
      "attention": "Atención: texto completo",
      "interest": "Interés: texto completo",
      "desire": "Deseo: texto completo",
      "action": "Acción: texto completo"
    },
    "bab": {
      "before": "Antes: situación actual del cliente",
      "after": "Después: situación deseada",
      "bridge": "Puente: cómo el producto los lleva del antes al después"
    },
    "pastor": {
      "problem": "Problema: texto",
      "amplify": "Amplificar: texto",
      "story": "Historia: texto",
      "transformation": "Transformación: texto",
      "offer": "Oferta: texto",
      "response": "Respuesta esperada: texto"
    }
  },
  "hooks_bank": [
    "Hook 1: gancho persuasivo completo",
    "Hook 2: ...", "Hook 3: ...", "Hook 4: ...", "Hook 5: ...",
    "Hook 6: ...", "Hook 7: ...", "Hook 8: ...", "Hook 9: ...", "Hook 10: ...",
    "Hook 11: ...", "Hook 12: ...", "Hook 13: ...", "Hook 14: ...", "Hook 15: ...",
    "Hook 16: ...", "Hook 17: ...", "Hook 18: ...", "Hook 19: ...", "Hook 20: ...",
    "Hook 21: ...", "Hook 22: ...", "Hook 23: ...", "Hook 24: ...", "Hook 25: ...",
    "Hook 26: ...", "Hook 27: ...", "Hook 28: ...", "Hook 29: ...", "Hook 30: ..."
  ],
  "headlines_bank": [
    "Headline 1: titular persuasivo completo",
    "Headline 2: ...", "Headline 3: ...", "Headline 4: ...", "Headline 5: ...",
    "Headline 6: ...", "Headline 7: ...", "Headline 8: ...", "Headline 9: ...", "Headline 10: ...",
    "Headline 11: ...", "Headline 12: ...", "Headline 13: ...", "Headline 14: ...", "Headline 15: ...",
    "Headline 16: ...", "Headline 17: ...", "Headline 18: ...", "Headline 19: ...", "Headline 20: ...",
    "Headline 21: ...", "Headline 22: ...", "Headline 23: ...", "Headline 24: ...", "Headline 25: ...",
    "Headline 26: ...", "Headline 27: ...", "Headline 28: ...", "Headline 29: ...", "Headline 30: ..."
  ],
  "ctas_bank": [
    "CTA 1: llamado a la acción persuasivo",
    "CTA 2: ...", "CTA 3: ...", "CTA 4: ...", "CTA 5: ...",
    "CTA 6: ...", "CTA 7: ...", "CTA 8: ...", "CTA 9: ...", "CTA 10: ...",
    "CTA 11: ...", "CTA 12: ...", "CTA 13: ...", "CTA 14: ...", "CTA 15: ...",
    "CTA 16: ...", "CTA 17: ...", "CTA 18: ...", "CTA 19: ...", "CTA 20: ...",
    "CTA 21: ...", "CTA 22: ...", "CTA 23: ...", "CTA 24: ...", "CTA 25: ..."
  ],
  "power_phrases": {
    "urgency": ["frase de urgencia 1", "frase 2", "frase 3"],
    "scarcity": ["frase de escasez 1", "frase 2", "frase 3"],
    "social_proof": ["frase de prueba social 1", "frase 2", "frase 3"],
    "guarantee": ["frase de garantía 1", "frase 2", "frase 3"],
    "value_stack": ["frase de valor 1", "frase 2", "frase 3"]
  },
  "story_angles": [
    {
      "angle": "nombre del ángulo de historia",
      "setup": "cómo comenzar la historia",
      "conflict": "el conflicto/problema",
      "resolution": "la resolución/transformación",
      "where_to_use": "dónde usar esta historia"
    }
  ],
  "objection_handlers": [
    {
      "objection": "objeción del cliente",
      "copy_response": "copy para manejar la objeción",
      "technique_used": "técnica de persuasión usada"
    }
  ],
  "email_subject_lines": {
    "curiosity": ["subject 1", "subject 2", "subject 3"],
    "benefit": ["subject 1", "subject 2", "subject 3"],
    "urgency": ["subject 1", "subject 2", "subject 3"],
    "personal": ["subject 1", "subject 2", "subject 3"]
  }
}

IMPORTANTE: Los arrays hooks_bank, headlines_bank y ctas_bank deben tener EXACTAMENTE 30, 30 y 25 elementos respectivamente.
Cada elemento debe ser un texto COMPLETO y LISTO PARA USAR, no un placeholder.`

    return { systemPrompt, userPrompt }
  },
}
