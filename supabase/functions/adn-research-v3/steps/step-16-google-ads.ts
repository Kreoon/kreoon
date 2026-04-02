import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step16GoogleAds: ResearchStep = {
  number: 16,
  stepId: 'step_16_google_ads',
  tabKey: 'google_ads',
  name: 'Google Ads',
  description: 'Estrategia de Google Ads: keywords, estructura de campañas, anuncios',
  useWebSearch: true,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}
    const tab4 = prev['avatars'] || {}
    const tab8 = prev['copy_angles'] || {}

    const systemPrompt = `Eres un experto en Google Ads y SEM para LATAM.
Dominas Search, Display, YouTube y Performance Max.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM. Presupuestos en USD.`

    const userPrompt = `Diseña la estrategia de Google Ads para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
UBICACIONES: ${ctx.product.locations.join(', ')}

MERCADO:
${truncateContext(tab1, 300)}

AVATAR:
${truncateContext(tab4, 300)}

COPY ANGLES:
${truncateContext(tab8, 300)}

BÚSQUEDAS PARA KEYWORDS:
1. "keywords ${ctx.product.service_types[0] || ctx.product.name} LATAM"
2. "búsquedas relacionadas ${ctx.product.name}"

Devuelve este JSON exacto:
{
  "strategy_overview": {
    "campaign_types": ["search", "display", "youtube", "pmax"],
    "monthly_budget": "presupuesto mensual recomendado USD",
    "target_cpa": "CPA target USD",
    "target_roas": "ROAS target si aplica"
  },
  "keyword_strategy": {
    "primary_keywords": [
      {
        "keyword": "keyword principal",
        "match_type": "exact|phrase|broad",
        "intent": "transactional|informational|navigational",
        "estimated_cpc": "CPC estimado USD",
        "priority": "alta|media|baja"
      }
    ],
    "negative_keywords": ["negativa 1", "negativa 2", "negativa 3"],
    "long_tail_keywords": ["long tail 1", "long tail 2", "long tail 3"]
  },
  "search_ads": [
    {
      "campaign_type": "brand|generic|competitor",
      "headlines": [
        "headline 1 (30 chars max)",
        "headline 2",
        "headline 3",
        "headline 4",
        "headline 5"
      ],
      "descriptions": [
        "description 1 (90 chars max)",
        "description 2"
      ],
      "display_path": "ruta de display",
      "final_url_suffix": "UTM parameters",
      "sitelinks": [
        {
          "title": "título sitelink",
          "description": "descripción"
        }
      ]
    }
  ],
  "display_strategy": {
    "audience_segments": ["segmento 1", "segmento 2"],
    "placements": ["placement 1", "placement 2"],
    "creative_sizes": ["300x250", "728x90", "160x600"],
    "messaging_approach": "enfoque del mensaje"
  },
  "youtube_strategy": {
    "ad_formats": ["skippable", "non_skippable", "bumper"],
    "targeting": ["targeting 1", "targeting 2"],
    "video_concepts": ["concepto 1", "concepto 2"]
  },
  "bidding_strategy": {
    "strategy": "maximize_conversions|target_cpa|target_roas|maximize_clicks",
    "adjustments": [
      {
        "type": "device|location|time|audience",
        "adjustment": "ajuste recomendado"
      }
    ]
  },
  "campaign_structure": {
    "campaigns": [
      {
        "name": "nombre de campaña",
        "type": "search|display|video|pmax",
        "objective": "objetivo",
        "ad_groups": ["ad group 1", "ad group 2"],
        "budget_allocation": "% del presupuesto"
      }
    ]
  },
  "landing_page_requirements": [
    "requisito 1",
    "requisito 2",
    "requisito 3"
  ],
  "conversion_tracking": [
    "conversión a trackear 1",
    "conversión 2",
    "conversión 3"
  ],
  "optimization_checklist": [
    "optimización 1",
    "optimización 2",
    "optimización 3"
  ],
  "summary": "estrategia Google Ads resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
