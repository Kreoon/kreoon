import { ResearchStep, truncateContext, extractTopPhrases } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step04Avatars: ResearchStep = {
  number: 4,
  stepId: 'step_04_avatars',
  tabKey: 'avatars',
  name: 'Avatares Ideales',
  description: 'Perfiles detallados de cliente ideal con demografía, psicografía y comportamiento',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}
    const tab3 = prev['jtbd'] || {}

    const painPhrases = ctx.social?.pain_phrases?.length
      ? `\nDolores reales del mercado:\n${extractTopPhrases(ctx.social.pain_phrases, 6)}`
      : ''

    const desirePhrases = ctx.social?.desire_phrases?.length
      ? `\nDeseos reales del mercado:\n${extractTopPhrases(ctx.social.desire_phrases, 6)}`
      : ''

    const founderVoice = ctx.product.user_responses.q2_ideal_client || ''

    const brandIdealCustomer = ctx.brand?.ideal_customer
      ? `\nCliente ideal según ADN de Marca: ${truncateContext(ctx.brand.ideal_customer, 400)}`
      : ''

    const systemPrompt = `Eres un experto en investigación de consumidor y creación de buyer personas para LATAM.
Creas avatares detallados y realistas basados en datos, no suposiciones.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Crea los avatares de cliente ideal para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
EDADES TARGET: ${ctx.product.audience_ages.join(', ')}
UBICACIONES: ${ctx.product.locations.join(', ')}
${brandIdealCustomer}
${painPhrases}
${desirePhrases}

VOZ DEL FUNDADOR sobre cliente ideal:
${founderVoice.slice(0, 500) || 'No disponible'}

CONTEXTO JTBD:
${truncateContext(tab3, 500)}

Devuelve este JSON exacto:
{
  "main_avatar": {
    "name": "nombre ficticio representativo",
    "age_range": "25-35",
    "gender": "mujer|hombre|mixto",
    "location": "ciudad, país",
    "occupation": "profesión típica",
    "income_level": "bajo|medio|medio-alto|alto",
    "education": "nivel educativo",
    "family_status": "soltero|casado|con_hijos",
    "psychographics": {
      "values": ["valor 1", "valor 2", "valor 3"],
      "interests": ["interés 1", "interés 2", "interés 3"],
      "lifestyle": "descripción del estilo de vida",
      "personality_traits": ["rasgo 1", "rasgo 2"]
    },
    "day_in_the_life": "descripción de un día típico en 3-4 oraciones",
    "goals": ["meta 1", "meta 2", "meta 3"],
    "frustrations": ["frustración 1", "frustración 2", "frustración 3"],
    "fears": ["miedo 1", "miedo 2"],
    "aspirations": ["aspiración 1", "aspiración 2"],
    "media_consumption": {
      "social_platforms": ["plataforma 1", "plataforma 2"],
      "content_types": ["tipo contenido 1", "tipo contenido 2"],
      "influencers_they_follow": "tipo de influencers que siguen",
      "news_sources": ["fuente 1", "fuente 2"]
    },
    "purchase_behavior": {
      "research_style": "cómo investigan antes de comprar",
      "decision_factors": ["factor 1", "factor 2", "factor 3"],
      "objections": ["objeción 1", "objeción 2"],
      "preferred_payment": "método de pago preferido"
    },
    "quote": "frase que diría este avatar sobre su problema/deseo",
    "messaging_guidelines": {
      "tone": "tono recomendado para hablarle",
      "words_to_use": ["palabra 1", "palabra 2"],
      "words_to_avoid": ["palabra a evitar 1", "palabra a evitar 2"],
      "emotional_triggers": ["trigger 1", "trigger 2"]
    }
  },
  "secondary_avatars": [
    {
      "name": "nombre",
      "brief_description": "descripción en 2 oraciones",
      "key_difference": "diferencia clave vs avatar principal",
      "priority": "media|baja"
    }
  ],
  "anti_avatar": {
    "description": "quién NO es cliente ideal",
    "red_flags": ["señal de mal fit 1", "señal 2"],
    "why_not_fit": "por qué no encajan"
  },
  "avatar_journey": {
    "awareness": "qué sabe/piensa en esta etapa",
    "consideration": "qué evalúa en esta etapa",
    "decision": "qué necesita para decidir",
    "post_purchase": "qué espera después de comprar"
  },
  "summary": "resumen del avatar principal en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
