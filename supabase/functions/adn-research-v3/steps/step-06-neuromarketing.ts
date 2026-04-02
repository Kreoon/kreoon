import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step06Neuromarketing: ResearchStep = {
  number: 6,
  stepId: 'step_06_neuromarketing',
  tabKey: 'neuromarketing',
  name: 'Neuromarketing',
  description: 'Sesgos cognitivos, triggers sensoriales, arquitectura de decisiones',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab4 = prev['avatars'] || {}
    const tab5 = prev['psychology'] || {}

    const systemPrompt = `Eres un experto en neuromarketing y economía conductual.
Dominas los trabajos de Daniel Kahneman, Richard Thaler, Dan Ariely y Roger Dooley.
Aplicas neurociencia al marketing y ventas en contexto LATAM.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de neuromarketing para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

AVATAR PRINCIPAL:
${truncateContext(tab4, 500)}

PSICOLOGÍA DEL CLIENTE:
${truncateContext(tab5, 600)}

Devuelve este JSON exacto:
{
  "primary_biases": [
    {
      "bias": "nombre del sesgo cognitivo",
      "description": "explicación breve",
      "application": "cómo aplicarlo a este producto",
      "implementation": {
        "landing_page": "cómo aplicarlo en landing",
        "ad_creative": "cómo aplicarlo en anuncios",
        "email": "cómo aplicarlo en emails",
        "sales_call": "cómo aplicarlo en llamadas de venta"
      }
    }
  ],
  "decision_architecture": {
    "default_option": "cuál debería ser la opción por defecto y por qué",
    "choice_overload_prevention": "cómo evitar parálisis por análisis",
    "decoy_effect": {
      "applicable": true,
      "how_to_implement": "cómo implementar el efecto señuelo"
    },
    "anchoring": {
      "anchor_price": "precio ancla recomendado",
      "how_to_present": "cómo presentar el ancla"
    }
  },
  "sensory_triggers": {
    "visual": {
      "colors": ["color 1 y su efecto", "color 2 y su efecto"],
      "imagery": "tipo de imágenes que activan respuesta",
      "typography": "recomendaciones tipográficas"
    },
    "auditory": {
      "music_style": "estilo de música para videos",
      "voice_characteristics": "características de voz para locución",
      "sound_effects": "efectos de sonido efectivos"
    },
    "kinesthetic": {
      "textures": "texturas en diseño/empaque",
      "interactive_elements": "elementos interactivos recomendados"
    }
  },
  "attention_grabbers": [
    {
      "technique": "técnica para captar atención",
      "neuroscience": "por qué funciona neurológicamente",
      "example": "ejemplo específico para este producto"
    }
  ],
  "memory_encoding": {
    "peak_end_rule": "cómo diseñar el peak y el end de la experiencia",
    "repetition_strategy": "qué repetir y cómo",
    "emotional_peaks": ["momento emocional 1", "momento emocional 2"],
    "distinctiveness": "qué hace memorable vs competencia"
  },
  "trust_signals": {
    "neurological_trust_builders": [
      {
        "signal": "señal de confianza",
        "why_works": "por qué funciona neurológicamente",
        "implementation": "cómo implementarlo"
      }
    ],
    "reduce_cognitive_load": "cómo simplificar la decisión"
  },
  "urgency_scarcity_neuro": {
    "loss_aversion_messaging": "cómo activar aversión a la pérdida éticamente",
    "fomo_triggers": ["trigger FOMO 1", "trigger FOMO 2"],
    "ethical_boundaries": "límites éticos a respetar"
  },
  "pricing_psychology": {
    "charm_pricing": "usar precios terminados en 7 o 9 y por qué",
    "payment_pain_reduction": "cómo reducir el dolor de pagar",
    "value_framing": "cómo enmarcar el valor vs el precio",
    "installment_psychology": "psicología de pagos a plazos si aplica"
  },
  "emotional_arc": {
    "hook_emotion": "emoción inicial para capturar atención (curiosidad, sorpresa, miedo)",
    "engagement_emotion": "emoción para mantener interés (esperanza, deseo, identificación)",
    "conversion_emotion": "emoción que lleva a la acción (urgencia, FOMO, confianza)",
    "retention_emotion": "emoción post-compra para fidelizar (orgullo, pertenencia, logro)"
  },
  "color_psychology": {
    "primary_recommendation": "#hex del color primario recomendado y razón psicológica",
    "secondary_recommendation": "#hex del color secundario y razón",
    "accent_for_cta": "#hex para botones CTA y por qué genera acción",
    "colors_to_avoid": ["color a evitar y por qué genera fricción para este avatar"]
  },
  "neuro_copywriting": {
    "opening_pattern": "patrón de apertura que activa atención inmediata (ej: pregunta retórica, dato shocking)",
    "credibility_pattern": "patrón que construye credibilidad en segundos",
    "desire_amplifier": "patrón lingüístico que amplifica el deseo",
    "urgency_pattern": "patrón de urgencia no manipulador",
    "closing_pattern": "patrón de cierre que reduce fricción final"
  },
  "summary": "resumen de las 3 tácticas de neuromarketing más importantes para este producto"
}`

    return { systemPrompt, userPrompt }
  },
}
