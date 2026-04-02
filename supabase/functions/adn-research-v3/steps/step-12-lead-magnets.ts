import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step12LeadMagnets: ResearchStep = {
  number: 12,
  stepId: 'step_12_lead_magnets',
  tabKey: 'lead_magnets',
  name: 'Lead Magnets',
  description: 'Ideas de lead magnets y recursos gratuitos para capturar leads',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab3 = prev['jtbd'] || {}
    const tab5 = prev['psychology'] || {}
    const tab9 = prev['offer'] || {}

    const systemPrompt = `Eres un experto en generación de leads y marketing de contenidos para LATAM.
Creas lead magnets que atraen leads cualificados y preparan para la venta.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña los lead magnets para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

JOBS TO BE DONE:
${truncateContext(tab3, 400)}

PSICOLOGÍA:
${truncateContext(tab5, 400)}

OFERTA:
${truncateContext(tab9, 300)}

Devuelve este JSON exacto:
{
  "funnel_strategy": {
    "awareness_magnet": "lead magnet para etapa de awareness",
    "consideration_magnet": "lead magnet para etapa de consideración",
    "decision_magnet": "lead magnet para etapa de decisión"
  },
  "recommended_lead_magnets": [
    {
      "title": "título del lead magnet",
      "format": "ebook|checklist|template|video|quiz|calculator|webinar|mini_course",
      "description": "descripción de qué es y qué incluye",
      "target_avatar": "para qué avatar es ideal",
      "problem_solved": "qué problema específico resuelve",
      "perceived_value": "valor percibido alto|medio",
      "production_effort": "bajo|medio|alto",
      "conversion_potential": 85,
      "outline": ["punto 1", "punto 2", "punto 3", "punto 4", "punto 5"],
      "landing_page_headline": "headline para la landing del lead magnet",
      "email_sequence_hook": "hook para la secuencia de emails post-descarga"
    }
  ],
  "quick_wins": [
    {
      "idea": "idea de lead magnet rápido",
      "format": "formato",
      "time_to_create": "tiempo para crearlo"
    }
  ],
  "content_upgrades": [
    {
      "blog_topic": "tema de blog",
      "upgrade_idea": "content upgrade relacionado"
    }
  ],
  "quiz_funnel": {
    "quiz_title": "título del quiz",
    "quiz_hook": "hook del quiz",
    "number_of_questions": 7,
    "question_examples": [
      "pregunta 1",
      "pregunta 2",
      "pregunta 3"
    ],
    "result_types": [
      {
        "result": "tipo de resultado",
        "description": "descripción del resultado",
        "recommended_offer": "oferta recomendada para este resultado"
      }
    ]
  },
  "webinar_concept": {
    "title": "título del webinar",
    "hook": "hook del webinar",
    "duration": "60-90 minutos",
    "structure": [
      {
        "section": "sección",
        "duration": "duración",
        "content": "qué cubrir"
      }
    ],
    "offer_transition": "cómo transicionar a la oferta"
  },
  "challenge_concept": {
    "name": "nombre del challenge",
    "duration": "5|7|14|21|30 días",
    "daily_structure": [
      {
        "day": 1,
        "theme": "tema del día",
        "task": "tarea del día",
        "deliverable": "qué entregan"
      }
    ],
    "community_element": "elemento de comunidad",
    "graduation_offer": "oferta al graduarse"
  },
  "distribution_strategy": {
    "organic_channels": ["canal 1", "canal 2"],
    "paid_channels": ["canal 1", "canal 2"],
    "partnership_opportunities": ["oportunidad 1", "oportunidad 2"]
  },
  "summary": "los 2 lead magnets prioritarios y por qué"
}`

    return { systemPrompt, userPrompt }
  },
}
