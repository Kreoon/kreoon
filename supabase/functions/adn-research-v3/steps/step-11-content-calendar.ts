import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step11ContentCalendar: ResearchStep = {
  number: 11,
  stepId: 'step_11_content_calendar',
  tabKey: 'calendar',
  name: 'Calendario de Contenido 30 Días',
  description: 'Calendario completo con 30 días de posts con copy listo para publicar',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab7 = prev['positioning'] || {}
    const tab8 = prev['copy_angles'] || {}
    const esfera = (tab7 as Record<string, unknown>)?.esfera_framework
    const platforms = ctx.brand?.marketing_strategy?.main_channels || ctx.product.platforms || ['Instagram', 'TikTok']

    const systemPrompt = `Eres un estratega de contenido senior con experiencia en LATAM.
Creas calendarios de contenido con COPY COMPLETO listo para publicar, no placeholders.
Sigues el framework ESFERA: Enganchar → Solución → Fidelizar → Emoción → Remarketing → Automatización.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Crea el calendario COMPLETO de 30 días para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}
PLATAFORMAS: ${Array.isArray(platforms) ? platforms.join(', ') : 'Instagram, TikTok'}
${esfera ? `Framework ESFERA disponible para distribuir contenido por fases` : ''}

POSICIONAMIENTO Y PUV:
${truncateContext(tab7, 400)}

ÁNGULOS Y HOOKS DISPONIBLES:
${truncateContext(tab8, 500)}

IMPORTANTE: Genera los 30 DÍAS COMPLETOS. El campo "full_copy" debe ser copy REAL listo para publicar, NO un placeholder.
- Días 1-7: Fase "enganchar" (awareness, valor gratuito)
- Días 8-14: Fase "solucion" (educación, demostración)
- Días 15-21: Mix de fases
- Días 22-30: "fidelizar" y "remarketing" (testimonios, urgencia, ofertas)

Devuelve este JSON exacto:
{
  "strategy_overview": "visión general de la estrategia del mes en 2-3 oraciones",
  "weekly_cadence": "cadencia de publicación semanal recomendada (ej: 5 posts/semana)",
  "platform_distribution": {"instagram": 12, "tiktok": 10, "facebook": 5, "email": 3},
  "days": [
    {
      "day": 1,
      "date_relative": "Semana 1 - Lunes",
      "platform": "instagram",
      "format": "Reel",
      "pillar": "pilar de contenido",
      "esfera_phase": "enganchar",
      "title": "título descriptivo del contenido",
      "hook": "gancho de apertura (primeras palabras/segundos)",
      "full_copy": "COPY COMPLETO LISTO PARA PUBLICAR. Debe incluir: hook de apertura, desarrollo del contenido (3-5 oraciones), y cierre con CTA. Escríbelo como si fuera el caption final de Instagram o el guión del video.",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
      "cta": "llamado a la acción específico",
      "production_notes": "notas breves de producción para el creador",
      "estimated_reach": "alto|medio|bajo"
    },
    {
      "day": 2,
      "date_relative": "Semana 1 - Martes",
      "platform": "tiktok",
      "format": "Video",
      "pillar": "pilar",
      "esfera_phase": "enganchar",
      "title": "título",
      "hook": "gancho",
      "full_copy": "COPY COMPLETO del video/post",
      "hashtags": ["hashtag1"],
      "cta": "CTA",
      "production_notes": "notas",
      "estimated_reach": "alto"
    }
  ],
  "content_batching_guide": {
    "batch_1_week_1": {
      "content_to_create": ["contenido 1", "contenido 2", "contenido 3"],
      "time_required": "3-4 horas",
      "equipment_needed": ["smartphone", "ring light", "trípode"]
    },
    "batch_2_week_2": {
      "content_to_create": ["contenido 1", "contenido 2"],
      "time_required": "2-3 horas",
      "equipment_needed": ["equipo necesario"]
    }
  },
  "engagement_strategy": {
    "daily_tasks": ["responder comentarios en 1 hora", "interactuar con 10 cuentas del nicho"],
    "weekly_tasks": ["analizar métricas", "ajustar estrategia"],
    "response_templates": {
      "positive_comment": "template de respuesta a comentario positivo",
      "question": "template de respuesta a preguntas",
      "objection": "template de respuesta a objeciones"
    }
  }
}

CRÍTICO: El array "days" DEBE tener EXACTAMENTE 30 elementos, uno por cada día.
Cada "full_copy" debe ser texto REAL y COMPLETO, no un placeholder.
Varía las plataformas y formatos a lo largo del mes.`

    return { systemPrompt, userPrompt }
  },
}
