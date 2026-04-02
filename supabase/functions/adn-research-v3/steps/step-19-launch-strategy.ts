import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step19LaunchStrategy: ResearchStep = {
  number: 19,
  stepId: 'step_19_launch_strategy',
  tabKey: 'launch_strategy',
  name: 'Estrategia de Lanzamiento',
  description: 'Plan de lanzamiento: pre-launch, launch, post-launch',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab9 = prev['offer'] || {}
    const tab12 = prev['lead_magnets'] || {}
    const tab14 = prev['meta_ads'] || {}

    const systemPrompt = `Eres un estratega de lanzamientos de productos experto en LATAM.
Dominas los frameworks de Jeff Walker (Product Launch Formula) y lanzamientos modernos.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de lanzamiento para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
URGENCIA: ${ctx.product.urgency}

OFERTA:
${truncateContext(tab9, 400)}

LEAD MAGNETS:
${truncateContext(tab12, 300)}

META ADS:
${truncateContext(tab14, 300)}

Devuelve este JSON exacto:
{
  "launch_overview": {
    "launch_type": "evergreen|live|hybrid",
    "total_duration": "duración total del lanzamiento",
    "primary_goal": "objetivo principal",
    "target_revenue": "revenue target USD",
    "target_customers": "número de clientes target"
  },
  "pre_launch": {
    "phase": "Pre-Lanzamiento",
    "duration": "duración de la fase",
    "goals": ["goal 1", "goal 2"],
    "key_activities": [
      {
        "activity": "actividad",
        "channel": "canal",
        "priority": "high|medium|low"
      }
    ],
    "success_metrics": ["métrica 1", "métrica 2"]
  },
  "launch": {
    "phase": "Lanzamiento",
    "duration": "duración de la fase",
    "goals": ["goal 1", "goal 2"],
    "key_activities": [
      {
        "activity": "actividad",
        "channel": "canal",
        "priority": "high|medium|low"
      }
    ],
    "success_metrics": ["métrica 1", "métrica 2"]
  },
  "post_launch": {
    "phase": "Post-Lanzamiento",
    "duration": "duración de la fase",
    "goals": ["goal 1", "goal 2"],
    "key_activities": [
      {
        "activity": "actividad",
        "channel": "canal",
        "priority": "high|medium|low"
      }
    ],
    "success_metrics": ["métrica 1", "métrica 2"]
  },
  "launch_offers": [
    {
      "name": "nombre de la oferta",
      "type": "early_bird|founders|limited|bonus",
      "description": "descripción de la oferta",
      "value_proposition": "propuesta de valor",
      "urgency_element": "elemento de urgencia",
      "scarcity_element": "elemento de escasez",
      "deadline": "fecha límite"
    }
  ],
  "waitlist_strategy": {
    "incentive": "incentivo para unirse a la waitlist",
    "nurture_sequence": ["email 1 tema", "email 2 tema", "email 3 tema"],
    "engagement_tactics": ["táctica 1", "táctica 2"]
  },
  "launch_content_calendar": [
    {
      "day": -7,
      "content_type": "tipo de contenido",
      "message_theme": "tema del mensaje",
      "channel": "canal",
      "cta": "call to action"
    }
  ],
  "partner_strategy": {
    "affiliate_structure": "estructura de afiliados",
    "partner_types": ["tipo de partner 1", "tipo 2"],
    "outreach_template": "template de outreach"
  },
  "contingency_plans": [
    {
      "risk": "riesgo potencial",
      "mitigation": "plan de mitigación"
    }
  ],
  "launch_day_checklist": [
    "tarea del día de lanzamiento 1",
    "tarea 2",
    "tarea 3",
    "tarea 4",
    "tarea 5"
  ],
  "post_launch_optimization": {
    "first_48_hours": "qué hacer en las primeras 48h",
    "first_week": "qué hacer en la primera semana",
    "first_month": "qué hacer en el primer mes"
  },
  "summary": "estrategia de lanzamiento resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
