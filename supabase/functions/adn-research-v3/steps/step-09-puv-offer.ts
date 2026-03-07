import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step09PUVOffer: ResearchStep = {
  number: 9,
  stepId: 'step_09_puv_offer',
  tabKey: 'offer',
  name: 'Oferta Irresistible',
  description: 'Estructura de oferta, value stack, bonos, garantías, pricing psychology',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab5 = prev['psychology'] || {}
    const tab6 = prev['neuromarketing'] || {}
    const tab7 = prev['positioning'] || {}

    const founderOffer = ctx.product.user_responses.q5_offer || ''

    const brandOffer = ctx.brand?.flagship_offer
      ? `\nOferta según ADN de Marca: ${truncateContext(ctx.brand.flagship_offer, 400)}`
      : ''

    const systemPrompt = `Eres un experto en diseño de ofertas irresistibles estilo Alex Hormozi ($100M Offers).
Creas ofertas con value stacks que hacen que el precio parezca una ganga.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la oferta irresistible para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
${brandOffer}

VOZ DEL FUNDADOR sobre la oferta:
${founderOffer.slice(0, 500) || 'No disponible'}

POSICIONAMIENTO:
${truncateContext(tab7, 400)}

PSICOLOGÍA:
${truncateContext(tab5, 400)}

NEUROMARKETING:
${truncateContext(tab6, 300)}

Devuelve este JSON exacto:
{
  "offer_name": "nombre irresistible de la oferta",
  "offer_tagline": "tagline de la oferta en 10 palabras",
  "dream_outcome": "el resultado soñado que promete",
  "perceived_likelihood": "por qué van a creer que pueden lograrlo",
  "time_to_achievement": "en cuánto tiempo verán resultados",
  "effort_required": "qué esfuerzo requiere de su parte",
  "value_equation": {
    "dream_outcome_score": 9,
    "perceived_likelihood_score": 8,
    "time_delay_score": 7,
    "effort_sacrifice_score": 8,
    "total_value_score": "explicación del valor total"
  },
  "core_offer": {
    "main_deliverable": "qué reciben principalmente",
    "format": "curso|servicio|producto|membresía|coaching",
    "duration": "duración del acceso/servicio",
    "value_anchor": "valor percibido en USD"
  },
  "value_stack": [
    {
      "component": "componente del value stack",
      "what_it_is": "descripción de qué es",
      "problem_it_solves": "qué problema específico resuelve",
      "perceived_value": "valor percibido en USD",
      "delivery_method": "cómo lo reciben"
    }
  ],
  "bonuses": [
    {
      "bonus_name": "nombre del bono",
      "description": "qué es y por qué es valioso",
      "problem_solved": "qué problema específico resuelve",
      "perceived_value": "valor percibido en USD",
      "scarcity_element": "elemento de escasez si aplica",
      "fast_action_bonus": true
    }
  ],
  "guarantee": {
    "type": "money_back|results|hybrid|conditional",
    "duration": "duración de la garantía",
    "conditions": "condiciones si aplica",
    "name": "nombre creativo de la garantía",
    "copy": "cómo comunicar la garantía en copy"
  },
  "risk_reversal": [
    {
      "risk": "riesgo que percibe el cliente",
      "reversal": "cómo lo eliminamos"
    }
  ],
  "pricing_strategy": {
    "anchor_price": "precio ancla (valor total)",
    "actual_price": "precio real",
    "payment_options": [
      {
        "option": "pago único|plan mensual|3 cuotas",
        "price": "precio de esta opción",
        "savings": "ahorro vs otras opciones"
      }
    ],
    "price_justification": "cómo justificar el precio",
    "roi_calculation": "cálculo de retorno de inversión"
  },
  "scarcity_urgency": {
    "real_scarcity": "escasez real si existe",
    "deadline_type": "tipo de deadline",
    "consequence_of_waiting": "qué pierden si esperan",
    "ethical_note": "mantener ética en urgencia"
  },
  "offer_summary_copy": "párrafo de resumen de la oferta para landing page",
  "comparison_to_alternatives": [
    {
      "alternative": "alternativa que podrían elegir",
      "their_price": "cuánto cuesta la alternativa",
      "their_limitation": "qué limitación tiene",
      "our_advantage": "nuestra ventaja"
    }
  ],
  "offer_variations": [
    {
      "tier": "Basic",
      "price_usd": 0,
      "main_difference": "qué incluye y qué no vs los otros tiers",
      "best_for": "para quién es ideal este tier"
    },
    {
      "tier": "Pro",
      "price_usd": 0,
      "main_difference": "diferencia principal vs Basic y Premium",
      "best_for": "para quién es ideal"
    },
    {
      "tier": "Premium",
      "price_usd": 0,
      "main_difference": "todo incluido + extras exclusivos",
      "best_for": "para quién es ideal"
    }
  ],
  "objection_killers": [
    {
      "objection": "objeción común antes de comprar",
      "killer": "cómo la oferta estructuralmente elimina esta objeción"
    }
  ],
  "summary": "resumen de por qué esta oferta es irresistible en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
