import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step07Positioning: ResearchStep = {
  number: 7,
  stepId: 'step_07_positioning',
  tabKey: 'positioning',
  name: 'Posicionamiento',
  description: 'PUV, arquetipos de marca, territorio de marca, mensajes clave',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}
    const tab2 = prev['competition'] || {}
    const tab4 = prev['avatars'] || {}
    const tab5 = prev['psychology'] || {}

    const brandPositioning = ctx.brand?.brand_identity
      ? `\nIdentidad de marca definida: ${truncateContext(ctx.brand.brand_identity, 400)}`
      : ''

    const founderVision = ctx.product.user_responses.q4_transformation || ''

    const systemPrompt = `Eres un estratega de posicionamiento de marca experto en LATAM.
Dominas los frameworks de April Dunford (Obviously Awesome), Al Ries (Positioning), y los 12 arquetipos de Jung.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Define el posicionamiento estratégico para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
${brandPositioning}

VISIÓN DEL FUNDADOR sobre la transformación:
${founderVision.slice(0, 400) || 'No disponible'}

CONTEXTO DE MERCADO:
${truncateContext(tab1, 400)}

COMPETENCIA:
${truncateContext(tab2, 400)}

AVATAR PRINCIPAL:
${truncateContext(tab4, 300)}

PSICOLOGÍA:
${truncateContext(tab5, 300)}

Devuelve este JSON exacto:
{
  "positioning_statement": {
    "for": "para quién es",
    "who": "que tiene esta necesidad/frustración",
    "product_is": "el producto es",
    "that": "que proporciona este beneficio",
    "unlike": "a diferencia de alternativas",
    "our_product": "nuestro producto ofrece esta diferenciación"
  },
  "puv": {
    "headline": "propuesta de valor única en una frase de 10 palabras máximo",
    "subheadline": "expansión de la PUV en 20-30 palabras",
    "proof_points": ["prueba 1", "prueba 2", "prueba 3"]
  },
  "brand_archetype": {
    "primary": "arquetipo principal de Jung",
    "secondary": "arquetipo secundario si aplica",
    "why": "por qué estos arquetipos encajan",
    "voice_characteristics": ["característica de voz 1", "característica 2"],
    "words_to_use": ["palabra on-brand 1", "palabra 2"],
    "words_to_avoid": ["palabra off-brand 1", "palabra 2"]
  },
  "brand_territory": {
    "owns": "qué territorio mental queremos poseer",
    "adjacent_territories": ["territorio adyacente 1", "territorio 2"],
    "territories_to_avoid": ["territorio a evitar 1"]
  },
  "competitive_frame": {
    "category": "categoría donde competimos",
    "frame_of_reference": "marco de referencia para el cliente",
    "differentiation_angle": "ángulo principal de diferenciación"
  },
  "messaging_hierarchy": {
    "level_1_tagline": "tagline de 3-5 palabras",
    "level_2_value_prop": "propuesta de valor expandida",
    "level_3_proof": "puntos de prueba",
    "level_4_features": "features que soportan"
  },
  "key_messages": [
    {
      "audience": "segmento de audiencia",
      "message": "mensaje clave para este segmento",
      "emotional_hook": "gancho emocional",
      "rational_support": "soporte racional"
    }
  ],
  "elevator_pitches": {
    "10_seconds": "pitch de 10 segundos",
    "30_seconds": "pitch de 30 segundos",
    "60_seconds": "pitch de 60 segundos"
  },
  "brand_mantras": [
    "mantra interno 1 (para el equipo)",
    "mantra interno 2"
  ],
  "positioning_risks": [
    {
      "risk": "riesgo del posicionamiento",
      "mitigation": "cómo mitigarlo"
    }
  ],
  "summary": "resumen del posicionamiento en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
