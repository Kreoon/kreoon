import { ResearchStep, truncateContext } from './index.ts'
import { MasterContext } from '../context-builder.ts'

export const step20Metrics: ResearchStep = {
  number: 20,
  stepId: 'step_20_metrics',
  tabKey: 'kpis',
  name: 'KPIs y Métricas',
  description: 'North Star Metric, KPIs por canal, dashboards recomendados',
  useWebSearch: false,

  buildPrompts(ctx: MasterContext, prev: Record<string, unknown>) {
    const tab1 = prev['market_overview'] || {}
    const tab9 = prev['offer'] || {}
    const tab14 = prev['meta_ads'] || {}
    const tab19 = prev['launch_strategy'] || {}

    const systemPrompt = `Eres un experto en analytics y métricas de marketing para LATAM.
Defines KPIs accionables y dashboards que impulsan decisiones.
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown.
Usa español LATAM.`

    const userPrompt = `Define los KPIs y métricas para:

PRODUCTO: ${ctx.product.name}
DESCRIPCIÓN: ${ctx.product.description}

MERCADO:
${truncateContext(tab1, 300)}

OFERTA:
${truncateContext(tab9, 300)}

ADS:
${truncateContext(tab14, 300)}

LANZAMIENTO:
${truncateContext(tab19, 300)}

Devuelve este JSON exacto:
{
  "north_star_metric": {
    "metric": "nombre de la métrica norte",
    "definition": "definición exacta de cómo medirla",
    "target": "objetivo numérico",
    "current_baseline": "baseline actual o estimado",
    "growth_rate_target": "% de crecimiento target"
  },
  "primary_kpis": [
    {
      "category": "acquisition|activation|retention|revenue|referral",
      "metrics": [
        {
          "name": "nombre de la métrica",
          "description": "qué mide",
          "formula": "cómo calcularla",
          "target": "objetivo",
          "benchmark": "benchmark de la industria",
          "importance": "critical|high|medium",
          "tracking_frequency": "diario|semanal|mensual"
        }
      ]
    }
  ],
  "funnel_metrics": [
    {
      "stage": "awareness|interest|consideration|intent|purchase|loyalty",
      "metric": "métrica principal de esta etapa",
      "target": "objetivo",
      "formula": "cómo calcular"
    }
  ],
  "channel_metrics": {
    "organic_social": {
      "primary": ["métrica 1", "métrica 2"],
      "secondary": ["métrica 1", "métrica 2"]
    },
    "paid_social": {
      "primary": ["métrica 1", "métrica 2"],
      "secondary": ["métrica 1", "métrica 2"]
    },
    "email": {
      "primary": ["métrica 1", "métrica 2"],
      "secondary": ["métrica 1", "métrica 2"]
    },
    "website": {
      "primary": ["métrica 1", "métrica 2"],
      "secondary": ["métrica 1", "métrica 2"]
    }
  },
  "cohort_metrics": [
    {
      "cohort": "definición del cohort",
      "metrics": ["métrica 1", "métrica 2"]
    }
  ],
  "leading_indicators": [
    "indicador leading 1",
    "indicador 2",
    "indicador 3"
  ],
  "lagging_indicators": [
    "indicador lagging 1",
    "indicador 2",
    "indicador 3"
  ],
  "dashboard_recommendations": [
    {
      "dashboard": "nombre del dashboard",
      "metrics_to_include": ["métrica 1", "métrica 2", "métrica 3"],
      "refresh_frequency": "frecuencia de actualización"
    }
  ],
  "alert_thresholds": [
    {
      "metric": "métrica a monitorear",
      "warning_threshold": "umbral de warning",
      "critical_threshold": "umbral crítico",
      "action": "acción a tomar"
    }
  ],
  "reporting_cadence": [
    {
      "frequency": "daily|weekly|monthly",
      "metrics": ["métricas a incluir"],
      "audience": "para quién es el reporte"
    }
  ],
  "tools_recommended": [
    {
      "tool": "nombre de la herramienta",
      "use_case": "para qué usarla",
      "priority": "must_have|nice_to_have"
    }
  ],
  "summary": "los 3 KPIs más importantes y por qué"
}`

    return { systemPrompt, userPrompt }
  },
}
