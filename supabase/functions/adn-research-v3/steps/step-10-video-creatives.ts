import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step10VideoCreatives: ResearchStep = {
  number: 10,
  stepId: 'step_10_video_creatives',
  tabKey: 'video_creatives',
  name: 'Creativos de Video',
  description: 'Scripts de video para ads, UGC, VSL con estructura PAAS',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab5 = prev['psychology'] || {}
    const tab8 = prev['copy_angles'] || {}
    const tab9 = prev['offer'] || {}

    const tiktokTrends = ctx.ads?.tiktok_ads
      ? `\nTendencias TikTok detectadas: ${truncateContext(ctx.ads.tiktok_ads, 300)}`
      : ''

    const systemPrompt = `Eres un director creativo experto en video ads para Meta y TikTok en LATAM.
Dominas la estructura PAAS (Problem-Agitate-Aspirate-Solution) y los hooks virales de TikTok.
Creas scripts que detienen el scroll y convierten.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Crea los creativos de video para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

ÁNGULOS DE COPY:
${truncateContext(tab8, 500)}

OFERTA:
${truncateContext(tab9, 400)}

PSICOLOGÍA:
${truncateContext(tab5, 400)}
${tiktokTrends}

Devuelve este JSON exacto:
{
  "hooks_library": [
    {
      "hook": "texto del hook (3-5 segundos)",
      "type": "question|statement|shocking|relatable|contrarian",
      "visual": "qué se ve en pantalla",
      "platform": "tiktok|meta|youtube",
      "scroll_stopping_score": 9
    }
  ],
  "ugc_scripts": [
    {
      "name": "nombre del script",
      "angle": "ángulo principal",
      "duration": "15s|30s|60s",
      "creator_type": "perfil del creador ideal",
      "setting": "dónde se graba",
      "script": {
        "hook_0_3s": "texto y acción segundos 0-3",
        "problem_3_10s": "texto y acción segundos 3-10",
        "agitate_10_20s": "texto y acción segundos 10-20",
        "solution_20_25s": "texto y acción segundos 20-25",
        "cta_25_30s": "texto y acción segundos 25-30"
      },
      "visual_notes": "notas para el creador sobre visuales",
      "audio_notes": "notas sobre música/sonido"
    }
  ],
  "talking_head_scripts": [
    {
      "name": "nombre del video",
      "speaker": "fundador|experto|cliente",
      "duration": "60s|90s|120s",
      "objective": "awareness|consideration|conversion",
      "script": {
        "hook": "apertura que engancha",
        "credibility": "establecer autoridad",
        "problem": "describir el problema",
        "agitation": "agitar el dolor",
        "solution_intro": "introducir la solución",
        "benefits": "3 beneficios clave",
        "social_proof": "prueba social",
        "offer": "presentar la oferta",
        "cta": "llamado a la acción",
        "urgency": "elemento de urgencia"
      },
      "b_roll_suggestions": ["b-roll sugerido 1", "b-roll 2"]
    }
  ],
  "vsl_structure": {
    "duration": "duración recomendada",
    "sections": [
      {
        "section": "nombre de la sección",
        "duration": "duración",
        "objective": "objetivo de esta sección",
        "key_points": ["punto 1", "punto 2"],
        "visual_type": "talking_head|slides|b_roll|animation"
      }
    ]
  },
  "testimonial_guidelines": {
    "questions_to_ask": [
      "pregunta para el testimonial 1",
      "pregunta 2",
      "pregunta 3"
    ],
    "ideal_length": "duración ideal",
    "key_moments_to_capture": ["momento 1", "momento 2"],
    "b_roll_to_film": ["b-roll 1", "b-roll 2"]
  },
  "platform_adaptations": {
    "tiktok": {
      "format": "vertical 9:16",
      "max_duration": "60s recomendado",
      "style_notes": "notas de estilo para TikTok",
      "trending_elements": ["elemento trending 1", "elemento 2"]
    },
    "instagram_reels": {
      "format": "vertical 9:16",
      "max_duration": "90s recomendado",
      "style_notes": "notas de estilo para Reels"
    },
    "meta_feed": {
      "format": "1:1 o 4:5",
      "max_duration": "15-30s",
      "style_notes": "notas de estilo para feed"
    },
    "youtube": {
      "format": "16:9",
      "duration": "según objetivo",
      "style_notes": "notas de estilo para YouTube"
    }
  },
  "production_tips": [
    "tip de producción 1",
    "tip 2",
    "tip 3"
  ],
  "summary": "los 3 tipos de video más importantes para empezar"
}`

    return { systemPrompt, userPrompt }
  },
}
