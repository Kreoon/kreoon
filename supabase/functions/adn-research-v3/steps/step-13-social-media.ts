import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step13SocialMedia: ResearchStep = {
  number: 13,
  stepId: 'step_13_social_media',
  tabKey: 'social_media',
  name: 'Redes Sociales',
  description: 'Estrategia por plataforma, pilares de contenido, crecimiento',
  useWebSearch: true,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab4 = prev['avatars'] || {}
    const tab7 = prev['positioning'] || {}
    const tab11 = prev['calendar'] || {}

    const competitorSocial = ctx.ads?.competitor_social?.length
      ? `\nPresencia social de competidores:\n${truncateContext(ctx.ads.competitor_social, 400)}`
      : ''

    const systemPrompt = `Eres un estratega de redes sociales experto en LATAM.
Conoces las particularidades de cada plataforma y las tendencias actuales.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de redes sociales para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
PLATAFORMAS DESEADAS: ${ctx.product.platforms.join(', ') || 'Instagram, TikTok, LinkedIn'}

AVATAR:
${truncateContext(tab4, 400)}

POSICIONAMIENTO:
${truncateContext(tab7, 300)}

CALENDARIO BASE:
${truncateContext(tab11, 300)}
${competitorSocial}

BÚSQUEDAS PARA CONTEXTO:
1. "tendencias ${ctx.product.platforms[0] || 'Instagram'} ${new Date().getFullYear()} LATAM"
2. "${ctx.product.service_types[0] || ctx.product.name} mejores prácticas redes sociales"

Devuelve este JSON exacto:
{
  "overall_strategy": {
    "primary_platforms": ["plataforma 1", "plataforma 2"],
    "secondary_platforms": ["plataforma 3"],
    "brand_voice": "descripción de la voz de marca",
    "content_ratio": {
      "educational": 40,
      "entertaining": 30,
      "promotional": 20,
      "community": 10
    }
  },
  "platform_strategies": [
    {
      "platform": "instagram",
      "priority": "high|medium|low",
      "audience_fit": 85,
      "content_types": ["reels", "carruseles", "stories"],
      "posting_frequency": "frecuencia recomendada",
      "best_times": ["hora 1", "hora 2"],
      "tone": "tono específico para esta plataforma",
      "hashtag_strategy": ["hashtag 1", "hashtag 2", "hashtag 3"],
      "growth_tactics": ["táctica 1", "táctica 2"],
      "content_pillars": [
        {
          "pillar": "nombre del pilar",
          "percentage": 30,
          "examples": ["ejemplo 1", "ejemplo 2"]
        }
      ]
    }
  ],
  "content_ideas": [
    {
      "idea": "idea de contenido",
      "platform": "plataforma ideal",
      "format": "formato",
      "pillar": "pilar de contenido"
    }
  ],
  "engagement_tactics": [
    "táctica de engagement 1",
    "táctica 2",
    "táctica 3"
  ],
  "community_building": [
    "estrategia de comunidad 1",
    "estrategia 2"
  ],
  "influencer_strategy": {
    "type": "micro|macro|nano",
    "criteria": ["criterio 1", "criterio 2"],
    "collaboration_ideas": ["idea 1", "idea 2"],
    "budget_range": "rango de presupuesto LATAM"
  },
  "ugc_strategy": {
    "how_to_encourage": "cómo incentivar UGC",
    "branded_hashtag": "hashtag de marca",
    "repurposing_plan": "cómo reutilizar UGC"
  },
  "analytics_focus": {
    "primary_metrics": ["métrica 1", "métrica 2"],
    "benchmarks": {
      "engagement_rate": "benchmark esperado",
      "reach_growth": "crecimiento esperado"
    },
    "reporting_frequency": "frecuencia de reportes"
  },
  "summary": "estrategia social resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
