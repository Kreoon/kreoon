import { ResearchStep, truncateContext, extractTopPhrases } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step03JTBD: ResearchStep = {
  number: 3,
  stepId: 'step_03_jtbd',
  tabKey: 'jtbd',
  name: 'Jobs To Be Done',
  description: 'Framework JTBD: trabajos funcionales, emocionales y sociales del cliente',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}
    const tab2 = prev['competition'] || {}

    const painPhrases = ctx.social?.pain_phrases?.length
      ? `\nFrases de dolor reales:\n${extractTopPhrases(ctx.social.pain_phrases, 8)}`
      : ''

    const desirePhrases = ctx.social?.desire_phrases?.length
      ? `\nFrases de deseo reales:\n${extractTopPhrases(ctx.social.desire_phrases, 8)}`
      : ''

    const founderVoice = [
      ctx.product.user_responses.q2_ideal_client,
      ctx.product.user_responses.q3_problem,
      ctx.product.user_responses.q4_transformation,
    ].filter(Boolean).join('\n').slice(0, 800)

    const systemPrompt = `Eres un experto en el framework Jobs To Be Done (JTBD) de Clayton Christensen y Bob Moesta.
Analizas qué "trabajo" contrata el cliente cuando compra un producto/servicio.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Aplica el framework Jobs To Be Done para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
OBJETIVO: ${ctx.product.goal}
${painPhrases}
${desirePhrases}

VOZ DEL FUNDADOR sobre el cliente ideal y problema:
${founderVoice || 'No disponible'}

CONTEXTO DE MERCADO:
${truncateContext(tab1, 400)}

CONTEXTO COMPETITIVO:
${truncateContext(tab2, 400)}

Devuelve este JSON exacto:
{
  "main_job": {
    "job_statement": "Cuando [situación], quiero [motivación], para poder [resultado esperado]",
    "job_type": "funcional|emocional|social",
    "frequency": "diario|semanal|mensual|ocasional",
    "importance": 9
  },
  "functional_jobs": [
    {
      "job": "descripción del trabajo funcional",
      "current_solution": "cómo lo resuelven ahora",
      "pain_with_current": "dolor con la solución actual",
      "desired_outcome": "resultado deseado"
    }
  ],
  "emotional_jobs": [
    {
      "job": "descripción del trabajo emocional",
      "feeling_sought": "sentimiento que buscan",
      "feeling_avoided": "sentimiento que evitan"
    }
  ],
  "social_jobs": [
    {
      "job": "descripción del trabajo social",
      "perception_desired": "cómo quieren ser percibidos",
      "group_identity": "grupo con el que quieren identificarse"
    }
  ],
  "hiring_triggers": [
    {
      "trigger": "evento que dispara la búsqueda de solución",
      "urgency": "alta|media|baja",
      "emotional_state": "estado emocional en ese momento"
    }
  ],
  "firing_triggers": [
    {
      "trigger": "qué hace que abandonen la solución actual",
      "last_straw": "la gota que derrama el vaso"
    }
  ],
  "progress_makers": [
    {
      "force": "fuerza que empuja hacia el cambio",
      "type": "push_away|pull_toward",
      "strength": "fuerte|moderada|débil"
    }
  ],
  "progress_blockers": [
    {
      "force": "fuerza que frena el cambio",
      "type": "anxiety|habit",
      "how_to_overcome": "cómo superar este bloqueador"
    }
  ],
  "timeline": {
    "first_thought": "cuándo tienen el primer pensamiento",
    "passive_looking": "cuánto tiempo buscan pasivamente",
    "active_looking": "cuánto tiempo buscan activamente",
    "decision": "cuánto tarda la decisión final"
  },
  "job_stories": [
    {
      "situation": "cuando estoy en esta situación...",
      "motivation": "quiero lograr esto...",
      "outcome": "para poder tener este resultado"
    }
  ],
  "summary": "resumen del JTBD principal en 2-3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
