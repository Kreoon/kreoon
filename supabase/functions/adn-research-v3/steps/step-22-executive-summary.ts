import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

// PASO 22: Sintetiza TODO — genera los KIRO Insights únicos
export const step22ExecutiveSummary: ResearchStep = {
  number: 22,
  stepId: 'step_22_executive_summary',
  tabKey: 'executive_summary',
  name: 'Resumen Ejecutivo y KIRO Insights',
  description: 'Síntesis de los 22 pasos + 5 KIRO Insights únicos + Plan de acción 90 días',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    // Extraer los highlights más importantes de cada sección
    const marketSummary = (prev['market_overview'] as Record<string, unknown>)?.summary || ''
    const positioning = truncateContext((prev['positioning'] as Record<string, unknown>)?.puv || {}, 400)
    const avatarMain = truncateContext((prev['avatars'] as Record<string, unknown>)?.main_avatar || {}, 400)
    const painMap = (prev['psychology'] as Record<string, unknown>)?.pain_map as Record<string, unknown> || {}
    const desireMap = (prev['psychology'] as Record<string, unknown>)?.desire_map as Record<string, unknown> || {}
    const rootPain = painMap?.root_pain || ''
    const deepDesire = desireMap?.deep_desire || ''
    const competitiveGaps = truncateContext((prev['competition'] as Record<string, unknown>)?.competitive_gaps || [], 400)
    const metaAdsStrategy = truncateContext((prev['meta_ads'] as Record<string, unknown>)?.campaign_architecture || {}, 300)
    const launchTimeline = truncateContext((prev['launch_strategy'] as Record<string, unknown>)?.pre_launch || {}, 300)
    const copyAngles = prev['copy_angles'] as Record<string, unknown> || {}
    const topHooks = JSON.stringify(copyAngles?.hooks_bank || []).slice(0, 300)

    // Análisis emocional del fundador — enriquece los KIRO insights
    const emotionalInsights = `
Nivel de confianza del fundador: ${ctx.product.emotional_analysis.confidence_level}/10
Temas con mayor pasión: ${ctx.product.emotional_analysis.passion_topics.join(', ')}
Áreas de preocupación detectadas: ${ctx.product.emotional_analysis.concern_areas.join(', ')}
Tono recomendado basado en el audio: ${ctx.product.emotional_analysis.recommended_tone}`

    // Coherencia con ADN de Marca
    const brandCoherence = ctx.brand
      ? `\nADN de Marca incluido — Propuesta de valor de la marca: ${truncateContext(ctx.brand.value_proposition, 300)}`
      : '\nADN de Marca no incluido en este análisis.'

    const systemPrompt = `Eres el estratega jefe de Kreoon y el sistema KIRO, la IA especializada en la economía creativa de LATAM.
Has analizado 22 dimensiones completas de este negocio. Ahora generas la síntesis ejecutiva definitiva y tus 5 insights más poderosos.
Los KIRO Insights son el activo más valioso del reporte: deben ser únicos, no genéricos, basados en cruces específicos de datos.
Responde ÚNICAMENTE con JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Genera el Resumen Ejecutivo completo y los KIRO Insights para:

PRODUCTO: ${ctx.product.name}
${ctx.product.description}

HALLAZGOS CLAVE DEL ANÁLISIS:

Mercado: ${marketSummary}
Posicionamiento y PUV: ${positioning}
Avatar principal: ${avatarMain}
Dolor raíz: ${rootPain}
Deseo profundo: ${deepDesire}
Gaps competitivos: ${competitiveGaps}
Arquitectura Meta Ads: ${metaAdsStrategy}
Plan de lanzamiento: ${launchTimeline}
Top hooks identificados: ${topHooks}

ANÁLISIS EMOCIONAL DEL FUNDADOR:
${emotionalInsights}
${brandCoherence}

Devuelve este JSON exacto:
{
  "executive_summary": {
    "opportunity_score": 8.5,
    "opportunity_score_justification": "por qué este score basado en datos reales del análisis",
    "one_liner": "la oportunidad en una frase de máximo 20 palabras",
    "para_1_situation": "párrafo: estado actual del mercado y dónde está el producto ahora",
    "para_2_opportunity": "párrafo: la oportunidad específica identificada con datos",
    "para_3_strategy": "párrafo: la estrategia central recomendada",
    "para_4_execution": "párrafo: las 3 acciones prioritarias de las próximas 2 semanas",
    "para_5_projection": "párrafo: proyección realista a 90 días si se ejecuta bien"
  },
  "emotional_audio_insights": {
    "founder_strengths_detected": ["fortaleza del fundador 1", "fortaleza 2"],
    "blind_spots_to_address": ["punto ciego 1", "punto ciego 2"],
    "authentic_story_angle": "el ángulo de historia más auténtico basado en la voz del fundador",
    "tone_recommendation": "recomendación específica de tono para todas las comunicaciones"
  },
  "brand_dna_coherence": {
    "alignment_score": 9,
    "alignment_notes": "qué tan alineado está el producto con el ADN de Marca",
    "tension_points": ["punto de tensión 1 si aplica"],
    "reinforcement_opportunities": ["oportunidad de refuerzo 1", "oportunidad 2"]
  },
  "kiro_insights": [
    {
      "number": 1,
      "type": "oportunidad_oculta",
      "title": "título impactante del insight (<8 palabras)",
      "insight": "el insight completo — debe citar datos específicos del análisis, NO ser genérico. Mínimo 3 oraciones.",
      "action": "acción concreta a tomar esta semana",
      "impact": "alto|medio",
      "urgency": "esta_semana|este_mes|este_trimestre"
    },
    {
      "number": 2,
      "type": "punto_fragil",
      "title": "título del riesgo identificado",
      "insight": "el riesgo específico detectado cruzando datos de competencia + psicología + mercado",
      "action": "cómo mitigarlo",
      "impact": "alto|medio",
      "urgency": "esta_semana|este_mes|este_trimestre"
    },
    {
      "number": 3,
      "type": "creativo_a_probar",
      "title": "el creativo que nadie en la categoría ha probado",
      "insight": "por qué este creativo específico debería funcionar — basado en gaps de ad intelligence y psicología del avatar",
      "action": "cómo producirlo y probarlo",
      "impact": "alto|medio",
      "urgency": "esta_semana|este_mes|este_trimestre"
    },
    {
      "number": 4,
      "type": "audiencia_ignorada",
      "title": "el segmento que todos ignoran",
      "insight": "audiencia secundaria con alta intención y baja competencia detectada en el análisis",
      "action": "cómo llegar a esta audiencia primero",
      "impact": "alto|medio",
      "urgency": "esta_semana|este_mes|este_trimestre"
    },
    {
      "number": 5,
      "type": "mensaje_contraintuitivo",
      "title": "el mensaje que la competencia no se atreve a usar",
      "insight": "mensaje o posicionamiento que va contra la corriente pero resuena con el avatar según los datos",
      "action": "cómo testear este mensaje",
      "impact": "alto|medio",
      "urgency": "este_mes"
    },
    {
      "number": 6,
      "type": "canal_subestimado",
      "title": "canal de adquisición infrautilizado",
      "insight": "canal donde la competencia no está presente o está mal ejecutando",
      "action": "cómo capturar este canal primero",
      "impact": "alto|medio",
      "urgency": "este_mes"
    },
    {
      "number": 7,
      "type": "producto_expansion",
      "title": "oportunidad de expansión de producto/servicio",
      "insight": "extensión natural del producto basada en jobs-to-be-done no cubiertos detectados",
      "action": "primer paso para validar esta expansión",
      "impact": "alto|medio",
      "urgency": "este_trimestre"
    },
    {
      "number": 8,
      "type": "proximo_gran_movimiento",
      "title": "el próximo gran movimiento estratégico",
      "insight": "la decisión estratégica más importante para los próximos 90 días basada en todo el análisis",
      "action": "el primer paso concreto para ejecutarlo",
      "impact": "alto",
      "urgency": "este_mes"
    }
  ],
  "action_plan_90_days": {
    "week_1_2": {
      "theme": "nombre de la fase",
      "actions": ["acción 1", "acción 2", "acción 3"],
      "deliverable": "qué debe estar listo",
      "success_metric": "cómo medir el éxito"
    },
    "week_3_4": {
      "theme": "nombre de la fase",
      "actions": ["acción 1", "acción 2", "acción 3"],
      "deliverable": "entregable",
      "success_metric": "métrica de éxito"
    },
    "week_5_8": {
      "theme": "nombre de la fase",
      "actions": ["acción 1", "acción 2", "acción 3"],
      "deliverable": "entregable",
      "success_metric": "métrica de éxito"
    },
    "week_9_12": {
      "theme": "nombre de la fase",
      "actions": ["acción 1", "acción 2", "acción 3"],
      "deliverable": "entregable",
      "success_metric": "métrica de éxito"
    }
  },
  "quick_wins": [
    {
      "win": "acción de impacto rápido (menos de 24h)",
      "why": "por qué impacta",
      "how": "cómo ejecutarla"
    },
    {
      "win": "quick win 2",
      "why": "por qué",
      "how": "cómo"
    },
    {
      "win": "quick win 3",
      "why": "por qué",
      "how": "cómo"
    }
  ],
  "final_recommendation": "recomendación final del estratega KIRO en 2 oraciones poderosas"
}

IMPORTANTE: Genera entre 7-10 KIRO Insights. Que sean accionables, específicos y sorprendentes.
No repitas lo obvio — KIRO ve lo que otros no ven.
Cada insight debe citar datos específicos del análisis previo, NO ser genérico.`

    return { systemPrompt, userPrompt }
  },
}
