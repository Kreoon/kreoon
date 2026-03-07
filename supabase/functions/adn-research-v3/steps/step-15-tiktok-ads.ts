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
    const tab10 = prev['video_creatives'] || {}

    const tiktokIntel = ctx.ads?.tiktok_ads
      ? `\nIntel de TikTok Ads:\n${truncateContext(ctx.ads.tiktok_ads, 400)}`
      : ''

    const systemPrompt = `Eres un experto en TikTok Ads y marketing en TikTok para LATAM.
Conoces los formatos que funcionan, las tendencias y cómo crear contenido que no parece ad.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de TikTok Ads para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

AVATAR (enfocarse en edades jóvenes si aplica):
${truncateContext(tab4, 400)}

HOOKS Y COPY:
${truncateContext(tab8, 300)}

VIDEO CREATIVES:
${truncateContext(tab10, 300)}
${tiktokIntel}

Devuelve este JSON exacto:
{
  "strategy_overview": {
    "campaign_objective": "conversions|traffic|app_install|lead_gen",
    "target_audience_interests": ["interés 1", "interés 2", "interés 3"],
    "budget_recommendation": "presupuesto diario recomendado USD",
    "bidding_strategy": "lowest_cost|cost_cap|maximum_delivery"
  },
  "audience_targeting": {
    "demographics": {
      "age_range": "rango de edad",
      "gender": "all|male|female",
      "locations": ["ubicación 1", "ubicación 2"],
      "languages": ["español"]
    },
    "interests": ["interés 1", "interés 2", "interés 3"],
    "behaviors": ["behavior 1", "behavior 2"],
    "custom_audiences": ["tipo de custom audience 1", "tipo 2"]
  },
  "creatives": [
    {
      "concept": "nombre del concepto creativo",
      "hook": "hook en primeros 3 segundos",
      "format": "in_feed|spark_ad|topview",
      "duration": "15s|30s|60s",
      "audio_type": "trending_sound|original|voiceover",
      "script_outline": ["beat 1", "beat 2", "beat 3", "beat 4"],
      "visual_style": "estilo visual",
      "cta": "call to action"
    }
  ],
  "spark_ads_strategy": {
    "creator_profile": "perfil del creador ideal",
    "content_guidelines": ["guideline 1", "guideline 2"],
    "partnership_approach": "cómo acercarse a creadores"
  },
  "viral_hooks": [
    "hook viral 1",
    "hook viral 2",
    "hook viral 3",
    "hook viral 4",
    "hook viral 5"
  ],
  "trending_sounds_strategy": "cómo usar trending sounds",
  "native_content_tips": [
    "tip 1 para parecer nativo",
    "tip 2",
    "tip 3"
  ],
  "hashtag_strategy": {
    "branded_hashtags": ["hashtag branded 1"],
    "trending_hashtags": ["hashtag trending 1", "hashtag 2"],
    "niche_hashtags": ["hashtag nicho 1", "hashtag 2"]
  },
  "ugc_campaign": {
    "concept": "concepto de campaña UGC",
    "creator_brief": "brief para creadores",
    "incentive": "incentivo para creadores",
    "rights_management": "manejo de derechos"
  },
  "testing_framework": {
    "variables_to_test": ["variable 1", "variable 2"],
    "minimum_budget_per_test": "presupuesto mínimo por test",
    "success_metrics": ["métrica 1", "métrica 2"]
  },
  "best_practices": [
    "best practice 1",
    "best practice 2",
    "best practice 3"
  ],
  "kpis": [
    {
      "metric": "nombre de la métrica",
      "target": "objetivo"
    }
  ],
  "summary": "estrategia TikTok resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
