import { ResearchStep, truncateContext, extractTopPhrases } from './index.ts'
import { MasterContext } from '../context-builder.ts'

// PASO 5: El más crítico para copywriting
// Cruza: JTBD + Avatares + Social Intelligence + Voz del fundador
export const step05Psychology: ResearchStep = {
  number: 5,
  stepId: 'step_05_psychology',
  tabKey: 'psychology',
  name: 'Psicología Profunda del Cliente',
  description: 'Dolores, deseos, sesgos cognitivos, principios Cialdini, banco de objeciones',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab3 = prev['jtbd'] || {}
    const tab4 = prev['avatars'] || {}

    // Inyectar frases REALES del social intelligence
    const painPhrases = ctx.social?.pain_phrases?.length
      ? `FRASES EXACTAS DE DOLOR (como las dice la gente real en reviews y comentarios):\n${extractTopPhrases(ctx.social.pain_phrases, 10)}`
      : ''

    const desirePhrases = ctx.social?.desire_phrases?.length
      ? `FRASES EXACTAS DE DESEO (como las expresa la gente real):\n${extractTopPhrases(ctx.social.desire_phrases, 10)}`
      : ''

    const realObjections = ctx.social?.real_objections?.length
      ? `OBJECIONES REALES ANTES DE COMPRAR (palabras exactas):\n${ctx.social.real_objections.slice(0, 8).map((o, i) => `${i + 1}. "${(o as Record<string, unknown>).objection}" (${(o as Record<string, unknown>).type})`).join('\n')}`
      : ''

    const vocab = ctx.social?.common_vocabulary?.length
      ? `VOCABULARIO REAL DEL MERCADO:\n${ctx.social.common_vocabulary.slice(0, 15).map(v => `"${(v as Record<string, unknown>).word}" — ${(v as Record<string, unknown>).context} (${(v as Record<string, unknown>).emotional_charge})`).join('\n')}`
      : ''

    const founderVoice = [
      ctx.product.user_responses.q3_problem,
      ctx.product.user_responses.q4_transformation,
    ].filter(Boolean).join('\n').slice(0, 600)

    const systemPrompt = `Eres un psicólogo del consumidor y experto en copywriting persuasivo especializado en LATAM.
Dominas los frameworks de Eugene Schwartz (Breakthrough Advertising), Robert Cialdini (Influence + Pre-Suasion),
Daniel Kahneman (Thinking Fast and Slow), y Drew Eric Whitman (CA$HVERTISING - Lifeforce 8).
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin texto extra.
Usa español LATAM.`

    const userPrompt = `Crea el mapa psicológico profundo del cliente ideal de:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

CONTEXT DEL AVATAR PRINCIPAL (ya analizado):
${truncateContext(tab4, 800)}

JOBS TO BE DONE (ya analizado):
${truncateContext(tab3, 600)}

${painPhrases}

${desirePhrases}

${realObjections}

${vocab}

VOZ DEL FUNDADOR sobre el problema (transcripción):
${founderVoice || 'No disponible'}

ÁREAS DE INSEGURIDAD DEL FUNDADOR (del análisis emocional):
${ctx.product.emotional_analysis.concern_areas.join(', ') || 'No disponible'}

Devuelve este JSON exacto:
{
  "pain_map": {
    "functional_pains": [
      {
        "pain": "dolor funcional en palabras del cliente, NO del copy",
        "intensity": 8,
        "frequency": "diario|semanal|mensual",
        "trigger": "qué situación específica lo activa"
      }
    ],
    "emotional_pains": [
      {
        "emotion": "emoción específica que siente",
        "what_causes_it": "qué la genera",
        "peak_moment": "cuándo es más intenso"
      }
    ],
    "social_pains": [
      {
        "fear": "qué teme que otros vean o piensen de él/ella"
      }
    ],
    "root_pain": "el miedo existencial más profundo — la historia que se cuenta a sí mismo"
  },
  "desire_map": {
    "functional_desires": [
      {
        "desire": "qué quiere lograr concretamente",
        "urgency": 8,
        "blocker": "qué le impide lograrlo ahora"
      }
    ],
    "emotional_desires": [
      {
        "state": "estado emocional que busca",
        "intensity": 9,
        "delivery": "cómo el producto entrega este estado"
      }
    ],
    "aspirational_desires": [
      {
        "aspiration": "en quién quiere convertirse"
      }
    ],
    "deep_desire": "la frase: 'Quiero ser el tipo de persona que...'"
  },
  "cialdini_principles": {
    "reciprocity": {
      "what_to_give_first": "qué valor dar antes de pedir la venta",
      "implementation": "cómo implementarlo concretamente"
    },
    "commitment_consistency": {
      "micro_commitment": "primer pequeño compromiso a pedir",
      "escalation_path": "cómo escalar desde ese micro-compromiso"
    },
    "social_proof": {
      "most_powerful_type": "testimonial_video|caso_estudio|cifras|endorsement|ugc|comunidad",
      "what_to_show": "qué prueba social específica impacta más a este avatar",
      "implementation": "cómo mostrarlo"
    },
    "authority": {
      "credibility_signals": ["señales de autoridad que resuenan con este avatar"],
      "how_to_build_fast": "cómo construir autoridad rápidamente para este producto"
    },
    "liking": {
      "similarity_factors": ["en qué el comunicador debe parecerse al avatar"],
      "rapport_builders": ["qué construye simpatía rápida"]
    },
    "scarcity": {
      "type": "genuine|artificial|mixed",
      "most_credible_version": "cómo comunicar escasez de forma creíble para este mercado"
    }
  },
  "cognitive_biases": [
    {
      "bias": "nombre del sesgo",
      "relevance": "alta|media|baja",
      "how_to_use": "cómo aplicarlo específicamente para este producto en LATAM",
      "copy_example": "ejemplo de copy o elemento que aplica el sesgo"
    }
  ],
  "lifeforce_8": [
    {
      "desire": "nombre del deseo Lifeforce-8",
      "relevance": "alta|media|baja|no_aplica",
      "application": "cómo conectar el producto con este deseo"
    }
  ],
  "objections_bank": [
    {
      "objection": "objeción en palabras EXACTAS como la diría el cliente",
      "source": "social_intelligence|founder_audio|inference",
      "type": "precio|tiempo|confianza|prioridad|complejidad|urgencia|alternativa",
      "underlying_emotion": "emoción real detrás de la objeción",
      "handling_technique": "feel_felt_found|reframe|social_proof|garantia|precio_vs_costo|urgencia",
      "sales_script": "texto exacto para responder esta objeción en una llamada de ventas",
      "content_neutralizer": "tipo de contenido para neutralizarla ANTES de que aparezca"
    }
  ],
  "client_vocabulary": {
    "words_they_use_for_pain": ["palabras exactas que usan para describir su problema"],
    "words_they_use_for_desire": ["palabras exactas para el resultado que quieren"],
    "search_queries": ["cómo buscan soluciones en Google y TikTok"],
    "recommendation_language": ["cómo recomiendan productos similares"],
    "words_that_create_friction": ["palabras de marketing que les generan desconfianza"],
    "power_words_for_this_avatar": ["palabras de alto impacto emocional para este perfil"]
  }
}`

    return { systemPrompt, userPrompt }
  },
}
