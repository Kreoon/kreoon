import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step21OrganicContent: ResearchStep = {
  number: 21,
  stepId: 'step_21_organic_content',
  tabKey: 'organic_content',
  name: 'Contenido Orgánico',
  description: 'Estrategia SEO, blog, YouTube orgánico, podcasting',
  useWebSearch: true,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}
    const tab7 = prev['positioning'] || {}
    const tab11 = prev['calendar'] || {}

    const systemPrompt = `Eres un experto en marketing de contenidos y SEO para LATAM.
Creas estrategias de contenido orgánico que generan tráfico y autoridad.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Diseña la estrategia de contenido orgánico para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

MERCADO:
${truncateContext(tab1, 300)}

POSICIONAMIENTO:
${truncateContext(tab7, 300)}

CALENDARIO SOCIAL:
${truncateContext(tab11, 300)}

BÚSQUEDAS SEO:
1. "keywords ${ctx.product.service_types[0] || ctx.product.name} blog LATAM"
2. "temas de contenido ${ctx.product.name}"

Devuelve este JSON exacto:
{
  "content_strategy_overview": {
    "primary_goal": "tráfico|autoridad|leads|seo",
    "content_frequency": "frecuencia de publicación",
    "primary_channels": ["canal 1", "canal 2"],
    "content_mix": {
      "educational": 40,
      "thought_leadership": 30,
      "case_studies": 20,
      "news_trends": 10
    }
  },
  "content_pillars": [
    {
      "pillar": "nombre del pilar",
      "description": "descripción del pilar",
      "percentage": 30,
      "topics": ["tema 1", "tema 2", "tema 3"],
      "content_formats": ["formato 1", "formato 2"],
      "target_keywords": ["keyword 1", "keyword 2"]
    }
  ],
  "seo_strategy": {
    "primary_keywords": [
      {
        "keyword": "keyword principal",
        "volume": "volumen estimado",
        "difficulty": "low|medium|high",
        "intent": "informational|transactional|navigational"
      }
    ],
    "long_tail_keywords": ["long tail 1", "long tail 2", "long tail 3"],
    "content_gaps": ["gap 1", "gap 2"],
    "competitor_keywords": ["keyword de competidor 1", "keyword 2"]
  },
  "blog_content_plan": [
    {
      "title": "título del artículo",
      "target_keyword": "keyword target",
      "search_intent": "intent del buscador",
      "outline": ["H2 1", "H2 2", "H2 3"],
      "word_count": "palabras recomendadas",
      "internal_links": ["artículo relacionado 1"],
      "cta": "call to action del artículo"
    }
  ],
  "youtube_strategy": {
    "channel_positioning": "posicionamiento del canal",
    "video_types": ["tipo 1", "tipo 2"],
    "publishing_frequency": "frecuencia",
    "seo_approach": "enfoque SEO para YouTube",
    "video_ideas": [
      {
        "title": "título del video",
        "type": "tutorial|interview|vlog|review",
        "target_keyword": "keyword"
      }
    ]
  },
  "podcast_opportunity": {
    "viable": true,
    "format": "solo|interview|panel",
    "episode_topics": ["tema 1", "tema 2", "tema 3"],
    "distribution_strategy": "estrategia de distribución"
  },
  "content_repurposing": [
    {
      "original_format": "formato original",
      "repurposed_formats": ["formato 1", "formato 2", "formato 3"]
    }
  ],
  "content_distribution": [
    {
      "channel": "canal de distribución",
      "content_type": "tipo de contenido",
      "frequency": "frecuencia",
      "best_time": "mejor hora"
    }
  ],
  "link_building_strategy": {
    "tactics": ["táctica 1", "táctica 2"],
    "target_sites": ["tipo de sitio 1", "tipo 2"],
    "outreach_angles": ["ángulo 1", "ángulo 2"]
  },
  "content_calendar_framework": {
    "weekly_themes": ["tema lunes", "tema miércoles", "tema viernes"],
    "monthly_series": ["serie mensual 1", "serie 2"],
    "seasonal_content": ["contenido estacional 1", "contenido 2"]
  },
  "measurement": {
    "primary_metrics": ["métrica 1", "métrica 2"],
    "tools_recommended": ["herramienta 1", "herramienta 2"],
    "reporting_frequency": "frecuencia de reportes"
  },
  "summary": "estrategia de contenido orgánico resumida en 3 oraciones"
}`

    return { systemPrompt, userPrompt }
  },
}
