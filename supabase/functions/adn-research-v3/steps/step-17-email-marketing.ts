import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step17EmailMarketing: ResearchStep = {
  number: 17,
  stepId: 'step_17_email_marketing',
  tabKey: 'email_marketing',
  name: 'Email Marketing',
  description: 'Secuencias de email, subject lines, automatizaciones',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab5 = prev['psychology'] || {}
    const tab8 = prev['copy_angles'] || {}
    const tab9 = prev['offer'] || {}
    const tab12 = prev['lead_magnets'] || {}

    const systemPrompt = `Eres un experto en email marketing y automatizaciones para LATAM.
Creas secuencias que nutren, educan y convierten.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de email marketing para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

PSICOLOGÍA:
${truncateContext(tab5, 400)}

COPY ANGLES:
${truncateContext(tab8, 300)}

OFERTA:
${truncateContext(tab9, 300)}

LEAD MAGNETS:
${truncateContext(tab12, 300)}

Devuelve este JSON exacto:
{
  "strategy_overview": {
    "primary_goals": ["goal 1", "goal 2"],
    "email_frequency": "frecuencia recomendada",
    "best_send_times": ["hora 1", "hora 2"],
    "list_building_tactics": ["táctica 1", "táctica 2"]
  },
  "welcome_sequence": {
    "name": "Secuencia de Bienvenida",
    "trigger": "suscripción al lead magnet",
    "goal": "objetivo de la secuencia",
    "emails": [
      {
        "day": 0,
        "subject": "subject line",
        "objective": "objetivo del email",
        "key_message": "mensaje clave"
      }
    ]
  },
  "nurture_sequence": {
    "name": "Secuencia de Nurturing",
    "trigger": "después de welcome sequence",
    "goal": "objetivo de la secuencia",
    "emails": [
      {
        "day": 7,
        "subject": "subject line",
        "objective": "objetivo del email",
        "key_message": "mensaje clave"
      }
    ]
  },
  "sales_sequence": {
    "name": "Secuencia de Venta",
    "trigger": "evento de activación",
    "goal": "conversión",
    "emails": [
      {
        "day": 0,
        "subject": "subject line",
        "objective": "objetivo del email",
        "key_message": "mensaje clave"
      }
    ]
  },
  "broadcast_templates": [
    {
      "name": "nombre del template",
      "type": "newsletter|promotion|announcement|education",
      "subject_lines": ["subject 1", "subject 2"],
      "preview_text": "preview text",
      "body_outline": ["sección 1", "sección 2", "sección 3"],
      "cta": "call to action",
      "send_timing": "cuándo enviar"
    }
  ],
  "subject_line_formulas": [
    "fórmula de subject line 1",
    "fórmula 2",
    "fórmula 3",
    "fórmula 4",
    "fórmula 5"
  ],
  "segmentation_strategy": [
    {
      "segment": "nombre del segmento",
      "criteria": "criterios de segmentación",
      "messaging_focus": "enfoque del mensaje para este segmento"
    }
  ],
  "automation_triggers": [
    {
      "trigger": "evento que dispara",
      "action": "email o secuencia que se envía"
    }
  ],
  "re_engagement_sequence": {
    "trigger": "inactividad de X días",
    "emails": [
      {
        "day": 0,
        "subject": "subject line",
        "approach": "enfoque del email"
      }
    ]
  },
  "post_purchase_sequence": {
    "goal": "retención y upsell",
    "emails": [
      {
        "day": 0,
        "type": "confirmación|onboarding|feedback|upsell",
        "subject": "subject line"
      }
    ]
  },
  "kpis": [
    {
      "metric": "métrica",
      "target": "objetivo"
    }
  ],
  "summary": "estrategia de email resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
