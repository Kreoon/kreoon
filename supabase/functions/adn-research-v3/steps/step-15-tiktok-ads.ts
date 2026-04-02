import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step15TikTokAds: ResearchStep = {
  number: 15,
  stepId: 'step_15_tiktok_ads',
  tabKey: 'tiktok_ads',
  name: 'TikTok Ads',
  description: 'Estrategia TikTok Ads: Spark Ads, hooks virales, tendencias',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab4 = prev['avatars'] || {}
    const tab8 = prev['copy_angles'] || {}
    const tab9 = prev['offer'] || {}

    const tiktokIntel = ctx.ads?.tiktok_ads
      ? `\nIntel de TikTok Ads:\n${truncateContext(ctx.ads.tiktok_ads, 300)}`
      : ''

    const systemPrompt = `Eres un experto en TikTok Ads y marketing en TikTok para LATAM.
Conoces los formatos que funcionan, las tendencias y cómo crear contenido que no parece ad.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin explicaciones.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de TikTok Ads para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

AVATAR IDEAL:
${truncateContext(tab4, 300)}

HOOKS Y ÁNGULOS DE COPY:
${truncateContext(tab8, 250)}

OFERTA:
${truncateContext(tab9, 200)}
${tiktokIntel}

Devuelve este JSON:
{
  "strategy": {
    "objective": "conversions|traffic|app_install|lead_gen",
    "daily_budget_usd": "30-100",
    "bidding": "lowest_cost|cost_cap"
  },
  "audience": {
    "age": "18-34",
    "gender": "all|male|female",
    "locations": ["país 1", "país 2"],
    "interests": ["interés 1", "interés 2", "interés 3"],
    "behaviors": ["behavior 1", "behavior 2"]
  },
  "creatives": [
    {
      "concept": "nombre del concepto",
      "hook_3s": "hook para primeros 3 segundos (crucial)",
      "format": "in_feed|spark_ad",
      "duration": "15s|30s|60s",
      "audio": "trending_sound|voiceover|original",
      "script": "guion completo del video con beats",
      "visual_style": "estilo visual"
    }
  ],
  "viral_hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
  "spark_ads": {
    "creator_profile": "descripción del creador ideal",
    "content_guidelines": ["guideline 1", "guideline 2"],
    "brief": "brief para creadores"
  },
  "hashtags": {
    "branded": ["#MiMarca"],
    "trending": ["#trend1", "#trend2"],
    "niche": ["#nicho1", "#nicho2"]
  },
  "native_tips": ["tip 1 para parecer nativo", "tip 2", "tip 3"],
  "kpis": [{"metric": "cpa", "target": "valor"}, {"metric": "ctr", "target": "valor"}],
  "summary": "estrategia TikTok resumida en 2-3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
