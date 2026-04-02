import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step14MetaAds: ResearchStep = {
  number: 14,
  stepId: 'step_14_meta_ads',
  tabKey: 'meta_ads',
  name: 'Meta Ads',
  description: 'Estrategia de Meta Ads: audiencias, creativos, estructura de campañas',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab4 = prev['avatars'] || {}
    const tab8 = prev['copy_angles'] || {}
    const tab9 = prev['offer'] || {}

    const metaAdsIntel = ctx.ads?.meta_ads
      ? `\nIntel de Meta Ads de competidores:\n${truncateContext(ctx.ads.meta_ads, 400)}`
      : ''

    const brandTargeting = ctx.brand?.ads_targeting
      ? `\nTargeting según ADN de Marca:\n${truncateContext(ctx.brand.ads_targeting, 200)}`
      : ''

    const systemPrompt = `Eres un media buyer experto en Meta Ads para LATAM.
Dominas la estructura de campañas, audiencias y creativos que convierten.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin explicaciones.
Usa español LATAM. Los presupuestos en USD.`

    const userPrompt = `Diseña la estrategia de Meta Ads para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
UBICACIONES: ${ctx.product.locations.join(', ')}
${brandTargeting}

AVATAR IDEAL:
${truncateContext(tab4, 300)}

ÁNGULOS DE COPY:
${truncateContext(tab8, 300)}

OFERTA:
${truncateContext(tab9, 200)}
${metaAdsIntel}

Devuelve este JSON:
{
  "campaign_architecture": {
    "objective": "conversions|traffic|engagement|awareness",
    "funnel_stages": [
      {"stage": "tofu|mofu|bofu", "campaign_type": "tipo", "budget_pct": "30%"}
    ],
    "daily_budget_usd": "50-150",
    "testing_budget_usd": "20-50"
  },
  "audiences": {
    "cold": [
      {"name": "nombre", "interests": ["int1", "int2"], "age": "25-45", "locations": ["país"]}
    ],
    "warm": [
      {"name": "visitantes web", "source": "website|video", "days": 30}
    ],
    "lookalikes": [
      {"source": "compradores", "percentage": "1-3%"}
    ]
  },
  "ads": [
    {
      "name": "nombre del ad",
      "format": "video|image|carousel",
      "hook": "hook principal en 1 línea",
      "primary_text": "texto primario completo del anuncio (2-3 párrafos)",
      "headline": "headline corto",
      "description": "descripción breve",
      "cta": "shop_now|learn_more|sign_up"
    }
  ],
  "placements": ["feed", "stories", "reels"],
  "bidding": {"strategy": "lowest_cost|cost_cap", "target_cpa": "valor si aplica"},
  "retargeting": [
    {"trigger": "visitó web", "days": 7, "message": "mensaje", "offer": "oferta"}
  ],
  "kpis": {"primary": ["cpa", "roas"], "secondary": ["ctr", "cpm"]},
  "budget_scenarios": {
    "minimum": {"daily": "$30", "results": "X leads/día"},
    "growth": {"daily": "$100", "results": "X leads/día"},
    "scale": {"daily": "$300", "results": "X leads/día"}
  },
  "summary": "estrategia resumida en 2-3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
