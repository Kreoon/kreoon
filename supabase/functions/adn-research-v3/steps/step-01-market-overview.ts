import { ResearchStep, truncateContext, extractTopPhrases } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step01MarketOverview: ResearchStep = {
  number: 1,
  stepId: 'step_01_market_overview',
  tabKey: 'market_overview',
  name: 'Panorama de Mercado',
  description: 'TAM/SAM/SOM, estado del mercado, comportamiento del consumidor LATAM',
  useWebSearch: true,

  buildPrompts(ctx: MasterContext, _prev: Record<string, unknown>) {
    const painPhrasesStr = ctx.social?.pain_phrases?.length
      ? `\nFrases reales de dolor del mercado (de reviews y comentarios):\n${extractTopPhrases(ctx.social.pain_phrases, 6)}`
      : ''

    const brandContext = ctx.brand?.business_identity
      ? `\nContexto de marca: ${truncateContext(ctx.brand.business_identity, 400)}`
      : ''

    const basicAnalysisStr = ctx.product.basic_analysis.market_analysis
      ? `\nAnálisis previo (ADN básico): ${truncateContext(ctx.product.basic_analysis.market_analysis, 600)}`
      : ''

    const userVoice = [
      ctx.product.user_responses.q1_product,
      ctx.product.user_responses.q3_problem,
    ].filter(Boolean).join('\n').slice(0, 500)

    const systemPrompt = `Eres un estratega de marketing y analista de mercado experto especializado en LATAM (Colombia, México, Perú, Chile, Argentina, Ecuador).
Tienes acceso a búsqueda web en tiempo real. Úsala activamente para encontrar datos reales y actualizados.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin explicaciones, sin bloques de código.
Usa español LATAM en todos los textos.`

    const userPrompt = `Realiza un análisis profundo del panorama de mercado para:

PRODUCTO/SERVICIO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
MERCADOS OBJETIVO: ${ctx.product.locations.join(', ')}
TIPO DE SERVICIO: ${ctx.product.service_types.join(', ')}
OBJETIVO: ${ctx.product.goal}
${brandContext}
${painPhrasesStr}
${basicAnalysisStr}

VOZ DEL FUNDADOR (transcripción original):
${userVoice || 'No disponible'}

BÚSQUEDAS QUE DEBES REALIZAR:
1. "${ctx.product.name} mercado LATAM 2024 2025 tamaño estadísticas"
2. "${ctx.product.service_types[0] || ctx.product.name} tendencias crecimiento Latinoamérica"
3. "${ctx.product.name} consumidores comportamiento preferencias"

Devuelve este JSON exacto:
{
  "market_size": {
    "tam": "estimado del mercado total addressable con fuente",
    "sam_latam": "mercado serviceable en LATAM con fuente",
    "som_year1": "mercado obtenible realista año 1",
    "som_year3": "mercado obtenible realista año 3"
  },
  "market_state": "emergente|crecimiento|madurez|saturacion|declive",
  "cagr": "% de crecimiento anual proyectado con horizonte temporal",
  "adoption_stage": "innovadores|early_adopters|mayoria_temprana|mayoria_tardia|rezagados",
  "consumer_behavior": {
    "how_they_search": "cómo busca este producto/servicio en LATAM",
    "preferred_channels": ["canales donde lo buscan y compran"],
    "preferred_formats": ["formatos de contenido que consumen"],
    "average_ticket_latam": "ticket promedio en USD para LATAM",
    "purchase_cycle_days": 0,
    "seasonality": "patrones estacionales si aplica",
    "latam_cultural_barriers": ["barreras culturales específicas de LATAM para adopción"]
  },
  "awareness_level": "unaware|problem_aware|solution_aware|product_aware|most_aware",
  "awareness_implication": "qué significa este nivel para el primer mensaje de marketing",
  "macro_variables": [
    {
      "factor": "economico|tecnologico|sociocultural|regulatorio",
      "impact": "alto|medio|bajo",
      "description": "descripción específica del factor y su impacto"
    }
  ],
  "opportunities": [
    {
      "opportunity": "descripción de la oportunidad",
      "impact": "alto|medio|bajo",
      "time_window": "cuánto tiempo tiene esta oportunidad"
    }
  ],
  "threats": [
    {
      "threat": "descripción de la amenaza",
      "probability": "alta|media|baja",
      "urgency": "inmediata|corto_plazo|largo_plazo"
    }
  ],
  "category_design": {
    "existing_category": "categoría actual donde compite o null",
    "new_category_suggestion": "si aplica: nombre de una nueva categoría que podría crear",
    "category_pov": "el punto de vista del problema que define su categoría"
  },
  "data_sources": ["fuentes consultadas para este análisis"],
  "summary": "párrafo ejecutivo de 100 palabras con los hallazgos más importantes para la estrategia"
}`

    return { systemPrompt, userPrompt }
  },
}
