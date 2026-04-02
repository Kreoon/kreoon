import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step02Competition: ResearchStep = {
  number: 2,
  stepId: 'step_02_competition',
  tabKey: 'competition',
  name: 'Análisis de Competencia',
  description: 'Análisis profundo de competidores directos e indirectos, gaps y oportunidades',
  useWebSearch: true,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}

    const competitorLinks = ctx.product.links.competitors.length
      ? `\nLinks de competidores proporcionados: ${ctx.product.links.competitors.join(', ')}`
      : ''

    const adsCompetitors = ctx.ads?.competitor_social?.length
      ? `\nCompetidores detectados en redes (de Ad Intelligence):\n${JSON.stringify(ctx.ads.competitor_social.slice(0, 5), null, 2)}`
      : ''

    const systemPrompt = `Eres un analista competitivo experto especializado en LATAM.
Tienes acceso a búsqueda web. Investiga los competidores reales en el mercado.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Realiza un análisis competitivo profundo para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
MERCADOS: ${ctx.product.locations.join(', ')}
${competitorLinks}
${adsCompetitors}

CONTEXTO DEL MERCADO (paso anterior):
${truncateContext(tab1, 600)}

BÚSQUEDAS A REALIZAR:
1. "${ctx.product.name} competidores LATAM principales"
2. "${ctx.product.service_types[0]} empresas líderes Colombia México"
3. "alternativas a ${ctx.product.name}"

Devuelve este JSON exacto:
{
  "direct_competitors": [
    {
      "name": "nombre del competidor",
      "website": "url",
      "positioning": "cómo se posicionan",
      "target_audience": "a quién le venden",
      "price_range": "rango de precios",
      "strengths": ["fortaleza 1", "fortaleza 2"],
      "weaknesses": ["debilidad 1", "debilidad 2"],
      "unique_selling_point": "su diferenciador principal",
      "content_strategy": "qué tipo de contenido publican",
      "threat_level": "alto|medio|bajo"
    }
  ],
  "indirect_competitors": [
    {
      "name": "nombre",
      "why_indirect": "por qué compiten indirectamente",
      "threat_level": "alto|medio|bajo"
    }
  ],
  "competitive_gaps": [
    {
      "gap": "descripción del gap no cubierto",
      "opportunity": "cómo aprovecharlo",
      "difficulty": "fácil|medio|difícil"
    }
  ],
  "market_positioning_map": {
    "axis_x": "variable del eje X (ej: precio)",
    "axis_y": "variable del eje Y (ej: calidad)",
    "positions": [
      {"competitor": "nombre", "x": 3, "y": 8},
      {"competitor": "Tu producto", "x": 5, "y": 7}
    ]
  },
  "differentiation_opportunities": [
    {
      "area": "área de diferenciación",
      "current_state": "cómo está el mercado ahora",
      "opportunity": "cómo diferenciarse",
      "implementation": "cómo ejecutarlo"
    }
  ],
  "competitive_threats": [
    {
      "threat": "amenaza competitiva",
      "source": "de dónde viene",
      "timeline": "cuándo podría materializarse",
      "mitigation": "cómo mitigarla"
    }
  ],
  "recommended_positioning": "recomendación de posicionamiento vs competencia en 2-3 oraciones",
  "summary": "resumen ejecutivo del panorama competitivo en 100 palabras"
}`

    return { systemPrompt, userPrompt }
  },
}
